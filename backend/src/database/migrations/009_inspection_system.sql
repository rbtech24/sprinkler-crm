-- Comprehensive Irrigation Inspection System
-- Mobile-first inspection tracking with detailed component analysis

-- Drop existing simple inspections table and recreate with full schema
DROP TABLE IF EXISTS inspections;

-- Enhanced inspections table with detailed irrigation system data
CREATE TABLE inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    site_id INTEGER,
    technician_id INTEGER NOT NULL,
    
    -- Basic inspection info
    inspection_type VARCHAR(50) NOT NULL DEFAULT 'routine', -- routine, seasonal_startup, seasonal_shutdown, repair_assessment, compliance
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- scheduled, in_progress, completed, needs_followup
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Scheduling
    scheduled_date DATE NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,
    estimated_duration INTEGER DEFAULT 60, -- minutes
    
    -- Location and property info
    property_address TEXT,
    property_type VARCHAR(50), -- residential, commercial, municipal, athletic
    property_size_sq_ft INTEGER,
    lot_size_acres DECIMAL(8,2),
    
    -- Weather conditions during inspection
    weather_conditions VARCHAR(100),
    temperature_f INTEGER,
    
    -- Overall system assessment
    overall_condition VARCHAR(20), -- excellent, good, fair, poor, critical
    system_age_years INTEGER,
    last_service_date DATE,
    
    -- Inspection data (JSON for flexibility)
    controller_data TEXT, -- JSON: brand, model, condition, zones, programming, etc.
    zones_data TEXT, -- JSON: array of zone details, sprinkler types, coverage, etc.
    backflow_data TEXT, -- JSON: type, condition, test_date, certification, etc.
    main_line_data TEXT, -- JSON: material, size, pressure, leaks, etc.
    emergency_shutoff_data TEXT, -- JSON: location, condition, accessibility, etc.
    rain_sensor_data TEXT, -- JSON: type, condition, calibration, bypass, etc.
    
    -- Issues and recommendations
    issues_found TEXT, -- JSON array of issues
    recommendations TEXT, -- JSON array of recommendations
    priority_repairs TEXT, -- JSON array of urgent repairs needed
    
    -- Photos and documentation
    photos TEXT, -- JSON array of photo URLs/paths
    signature_url VARCHAR(255), -- Customer signature
    
    -- Estimates and quotes
    estimated_repair_cost_cents INTEGER DEFAULT 0,
    quote_generated BOOLEAN DEFAULT 0,
    quote_id INTEGER,
    
    -- Notes and additional info
    technician_notes TEXT,
    customer_notes TEXT,
    follow_up_required BOOLEAN DEFAULT 0,
    follow_up_date DATE,
    
    -- Compliance and certifications
    backflow_test_required BOOLEAN DEFAULT 0,
    backflow_test_due_date DATE,
    permit_required BOOLEAN DEFAULT 0,
    permit_number VARCHAR(50),
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (quote_id) REFERENCES estimates(id) ON DELETE SET NULL
);

-- Inspection zone details (for detailed zone-by-zone analysis)
CREATE TABLE IF NOT EXISTS inspection_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    zone_number INTEGER NOT NULL,
    
    -- Zone identification
    zone_name VARCHAR(100),
    zone_type VARCHAR(50), -- grass, shrubs, trees, flower_beds, vegetables
    
    -- Coverage and performance
    coverage_area_sq_ft INTEGER,
    coverage_rating VARCHAR(20), -- excellent, good, fair, poor
    pressure_rating VARCHAR(20), -- excellent, good, fair, poor
    uniformity_rating VARCHAR(20), -- excellent, good, fair, poor
    
    -- Sprinkler heads
    sprinkler_type VARCHAR(50), -- spray, rotary, drip, bubbler, micro_spray
    sprinkler_brand VARCHAR(50),
    total_heads INTEGER DEFAULT 0,
    working_heads INTEGER DEFAULT 0,
    broken_heads INTEGER DEFAULT 0,
    missing_heads INTEGER DEFAULT 0,
    clogged_heads INTEGER DEFAULT 0,
    misaligned_heads INTEGER DEFAULT 0,
    
    -- Pipes and valves
    pipe_material VARCHAR(50), -- pvc, poly, copper, galvanized
    pipe_size_inches DECIMAL(3,1),
    valve_brand VARCHAR(50),
    valve_condition VARCHAR(20), -- excellent, good, fair, poor, failed
    
    -- Performance metrics
    flow_rate_gpm DECIMAL(6,2),
    operating_pressure_psi INTEGER,
    runtime_minutes INTEGER,
    precipitation_rate_in_hr DECIMAL(4,2),
    
    -- Issues specific to this zone
    issues TEXT, -- JSON array of zone-specific issues
    recommended_repairs TEXT, -- JSON array of repairs needed
    repair_priority VARCHAR(20), -- low, medium, high, urgent
    estimated_repair_cost_cents INTEGER DEFAULT 0,
    
    -- Photos for this zone
    photos TEXT, -- JSON array of photo URLs for this zone
    
    -- Notes
    notes TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- Inspection photos with metadata
CREATE TABLE IF NOT EXISTS inspection_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inspection_id INTEGER NOT NULL,
    zone_id INTEGER, -- NULL for general inspection photos
    
    -- Photo details
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    
    -- Photo metadata
    photo_type VARCHAR(50) NOT NULL, -- overview, issue, before, after, controller, backflow, zone, sprinkler_head
    description TEXT,
    
    -- Location within inspection
    component VARCHAR(50), -- controller, backflow, main_line, zone_1, zone_2, etc.
    issue_type VARCHAR(100), -- broken_head, leak, valve_issue, etc.
    
    -- GPS coordinates if available
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Timestamps
    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES inspection_zones(id) ON DELETE CASCADE
);

-- Inspection templates for consistent data collection
CREATE TABLE IF NOT EXISTS inspection_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    
    -- Template info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    inspection_type VARCHAR(50) NOT NULL,
    
    -- Template configuration
    required_fields TEXT, -- JSON array of required field names
    default_values TEXT, -- JSON object of default values
    custom_fields TEXT, -- JSON array of additional custom fields
    
    -- Usage tracking
    is_active BOOLEAN DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspections_company_date ON inspections(company_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_technician ON inspections(technician_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_client ON inspections(client_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inspection_zones_inspection ON inspection_zones(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON inspection_photos(inspection_id);

-- Default templates will be inserted via API when companies are created