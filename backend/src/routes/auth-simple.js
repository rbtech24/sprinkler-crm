const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();

// Enhanced error logging middleware
const logError = (error, context = '') => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code || 'UNKNOWN'
  });
};

// Enhanced request logging middleware
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`, {
    body: req.method === 'POST' ? { ...req.body, password: '***' } : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
};

// Apply request logging to all routes
router.use(logRequest);

// Database connection helper with error handling
const getDbConnection = () => {
  try {
    const dbPath = path.join(__dirname, '../../data/sprinkler_repair.db');
    return new sqlite3.Database(dbPath);
  } catch (error) {
    logError(error, 'Database Connection');
    throw new Error('Database connection failed');
  }
};

// Promisify database operations
const dbGet = (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        logError(err, `Database Query: ${sql}`);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Simple, reliable login route
router.post('/login', async (req, res) => {
  const db = getDbConnection();
  
  try {
    console.log('🔐 Login attempt started');
    const { email, password } = req.body;

    // Input validation with detailed logging
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    console.log(`🔍 Looking up user: ${email}`);
    
    // Get user from database
    const user = await dbGet(db, 
      'SELECT * FROM users WHERE email = ?', 
      [email.toLowerCase().trim()]
    );

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id}, Role: ${user.role})`);

    // Verify password
    console.log('🔒 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_PASSWORD'
      });
    }

    console.log('✅ Password verified');

    // Get company information
    console.log(`🏢 Getting company info for company_id: ${user.company_id}`);
    const company = await dbGet(db,
      'SELECT * FROM companies WHERE id = ?',
      [user.company_id]
    );

    if (!company) {
      console.log('❌ Company not found');
      return res.status(500).json({ 
        error: 'Company information not found',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    console.log(`✅ Company found: ${company.name}`);

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const tokenPayload = {
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '24h', issuer: 'sprinklerinspect' }
    );

    console.log('✅ JWT token generated');

    // Update last login
    try {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id],
          (err) => err ? reject(err) : resolve()
        );
      });
      console.log('✅ Last login updated');
    } catch (err) {
      logError(err, 'Update Last Login');
      // Continue anyway - not critical
    }

    // Prepare response
    const response = {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        email_verified: user.email_verified
      },
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan,
        email: company.email,
        phone: company.phone,
        website: company.website
      }
    };

    console.log(`🎉 Login successful for ${user.email} (${user.role})`);
    res.json(response);

  } catch (error) {
    logError(error, 'Login Route');
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (db) {
      db.close((err) => {
        if (err) logError(err, 'Database Close');
      });
    }
  }
});

// Test endpoint with health check
router.get('/test', (req, res) => {
  const db = getDbConnection();
  
  db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
    db.close();
    
    if (err) {
      logError(err, 'Health Check');
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: err.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Auth service is working',
      userCount: result.count,
      timestamp: new Date().toISOString()
    });
  });
});

// Basic logout route
router.post('/logout', (req, res) => {
  console.log('👋 Logout request');
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  logError(error, 'Router Error Handler');
  res.status(500).json({
    error: 'Internal server error',
    code: 'ROUTER_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;