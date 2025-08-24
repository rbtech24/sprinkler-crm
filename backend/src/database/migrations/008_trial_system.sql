-- Trial and Subscription Management System
-- Adds SaaS trial tracking and subscription management to companies table

-- Add trial and subscription columns to companies table
ALTER TABLE companies ADD COLUMN trial_starts_at DATETIME;
ALTER TABLE companies ADD COLUMN trial_ends_at DATETIME;
ALTER TABLE companies ADD COLUMN subscription_status TEXT DEFAULT 'trial';
ALTER TABLE companies ADD COLUMN subscription_plan TEXT DEFAULT 'starter';
ALTER TABLE companies ADD COLUMN last_payment_date DATETIME;
ALTER TABLE companies ADD COLUMN next_billing_date DATETIME;
ALTER TABLE companies ADD COLUMN billing_email TEXT;
ALTER TABLE companies ADD COLUMN is_locked BOOLEAN DEFAULT 0;
ALTER TABLE companies ADD COLUMN lock_reason TEXT;
ALTER TABLE companies ADD COLUMN trial_notifications_sent INTEGER DEFAULT 0;

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    price_monthly INTEGER NOT NULL, -- in cents
    price_yearly INTEGER, -- in cents
    max_users INTEGER,
    max_clients INTEGER,
    max_inspections_per_month INTEGER,
    features TEXT, -- JSON array of features
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, price_monthly, price_yearly, max_users, max_clients, max_inspections_per_month, features) VALUES
('trial', '7-Day Free Trial', 0, 0, 3, 10, 5, '["Basic CRM", "Mobile App", "Email Support"]'),
('starter', 'Starter Plan', 4900, 52800, 5, 100, 50, '["Full CRM", "Mobile App", "Service Plans", "Basic Reports", "Email Support"]'),
('professional', 'Professional Plan', 9900, 106800, 15, 500, 200, '["Everything in Starter", "Advanced Reports", "Custom Fields", "API Access", "Priority Support"]'),
('enterprise', 'Enterprise Plan', 19900, 214800, -1, -1, -1, '["Everything in Professional", "White Label", "Custom Integrations", "Dedicated Support", "Advanced Analytics"]');

-- Create trial notifications table
CREATE TABLE IF NOT EXISTS trial_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'trial_started', 'trial_3_days', 'trial_1_day', 'trial_expired'
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_sent_to TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create subscription billing history
CREATE TABLE IF NOT EXISTS billing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    plan_name VARCHAR(50) NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Update existing companies to have proper trial dates (7 days from creation)
UPDATE companies 
SET 
    trial_starts_at = created_at,
    trial_ends_at = datetime(created_at, '+7 days'),
    subscription_status = CASE 
        WHEN datetime('now') > datetime(created_at, '+7 days') THEN 'expired'
        ELSE 'trial'
    END,
    is_locked = CASE 
        WHEN datetime('now') > datetime(created_at, '+7 days') THEN 1
        ELSE 0
    END,
    lock_reason = CASE 
        WHEN datetime('now') > datetime(created_at, '+7 days') THEN 'Trial period expired. Please upgrade to continue using the service.'
        ELSE NULL
    END
WHERE trial_starts_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_trial_status ON companies(subscription_status, trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_companies_locked ON companies(is_locked);
CREATE INDEX IF NOT EXISTS idx_billing_history_company ON billing_history(company_id);
CREATE INDEX IF NOT EXISTS idx_trial_notifications_company ON trial_notifications(company_id);