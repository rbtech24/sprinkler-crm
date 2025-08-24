const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { get, run, all } = require('../database/sqlite');

const router = express.Router();

// Get all clients for company with site count and location data
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      page = 1, limit = 50, search = '', type,
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.company_id = ?';
    const queryParams = [req.companyId];

    if (search) {
      whereClause += ' AND (c.name LIKE ? OR c.billing_email LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (type && ['residential', 'commercial'].includes(type)) {
      whereClause += ' AND c.contact_type = ?';
      queryParams.push(type);
    }

    const clients = await all(`
      SELECT 
        c.*,
        COUNT(s.id) as site_count,
        MAX(i.created_at) as last_inspection
      FROM clients c
      LEFT JOIN sites s ON c.id = s.client_id
      LEFT JOIN inspections i ON s.id = i.site_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await get(`
      SELECT COUNT(*) as total FROM clients c ${whereClause}
    `, queryParams);

    res.json({
      data: clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single client with sites and location data
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const client = await get(`
      SELECT c.*
      FROM clients c
      WHERE c.id = ? AND c.company_id = ?
    `, [req.params.id, req.companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get client's sites with location data
    const sites = await all(`
      SELECT 
        s.*,
        COUNT(i.id) as inspection_count,
        MAX(i.created_at) as last_inspection
      FROM sites s
      LEFT JOIN inspections i ON s.id = i.site_id
      WHERE s.client_id = ?
      GROUP BY s.id
      ORDER BY s.name
    `, [req.params.id]);

    res.json({
      ...client,
      sites,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new client
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      contact_type = 'residential',
      billing_email,
      phone,
      notes,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
    } = req.body;

    if (!name || !billing_email) {
      return res.status(400).json({ error: 'Name and billing email are required' });
    }

    const result = await run(`
      INSERT INTO clients (
        company_id,
        name,
        contact_type,
        billing_email,
        phone,
        notes,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      req.companyId,
      name,
      contact_type,
      billing_email,
      phone,
      notes,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
    ]);

    const client = await get('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const {
      name,
      contact_type,
      billing_email,
      phone,
      notes,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
    } = req.body;

    await run(`
      UPDATE clients 
      SET 
        name = COALESCE(?, name),
        contact_type = COALESCE(?, contact_type),
        billing_email = COALESCE(?, billing_email),
        phone = COALESCE(?, phone),
        notes = COALESCE(?, notes),
        primary_contact_name = COALESCE(?, primary_contact_name),
        primary_contact_email = COALESCE(?, primary_contact_email),
        primary_contact_phone = COALESCE(?, primary_contact_phone),
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `, [
      name,
      contact_type,
      billing_email,
      phone,
      notes,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
      req.params.id,
      req.companyId,
    ]);

    const client = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await run('DELETE FROM clients WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SITES MANAGEMENT

// Get all sites for a client
router.get('/:clientId/sites', requireAuth, async (req, res) => {
  try {
    const sites = await all(`
      SELECT 
        s.*,
        COUNT(i.id) as inspection_count,
        MAX(i.created_at) as last_inspection
      FROM sites s
      LEFT JOIN inspections i ON s.id = i.site_id
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.client_id = ? AND c.company_id = ?
      GROUP BY s.id
      ORDER BY s.name
    `, [req.params.clientId, req.companyId]);

    res.json(sites);
  } catch (error) {
    console.error('Error fetching sites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new site for client
router.post('/:clientId/sites', requireAuth, async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      property_type,
      square_footage,
      notes,
      access_instructions,
      gate_code,
      contact_name,
      contact_phone,
    } = req.body;

    if (!name || !address || !city || !state) {
      return res.status(400).json({ error: 'Name, address, city, and state are required' });
    }

    // Verify client belongs to company
    const client = await get('SELECT id FROM clients WHERE id = ? AND company_id = ?', [req.params.clientId, req.companyId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = await run(`
      INSERT INTO sites (
        client_id,
        name,
        address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        property_type,
        square_footage,
        notes,
        access_instructions,
        gate_code,
        contact_name,
        contact_phone,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      req.params.clientId,
      name,
      address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      property_type,
      square_footage,
      notes,
      access_instructions,
      gate_code,
      contact_name,
      contact_phone,
    ]);

    const site = await get('SELECT * FROM sites WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json(site);
  } catch (error) {
    console.error('Error creating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update site
router.put('/:clientId/sites/:siteId', requireAuth, async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      property_type,
      square_footage,
      notes,
      access_instructions,
      gate_code,
      contact_name,
      contact_phone,
    } = req.body;

    // Verify site belongs to client and company
    const site = await get(`
      SELECT s.id FROM sites s
      JOIN clients c ON s.client_id = c.id
      WHERE s.id = ? AND s.client_id = ? AND c.company_id = ?
    `, [req.params.siteId, req.params.clientId, req.companyId]);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    await run(`
      UPDATE sites 
      SET 
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip_code = COALESCE(?, zip_code),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        property_type = COALESCE(?, property_type),
        square_footage = COALESCE(?, square_footage),
        notes = COALESCE(?, notes),
        access_instructions = COALESCE(?, access_instructions),
        gate_code = COALESCE(?, gate_code),
        contact_name = COALESCE(?, contact_name),
        contact_phone = COALESCE(?, contact_phone),
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      name,
      address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      property_type,
      square_footage,
      notes,
      access_instructions,
      gate_code,
      contact_name,
      contact_phone,
      req.params.siteId,
    ]);

    const updatedSite = await get('SELECT * FROM sites WHERE id = ?', [req.params.siteId]);
    res.json(updatedSite);
  } catch (error) {
    console.error('Error updating site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get site with detailed information
router.get('/:clientId/sites/:siteId', requireAuth, async (req, res) => {
  try {
    const site = await get(`
      SELECT 
        s.*,
        c.name as client_name,
        COUNT(i.id) as inspection_count,
        MAX(i.created_at) as last_inspection
      FROM sites s
      JOIN clients c ON s.client_id = c.id
      LEFT JOIN inspections i ON s.id = i.site_id
      WHERE s.id = ? AND s.client_id = ? AND c.company_id = ?
      GROUP BY s.id
    `, [req.params.siteId, req.params.clientId, req.companyId]);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(site);
  } catch (error) {
    console.error('Error fetching site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete site
router.delete('/:clientId/sites/:siteId', requireAuth, async (req, res) => {
  try {
    // Verify site belongs to client and company
    const site = await get(`
      SELECT s.id FROM sites s
      JOIN clients c ON s.client_id = c.id
      WHERE s.id = ? AND s.client_id = ? AND c.company_id = ?
    `, [req.params.siteId, req.params.clientId, req.companyId]);

    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    await run('DELETE FROM sites WHERE id = ?', [req.params.siteId]);
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
