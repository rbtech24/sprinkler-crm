const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole, hashPassword } = require('../middleware/auth');

const router = express.Router();

// Get all users in company
router.get('/', asyncHandler(async (req, res) => {
  const { role, active_only = 'true' } = req.query;
  const companyId = req.user.company_id;

  let whereClause = 'WHERE company_id = ?';
  const queryParams = [companyId];

  if (role && ['company_owner', 'system_admin', 'dispatcher', 'technician', 'viewer'].includes(role)) {
    whereClause += ' AND role = ?';
    queryParams.push(role);
  }

  if (active_only === 'true') {
    whereClause += ' AND is_active = 1';
  }

  const result = await query(
    `SELECT id, email, name, role, is_active, last_login_at, created_at
     FROM users
     ${whereClause}
     ORDER BY role, name`,
    queryParams,
  );

  res.json(result || []);
}));

// Get single user
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, email, full_name, phone, role, is_active, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1 AND company_id = $2`,
    [req.params.id, req.companyId],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(result.rows[0]);
}));

// Create new user (invite)
router.post('/', requireRole(['owner', 'admin']), [
  body('email').isEmail().withMessage('Valid email is required'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('role').isIn(['admin', 'dispatcher', 'tech', 'viewer']).withMessage('Invalid role'),
  body('phone').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    email, full_name, role, phone,
  } = req.body;

  // Check if email already exists in company
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1 AND company_id = $2',
    [email, req.companyId],
  );

  if (existingUser.rows.length > 0) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  // Check company seat limit
  const seatCheck = await query(
    `SELECT COUNT(u.id) as current_users, c.plan_seat_limit
     FROM users u
     JOIN companies c ON u.company_id = c.id
     WHERE u.company_id = $1 AND u.is_active = true
     GROUP BY c.plan_seat_limit`,
    [req.companyId],
  );

  if (seatCheck.rows.length > 0) {
    const { current_users, plan_seat_limit } = seatCheck.rows[0];
    if (current_users >= plan_seat_limit) {
      return res.status(403).json({
        error: 'Company has reached user limit',
        current_users,
        limit: plan_seat_limit,
      });
    }
  }

  // Generate temporary password (user will be prompted to change on first login)
  const tempPassword = Math.random().toString(36).slice(-12);
  const hashedPassword = await hashPassword(tempPassword);

  const result = await query(
    `INSERT INTO users (company_id, email, full_name, phone, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, email, full_name, phone, role, is_active, created_at`,
    [req.companyId, email, full_name, phone, role, hashedPassword],
  );

  // TODO: Send invitation email with temporary password
  // For now, return the temp password in response (remove in production)

  res.status(201).json({
    ...result.rows[0],
    temp_password: tempPassword, // Remove this in production
  });
}));

// Update user
router.patch('/:id', requireRole(['owner', 'admin']), [
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().isString(),
  body('role').optional().isIn(['admin', 'dispatcher', 'tech', 'viewer']).withMessage('Invalid role'),
  body('is_active').optional().isBoolean(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Prevent non-owners from modifying owner accounts
  if (req.user.role !== 'owner') {
    const targetUser = await query(
      'SELECT role FROM users WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId],
    );

    if (targetUser.rows.length > 0 && targetUser.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'Cannot modify owner account' });
    }
  }

  // Prevent users from deactivating themselves
  if (req.params.id === req.user.id && req.body.is_active === false) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  const {
    full_name, phone, role, is_active,
  } = req.body;

  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (full_name !== undefined) {
    updateFields.push(`full_name = $${paramCount++}`);
    values.push(full_name);
  }
  if (phone !== undefined) {
    updateFields.push(`phone = $${paramCount++}`);
    values.push(phone);
  }
  if (role !== undefined) {
    updateFields.push(`role = $${paramCount++}`);
    values.push(role);
  }
  if (is_active !== undefined) {
    updateFields.push(`is_active = $${paramCount++}`);
    values.push(is_active);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updateFields.push('updated_at = NOW()');
  values.push(req.params.id, req.companyId);

  const result = await query(
    `UPDATE users SET ${updateFields.join(', ')} 
     WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
     RETURNING id, email, full_name, phone, role, is_active, updated_at`,
    values,
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(result.rows[0]);
}));

// Get user's assigned inspections
router.get('/:id/inspections', asyncHandler(async (req, res) => {
  const { status = 'all', limit = 20, page = 1 } = req.query;
  const offset = (page - 1) * limit;

  // Verify user belongs to company
  const userCheck = await query(
    'SELECT id FROM users WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  let whereClause = 'WHERE i.tech_id = $1 AND i.company_id = $2';
  const queryParams = [req.params.id, req.companyId];

  if (status === 'completed') {
    whereClause += ' AND i.submitted_at IS NOT NULL';
  } else if (status === 'in_progress') {
    whereClause += ' AND i.submitted_at IS NULL';
  }

  const result = await query(
    `SELECT i.id, i.started_at, i.submitted_at, i.notes,
            s.nickname as site_name, s.address_json,
            c.name as client_name,
            t.name as template_name,
            COUNT(ii.id) as total_items
     FROM inspections i
     JOIN sites s ON i.site_id = s.id
     JOIN clients c ON s.client_id = c.id
     JOIN inspection_templates t ON i.template_id = t.id
     LEFT JOIN inspection_items ii ON i.id = ii.inspection_id
     ${whereClause}
     GROUP BY i.id, i.started_at, i.submitted_at, i.notes,
              s.nickname, s.address_json, c.name, t.name
     ORDER BY i.created_at DESC
     LIMIT $3 OFFSET $4`,
    [...queryParams, limit, offset],
  );

  res.json({
    inspections: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
}));

// Get user's performance stats
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  // Verify user belongs to company
  const userCheck = await query(
    'SELECT id, role FROM users WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  let dateFilter = '';
  const queryParams = [req.params.id, req.companyId];
  let paramCount = 3;

  if (start_date) {
    dateFilter += ` AND i.created_at >= $${paramCount}`;
    queryParams.push(start_date);
    paramCount++;
  }

  if (end_date) {
    dateFilter += ` AND i.created_at <= $${paramCount}`;
    queryParams.push(end_date);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       COUNT(i.id) as total_inspections,
       COUNT(CASE WHEN i.submitted_at IS NOT NULL THEN 1 END) as completed_inspections,
       COUNT(CASE WHEN i.submitted_at IS NULL THEN 1 END) as in_progress_inspections,
       AVG(EXTRACT(EPOCH FROM (i.submitted_at - i.started_at))/3600) as avg_inspection_hours,
       COUNT(DISTINCT s.client_id) as unique_clients,
       COUNT(DISTINCT s.id) as unique_sites
     FROM inspections i
     JOIN sites s ON i.site_id = s.id
     WHERE i.tech_id = $1 AND i.company_id = $2 ${dateFilter}`,
    queryParams,
  );

  // Get recent activity
  const activityResult = await query(
    `SELECT i.id, i.started_at, i.submitted_at,
            s.nickname as site_name,
            c.name as client_name
     FROM inspections i
     JOIN sites s ON i.site_id = s.id
     JOIN clients c ON s.client_id = c.id
     WHERE i.tech_id = $1 AND i.company_id = $2 ${dateFilter}
     ORDER BY i.created_at DESC
     LIMIT 10`,
    queryParams,
  );

  res.json({
    stats: result.rows[0],
    recent_inspections: activityResult.rows,
  });
}));

// Reset user password (admin only)
router.post('/:id/reset-password', requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  // Verify user belongs to company
  const userCheck = await query(
    'SELECT id, email FROM users WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (userCheck.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Generate new temporary password
  const tempPassword = Math.random().toString(36).slice(-12);
  const hashedPassword = await hashPassword(tempPassword);

  await query(
    `UPDATE users 
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [hashedPassword, req.params.id, req.companyId],
  );

  // TODO: Send password reset email
  // For now, return the temp password in response (remove in production)

  res.json({
    message: 'Password reset successfully',
    temp_password: tempPassword, // Remove this in production
  });
}));

// Deactivate user (soft delete)
router.delete('/:id', requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  // Prevent users from deleting themselves
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  // Prevent non-owners from deleting owner accounts
  if (req.user.role !== 'owner') {
    const targetUser = await query(
      'SELECT role FROM users WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId],
    );

    if (targetUser.rows.length > 0 && targetUser.rows[0].role === 'owner') {
      return res.status(403).json({ error: 'Cannot delete owner account' });
    }
  }

  const result = await query(
    `UPDATE users 
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND company_id = $2
     RETURNING id`,
    [req.params.id, req.companyId],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ message: 'User deactivated successfully' });
}));

module.exports = router;
