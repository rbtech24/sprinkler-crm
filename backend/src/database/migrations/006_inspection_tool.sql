-- Migration: 006_inspection_tool.sql
-- Description: Create tables for the Inspection Tool feature

-- Inspection templates table
CREATE TABLE IF NOT EXISTS inspection_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT DEFAULT 'custom',
    sections TEXT NOT NULL, -- JSON array of form sections
    callouts TEXT, -- JSON array of available callouts
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    technician_id INTEGER NOT NULL,
    template_id TEXT NOT NULL, -- Can be 'repair-focused', 'conservation-focused', or custom ID
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    scheduled_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    summary_notes TEXT,
    recommendations TEXT,
    completion_photos TEXT, -- JSON array of photo URLs
    technician_signature TEXT, -- Base64 encoded signature
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Inspection data table (stores form field data)
CREATE TABLE IF NOT EXISTS inspection_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    section_id TEXT NOT NULL, -- e.g., 'system_overview', 'zone_inspection'
    field_data TEXT NOT NULL, -- JSON object with field values
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
    UNIQUE(inspection_id, section_id)
);

-- Inspection callouts/issues table
CREATE TABLE IF NOT EXISTS inspection_callouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    callout_type TEXT NOT NULL, -- e.g., 'broken_head', 'leak', 'low_pressure'
    zone_number INTEGER,
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    lat REAL, -- GPS latitude
    lng REAL, -- GPS longitude
    photos TEXT, -- JSON array of photo URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Inspection photos table
CREATE TABLE IF NOT EXISTS inspection_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    callout_id INTEGER, -- Optional: link to specific callout
    zone_number INTEGER,
    filename TEXT NOT NULL,
    caption TEXT,
    lat REAL, -- GPS latitude
    lng REAL, -- GPS longitude
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
    FOREIGN KEY (callout_id) REFERENCES inspection_callouts(id) ON DELETE SET NULL
);

-- Inspection reports table (generated PDFs)
CREATE TABLE IF NOT EXISTS inspection_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_inspections_technician_id ON inspections(technician_id);
CREATE INDEX IF NOT EXISTS idx_inspections_site_id ON inspections(site_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_scheduled_date ON inspections(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_inspection_data_inspection_id ON inspection_data(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_callouts_inspection_id ON inspection_callouts(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_inspection_id ON inspection_reports(inspection_id);