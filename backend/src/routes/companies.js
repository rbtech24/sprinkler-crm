const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get company profile
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, name, email, phone, website, plan, logo_url
     FROM companies
     WHERE id = ?`,
    [req.companyId || req.user.company_id],
  );

  if (result.length === 0) {
    return res.status(404).json({ error: 'Company not found' });
  }

  res.json(result[0]);
}));

// Update company profile
router.patch('/', requireRole(['owner', 'admin']), [
  body('name').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isString(),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('address').optional().isObject(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name, email, phone, website, address,
  } = req.body;

  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (email !== undefined) {
    updateFields.push(`email = $${paramCount++}`);
    values.push(email);
  }
  if (phone !== undefined) {
    updateFields.push(`phone = $${paramCount++}`);
    values.push(phone);
  }
  if (website !== undefined) {
    updateFields.push(`website = $${paramCount++}`);
    values.push(website);
  }
  if (address !== undefined) {
    updateFields.push(`address_json = $${paramCount++}`);
    values.push(JSON.stringify(address));
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updateFields.push('updated_at = NOW()');
  values.push(req.companyId);

  const result = await query(
    `UPDATE companies SET ${updateFields.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING id, name, email, phone, website, address_json`,
    values,
  );

  res.json(result.rows[0]);
}));

// Get subscription info
router.get('/subscription', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT s.plan, s.status, s.current_period_end, s.seats,
            c.plan_seat_limit
     FROM subscriptions s
     JOIN companies c ON s.company_id = c.id
     WHERE s.company_id = $1
     ORDER BY s.created_at DESC
     LIMIT 1`,
    [req.companyId],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  res.json(result.rows[0]);
}));

// Get company stats (dashboard)
router.get('/stats', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  
  // Get basic counts with SQLite syntax
  const stats = {};
  
  try {
    // Active users
    const activeUsersResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = ?',
      [companyId]
    );
    stats.active_users = activeUsersResult[0]?.count || 0;

    // Total clients
    const clientsResult = await query(
      'SELECT COUNT(*) as count FROM clients WHERE company_id = ?',
      [companyId]
    );
    stats.total_clients = clientsResult[0]?.count || 0;

    // Total sites
    const sitesResult = await query(
      'SELECT COUNT(*) as count FROM sites WHERE company_id = ?',
      [companyId]
    );
    stats.total_sites = sitesResult[0]?.count || 0;

    // Total inspections
    const inspectionsResult = await query(
      'SELECT COUNT(*) as count FROM inspections WHERE company_id = ?',
      [companyId]
    );
    stats.total_inspections = inspectionsResult[0]?.count || 0;

    // Inspections last 30 days (SQLite date function)
    const recent30Result = await query(
      `SELECT COUNT(*) as count FROM inspections 
       WHERE company_id = ? AND created_at >= datetime('now', '-30 days')`,
      [companyId]
    );
    stats.inspections_last_30_days = recent30Result[0]?.count || 0;

    // Total estimates
    const estimatesResult = await query(
      'SELECT COUNT(*) as count FROM estimates WHERE company_id = ?',
      [companyId]
    );
    stats.total_estimates = estimatesResult[0]?.count || 0;

    // Approved estimates
    const approvedResult = await query(
      `SELECT COUNT(*) as count FROM estimates 
       WHERE company_id = ? AND status = 'approved'`,
      [companyId]
    );
    stats.approved_estimates = approvedResult[0]?.count || 0;

    // Total approved value
    const totalValueResult = await query(
      `SELECT COALESCE(SUM(total_cents), 0) as total 
       FROM estimates WHERE company_id = ? AND status = 'approved'`,
      [companyId]
    );
    stats.total_approved_value = totalValueResult[0]?.total || 0;

  } catch (error) {
    console.error('Stats error:', error);
    // Return empty stats if there are errors
  }

  // Get recent activity with simpler query
  let recentActivity = [];
  try {
    const activityResult = await query(
      `SELECT 
         'inspection' as type,
         i.id,
         i.created_at,
         s.name as site_name,
         c.name as client_name,
         u.name as tech_name
       FROM inspections i
       JOIN sites s ON i.site_id = s.id
       JOIN clients c ON s.client_id = c.id
       LEFT JOIN users u ON i.tech_id = u.id
       WHERE i.company_id = ?
       ORDER BY i.created_at DESC
       LIMIT 10`,
      [companyId]
    );
    recentActivity = activityResult || [];
  } catch (error) {
    console.error('Recent activity error:', error);
  }

  res.json({
    stats,
    recent_activity: recentActivity,
  });
}));

module.exports = router;
