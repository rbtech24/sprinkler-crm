const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();

// SQLite database connection
const db = new sqlite3.Database(path.join(__dirname, '../../data/sprinkler_repair.db'));

// Helper function to execute SQLite queries
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const runSingle = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

// All routes require authentication
router.use(authenticateToken);
router.use(requireAuth);

// Initialize inventory tables
const initInventoryTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      parent_category_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (parent_category_id) REFERENCES inventory_categories(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      website TEXT,
      payment_terms TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active', -- 'active', 'inactive'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      category_id INTEGER,
      supplier_id INTEGER,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      unit_of_measure TEXT DEFAULT 'each', -- 'each', 'ft', 'gallon', 'box', etc.
      current_stock INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      max_stock_level INTEGER DEFAULT 100,
      reorder_point INTEGER DEFAULT 10,
      reorder_quantity INTEGER DEFAULT 20,
      unit_cost_cents INTEGER DEFAULT 0,
      selling_price_cents INTEGER DEFAULT 0,
      location TEXT, -- warehouse location/bin
      barcode TEXT,
      is_serialized BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (category_id) REFERENCES inventory_categories(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'transfer', 'damage', 'return'
      reference_type TEXT, -- 'purchase_order', 'work_order', 'estimate', 'adjustment'
      reference_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_cost_cents INTEGER,
      total_cost_cents INTEGER,
      notes TEXT,
      user_id INTEGER,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      po_number TEXT NOT NULL,
      status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'confirmed', 'received', 'cancelled'
      order_date DATE,
      expected_delivery_date DATE,
      actual_delivery_date DATE,
      subtotal_cents INTEGER DEFAULT 0,
      tax_cents INTEGER DEFAULT 0,
      shipping_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity_ordered INTEGER NOT NULL,
      quantity_received INTEGER DEFAULT 0,
      unit_cost_cents INTEGER NOT NULL,
      total_cost_cents INTEGER NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock', 'expired'
      message TEXT NOT NULL,
      is_resolved BOOLEAN DEFAULT 0,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )`
  ];

  for (const table of tables) {
    await runSingle(table);
  }
  
  // Insert default categories and sample data
  await insertDefaultInventoryData();
};

const insertDefaultInventoryData = async () => {
  // Default categories
  const defaultCategories = [
    { name: 'Sprinkler Heads', description: 'Various types of sprinkler heads and nozzles' },
    { name: 'Valves', description: 'Control valves, isolation valves, and backflow preventers' },
    { name: 'Piping & Fittings', description: 'Pipes, fittings, and connection hardware' },
    { name: 'Control Systems', description: 'Controllers, timers, and automation equipment' },
    { name: 'Tools & Equipment', description: 'Hand tools, testing equipment, and maintenance supplies' },
    { name: 'Chemicals', description: 'Testing chemicals and treatment products' }
  ];

  for (const category of defaultCategories) {
    const existing = await runQuery(`
      SELECT id FROM inventory_categories 
      WHERE name = ? AND company_id = 1
    `, [category.name]);

    if (existing.length === 0) {
      await runSingle(`
        INSERT INTO inventory_categories (company_id, name, description)
        VALUES (1, ?, ?)
      `, [category.name, category.description]);
    }
  }

  // Sample supplier
  const existingSupplier = await runQuery(`
    SELECT id FROM suppliers WHERE name = 'Fire Safety Supply Co.' AND company_id = 1
  `);

  if (existingSupplier.length === 0) {
    await runSingle(`
      INSERT INTO suppliers (
        company_id, name, contact_person, email, phone, 
        address, payment_terms, status
      ) VALUES (1, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      'Fire Safety Supply Co.',
      'John Smith',
      'orders@firesafetysupply.com',
      '555-0100',
      '123 Industrial Blvd, Safety City, TX 12345',
      'Net 30'
    ]);
  }
};

// Initialize tables on startup
initInventoryTables().catch(console.error);

