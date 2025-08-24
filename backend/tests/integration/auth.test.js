/**
 * Integration Tests for Authentication API
 * Tests the complete authentication flow including API endpoints
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the app after environment is set
const app = require('../../src/server');

describe('Authentication API Integration Tests', () => {
  let testUser;
  let testCompany;

  beforeEach(async () => {
    // Test data is inserted by setup.js
    testCompany = {
      id: 1,
      name: 'Test Irrigation Co',
      plan: 'professional',
      email: 'test@irrigation.com',
    };

    testUser = {
      id: 1,
      company_id: 1,
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'admin',
      password: 'TestPassword123!',
    };
  });

  describe('POST /api/auth/register', () => {
    test('should register new user successfully', async () => {
      const newUser = {
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        name: 'New User',
        companyName: 'New Test Company',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).toHaveProperty('name', newUser.name);
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).toHaveProperty('email_verified', false);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        email: 'weak@test.com',
        password: 'weak',
        name: 'Weak User',
        companyName: 'Test Company',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('requirements');
    });

    test('should reject registration with duplicate email', async () => {
      const duplicateUser = {
        email: 'admin@test.com', // Already exists
        password: 'TestPassword123!',
        name: 'Duplicate User',
        companyName: 'Test Company',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'User already exists');
    });

    test('should validate input fields', async () => {
      const invalidUser = {
        email: 'invalid-email',
        password: '',
        name: '',
        companyName: '',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      // First create a user with known password
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Insert test user directly to database
      const db = require('../../src/database/sqlite');
      await db.run(`
        UPDATE users 
        SET password_hash = ?, login_attempts = 0, locked_until = NULL 
        WHERE email = ?
      `, [hashedPassword, testUser.email]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('company');
      expect(response.body).toHaveProperty('refreshToken');
      
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('role', testUser.role);
      expect(response.body.user).not.toHaveProperty('password_hash');
      
      expect(response.body.company).toHaveProperty('name', testCompany.name);

      // Verify JWT token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('userId', testUser.id);
      expect(decoded).toHaveProperty('companyId', testUser.company_id);
      expect(decoded).toHaveProperty('role', testUser.role);
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'TestPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should handle account lockout after failed attempts', async () => {
      // Set user as locked
      const db = require('../../src/database/sqlite');
      await db.run(`
        UPDATE users 
        SET login_attempts = 5, locked_until = datetime('now', '+2 hours')
        WHERE email = ?
      `, [testUser.email]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!',
        })
        .expect(423);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('locked');
    });

    test('should validate required fields', async () => {
      // Missing password
      let response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Email and password are required');

      // Missing email
      response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'TestPassword123!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Email and password are required');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let validRefreshToken;
    let accessToken;

    beforeEach(async () => {
      // Login to get tokens
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const db = require('../../src/database/sqlite');
      await db.run(`
        UPDATE users 
        SET password_hash = ?, login_attempts = 0, locked_until = NULL 
        WHERE email = ?
      `, [hashedPassword, testUser.email]);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password,
        });

      accessToken = loginResponse.body.token;
      validRefreshToken = loginResponse.body.refreshToken;
    });

    test('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // New tokens should be different from old ones
      expect(response.body.tokens.accessToken).not.toBe(accessToken);
      expect(response.body.tokens.refreshToken).not.toBe(validRefreshToken);
    });

    test('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid or expired refresh token');
    });

    test('should require refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Refresh token is required');
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken;

    beforeEach(async () => {
      // Login to get access token
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const db = require('../../src/database/sqlite');
      await db.run(`
        UPDATE users 
        SET password_hash = ?, login_attempts = 0, locked_until = NULL 
        WHERE email = ?
      `, [hashedPassword, testUser.email]);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password,
        });

      accessToken = loginResponse.body.token;
    });

    test('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('role', testUser.role);
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });

    test('should reject expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUser.id, companyId: testUser.company_id, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token expired');
      expect(response.body).toHaveProperty('code', 'TOKEN_EXPIRED');
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      // Login to get tokens
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const db = require('../../src/database/sqlite');
      await db.run(`
        UPDATE users 
        SET password_hash = ?, login_attempts = 0, locked_until = NULL 
        WHERE email = ?
      `, [hashedPassword, testUser.email]);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: password,
        });

      accessToken = loginResponse.body.token;
      refreshToken = loginResponse.body.refreshToken;
    });

    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    test('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: refreshToken,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to sensitive endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests to trigger rate limiting
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401); // No token provided, but we can check headers

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});