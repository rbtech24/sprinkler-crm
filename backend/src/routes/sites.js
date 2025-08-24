const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { query, get, run } = require('../database/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all sites for company
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { page = 1, limit = 50, search = '', client_id } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE s.company_id = ?';
  const queryParams = [companyId];

  if (search) {
    whereClause += ' AND (s.name LIKE ? OR s.address LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  if (client_id) {
    whereClause += ' AND s.client_id = ?';
    queryParams.push(client_id);
  }

  const sites = await query(`
    SELECT 
      s.*,
      c.name as client_name,
      COUNT(i.id) as inspection_count,
      MAX(i.created_at) as last_inspection
    FROM sites s
    JOIN clients c ON s.client_id = c.id
    LEFT JOIN inspections i ON s.id = i.site_id
    ${whereClause}
    GROUP BY s.id
    ORDER BY s.name
    LIMIT ? OFFSET ?
  `, [...queryParams, limit, offset]);

  // Get total count
  const countResult = await get(`
    SELECT COUNT(*) as total FROM sites s 
    JOIN clients c ON s.client_id = c.id
    ${whereClause}
  `, queryParams);

  res.json({
    success: true,
    data: sites,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  });
}));

// Get single site
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.company_id;

  const site = await get(`
    SELECT 
      s.*,
      c.name as client_name,
      c.billing_email as client_email,
      c.contact_phone as client_phone
    FROM sites s
    JOIN clients c ON s.client_id = c.id
    WHERE s.id = ? AND s.company_id = ?
  `, [id, companyId]);

  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site not found'
    });
  }

  res.json({
    success: true,
    data: site
  });
}));

// Create new site
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    client_id,
    name,
    address,
    city,
    state,
    zip_code,
    country = 'USA',
    latitude,
    longitude,
    system_type,
    zone_count,
    notes
  } = req.body;

  // Validate required fields
  if (!client_id || !name || !address) {
    return res.status(400).json({
      success: false,
      message: 'Client ID, name, and address are required'
    });
  }

  // Verify client belongs to company
  const client = await get('SELECT id FROM clients WHERE id = ? AND company_id = ?', [client_id, companyId]);
  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Client not found'
    });
  }

  const result = await run(`
    INSERT INTO sites (
      company_id, client_id, name, address, city, state, zip_code, country,
      latitude, longitude, system_type, zone_count, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    companyId, client_id, name, address, city, state, zip_code, country,
    latitude, longitude, system_type, zone_count, notes
  ]);

  const newSite = await get('SELECT * FROM sites WHERE id = ?', [result.lastID]);

  res.status(201).json({
    success: true,
    data: newSite,
    message: 'Site created successfully'
  });
}));

// Update site
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.company_id;
  const {
    name,
    address,
    city,
    state,
    zip_code,
    country,
    latitude,
    longitude,
    system_type,
    zone_count,
    notes
  } = req.body;

  // Verify site belongs to company
  const site = await get('SELECT id FROM sites WHERE id = ? AND company_id = ?', [id, companyId]);
  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site not found'
    });
  }

  await run(`
    UPDATE sites SET
      name = COALESCE(?, name),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      zip_code = COALESCE(?, zip_code),
      country = COALESCE(?, country),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      system_type = COALESCE(?, system_type),
      zone_count = COALESCE(?, zone_count),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `, [
    name, address, city, state, zip_code, country,
    latitude, longitude, system_type, zone_count, notes,
    id, companyId
  ]);

  const updatedSite = await get('SELECT * FROM sites WHERE id = ?', [id]);

  res.json({
    success: true,
    data: updatedSite,
    message: 'Site updated successfully'
  });
}));

// Delete site
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.company_id;

  // Verify site belongs to company
  const site = await get('SELECT id FROM sites WHERE id = ? AND company_id = ?', [id, companyId]);
  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site not found'
    });
  }

  // Check for related records
  const hasInspections = await get('SELECT COUNT(*) as count FROM inspections WHERE site_id = ?', [id]);
  const hasEstimates = await get('SELECT COUNT(*) as count FROM estimates WHERE site_id = ?', [id]);
  const hasWorkOrders = await get('SELECT COUNT(*) as count FROM work_orders WHERE site_id = ?', [id]);

  if (hasInspections.count > 0 || hasEstimates.count > 0 || hasWorkOrders.count > 0) {
    return res.status(409).json({
      success: false,
      message: 'Cannot delete site with related inspections, estimates, or work orders'
    });
  }

  await run('DELETE FROM sites WHERE id = ? AND company_id = ?', [id, companyId]);

  res.json({
    success: true,
    message: 'Site deleted successfully'
  });
}));

module.exports = router;