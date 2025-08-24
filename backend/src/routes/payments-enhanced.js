const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

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

// Initialize database tables for payments
const initPaymentTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'card', 'bank_account', 'check'
      stripe_payment_method_id TEXT,
      last_four TEXT,
      brand TEXT, -- 'visa', 'mastercard', etc.
      exp_month INTEGER,
      exp_year INTEGER,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      invoice_id INTEGER,
      estimate_id INTEGER,
      subscription_id INTEGER,
      amount_cents INTEGER NOT NULL,
      currency TEXT DEFAULT 'USD',
      payment_method_id INTEGER,
      stripe_payment_intent_id TEXT,
      status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed', 'refunded'
      failure_reason TEXT,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      estimate_id INTEGER,
      subscription_id INTEGER,
      invoice_number TEXT NOT NULL,
      status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
      amount_cents INTEGER NOT NULL,
      tax_cents INTEGER DEFAULT 0,
      total_cents INTEGER NOT NULL,
      due_date DATE,
      paid_date DATE,
      payment_terms INTEGER DEFAULT 30, -- days
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (estimate_id) REFERENCES estimates(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )`
  ];

  for (const table of tables) {
    await runSingle(table);
  }
};

// Initialize tables on startup
initPaymentTables().catch(console.error);

// Get payment methods for a client
router.get('/methods/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const companyId = req.user.company_id;

  const paymentMethods = await runQuery(`
    SELECT 
      pm.*,
      c.name as client_name
    FROM payment_methods pm
    JOIN clients c ON pm.client_id = c.id
    WHERE pm.company_id = ? AND pm.client_id = ?
    ORDER BY pm.is_default DESC, pm.created_at DESC
  `, [companyId, clientId]);

  res.json({ payment_methods: paymentMethods });
}));

// Add payment method for client
router.post('/methods', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    client_id,
    type,
    stripe_payment_method_id,
    last_four,
    brand,
    exp_month,
    exp_year,
    is_default = false
  } = req.body;

  // If this is set as default, unset other defaults
  if (is_default) {
    await runSingle(`
      UPDATE payment_methods 
      SET is_default = 0 
      WHERE company_id = ? AND client_id = ?
    `, [companyId, client_id]);
  }

  const result = await runSingle(`
    INSERT INTO payment_methods (
      company_id, client_id, type, stripe_payment_method_id,
      last_four, brand, exp_month, exp_year, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [companyId, client_id, type, stripe_payment_method_id, last_four, brand, exp_month, exp_year, is_default]);

  res.json({
    message: 'Payment method added successfully',
    payment_method_id: result.id
  });
}));

