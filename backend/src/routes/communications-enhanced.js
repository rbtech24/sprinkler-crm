const express = require('express');
const {
  body, param, query, validationResult,
} = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const communicationService = require('../services/communicationService');
const db = require('../database/sqlite');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Send manual email communication
 * POST /api/communications/email
 */
router.post('/email', [
  body('client_id').isInt().withMessage('Valid client ID required'),
  body('subject').notEmpty().withMessage('Email subject required'),
  body('content').notEmpty().withMessage('Email content required'),
  body('template_id').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      client_id, subject, content, template_id,
    } = req.body;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [client_id, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.email) {
      return res.status(400).json({ error: 'Client has no email address' });
    }

    const result = await communicationService.sendEmail({
      to: client.email,
      subject,
      content,
      client_id,
      company_id: companyId,
      template_id,
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Email sent successfully',
        communication_id: result.communication_id,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/**
 * Send SMS communication
 * POST /api/communications/sms
 */
router.post('/sms', [
  body('client_id').isInt().withMessage('Valid client ID required'),
  body('message').isLength({ min: 1, max: 1600 }).withMessage('Message must be 1-1600 characters'),
  body('template_id').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { client_id, message, template_id } = req.body;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [client_id, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.phone) {
      return res.status(400).json({ error: 'Client has no phone number' });
    }

    const result = await communicationService.sendSMS({
      to: client.phone,
      message,
      client_id,
      company_id: companyId,
      template_id,
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'SMS sent successfully',
        communication_id: result.communication_id,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Schedule follow-up communication
 * POST /api/communications/schedule
 */
router.post('/schedule', [
  body('client_id').isInt().withMessage('Valid client ID required'),
  body('scheduled_date').isISO8601().withMessage('Valid scheduled date required'),
  body('communication_type').isIn(['email', 'text', 'phone', 'follow_up']).withMessage('Valid communication type required'),
  body('subject').optional().isString(),
  body('content').notEmpty().withMessage('Communication content required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      client_id,
      scheduled_date,
      communication_type,
      subject,
      content,
    } = req.body;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [client_id, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = await communicationService.scheduleFollowUp({
      client_id,
      company_id: companyId,
      scheduled_date,
      subject,
      content,
      communication_type,
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Communication scheduled successfully',
        communication_id: result.communication_id,
        scheduled_for: result.scheduled_for,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Communication scheduling error:', error);
    res.status(500).json({ error: 'Failed to schedule communication' });
  }
});

/**
 * Get communication history for a client
 * GET /api/communications/client/:clientId/history
 */
router.get('/client/:clientId/history', [
  param('clientId').isInt().withMessage('Valid client ID required'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['email', 'text', 'phone', 'meeting', 'note']),
  query('status').optional().isIn(['scheduled', 'sent', 'delivered', 'failed', 'completed']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId } = req.params;
    const {
      page = 1, limit = 20, type, status,
    } = req.query;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [clientId, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const history = await communicationService.getClientCommunicationHistory(
      clientId,
      {
        page, limit, type, status,
      },
    );

    res.json(history);
  } catch (error) {
    console.error('Communication history error:', error);
    res.status(500).json({ error: 'Failed to get communication history' });
  }
});

/**
 * Get all communications for the company
 * GET /api/communications
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['email', 'text', 'phone', 'meeting', 'note']),
  query('status').optional().isIn(['scheduled', 'sent', 'delivered', 'failed', 'completed']),
  query('direction').optional().isIn(['inbound', 'outbound']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      type,
      status,
      direction,
      start_date,
      end_date,
    } = req.query;
    const companyId = req.user.company_id;
    const offset = (page - 1) * limit;

    // Build query conditions
    const whereConditions = ['c.company_id = ?'];
    const params = [companyId];

    if (type) {
      whereConditions.push('c.communication_type = ?');
      params.push(type);
    }

    if (status) {
      whereConditions.push('c.status = ?');
      params.push(status);
    }

    if (direction) {
      whereConditions.push('c.direction = ?');
      params.push(direction);
    }

    if (start_date) {
      whereConditions.push('c.created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('c.created_at <= ?');
      params.push(end_date);
    }

    const communications = await db.query(`
      SELECT 
        c.*,
        cl.name as client_name,
        cl.email as client_email,
        cl.phone as client_phone,
        u.name as user_name
      FROM communications c
      JOIN clients cl ON c.client_id = cl.id
      LEFT JOIN users u ON c.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM communications c
      JOIN clients cl ON c.client_id = cl.id
      WHERE ${whereConditions.join(' AND ')}
    `, params);

    res.json({
      communications,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (error) {
    console.error('Communications fetch error:', error);
    res.status(500).json({ error: 'Failed to get communications' });
  }
});

/**
 * Get communication templates
 * GET /api/communications/templates
 */
router.get('/templates', [
  query('template_type').optional().isIn(['email', 'text', 'follow_up']),
], async (req, res) => {
  try {
    const { template_type } = req.query;
    const companyId = req.user.company_id;

    let whereClause = 'WHERE company_id = ? AND is_active = 1';
    const params = [companyId];

    if (template_type) {
      whereClause += ' AND template_type = ?';
      params.push(template_type);
    }

    const templates = await db.query(`
      SELECT 
        id, name, template_type, subject, content, variables,
        created_at, updated_at
      FROM communication_templates
      ${whereClause}
      ORDER BY name
    `, params);

    // Parse JSON variables
    const parsedTemplates = templates.map((template) => ({
      ...template,
      variables: template.variables ? JSON.parse(template.variables) : [],
    }));

    res.json({ templates: parsedTemplates });
  } catch (error) {
    console.error('Templates fetch error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * Create communication template
 * POST /api/communications/templates
 */
router.post('/templates', [
  body('name').notEmpty().withMessage('Template name required'),
  body('template_type').isIn(['email', 'text', 'follow_up']).withMessage('Valid template type required'),
  body('subject').if(body('template_type').equals('email')).notEmpty().withMessage('Email subject required'),
  body('content').notEmpty().withMessage('Template content required'),
  body('variables').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      template_type,
      subject,
      content,
      variables = [],
    } = req.body;
    const companyId = req.user.company_id;
    const createdBy = req.user.id;

    const result = await communicationService.createTemplate({
      company_id: companyId,
      name,
      template_type,
      subject,
      content,
      variables,
      created_by: createdBy,
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        template_id: result.template_id,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Template creation error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Get communication statistics
 * GET /api/communications/stats
 */
router.get('/stats', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const options = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };

    const stats = await communicationService.getCommunicationStats(companyId, options);
    res.json(stats);
  } catch (error) {
    console.error('Communication stats error:', error);
    res.status(500).json({ error: 'Failed to get communication statistics' });
  }
});

/**
 * Trigger automated communication
 * POST /api/communications/automated
 */
router.post('/automated', [
  body('trigger_type').isIn(['inspection_complete', 'estimate_sent', 'work_order_complete', 'payment_received']).withMessage('Valid trigger type required'),
  body('context_data').isObject().withMessage('Context data required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trigger_type, context_data } = req.body;
    context_data.company_id = req.user.company_id;

    const result = await communicationService.sendAutomatedCommunication(
      trigger_type,
      context_data,
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        communications_sent: result.communications_sent,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Automated communication error:', error);
    res.status(500).json({ error: 'Failed to trigger automated communication' });
  }
});

module.exports = router;
