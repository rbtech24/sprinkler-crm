const express = require('express');
const { body, validationResult } = require('express-validator');
const { query: pgQuery, transaction: pgTransaction } = require('../database');
const { query, get, run, all } = require('../database/sqlite');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const PDFReportService = require('../services/pdfService');

const router = express.Router();
const pdfService = new PDFReportService();

// Get all inspection templates for company
router.get('/templates', asyncHandler(async (req, res) => {
  const result = await all(
    `SELECT id, name, code, schema_json, callouts_json, is_active, created_at
     FROM inspection_templates 
     WHERE company_id = ? OR company_id = 6
     ORDER BY 
       CASE WHEN company_id = ? THEN 0 ELSE 1 END,
       name`,
    [req.user.companyId, req.user.companyId]
  );

  res.json(result);
}));

// Get specific template
router.get('/templates/:id', asyncHandler(async (req, res) => {
  const result = await get(
    `SELECT * FROM inspection_templates 
     WHERE id = ? AND (company_id = ? OR company_id = 6)`,
    [req.params.id, req.user.companyId]
  );

  if (!result) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json(result);
}));

// Create custom inspection template
router.post('/templates', requireRole(['owner', 'admin']), [
  body('name').notEmpty().withMessage('Template name is required'),
  body('schema_json').isObject().withMessage('Schema must be a valid JSON object'),
  body('callouts_json').isObject().withMessage('Callouts must be a valid JSON object'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, schema_json, callouts_json } = req.body;

  const result = await query(
    `INSERT INTO inspection_templates (company_id, name, code, schema_json, callouts_json)
     VALUES ($1, $2, 'custom', $3, $4)
     RETURNING *`,
    [req.companyId, name, JSON.stringify(schema_json), JSON.stringify(callouts_json)],
  );

  res.status(201).json(result.rows[0]);
}));

// Get all inspections
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    tech_id,
    site_id,
    status = 'all',
    start_date,
    end_date,
  } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = 'WHERE i.company_id = $1';
  const queryParams = [req.companyId];
  let paramCount = 2;

  if (tech_id) {
    whereClause += ` AND i.tech_id = $${paramCount}`;
    queryParams.push(tech_id);
    paramCount++;
  }

  if (site_id) {
    whereClause += ` AND i.site_id = $${paramCount}`;
    queryParams.push(site_id);
    paramCount++;
  }

  if (status === 'completed') {
    whereClause += ' AND i.submitted_at IS NOT NULL';
  } else if (status === 'in_progress') {
    whereClause += ' AND i.submitted_at IS NULL';
  }

  if (start_date) {
    whereClause += ` AND i.created_at >= $${paramCount}`;
    queryParams.push(start_date);
    paramCount++;
  }

  if (end_date) {
    whereClause += ` AND i.created_at <= $${paramCount}`;
    queryParams.push(end_date);
    paramCount++;
  }

  const result = await query(
    `SELECT i.id, i.started_at, i.submitted_at, i.notes, i.created_at,
            s.nickname as site_name, s.address_json,
            c.name as client_name, c.contact_type,
            u.full_name as tech_name,
            t.name as template_name,
            COUNT(ii.id) as total_items,
            COUNT(CASE WHEN ii.severity IN ('high', 'critical') THEN 1 END) as critical_issues
     FROM inspections i
     JOIN sites s ON i.site_id = s.id
     JOIN clients c ON s.client_id = c.id
     JOIN users u ON i.tech_id = u.id
     JOIN inspection_templates t ON i.template_id = t.id
     LEFT JOIN inspection_items ii ON i.id = ii.inspection_id
     ${whereClause}
     GROUP BY i.id, i.started_at, i.submitted_at, i.notes, i.created_at,
              s.nickname, s.address_json, c.name, c.contact_type, u.full_name, t.name
     ORDER BY i.created_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
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

// Get single inspection with details
router.get('/:id', asyncHandler(async (req, res) => {
  const inspectionResult = await query(
    `SELECT i.*, 
            s.nickname as site_name, s.address_json,
            c.name as client_name, c.contact_type, c.billing_email,
            u.full_name as tech_name, u.email as tech_email,
            t.name as template_name, t.schema_json, t.callouts_json
     FROM inspections i
     JOIN sites s ON i.site_id = s.id
     JOIN clients c ON s.client_id = c.id
     JOIN users u ON i.tech_id = u.id
     JOIN inspection_templates t ON i.template_id = t.id
     WHERE i.id = $1 AND i.company_id = $2`,
    [req.params.id, req.companyId],
  );

  if (inspectionResult.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  // Get inspection items
  const itemsResult = await query(
    `SELECT ii.*, 
            array_agg(p.file_id) FILTER (WHERE p.file_id IS NOT NULL) as photo_ids
     FROM inspection_items ii
     LEFT JOIN photos p ON ii.id = p.inspection_item_id
     WHERE ii.inspection_id = $1
     GROUP BY ii.id
     ORDER BY ii.zone_number, ii.created_at`,
    [req.params.id],
  );

  res.json({
    ...inspectionResult.rows[0],
    items: itemsResult.rows,
  });
}));

// Start new inspection
router.post('/', [
  body('site_id').isUUID().withMessage('Valid site ID is required'),
  body('template_id').isUUID().withMessage('Valid template ID is required'),
  body('tech_id').optional().isUUID().withMessage('Valid tech ID required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { site_id, template_id, tech_id = req.user.id } = req.body;

  // Verify site belongs to company
  const siteCheck = await query(
    'SELECT id FROM sites WHERE id = $1 AND company_id = $2',
    [site_id, req.companyId],
  );

  if (siteCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Site not found' });
  }

  // Verify template exists
  const templateCheck = await query(
    `SELECT id FROM inspection_templates 
     WHERE id = $1 AND (company_id = $2 OR company_id = '00000000-0000-0000-0000-000000000000')`,
    [template_id, req.companyId],
  );

  if (templateCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Verify tech belongs to company
  const techCheck = await query(
    'SELECT id FROM users WHERE id = $1 AND company_id = $2',
    [tech_id, req.companyId],
  );

  if (techCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Technician not found' });
  }

  const result = await query(
    `INSERT INTO inspections (company_id, site_id, template_id, tech_id, started_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [req.companyId, site_id, template_id, tech_id],
  );

  res.status(201).json(result.rows[0]);
}));