// Process payment for estimate/invoice
router.post('/process', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    client_id,
    invoice_id,
    estimate_id,
    subscription_id,
    amount_cents,
    payment_method_id,
    description = 'Payment'
  } = req.body;

  try {
    // Get payment method details
    const paymentMethod = await runQuery(`
      SELECT * FROM payment_methods 
      WHERE id = ? AND company_id = ? AND client_id = ?
    `, [payment_method_id, companyId, client_id]);

    if (paymentMethod.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const method = paymentMethod[0];
    let paymentIntent = null;
    let status = 'pending';

    // Create Stripe payment intent if using Stripe
    if (method.stripe_payment_method_id && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('dummy')) {
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: amount_cents,
          currency: 'usd',
          payment_method: method.stripe_payment_method_id,
          confirmation_method: 'manual',
          confirm: true,
          description: description,
          metadata: {
            company_id: companyId.toString(),
            client_id: client_id.toString(),
            invoice_id: invoice_id?.toString() || '',
            estimate_id: estimate_id?.toString() || ''
          }
        });

        status = paymentIntent.status === 'succeeded' ? 'completed' : 'processing';
      } catch (stripeError) {
        console.error('Stripe payment error:', stripeError);
        status = 'failed';
      }
    } else {
      // Demo mode - simulate successful payment
      status = 'completed';
    }

    // Record transaction
    const transaction = await runSingle(`
      INSERT INTO payment_transactions (
        company_id, client_id, invoice_id, estimate_id, subscription_id,
        amount_cents, payment_method_id, stripe_payment_intent_id,
        status, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, client_id, invoice_id, estimate_id, subscription_id,
      amount_cents, payment_method_id, paymentIntent?.id,
      status, status === 'completed' ? new Date().toISOString() : null
    ]);

    // Update invoice/estimate status if payment completed
    if (status === 'completed') {
      if (invoice_id) {
        await runSingle(`
          UPDATE invoices 
          SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
          WHERE id = ? AND company_id = ?
        `, [invoice_id, companyId]);
      }
      
      if (estimate_id) {
        await runSingle(`
          UPDATE estimates 
          SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND company_id = ?
        `, [estimate_id, companyId]);
      }
    }

    res.json({
      message: 'Payment processed successfully',
      transaction_id: transaction.id,
      status: status,
      stripe_payment_intent_id: paymentIntent?.id
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ 
      error: 'Payment processing failed',
      details: error.message 
    });
  }
}));

// Get payment history
router.get('/history', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { client_id, status, limit = 50 } = req.query;

  let whereConditions = ['pt.company_id = ?'];
  let params = [companyId];

  if (client_id) {
    whereConditions.push('pt.client_id = ?');
    params.push(client_id);
  }

  if (status) {
    whereConditions.push('pt.status = ?');
    params.push(status);
  }

  const transactions = await runQuery(`
    SELECT 
      pt.*,
      c.name as client_name,
      pm.type as payment_method_type,
      pm.last_four,
      pm.brand,
      i.invoice_number,
      e.title as estimate_title
    FROM payment_transactions pt
    JOIN clients c ON pt.client_id = c.id
    LEFT JOIN payment_methods pm ON pt.payment_method_id = pm.id
    LEFT JOIN invoices i ON pt.invoice_id = i.id
    LEFT JOIN estimates e ON pt.estimate_id = e.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY pt.created_at DESC
    LIMIT ?
  `, [...params, parseInt(limit)]);

  res.json({ transactions });
}));

// Create invoice from estimate
router.post('/invoices/from-estimate', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { estimate_id, due_days = 30, payment_terms = 30 } = req.body;

  // Get estimate details
  const estimates = await runQuery(`
    SELECT * FROM estimates 
    WHERE id = ? AND company_id = ?
  `, [estimate_id, companyId]);

  if (estimates.length === 0) {
    return res.status(404).json({ error: 'Estimate not found' });
  }

  const estimate = estimates[0];
  
  // Generate invoice number
  const invoiceCount = await runQuery(`
    SELECT COUNT(*) as count FROM invoices WHERE company_id = ?
  `, [companyId]);
  
  const invoiceNumber = `INV-${String(invoiceCount[0].count + 1).padStart(4, '0')}`;
  
  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + due_days);

  // Create invoice
  const invoice = await runSingle(`
    INSERT INTO invoices (
      company_id, client_id, estimate_id, invoice_number,
      amount_cents, tax_cents, total_cents, due_date, payment_terms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    companyId, estimate.client_id, estimate_id, invoiceNumber,
    estimate.subtotal_cents, estimate.tax_cents, estimate.total_cents,
    dueDate.toISOString().split('T')[0], payment_terms
  ]);

  // Copy estimate items to invoice items
  const estimateItems = await runQuery(`
    SELECT * FROM estimate_items WHERE estimate_id = ?
  `, [estimate_id]);

  for (const item of estimateItems) {
    await runSingle(`
      INSERT INTO invoice_items (
        invoice_id, description, quantity, unit_price_cents, total_cents
      ) VALUES (?, ?, ?, ?, ?)
    `, [invoice.id, item.description, item.quantity, item.unit_price_cents, item.line_total_cents]);
  }

  res.json({
    message: 'Invoice created successfully',
    invoice_id: invoice.id,
    invoice_number: invoiceNumber
  });
}));

// Get invoices
router.get('/invoices', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { client_id, status, limit = 50 } = req.query;

  let whereConditions = ['i.company_id = ?'];
  let params = [companyId];

  if (client_id) {
    whereConditions.push('i.client_id = ?');
    params.push(client_id);
  }

  if (status) {
    whereConditions.push('i.status = ?');
    params.push(status);
  }

  const invoices = await runQuery(`
    SELECT 
      i.*,
      c.name as client_name,
      c.email as client_email,
      e.title as estimate_title
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    LEFT JOIN estimates e ON i.estimate_id = e.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY i.created_at DESC
    LIMIT ?
  `, [...params, parseInt(limit)]);

  res.json({ invoices });
}));

