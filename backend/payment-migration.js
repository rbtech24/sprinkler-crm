const { db } = require('./src/database/sqlite');

async function applyPaymentMigration() {
  console.log('🔄 Applying Payment Processing migration...');
  
  const tables = [
    // Payment Intents (for one-time payments)
    `CREATE TABLE IF NOT EXISTS payment_intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      estimate_id INTEGER,
      amount_cents INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL, -- requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded
      currency VARCHAR(3) DEFAULT 'usd',
      description TEXT,
      metadata TEXT, -- JSON object
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
    )`,

    // Completed Payments
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_payment_intent_id VARCHAR(255) NOT NULL,
      client_id INTEGER NOT NULL,
      estimate_id INTEGER,
      work_order_id INTEGER,
      payment_method_id VARCHAR(255),
      amount_cents INTEGER NOT NULL,
      fee_cents INTEGER DEFAULT 0, -- Stripe fees
      net_amount_cents INTEGER, -- Amount after fees
      currency VARCHAR(3) DEFAULT 'usd',
      status VARCHAR(50) NOT NULL, -- succeeded, failed, canceled, processing, requires_action
      description TEXT,
      receipt_email VARCHAR(255),
      receipt_url TEXT,
      failure_code VARCHAR(100),
      failure_message TEXT,
      metadata TEXT, -- JSON object
      processed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
    )`,

    // Subscriptions (for recurring services)
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
      stripe_customer_id VARCHAR(255) NOT NULL,
      client_id INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL, -- incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid
      billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, yearly
      amount_cents INTEGER NOT NULL,
      currency VARCHAR(3) DEFAULT 'usd',
      trial_end TIMESTAMP,
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN DEFAULT 0,
      canceled_at TIMESTAMP,
      ended_at TIMESTAMP,
      metadata TEXT, -- JSON object
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Subscription Items (services included in subscription)
    `CREATE TABLE IF NOT EXISTS subscription_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id INTEGER NOT NULL,
      stripe_subscription_item_id VARCHAR(255) UNIQUE NOT NULL,
      stripe_price_id VARCHAR(255) NOT NULL,
      service_type VARCHAR(100), -- inspection, maintenance, monitoring
      quantity INTEGER DEFAULT 1,
      unit_amount_cents INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
    )`,

    // Payment Methods (stored cards, bank accounts)
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
      client_id INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL, -- card, us_bank_account, sepa_debit
      is_default BOOLEAN DEFAULT 0,
      card_brand VARCHAR(20), -- visa, mastercard, amex, discover
      card_last4 VARCHAR(4),
      card_exp_month INTEGER,
      card_exp_year INTEGER,
      billing_details TEXT, -- JSON object with address, email, name, phone
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Invoices
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_invoice_id VARCHAR(255) UNIQUE,
      client_id INTEGER NOT NULL,
      subscription_id INTEGER,
      estimate_id INTEGER,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
      amount_due_cents INTEGER DEFAULT 0,
      amount_paid_cents INTEGER DEFAULT 0,
      amount_remaining_cents INTEGER DEFAULT 0,
      subtotal_cents INTEGER DEFAULT 0,
      tax_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      currency VARCHAR(3) DEFAULT 'usd',
      description TEXT,
      due_date DATE,
      paid_at TIMESTAMP,
      voided_at TIMESTAMP,
      attempted BOOLEAN DEFAULT 0,
      attempt_count INTEGER DEFAULT 0,
      next_payment_attempt TIMESTAMP,
      receipt_number VARCHAR(100),
      hosted_invoice_url TEXT,
      invoice_pdf_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
    )`,

    // Invoice Line Items
    `CREATE TABLE IF NOT EXISTS invoice_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      stripe_line_item_id VARCHAR(255),
      description TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_amount_cents INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      metadata TEXT, -- JSON object
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )`,

    // Refunds
    `CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_refund_id VARCHAR(255) UNIQUE NOT NULL,
      stripe_payment_intent_id VARCHAR(255) NOT NULL,
      payment_id INTEGER,
      amount_cents INTEGER NOT NULL,
      currency VARCHAR(3) DEFAULT 'usd',
      status VARCHAR(50) NOT NULL, -- pending, succeeded, failed, canceled
      reason VARCHAR(50), -- duplicate, fraudulent, requested_by_customer
      description TEXT,
      receipt_number VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
    )`,

    // Webhook Events Log
    `CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      processed BOOLEAN DEFAULT 0,
      processing_attempts INTEGER DEFAULT 0,
      last_attempt_at TIMESTAMP,
      error_message TEXT,
      event_data TEXT, -- JSON object with the full event data
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Payment Plans (for estimates that can be paid in installments)
    `CREATE TABLE IF NOT EXISTS payment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      total_amount_cents INTEGER NOT NULL,
      down_payment_cents INTEGER DEFAULT 0,
      installment_amount_cents INTEGER NOT NULL,
      installment_count INTEGER NOT NULL,
      installment_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, quarterly
      start_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'active', -- active, completed, canceled, defaulted
      auto_pay BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,

    // Payment Plan Installments
    `CREATE TABLE IF NOT EXISTS payment_plan_installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_plan_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date DATE NOT NULL,
      amount_cents INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, skipped
      paid_at TIMESTAMP,
      payment_intent_id VARCHAR(255),
      late_fee_cents INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id) ON DELETE CASCADE
    )`,

    // Company Payment Settings
    `CREATE TABLE IF NOT EXISTS company_payment_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL UNIQUE,
      stripe_account_id VARCHAR(255), -- For Stripe Connect
      accept_credit_cards BOOLEAN DEFAULT 1,
      accept_ach BOOLEAN DEFAULT 0,
      accept_cash BOOLEAN DEFAULT 1,
      accept_check BOOLEAN DEFAULT 1,
      require_payment_on_completion BOOLEAN DEFAULT 0,
      allow_partial_payments BOOLEAN DEFAULT 1,
      allow_payment_plans BOOLEAN DEFAULT 1,
      default_payment_terms INTEGER DEFAULT 30, -- Net 30 days
      late_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
      late_fee_grace_period_days INTEGER DEFAULT 5,
      auto_send_payment_reminders BOOLEAN DEFAULT 1,
      payment_reminder_days TEXT DEFAULT '[7,3,1]', -- JSON array of days before due date
      currency VARCHAR(3) DEFAULT 'USD',
      tax_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )`
  ];

  try {
    for (let i = 0; i < tables.length; i++) {
      const tableSql = tables[i];
      console.log(`Creating payment table ${i + 1}/${tables.length}...`);
      
      await new Promise((resolve, reject) => {
        db.run(tableSql, (err) => {
          if (err) {
            console.error(`Error creating table: ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    // Create indexes for payment system
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_intents_client ON payment_intents(client_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_payments_client_date ON payments(client_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_intent_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_estimate ON payments(estimate_id)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_methods_client ON payment_methods(client_id, is_default)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON invoices(client_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date, status)',
      'CREATE INDEX IF NOT EXISTS idx_refunds_payment_intent ON refunds(stripe_payment_intent_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_payment_plans_client ON payment_plans(client_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_payment_plan_installments_due ON payment_plan_installments(due_date, status)'
    ];

    console.log('Creating payment system indexes...');
    for (const indexSql of indexes) {
      await new Promise((resolve, reject) => {
        db.run(indexSql, (err) => {
          if (err) {
            console.warn(`Warning creating index: ${err.message}`);
          }
          resolve();
        });
      });
    }

    // Add stripe_customer_id to clients table if not exists
    await new Promise((resolve) => {
      db.run(`
        ALTER TABLE clients ADD COLUMN stripe_customer_id VARCHAR(255)
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Warning adding stripe_customer_id column:', err.message);
        }
        resolve();
      });
    });

    // Add payment status fields to estimates table
    await new Promise((resolve) => {
      db.run(`
        ALTER TABLE estimates ADD COLUMN paid_at TIMESTAMP
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.warn('Warning adding paid_at column:', err.message);
        }
        resolve();
      });
    });

    // Set up default payment settings for existing companies
    console.log('Setting up default payment settings...');
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO company_payment_settings (
          company_id, accept_credit_cards, accept_cash, accept_check,
          allow_payment_plans, default_payment_terms, currency
        )
        SELECT 
          id, 1, 1, 1, 1, 30, 'USD'
        FROM companies
      `, (err) => {
        if (err) {
          console.warn(`Warning setting up default payment settings: ${err.message}`);
        }
        resolve();
      });
    });

    console.log('✅ Payment Processing migration completed successfully!');
    
    // Verify tables were created
    const tableList = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const createdTables = tableList.map(t => t.name);
    const expectedTables = [
      'payment_intents',
      'payments',
      'subscriptions',
      'payment_methods',
      'invoices',
      'refunds',
      'webhook_events',
      'payment_plans',
      'company_payment_settings'
    ];
    
    console.log('\n📋 Payment Tables Created:');
    expectedTables.forEach(tableName => {
      if (createdTables.includes(tableName)) {
        console.log(`✅ ${tableName}`);
      } else {
        console.log(`❌ ${tableName} (not found)`);
      }
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Payment migration failed:', error);
    process.exit(1);
  }
}

applyPaymentMigration();