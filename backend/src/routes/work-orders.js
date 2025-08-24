const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { get, run, all } = require('../database/sqlite');
const PDFReportService = require('../services/pdfService');

const router = express.Router();
const pdfService = new PDFReportService();

// Get all work orders for company
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      page = 1, limit = 20, status, technician_id, start_date, end_date,
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE wo.company_id = ?';
    const params = [req.user.companyId];

    if (status) {
      whereClause += ' AND wo.status = ?';
      params.push(status);
    }

    if (technician_id) {
      whereClause += ' AND wo.technician_id = ?';
      params.push(technician_id);
    }

    if (start_date) {
      whereClause += ' AND wo.scheduled_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND wo.scheduled_at <= ?';
      params.push(end_date);
    }

    const workOrders = await all(`
      SELECT 
        wo.*,
        c.name as client_name,
        s.nickname as site_name,
        s.address_json as site_address,
        u.name as technician_name,
        e.total_cents as estimate_total
      FROM work_orders wo
      LEFT JOIN sites s ON wo.site_id = s.id
      LEFT JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON wo.tech_id = u.id
      LEFT JOIN estimates e ON wo.estimate_id = e.id
      ${whereClause}
      ORDER BY wo.scheduled_at ASC, wo.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const countResult = await get(`
      SELECT COUNT(*) as total
      FROM work_orders wo
      ${whereClause}
    `, params);

    res.json({
      data: workOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get work order by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const workOrder = await get(`
      SELECT 
        wo.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        s.name as site_name,
        s.address as site_address,
        s.city as site_city,
        s.state as site_state,
        s.zip_code as site_zip,
        s.latitude as site_latitude,
        s.longitude as site_longitude,
        u.name as technician_name,
        u.email as technician_email,
        u.phone as technician_phone,
        e.total_cents as estimate_total,
        e.line_items as estimate_line_items
      FROM work_orders wo
      LEFT JOIN clients c ON wo.client_id = c.id
      LEFT JOIN sites s ON wo.site_id = s.id
      LEFT JOIN users u ON wo.technician_id = u.id
      LEFT JOIN estimates e ON wo.estimate_id = e.id
      WHERE wo.id = ? AND wo.company_id = ?
    `, [req.params.id, req.user.companyId]);

    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(workOrder);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create work order (convert from estimate or create new)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      client_id,
      site_id,
      estimate_id,
      title,
      description,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      technician_id,
      priority = 'normal',
      special_instructions,
    } = req.body;

    // Validate required fields
    if (!client_id || !site_id || !title) {
      return res.status(400).json({ error: 'Client ID, Site ID, and title are required' });
    }

    // Generate work order number
    const orderNumber = `WO-${Date.now()}`;

    const result = await run(`
      INSERT INTO work_orders (
        company_id,
        client_id,
        site_id,
        estimate_id,
        order_number,
        title,
        description,
        scheduled_date,
        scheduled_time_start,
        scheduled_time_end,
        technician_id,
        priority,
        special_instructions,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'), datetime('now'))
    `, [
      req.user.companyId,
      client_id,
      site_id,
      estimate_id,
      orderNumber,
      title,
      description,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      technician_id,
      priority,
      special_instructions,
    ]);

    // Get the created work order with joined data
    const workOrder = await get(`
      SELECT 
        wo.*,
        c.name as client_name,
        s.name as site_name,
        s.address as site_address,
        u.name as technician_name
      FROM work_orders wo
      LEFT JOIN clients c ON wo.client_id = c.id
      LEFT JOIN sites s ON wo.site_id = s.id
      LEFT JOIN users u ON wo.technician_id = u.id
      WHERE wo.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(workOrder);
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update work order
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      technician_id,
      priority,
      special_instructions,
      status,
    } = req.body;

    await run(`
      UPDATE work_orders 
      SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        scheduled_date = COALESCE(?, scheduled_date),
        scheduled_time_start = COALESCE(?, scheduled_time_start),
        scheduled_time_end = COALESCE(?, scheduled_time_end),
        technician_id = COALESCE(?, technician_id),
        priority = COALESCE(?, priority),
        special_instructions = COALESCE(?, special_instructions),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `, [
      title,
      description,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      technician_id,
      priority,
      special_instructions,
      status,
      req.params.id,
      req.user.companyId,
    ]);

    // Get updated work order
    const workOrder = await get(`
      SELECT 
        wo.*,
        c.name as client_name,
        s.name as site_name,
        s.address as site_address,
        u.name as technician_name
      FROM work_orders wo
      LEFT JOIN clients c ON wo.client_id = c.id
      LEFT JOIN sites s ON wo.site_id = s.id
      LEFT JOIN users u ON wo.technician_id = u.id
      WHERE wo.id = ?
    `, [req.params.id]);

    res.json(workOrder);
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start work order (technician check-in)
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, notes } = req.body;

    await run(`
      UPDATE work_orders 
      SET 
        status = 'in_progress',
        actual_start_time = datetime('now'),
        start_latitude = ?,
        start_longitude = ?,
        start_notes = ?,
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `, [latitude, longitude, notes, req.params.id, req.user.companyId]);

    res.json({ message: 'Work order started successfully' });
  } catch (error) {
    console.error('Error starting work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete work order (technician check-out)
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      completion_notes,
      photos,
      actual_work_performed,
      parts_used,
      customer_signature,
    } = req.body;

    await run(`
      UPDATE work_orders 
      SET 
        status = 'completed',
        actual_end_time = datetime('now'),
        end_latitude = ?,
        end_longitude = ?,
        completion_notes = ?,
        photos = ?,
        actual_work_performed = ?,
        parts_used = ?,
        customer_signature = ?,
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `, [
      latitude,
      longitude,
      completion_notes,
      JSON.stringify(photos || []),
      actual_work_performed,
      JSON.stringify(parts_used || []),
      customer_signature,
      req.params.id,
      req.user.companyId,
    ]);

    res.json({ message: 'Work order completed successfully' });
  } catch (error) {
    console.error('Error completing work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get technician's daily schedule
router.get('/technician/:techId/schedule', requireAuth, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const schedule = await all(`
      SELECT 
        wo.*,
        c.name as client_name,
        s.name as site_name,
        s.address as site_address,
        s.latitude as site_latitude,
        s.longitude as site_longitude
      FROM work_orders wo
      LEFT JOIN clients c ON wo.client_id = c.id
      LEFT JOIN sites s ON wo.site_id = s.id
      WHERE wo.technician_id = ? 
        AND wo.company_id = ?
        AND wo.scheduled_date = ?
        AND wo.status IN ('scheduled', 'in_progress')
      ORDER BY wo.scheduled_time_start ASC
    `, [req.params.techId, req.user.companyId, date]);

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching technician schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete work order
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await run(`
      DELETE FROM work_orders 
      WHERE id = ? AND company_id = ?
    `, [req.params.id, req.user.companyId]);

    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate PDF report for work order
router.get('/:id/pdf', requireAuth, async (req, res) => {
  try {
    const workOrder = await get(`
      SELECT 
        wo.*,
        c.name as client_name,
        s.name as site_name,
        s.address || ', ' || s.city || ', ' || s.state || ' ' || s.zip_code as site_address,
        u.full_name as tech_name,
        comp.name as company_name,
        comp.phone as company_phone,
        comp.email as company_email,
        comp.address as company_address,
        comp.logo_url as company_logo
      FROM work_orders wo
      JOIN sites s ON wo.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN users u ON wo.tech_id = u.id
      LEFT JOIN companies comp ON wo.company_id = comp.id
      WHERE wo.id = ? AND wo.company_id = ?
    `, [req.params.id, req.user.companyId]);

    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const company = {
      name: workOrder.company_name,
      phone: workOrder.company_phone,
      email: workOrder.company_email,
      address: workOrder.company_address,
      logo_url: workOrder.company_logo,
    };

    const pdfBuffer = await pdfService.generateWorkOrderReport(workOrder, company);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="work-order-${req.params.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

module.exports = router;