// Get inventory dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  // Inventory summary
  const summary = await runQuery(`
    SELECT 
      COUNT(*) as total_items,
      SUM(current_stock) as total_quantity,
      SUM(current_stock * unit_cost_cents) as total_value_cents,
      COUNT(CASE WHEN current_stock <= min_stock_level THEN 1 END) as low_stock_items,
      COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock_items
    FROM inventory_items
    WHERE company_id = ? AND is_active = 1
  `, [companyId]);

  // Recent transactions
  const recentTransactions = await runQuery(`
    SELECT 
      it.*,
      ii.name as item_name,
      ii.sku,
      u.name as user_name
    FROM inventory_transactions it
    JOIN inventory_items ii ON it.item_id = ii.id
    LEFT JOIN users u ON it.user_id = u.id
    WHERE it.company_id = ?
    ORDER BY it.created_at DESC
    LIMIT 10
  `, [companyId]);

  // Active stock alerts
  const activeAlerts = await runQuery(`
    SELECT 
      sa.*,
      ii.name as item_name,
      ii.sku,
      ii.current_stock
    FROM stock_alerts sa
    JOIN inventory_items ii ON sa.item_id = ii.id
    WHERE sa.company_id = ? AND sa.is_resolved = 0
    ORDER BY sa.created_at DESC
    LIMIT 10
  `, [companyId]);

  // Top selling items (based on transactions)
  const topItems = await runQuery(`
    SELECT 
      ii.name,
      ii.sku,
      ii.current_stock,
      SUM(ABS(it.quantity)) as total_usage
    FROM inventory_items ii
    LEFT JOIN inventory_transactions it ON ii.id = it.item_id 
      AND it.transaction_type IN ('sale', 'usage')
      AND DATE(it.created_at) >= DATE('now', '-30 days')
    WHERE ii.company_id = ? AND ii.is_active = 1
    GROUP BY ii.id, ii.name, ii.sku, ii.current_stock
    ORDER BY total_usage DESC
    LIMIT 5
  `, [companyId]);

  res.json({
    summary: summary[0] || {},
    recent_transactions: recentTransactions,
    active_alerts: activeAlerts,
    top_items: topItems
  });
}));

