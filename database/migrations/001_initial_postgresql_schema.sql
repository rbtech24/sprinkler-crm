-- PostgreSQL Migration: Initial Schema Creation
-- Migration: 001_initial_postgresql_schema.sql
-- Purpose: Create complete PostgreSQL schema from SQLite structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    logo_url TEXT,
    stripe_customer_id VARCHAR(255),
    trial_starts_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    subscription_plan VARCHAR(50) DEFAULT 'trial',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'tech',
    email_verified BOOLEAN DEFAULT false,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMP,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP,
    verification_token TEXT,
    last_login TIMESTAMP,
    last_login_at TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    replaced_by_token TEXT,
    created_by_ip INET,
    revoked_by_ip INET
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    billing_email VARCHAR(255),
    type VARCHAR(50) DEFAULT 'residential',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(50),
    zip VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tech_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft',
    inspection_status VARCHAR(50) DEFAULT 'draft',
    scheduled_date DATE,
    issues_count INTEGER DEFAULT 0,
    has_estimate BOOLEAN DEFAULT false,
    is_pdf_ready BOOLEAN DEFAULT false,
    pdf_ready BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create estimates table
CREATE TABLE IF NOT EXISTS estimates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    inspection_id INTEGER REFERENCES inspections(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft',
    total_cents INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create estimate_items table (for itemized estimates)
CREATE TABLE IF NOT EXISTS estimate_items (
    id SERIAL PRIMARY KEY,
    estimate_id INTEGER NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create work orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    estimate_id INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
    tech_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    checklist_progress INTEGER DEFAULT 0,
    before_photos_count INTEGER DEFAULT 0,
    after_photos_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service plans table
CREATE TABLE IF NOT EXISTS service_plans (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    price_cents INTEGER NOT NULL,
    setup_fee_cents INTEGER DEFAULT 0,
    visit_frequency VARCHAR(50) DEFAULT 'monthly',
    included_services TEXT, -- JSON array
    max_sites INTEGER DEFAULT 1,
    commission_rate DECIMAL(5,4) DEFAULT 0.1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create client subscriptions table
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_plan_id INTEGER NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE NOT NULL,
    next_billing_date DATE NOT NULL,
    last_billing_date DATE,
    sites_included TEXT, -- JSON array
    sold_by_tech_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    monthly_price_cents INTEGER NOT NULL,
    setup_fee_paid BOOLEAN DEFAULT false,
    auto_renew BOOLEAN DEFAULT true,
    cancellation_date DATE,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recurring invoices table
CREATE TABLE IF NOT EXISTS recurring_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    amount_cents INTEGER NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create commission tracking table
CREATE TABLE IF NOT EXISTS commission_tracking (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tech_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    commission_type VARCHAR(50) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    base_amount_cents INTEGER NOT NULL,
    commission_amount_cents INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    paid_date DATE,
    invoice_id INTEGER REFERENCES recurring_invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create service visits table
CREATE TABLE IF NOT EXISTS service_visits (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP NOT NULL,
    assigned_tech_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    visit_type VARCHAR(50) DEFAULT 'maintenance',
    completed_date TIMESTAMP,
    completion_notes TEXT,
    issues_found INTEGER DEFAULT 0,
    additional_work_needed BOOLEAN DEFAULT false,
    additional_work_estimate_id INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create price books table
CREATE TABLE IF NOT EXISTS price_books (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create price book items table
CREATE TABLE IF NOT EXISTS price_book_items (
    id SERIAL PRIMARY KEY,
    price_book_id INTEGER NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'each',
    cost_cents INTEGER DEFAULT 0,
    price_cents INTEGER NOT NULL,
    markup_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inspection templates table
CREATE TABLE IF NOT EXISTS inspection_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data TEXT, -- JSON structure
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints and unique indexes
ALTER TABLE companies ADD CONSTRAINT companies_name_unique UNIQUE (name);
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
ALTER TABLE recurring_invoices ADD CONSTRAINT recurring_invoices_invoice_number_unique UNIQUE (invoice_number);

-- Add check constraints
ALTER TABLE service_plans ADD CONSTRAINT service_plans_price_positive CHECK (price_cents >= 0);
ALTER TABLE service_plans ADD CONSTRAINT service_plans_commission_valid CHECK (commission_rate >= 0 AND commission_rate <= 1);
ALTER TABLE estimates ADD CONSTRAINT estimates_total_positive CHECK (total_cents >= 0);
ALTER TABLE estimate_items ADD CONSTRAINT estimate_items_price_positive CHECK (unit_price_cents >= 0 AND total_cents >= 0);

COMMENT ON TABLE companies IS 'Multi-tenant organization data';
COMMENT ON TABLE users IS 'User accounts with role-based access';
COMMENT ON TABLE clients IS 'Customer information';
COMMENT ON TABLE sites IS 'Service locations for clients';
COMMENT ON TABLE inspections IS 'Digital inspection records';
COMMENT ON TABLE estimates IS 'Quote generation and tracking';
COMMENT ON TABLE work_orders IS 'Job management and completion';
COMMENT ON TABLE service_plans IS 'Subscription-based service offerings';
COMMENT ON TABLE client_subscriptions IS 'Active client service subscriptions';
COMMENT ON TABLE service_visits IS 'Scheduled maintenance visits';

-- Log completion
INSERT INTO schema_migrations (version, applied_at) VALUES 
('001_initial_postgresql_schema', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;