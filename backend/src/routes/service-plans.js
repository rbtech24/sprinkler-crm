const express = require('express');
const { query, get, run } = require('../database/sqlite');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get active service plans for technicians to sell
router.get('/active', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  
  const plans = await query(`
    SELECT 
      id,
      name,
      description,
      price_cents,
      billing_cycle as billing_frequency,
      service_inclusions as features,
      is_popular,
      commission_rate
    FROM service_plans 
    WHERE company_id = ? AND is_active = 1
    ORDER BY is_popular DESC, price_cents ASC
  `, [companyId]);

  // Parse JSON features for each plan
  const formattedPlans = plans.map(plan => ({
    ...plan,
    features: JSON.parse(plan.features || '[]'),
    is_popular: Boolean(plan.is_popular)
  }));

  res.json({
    success: true,
    data: formattedPlans
  });
}));

// Get all service plans for a company
router.get('/', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  
  const plans = await query(`
    SELECT 
      sp.*,
      COUNT(cs.id) as active_subscriptions,
      SUM(CASE WHEN cs.status = 'active' THEN cs.monthly_price_cents ELSE 0 END) as monthly_revenue
    FROM service_plans sp
    LEFT JOIN client_subscriptions cs ON sp.id = cs.service_plan_id AND cs.status = 'active'
    WHERE sp.company_id = ? AND sp.is_active = 1
    GROUP BY sp.id
    ORDER BY sp.name
  `, [companyId]);

  res.json(plans);
}));

