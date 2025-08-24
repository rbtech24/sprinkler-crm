const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

// Create simple login server for testing
const app = express();
app.use(cors());
app.use(express.json());

// Simple login route that works
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt for:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const db = new sqlite3.Database(path.join(__dirname, 'data', 'sprinkler_repair.db'));

    // Get user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get company
    const company = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM companies WHERE id = ?', [user.company_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Generate simple token
    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        role: user.role
      },
      'simple-secret-key',
      { expiresIn: '24h' }
    );

    db.close();

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

    console.log('Login successful for:', user.email);
    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Simple auth server is working!' });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Simple login server running on http://localhost:${PORT}`);
  console.log('Test with: curl -X POST http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"owner@demo.com\\",\\"password\\":\\"password\\"}"');
});