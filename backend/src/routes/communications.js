const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../database');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all communications for a client
router.get('/client/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const companyId = req.user.company_id;

  const communicationsQuery = `
    SELECT 
      c.*,
      u.name as created_by_name,
      cl.name as client_name
    FROM communications c
    JOIN users u ON c.created_by = u.id
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.client_id = $1 AND c.company_id = $2
    ORDER BY c.created_at DESC
  `;

  const result = await query(communicationsQuery, [clientId, companyId], companyId);
  res.json(result.rows);
}));

// Create new communication
router.post('/', asyncHandler(async (req, res) => {
  const {
    client_id,
    type,
    subject,
    content,
    scheduled_for,
    follow_up_date,
    priority,
    tags,
  } = req.body;

  const companyId = req.user.company_id;
  const userId = req.user.id;

  const insertQuery = `
    INSERT INTO communications (
      company_id, client_id, created_by, type, subject, content,
      scheduled_for, follow_up_date, priority, tags, status, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
    RETURNING *
  `;

  const result = await query(insertQuery, [
    companyId, client_id, userId, type, subject, content,
    scheduled_for, follow_up_date, priority, JSON.stringify(tags || []),
  ]);

  res.status(201).json(result.rows[0]);
}));

// Update communication status
router.put('/:id/status', asyncHandler(async (req, res) => {
  const communicationId = req.params.id;
  const { status, response_notes } = req.body;
  const companyId = req.user.company_id;

  const updateQuery = `
    UPDATE communications 
    SET status = $1, response_notes = $2, completed_at = $3, updated_at = NOW()
    WHERE id = $4 AND company_id = $5
    RETURNING *
  `;

  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  const result = await query(updateQuery, [
    status, response_notes, completedAt, communicationId, companyId,
  ]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Communication not found' });
  }

  res.json(result.rows[0]);
}));

// Get follow-up reminders
router.get('/follow-ups', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { days_ahead = 7 } = req.query;

  const followUpQuery = `
    SELECT 
      c.*,
      cl.name as client_name,
      cl.email as client_email,
      cl.phone as client_phone,
      u.name as assigned_to_name
    FROM communications c
    JOIN clients cl ON c.client_id = cl.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.company_id = $1 
      AND c.follow_up_date IS NOT NULL
      AND c.follow_up_date <= (CURRENT_DATE + INTERVAL '${days_ahead} days')
      AND c.status != 'completed'
    ORDER BY c.follow_up_date ASC
  `;

  const result = await query(followUpQuery, [companyId]);
  res.json(result.rows);
}));

// Get communication templates
router.get('/templates', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  const templatesQuery = `
    SELECT * FROM communication_templates
    WHERE company_id = $1 OR is_system_template = true
    ORDER BY category, name
  `;

  const result = await query(templatesQuery, [companyId]);
  res.json(result.rows);
}));

// Create communication template
router.post('/templates', asyncHandler(async (req, res) => {
  const {
    name,
    category,
    subject_template,
    content_template,
    variables,
  } = req.body;

  const companyId = req.user.company_id;

  const insertQuery = `
    INSERT INTO communication_templates (
      company_id, name, category, subject_template, content_template,
      variables, is_system_template, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
    RETURNING *
  `;

  const result = await query(insertQuery, [
    companyId, name, category, subject_template, content_template,
    JSON.stringify(variables || []),
  ]);

  res.status(201).json(result.rows[0]);
}));

// Schedule automated follow-up
router.post('/schedule-automated', asyncHandler(async (req, res) => {
  const {
    client_id,
    trigger_event, // 'inspection_completed', 'estimate_sent', 'work_order_completed'
    delay_days,
    template_id,
  } = req.body;

  const companyId = req.user.company_id;
  const userId = req.user.id;

  const insertQuery = `
    INSERT INTO automated_communications (
      company_id, client_id, created_by, trigger_event, delay_days,
      template_id, status, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
    RETURNING *
  `;

  const result = await query(insertQuery, [
    companyId, client_id, userId, trigger_event, delay_days, template_id,
  ]);

  res.status(201).json(result.rows[0]);
}));

// Get communication analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { start_date, end_date } = req.query;

  const analyticsQuery = `
    SELECT 
      type,
      status,
      COUNT(*) as count,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_response_hours
    FROM communications
    WHERE company_id = $1
      AND created_at >= $2
      AND created_at <= $3
    GROUP BY type, status
    ORDER BY type, status
  `;

  const result = await query(analyticsQuery, [
    companyId,
    start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date || new Date().toISOString(),
  ]);

  res.json(result.rows);
}));

module.exports = router;