// Auto-billing for service plans
router.post('/auto-bill', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  // Find subscriptions due for billing
  const subscriptionsDue = await runQuery(`
    SELECT 
      cs.*,
      c.name as client_name,
      c.email as client_email,
      sp.name as plan_name,
      pm.id as payment_method_id,
      pm.type as payment_method_type
    FROM client_subscriptions cs
    JOIN clients c ON cs.client_id = c.id
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    LEFT JOIN payment_methods pm ON cs.client_id = pm.client_id AND pm.is_default = 1
    WHERE cs.company_id = ?
      AND cs.status = 'active'
      AND DATE(cs.next_billing_date) <= DATE('now')
      AND pm.id IS NOT NULL
  `, [companyId]);

  const results = [];

  for (const subscription of subscriptionsDue) {
    try {
      // Create invoice for subscription
      const invoiceNumber = `INV-SUB-${subscription.id}-${Date.now()}`;
      
      const invoice = await runSingle(`
        INSERT INTO invoices (
          company_id, client_id, subscription_id, invoice_number,
          amount_cents, total_cents, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, DATE('now', '+30 days'), 'sent')
      `, [
        companyId, subscription.client_id, subscription.id, invoiceNumber,
        subscription.monthly_price_cents, subscription.monthly_price_cents
      ]);

      // Add invoice item
      await runSingle(`
        INSERT INTO invoice_items (
          invoice_id, description, quantity, unit_price_cents, total_cents
        ) VALUES (?, ?, 1, ?, ?)
      `, [
        invoice.id, 
        `${subscription.plan_name} - Monthly Service`,
        subscription.monthly_price_cents,
        subscription.monthly_price_cents
      ]);

      // Process payment if payment method available
      if (subscription.payment_method_id) {
        const paymentResult = await runSingle(`
          INSERT INTO payment_transactions (
            company_id, client_id, invoice_id, subscription_id,
            amount_cents, payment_method_id, status, processed_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
        `, [
          companyId, subscription.client_id, invoice.id, subscription.id,
          subscription.monthly_price_cents, subscription.payment_method_id
        ]);

        // Mark invoice as paid
        await runSingle(`
          UPDATE invoices 
          SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [invoice.id]);
      }

      // Update next billing date
      await runSingle(`
        UPDATE client_subscriptions 
        SET next_billing_date = DATE(next_billing_date, '+1 month')
        WHERE id = ?
      `, [subscription.id]);

      results.push({
        subscription_id: subscription.id,
        client_name: subscription.client_name,
        amount: subscription.monthly_price_cents / 100,
        status: 'success'
      });

    } catch (error) {
      console.error(`Auto-billing failed for subscription ${subscription.id}:`, error);
      results.push({
        subscription_id: subscription.id,
        client_name: subscription.client_name,
        status: 'failed',
        error: error.message
      });
    }
  }

  res.json({
    message: 'Auto-billing process completed',
    processed: results.length,
    results
  });
}));

// Payment analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { period = '30' } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));
  const startDateStr = startDate.toISOString().split('T')[0];

  // Payment summary
  const paymentSummary = await runQuery(`
    SELECT 
      COUNT(*) as total_transactions,
      SUM(CASE WHEN status = 'completed' THEN amount_cents ELSE 0 END) as total_revenue_cents,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
      AVG(CASE WHEN status = 'completed' THEN amount_cents END) as avg_payment_cents
    FROM payment_transactions
    WHERE company_id = ? AND DATE(created_at) >= ?
  `, [companyId, startDateStr]);

  // Payment methods breakdown
  const methodBreakdown = await runQuery(`
    SELECT 
      pm.type,
      COUNT(pt.id) as transaction_count,
      SUM(pt.amount_cents) as total_amount_cents
    FROM payment_transactions pt
    JOIN payment_methods pm ON pt.payment_method_id = pm.id
    WHERE pt.company_id = ? AND DATE(pt.created_at) >= ? AND pt.status = 'completed'
    GROUP BY pm.type
  `, [companyId, startDateStr]);

  // Outstanding invoices
  const outstandingInvoices = await runQuery(`
    SELECT 
      COUNT(*) as count,
      SUM(total_cents) as total_amount_cents
    FROM invoices
    WHERE company_id = ? AND status IN ('sent', 'overdue')
  `, [companyId]);

  res.json({
    summary: paymentSummary[0] || {},
    payment_methods: methodBreakdown,
    outstanding: outstandingInvoices[0] || {},
    period_days: period
  });
}));

module.exports = router;