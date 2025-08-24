const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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

// Initialize client portal tables
const initClientPortalTables = async () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS client_portal_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      is_primary BOOLEAN DEFAULT 0,
      email_verified BOOLEAN DEFAULT 0,
      email_verification_token TEXT,
      password_reset_token TEXT,
      password_reset_expires DATETIME,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS client_portal_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES client_portal_users(id)
    )`
  ];

  for (const table of tables) {
    await runSingle(table);
  }
};

// Initialize tables on startup
initClientPortalTables().catch(console.error);

// Client authentication middleware
const authenticateClient = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // Verify client portal user exists and session is valid
    const user = await runQuery(`
      SELECT 
        cpu.*,
        c.company_id,
        c.name as client_name,
        c.email as client_email
      FROM client_portal_users cpu
      JOIN clients c ON cpu.client_id = c.id
      WHERE cpu.id = ?
    `, [decoded.userId]);

    if (user.length === 0) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    req.clientUser = user[0];
    next();
  } catch (error) {
    console.error('Client authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication' });
  }
};

// Client login
router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find client portal user
  const users = await runQuery(`
    SELECT 
      cpu.*,
      c.company_id,
      c.name as client_name
    FROM client_portal_users cpu
    JOIN clients c ON cpu.client_id = c.id
    WHERE cpu.email = ?
  `, [email]);

  if (users.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = users[0];

  // Check password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, clientId: user.client_id, companyId: user.company_id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '24h' }
  );

  // Update last login
  await runSingle(`
    UPDATE client_portal_users 
    SET last_login = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [user.id]);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      client_name: user.client_name,
      is_primary: user.is_primary
    }
  });
}));

