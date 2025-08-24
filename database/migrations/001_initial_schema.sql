-- Migration: 001_initial_schema.sql
-- Creates the initial database schema for Sprinkler Repair SaaS
-- Run Date: 2025-08-20

-- Create extensions first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Load the main schema
\i '../schema.sql'

-- Load seed data
\i '../seeds/default_templates_and_pricing.sql'

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company_active ON users(company_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_site_date ON inspections(site_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_tech_date ON inspections(tech_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_client_date ON estimates(client_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_status ON estimates(company_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_tech_date ON work_orders(assigned_tech_id, scheduled_start);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_company ON files(company_id, created_at);

-- Add updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_timestamp_companies BEFORE UPDATE ON companies FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_clients BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_sites BEFORE UPDATE ON sites FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_price_books BEFORE UPDATE ON price_books FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_price_book_items BEFORE UPDATE ON price_book_items FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inspection_templates BEFORE UPDATE ON inspection_templates FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_inspections BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_estimates BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_work_orders BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_subscriptions BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Migration complete
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
