-- Simple Service Plans Migration
-- Drop existing service_plans table if it exists and recreate with full schema

DROP TABLE IF EXISTS service_plans;
DROP TABLE IF EXISTS customer_subscriptions;
DROP TABLE IF EXISTS service_plan_visits;
DROP TABLE IF EXISTS service_plan_payments;
DROP TABLE IF EXISTS service_plan_templates;
DROP TABLE IF EXISTS service_plan_commissions;

-- Service Plans table
CREATE TABLE service_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT true,
    service_inclusions TEXT,
    service_exclusions TEXT,
    max_annual_visits INTEGER DEFAULT 0,
    priority_level INTEGER DEFAULT 1,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Customer Service Subscriptions
CREATE TABLE customer_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    service_plan_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    monthly_price_cents INTEGER NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    sold_by_user_id INTEGER,
    commission_percentage DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (service_plan_id) REFERENCES service_plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (sold_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Service Plan Templates
CREATE TABLE service_plan_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    suggested_price_cents INTEGER,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    service_inclusions TEXT,
    service_exclusions TEXT,
    max_annual_visits INTEGER DEFAULT 0,
    priority_level INTEGER DEFAULT 1,
    is_popular BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert service plan templates
INSERT INTO service_plan_templates (name, category, description, suggested_price_cents, billing_cycle, service_inclusions, service_exclusions, max_annual_visits, priority_level, is_popular) VALUES
('Basic Care Plan', 'residential', 'Essential sprinkler system maintenance for homeowners', 4900, 'monthly', 
'• Monthly visual system inspection
• Spring startup service
• Fall winterization service  
• Basic component repairs (up to $100 value)
• Priority scheduling for additional services
• 10% discount on major repairs',
'• Major component replacement
• System redesign or expansion
• Emergency after-hours service
• Landscaping services',
12, 1, 1),

('Premium Care Plan', 'residential', 'Comprehensive sprinkler system care with priority support', 8900, 'monthly',
'• Bi-weekly system inspections
• Spring startup and fall shutdown
• All minor repairs included (up to $300 value)
• Emergency response within 24 hours
• Seasonal programming adjustments
• 15% discount on major repairs
• Water usage optimization',
'• Major system overhauls
• New installation
• Landscaping services',
24, 2, 1),

('Commercial Maintenance', 'commercial', 'Professional irrigation maintenance for commercial properties', 24900, 'monthly',
'• Weekly system inspections
• All repairs included (up to $1000 value)
• 24/7 emergency response
• Compliance reporting
• Water usage monitoring
• Seasonal programming
• 20% discount on expansions',
'• Complete system replacement
• Landscape design services',
52, 3, 0);

-- Insert sample service plans for demo company
INSERT INTO service_plans (company_id, name, description, price_cents, billing_cycle, service_inclusions, service_exclusions, max_annual_visits, priority_level, is_active) VALUES 
(6, 'Residential Basic', 'Monthly sprinkler system maintenance for homeowners', 4900, 'monthly', 
'Monthly system inspection, spring startup, fall winterization, basic repairs up to $100',
'Major component replacement, emergency after-hours service, landscaping', 
12, 1, 1),

(6, 'Residential Premium', 'Comprehensive care with priority support', 8900, 'monthly',
'Bi-weekly inspections, all minor repairs, emergency response, water usage optimization',
'Complete system replacement, landscaping services',
24, 2, 1),

(6, 'Commercial Pro', 'Professional maintenance for commercial properties', 19900, 'monthly',
'Weekly inspections, comprehensive repair coverage, 24/7 emergency response, compliance reporting',
'Landscape design, complete system overhauls',
52, 3, 1);

-- Create indexes
CREATE INDEX idx_service_plans_company ON service_plans(company_id);
CREATE INDEX idx_customer_subscriptions_client ON customer_subscriptions(client_id);
CREATE INDEX idx_customer_subscriptions_plan ON customer_subscriptions(service_plan_id);