// Client registration (invite-based)
router.post('/auth/register', asyncHandler(async (req, res) => {
  const { email, password, name, phone, invitation_token } = req.body;

  if (!email || !password || !name || !invitation_token) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // TODO: Verify invitation token (for now, simulate success)
  const clientId = 1; // This would come from the invitation

  // Check if email already exists
  const existingUser = await runQuery(`
    SELECT id FROM client_portal_users WHERE email = ?
  `, [email]);

  if (existingUser.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create client portal user
  const result = await runSingle(`
    INSERT INTO client_portal_users (
      client_id, email, password_hash, name, phone, is_primary
    ) VALUES (?, ?, ?, ?, ?, 1)
  `, [clientId, email, passwordHash, name, phone]);

  res.json({
    message: 'Registration successful',
    user_id: result.id
  });
}));

// Get client dashboard data
router.get('/dashboard', authenticateClient, asyncHandler(async (req, res) => {
  const clientId = req.clientUser.client_id;
  const companyId = req.clientUser.company_id;

  // Get client basic info
  const clientInfo = await runQuery(`
    SELECT 
      c.*,
      comp.name as company_name
    FROM clients c
    JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = ?
  `, [clientId]);

  // Get active subscriptions
  const subscriptions = await runQuery(`
    SELECT 
      cs.*,
      sp.name as plan_name,
      sp.description as plan_description,
      sp.billing_cycle,
      sp.included_services
    FROM client_subscriptions cs
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    WHERE cs.client_id = ? AND cs.status = 'active'
  `, [clientId]);

  // Get recent inspections
  const recentInspections = await runQuery(`
    SELECT 
      i.*,
      u.name as technician_name,
      s.address as site_address
    FROM inspections i
    JOIN users u ON i.tech_id = u.id
    LEFT JOIN sites s ON i.site_id = s.id
    WHERE i.client_id = ?
    ORDER BY i.created_at DESC
    LIMIT 5
  `, [clientId]);

  // Get recent invoices
  const recentInvoices = await runQuery(`
    SELECT 
      i.*,
      ri.billing_period_start,
      ri.billing_period_end
    FROM invoices i
    LEFT JOIN recurring_invoices ri ON i.id = ri.id
    WHERE i.client_id = ?
    ORDER BY i.created_at DESC
    LIMIT 5
  `, [clientId]);

  // Get upcoming appointments
  const upcomingAppointments = await runQuery(`
    SELECT 
      s.*,
      u.name as technician_name,
      u.phone as technician_phone
    FROM schedule s
    LEFT JOIN users u ON s.technician_id = u.id
    WHERE s.client_id = ? 
      AND s.scheduled_date >= DATE('now')
      AND s.status NOT IN ('cancelled', 'completed')
    ORDER BY s.scheduled_date, s.scheduled_time
    LIMIT 5
  `, [clientId]);

  res.json({
    client: clientInfo[0] || {},
    subscriptions,
    recent_inspections: recentInspections,
    recent_invoices: recentInvoices,
    upcoming_appointments: upcomingAppointments
  });
}));

// Get client subscriptions
router.get('/subscriptions', authenticateClient, asyncHandler(async (req, res) => {
  const clientId = req.clientUser.client_id;

  const subscriptions = await runQuery(`
    SELECT 
      cs.*,
      sp.name as plan_name,
      sp.description as plan_description,
      sp.billing_cycle,
      sp.included_services,
      sp.visit_frequency,
      COUNT(ri.id) as total_invoices,
      SUM(CASE WHEN ri.status = 'paid' THEN ri.amount_cents ELSE 0 END) as total_paid_cents
    FROM client_subscriptions cs
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    LEFT JOIN recurring_invoices ri ON cs.id = ri.subscription_id
    WHERE cs.client_id = ?
    GROUP BY cs.id
    ORDER BY cs.created_at DESC
  `, [clientId]);

  // Parse included services JSON
  const formattedSubscriptions = subscriptions.map(sub => ({
    ...sub,
    included_services: sub.included_services ? JSON.parse(sub.included_services) : []
  }));

  res.json({ subscriptions: formattedSubscriptions });
}));

// Get subscription details
router.get('/subscriptions/:id', authenticateClient, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clientId = req.clientUser.client_id;

  const subscription = await runQuery(`
    SELECT 
      cs.*,
      sp.name as plan_name,
      sp.description as plan_description,
      sp.billing_cycle,
      sp.included_services,
      sp.visit_frequency
    FROM client_subscriptions cs
    JOIN service_plans sp ON cs.service_plan_id = sp.id
    WHERE cs.id = ? AND cs.client_id = ?
  `, [id, clientId]);

  if (subscription.length === 0) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  // Get subscription invoices
  const invoices = await runQuery(`
    SELECT * FROM recurring_invoices
    WHERE subscription_id = ?
    ORDER BY billing_period_start DESC
  `, [id]);

  // Get subscription sites
  const sites = await runQuery(`
    SELECT s.* FROM sites s
    WHERE s.client_id = ? AND s.id IN (
      SELECT json_each.value 
      FROM json_each(?)
    )
  `, [clientId, subscription[0].sites_included]);

  const subscriptionData = subscription[0];
  subscriptionData.included_services = subscriptionData.included_services ? 
    JSON.parse(subscriptionData.included_services) : [];
  subscriptionData.sites_included = subscriptionData.sites_included ? 
    JSON.parse(subscriptionData.sites_included) : [];

  res.json({
    subscription: subscriptionData,
    invoices,
    sites
  });
}));