// Create new service plan
router.post('/', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    name,
    description,
    billing_cycle,
    price_cents,
    setup_fee_cents,
    visit_frequency,
    service_inclusions,
    max_sites,
    commission_rate
  } = req.body;

  const result = await run(`
    INSERT INTO service_plans (
      company_id, name, description, billing_cycle, price_cents, setup_fee_cents,
      visit_frequency, service_inclusions, max_sites, commission_rate, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    companyId, name, description, billing_cycle, price_cents, setup_fee_cents || 0,
    visit_frequency, JSON.stringify(service_inclusions || []), max_sites || 1, commission_rate || 0.1
  ]);

  const newPlan = await get('SELECT * FROM service_plans WHERE id = ?', [result.id]);
  res.status(201).json(newPlan);
}));

// Update service plan
router.put('/:id', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const planId = req.params.id;
  const updateData = req.body;

  // Convert service_inclusions to JSON if provided
  if (updateData.service_inclusions) {
    updateData.service_inclusions = JSON.stringify(updateData.service_inclusions);
  }

  const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updateData);
  values.push(datetime('now'), companyId, planId);

  await run(`
    UPDATE service_plans 
    SET ${fields}, updated_at = ?
    WHERE company_id = ? AND id = ?
  `, values);

  const updatedPlan = await get('SELECT * FROM service_plans WHERE id = ? AND company_id = ?', [planId, companyId]);
  res.json(updatedPlan);
}));

// Get service plan subscriptions
router.get('/:id/subscriptions', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const planId = req.params.id;

  const subscriptions = await query(`
    SELECT 
      cs.*,
      c.name as client_name,
      c.email as client_email,
      u.name as sold_by_tech_name,
      COUNT(sv.id) as scheduled_visits,
      COUNT(CASE WHEN sv.status = 'completed' THEN 1 END) as completed_visits
    FROM client_subscriptions cs
    JOIN clients c ON cs.client_id = c.id
    LEFT JOIN users u ON cs.sold_by_tech_id = u.id
    LEFT JOIN service_visits sv ON cs.id = sv.subscription_id
    WHERE cs.company_id = ? AND cs.service_plan_id = ?
    GROUP BY cs.id
    ORDER BY cs.created_at DESC
  `, [companyId, planId]);

  res.json(subscriptions);
}));

// Client subscription management
router.get('/subscriptions', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { status, tech_id } = req.query;

  let whereClause = 'WHERE cs.company_id = ?';
  const params = [companyId];

  if (status) {
    whereClause += ' AND cs.status = ?';
    params.push(status);
  }

  if (tech_id) {
    whereClause += ' AND cs.sold_by_tech_id = ?';
    params.push(tech_id);
  }

  const subscriptions = await query(`
    SELECT 
      cs.*,
      c.name as client_name,
      c.email as client_email,
      sp.name as plan_name,
      sp.billing_cycle,
      u.name as sold_by_tech_name,
      COUNT(sv.id) as total_visits,
      COUNT(CASE WHEN sv.status = 'completed' THEN 1 END) as completed_visits,
      MAX(sv.scheduled_date) as next_visit_date
    FROM client_subscriptions cs
    JOIN clients c ON cs.client_id = c.id
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    LEFT JOIN users u ON cs.sold_by_tech_id = u.id
    LEFT JOIN service_visits sv ON cs.id = sv.subscription_id AND sv.status = 'scheduled'
    ${whereClause}
    GROUP BY cs.id
    ORDER BY cs.created_at DESC
  `, params);

  res.json(subscriptions);
}));

// Create new subscription
router.post('/subscriptions', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    client_id,
    service_plan_id,
    start_date,
    sites_included,
    sold_by_tech_id
  } = req.body;

  // Get plan details for pricing
  const plan = await get('SELECT * FROM service_plans WHERE id = ? AND company_id = ?', [service_plan_id, companyId]);
  if (!plan) {
    return res.status(404).json({ error: 'Service plan not found' });
  }

  // Calculate next billing date based on billing cycle
  let nextBillingDate;
  const startDateObj = new Date(start_date);
  
  switch (plan.billing_cycle) {
    case 'monthly':
      nextBillingDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, startDateObj.getDate());
      break;
    case 'quarterly':
      nextBillingDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 3, startDateObj.getDate());
      break;
    case 'annual':
      nextBillingDate = new Date(startDateObj.getFullYear() + 1, startDateObj.getMonth(), startDateObj.getDate());
      break;
    default:
      nextBillingDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, startDateObj.getDate());
  }

  const subscription = await run(`
    INSERT INTO client_subscriptions (
      company_id, client_id, service_plan_id, start_date, next_billing_date,
      sites_included, sold_by_tech_id, monthly_price_cents, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    companyId, client_id, service_plan_id, start_date, nextBillingDate.toISOString().split('T')[0],
    JSON.stringify(sites_included || []), sold_by_tech_id, plan.price_cents
  ]);

  // Create initial commission record for the selling tech
  if (sold_by_tech_id) {
    const commissionAmount = Math.round(plan.price_cents * plan.commission_rate);
    await run(`
      INSERT INTO commission_tracking (
        company_id, tech_id, subscription_id, commission_type, commission_rate,
        base_amount_cents, commission_amount_cents, period_start, period_end,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      companyId, sold_by_tech_id, subscription.id, 'sale', plan.commission_rate,
      plan.price_cents, commissionAmount, start_date, nextBillingDate.toISOString().split('T')[0]
    ]);
  }

  const newSubscription = await get('SELECT * FROM client_subscriptions WHERE id = ?', [subscription.id]);
  res.status(201).json(newSubscription);
}));

// Get commission tracking for techs
router.get('/commissions', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { tech_id, status, start_date, end_date } = req.query;

  let whereClause = 'WHERE ct.company_id = ?';
  const params = [companyId];

  if (tech_id) {
    whereClause += ' AND ct.tech_id = ?';
    params.push(tech_id);
  }

  if (status) {
    whereClause += ' AND ct.status = ?';
    params.push(status);
  }

  if (start_date) {
    whereClause += ' AND ct.period_start >= ?';
    params.push(start_date);
  }

  if (end_date) {
    whereClause += ' AND ct.period_end <= ?';
    params.push(end_date);
  }

  const commissions = await query(`
    SELECT 
      ct.*,
      u.name as tech_name,
      cs.client_id,
      c.name as client_name,
      sp.name as plan_name
    FROM commission_tracking ct
    JOIN users u ON ct.tech_id = u.id
    JOIN client_subscriptions cs ON ct.subscription_id = cs.id
    JOIN clients c ON cs.client_id = c.id
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    ${whereClause}
    ORDER BY ct.created_at DESC
  `, params);

  res.json(commissions);
}));

// Sell service plan to customer (for technicians)
router.post('/sell', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const techId = req.user.id;
  const {
    plan_id,
    customer_info,
    sold_by_technician_id
  } = req.body;

  // Validate input
  if (!plan_id || !customer_info) {
    return res.status(400).json({ 
      success: false,
      error: 'Plan ID and customer information are required' 
    });
  }

  // Get the service plan
  const plan = await get('SELECT * FROM service_plans WHERE id = ? AND company_id = ? AND is_active = 1', [plan_id, companyId]);
  if (!plan) {
    return res.status(404).json({ 
      success: false,
      error: 'Service plan not found' 
    });
  }

  // Create or find the client
  let client = await get('SELECT * FROM clients WHERE email = ? AND company_id = ?', [customer_info.email, companyId]);
  
  if (!client) {
    // Create new client
    const clientResult = await run(`
      INSERT INTO clients (
        company_id, 
        name, 
        email, 
        phone,
        billing_address_street,
        created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      companyId, 
      customer_info.name, 
      customer_info.email, 
      customer_info.phone,
      customer_info.property_address
    ]);
    
    client = { id: clientResult.lastID };
  }

  // Calculate next billing date
  const startDate = new Date();
  let nextBillingDate;
  
  switch (plan.billing_cycle) {
    case 'monthly':
      nextBillingDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
      break;
    case 'quarterly':
      nextBillingDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate());
      break;
    case 'annual':
      nextBillingDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
      break;
    default:
      nextBillingDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
  }

  // Create subscription
  const subscriptionResult = await run(`
    INSERT INTO client_subscriptions (
      company_id,
      client_id,
      service_plan_id,
      start_date,
      next_billing_date,
      sold_by_tech_id,
      monthly_price_cents,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
  `, [
    companyId,
    client.id,
    plan_id,
    startDate.toISOString().split('T')[0],
    nextBillingDate.toISOString().split('T')[0],
    sold_by_technician_id || techId,
    plan.price_cents
  ]);

  // Create commission record for the technician
  const commissionAmount = Math.round(plan.price_cents * (plan.commission_rate || 0.1));
  await run(`
    INSERT INTO commission_tracking (
      company_id,
      tech_id,
      subscription_id,
      commission_type,
      commission_rate,
      base_amount_cents,
      commission_amount_cents,
      period_start,
      period_end,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `, [
    companyId,
    sold_by_technician_id || techId,
    subscriptionResult.lastID,
    plan.commission_rate || 0.1,
    plan.price_cents,
    commissionAmount,
    startDate.toISOString().split('T')[0],
    nextBillingDate.toISOString().split('T')[0]
  ]);

  res.json({
    success: true,
    message: 'Service plan sold successfully!',
    data: {
      subscription_id: subscriptionResult.lastID,
      client_id: client.id,
      plan_name: plan.name,
      commission_amount: commissionAmount / 100 // Convert to dollars for display
    }
  });
}));

