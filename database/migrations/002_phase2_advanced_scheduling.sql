-- Phase 2: Advanced Scheduling Schema Extensions
-- Add technician skills, certifications, and advanced scheduling features

-- Technician Skills and Certifications
CREATE TABLE IF NOT EXISTS technician_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  skill_name VARCHAR(100) NOT NULL,
  skill_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  certification_number VARCHAR(50),
  certification_date DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Equipment and Tools
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('tool', 'vehicle', 'device', 'safety_equipment') DEFAULT 'tool',
  model VARCHAR(100),
  serial_number VARCHAR(100),
  status ENUM('available', 'in_use', 'maintenance', 'retired') DEFAULT 'available',
  assigned_to INTEGER,
  location VARCHAR(255),
  last_maintenance DATE,
  next_maintenance DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Job Requirements (skills/equipment needed for jobs)
CREATE TABLE IF NOT EXISTS job_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER,
  work_order_id INTEGER,
  estimate_id INTEGER,
  skill_name VARCHAR(100) NOT NULL,
  skill_level_required ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  equipment_required VARCHAR(255),
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

-- Technician Availability
CREATE TABLE IF NOT EXISTS technician_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('available', 'busy', 'off', 'vacation') DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Geographic Zones for Smart Routing
CREATE TABLE IF NOT EXISTS service_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  boundary_coordinates TEXT, -- JSON array of lat/lng coordinates
  priority INTEGER DEFAULT 1,
  assigned_technicians TEXT, -- JSON array of user IDs
  travel_time_matrix TEXT, -- JSON object for travel times between points
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS technician_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  metric_type ENUM('completion_rate', 'quality_score', 'customer_satisfaction', 'efficiency', 'safety_score') NOT NULL,
  metric_value DECIMAL(5,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  job_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Smart Assignment Algorithm Results
CREATE TABLE IF NOT EXISTS assignment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  job_type ENUM('inspection', 'work_order', 'estimate') NOT NULL,
  assigned_to INTEGER,
  algorithm_score DECIMAL(8,4),
  factors_considered TEXT, -- JSON object with scoring factors
  alternative_assignments TEXT, -- JSON array of other possible assignments
  assignment_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Real-time Location Tracking (for dispatcher dashboard)
CREATE TABLE IF NOT EXISTS technician_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  battery_level INTEGER,
  is_active BOOLEAN DEFAULT 1,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_technician_skills_user_company ON technician_skills(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_technician_skills_active ON technician_skills(is_active, skill_name);
CREATE INDEX IF NOT EXISTS idx_equipment_company_status ON equipment(company_id, status);
CREATE INDEX IF NOT EXISTS idx_job_requirements_inspection ON job_requirements(inspection_id);
CREATE INDEX IF NOT EXISTS idx_job_requirements_work_order ON job_requirements(work_order_id);
CREATE INDEX IF NOT EXISTS idx_technician_availability_user_date ON technician_availability(user_id, date);
CREATE INDEX IF NOT EXISTS idx_technician_performance_user_period ON technician_performance(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_technician_locations_user_time ON technician_locations(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_assignment_logs_job ON assignment_logs(job_id, job_type);
