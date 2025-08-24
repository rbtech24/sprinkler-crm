const express = require('express');
const {
  body, validationResult, param, query,
} = require('express-validator');
const customerAuthService = require('../services/customerAuthService');
const db = require('../database/sqlite');

const router = express.Router();

/**
 * Customer Authentication Middleware
 */
const authenticateCustomer = async (req, res, next) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
                        || req.cookies?.customerSession;

    if (!sessionToken) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const validation = await customerAuthService.validateSession(sessionToken);

    if (!validation.valid) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.customer = validation.customer;
    next();
  } catch (error) {
    console.error('Customer authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Company Context Middleware - validates company exists
 */
const validateCompany = async (req, res, next) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const company = await db.get(`
      SELECT id, name, email, phone, website
      FROM companies 
      WHERE id = ? AND deleted_at IS NULL
    `, [companyId]);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    req.company = company;
    next();
  } catch (error) {
    console.error('Company validation error:', error);
    res.status(500).json({ error: 'Company validation failed' });
  }
};

// =============================================================================
// Authentication Routes
// =============================================================================

/**
 * Send magic link for customer authentication
 * POST /api/customer-portal/:companyId/auth/magic-link
 */
router.post('/:companyId/auth/magic-link', [
  param('companyId').isInt().withMessage('Valid company ID required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  validateCompany,
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const companyId = req.company.id;

    // Check if customer portal is enabled
    const settings = await customerAuthService.getPortalSettings(companyId);
    if (!settings.is_enabled) {
      return res.status(403).json({
        error: 'Customer portal is not enabled for this company',
      });
    }

    const result = await customerAuthService.sendMagicLink(email, companyId);

    if (result.success) {
      res.json({
        message: result.message,
        expiresIn: result.expiresIn,
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Magic link request error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

/**
 * Verify magic link token and authenticate
 * GET /api/customer-portal/auth/verify?token=...
 */
router.get('/auth/verify', [
  query('token').notEmpty().withMessage('Token required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.query;
    const result = await customerAuthService.verifyMagicLink(token);

    if (result.success) {
      // Set session cookie
      res.cookie('customerSession', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        token: result.token,
        expiresAt: result.expiresAt,
        customer: result.customer,
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

/**
 * Logout customer
 * POST /api/customer-portal/auth/logout
 */
router.post('/auth/logout', authenticateCustomer, async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
                        || req.cookies?.customerSession;

    if (sessionToken) {
      await customerAuthService.logout(sessionToken);
    }

    res.clearCookie('customerSession');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// =============================================================================
// Protected Customer Routes (require authentication)
// =============================================================================
router.use(authenticateCustomer);

/**
 * Get customer profile and accessible sites
 * GET /api/customer-portal/profile
 */
router.get('/profile', async (req, res) => {
  try {
    const { customer } = req;

    // Get client details
    const client = await db.get(`
      SELECT c.*, comp.name as company_name, comp.phone as company_phone,
             comp.email as company_email, comp.website as company_website
      FROM clients c
      JOIN companies comp ON c.company_id = comp.id
      WHERE c.id = ?
    `, [customer.clientId]);

    // Get service history summary
    const serviceHistory = await db.query(`
      SELECT 
        i.id,
        'inspection' as service_type,
        i.created_at as service_date,
        i.status,
        s.name as site_name,
        s.address as site_address
      FROM inspections i
      JOIN sites s ON i.site_id = s.id
      WHERE s.client_id = ?
      
      UNION ALL
      
      SELECT 
        wo.id,
        'work_order' as service_type,
        wo.scheduled_at as service_date,
        wo.status,
        s.name as site_name,
        s.address as site_address
      FROM work_orders wo
      JOIN sites s ON wo.site_id = s.id
      WHERE s.client_id = ?
      
      ORDER BY service_date DESC
      LIMIT 10
    `, [customer.clientId, customer.clientId]);

    res.json({
      customer: {
        ...customer,
        client,
      },
      recentServices: serviceHistory,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * Get service history for customer
 * GET /api/customer-portal/services
 */
router.get('/services', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['inspection', 'work_order']),
  query('site_id').optional().isInt().toInt(),
], async (req, res) => {
  try {
    const {
      page = 1, limit = 20, type, site_id,
    } = req.query;
    const offset = (page - 1) * limit;
    const { customer } = req;

    // Build query conditions
    const whereConditions = ['s.client_id = ?'];
    const params = [customer.clientId];

    if (site_id) {
      whereConditions.push('s.id = ?');
      params.push(site_id);
    }

    let serviceQuery = '';

    if (!type || type === 'inspection') {
      serviceQuery += `
        SELECT 
          i.id,
          'inspection' as service_type,
          i.created_at as service_date,
          i.status,
          i.issues_count,
          i.pdf_ready,
          s.id as site_id,
          s.name as site_name,
          s.address as site_address,
          u.name as technician_name
        FROM inspections i
        JOIN sites s ON i.site_id = s.id
        LEFT JOIN users u ON i.tech_id = u.id
        WHERE ${whereConditions.join(' AND ')}
      `;
    }

    if (!type || type === 'work_order') {
      if (serviceQuery) serviceQuery += ' UNION ALL ';
      serviceQuery += `
        SELECT 
          wo.id,
          'work_order' as service_type,
          wo.scheduled_at as service_date,
          wo.status,
          NULL as issues_count,
          NULL as pdf_ready,
          s.id as site_id,
          s.name as site_name,
          s.address as site_address,
          u.name as technician_name
        FROM work_orders wo
        JOIN sites s ON wo.site_id = s.id
        LEFT JOIN users u ON wo.tech_id = u.id
        WHERE ${whereConditions.join(' AND ')}
      `;
    }

    serviceQuery += `
      ORDER BY service_date DESC
      LIMIT ? OFFSET ?
    `;

    const services = await db.query(serviceQuery, [...params, ...params, limit, offset]);

    // Get total count for pagination
    let countQuery = '';
    if (!type || type === 'inspection') {
      countQuery = `SELECT COUNT(*) as count FROM inspections i JOIN sites s ON i.site_id = s.id WHERE ${whereConditions.join(' AND ')}`;
    }
    if (!type || type === 'work_order') {
      if (countQuery) countQuery += ' UNION ALL ';
      countQuery += `SELECT COUNT(*) as count FROM work_orders wo JOIN sites s ON wo.site_id = s.id WHERE ${whereConditions.join(' AND ')}`;
    }

    const countResult = await db.query(countQuery, [...params, ...params]);
    const totalCount = countResult.reduce((sum, row) => sum + row.count, 0);

    res.json({
      services,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Service history error:', error);
    res.status(500).json({ error: 'Failed to fetch service history' });
  }
});

/**
 * Get available documents for customer
 * GET /api/customer-portal/documents
 */
router.get('/documents', async (req, res) => {
  try {
    const { customer } = req;

    const documents = await db.query(`
      SELECT 
        cd.*,
        s.name as site_name,
        s.address as site_address
      FROM customer_documents cd
      LEFT JOIN sites s ON cd.site_id = s.id
      WHERE cd.customer_user_id = ?
        AND cd.is_active = 1
        AND (cd.expires_at IS NULL OR cd.expires_at > datetime('now'))
      ORDER BY cd.shared_at DESC
    `, [customer.id]);

    res.json({ documents });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * Download/view a document
 * GET /api/customer-portal/documents/:id/download
 */
router.get('/documents/:id/download', [
  param('id').isInt().withMessage('Valid document ID required'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { customer } = req;

    const document = await db.get(`
      SELECT * FROM customer_documents
      WHERE id = ? AND customer_user_id = ?
        AND is_active = 1
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [id, customer.id]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found or expired' });
    }

    // Update access count and track download
    await db.run(`
      UPDATE customer_documents 
      SET access_count = access_count + 1,
          downloaded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    // In a real implementation, you'd serve the file from storage
    // For now, return file info for frontend to handle
    res.json({
      document: {
        id: document.id,
        name: document.document_name,
        type: document.document_type,
        filePath: document.file_path,
        mimeType: document.mime_type,
        size: document.file_size_bytes,
      },
    });
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

/**
 * Submit a service request
 * POST /api/customer-portal/service-requests
 */
router.post('/service-requests', [
  body('site_id').isInt().withMessage('Valid site ID required'),
  body('service_type').notEmpty().withMessage('Service type required'),
  body('description').notEmpty().withMessage('Description required'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer } = req;
    const {
      site_id,
      service_type,
      description,
      priority = 'normal',
      preferred_date,
      preferred_time_start,
      preferred_time_end,
      contact_phone,
      special_instructions,
      photos = [],
    } = req.body;

    // Verify customer has access to the site
    if (!customer.sites.some((site) => site.id === site_id)) {
      return res.status(403).json({ error: 'Access denied to this site' });
    }

    // Check if service requests are allowed
    const settings = await customerAuthService.getPortalSettings(customer.companyId);
    if (!settings.allow_service_requests) {
      return res.status(403).json({
        error: 'Service requests are not enabled',
      });
    }

    const result = await db.run(`
      INSERT INTO service_requests (
        customer_user_id, site_id, service_type, description, priority,
        preferred_date, preferred_time_start, preferred_time_end,
        contact_phone, special_instructions, photos, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [
      customer.id, site_id, service_type, description, priority,
      preferred_date, preferred_time_start, preferred_time_end,
      contact_phone, special_instructions, JSON.stringify(photos),
    ]);

    // Create notification for company
    // TODO: Implement company notification system

    res.status(201).json({
      message: 'Service request submitted successfully',
      requestId: result.id,
    });
  } catch (error) {
    console.error('Service request error:', error);
    res.status(500).json({ error: 'Failed to submit service request' });
  }
});

/**
 * Get customer's service requests
 * GET /api/customer-portal/service-requests
 */
router.get('/service-requests', async (req, res) => {
  try {
    const { customer } = req;

    const requests = await db.query(`
      SELECT 
        sr.*,
        s.name as site_name,
        s.address as site_address,
        u.name as assigned_technician
      FROM service_requests sr
      JOIN sites s ON sr.site_id = s.id
      LEFT JOIN users u ON sr.assigned_to = u.id
      WHERE sr.customer_user_id = ?
      ORDER BY sr.created_at DESC
    `, [customer.id]);

    // Parse JSON fields
    const parsedRequests = requests.map((request) => ({
      ...request,
      photos: request.photos ? JSON.parse(request.photos) : [],
    }));

    res.json({ requests: parsedRequests });
  } catch (error) {
    console.error('Service requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch service requests' });
  }
});

/**
 * Submit feedback for a service
 * POST /api/customer-portal/feedback
 */
router.post('/feedback', [
  body('service_type').isIn(['inspection', 'work_order']).withMessage('Valid service type required'),
  body('related_id').isInt().withMessage('Valid service ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('feedback_text').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer } = req;
    const {
      service_type,
      related_id,
      site_id,
      rating,
      feedback_text,
      would_recommend,
      areas_for_improvement = [],
      technician_rating,
      communication_rating,
      timeliness_rating,
      is_anonymous = false,
    } = req.body;

    // Check if feedback is allowed
    const settings = await customerAuthService.getPortalSettings(customer.companyId);
    if (!settings.allow_feedback) {
      return res.status(403).json({
        error: 'Feedback is not enabled',
      });
    }

    // Verify the service belongs to this customer
    const table = service_type === 'inspection' ? 'inspections' : 'work_orders';
    const service = await db.get(`
      SELECT ${service_type === 'inspection' ? 'i' : 'wo'}.id 
      FROM ${table} ${service_type === 'inspection' ? 'i' : 'wo'}
      JOIN sites s ON ${service_type === 'inspection' ? 'i' : 'wo'}.site_id = s.id
      WHERE ${service_type === 'inspection' ? 'i' : 'wo'}.id = ? 
        AND s.client_id = ?
    `, [related_id, customer.clientId]);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const result = await db.run(`
      INSERT INTO customer_feedback (
        customer_user_id, site_id, service_type, related_id, rating,
        feedback_text, would_recommend, areas_for_improvement,
        technician_rating, communication_rating, timeliness_rating,
        is_anonymous, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      customer.id, site_id, service_type, related_id, rating,
      feedback_text, would_recommend, JSON.stringify(areas_for_improvement),
      technician_rating, communication_rating, timeliness_rating,
      is_anonymous,
    ]);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId: result.id,
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * Get customer notifications
 * GET /api/customer-portal/notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const { customer } = req;
    const { unread_only = false } = req.query;

    let whereClause = 'customer_user_id = ?';
    const params = [customer.id];

    if (unread_only === 'true') {
      whereClause += ' AND read_at IS NULL';
    }

    const notifications = await db.query(`
      SELECT * FROM customer_notifications
      WHERE ${whereClause}
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY created_at DESC
      LIMIT 50
    `, params);

    res.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Mark notification as read
 * PUT /api/customer-portal/notifications/:id/read
 */
router.put('/notifications/:id/read', [
  param('id').isInt().withMessage('Valid notification ID required'),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { customer } = req;

    await db.run(`
      UPDATE customer_notifications 
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND customer_user_id = ?
    `, [id, customer.id]);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Clean up temporary migration file
require('fs').unlink(require('path').join(__dirname, '../../customer-portal-migration.js'), () => {});

module.exports = router;
