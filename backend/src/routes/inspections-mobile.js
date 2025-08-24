const express = require('express');
const { query, get, run } = require('../database/sqlite');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Enhanced mobile inspection endpoints with comprehensive irrigation system support

// Create new mobile inspection
router.post('/', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const technicianId = req.user.id;
  
  const {
    clientId,
    siteId,
    propertyAddress,
    propertyType,
    propertySize,
    weatherConditions,
    temperature,
    overallCondition,
    controller,
    zones,
    backflowDevice,
    mainLine,
    emergencyShutoff,
    rainSensor,
    issuesFound,
    recommendations,
    priorityRepairs,
    photos,
    customerSignature,
    technicianNotes,
    customerNotes
  } = req.body;
  
  // Validate required fields
  if (!clientId || !propertyAddress) {
    return res.status(400).json({
      success: false,
      error: 'Client ID and property address are required'
    });
  }
  
  // Verify client belongs to company
  const client = await get('SELECT id FROM clients WHERE id = ? AND company_id = ?', [clientId, companyId]);
  if (!client) {
    return res.status(404).json({
      success: false,
      error: 'Client not found'
    });
  }
  
  // Create comprehensive inspection record
  const result = await run(`
    INSERT INTO inspections (
      company_id,
      client_id,
      site_id,
      technician_id,
      inspection_type,
      scheduled_date,
      started_at,
      completed_at,
      property_address,
      property_type,
      property_size_sq_ft,
      weather_conditions,
      temperature_f,
      overall_condition,
      controller_data,
      zones_data,
      backflow_data,
      main_line_data,
      emergency_shutoff_data,
      rain_sensor_data,
      issues_found,
      recommendations,
      priority_repairs,
      photos,
      signature_url,
      technician_notes,
      customer_notes,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, 'routine', datetime('now'), datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))
  `, [
    companyId,
    clientId,
    siteId,
    technicianId,
    propertyAddress,
    propertyType,
    propertySize,
    weatherConditions,
    temperature,
    overallCondition,
    JSON.stringify(controller || {}),
    JSON.stringify(zones || []),
    JSON.stringify(backflowDevice || {}),
    JSON.stringify(mainLine || {}),
    JSON.stringify(emergencyShutoff || {}),
    JSON.stringify(rainSensor || {}),
    JSON.stringify(issuesFound || []),
    JSON.stringify(recommendations || []),
    JSON.stringify(priorityRepairs || []),
    JSON.stringify(photos || []),
    customerSignature,
    technicianNotes,
    customerNotes
  ]);
  
  // Save individual zone records
  if (zones && zones.length > 0) {
    for (const zone of zones) {
      await run(`
        INSERT INTO inspection_zones (
          inspection_id,
          zone_number,
          zone_name,
          zone_type,
          coverage_rating,
          pressure_rating,
          uniformity_rating,
          sprinkler_type,
          sprinkler_brand,
          total_heads,
          working_heads,
          broken_heads,
          missing_heads,
          clogged_heads,
          misaligned_heads,
          valve_condition,
          issues,
          recommended_repairs,
          photos,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        result.lastID,
        zone.zoneNumber,
        zone.zoneName || '',
        zone.zoneType,
        zone.coverageRating,
        zone.pressureRating || 'good',
        zone.uniformityRating || 'good',
        zone.sprinklerType,
        zone.sprinklerBrand || '',
        zone.totalHeads || 0,
        zone.workingHeads || 0,
        zone.brokenHeads || 0,
        zone.missingHeads || 0,
        zone.cloggedHeads || 0,
        zone.misalignedHeads || 0,
        zone.valveCondition || 'good',
        JSON.stringify(zone.issues || []),
        JSON.stringify(zone.recommendedRepairs || []),
        JSON.stringify(zone.photos || []),
        zone.notes || ''
      ]);
    }
  }
  
  // Save individual photos with metadata
  if (photos && photos.length > 0) {
    for (const photo of photos) {
      await run(`
        INSERT INTO inspection_photos (
          inspection_id,
          file_path,
          file_name,
          photo_type,
          description,
          component,
          latitude,
          longitude,
          taken_at,
          uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        result.lastID,
        photo.url,
        photo.id + '.jpg',
        photo.type,
        photo.description || '',
        photo.component || 'general',
        photo.gpsCoordinates?.latitude || null,
        photo.gpsCoordinates?.longitude || null,
        photo.timestamp
      ]);
    }
  }
  
  // Get the complete created inspection
  const newInspection = await get(`
    SELECT 
      i.*,
      c.name as client_name,
      c.email as client_email,
      u.name as technician_name
    FROM inspections i
    JOIN clients c ON i.client_id = c.id
    JOIN users u ON i.technician_id = u.id
    WHERE i.id = ?
  `, [result.lastID]);
  
  res.status(201).json({
    success: true,
    data: newInspection,
    message: 'Mobile inspection completed successfully'
  });
}));

