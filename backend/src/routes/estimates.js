const express = require('express');
const { body, validationResult } = require('express-validator');
const { query: pgQuery, transaction: pgTransaction } = require('../database');
const { query, get, run, all } = require('../database/sqlite');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const PDFReportService = require('../services/pdfService');

const router = express.Router();
const pdfService = new PDFReportService();

// Get all estimates
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    status = 'all',
    client_id,
    start_date,
    end_date,
  } = req.query;

  const offset = (page - 1) * limit;

  let whereClause = 'WHERE e.company_id = ?';
  const queryParams = [req.user.companyId];
  let paramCount = 2;

  if (status !== 'all' && ['draft', 'sent', 'approved', 'declined', 'expired'].includes(status)) {
    whereClause += ` AND e.status = ?`;
    queryParams.push(status);
    paramCount++;
  }

  if (client_id) {
    whereClause += ` AND e.client_id = ?`;
    queryParams.push(client_id);
    paramCount++;
  }

  if (start_date) {
    whereClause += ` AND e.created_at >= ?`;
    queryParams.push(start_date);
    paramCount++;
  }

  if (end_date) {
    whereClause += ` AND e.created_at <= ?`;
    queryParams.push(end_date);
    paramCount++;
  }

  const result = await all(
    `SELECT e.id, e.status, e.subtotal_cents, e.tax_cents, e.total_cents, 
            e.currency, e.valid_until, e.created_at, e.signed_at,
            c.name as client_name, c.contact_type,
            s.nickname as site_name, s.address_json,
            i.id as inspection_id,
            COUNT(ei.id) as line_item_count
     FROM estimates e
     JOIN clients c ON e.client_id = c.id
     JOIN sites s ON e.site_id = s.id
     LEFT JOIN inspections i ON e.inspection_id = i.id
     LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
     ${whereClause}
     GROUP BY e.id, e.status, e.subtotal_cents, e.tax_cents, e.total_cents,
              e.currency, e.valid_until, e.created_at, e.signed_at,
              c.name, c.contact_type, s.nickname, s.address_json, i.id
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, limit, offset]
  );

  res.json({
    estimates: result,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
}));

// Get single estimate with line items
router.get('/:id', asyncHandler(async (req, res) => {
  const estimateResult = await query(
    `SELECT e.*, 
            c.name as client_name, c.contact_type, c.billing_email, c.phone,
            s.nickname as site_name, s.address_json,
            i.id as inspection_id, i.started_at as inspection_date,
            pb.name as price_book_name
     FROM estimates e
     JOIN clients c ON e.client_id = c.id
     JOIN sites s ON e.site_id = s.id
     LEFT JOIN inspections i ON e.inspection_id = i.id
     LEFT JOIN price_books pb ON e.price_book_id = pb.id
     WHERE e.id = $1 AND e.company_id = $2`,
    [req.params.id, req.companyId],
  );

  if (estimateResult.rows.length === 0) {
    return res.status(404).json({ error: 'Estimate not found' });
  }

  // Get line items
  const itemsResult = await query(
    `SELECT ei.*, pbi.sku, pbi.category
     FROM estimate_items ei
     LEFT JOIN price_book_items pbi ON ei.price_book_item_id = pbi.id
     WHERE ei.estimate_id = $1
     ORDER BY pbi.category, ei.description`,
    [req.params.id],
  );

  res.json({
    ...estimateResult.rows[0],
    items: itemsResult.rows,
  });
}));

// Create estimate from inspection
router.post('/from-inspection/:inspection_id', asyncHandler(async (req, res) => {
  const { inspection_id } = req.params;

  await transaction(async (client) => {
    // Get inspection details
    const inspectionResult = await client.query(
      `SELECT i.*, s.client_id, s.id as site_id, t.callouts_json
       FROM inspections i
       JOIN sites s ON i.site_id = s.id
       JOIN inspection_templates t ON i.template_id = t.id
       WHERE i.id = $1 AND i.company_id = $2`,
      [inspection_id, req.companyId],
    );

    if (inspectionResult.rows.length === 0) {
      throw new AppError('Inspection not found', 404);
    }

    const inspection = inspectionResult.rows[0];

    // Get default price book for company
    const priceBookResult = await client.query(
      `SELECT id FROM price_books 
       WHERE company_id = $1 AND is_active = true 
       ORDER BY created_at 
       LIMIT 1`,
      [req.companyId],
    );

    const priceBookId = priceBookResult.rows[0]?.id;

    // Create estimate
    const estimateResult = await client.query(
      `INSERT INTO estimates (
         company_id, inspection_id, client_id, site_id, price_book_id,
         status, subtotal_cents, tax_cents, total_cents
       )
       VALUES ($1, $2, $3, $4, $5, 'draft', 0, 0, 0)
       RETURNING *`,
      [req.companyId, inspection_id, inspection.client_id, inspection.site_id, priceBookId],
    );

    const estimate = estimateResult.rows[0];

    // Get inspection items that have callouts
    const inspectionItemsResult = await client.query(
      `SELECT * FROM inspection_items 
       WHERE inspection_id = $1 AND callout_code IS NOT NULL`,
      [inspection_id],
    );

    const callouts = inspection.callouts_json?.callouts || [];
    let subtotalCents = 0;

    // Process each inspection item with callouts
    for (const item of inspectionItemsResult.rows) {
      const callout = callouts.find((c) => c.code === item.callout_code);

      if (callout && callout.mapsTo) {
        for (const mapping of callout.mapsTo) {
          // Find price book item by SKU
          const priceItemResult = await client.query(
            `SELECT * FROM price_book_items 
             WHERE price_book_id = $1 AND sku = $2 AND is_active = true`,
            [priceBookId, mapping.sku],
          );

          if (priceItemResult.rows.length > 0) {
            const priceItem = priceItemResult.rows[0];
            const qty = mapping.qty || 1;
            const lineTotalCents = priceItem.price_cents * qty;

            // Add estimate line item
            await client.query(
              `INSERT INTO estimate_items (
                 estimate_id, price_book_item_id, description, qty, unit,
                 unit_price_cents, line_total_cents, tax_rate_pct
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                estimate.id,
                priceItem.id,
                mapping.description || priceItem.name,
                qty,
                priceItem.unit,
                priceItem.price_cents,
                lineTotalCents,
                priceItem.tax_rate_pct,
              ],
            );

            subtotalCents += lineTotalCents;
          }
        }
      }
    }

    // Calculate tax and total
    const taxCents = Math.round(subtotalCents * 0.0825); // Default 8.25% tax rate
    const totalCents = subtotalCents + taxCents;

    // Update estimate totals
    await client.query(
      `UPDATE estimates 
       SET subtotal_cents = $1, tax_cents = $2, total_cents = $3, updated_at = NOW()
       WHERE id = $4`,
      [subtotalCents, taxCents, totalCents, estimate.id],
    );

    // Create audit log
    await client.query(
      `INSERT INTO audit_logs (company_id, actor_user_id, action, entity_table, entity_id)
       VALUES ($1, $2, 'estimate.created', 'estimates', $3)`,
      [req.companyId, req.user.id, estimate.id],
    );

    res.status(201).json({
      ...estimate,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,
    });
  });
}));

