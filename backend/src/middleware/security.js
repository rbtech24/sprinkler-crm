/**
 * Enhanced Security Middleware
 * Implements comprehensive security measures including input validation,
 * CSRF protection, and advanced security headers
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, query, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

/**
 * Enhanced Helmet configuration with strict security policies
 */
function enhancedHelmet() {
  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
      reportOnly: false,
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    
    // Additional security headers
    crossOriginEmbedderPolicy: false, // Allow iframe embedding for development
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

/**
 * Advanced Rate Limiting with different tiers
 */
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Rate limiting configurations
const rateLimits = {
  // General API requests
  general: createRateLimit(15 * 60 * 1000, 1000, 'Too many requests, please try again later'),
  
  // Authentication endpoints (more restrictive)
  auth: createRateLimit(15 * 60 * 1000, 20, 'Too many authentication attempts'),
  
  // Password reset and sensitive operations
  sensitive: createRateLimit(60 * 60 * 1000, 5, 'Too many sensitive operations, please wait'),
  
  // File upload endpoints
  upload: createRateLimit(15 * 60 * 1000, 50, 'Too many file uploads'),
  
  // Public API endpoints (for unauthenticated users)
  public: createRateLimit(15 * 60 * 1000, 100, 'Too many public API requests'),
};

/**
 * Input Sanitization Middleware
 * Sanitizes all input data to prevent XSS and injection attacks
 */
function sanitizeInput() {
  return (req, res, next) => {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  };
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key as well
    const cleanKey = sanitizeValue(key);
    sanitized[cleanKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

/**
 * Sanitize individual values
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove HTML tags and dangerous characters
  let sanitized = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
  
  // Additional sanitization
  sanitized = validator.escape(sanitized);
  
  return sanitized;
}

/**
 * Enhanced Input Validation Schemas
 */
const validationSchemas = {
  // User registration validation
  userRegistration: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email address required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character'),
    body('name')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Name must be 1-100 characters, letters only'),
    body('companyName')
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9\s&.-]+$/)
      .withMessage('Company name must be 1-255 characters'),
  ],
  
  // User login validation
  userLogin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address required'),
    body('password')
      .isLength({ min: 1, max: 128 })
      .withMessage('Password required'),
  ],
  
  // Client creation validation
  clientCreation: [
    body('name')
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9\s&.,-]+$/)
      .withMessage('Client name required (1-255 characters)'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address required'),
    body('phone')
      .optional()
      .isMobilePhone()
      .withMessage('Valid phone number required'),
    body('type')
      .optional()
      .isIn(['residential', 'commercial'])
      .withMessage('Type must be residential or commercial'),
  ],
  
  // Site creation validation
  siteCreation: [
    body('name')
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9\s&.,-]+$/)
      .withMessage('Site name required'),
    body('address')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Address too long'),
    body('city')
      .optional()
      .isLength({ max: 100 })
      .matches(/^[a-zA-Z\s-]+$/)
      .withMessage('Invalid city name'),
    body('state')
      .optional()
      .isLength({ min: 2, max: 2 })
      .matches(/^[A-Z]{2}$/)
      .withMessage('State must be 2-letter code'),
    body('zip')
      .optional()
      .matches(/^\d{5}(-\d{4})?$/)
      .withMessage('Invalid ZIP code format'),
  ],
  
  // Inspection creation validation
  inspectionCreation: [
    body('siteId')
      .isInt({ min: 1 })
      .withMessage('Valid site ID required'),
    body('techId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Valid technician ID required'),
    body('scheduledDate')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Valid date required'),
    body('status')
      .optional()
      .isIn(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  
  // Common parameter validations
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Valid ID required'),
  ],
  
  // Query parameter validations
  paginationQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .matches(/^[a-zA-Z_]+$/)
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
};

/**
 * Validation Error Handler
 */
function handleValidationErrors() {
  return (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      }));
      
      console.warn('Validation errors:', {
        ip: req.ip,
        path: req.path,
        errors: errorMessages,
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errorMessages,
      });
    }
    
    next();
  };
}

/**
 * CSRF Protection for sensitive operations
 */
function csrfProtection() {
  return (req, res, next) => {
    // Skip CSRF for API endpoints using API keys
    if (req.headers['x-api-key']) {
      return next();
    }
    
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;
    
    if (!token || !sessionToken || token !== sessionToken) {
      console.warn('CSRF token validation failed:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
      });
      
      return res.status(403).json({
        error: 'CSRF token validation failed',
      });
    }
    
    next();
  };
}

/**
 * Request size limiting middleware
 */
function requestSizeLimit() {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']) || 0;
    const maxSize = req.path.includes('/upload') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for uploads, 10MB for others
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        maxSize: `${maxSize / (1024 * 1024)}MB`,
      });
    }
    
    next();
  };
}

/**
 * Security headers middleware
 */
function securityHeaders() {
  return (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Remove server signature
    res.removeHeader('X-Powered-By');
    
    // Prevent caching of sensitive data
    if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
}

/**
 * IP Whitelist/Blacklist middleware
 */
function ipFilter(options = {}) {
  const { whitelist = [], blacklist = [] } = options;
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIP)) {
      console.warn(`Blocked IP attempt: ${clientIP}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check whitelist if configured
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      console.warn(`Non-whitelisted IP attempt: ${clientIP}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
}

/**
 * Request logging for security monitoring
 */
function securityLogger() {
  return (req, res, next) => {
    // Log sensitive operations
    const sensitiveOperations = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
      '/api/admin',
      '/api/users',
    ];
    
    const isSensitive = sensitiveOperations.some(op => req.path.includes(op));
    
    if (isSensitive) {
      console.log('Security Event:', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id,
        companyId: req.user?.company_id,
      });
    }
    
    next();
  };
}

module.exports = {
  enhancedHelmet,
  rateLimits,
  sanitizeInput,
  validationSchemas,
  handleValidationErrors,
  csrfProtection,
  requestSizeLimit,
  securityHeaders,
  ipFilter,
  securityLogger,
};