// Service plan analytics
router.get('/analytics', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  // Get subscription stats
  const subscriptionStats = await get(`
    SELECT 
      COUNT(*) as total_subscriptions,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
      SUM(CASE WHEN status = 'active' THEN monthly_price_cents ELSE 0 END) as monthly_recurring_revenue,
      AVG(CASE WHEN status = 'active' THEN monthly_price_cents ELSE NULL END) as avg_subscription_value
    FROM client_subscriptions 
    WHERE company_id = ?
  `, [companyId]);

  // Get commission stats
  const commissionStats = await get(`
    SELECT 
      COUNT(*) as total_commissions,
      SUM(commission_amount_cents) as total_commission_amount,
      SUM(CASE WHEN status = 'paid' THEN commission_amount_cents ELSE 0 END) as paid_commissions,
      COUNT(DISTINCT tech_id) as techs_earning_commissions
    FROM commission_tracking 
    WHERE company_id = ?
  `, [companyId]);

  // Get top performing plans
  const topPlans = await query(`
    SELECT 
      sp.name,
      sp.price_cents,
      COUNT(cs.id) as subscription_count,
      SUM(CASE WHEN cs.status = 'active' THEN cs.monthly_price_cents ELSE 0 END) as total_monthly_revenue
    FROM service_plans sp
    LEFT JOIN client_subscriptions cs ON sp.id = cs.service_plan_id
    WHERE sp.company_id = ? AND sp.is_active = 1
    GROUP BY sp.id
    ORDER BY subscription_count DESC, total_monthly_revenue DESC
    LIMIT 5
  `, [companyId]);

  res.json({
    subscription_stats: subscriptionStats,
    commission_stats: commissionStats,
    top_plans: topPlans
  });
}));

module.exports = router;