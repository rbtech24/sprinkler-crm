const { get, run } = require('../database/sqlite');

/**
 * Trial Enforcement Middleware
 * Checks if a company's trial has expired and blocks access if needed
 */
const trialEnforcement = async (req, res, next) => {
  try {
    // Skip trial enforcement for certain routes
    const skipRoutes = [
      '/api/auth/login',
      '/api/auth/register', 
      '/api/auth/logout',
      '/api/health',
      '/api/trial/status',
      '/api/billing/upgrade'
    ];

    if (skipRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Skip for system admin
    if (req.user && req.user.role === 'system_admin') {
      return next();
    }

    // Check if user is authenticated and has a company
    if (!req.user || !req.user.companyId) {
      return next();
    }

    // Get company trial status
    const company = await get(`
      SELECT 
        id,
        name,
        subscription_status,
        trial_starts_at,
        trial_ends_at,
        is_locked,
        lock_reason,
        trial_notifications_sent
      FROM companies 
      WHERE id = ?
    `, [req.user.companyId]);

    if (!company) {
      return res.status(404).json({ 
        error: 'Company not found',
        trialExpired: true 
      });
    }

    // Check if company is locked
    if (company.is_locked) {
      return res.status(403).json({
        error: 'Account Access Restricted',
        message: company.lock_reason || 'Your account has been temporarily restricted. Please contact support.',
        trialExpired: true,
        companyName: company.name,
        lockReason: company.lock_reason
      });
    }

    // Check trial status
    const now = new Date();
    const trialEndDate = new Date(company.trial_ends_at);
    
    if (company.subscription_status === 'trial' && now > trialEndDate) {
      // Trial has expired - lock the account
      await run(`
        UPDATE companies 
        SET 
          subscription_status = 'expired',
          is_locked = 1,
          lock_reason = 'Your 7-day free trial has ended. Upgrade your plan to continue using all features.'
        WHERE id = ?
      `, [company.id]);

      return res.status(403).json({
        error: 'Trial Expired',
        message: 'Your 7-day free trial has ended. Upgrade your plan to continue using all features.',
        trialExpired: true,
        companyName: company.name,
        trialEndDate: company.trial_ends_at,
        daysExpired: Math.ceil((now - trialEndDate) / (1000 * 60 * 60 * 24))
      });
    }

    // Check if trial is ending soon and send notifications
    if (company.subscription_status === 'trial') {
      const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));
      
      // Send notification 3 days before expiry
      if (daysLeft === 3 && company.trial_notifications_sent < 1) {
        await sendTrialNotification(company.id, 'trial_3_days', company.name);
        await run('UPDATE companies SET trial_notifications_sent = 1 WHERE id = ?', [company.id]);
      }
      
      // Send notification 1 day before expiry  
      if (daysLeft === 1 && company.trial_notifications_sent < 2) {
        await sendTrialNotification(company.id, 'trial_1_day', company.name);
        await run('UPDATE companies SET trial_notifications_sent = 2 WHERE id = ?', [company.id]);
      }

      // Add trial info to request for frontend use
      req.trialInfo = {
        daysLeft,
        trialEndDate: company.trial_ends_at,
        isTrialUser: true
      };
    } else {
      req.trialInfo = {
        isTrialUser: false,
        subscriptionStatus: company.subscription_status
      };
    }

    next();
  } catch (error) {
    console.error('Trial enforcement error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to verify account status' 
    });
  }
};

/**
 * Send trial notification (placeholder - implement email service)
 */
async function sendTrialNotification(companyId, notificationType, companyName) {
  try {
    // Insert notification record
    await run(`
      INSERT INTO trial_notifications (company_id, notification_type, email_sent_to)
      VALUES (?, ?, ?)
    `, [companyId, notificationType, 'admin@company.com']);

    // TODO: Implement actual email sending
    console.log(`📧 Trial notification sent: ${notificationType} for company ${companyName}`);
  } catch (error) {
    console.error('Failed to send trial notification:', error);
  }
}

/**
 * Get trial status for a company (public endpoint)
 */
const getTrialStatus = async (req, res) => {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const company = await get(`
      SELECT 
        id,
        name,
        subscription_status,
        trial_starts_at,
        trial_ends_at,
        is_locked,
        lock_reason,
        subscription_plan
      FROM companies 
      WHERE id = ?
    `, [req.user.companyId]);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const now = new Date();
    const trialEndDate = new Date(company.trial_ends_at);
    const daysLeft = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        companyName: company.name,
        subscriptionStatus: company.subscription_status,
        subscriptionPlan: company.subscription_plan,
        isLocked: Boolean(company.is_locked),
        lockReason: company.lock_reason,
        trialStartDate: company.trial_starts_at,
        trialEndDate: company.trial_ends_at,
        daysLeft: company.subscription_status === 'trial' ? Math.max(0, daysLeft) : null,
        isTrialExpired: company.subscription_status === 'trial' && now > trialEndDate,
        isTrialUser: company.subscription_status === 'trial'
      }
    });
  } catch (error) {
    console.error('Error getting trial status:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
};

module.exports = {
  trialEnforcement,
  getTrialStatus
};