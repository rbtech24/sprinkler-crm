const express = require('express');
const { query, get, run } = require('../database/sqlite');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all inspections for a company (admin view) or technician-specific (tech view)
router.get('/', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const userId = req.user.id;
  const userRole = req.user.role;
  const { status, tech_id, date_from, date_to, client_id, limit = 50, offset = 0 } = req.query;
  
  let whereClause = 'WHERE i.company_id = ?';
  const params = [companyId];
  
  // If user is a technician, only show their own inspections
  if (['tech', 'field_technician', 'technician'].includes(userRole)) {
    whereClause += ' AND i.technician_id = ?';
    params.push(userId);
  }
  
  // Add optional filters
  if (status) {
    whereClause += ' AND i.status = ?';
    params.push(status);
  }
  
  if (tech_id && userRole !== 'technician') {
    whereClause += ' AND i.technician_id = ?';
    params.push(tech_id);
  }
  
  if (client_id) {
    whereClause += ' AND i.client_id = ?';
    params.push(client_id);
  }
  
  if (date_from) {
    whereClause += ' AND i.scheduled_date >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    whereClause += ' AND i.scheduled_date <= ?';
    params.push(date_to);
  }
  
  // Add limit and offset
  params.push(parseInt(limit), parseInt(offset));
  
  const inspections = await query(`
    SELECT 
      i.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as site_name,
      s.address as site_address,
      u.name as technician_name,
      u.email as technician_email,
      COUNT(iz.id) as zone_count,
      COUNT(ip.id) as photo_count
    FROM inspections i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN sites s ON i.site_id = s.id
    JOIN users u ON i.technician_id = u.id
    LEFT JOIN inspection_zones iz ON i.id = iz.inspection_id
    LEFT JOIN inspection_photos ip ON i.id = ip.inspection_id
    ${whereClause}
    GROUP BY i.id
    ORDER BY i.scheduled_date DESC, i.created_at DESC
    LIMIT ? OFFSET ?
  `, params);

  // Parse JSON fields
  const formattedInspections = inspections.map(inspection => ({
    ...inspection,
    controller_data: JSON.parse(inspection.controller_data || '{}'),
    zones_data: JSON.parse(inspection.zones_data || '[]'),
    backflow_data: JSON.parse(inspection.backflow_data || '{}'),
    main_line_data: JSON.parse(inspection.main_line_data || '{}'),
    emergency_shutoff_data: JSON.parse(inspection.emergency_shutoff_data || '{}'),
    rain_sensor_data: JSON.parse(inspection.rain_sensor_data || '{}'),
    issues_found: JSON.parse(inspection.issues_found || '[]'),
    recommendations: JSON.parse(inspection.recommendations || '[]'),
    priority_repairs: JSON.parse(inspection.priority_repairs || '[]'),
    photos: JSON.parse(inspection.photos || '[]')
  }));

  res.json({
    success: true,
    data: formattedInspections,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: formattedInspections.length
    }
  });
}));

// Get inspection details by ID
router.get('/:id', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const inspectionId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let whereClause = 'WHERE i.id = ? AND i.company_id = ?';
  const params = [inspectionId, companyId];
  
  // If user is a technician, only show their own inspection
  if (['tech', 'field_technician', 'technician'].includes(userRole)) {
    whereClause += ' AND i.technician_id = ?';
    params.push(userId);
  }
  
  const inspection = await get(`
    SELECT 
      i.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as site_name,
      s.address as site_address,
      u.name as technician_name
    FROM inspections i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN sites s ON i.site_id = s.id
    JOIN users u ON i.technician_id = u.id
    ${whereClause}
  `, params);
  
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found'
    });
  }
  
  // Get zones for this inspection
  const zones = await query(`
    SELECT * FROM inspection_zones 
    WHERE inspection_id = ? 
    ORDER BY zone_number ASC
  `, [inspectionId]);
  
  // Get photos for this inspection
  const photos = await query(`
    SELECT * FROM inspection_photos 
    WHERE inspection_id = ? 
    ORDER BY taken_at ASC
  `, [inspectionId]);
  
  // Parse JSON fields and format response
  const formattedInspection = {
    ...inspection,
    controller_data: JSON.parse(inspection.controller_data || '{}'),
    zones_data: JSON.parse(inspection.zones_data || '[]'),
    backflow_data: JSON.parse(inspection.backflow_data || '{}'),
    main_line_data: JSON.parse(inspection.main_line_data || '{}'),
    emergency_shutoff_data: JSON.parse(inspection.emergency_shutoff_data || '{}'),
    rain_sensor_data: JSON.parse(inspection.rain_sensor_data || '{}'),
    issues_found: JSON.parse(inspection.issues_found || '[]'),
    recommendations: JSON.parse(inspection.recommendations || '[]'),
    priority_repairs: JSON.parse(inspection.priority_repairs || '[]'),
    photos: JSON.parse(inspection.photos || '[]'),
    zones: zones.map(zone => ({
      ...zone,
      issues: JSON.parse(zone.issues || '[]'),
      recommended_repairs: JSON.parse(zone.recommended_repairs || '[]'),
      photos: JSON.parse(zone.photos || '[]')
    })),
    inspection_photos: photos
  };
  
  res.json({
    success: true,
    data: formattedInspection
  });
}));