// Get inventory items with filtering
router.get('/items', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { 
    category_id, 
    supplier_id, 
    status = 'all', 
    search, 
    limit = 50,
    offset = 0 
  } = req.query;

  let whereConditions = ['ii.company_id = ?'];
  let params = [companyId];

  if (category_id) {
    whereConditions.push('ii.category_id = ?');
    params.push(category_id);
  }

  if (supplier_id) {
    whereConditions.push('ii.supplier_id = ?');
    params.push(supplier_id);
  }

  if (status === 'low_stock') {
    whereConditions.push('ii.current_stock <= ii.min_stock_level');
  } else if (status === 'out_of_stock') {
    whereConditions.push('ii.current_stock = 0');
  } else if (status === 'active') {
    whereConditions.push('ii.is_active = 1');
  }

  if (search) {
    whereConditions.push('(ii.name LIKE ? OR ii.sku LIKE ? OR ii.description LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const items = await runQuery(`
    SELECT 
      ii.*,
      ic.name as category_name,
      s.name as supplier_name,
      (ii.current_stock * ii.unit_cost_cents) as total_value_cents
    FROM inventory_items ii
    LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
    LEFT JOIN suppliers s ON ii.supplier_id = s.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY ii.name
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), parseInt(offset)]);

  // Get total count
  const totalCount = await runQuery(`
    SELECT COUNT(*) as count
    FROM inventory_items ii
    WHERE ${whereConditions.join(' AND ')}
  `, params);

  res.json({
    items,
    pagination: {
      total: totalCount[0]?.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Create inventory item
router.post('/items', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    category_id,
    supplier_id,
    sku,
    name,
    description,
    unit_of_measure = 'each',
    current_stock = 0,
    min_stock_level = 5,
    max_stock_level = 100,
    reorder_point = 10,
    reorder_quantity = 20,
    unit_cost_cents = 0,
    selling_price_cents = 0,
    location,
    barcode
  } = req.body;

  // Check if SKU already exists
  const existingSku = await runQuery(`
    SELECT id FROM inventory_items 
    WHERE sku = ? AND company_id = ?
  `, [sku, companyId]);

  if (existingSku.length > 0) {
    return res.status(400).json({ error: 'SKU already exists' });
  }

  const result = await runSingle(`
    INSERT INTO inventory_items (
      company_id, category_id, supplier_id, sku, name, description,
      unit_of_measure, current_stock, min_stock_level, max_stock_level,
      reorder_point, reorder_quantity, unit_cost_cents, selling_price_cents,
      location, barcode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    companyId, category_id, supplier_id, sku, name, description,
    unit_of_measure, current_stock, min_stock_level, max_stock_level,
    reorder_point, reorder_quantity, unit_cost_cents, selling_price_cents,
    location, barcode
  ]);

  // Create initial stock transaction if current_stock > 0
  if (current_stock > 0) {
    await runSingle(`
      INSERT INTO inventory_transactions (
        company_id, item_id, transaction_type, quantity, 
        unit_cost_cents, total_cost_cents, notes, user_id
      ) VALUES (?, ?, 'adjustment', ?, ?, ?, 'Initial stock', ?)
    `, [
      companyId, result.id, current_stock, 
      unit_cost_cents, current_stock * unit_cost_cents, req.user.id
    ]);
  }

  res.json({
    message: 'Inventory item created successfully',
    item_id: result.id
  });
}));

// Update inventory item
router.put('/items/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.company_id;
  const updateFields = req.body;

  // Remove fields that shouldn't be updated directly
  delete updateFields.id;
  delete updateFields.company_id;
  delete updateFields.current_stock; // Use stock adjustment instead
  delete updateFields.created_at;

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Build update query
  const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updateFields);

  await runSingle(`
    UPDATE inventory_items 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `, [...values, id, companyId]);

  res.json({ message: 'Inventory item updated successfully' });
}));

// Stock adjustment
router.post('/items/:id/adjust', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.company_id;
  const { quantity, type = 'adjustment', notes } = req.body;

  if (!quantity || quantity === 0) {
    return res.status(400).json({ error: 'Quantity must be non-zero' });
  }

  // Get current item
  const item = await runQuery(`
    SELECT * FROM inventory_items 
    WHERE id = ? AND company_id = ?
  `, [id, companyId]);

  if (item.length === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const currentItem = item[0];
  const newStock = currentItem.current_stock + quantity;

  if (newStock < 0) {
    return res.status(400).json({ 
      error: 'Adjustment would result in negative stock',
      current_stock: currentItem.current_stock,
      requested_adjustment: quantity
    });
  }

  // Update stock
  await runSingle(`
    UPDATE inventory_items 
    SET current_stock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newStock, id]);

  // Record transaction
  await runSingle(`
    INSERT INTO inventory_transactions (
      company_id, item_id, transaction_type, quantity,
      unit_cost_cents, total_cost_cents, notes, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    companyId, id, type, quantity,
    currentItem.unit_cost_cents, Math.abs(quantity) * currentItem.unit_cost_cents,
    notes, req.user.id
  ]);

  // Check for stock alerts
  await checkStockLevels(companyId, id, newStock, currentItem);

  res.json({
    message: 'Stock adjusted successfully',
    previous_stock: currentItem.current_stock,
    new_stock: newStock,
    adjustment: quantity
  });
}));

// Get suppliers
router.get('/suppliers', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { status = 'active' } = req.query;

  let whereConditions = ['company_id = ?'];
  let params = [companyId];

  if (status !== 'all') {
    whereConditions.push('status = ?');
    params.push(status);
  }

  const suppliers = await runQuery(`
    SELECT 
      s.*,
      COUNT(ii.id) as item_count,
      COUNT(po.id) as purchase_order_count
    FROM suppliers s
    LEFT JOIN inventory_items ii ON s.id = ii.supplier_id AND ii.is_active = 1
    LEFT JOIN purchase_orders po ON s.id = po.supplier_id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY s.id, s.name, s.contact_person, s.email, s.phone, s.address, s.website, s.payment_terms, s.notes, s.status, s.created_at, s.updated_at
    ORDER BY s.name
  `, params);

  res.json({ suppliers });
}));

// Create supplier
router.post('/suppliers', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    name,
    contact_person,
    email,
    phone,
    address,
    website,
    payment_terms,
    notes
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Supplier name is required' });
  }

  const result = await runSingle(`
    INSERT INTO suppliers (
      company_id, name, contact_person, email, phone,
      address, website, payment_terms, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [companyId, name, contact_person, email, phone, address, website, payment_terms, notes]);

  res.json({
    message: 'Supplier created successfully',
    supplier_id: result.id
  });
}));

