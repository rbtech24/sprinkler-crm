const express = require('express');
const {
  body, param, query, validationResult,
} = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const paymentService = require('../services/paymentService');
const db = require('../database/sqlite');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Create payment intent for an estimate
 * POST /api/payments/intents
 */
router.post('/intents', [
  body('estimate_id').isInt().withMessage('Valid estimate ID required'),
  body('return_url').optional().isURL().withMessage('Valid return URL required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { estimate_id, return_url } = req.body;
    const companyId = req.user.company_id;

    // Get estimate details
    const estimate = await db.get(`
      SELECT e.*, c.id as client_id, c.name as client_name, c.email as client_email
      FROM estimates e
      JOIN sites s ON e.site_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE e.id = ? AND e.company_id = ?
    `, [estimate_id, companyId]);

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status === 'paid') {
      return res.status(400).json({ error: 'Estimate is already paid' });
    }

    const result = await paymentService.createPaymentIntent(estimate, { return_url });

    if (result.success) {
      res.json({
        success: true,
        payment_intent: result.paymentIntent,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * Process a one-time payment
 * POST /api/payments/process
 */
router.post('/process', [
  body('payment_method_id').notEmpty().withMessage('Payment method ID required'),
  body('amount_cents').isInt({ min: 50 }).withMessage('Valid amount required (minimum $0.50)'),
  body('client_id').isInt().withMessage('Valid client ID required'),
  body('estimate_id').optional().isInt(),
  body('description').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      payment_method_id, amount_cents, client_id, estimate_id, description,
    } = req.body;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [client_id, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = await paymentService.processPayment(payment_method_id, {
      amount_cents,
      client_id,
      estimate_id,
      description,
    });

    if (result.success) {
      res.json({
        success: true,
        payment: result.paymentIntent,
        payment_id: result.paymentId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

/**
 * Create subscription for recurring payments
 * POST /api/payments/subscriptions
 */
router.post('/subscriptions', [
  body('client_id').isInt().withMessage('Valid client ID required'),
  body('payment_method_id').notEmpty().withMessage('Payment method ID required'),
  body('price_id').notEmpty().withMessage('Stripe price ID required'),
  body('billing_cycle').optional().isIn(['monthly', 'quarterly', 'yearly']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subscriptionData = req.body;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [subscriptionData.client_id, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const result = await paymentService.createSubscription(subscriptionData);

    if (result.success) {
      res.status(201).json({
        success: true,
        subscription: result.subscription,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Get payment methods for a client
 * GET /api/payments/methods/:clientId
 */
router.get('/methods/:clientId', [
  param('clientId').isInt().withMessage('Valid client ID required'),
], async (req, res) => {
  try {
    const { clientId } = req.params;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [clientId, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const paymentMethods = await paymentService.getPaymentMethods(clientId);
    res.json({ payment_methods: paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

/**
 * Get payment history for a client
 * GET /api/payments/history/:clientId
 */
router.get('/history/:clientId', [
  param('clientId').isInt().withMessage('Valid client ID required'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const companyId = req.user.company_id;

    // Verify client belongs to company
    const client = await db.get(`
      SELECT * FROM clients WHERE id = ? AND company_id = ?
    `, [clientId, companyId]);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const history = await paymentService.getPaymentHistory(clientId, { page, limit });
    res.json(history);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

/**
 * Process refund
 * POST /api/payments/refunds
 */
router.post('/refunds', [
  body('payment_intent_id').notEmpty().withMessage('Payment intent ID required'),
  body('amount_cents').optional().isInt({ min: 1 }).withMessage('Valid refund amount required'),
  body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payment_intent_id, amount_cents, reason = 'requested_by_customer' } = req.body;
    const companyId = req.user.company_id;

    // Verify payment belongs to company
    const payment = await db.get(`
      SELECT p.*, c.company_id
      FROM payment_intents p
      JOIN clients c ON p.client_id = c.id
      WHERE p.stripe_payment_intent_id = ? AND c.company_id = ?
    `, [payment_intent_id, companyId]);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const result = await paymentService.processRefund(payment_intent_id, amount_cents, reason);

    if (result.success) {
      res.json({
        success: true,
        refund: result.refund,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * Get company payment settings
 * GET /api/payments/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const settings = await db.get(`
      SELECT * FROM company_payment_settings WHERE company_id = ?
    `, [companyId]);

    if (!settings) {
      // Return default settings
      return res.json({
        accept_credit_cards: true,
        accept_ach: false,
        accept_cash: true,
        accept_check: true,
        allow_partial_payments: true,
        allow_payment_plans: true,
        default_payment_terms: 30,
        currency: 'USD',
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ error: 'Failed to get payment settings' });
  }
});

/**
 * Update company payment settings
 * PUT /api/payments/settings
 */
router.put('/settings', [
  body('accept_credit_cards').optional().isBoolean(),
  body('accept_ach').optional().isBoolean(),
  body('accept_cash').optional().isBoolean(),
  body('accept_check').optional().isBoolean(),
  body('allow_partial_payments').optional().isBoolean(),
  body('allow_payment_plans').optional().isBoolean(),
  body('default_payment_terms').optional().isInt({ min: 1, max: 365 }),
  body('late_fee_percentage').optional().isFloat({ min: 0, max: 100 }),
  body('tax_rate_percentage').optional().isFloat({ min: 0, max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const updates = req.body;

    const fields = [];
    const values = [];

    const allowedFields = [
      'accept_credit_cards', 'accept_ach', 'accept_cash', 'accept_check',
      'allow_partial_payments', 'allow_payment_plans', 'default_payment_terms',
      'late_fee_percentage', 'late_fee_grace_period_days', 'tax_rate_percentage',
      'auto_send_payment_reminders',
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(companyId);

    await db.run(`
      INSERT OR REPLACE INTO company_payment_settings (
        company_id, ${fields.map((f) => f.split(' = ')[0]).join(', ')}, updated_at
      ) VALUES (
        ?, ${fields.map(() => '?').join(', ')}, CURRENT_TIMESTAMP
      )
    `, [companyId, ...values.slice(0, -1)]);

    // Get updated settings
    const updatedSettings = await db.get(`
      SELECT * FROM company_payment_settings WHERE company_id = ?
    `, [companyId]);

    res.json(updatedSettings);
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({ error: 'Failed to update payment settings' });
  }
});

/**
 * Stripe webhook endpoint
 * POST /api/payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.warn('Stripe webhook secret not configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Log webhook event
    await db.run(`
      INSERT INTO webhook_events (
        stripe_event_id, event_type, event_data, created_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [event.id, event.type, JSON.stringify(event)]);

    // Process webhook
    const processed = await paymentService.handleWebhook(event);

    if (processed) {
      await db.run(`
        UPDATE webhook_events 
        SET processed = 1, last_attempt_at = CURRENT_TIMESTAMP
        WHERE stripe_event_id = ?
      `, [event.id]);
    } else {
      await db.run(`
        UPDATE webhook_events 
        SET processing_attempts = processing_attempts + 1, 
            last_attempt_at = CURRENT_TIMESTAMP,
            error_message = 'Processing failed'
        WHERE stripe_event_id = ?
      `, [event.id]);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get payment analytics for company
 * GET /api/payments/analytics
 */
router.get('/analytics', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const companyId = req.user.company_id;

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    // Payment volume and success rate
    const paymentStats = await db.get(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as total_revenue_cents,
        AVG(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END) as avg_payment_cents
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    // Payment methods breakdown
    const paymentMethods = await db.query(`
      SELECT 
        pm.type,
        pm.card_brand,
        COUNT(*) as usage_count
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      JOIN payment_methods pm ON p.payment_method_id = pm.stripe_payment_method_id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
        AND p.status = 'succeeded'
      GROUP BY pm.type, pm.card_brand
      ORDER BY usage_count DESC
    `, [companyId, startDate, endDate]);

    // Monthly revenue trend
    const monthlyRevenue = await db.query(`
      SELECT 
        strftime('%Y-%m', p.created_at) as month,
        SUM(p.amount_cents) as revenue_cents,
        COUNT(*) as payment_count
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      WHERE c.company_id = ?
        AND p.status = 'succeeded'
        AND p.created_at BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', p.created_at)
      ORDER BY month
    `, [companyId, startDate, endDate]);

    res.json({
      summary: {
        total_payments: paymentStats.total_payments || 0,
        successful_payments: paymentStats.successful_payments || 0,
        success_rate: paymentStats.total_payments > 0
          ? ((paymentStats.successful_payments / paymentStats.total_payments) * 100).toFixed(1)
          : 0,
        total_revenue_cents: paymentStats.total_revenue_cents || 0,
        average_payment_cents: Math.round(paymentStats.avg_payment_cents || 0),
      },
      payment_methods: paymentMethods,
      monthly_revenue: monthlyRevenue,
      period: { start_date: startDate, end_date: endDate },
    });
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({ error: 'Failed to get payment analytics' });
  }
});

// Clean up temporary migration file
require('fs').unlink(require('path').join(__dirname, '../../payment-migration.js'), () => {});

module.exports = router;
