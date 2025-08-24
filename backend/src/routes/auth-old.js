const express = require('express');
const { body, validationResult } = require('express-validator');
const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const { query, get } = require('../database/sqlite');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Register new company and admin user
router.post('/register', [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('adminEmail').isEmail().withMessage('Valid email is required'),
  body('adminPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('adminName').notEmpty().withMessage('Admin name is required'),
  body('plan').isIn(['starter', 'pro', 'enterprise']).withMessage('Invalid plan type'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    companyName, adminEmail, adminPassword, adminName, plan = 'starter',
  } = req.body;

  await transaction(async (client) => {
    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail],
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    // Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, plan, created_at, updated_at) 
       VALUES ($1, $2, NOW(), NOW()) 
       RETURNING id, name, plan`,
      [companyName, plan],
    );

    const company = companyResult.rows[0];

    // Create Stripe customer
    let stripeCustomer;
    try {
      stripeCustomer = await stripe.customers.create({
        email: adminEmail,
        name: companyName,
        metadata: { company_id: company.id },
      });
    } catch (stripeError) {
      console.error('Stripe customer creation failed:', stripeError);
      // Continue without Stripe for now - can be added later
    }

    // Create subscription record
    if (stripeCustomer) {
      await client.query(
        `INSERT INTO subscriptions (company_id, stripe_customer, plan, status, seats)
         VALUES ($1, $2, $3, 'active', 2)`,
        [company.id, stripeCustomer.id, plan],
      );
    }

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);
    const userResult = await client.query(
      `INSERT INTO users (company_id, email, full_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'owner', NOW(), NOW())
       RETURNING id, email, full_name, role`,
      [company.id, adminEmail, hashedPassword, adminName],
    );

    const user = userResult.rows[0];

    // Create default price book with seed data
    await client.query(
      'SELECT create_default_price_book($1)',
      [company.id],
    );

    // Copy global inspection templates to company
    await client.query(
      `INSERT INTO inspection_templates (company_id, name, code, schema_json, callouts_json, is_active)
       SELECT $1, name, code, schema_json, callouts_json, true
       FROM inspection_templates 
       WHERE company_id = '00000000-0000-0000-0000-000000000000'`,
      [company.id],
    );

    // Generate JWT token
    const token = generateToken(user.id, company.id);

    res.status(201).json({
      message: 'Company registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan,
      },
    });
  });
}));

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  const user = await get(
    `SELECT u.id, u.company_id, u.email, u.name, u.role, u.is_active, u.password,
            c.name as company_name, c.plan
     FROM users u
     JOIN companies c ON u.company_id = c.id
     WHERE u.email = ?`,
    [email],
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.is_active) {
    return res.status(401).json({ error: 'Account disabled' });
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  await query(
    'UPDATE users SET last_login_at = datetime("now") WHERE id = ?',
    [user.id],
  );

  const token = generateToken(user.id, user.company_id);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    company: {
      id: user.company_id,
      name: user.company_name,
      plan: user.plan,
    },
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, company_id, is_active FROM users WHERE id = $1',
      [decoded.userId],
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const newToken = generateToken(decoded.userId, decoded.companyId);
    res.json({ token: newToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}));

module.exports = router;