// Add inspection item/finding
router.post('/:id/items', [
  body('zone_number').optional().isInt({ min: 1 }).withMessage('Zone number must be positive'),
  body('area_label').optional().isString(),
  body('device_type').optional().isIn(['backflow', 'controller', 'valve', 'sensor']),
  body('head_type').optional().isIn(['spray', 'rotor', 'drip', 'bubbler', 'unknown']),
  body('callout_code').optional().isString(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('notes').optional().isString(),
  body('photos').optional().isArray(),
  body('metadata').optional().isObject(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Verify inspection exists and belongs to company
  const inspectionCheck = await query(
    'SELECT id FROM inspections WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (inspectionCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  const {
    zone_number,
    area_label,
    device_type,
    head_type,
    callout_code,
    severity,
    notes,
    photos = [],
    metadata = {},
  } = req.body;

  const result = await query(
    `INSERT INTO inspection_items (
       inspection_id, zone_number, area_label, device_type, head_type,
       callout_code, severity, notes, photos, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      req.params.id, zone_number, area_label, device_type, head_type,
      callout_code, severity, notes, photos, JSON.stringify(metadata),
    ],
  );

  res.status(201).json(result.rows[0]);
}));

// Submit inspection (mark as complete)
router.post('/:id/submit', [
  body('program_settings').optional().isObject(),
  body('summary_json').optional().isObject(),
  body('notes').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { program_settings, summary_json, notes } = req.body;

  await transaction(async (client) => {
    // Update inspection as submitted
    const result = await client.query(
      `UPDATE inspections 
       SET submitted_at = NOW(),
           program_settings = $1,
           summary_json = $2,
           notes = $3,
           updated_at = NOW()
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [
        program_settings ? JSON.stringify(program_settings) : null,
        summary_json ? JSON.stringify(summary_json) : null,
        notes,
        req.params.id,
        req.companyId,
      ],
    );

    if (result.rows.length === 0) {
      throw new AppError('Inspection not found', 404);
    }

    // Queue PDF generation job
    await client.query(
      `INSERT INTO background_jobs (kind, payload, run_after)
       VALUES ('render_pdf', $1, NOW())`,
      [JSON.stringify({
        type: 'inspection',
        inspection_id: req.params.id,
        company_id: req.companyId,
      })],
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (company_id, actor_user_id, action, entity_table, entity_id)
       VALUES ($1, $2, 'inspection.submitted', 'inspections', $3)`,
      [req.companyId, req.user.id, req.params.id],
    );

    res.json(result.rows[0]);
  });
}));

// Update inspection item
router.patch('/:inspectionId/items/:itemId', asyncHandler(async (req, res) => {
  const { inspectionId, itemId } = req.params;

  // Verify inspection belongs to company
  const inspectionCheck = await query(
    'SELECT id FROM inspections WHERE id = $1 AND company_id = $2',
    [inspectionId, req.companyId],
  );

  if (inspectionCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  const updateFields = [];
  const values = [];
  let paramCount = 1;

  const allowedFields = [
    'zone_number', 'area_label', 'device_type', 'head_type',
    'callout_code', 'severity', 'notes', 'photos', 'metadata',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateFields.push(`${field} = $${paramCount++}`);
      values.push(
        field === 'metadata' ? JSON.stringify(req.body[field]) : req.body[field],
      );
    }
  });

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(itemId, inspectionId);

  const result = await query(
    `UPDATE inspection_items SET ${updateFields.join(', ')}
     WHERE id = $${paramCount} AND inspection_id = $${paramCount + 1}
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection item not found' });
  }

  res.json(result.rows[0]);
}));

// Delete inspection item
router.delete('/:inspectionId/items/:itemId', asyncHandler(async (req, res) => {
  const { inspectionId, itemId } = req.params;

  // Verify inspection belongs to company
  const inspectionCheck = await query(
    'SELECT id FROM inspections WHERE id = $1 AND company_id = $2',
    [inspectionId, req.companyId],
  );

  if (inspectionCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  const result = await query(
    'DELETE FROM inspection_items WHERE id = $1 AND inspection_id = $2 RETURNING id',
    [itemId, inspectionId],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection item not found' });
  }

  res.json({ message: 'Inspection item deleted successfully' });
}));

// Generate PDF report for inspection
router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get inspection with all related data
  const inspectionResult = await query(
    `SELECT i.*, 
            s.name as site_name, s.address, s.city, s.state, s.zip_code,
            c.name as client_name,
            u.full_name as tech_name,
            t.name as template_name,
            comp.name as company_name, comp.phone as company_phone, 
            comp.email as company_email, comp.address as company_address,
            comp.logo_url as company_logo
     FROM inspections i
     JOIN sites s ON i.site_id = s.id
     JOIN clients c ON s.client_id = c.id
     JOIN users u ON i.tech_id = u.id
     JOIN inspection_templates t ON i.template_id = t.id
     JOIN companies comp ON i.company_id = comp.id
     WHERE i.id = $1 AND i.company_id = $2`,
    [id, req.companyId],
  );

  if (inspectionResult.rows.length === 0) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  const inspection = inspectionResult.rows[0];

  // Get inspection items
  const itemsResult = await query(
    `SELECT ii.*, 
            array_agg(
              json_build_object('url', f.file_url, 'caption', p.caption)
            ) FILTER (WHERE f.id IS NOT NULL) as photos
     FROM inspection_items ii
     LEFT JOIN photos p ON ii.id = p.inspection_item_id
     LEFT JOIN files f ON p.file_id = f.id
     WHERE ii.inspection_id = $1
     GROUP BY ii.id
     ORDER BY ii.zone_number, ii.created_at`,
    [id],
  );

  inspection.items = itemsResult.rows;
  inspection.site_address = `${inspection.address}, ${inspection.city}, ${inspection.state} ${inspection.zip_code}`;

  const company = {
    name: inspection.company_name,
    phone: inspection.company_phone,
    email: inspection.company_email,
    address: inspection.company_address,
    logo_url: inspection.company_logo,
  };

  try {
    const pdfBuffer = await pdfService.generateInspectionReport(inspection, company);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="inspection-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
}));

module.exports = router;