// Create manual estimate
router.post('/', [
  body('client_id').isUUID().withMessage('Valid client ID required'),
  body('site_id').isUUID().withMessage('Valid site ID required'),
  body('price_book_id').optional().isUUID(),
  body('customer_notes').optional().isString(),
  body('internal_notes').optional().isString(),
  body('valid_until').optional().isISO8601(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    client_id,
    site_id,
    price_book_id,
    customer_notes,
    internal_notes,
    valid_until,
  } = req.body;

  // Verify client and site belong to company
  const siteCheck = await query(
    `SELECT s.id, s.client_id FROM sites s
     JOIN clients c ON s.client_id = c.id
     WHERE s.id = $1 AND s.client_id = $2 AND c.company_id = $3`,
    [site_id, client_id, req.companyId],
  );

  if (siteCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Site not found or does not belong to client' });
  }

  const result = await query(
    `INSERT INTO estimates (
       company_id, client_id, site_id, price_book_id,
       customer_notes, internal_notes, valid_until,
       status, subtotal_cents, tax_cents, total_cents
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', 0, 0, 0)
     RETURNING *`,
    [req.companyId, client_id, site_id, price_book_id, customer_notes, internal_notes, valid_until],
  );

  res.status(201).json(result.rows[0]);
}));

// Add line item to estimate
router.post('/:id/items', [
  body('description').notEmpty().withMessage('Description is required'),
  body('qty').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('unit_price_cents').isInt({ min: 0 }).withMessage('Unit price must be positive'),
  body('unit').optional().isIn(['each', 'hour', 'foot', 'gallon', 'set']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    price_book_item_id,
    description,
    qty,
    unit = 'each',
    unit_price_cents,
    tax_rate_pct = 0,
  } = req.body;

  const lineTotalCents = Math.round(qty * unit_price_cents);

  await transaction(async (client) => {
    // Verify estimate exists and belongs to company
    const estimateCheck = await client.query(
      'SELECT id FROM estimates WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId],
    );

    if (estimateCheck.rows.length === 0) {
      throw new AppError('Estimate not found', 404);
    }

    // Add line item
    const itemResult = await client.query(
      `INSERT INTO estimate_items (
         estimate_id, price_book_item_id, description, qty, unit,
         unit_price_cents, line_total_cents, tax_rate_pct
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.params.id, price_book_item_id, description, qty, unit, unit_price_cents, lineTotalCents, tax_rate_pct],
    );

    // Recalculate estimate totals
    const totalsResult = await client.query(
      `SELECT 
         SUM(line_total_cents) as subtotal_cents,
         SUM(line_total_cents * tax_rate_pct / 100) as tax_cents
       FROM estimate_items 
       WHERE estimate_id = $1`,
      [req.params.id],
    );

    const { subtotal_cents = 0, tax_cents = 0 } = totalsResult.rows[0];
    const total_cents = subtotal_cents + tax_cents;

    await client.query(
      `UPDATE estimates 
       SET subtotal_cents = $1, tax_cents = $2, total_cents = $3, updated_at = NOW()
       WHERE id = $4`,
      [subtotal_cents, tax_cents, total_cents, req.params.id],
    );

    res.status(201).json(itemResult.rows[0]);
  });
}));

// Update estimate status
router.patch('/:id/status', [
  body('status').isIn(['draft', 'sent', 'approved', 'declined', 'expired']).withMessage('Invalid status'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status } = req.body;

  const result = await query(
    `UPDATE estimates 
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND company_id = $3
     RETURNING *`,
    [status, req.params.id, req.companyId],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Estimate not found' });
  }

  // Create audit log
  await query(
    `INSERT INTO audit_logs (company_id, actor_user_id, action, entity_table, entity_id, diff_json)
     VALUES ($1, $2, 'estimate.status_changed', 'estimates', $3, $4)`,
    [req.companyId, req.user.id, req.params.id, JSON.stringify({ status })],
  );

  res.json(result.rows[0]);
}));

// Generate estimate PDF
router.post('/:id/pdf', asyncHandler(async (req, res) => {
  // Verify estimate exists
  const estimateCheck = await query(
    'SELECT id FROM estimates WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (estimateCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Estimate not found' });
  }

  // Queue PDF generation job
  await query(
    `INSERT INTO background_jobs (kind, payload, run_after)
     VALUES ('render_pdf', $1, NOW())`,
    [JSON.stringify({
      type: 'estimate',
      estimate_id: req.params.id,
      company_id: req.companyId,
    })],
  );

  res.json({ message: 'PDF generation queued' });
}));

// Delete estimate line item
router.delete('/:estimateId/items/:itemId', asyncHandler(async (req, res) => {
  const { estimateId, itemId } = req.params;

  await transaction(async (client) => {
    // Verify estimate belongs to company
    const estimateCheck = await client.query(
      'SELECT id FROM estimates WHERE id = $1 AND company_id = $2',
      [estimateId, req.companyId],
    );

    if (estimateCheck.rows.length === 0) {
      throw new AppError('Estimate not found', 404);
    }

    // Delete line item
    const deleteResult = await client.query(
      'DELETE FROM estimate_items WHERE id = $1 AND estimate_id = $2 RETURNING id',
      [itemId, estimateId],
    );

    if (deleteResult.rows.length === 0) {
      throw new AppError('Line item not found', 404);
    }

    // Recalculate totals
    const totalsResult = await client.query(
      `SELECT 
         COALESCE(SUM(line_total_cents), 0) as subtotal_cents,
         COALESCE(SUM(line_total_cents * tax_rate_pct / 100), 0) as tax_cents
       FROM estimate_items 
       WHERE estimate_id = $1`,
      [estimateId],
    );

    const { subtotal_cents, tax_cents } = totalsResult.rows[0];
    const total_cents = subtotal_cents + tax_cents;

    await client.query(
      `UPDATE estimates 
       SET subtotal_cents = $1, tax_cents = $2, total_cents = $3, updated_at = NOW()
       WHERE id = $4`,
      [subtotal_cents, tax_cents, total_cents, estimateId],
    );

    res.json({ message: 'Line item deleted successfully' });
  });
}));

// Generate PDF report
router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const estimateId = req.params.id;
  const companyId = req.user.company_id;

  const estimateQuery = `
    SELECT 
      e.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.address as site_address,
      s.city as site_city,
      s.state as site_state,
      s.zip_code as site_zip,
      co.name as company_name,
      co.address as company_address,
      co.city as company_city,
      co.state as company_state,
      co.zip_code as company_zip,
      co.phone as company_phone,
      co.email as company_email,
      co.logo_url,
      co.website,
      u.name as created_by_name
    FROM estimates e
    JOIN clients c ON e.client_id = c.id
    LEFT JOIN sites s ON e.site_id = s.id
    JOIN companies co ON e.company_id = co.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.id = $1 AND e.company_id = $2
  `;

  const estimateResult = await client.query(estimateQuery, [estimateId, companyId]);

  if (estimateResult.rows.length === 0) {
    return res.status(404).json({ error: 'Estimate not found' });
  }

  const estimate = estimateResult.rows[0];

  // Get estimate items
  const itemsQuery = `
    SELECT 
      ei.*,
      pbi.description,
      pbi.category,
      pbi.unit
    FROM estimate_items ei
    LEFT JOIN price_book_items pbi ON ei.price_book_item_id = pbi.id
    WHERE ei.estimate_id = $1
    ORDER BY ei.created_at
  `;

  const itemsResult = await client.query(itemsQuery, [estimateId]);
  estimate.items = itemsResult.rows;

  // Generate PDF
  const pdfBuffer = await pdfService.generateEstimateReport(estimate);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Estimate-${estimate.estimate_number}.pdf"`);
  res.send(pdfBuffer);
}));

module.exports = router;
