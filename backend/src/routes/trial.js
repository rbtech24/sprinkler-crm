const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getTrialStatus } = require('../middleware/trialEnforcement');
const { get, run, query } = require('../database/sqlite');
const router = express.Router();

// Get current trial status
router.get('/status', authenticateToken, getTrialStatus);

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await query(`
      SELECT 
        name,
        display_name,
        price_monthly,
        price_yearly,
        max_users,
        max_clients,
        max_inspections_per_month,
        features,
        is_active
      FROM subscription_plans 
      WHERE is_active = 1 
      ORDER BY price_monthly ASC
    `);

    const formattedPlans = plans.map(plan => ({
      ...plan,
      price_monthly: plan.price_monthly / 100, // Convert from cents
      price_yearly: plan.price_yearly ? plan.price_yearly / 100 : null,
      features: JSON.parse(plan.features || '[]')
    }));

    res.json({
      success: true,
      data: formattedPlans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Extend trial (system admin only)
router.post('/extend', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'system_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { companyId, days = 7 } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Extend trial by specified days
    await run(`
      UPDATE companies 
      SET 
        trial_ends_at = datetime(trial_ends_at, '+${days} days'),
        is_locked = 0,
        lock_reason = NULL,
        subscription_status = 'trial'
      WHERE id = ?
    `, [companyId]);

    res.json({
      success: true,
      message: `Trial extended by ${days} days`
    });
  } catch (error) {
    console.error('Error extending trial:', error);
    res.status(500).json({ error: 'Failed to extend trial' });
  }
});

// Get trial analytics (system admin only)
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'system_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get trial statistics
    const stats = await get(`
      SELECT 
        COUNT(*) as total_companies,
        COUNT(CASE WHEN subscription_status = 'trial' THEN 1 END) as active_trials,
        COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END) as expired_trials,
        COUNT(CASE WHEN subscription_status NOT IN ('trial', 'expired') THEN 1 END) as paying_customers,
        COUNT(CASE WHEN is_locked = 1 THEN 1 END) as locked_accounts
      FROM companies
    `);

    // Get companies expiring soon
    const expiringSoon = await query(`
      SELECT 
        id,
        name,
        trial_ends_at,
        subscription_status,
        created_at,
        julianday(trial_ends_at) - julianday('now') as days_left
      FROM companies 
      WHERE subscription_status = 'trial' 
        AND julianday(trial_ends_at) - julianday('now') <= 3
        AND julianday(trial_ends_at) - julianday('now') > 0
      ORDER BY trial_ends_at ASC
    `);

    // Get recent signups
    const recentSignups = await query(`
      SELECT 
        id,
        name,
        subscription_status,
        created_at,
        trial_ends_at
      FROM companies 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        overview: stats,
        expiringSoon: expiringSoon.map(company => ({
          ...company,
          daysLeft: Math.max(0, Math.ceil(company.days_left))
        })),
        recentSignups
      }
    });
  } catch (error) {
    console.error('Error fetching trial analytics:', error);
    res.status(500).json({ error: 'Failed to fetch trial analytics' });
  }
});

module.exports = router;