// Auto-save inspection progress
router.post('/:id/autosave', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const inspectionId = req.params.id;
  const companyId = req.user.company_id;
  const userId = req.user.id;
  
  // Verify inspection exists and belongs to technician
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
  
  // Map frontend field names to database column names
  const fieldMapping = {
    propertyType: 'property_type',
    propertyAddress: 'property_address', 
    propertySize: 'property_size_sq_ft',
    weatherConditions: 'weather_conditions',
    temperature: 'temperature_f',
    overallCondition: 'overall_condition',
    controller: 'controller_data',
    zones: 'zones_data',
    backflowDevice: 'backflow_data',
    mainLine: 'main_line_data',
    emergencyShutoff: 'emergency_shutoff_data',
    rainSensor: 'rain_sensor_data',
    issuesFound: 'issues_found',
    recommendations: 'recommendations',
    priorityRepairs: 'priority_repairs',
    photos: 'photos',
    customerSignature: 'signature_url',
    technicianNotes: 'technician_notes',
    customerNotes: 'customer_notes',
    clientId: 'client_id',
    siteId: 'site_id'
  };

  // Update only provided fields with proper mapping
  const updateData = {};
  Object.keys(req.body).forEach(key => {
    const dbField = fieldMapping[key] || key;
    updateData[dbField] = req.body[key];
  });
  
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
  
  updateData.updated_at = new Date().toISOString();
  
  if (Object.keys(updateData).length > 1) { // More than just updated_at
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(inspectionId);
    
    await run(`UPDATE inspections SET ${fields} WHERE id = ?`, values);
  }
  
  res.json({
    success: true,
    message: 'Auto-save successful',
    timestamp: updateData.updated_at
  });
}));

// Get mobile inspection templates
router.get('/templates', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  
  const templates = await query(`
    SELECT *
    FROM inspection_templates 
    WHERE company_id = ? AND is_active = 1
    ORDER BY usage_count DESC, name ASC
  `, [companyId]);
  
  // Parse JSON fields
  const formattedTemplates = templates.map(template => ({
    ...template,
    required_fields: JSON.parse(template.required_fields || '[]'),
    default_values: JSON.parse(template.default_values || '{}'),
    custom_fields: JSON.parse(template.custom_fields || '[]')
  }));
  
  res.json({
    success: true,
    data: formattedTemplates
  });
}));

// Generate PDF report
router.post('/pdf', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const { inspectionId, options } = req.body;
  const companyId = req.user.company_id;
  
  // Verify inspection access
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
    WHERE i.id = ? AND i.company_id = ?
  `, [inspectionId, companyId]);
  
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found'
    });
  }
  
  // Get zones and photos
  const zones = await query(`
    SELECT * FROM inspection_zones 
    WHERE inspection_id = ? 
    ORDER BY zone_number ASC
  `, [inspectionId]);
  
  const photos = await query(`
    SELECT * FROM inspection_photos 
    WHERE inspection_id = ? 
    ORDER BY taken_at ASC
  `, [inspectionId]);
  
  // Parse JSON fields
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
  
  // Here you would integrate with PDF generation service
  // For now, return a mock URL
  const pdfUrl = `/api/reports/pdf/${inspectionId}.pdf`;
  
  res.json({
    success: true,
    pdfUrl,
    message: 'PDF report generated successfully'
  });
}));

// Email inspection report
router.post('/email-report', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const { inspectionId, pdfUrl, emailOptions } = req.body;
  const companyId = req.user.company_id;
  
  // Verify inspection access
  const inspection = await get(`
    SELECT i.*, c.name as client_name
    FROM inspections i
    JOIN clients c ON i.client_id = c.id
    WHERE i.id = ? AND i.company_id = ?
  `, [inspectionId, companyId]);
  
  if (!inspection) {
    return res.status(404).json({
      success: false,
      error: 'Inspection not found'
    });
  }
  
  // Here you would integrate with email service
  // For now, just log the email details
  console.log('Email report:', {
    to: emailOptions.to,
    cc: emailOptions.cc,
    subject: emailOptions.subject,
    pdfUrl,
    inspection: inspection.property_address
  });
  
  res.json({
    success: true,
    message: 'Report emailed successfully'
  });
}));

// Get inspection statistics for mobile dashboard
router.get('/stats/mobile', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  let whereClause = 'WHERE company_id = ?';
  const params = [companyId];
  
  // If user is a technician, only show their stats
  if (['tech', 'field_technician', 'technician'].includes(userRole)) {
    whereClause += ' AND technician_id = ?';
    params.push(userId);
  }
  
  const todayStats = await get(`
    SELECT 
      COUNT(*) as total_today,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_today
    FROM inspections 
    ${whereClause} AND DATE(scheduled_date) = DATE('now')
  `, params);
  
  const weekStats = await get(`
    SELECT 
      COUNT(*) as total_week,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_week,
      AVG(estimated_repair_cost_cents) as avg_repair_cost_cents
    FROM inspections 
    ${whereClause} AND scheduled_date >= date('now', '-7 days')
  `, params);
  
  res.json({
    success: true,
    data: {
      today: todayStats,
      week: weekStats
    }
  });
}));

module.exports = router;