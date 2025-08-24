const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../database');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all price books for company
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT pb.id, pb.name, pb.description, pb.is_active, pb.created_at,
            COUNT(pbi.id) as item_count
     FROM price_books pb
     LEFT JOIN price_book_items pbi ON pb.id = pbi.price_book_id AND pbi.is_active = true
     WHERE pb.company_id = $1
     GROUP BY pb.id, pb.name, pb.description, pb.is_active, pb.created_at
     ORDER BY pb.name`,
    [req.companyId],
  );

  res.json(result.rows);
}));

// Get single price book with items
router.get('/:id', asyncHandler(async (req, res) => {
  const priceBookResult = await query(
    'SELECT * FROM price_books WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (priceBookResult.rows.length === 0) {
    return res.status(404).json({ error: 'Price book not found' });
  }

  // Get items by category
  const itemsResult = await query(
    `SELECT id, sku, name, category, description, unit, cost_cents, price_cents,
            currency, tax_rate_pct, is_active, metadata
     FROM price_book_items
     WHERE price_book_id = $1 AND company_id = $2
     ORDER BY category, name`,
    [req.params.id, req.companyId],
  );

  // Group items by category
  const itemsByCategory = itemsResult.rows.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  res.json({
    ...priceBookResult.rows[0],
    items_by_category: itemsByCategory,
    total_items: itemsResult.rows.length,
  });
}));

// Create new price book
router.post('/', requireRole(['owner', 'admin']), [
  body('name').notEmpty().withMessage('Price book name is required'),
  body('description').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description } = req.body;

  const result = await query(
    `INSERT INTO price_books (company_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [req.companyId, name, description],
  );

  res.status(201).json(result.rows[0]);
}));

// Update price book
router.patch('/:id', requireRole(['owner', 'admin']), [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().isString(),
  body('is_active').optional().isBoolean(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, is_active } = req.body;

  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updateFields.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updateFields.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (is_active !== undefined) {
    updateFields.push(`is_active = $${paramCount++}`);
    values.push(is_active);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updateFields.push('updated_at = NOW()');
  values.push(req.params.id, req.companyId);

  const result = await query(
    `UPDATE price_books SET ${updateFields.join(', ')} 
     WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Price book not found' });
  }

  res.json(result.rows[0]);
}));

// Get items in price book
router.get('/:id/items', asyncHandler(async (req, res) => {
  const { category, search = '', active_only = 'true' } = req.query;

  let whereClause = 'WHERE price_book_id = $1 AND company_id = $2';
  const queryParams = [req.params.id, req.companyId];
  let paramCount = 3;

  if (category) {
    whereClause += ` AND category = $${paramCount}`;
    queryParams.push(category);
    paramCount++;
  }

  if (search) {
    whereClause += ` AND (name ILIKE $${paramCount} OR sku ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    queryParams.push(`%${search}%`);
    paramCount++;
  }

  if (active_only === 'true') {
    whereClause += ' AND is_active = true';
  }

  const result = await query(
    `SELECT * FROM price_book_items
     ${whereClause}
     ORDER BY category, name`,
    queryParams,
  );

  res.json(result.rows);
}));

// Add item to price book
router.post('/:id/items', requireRole(['owner', 'admin']), [
  body('name').notEmpty().withMessage('Item name is required'),
  body('unit').isIn(['each', 'hour', 'foot', 'gallon', 'set']).withMessage('Invalid unit'),
  body('cost_cents').isInt({ min: 0 }).withMessage('Cost must be positive'),
  body('price_cents').isInt({ min: 0 }).withMessage('Price must be positive'),
  body('category').optional().isString(),
  body('sku').optional().isString(),
  body('description').optional().isString(),
  body('tax_rate_pct').optional().isFloat({ min: 0, max: 100 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Verify price book exists and belongs to company
  const priceBookCheck = await query(
    'SELECT id FROM price_books WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (priceBookCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Price book not found' });
  }

  const {
    sku,
    name,
    category,
    description,
    unit,
    cost_cents,
    price_cents,
    tax_rate_pct = 0,
    metadata = {},
  } = req.body;

  const result = await query(
    `INSERT INTO price_book_items (
       company_id, price_book_id, sku, name, category, description,
       unit, cost_cents, price_cents, tax_rate_pct, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      req.companyId, req.params.id, sku, name, category, description,
      unit, cost_cents, price_cents, tax_rate_pct, JSON.stringify(metadata),
    ],
  );

  res.status(201).json(result.rows[0]);
}));

// Update price book item
router.patch('/:priceBookId/items/:itemId', requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  const { priceBookId, itemId } = req.params;

  // Verify price book exists
  const priceBookCheck = await query(
    'SELECT id FROM price_books WHERE id = $1 AND company_id = $2',
    [priceBookId, req.companyId],
  );

  if (priceBookCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Price book not found' });
  }

  const updateFields = [];
  const values = [];
  let paramCount = 1;

  const allowedFields = [
    'sku', 'name', 'category', 'description', 'unit',
    'cost_cents', 'price_cents', 'tax_rate_pct', 'is_active', 'metadata',
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

  updateFields.push('updated_at = NOW()');
  values.push(itemId, priceBookId, req.companyId);

  const result = await query(
    `UPDATE price_book_items SET ${updateFields.join(', ')}
     WHERE id = $${paramCount} AND price_book_id = $${paramCount + 1} AND company_id = $${paramCount + 2}
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Price book item not found' });
  }

  res.json(result.rows[0]);
}));

