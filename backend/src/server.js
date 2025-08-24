require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const companyRoutes = require('./routes/companies');
const clientRoutes = require('./routes/clients');
const inspectionRoutes = require('./routes/inspections-comprehensive');
const estimateRoutes = require('./routes/estimates');
const priceBookRoutes = require('./routes/priceBooks');
const userRoutes = require('./routes/users');
const workOrderRoutes = require('./routes/work-orders');
const customerPortalRoutes = require('./routes/customer-portal');
const schedulingRoutes = require('./routes/scheduling');
const adminRoutes = require('./routes/admin');
const trialRoutes = require('./routes/trial');
const sitesRoutes = require('./routes/sites');

// Import middleware
const { authenticateToken, setCompanyContext } = require('./middleware/auth');
const { trialEnforcement } = require('./middleware/trialEnforcement');
const { requireSubscriptionAccess } = require('./middleware/subscriptionAccess');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'http://localhost:3008',
    'http://localhost:3009',
    'http://localhost:3012',
    'http://localhost:3013',
    'http://localhost:3014',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/customer-portal', customerPortalRoutes);
app.use('/api/errors', require('./routes/errors'));  // Error logging endpoint

// Protected routes (require authentication)
app.use('/api', authenticateToken);
app.use('/api', setCompanyContext);
app.use('/api', trialEnforcement);

// Basic routes (available to both inspection_only and full_crm)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/inspections-mobile', require('./routes/inspections-mobile'));
app.use('/api/reports', require('./routes/reports-simple'));

// CRM routes (full_crm only)
app.use('/api/clients', requireSubscriptionAccess('clients:view'), clientRoutes);
app.use('/api/sites', requireSubscriptionAccess('sites:view'), sitesRoutes);
app.use('/api/estimates', requireSubscriptionAccess('estimates:view'), estimateRoutes);
app.use('/api/work-orders', requireSubscriptionAccess('work_orders:view'), workOrderRoutes);
app.use('/api/users', requireSubscriptionAccess('users:view'), userRoutes);
app.use('/api/scheduling', requireSubscriptionAccess('scheduling:view'), schedulingRoutes);
app.use('/api/service-plans', requireSubscriptionAccess('service_plans:view'), require('./routes/service-plans'));

// Admin and system routes
app.use('/api/company', companyRoutes);
app.use('/api/price-books', priceBookRoutes);
app.use('/api/files', require('./routes/files'));
app.use('/api/communications', require('./routes/communications-simple'));
app.use('/api/admin', adminRoutes);
app.use('/api/trial', trialRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sprinkler Repair SaaS API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
