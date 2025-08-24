const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../../data/sprinkler_repair.db');

// Create connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('📊 Connected to SQLite database');
  }
});

// Initialize database with tables
const initDatabase = () => new Promise((resolve) => {
  db.serialize(() => {
    // Companies table
    db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          plan TEXT NOT NULL DEFAULT 'starter',
          email TEXT,
          phone TEXT,
          website TEXT,
          logo_url TEXT,
          stripe_customer_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'tech',
          email_verified BOOLEAN DEFAULT 0,
          email_verification_token TEXT,
          email_verification_expires DATETIME,
          password_reset_token TEXT,
          password_reset_expires DATETIME,
          last_login DATETIME,
          login_attempts INTEGER DEFAULT 0,
          locked_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id)
        )
      `);

    // Refresh tokens table for secure token rotation
    db.run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          revoked_at DATETIME,
          replaced_by_token TEXT,
          created_by_ip TEXT,
          revoked_by_ip TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

    // User sessions table for concurrent login handling
    db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_token TEXT NOT NULL,
          device_info TEXT,
          ip_address TEXT,
          user_agent TEXT,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

    // Clients table
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          type TEXT DEFAULT 'residential',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id)
        )
      `);

    // Sites table
    db.run(`
        CREATE TABLE IF NOT EXISTS sites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          client_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          address TEXT,
          city TEXT,
          state TEXT,
          zip TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (client_id) REFERENCES clients (id)
        )
      `);

    // Inspections table
    db.run(`
        CREATE TABLE IF NOT EXISTS inspections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          site_id INTEGER NOT NULL,
          tech_id INTEGER NOT NULL,
          status TEXT DEFAULT 'draft',
          issues_count INTEGER DEFAULT 0,
          has_estimate BOOLEAN DEFAULT 0,
          pdf_ready BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (site_id) REFERENCES sites (id),
          FOREIGN KEY (tech_id) REFERENCES users (id)
        )
      `);

    // Estimates table
    db.run(`
        CREATE TABLE IF NOT EXISTS estimates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          site_id INTEGER NOT NULL,
          inspection_id INTEGER,
          status TEXT DEFAULT 'draft',
          total_cents INTEGER DEFAULT 0,
          sent_at DATETIME,
          viewed_at DATETIME,
          approved_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (site_id) REFERENCES sites (id),
          FOREIGN KEY (inspection_id) REFERENCES inspections (id)
        )
      `);

    // Work Orders table
    db.run(`
        CREATE TABLE IF NOT EXISTS work_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          site_id INTEGER NOT NULL,
          estimate_id INTEGER,
          tech_id INTEGER,
          status TEXT DEFAULT 'scheduled',
          checklist_progress INTEGER DEFAULT 0,
          before_photos_count INTEGER DEFAULT 0,
          after_photos_count INTEGER DEFAULT 0,
          scheduled_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (site_id) REFERENCES sites (id),
          FOREIGN KEY (estimate_id) REFERENCES estimates (id),
          FOREIGN KEY (tech_id) REFERENCES users (id)
        )
      `);

    // Service Plan Templates table
    db.run(`
        CREATE TABLE IF NOT EXISTS service_plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          billing_cycle TEXT DEFAULT 'monthly', -- monthly, quarterly, annual
          price_cents INTEGER NOT NULL,
          setup_fee_cents INTEGER DEFAULT 0,
          visit_frequency TEXT DEFAULT 'monthly', -- weekly, monthly, quarterly
          included_services TEXT, -- JSON array of included services
          max_sites INTEGER DEFAULT 1,
          commission_rate REAL DEFAULT 0.1, -- 10% commission for techs
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id)
        )
      `);

    // Client Subscriptions table
    db.run(`
        CREATE TABLE IF NOT EXISTS client_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          client_id INTEGER NOT NULL,
          service_plan_id INTEGER NOT NULL,
          status TEXT DEFAULT 'active', -- active, cancelled, paused, expired
          start_date DATE NOT NULL,
          next_billing_date DATE NOT NULL,
          last_billing_date DATE,
          sites_included TEXT, -- JSON array of site IDs
          sold_by_tech_id INTEGER, -- Tech who sold the plan
          monthly_price_cents INTEGER NOT NULL,
          setup_fee_paid BOOLEAN DEFAULT 0,
          auto_renew BOOLEAN DEFAULT 1,
          cancellation_date DATE,
          cancellation_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (service_plan_id) REFERENCES service_plans (id),
          FOREIGN KEY (sold_by_tech_id) REFERENCES users (id)
        )
      `);

    // Recurring Invoices table
    db.run(`
        CREATE TABLE IF NOT EXISTS recurring_invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          subscription_id INTEGER NOT NULL,
          invoice_number TEXT NOT NULL,
          status TEXT DEFAULT 'pending', -- pending, paid, failed, cancelled
          amount_cents INTEGER NOT NULL,
          billing_period_start DATE NOT NULL,
          billing_period_end DATE NOT NULL,
          due_date DATE NOT NULL,
          paid_date DATE,
          payment_method TEXT,
          payment_reference TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (subscription_id) REFERENCES client_subscriptions (id)
        )
      `);

    // Commission Tracking table
    db.run(`
        CREATE TABLE IF NOT EXISTS commission_tracking (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          tech_id INTEGER NOT NULL,
          subscription_id INTEGER NOT NULL,
          commission_type TEXT NOT NULL, -- 'sale', 'recurring', 'renewal'
          commission_rate REAL NOT NULL,
          base_amount_cents INTEGER NOT NULL,
          commission_amount_cents INTEGER NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          status TEXT DEFAULT 'pending', -- pending, paid, cancelled
          paid_date DATE,
          invoice_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (tech_id) REFERENCES users (id),
          FOREIGN KEY (subscription_id) REFERENCES client_subscriptions (id),
          FOREIGN KEY (invoice_id) REFERENCES recurring_invoices (id)
        )
      `);

    // Service Plan Visits table (scheduled maintenance visits)
    db.run(`
        CREATE TABLE IF NOT EXISTS service_visits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          subscription_id INTEGER NOT NULL,
          site_id INTEGER NOT NULL,
          scheduled_date DATETIME NOT NULL,
          assigned_tech_id INTEGER,
          status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, rescheduled
          visit_type TEXT DEFAULT 'maintenance', -- maintenance, inspection, repair
          completed_date DATETIME,
          completion_notes TEXT,
          issues_found INTEGER DEFAULT 0,
          additional_work_needed BOOLEAN DEFAULT 0,
          additional_work_estimate_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies (id),
          FOREIGN KEY (subscription_id) REFERENCES client_subscriptions (id),
          FOREIGN KEY (site_id) REFERENCES sites (id),
          FOREIGN KEY (assigned_tech_id) REFERENCES users (id),
          FOREIGN KEY (additional_work_estimate_id) REFERENCES estimates (id)
        )
      `);

    console.log('✅ Database tables initialized (including service plans)');
    resolve();
  });
});

// Helper function to run queries with promises
const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
    } else {
      resolve(rows);
    }
  });
});

// Helper function for single row queries
const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
    } else {
      resolve(row);
    }
  });
});

// Helper function for insert/update/delete
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) {
      reject(err);
    } else {
      resolve({ id: this.lastID, changes: this.changes });
    }
  });
});

module.exports = {
  db,
  initDatabase,
  query,
  get,
  run,
  all: query, // alias for query since query already returns all rows
};
