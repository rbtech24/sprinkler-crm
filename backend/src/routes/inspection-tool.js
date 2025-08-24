const express = require('express');
const {
  body, param, query, validationResult,
} = require('express-validator');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const inspectionService = require('../services/inspectionService');
const pdfReportService = require('../services/pdfReportService');

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

/**
 * Get inspection templates for company
 * GET /api/inspection-tool/templates
 */
router.get('/templates', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const result = await inspectionService.getCompanyTemplates(companyId);

    if (result.success) {
      res.json({ templates: result.templates });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * Get specific template details
 * GET /api/inspection-tool/templates/:templateId
 */
router.get('/templates/:templateId', [
  param('templateId').notEmpty().withMessage('Template ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { templateId } = req.params;
    const result = await inspectionService.getTemplate(templateId);

    if (result.success) {
      res.json(result.template);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * Create custom inspection template
 * POST /api/inspection-tool/templates
 */
router.post('/templates', [
  body('name').notEmpty().withMessage('Template name required'),
  body('description').optional().isString(),
  body('sections').isArray().withMessage('Sections array required'),
  body('callouts').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const result = await inspectionService.createCustomTemplate(companyId, req.body);

    if (result.success) {
      res.status(201).json({
        success: true,
        template_id: result.template_id,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Create new inspection
 * POST /api/inspection-tool/inspections
 */
router.post('/inspections', [
  body('site_id').isInt().withMessage('Valid site ID required'),
  body('technician_id').isInt().withMessage('Valid technician ID required'),
  body('template_id').notEmpty().withMessage('Template ID required'),
  body('scheduled_date').isISO8601().withMessage('Valid scheduled date required'),
  body('notes').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const result = await inspectionService.createInspection(companyId, req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({ error: 'Failed to create inspection' });
  }
});

/**
 * Start inspection (mobile technician)
 * POST /api/inspection-tool/inspections/:id/start
 */
router.post('/inspections/:id/start', [
  param('id').isInt().withMessage('Valid inspection ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const technicianId = req.user.id;

    const result = await inspectionService.startInspection(inspectionId, technicianId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Start inspection error:', error);
    res.status(500).json({ error: 'Failed to start inspection' });
  }
});

/**
 * Save inspection form data
 * PUT /api/inspection-tool/inspections/:id/data/:sectionId
 */
router.put('/inspections/:id/data/:sectionId', [
  param('id').isInt().withMessage('Valid inspection ID required'),
  param('sectionId').notEmpty().withMessage('Section ID required'),
  body('data').isObject().withMessage('Form data required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const { sectionId } = req.params;
    const technicianId = req.user.id;

    const result = await inspectionService.saveInspectionData(
      inspectionId,
      sectionId,
      req.body.data,
      technicianId,
    );

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Save inspection data error:', error);
    res.status(500).json({ error: 'Failed to save inspection data' });
  }
});

/**
 * Add callout/issue
 * POST /api/inspection-tool/inspections/:id/callouts
 */
router.post('/inspections/:id/callouts', [
  param('id').isInt().withMessage('Valid inspection ID required'),
  body('callout_type').notEmpty().withMessage('Callout type required'),
  body('zone_number').optional().isInt(),
  body('description').notEmpty().withMessage('Description required'),
  body('severity').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('lat').optional().isFloat(),
  body('lng').optional().isFloat(),
  body('photos').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const technicianId = req.user.id;

    const result = await inspectionService.addCallout(inspectionId, req.body, technicianId);

    if (result.success) {
      res.status(201).json({
        success: true,
        callout_id: result.callout_id,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Add callout error:', error);
    res.status(500).json({ error: 'Failed to add callout' });
  }
});

/**
 * Upload photo
 * POST /api/inspection-tool/inspections/:id/photos
 */
router.post('/inspections/:id/photos', upload.single('photo'), [
  param('id').isInt().withMessage('Valid inspection ID required'),
  body('zone_number').optional().isInt(),
  body('callout_id').optional().isInt(),
  body('caption').optional().isString(),
  body('lat').optional().isFloat(),
  body('lng').optional().isFloat(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Photo file required' });
    }

    const inspectionId = parseInt(req.params.id);
    const technicianId = req.user.id;

    // Convert buffer to base64
    const fileData = req.file.buffer.toString('base64');

    const photoData = {
      zone_number: req.body.zone_number ? parseInt(req.body.zone_number) : null,
      callout_id: req.body.callout_id ? parseInt(req.body.callout_id) : null,
      caption: req.body.caption,
      lat: req.body.lat ? parseFloat(req.body.lat) : null,
      lng: req.body.lng ? parseFloat(req.body.lng) : null,
      file_data: fileData,
    };

    const result = await inspectionService.uploadPhoto(inspectionId, photoData, technicianId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

/**
 * Complete inspection
 * POST /api/inspection-tool/inspections/:id/complete
 */
router.post('/inspections/:id/complete', [
  param('id').isInt().withMessage('Valid inspection ID required'),
  body('summary_notes').optional().isString(),
  body('recommendations').optional().isString(),
  body('completion_photos').optional().isArray(),
  body('technician_signature').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const technicianId = req.user.id;

    const result = await inspectionService.completeInspection(inspectionId, req.body, technicianId);

    if (result.success) {
      res.json({
        success: true,
        inspection_id: result.inspection_id,
        pdf_generated: result.pdf_generated,
        pdf_path: result.pdf_path,
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({ error: 'Failed to complete inspection' });
  }
});

/**
 * Get inspection details
 * GET /api/inspection-tool/inspections/:id
 */
router.get('/inspections/:id', [
  param('id').isInt().withMessage('Valid inspection ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const companyId = req.user.company_id;

    const result = await inspectionService.getInspectionDetails(inspectionId, companyId);

    if (result.success) {
      res.json(result.inspection);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get inspection details error:', error);
    res.status(500).json({ error: 'Failed to get inspection details' });
  }
});

/**
 * Generate PDF report
 * POST /api/inspection-tool/inspections/:id/pdf
 */
router.post('/inspections/:id/pdf', [
  param('id').isInt().withMessage('Valid inspection ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const companyId = req.user.company_id;

    // Verify inspection belongs to company
    const inspection = await inspectionService.getInspectionDetails(inspectionId, companyId);
    if (!inspection.success) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const result = await pdfReportService.generateInspectionReport(inspectionId);

    if (result.success) {
      res.json({
        success: true,
        filename: result.filename,
        file_path: result.file_path,
        download_url: `/api/inspection-tool/inspections/${inspectionId}/pdf/download`,
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

/**
 * Download PDF report
 * GET /api/inspection-tool/inspections/:id/pdf/download
 */
router.get('/inspections/:id/pdf/download', [
  param('id').isInt().withMessage('Valid inspection ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inspectionId = parseInt(req.params.id);
    const companyId = req.user.company_id;

    // Verify inspection belongs to company
    const inspection = await inspectionService.getInspectionDetails(inspectionId, companyId);
    if (!inspection.success) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Try to find existing PDF first
    const db = require('../database/sqlite');
    const existingReport = await db.get(`
      SELECT pdf_path FROM inspection_reports WHERE inspection_id = ? ORDER BY created_at DESC LIMIT 1
    `, [inspectionId]);

    let pdfPath;
    if (existingReport && existingReport.pdf_path) {
      pdfPath = path.join(__dirname, '../../uploads/reports', path.basename(existingReport.pdf_path));
    } else {
      // Generate PDF if it doesn't exist
      const result = await pdfReportService.generateInspectionReport(inspectionId);
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to generate PDF' });
      }
      pdfPath = result.full_path;
    }

    // Check if file exists
    const fs = require('fs').promises;
    try {
      await fs.access(pdfPath);
    } catch {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="inspection_${inspectionId}_report.pdf"`);
    res.sendFile(pdfPath);
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Failed to download PDF report' });
  }
});

/**
 * Get inspections for company
 * GET /api/inspection-tool/inspections
 */
router.get('/inspections', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  query('technician_id').optional().isInt().toInt(),
  query('site_id').optional().isInt().toInt(),
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
      status,
      technician_id,
      site_id,
      start_date,
      end_date,
    } = req.query;
    const companyId = req.user.company_id;
    const offset = (page - 1) * limit;

    // Build query conditions
    const whereConditions = ['i.company_id = ?'];
    const params = [companyId];

    if (status) {
      whereConditions.push('i.status = ?');
      params.push(status);
    }

    if (technician_id) {
      whereConditions.push('i.technician_id = ?');
      params.push(technician_id);
    }

    if (site_id) {
      whereConditions.push('i.site_id = ?');
      params.push(site_id);
    }

    if (start_date) {
      whereConditions.push('i.scheduled_date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('i.scheduled_date <= ?');
      params.push(end_date);
    }

    const db = require('../database/sqlite');

    const inspections = await db.query(`
      SELECT 
        i.*,
        s.address as site_address,
        s.city as site_city,
        s.state as site_state,
        c.name as client_name,
        u.name as technician_name
      FROM inspections i
      JOIN sites s ON i.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      JOIN users u ON i.technician_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.scheduled_date DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count
      FROM inspections i
      JOIN sites s ON i.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE ${whereConditions.join(' AND ')}
    `, params);

    res.json({
      inspections,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({ error: 'Failed to get inspections' });
  }
});

/**
 * Get technician's assigned inspections (mobile app)
 * GET /api/inspection-tool/inspections/technician/assigned
 */
router.get('/inspections/technician/assigned', [
  query('status').optional().isIn(['scheduled', 'in_progress']),
  query('date').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const technicianId = req.user.id;
    const { status, date } = req.query;

    const whereConditions = ['i.technician_id = ?'];
    const params = [technicianId];

    if (status) {
      whereConditions.push('i.status = ?');
      params.push(status);
    } else {
      whereConditions.push("i.status IN ('scheduled', 'in_progress')");
    }

    if (date) {
      whereConditions.push('DATE(i.scheduled_date) = DATE(?)');
      params.push(date);
    } else {
      // Default to today's inspections
      whereConditions.push('DATE(i.scheduled_date) = DATE("now")');
    }

    const db = require('../database/sqlite');

    const inspections = await db.query(`
      SELECT 
        i.*,
        s.address as site_address,
        s.city as site_city,
        s.state as site_state,
        s.zip as site_zip,
        s.lat as site_lat,
        s.lng as site_lng,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email
      FROM inspections i
      JOIN sites s ON i.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY i.scheduled_date ASC
    `, params);

    res.json({ inspections });
  } catch (error) {
    console.error('Get technician inspections error:', error);
    res.status(500).json({ error: 'Failed to get assigned inspections' });
  }
});

/**
 * Voice-to-text endpoint (placeholder for now)
 * POST /api/inspection-tool/voice-to-text
 */
router.post('/voice-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }

    // Placeholder implementation
    // In a real application, you would integrate with a speech-to-text service
    // like Google Speech-to-Text, AWS Transcribe, or Azure Speech Services

    res.json({
      success: true,
      text: 'Voice-to-text feature coming soon. Please use manual text input for now.',
      confidence: 0.95,
    });
  } catch (error) {
    console.error('Voice-to-text error:', error);
    res.status(500).json({ error: 'Failed to process voice recording' });
  }
});

module.exports = router;