// Create purchase order
router.post('/purchase-orders', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    supplier_id,
    items, // Array of {item_id, quantity, unit_cost_cents}
    expected_delivery_date,
    notes
  } = req.body;

  if (!supplier_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and items are required' });
  }

  // Generate PO number
  const poCount = await runQuery(`
    SELECT COUNT(*) as count FROM purchase_orders WHERE company_id = ?
  `, [companyId]);
  
  const poNumber = `PO-${String(poCount[0].count + 1).padStart(4, '0')}`;

  // Calculate totals
  let subtotalCents = 0;
  for (const item of items) {
    subtotalCents += item.quantity * item.unit_cost_cents;
  }

  const taxCents = Math.round(subtotalCents * 0.08); // 8% tax
  const totalCents = subtotalCents + taxCents;

  // Create purchase order
  const poResult = await runSingle(`
    INSERT INTO purchase_orders (
      company_id, supplier_id, po_number, order_date,
      expected_delivery_date, subtotal_cents, tax_cents, 
      total_cents, notes, created_by
    ) VALUES (?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?)
  `, [
    companyId, supplier_id, poNumber, expected_delivery_date,
    subtotalCents, taxCents, totalCents, notes, req.user.id
  ]);

  // Add purchase order items
  for (const item of items) {
    await runSingle(`
      INSERT INTO purchase_order_items (
        purchase_order_id, item_id, quantity_ordered,
        unit_cost_cents, total_cost_cents
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      poResult.id, item.item_id, item.quantity,
      item.unit_cost_cents, item.quantity * item.unit_cost_cents
    ]);
  }

  res.json({
    message: 'Purchase order created successfully',
    purchase_order_id: poResult.id,
    po_number: poNumber,
    total: totalCents / 100
  });
}));

// Get stock alerts
router.get('/alerts', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { resolved = 'false' } = req.query;

  const alerts = await runQuery(`
    SELECT 
      sa.*,
      ii.name as item_name,
      ii.sku,
      ii.current_stock,
      ii.min_stock_level
    FROM stock_alerts sa
    JOIN inventory_items ii ON sa.item_id = ii.id
    WHERE sa.company_id = ? AND sa.is_resolved = ?
    ORDER BY sa.created_at DESC
  `, [companyId, resolved === 'true' ? 1 : 0]);

  res.json({ alerts });
}));

// Helper function to check stock levels and create alerts
async function checkStockLevels(companyId, itemId, currentStock, item) {
  // Remove existing unresolved alerts for this item
  await runSingle(`
    UPDATE stock_alerts 
    SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND item_id = ? AND is_resolved = 0
  `, [companyId, itemId]);

  let alertType = null;
  let message = null;

  if (currentStock === 0) {
    alertType = 'out_of_stock';
    message = `${item.name} (${item.sku}) is out of stock`;
  } else if (currentStock <= item.min_stock_level) {
    alertType = 'low_stock';
    message = `${item.name} (${item.sku}) is below minimum stock level (${currentStock}/${item.min_stock_level})`;
  }

  if (alertType) {
    await runSingle(`
      INSERT INTO stock_alerts (
        company_id, item_id, alert_type, message
      ) VALUES (?, ?, ?, ?)
    `, [companyId, itemId, alertType, message]);
  }
}

// Get inventory analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { period = '30' } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));
  const startDateStr = startDate.toISOString().split('T')[0];

  // Stock movement analytics
  const stockMovement = await runQuery(`
    SELECT 
      DATE(transaction_date) as date,
      transaction_type,
      SUM(ABS(quantity)) as total_quantity,
      SUM(total_cost_cents) as total_value_cents
    FROM inventory_transactions
    WHERE company_id = ? AND DATE(transaction_date) >= ?
    GROUP BY DATE(transaction_date), transaction_type
    ORDER BY date
  `, [companyId, startDateStr]);

  // Category breakdown
  const categoryBreakdown = await runQuery(`
    SELECT 
      ic.name as category_name,
      COUNT(ii.id) as item_count,
      SUM(ii.current_stock * ii.unit_cost_cents) as total_value_cents
    FROM inventory_categories ic
    LEFT JOIN inventory_items ii ON ic.id = ii.category_id AND ii.company_id = ?
    WHERE ic.company_id = ? AND ic.is_active = 1
    GROUP BY ic.id, ic.name
    ORDER BY total_value_cents DESC
  `, [companyId, companyId]);

  res.json({
    stock_movement: stockMovement,
    category_breakdown: categoryBreakdown,
    period_days: period
  });
}));

module.exports = router;