// Create new inspection
router.post('/', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const technicianId = req.user.id;
  
  const {
    client_id,
    site_id,
    inspection_type = 'routine',
    scheduled_date,
    property_address,
    property_type,
    estimated_duration = 60
  } = req.body;
  
  if (!client_id || !scheduled_date) {
    return res.status(400).json({
      success: false,
      error: 'Client ID and scheduled date are required'
    });
  }
  
  // Verify client belongs to company
  const client = await get('SELECT id FROM clients WHERE id = ? AND company_id = ?', [client_id, companyId]);
  if (!client) {
    return res.status(404).json({
      success: false,
      error: 'Client not found'
    });
  }
  
  // Create inspection
  const result = await run(`
    INSERT INTO inspections (
      company_id,
      client_id,
      site_id,
      technician_id,
      inspection_type,
      scheduled_date,
      property_address,
      property_type,
      estimated_duration,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', datetime('now'), datetime('now'))
  `, [
    companyId,
    client_id,
    site_id,
    technicianId,
    inspection_type,
    scheduled_date,
    property_address,
    property_type,
    estimated_duration
  ]);
  
  const newInspection = await get('SELECT * FROM inspections WHERE id = ?', [result.lastID]);
  
  res.status(201).json({
    success: true,
    data: newInspection,
    message: 'Inspection created successfully'
  });
}));

// Update inspection
router.put('/:id', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const inspectionId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Verify inspection exists and user has access
  let whereClause = 'WHERE id = ? AND company_id = ?';
  const params = [inspectionId, companyId];
  
  if (['tech', 'field_technician', 'technician'].includes(userRole)) {
    whereClause += ' AND technician_id = ?';
    params.push(userId);
  }
  
  const inspection = await get(`SELECT id FROM inspections ${whereClause}`, params);
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found or access denied'
    });
  }
  
  const updateData = { ...req.body };
  
  // Convert objects to JSON strings for storage
  const jsonFields = [
    'controller_data', 'zones_data', 'backflow_data', 'main_line_data',
    'emergency_shutoff_data', 'rain_sensor_data', 'issues_found',
    'recommendations', 'priority_repairs', 'photos'
  ];
  
  jsonFields.forEach(field => {
    if (updateData[field] && typeof updateData[field] === 'object') {
      updateData[field] = JSON.stringify(updateData[field]);
    }
  });
  
  // Add updated timestamp
  updateData.updated_at = new Date().toISOString();
  
  // Build UPDATE query
  const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updateData);
  values.push(inspectionId);
  
  await run(`UPDATE inspections SET ${fields} WHERE id = ?`, values);
  
  // Get updated inspection
  const updatedInspection = await get('SELECT * FROM inspections WHERE id = ?', [inspectionId]);
  
  res.json({
    success: true,
    data: updatedInspection,
    message: 'Inspection updated successfully'
  });
}));

