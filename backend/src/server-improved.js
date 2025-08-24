require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Enhanced error logging
const logError = (error, context = '', req = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code || 'UNKNOWN',
    url: req ? `${req.method} ${req.url}` : undefined,
    ip: req ? req.ip : undefined
  });
};

// Enhanced request logging
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100),
    contentType: req.get('Content-Type')
  });
  next();
};

// Import routes - use simple auth for now
const authRoutes = require('./routes/auth-simple');
const inspectionToolRoutes = require('./routes/inspection-tool');
const dashboardRoutes = require('./routes/dashboard');
const clientsRoutes = require('./routes/clients');
const inspectionsRoutes = require('./routes/inspections');
const estimatesRoutes = require('./routes/estimates');
const usersRoutes = require('./routes/users');
const companiesRoutes = require('./routes/companies');
const servicePlansRoutes = require('./routes/service-plans');
const reportsRoutes = require('./routes/reports-enhanced');
// const paymentsRoutes = require('./routes/payments-enhanced');
// const communicationsRoutes = require('./routes/communications-enhanced');
// const inventoryRoutes = require('./routes/inventory-enhanced');
// const clientPortalRoutes = require('./routes/client-portal');

const app = express();
const PORT = process.env.PORT || 3003;

// Enhanced error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(error, 'UNCAUGHT_EXCEPTION');
  console.error('🚨 Uncaught Exception - Server shutting down...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(new Error(reason), 'UNHANDLED_REJECTION');
  console.error('🚨 Unhandled Promise Rejection:', promise);
});

console.log('🚀 Starting SprinklerInspect Server...');

// Security and performance middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

app.use(compression());

app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting with enhanced logging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});
app.use(limiter);

// Enhanced Morgan logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr', {
  stream: {
    write: (message) => {
      console.log(`📊 ${message.trim()}`);
    }
  }
}));

// Body parsing with error handling
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Custom request logging
app.use(logRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// API routes with error wrapping
console.log('📡 Setting up API routes...');

// Wrap route handlers with error logging
const wrapAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    logError(error, 'Route Handler', req);
    next(error);
  });
};

// Auth routes (simplified)
app.use('/api/auth', authRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);
console.log('✅ Dashboard routes loaded');

// Client routes
app.use('/api/clients', clientsRoutes);
console.log('✅ Client routes loaded');

// Inspection routes
app.use('/api/inspections', inspectionsRoutes);
console.log('✅ Inspection routes loaded');

// Estimate routes
app.use('/api/estimates', estimatesRoutes);
console.log('✅ Estimate routes loaded');

// User routes
app.use('/api/users', usersRoutes);
console.log('✅ User routes loaded');

// Company routes
app.use('/api/company', companiesRoutes);
console.log('✅ Company routes loaded');

// Service Plan routes
app.use('/api/service-plans', servicePlansRoutes);
console.log('✅ Service plan routes loaded');

// Enhanced Reports routes
app.use('/api/reports', reportsRoutes);
console.log('✅ Enhanced reports routes loaded');

// Enhanced Payments routes
// app.use('/api/payments', paymentsRoutes);
// console.log('✅ Enhanced payments routes loaded');

// Enhanced Communications routes
// app.use('/api/communications', communicationsRoutes);
// console.log('✅ Enhanced communications routes loaded');

// Enhanced Inventory routes
// app.use('/api/inventory', inventoryRoutes);
// console.log('✅ Enhanced inventory routes loaded');

// Client Portal routes
// app.use('/api/client-portal', clientPortalRoutes);
// console.log('✅ Client portal routes loaded');

// Inspection tool routes (if they exist)
try {
  app.use('/api/inspection-tool', inspectionToolRoutes);
  console.log('✅ Inspection tool routes loaded');
} catch (error) {
  console.log('⚠️ Inspection tool routes not available:', error.message);
}

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'SprinklerInspect API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    method: req.method,
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logError(error, 'Global Error Handler', req);
  
  // Don't log the stack trace for known client errors
  if (!error.statusCode || error.statusCode >= 500) {
    console.error('🚨 Server Error Stack:', error.stack);
  }
  
  const statusCode = error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    code: error.code || 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.details 
    })
  });
});

// Start server with enhanced logging
app.listen(PORT, () => {
  console.log('🎉 SprinklerInspect Server Started Successfully!');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log('📚 Available endpoints:');
  console.log('   GET  /health - Health check');
  console.log('   GET  /api/test - API test');
  console.log('   POST /api/auth/login - User login');
  console.log('   GET  /api/auth/test - Auth service test');
  console.log('   POST /api/inspection-tool/* - Inspection endpoints (if available)');
  console.log('');
  console.log('🔧 Ready for connections!');
});

module.exports = app;