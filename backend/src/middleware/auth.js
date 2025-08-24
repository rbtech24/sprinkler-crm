const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authService = require('../services/authService');
const { get } = require('../database/sqlite');

// Enhanced middleware to verify JWT token with session management
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const sessionToken = req.headers['x-session-token'];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Get user details from database
    const user = await get(
      'SELECT id, company_id, role, email, name, email_verified, locked_until, login_attempts FROM users WHERE id = ?',
      [decoded.userId],
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is locked
    if (await authService.isUserLocked(user.id)) {
      return res.status(423).json({ error: 'Account locked due to failed login attempts' });
    }

    // Check email verification for sensitive operations
    if (!user.email_verified && req.path.includes('/admin')) {
      return res.status(403).json({ error: 'Email verification required' });
    }

    // Update session activity if session token provided
    if (sessionToken) {
      try {
        await authService.updateSessionActivity(sessionToken);
      } catch (error) {
        // Session might be expired, but don't fail the request
        console.warn('Session update failed:', error.message);
      }
    }

    req.user = user;
    req.userId = user.id;
    req.companyId = user.company_id;
    req.sessionToken = sessionToken;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware to require email verification
const requireEmailVerification = (req, res, next) => {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};

// Middleware to require specific role
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userRoles = Array.isArray(roles) ? roles : [roles];
  if (!userRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
};

// Middleware to set company context for RLS
const setCompanyContext = (req, res, next) => {
  if (req.user && req.user.company_id) {
    req.companyId = req.user.company_id;
  }
  next();
};

// Generate JWT token
const generateToken = (payload) => authService.generateAccessToken(payload);

// Hash password
const hashPassword = async (password) => await authService.hashPassword(password);

// Verify password
const verifyPassword = async (password, hash) => await authService.verifyPassword(password, hash);

// Rate limiting middleware for sensitive operations
const rateLimitSensitive = () => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + req.path;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);
    const recentAttempts = userAttempts.filter((time) => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts, please try again later',
        retryAfter: Math.ceil((windowMs - (now - recentAttempts[0])) / 1000),
      });
    }

    recentAttempts.push(now);
    attempts.set(key, recentAttempts);
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireEmailVerification,
  requireRole,
  setCompanyContext,
  generateToken,
  hashPassword,
  verifyPassword,
  rateLimitSensitive,
};
