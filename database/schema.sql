-- Sprinkler Repair SaaS Database Schema
-- PostgreSQL with multi-tenant architecture

-- Create enums first
CREATE TYPE user_role AS ENUM ('owner','admin','dispatcher','tech','viewer');
CREATE TYPE plan_tier AS ENUM ('starter','pro','enterprise');
CREATE TYPE env AS ENUM ('prod','staging','dev');
CREATE TYPE contact_type AS ENUM ('residential','commercial');
CREATE TYPE device_type AS ENUM ('backflow','controller','valve','sensor');
CREATE TYPE head_type AS ENUM ('spray','rotor','drip','bubbler','unknown');
CREATE TYPE inspection_template AS ENUM ('repair_focused','conservation_focused','custom');
CREATE TYPE issue_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE item_unit AS ENUM ('each','hour','foot','gallon','set');
CREATE TYPE money_currency AS ENUM ('USD');
CREATE TYPE estimate_status AS ENUM ('draft','sent','approved','declined','expired');
CREATE TYPE work_order_status AS ENUM ('scheduled','in_progress','paused','complete','cancelled');

-- 1. Companies and Users (Multi-tenancy)
CREATE TABLE companies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              citext UNIQUE,
  email             citext,
  phone             text,
  website           text,
  logo_file_id      uuid, -- Will reference files table
  billing_email     citext,
  address_json      jsonb,
  plan              plan_tier NOT NULL DEFAULT 'starter',
  plan_seat_limit   int DEFAULT 2,
  env               env NOT NULL DEFAULT 'prod',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id),
  role              user_role NOT NULL DEFAULT 'tech',
  email             citext NOT NULL,
  phone             text,
  full_name         text,
  is_active         boolean NOT NULL DEFAULT true,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);
CREATE INDEX ON users(company_id, role);

-- 2. Feature flags and subscriptions
CREATE TABLE feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  key         text NOT NULL,
  value       jsonb NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (company_id, key)
);

CREATE TABLE subscriptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id),
  stripe_customer   text,
  stripe_sub_id     text,
  plan              plan_tier NOT NULL,
  status            text NOT NULL,
  current_period_end timestamptz,
  seats             int DEFAULT 2,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 3. CRM Objects
CREATE TABLE clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  name          text NOT NULL,
  contact_type  contact_type NOT NULL DEFAULT 'residential',
  billing_email citext,
  phone         text,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (company_id, name, contact_type)
);

CREATE TABLE sites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  client_id     uuid NOT NULL REFERENCES clients(id),
  nickname      text,
  address_json  jsonb,
  geo_point_id  uuid, -- Will reference geo_points table
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE client_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id),
  client_id    uuid NOT NULL REFERENCES clients(id),
  name         text,
  email        citext,
  phone        text,
  role         text,
  is_primary   boolean DEFAULT false
);

-- 4. Price Books and Items
CREATE TABLE price_books (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  name          text NOT NULL,
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE price_book_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id),
  price_book_id  uuid NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
  sku            text,
  name           text NOT NULL,
  category       text,
  description    text,
  unit           item_unit NOT NULL DEFAULT 'each',
  cost_cents     int NOT NULL DEFAULT 0,
  price_cents    int NOT NULL DEFAULT 0,
  currency       money_currency NOT NULL DEFAULT 'USD',
  tax_rate_pct   numeric(5,2) DEFAULT 0,
  is_active      boolean DEFAULT true,
  metadata       jsonb,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX ON price_book_items(company_id, price_book_id, category);

-- 5. Inspection Templates and Inspections
CREATE TABLE inspection_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id),
  name           text NOT NULL,
  code           inspection_template NOT NULL DEFAULT 'custom',
  schema_json    jsonb NOT NULL,
  callouts_json  jsonb NOT NULL,
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE inspections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id),
  site_id           uuid NOT NULL REFERENCES sites(id),
  template_id       uuid NOT NULL REFERENCES inspection_templates(id),
  tech_id           uuid NOT NULL REFERENCES users(id),
  started_at        timestamptz DEFAULT now(),
  submitted_at      timestamptz,
  program_settings  jsonb,
  summary_json      jsonb,
  report_pdf_file_id uuid, -- Will reference files table
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE inspection_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  zone_number       int,
  area_label        text,
  device_type       device_type,
  head_type         head_type,
  callout_code      text,
  severity          issue_severity,
  notes             text,
  photos            uuid[] DEFAULT '{}',
  geo_point_id      uuid, -- Will reference geo_points table
  metadata          jsonb,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX ON inspection_items(inspection_id, zone_number);

