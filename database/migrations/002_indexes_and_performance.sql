-- PostgreSQL Migration: Performance Indexes and Optimization
-- Migration: 002_indexes_and_performance.sql
-- Purpose: Create comprehensive indexing strategy for optimal performance

-- Create schema migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company-based indexes for multi-tenancy (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_company_id ON sites(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_company_id ON inspections(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_company_id ON estimates(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_plans_company_id ON service_plans(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_company_id ON client_subscriptions(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_company_id ON service_visits(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_books_company_id ON price_books(company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_templates_company_id ON inspection_templates(company_id);

-- Foreign key indexes for join performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_client_id ON sites(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_site_id ON inspections(site_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_tech_id ON inspections(tech_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_technician_id ON inspections(technician_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_client_id ON inspections(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_client_id ON estimates(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_site_id ON estimates(site_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_inspection_id ON estimates(inspection_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_estimate_id ON work_orders(estimate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_tech_id ON work_orders(tech_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_technician_id ON work_orders(technician_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_client_id ON client_subscriptions(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_service_plan_id ON client_subscriptions(service_plan_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_subscription_id ON service_visits(subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_site_id ON service_visits(site_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_book_items_price_book_id ON price_book_items(price_book_id);

-- Authentication and session indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Status indexes for filtering common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_inspection_status ON inspections(inspection_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_status ON client_subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_status ON service_visits(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commission_tracking_status ON commission_tracking(status);

-- Date indexes for sorting and time-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_created_at ON inspections(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_created_at ON estimates(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_sent_at ON estimates(sent_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_approved_at ON estimates(approved_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_scheduled_at ON work_orders(scheduled_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_scheduled_date ON service_visits(scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_completed_date ON service_visits(completed_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_next_billing_date ON client_subscriptions(next_billing_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_due_date ON recurring_invoices(due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_company_status ON inspections(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_company_tech ON inspections(company_id, tech_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_company_technician ON inspections(company_id, technician_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_company_date ON inspections(company_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_company_status ON estimates(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_company_date ON estimates(company_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_company_status ON work_orders(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_company_tech ON work_orders(company_id, tech_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_company_scheduled ON work_orders(company_id, scheduled_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_company_client ON sites(company_id, client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_company_status ON client_subscriptions(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_company_status ON service_visits(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_visits_company_scheduled ON service_visits(company_id, scheduled_date);

-- Billing and financial indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_company_status ON recurring_invoices(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_subscription_id ON recurring_invoices(subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commission_tracking_tech_id ON commission_tracking(tech_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commission_tracking_company_tech ON commission_tracking(company_id, tech_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commission_tracking_period ON commission_tracking(period_start, period_end);

-- Email and communication indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_billing_email ON clients(billing_email) WHERE billing_email IS NOT NULL;

-- Boolean flag indexes (partial indexes for better performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON users(email_verified) WHERE email_verified = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_has_estimate ON inspections(has_estimate) WHERE has_estimate = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_pdf_ready ON inspections(pdf_ready) WHERE pdf_ready = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_plans_active ON service_plans(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_books_active ON price_books(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_books_default ON price_books(is_default) WHERE is_default = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_book_items_active ON price_book_items(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_subscriptions_auto_renew ON client_subscriptions(auto_renew) WHERE auto_renew = true;

-- Text search indexes for names and descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_name_trgm ON clients USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_name_trgm ON sites USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_trgm ON users USING gin(name gin_trgm_ops);

-- Enable pg_trgm extension for fuzzy text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Geographic indexes for address-based queries (if needed later)
-- These would require PostGIS extension
-- CREATE INDEX IF NOT EXISTS idx_sites_address_trgm ON sites USING gin(address gin_trgm_ops);

-- Create statistics for better query planning
CREATE STATISTICS IF NOT EXISTS stats_inspections_company_status_date ON company_id, status, created_at FROM inspections;
CREATE STATISTICS IF NOT EXISTS stats_work_orders_company_tech_scheduled ON company_id, tech_id, scheduled_at FROM work_orders;
CREATE STATISTICS IF NOT EXISTS stats_estimates_company_status_amount ON company_id, status, total_cents FROM estimates;

-- Analyze tables for optimal query planning
ANALYZE companies;
ANALYZE users;
ANALYZE clients;
ANALYZE sites;
ANALYZE inspections;
ANALYZE estimates;
ANALYZE work_orders;
ANALYZE service_plans;
ANALYZE client_subscriptions;
ANALYZE service_visits;
ANALYZE price_books;
ANALYZE price_book_items;
ANALYZE inspection_templates;

-- Log completion
INSERT INTO schema_migrations (version, applied_at) VALUES 
('002_indexes_and_performance', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;