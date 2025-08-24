-- Service Plans Migration
-- Creates tables for service plan management and customer subscriptions

-- Service Plans table - defines the service plans that companies offer
CREATE TABLE IF NOT EXISTS service_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0, -- Monthly price in cents
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, quarterly, yearly
    is_active BOOLEAN DEFAULT true,
    features_json TEXT, -- JSON array of included features
    service_inclusions TEXT, -- What's included (text description)
    service_exclusions TEXT, -- What's not included (text description)
    max_annual_visits INTEGER DEFAULT 0, -- Max visits per year (0 = unlimited)
    priority_level INTEGER DEFAULT 1, -- 1=standard, 2=priority, 3=emergency
    discount_percentage DECIMAL(5,2) DEFAULT 0, -- Discount on additional work
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Customer Service Subscriptions - tracks which customers are subscribed to which plans
CREATE TABLE IF NOT EXISTS customer_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    service_plan_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, cancelled, expired
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    monthly_price_cents INTEGER NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    payment_method_id VARCHAR(255), -- Stripe payment method ID
    stripe_subscription_id VARCHAR(255), -- Stripe subscription ID
    sold_by_user_id INTEGER, -- Which tech/user sold this subscription
    commission_percentage DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (service_plan_id) REFERENCES service_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (sold_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Service Plan Visits - tracks visits under service plans
CREATE TABLE IF NOT EXISTS service_plan_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    inspection_id INTEGER, -- Links to actual inspection if performed
    scheduled_date DATE,
    completed_date DATE,
    visit_type VARCHAR(50) DEFAULT 'routine', -- routine, emergency, follow_up
    tech_id INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, skipped, cancelled
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL,
    FOREIGN KEY (tech_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Service Plan Payments - tracks payment history
CREATE TABLE IF NOT EXISTS service_plan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_date DATE,
    payment_method VARCHAR(50), -- credit_card, ach, check, cash
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    failure_reason TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES customer_subscriptions(id) ON DELETE CASCADE
);

-- Service Plan Templates - pre-defined plan templates companies can use
CREATE TABLE IF NOT EXISTS service_plan_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- residential, commercial, premium
    description TEXT,
    suggested_price_cents INTEGER,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    features_json TEXT,
    service_inclusions TEXT,
    service_exclusions TEXT,
    max_annual_visits INTEGER DEFAULT 0,
    priority_level INTEGER DEFAULT 1,
    is_popular BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Commission Tracking - tracks sales commissions for techs
CREATE TABLE IF NOT EXISTS service_plan_commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL, -- Technician who made the sale
    subscription_id INTEGER NOT NULL,
    commission_type VARCHAR(20) DEFAULT 'initial', -- initial, recurring, bonus
    commission_amount_cents INTEGER NOT NULL,
    commission_percentage DECIMAL(5,2),
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
    payment_date DATE,
    period_start DATE,
    period_end DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES customer_subscriptions(id) ON DELETE CASCADE
);

-- Insert default service plan templates
INSERT OR IGNORE INTO service_plan_templates (id, name, category, description, suggested_price_cents, billing_cycle, features_json, service_inclusions, service_exclusions, max_annual_visits, priority_level, is_popular) VALUES
(1, 'Basic Care Plan', 'residential', 'Essential sprinkler system maintenance for homeowners', 4900, 'monthly', 
'["Monthly system inspection", "Seasonal startup/shutdown", "Basic repairs included", "Priority scheduling"]',
'• Monthly visual system inspection\n• Spring startup service\n• Fall winterization service\n• Basic component repairs (up to $100 value)\n• Priority scheduling for additional services\n• 10% discount on major repairs',
'• Major component replacement\n• System redesign or expansion\n• Emergency after-hours service\n• Landscaping services',
12, 1, true),

(2, 'Premium Care Plan', 'residential', 'Comprehensive sprinkler system care with priority support', 8900, 'monthly',
'["Bi-weekly inspections", "All basic repairs included", "Emergency response", "Seasonal adjustments"]',
'• Bi-weekly system inspections\n• Spring startup and fall shutdown\n• All minor repairs included (up to $300 value)\n• Emergency response within 24 hours\n• Seasonal programming adjustments\n• 15% discount on major repairs\n• Water usage optimization',
'• Major system overhauls\n• New installation\n• Landscaping services',
24, 2, true),

(3, 'Commercial Maintenance', 'commercial', 'Professional irrigation maintenance for commercial properties', 24900, 'monthly',
'["Weekly inspections", "Comprehensive coverage", "Emergency service", "Compliance reporting"]',
'• Weekly system inspections\n• All repairs included (up to $1000 value)\n• 24/7 emergency response\n• Compliance reporting\n• Water usage monitoring\n• Seasonal programming\n• 20% discount on expansions',
'• Complete system replacement\n• Landscape design services',
52, 3, false),

(4, 'Seasonal Service', 'residential', 'Spring and fall service for DIY homeowners', 15900, 'quarterly',
'["Startup service", "Winterization", "Basic inspection", "System optimization"]',
'• Spring startup service\n• Fall winterization\n• Basic system inspection\n• Controller programming\n• Minor adjustments included\n• 5% discount on repairs',
'• Regular maintenance visits\n• Emergency service\n• Major repairs\n• Component replacement',
2, 1, false);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_plans_company ON service_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_client ON customer_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_plan ON customer_subscriptions(service_plan_id);
CREATE INDEX IF NOT EXISTS idx_service_plan_visits_subscription ON service_plan_visits(subscription_id);
CREATE INDEX IF NOT EXISTS idx_service_plan_payments_subscription ON service_plan_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_service_plan_commissions_user ON service_plan_commissions(user_id);

-- Add some sample service plans for the demo company
INSERT OR IGNORE INTO service_plans (id, company_id, name, description, price_cents, billing_cycle, features_json, service_inclusions, service_exclusions, max_annual_visits, priority_level, is_active) VALUES 
(1, 6, 'Residential Basic', 'Monthly sprinkler system maintenance for homeowners', 4900, 'monthly', 
'["Monthly inspection", "Spring startup", "Fall shutdown", "Basic repairs"]',
'Monthly system inspection, spring startup, fall winterization, basic repairs up to $100',
'Major component replacement, emergency after-hours service, landscaping', 
12, 1, true),

(2, 6, 'Residential Premium', 'Comprehensive care with priority support', 8900, 'monthly',
'["Bi-weekly inspection", "All repairs included", "Emergency response", "Water optimization"]', 
'Bi-weekly inspections, all minor repairs, emergency response, water usage optimization',
'Complete system replacement, landscaping services',
24, 2, true),

(3, 6, 'Commercial Pro', 'Professional maintenance for commercial properties', 19900, 'monthly',
'["Weekly inspection", "Comprehensive coverage", "24/7 emergency", "Reporting"]',
'Weekly inspections, comprehensive repair coverage, 24/7 emergency response, compliance reporting',
'Landscape design, complete system overhauls',
52, 3, true);