-- 6. Estimates
CREATE TABLE estimates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id),
  inspection_id     uuid REFERENCES inspections(id) ON DELETE SET NULL,
  client_id         uuid NOT NULL REFERENCES clients(id),
  site_id           uuid NOT NULL REFERENCES sites(id),
  price_book_id     uuid REFERENCES price_books(id),
  status            estimate_status NOT NULL DEFAULT 'draft',
  subtotal_cents    int NOT NULL DEFAULT 0,
  tax_cents         int NOT NULL DEFAULT 0,
  total_cents       int NOT NULL DEFAULT 0,
  currency          money_currency NOT NULL DEFAULT 'USD',
  valid_until       date,
  customer_notes    text,
  internal_notes    text,
  estimate_pdf_file_id uuid, -- Will reference files table
  signed_at         timestamptz,
  signature_id      uuid, -- Will reference signatures table
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE estimate_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id       uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  price_book_item_id uuid REFERENCES price_book_items(id),
  description       text NOT NULL,
  qty               numeric(10,2) NOT NULL DEFAULT 1,
  unit              item_unit NOT NULL DEFAULT 'each',
  unit_price_cents  int NOT NULL DEFAULT 0,
  line_total_cents  int NOT NULL DEFAULT 0,
  tax_rate_pct      numeric(5,2) DEFAULT 0,
  metadata          jsonb
);
CREATE INDEX ON estimate_items(estimate_id);

-- 7. Work Orders
CREATE TABLE work_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id),
  estimate_id      uuid NOT NULL REFERENCES estimates(id),
  site_id          uuid NOT NULL REFERENCES sites(id),
  status           work_order_status NOT NULL DEFAULT 'scheduled',
  scheduled_start  timestamptz,
  scheduled_end    timestamptz,
  assigned_tech_id uuid REFERENCES users(id),
  instructions     text,
  completion_notes text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 8. Media, Geo, and Signatures
CREATE TABLE files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid REFERENCES companies(id),
  bucket        text NOT NULL,
  key           text NOT NULL,
  mime_type     text,
  size_bytes    bigint,
  sha256        text,
  created_by    uuid REFERENCES users(id),
  created_at    timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX ON files(bucket, key);

-- Add foreign key constraints for files
ALTER TABLE companies ADD CONSTRAINT companies_logo_file_id_fkey 
  FOREIGN KEY (logo_file_id) REFERENCES files(id);
ALTER TABLE inspections ADD CONSTRAINT inspections_report_pdf_file_id_fkey 
  FOREIGN KEY (report_pdf_file_id) REFERENCES files(id);
ALTER TABLE estimates ADD CONSTRAINT estimates_estimate_pdf_file_id_fkey 
  FOREIGN KEY (estimate_pdf_file_id) REFERENCES files(id);

CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id       uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  site_id       uuid REFERENCES sites(id),
  inspection_id uuid REFERENCES inspections(id),
  inspection_item_id uuid REFERENCES inspection_items(id),
  caption       text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE geo_points (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  label         text,
  accuracy_m    double precision,
  created_at    timestamptz DEFAULT now()
);

-- Add foreign key constraints for geo_points
ALTER TABLE sites ADD CONSTRAINT sites_geo_point_id_fkey 
  FOREIGN KEY (geo_point_id) REFERENCES geo_points(id);
ALTER TABLE inspection_items ADD CONSTRAINT inspection_items_geo_point_id_fkey 
  FOREIGN KEY (geo_point_id) REFERENCES geo_points(id);

CREATE TABLE signatures (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  signer_name   text,
  signer_email  citext,
  signed_at     timestamptz NOT NULL DEFAULT now(),
  file_id       uuid REFERENCES files(id),
  metadata      jsonb
);

-- Add foreign key constraint for signatures
ALTER TABLE estimates ADD CONSTRAINT estimates_signature_id_fkey 
  FOREIGN KEY (signature_id) REFERENCES signatures(id);