// Get client service history
router.get('/service-history', authenticateClient, asyncHandler(async (req, res) => {
  const clientId = req.clientUser.client_id;
  const { limit = 20, offset = 0 } = req.query;

  // Get inspections
  const inspections = await runQuery(`
    SELECT 
      i.*,
      u.name as technician_name,
      s.address as site_address,
      'inspection' as service_type
    FROM inspections i
    JOIN users u ON i.tech_id = u.id
    LEFT JOIN sites s ON i.site_id = s.id
    WHERE i.client_id = ?
    ORDER BY i.created_at DESC
  `, [clientId]);

  // Get work orders
  const workOrders = await runQuery(`
    SELECT 
      wo.*,
      u.name as technician_name,
      s.address as site_address,
      'work_order' as service_type
    FROM work_orders wo
    LEFT JOIN users u ON wo.technician_id = u.id
    LEFT JOIN sites s ON wo.site_id = s.id
    WHERE wo.client_id = ?
    ORDER BY wo.created_at DESC
  `, [clientId]);

  // Combine and sort by date
  const allServices = [...inspections, ...workOrders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({ service_history: allServices });
}));

// Get client invoices
router.get('/invoices', authenticateClient, asyncHandler(async (req, res) => {
  const clientId = req.clientUser.client_id;
  const { status, limit = 20 } = req.query;

  let whereConditions = ['client_id = ?'];
  let params = [clientId];

  if (status) {
    whereConditions.push('status = ?');
    params.push(status);
  }

  const invoices = await runQuery(`
    SELECT 
      i.*,
      ri.billing_period_start,
      ri.billing_period_end,
      cs.service_plan_id,
      sp.name as service_plan_name
    FROM invoices i
    LEFT JOIN recurring_invoices ri ON i.id = ri.id
    LEFT JOIN client_subscriptions cs ON i.subscription_id = cs.id
    LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY i.created_at DESC
    LIMIT ?
  `, [...params, parseInt(limit)]);

  res.json({ invoices });
}));

// Get invoice details
router.get('/invoices/:id', authenticateClient, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clientId = req.clientUser.client_id;

  const invoice = await runQuery(`
    SELECT 
      i.*,
      ri.billing_period_start,
      ri.billing_period_end
    FROM invoices i
    LEFT JOIN recurring_invoices ri ON i.id = ri.id
    WHERE i.id = ? AND i.client_id = ?
  `, [id, clientId]);

  if (invoice.length === 0) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Get invoice items
  const items = await runQuery(`
    SELECT * FROM invoice_items
    WHERE invoice_id = ?
  `, [id]);

  res.json({
    invoice: invoice[0],
    items
  });
}));

// Update client profile
router.put('/profile', authenticateClient, asyncHandler(async (req, res) => {
  const userId = req.clientUser.id;
  const { name, phone } = req.body;

  await runSingle(`
    UPDATE client_portal_users
    SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [name, phone, userId]);

  res.json({ message: 'Profile updated successfully' });
}));

// Change password
router.put('/change-password', authenticateClient, asyncHandler(async (req, res) => {
  const userId = req.clientUser.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }

  // Verify current password
  const user = await runQuery(`
    SELECT password_hash FROM client_portal_users WHERE id = ?
  `, [userId]);

  const passwordMatch = await bcrypt.compare(current_password, user[0].password_hash);
  if (!passwordMatch) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(new_password, 10);

  // Update password
  await runSingle(`
    UPDATE client_portal_users
    SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newPasswordHash, userId]);

  res.json({ message: 'Password changed successfully' });
}));

// Request password reset
router.post('/auth/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Check if user exists
  const user = await runQuery(`
    SELECT id FROM client_portal_users WHERE email = ?
  `, [email]);

  if (user.length === 0) {
    // Don't reveal if email exists or not
    return res.json({ message: 'If the email exists, a reset link has been sent' });
  }

  // Generate reset token (in production, send email)
  const resetToken = Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await runSingle(`
    UPDATE client_portal_users
    SET password_reset_token = ?, password_reset_expires = ?
    WHERE email = ?
  `, [resetToken, expiresAt.toISOString(), email]);

  res.json({ 
    message: 'Password reset instructions sent to email',
    reset_token: resetToken // Remove in production
  });
}));

// Get available service plans
router.get('/service-plans', authenticateClient, asyncHandler(async (req, res) => {
  const companyId = req.clientUser.company_id;

  const servicePlans = await runQuery(`
    SELECT 
      sp.*,
      COUNT(cs.id) as subscriber_count
    FROM service_plans sp
    LEFT JOIN client_subscriptions cs ON sp.id = cs.service_plan_id AND cs.status = 'active'
    WHERE sp.company_id = ? AND sp.is_active = 1
    GROUP BY sp.id
    ORDER BY sp.price_cents
  `, [companyId]);

  const formattedPlans = servicePlans.map(plan => ({
    ...plan,
    included_services: plan.included_services ? JSON.parse(plan.included_services) : []
  }));

  res.json({ service_plans: formattedPlans });
}));

module.exports = router;