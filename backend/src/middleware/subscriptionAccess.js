const { get } = require('../database/sqlite');

/**
 * Middleware to check if user has access to specific features based on subscription plan
 */

// Feature definitions for each plan
const PLAN_FEATURES = {
  inspection_only: [
    'inspections:view',
    'inspections:create',
    'inspections:edit',
    'inspections:delete',
    'reports:view',
    'reports:generate',
    'dashboard:basic',
    'profile:view',
    'profile:edit',
    // Basic client management (required for inspections)
    'clients:view',
    'clients:create',
    'clients:edit',
    'sites:view',
    'sites:create',
    'sites:edit',
  ],
  full_crm: [
    // All inspection features plus:
    'inspections:view',
    'inspections:create',
    'inspections:edit',
    'inspections:delete',
    'reports:view',
    'reports:generate',
    'dashboard:basic',
    'dashboard:advanced',
    'profile:view',
    'profile:edit',
    // CRM features:
    'clients:view',
    'clients:create',
    'clients:edit',
    'clients:delete',
    'sites:view',
    'sites:create',
    'sites:edit',
    'sites:delete',
    'estimates:view',
    'estimates:create',
    'estimates:edit',
    'estimates:delete',
    'work_orders:view',
    'work_orders:create',
    'work_orders:edit',
    'work_orders:delete',
    'scheduling:view',
    'scheduling:create',
    'scheduling:edit',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'analytics:view',
    'service_plans:view',
    'service_plans:create',
    'service_plans:edit',
    'admin:settings',
    'billing:view',
  ],
};

// Route to feature mapping
const ROUTE_FEATURES = {
  // Inspection routes (available to both plans)
  '/api/inspections': 'inspections:view',
  '/api/inspections/create': 'inspections:create',
  '/api/reports': 'reports:view',
  '/api/dashboard/stats': 'dashboard:basic',
  
  // CRM routes (full_crm only)
  '/api/clients': 'clients:view',
  '/api/sites': 'sites:view',
  '/api/estimates': 'estimates:view',
  '/api/work-orders': 'work_orders:view',
  '/api/users': 'users:view',
  '/api/analytics': 'analytics:view',
  '/api/service-plans': 'service_plans:view',
  '/api/admin': 'admin:settings',
  '/api/dashboard/advanced': 'dashboard:advanced',
};

/**
 * Check if user's company has access to a specific feature
 */
async function hasFeatureAccess(companyId, feature) {
  try {
    const company = await get(
      'SELECT subscription_plan, subscription_status, trial_ends_at FROM companies WHERE id = ?',
      [companyId]
    );

    if (!company) {
      return false;
    }

    // Check if trial has expired
    if (company.subscription_status === 'trial') {
      const trialEnd = new Date(company.trial_ends_at);
      const now = new Date();
      if (now > trialEnd) {
        return false; // Trial expired
      }
    } else if (company.subscription_status !== 'active') {
      return false; // Subscription not active
    }

    // Check if plan includes the feature
    const planFeatures = PLAN_FEATURES[company.subscription_plan] || [];
    return planFeatures.includes(feature);
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * Middleware to check subscription access for routes
 */
function requireSubscriptionAccess(feature) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.company_id) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasAccess = await hasFeatureAccess(req.user.company_id, feature);
      
      if (!hasAccess) {
        // Get company details for better error message
        const company = await get(
          'SELECT subscription_plan, subscription_status, trial_ends_at FROM companies WHERE id = ?',
          [req.user.company_id]
        );

        let errorMessage = 'Access denied';
        let errorCode = 'ACCESS_DENIED';

        if (company) {
          if (company.subscription_status === 'trial') {
            const trialEnd = new Date(company.trial_ends_at);
            const now = new Date();
            if (now > trialEnd) {
              errorMessage = 'Your free trial has expired. Please upgrade to continue using this feature.';
              errorCode = 'TRIAL_EXPIRED';
            } else {
              errorMessage = 'This feature is not included in your current plan. Please upgrade to access it.';
              errorCode = 'FEATURE_NOT_INCLUDED';
            }
          } else if (company.subscription_status !== 'active') {
            errorMessage = 'Your subscription is not active. Please check your billing settings.';
            errorCode = 'SUBSCRIPTION_INACTIVE';
          } else {
            errorMessage = 'This feature is not included in your current plan. Please upgrade to access it.';
            errorCode = 'FEATURE_NOT_INCLUDED';
          }
        }

        return res.status(403).json({
          error: errorMessage,
          code: errorCode,
          currentPlan: company?.subscription_plan || 'unknown',
          requiredFeature: feature
        });
      }

      next();
    } catch (error) {
      console.error('Subscription access middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware to automatically check route access based on URL
 */
function checkRouteAccess() {
  return async (req, res, next) => {
    // Skip auth routes and health checks
    if (req.path.startsWith('/auth') || req.path === '/health') {
      return next();
    }

    // Find matching route feature
    let requiredFeature = null;
    for (const [route, feature] of Object.entries(ROUTE_FEATURES)) {
      if (req.path.startsWith(route)) {
        requiredFeature = feature;
        break;
      }
    }

    // If no specific feature required, allow access
    if (!requiredFeature) {
      return next();
    }

    // Check access
    return requireSubscriptionAccess(requiredFeature)(req, res, next);
  };
}

/**
 * Get user's available features
 */
async function getUserFeatures(companyId) {
  try {
    const company = await get(
      'SELECT subscription_plan, subscription_status, trial_ends_at FROM companies WHERE id = ?',
      [companyId]
    );

    if (!company) {
      return [];
    }

    // Check if trial has expired
    if (company.subscription_status === 'trial') {
      const trialEnd = new Date(company.trial_ends_at);
      const now = new Date();
      if (now > trialEnd) {
        return []; // Trial expired, no features
      }
    } else if (company.subscription_status !== 'active') {
      return []; // Subscription not active
    }

    return PLAN_FEATURES[company.subscription_plan] || [];
  } catch (error) {
    console.error('Error getting user features:', error);
    return [];
  }
}

module.exports = {
  requireSubscriptionAccess,
  checkRouteAccess,
  hasFeatureAccess,
  getUserFeatures,
  PLAN_FEATURES,
};