-- 9. Operational Tables
CREATE TABLE audit_logs (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id    uuid NOT NULL REFERENCES companies(id),
  actor_user_id uuid REFERENCES users(id),
  action        text NOT NULL,
  entity_table  text NOT NULL,
  entity_id     uuid NOT NULL,
  diff_json     jsonb,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX ON audit_logs(company_id, entity_table, entity_id);

CREATE TABLE webhooks_outbox (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  event         text NOT NULL,
  payload       jsonb NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  attempts      int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE background_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL,
  payload       jsonb NOT NULL,
  run_after     timestamptz DEFAULT now(),
  locked_at     timestamptz,
  attempts      int NOT NULL DEFAULT 0,
  last_error    text,
  created_at    timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) for multi-tenancy
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks_outbox ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example - adapt based on your auth system)
-- These assume you have a way to get current_user's company_id from JWT or session

-- Example policy for companies (users can only see their own company)
CREATE POLICY company_isolation ON companies
  FOR ALL USING (id = current_setting('app.current_company_id')::uuid);

-- Example policy for users
CREATE POLICY user_company_isolation ON users
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

-- Add similar policies for other tables following the same pattern

-- ============================================================================
-- Phase 3 CRM Extensions
-- ============================================================================

-- Communication tracking for customer relationship management
CREATE TABLE communications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  client_id     uuid NOT NULL REFERENCES clients(id),
  user_id       uuid NOT NULL REFERENCES users(id),
  communication_type text NOT NULL CHECK (communication_type IN ('email', 'phone', 'meeting', 'text', 'note')),
  subject       text,
  content       text NOT NULL,
  direction     text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status        text DEFAULT 'completed' CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'completed')),
  scheduled_date timestamptz,
  completed_date timestamptz,
  follow_up_date timestamptz,
  tags          jsonb DEFAULT '[]'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX ON communications(company_id, client_id);
CREATE INDEX ON communications(scheduled_date);
CREATE INDEX ON communications(follow_up_date);

-- Communication templates for standardized messaging
CREATE TABLE communication_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  name          text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('email', 'text', 'follow_up')),
  subject       text,
  content       text NOT NULL,
  variables     jsonb DEFAULT '[]'::jsonb,
  is_active     boolean DEFAULT true,
  created_by    uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Automated communication rules
CREATE TABLE automated_communications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id),
  template_id      uuid NOT NULL REFERENCES communication_templates(id),
  trigger_type     text NOT NULL CHECK (trigger_type IN ('inspection_complete', 'estimate_sent', 'work_order_complete', 'date_based')),
  trigger_delay_days int DEFAULT 0,
  is_active        boolean DEFAULT true,
  created_by       uuid NOT NULL REFERENCES users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Technician skills for intelligent work assignment
CREATE TABLE technician_skills (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES companies(id),
  user_id           uuid NOT NULL REFERENCES users(id),
  skill_type        text NOT NULL CHECK (skill_type IN ('sprinkler_systems', 'backflow_testing', 'fire_safety', 'electrical', 'plumbing', 'emergency_repair')),
  proficiency_level text DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience  int DEFAULT 0,
  certifications    jsonb DEFAULT '[]'::jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(company_id, user_id, skill_type)
);

-- Technician availability schedules
CREATE TABLE schedule_availability (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id),
  user_id       uuid NOT NULL REFERENCES users(id),
  day_of_week   int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  is_available  boolean DEFAULT true,
  effective_date date,
  end_date      date,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX ON schedule_availability(company_id, user_id, day_of_week);

-- Time off requests and approvals
CREATE TABLE time_off_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  reason      text,
  status      text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Enable RLS for new CRM tables
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for CRM tables
CREATE POLICY communication_company_isolation ON communications
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY communication_templates_company_isolation ON communication_templates
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY automated_communications_company_isolation ON automated_communications
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY technician_skills_company_isolation ON technician_skills
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY schedule_availability_company_isolation ON schedule_availability
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY time_off_requests_company_isolation ON time_off_requests
  FOR ALL USING (company_id = current_setting('app.current_company_id')::uuid);