// Import items from CSV
router.post('/:id/import', requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  const { items } = req.body; // Array of item objects

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  // Verify price book exists
  const priceBookCheck = await query(
    'SELECT id FROM price_books WHERE id = $1 AND company_id = $2',
    [req.params.id, req.companyId],
  );

  if (priceBookCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Price book not found' });
  }

  const results = [];
  const errors = [];

  await transaction(async (client) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Validate required fields
        if (!item.name || !item.unit || item.cost_cents === undefined || item.price_cents === undefined) {
          errors.push({
            row: i + 1,
            error: 'Missing required fields: name, unit, cost_cents, price_cents',
          });
          continue;
        }

        // Insert item
        const result = await client.query(
          `INSERT INTO price_book_items (
             company_id, price_book_id, sku, name, category, description,
             unit, cost_cents, price_cents, tax_rate_pct, is_active
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
           RETURNING id, name, sku`,
          [
            req.companyId,
            req.params.id,
            item.sku || null,
            item.name,
            item.category || 'General',
            item.description || '',
            item.unit,
            parseInt(item.cost_cents),
            parseInt(item.price_cents),
            parseFloat(item.tax_rate_pct || 0),
          ],
        );

        results.push(result.rows[0]);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message,
        });
      }
    }
  });

  res.json({
    imported: results.length,
    errors: errors,
    items: results,
  });
}));

// Get price book categories (for organization)
router.get('/:id/categories', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT category, COUNT(*) as item_count, 
            AVG(price_cents) as avg_price_cents,
            MIN(price_cents) as min_price_cents,
            MAX(price_cents) as max_price_cents
     FROM price_book_items
     WHERE price_book_id = $1 AND company_id = $2 AND is_active = true
     GROUP BY category
     ORDER BY category`,
    [req.params.id, req.companyId],
  );

  res.json(result.rows);
}));

// Delete price book item
router.delete('/:priceBookId/items/:itemId', requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  const { priceBookId, itemId } = req.params;

  // Soft delete by setting is_active = false
  const result = await query(
    `UPDATE price_book_items 
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND price_book_id = $2 AND company_id = $3
     RETURNING id`,
    [itemId, priceBookId, req.companyId],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Price book item not found' });
  }

  res.json({ message: 'Price book item deleted successfully' });
}));

module.exports = router;