// Start inspection (mark as in_progress)
router.post('/:id/start', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const inspectionId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  
  // Verify technician owns this inspection
  const inspection = await get(`
    SELECT id, status FROM inspections 
    WHERE id = ? AND company_id = ? AND technician_id = ?
  `, [inspectionId, companyId, userId]);
  
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found or access denied'
    });
  }
  
  if (inspection.status !== 'scheduled') {
    return res.status(400).json({
      success: false,
      error: 'Inspection cannot be started from current status'
    });
  }
  
  // Update inspection status and start time
  await run(`
    UPDATE inspections 
    SET status = 'in_progress', started_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `, [inspectionId]);
  
  const updatedInspection = await get('SELECT * FROM inspections WHERE id = ?', [inspectionId]);
  
  res.json({
    success: true,
    data: updatedInspection,
    message: 'Inspection started'
  });
}));

// Complete inspection
router.post('/:id/complete', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const inspectionId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  
  const {
    overall_condition,
    technician_notes,
    customer_notes,
    signature_url
  } = req.body;
  
  // Verify technician owns this inspection
  const inspection = await get(`
    SELECT id, status FROM inspections 
    WHERE id = ? AND company_id = ? AND technician_id = ?
  `, [inspectionId, companyId, userId]);
  
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found or access denied'
    });
  }
  
  if (inspection.status !== 'in_progress') {
    return res.status(400).json({
      success: false,
      error: 'Inspection must be in progress to complete'
    });
  }
  
  // Update inspection as completed
  await run(`
    UPDATE inspections 
    SET 
      status = 'completed',
      completed_at = datetime('now'),
      overall_condition = ?,
      technician_notes = ?,
      customer_notes = ?,
      signature_url = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [overall_condition, technician_notes, customer_notes, signature_url, inspectionId]);
  
  const completedInspection = await get('SELECT * FROM inspections WHERE id = ?', [inspectionId]);
  
  res.json({
    success: true,
    data: completedInspection,
    message: 'Inspection completed successfully'
  });
}));

// Add zone to inspection
router.post('/:id/zones', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const inspectionId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  
  // Verify technician owns this inspection
  const inspection = await get(`
    SELECT id FROM inspections 
    WHERE id = ? AND company_id = ? AND technician_id = ?
  `, [inspectionId, companyId, userId]);
  
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found or access denied'
    });
  }
  
  const zoneData = { ...req.body };
  
  // Convert arrays/objects to JSON
  if (zoneData.issues) zoneData.issues = JSON.stringify(zoneData.issues);
  if (zoneData.recommended_repairs) zoneData.recommended_repairs = JSON.stringify(zoneData.recommended_repairs);
  if (zoneData.photos) zoneData.photos = JSON.stringify(zoneData.photos);
  
  // Insert zone
  const fields = Object.keys(zoneData).filter(key => key !== 'id');
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(field => zoneData[field]);
  
  const result = await run(`
    INSERT INTO inspection_zones (inspection_id, ${fields.join(', ')}, created_at, updated_at)
    VALUES (?, ${placeholders}, datetime('now'), datetime('now'))
  `, [inspectionId, ...values]);
  
  const newZone = await get('SELECT * FROM inspection_zones WHERE id = ?', [result.lastID]);
  
  res.status(201).json({
    success: true,
    data: newZone,
    message: 'Zone added successfully'
  });
}));

// Get inspection statistics
router.get('/stats/overview', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const userId = req.user.id;
  const userRole = req.user.role;
  const { period = '30' } = req.query; // days
  
  let whereClause = 'WHERE company_id = ?';
  const params = [companyId];
  
  // If user is a technician, only show their stats
  if (['tech', 'field_technician', 'technician'].includes(userRole)) {
    whereClause += ' AND technician_id = ?';
    params.push(userId);
  }
  
  // Add date filter
  whereClause += ' AND scheduled_date >= date("now", "-" || ? || " days")';
  params.push(period);
  
  const stats = await get(`
    SELECT 
      COUNT(*) as total_inspections,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_inspections,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_inspections,
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_inspections,
      COUNT(CASE WHEN follow_up_required = 1 THEN 1 END) as follow_ups_needed,
      AVG(estimated_repair_cost_cents) as avg_repair_cost_cents,
      SUM(estimated_repair_cost_cents) as total_repair_value_cents
    FROM inspections 
    ${whereClause}
  `, params);
  
  res.json({
    success: true,
    data: {
      ...stats,
      period_days: parseInt(period)
    }
  });
}));

module.exports = router;