-- Phase 2: Route Optimization Additional Tables
-- Add route optimization and real-time tracking capabilities

-- Route Optimizations Cache
CREATE TABLE IF NOT EXISTS route_optimizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  technician_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  date DATE NOT NULL,
  waypoints TEXT, -- JSON array of lat/lng coordinates with job info
  total_distance_miles DECIMAL(8,2),
  total_time_minutes INTEGER,
  polyline TEXT, -- Google Maps polyline for route visualization
  job_sequence TEXT, -- JSON array of job IDs in optimized order
  optimization_score DECIMAL(8,4), -- Algorithm confidence score
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(technician_id, date)
);

-- Advanced Scheduling Rules
CREATE TABLE IF NOT EXISTS scheduling_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  rule_name VARCHAR(100) NOT NULL,
  rule_type ENUM('time_window', 'skill_requirement', 'workload_limit', 'travel_limit') NOT NULL,
  conditions TEXT NOT NULL, -- JSON object with rule conditions
  actions TEXT NOT NULL, -- JSON object with actions to take
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Technician Capacity and Preferences
CREATE TABLE IF NOT EXISTS technician_capacity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  max_jobs_per_day INTEGER DEFAULT 8,
  max_hours_per_day DECIMAL(4,2) DEFAULT 8.0,
  max_travel_distance_miles INTEGER DEFAULT 50,
  preferred_start_time TIME DEFAULT '08:00:00',
  preferred_end_time TIME DEFAULT '17:00:00',
  break_duration_minutes INTEGER DEFAULT 30,
  lunch_start_time TIME DEFAULT '12:00:00',
  lunch_duration_minutes INTEGER DEFAULT 60,
  overtime_available BOOLEAN DEFAULT 0,
  weekend_available BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(user_id, day_of_week)
);

-- Service Territories/Zones
CREATE TABLE IF NOT EXISTS service_territories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  boundary_polygon TEXT, -- GeoJSON polygon defining territory
  primary_technician_id INTEGER,
  backup_technician_ids TEXT, -- JSON array of backup technician IDs
  service_types TEXT, -- JSON array of service types available in this territory
  travel_time_matrix TEXT, -- JSON object with travel times between common points
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (primary_technician_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Customer Service Time Windows
CREATE TABLE IF NOT EXISTS customer_time_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  site_id INTEGER,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- NULL = applies to all days
  preferred_start_time TIME,
  preferred_end_time TIME,
  unavailable_start_time TIME,
  unavailable_end_time TIME,
  notes TEXT,
  priority INTEGER DEFAULT 1, -- 1=preferred, 2=acceptable, 3=avoid if possible
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Job Dependencies and Sequences
CREATE TABLE IF NOT EXISTS job_dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  prerequisite_job_id INTEGER NOT NULL,
  prerequisite_job_type ENUM('inspection', 'work_order', 'estimate') NOT NULL,
  dependent_job_id INTEGER NOT NULL,
  dependent_job_type ENUM('inspection', 'work_order', 'estimate') NOT NULL,
  dependency_type ENUM('must_complete_before', 'must_complete_same_day', 'preferred_sequence') DEFAULT 'must_complete_before',
  min_gap_hours INTEGER DEFAULT 0,
  max_gap_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Real-time Updates and Notifications
CREATE TABLE IF NOT EXISTS schedule_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  technician_id INTEGER,
  job_id INTEGER NOT NULL,
  job_type ENUM('inspection', 'work_order', 'estimate') NOT NULL,
  update_type ENUM('status_change', 'time_change', 'assignment_change', 'location_update') NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notification_sent BOOLEAN DEFAULT 0,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Travel Time Cache for Distance Matrix API
CREATE TABLE IF NOT EXISTS travel_time_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  distance_miles DECIMAL(8, 2),
  duration_minutes INTEGER,
  traffic_duration_minutes INTEGER,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (datetime('now', '+24 hours')),
  api_source VARCHAR(20) DEFAULT 'google_maps'
);

-- Schedule Conflicts and Resolutions
CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  conflict_type ENUM('double_booking', 'travel_time_violation', 'skill_mismatch', 'time_window_violation') NOT NULL,
  affected_jobs TEXT, -- JSON array of job objects involved in conflict
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  suggested_resolution TEXT, -- JSON object with suggested fixes
  status ENUM('detected', 'acknowledged', 'resolved', 'ignored') DEFAULT 'detected',
  resolved_by INTEGER,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance Metrics for Algorithm Tuning
CREATE TABLE IF NOT EXISTS optimization_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  metric_date DATE NOT NULL,
  total_jobs_scheduled INTEGER DEFAULT 0,
  jobs_auto_assigned INTEGER DEFAULT 0,
  avg_assignment_confidence DECIMAL(5,2),
  total_distance_saved_miles DECIMAL(8,2),
  total_time_saved_minutes INTEGER,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  customer_satisfaction_score DECIMAL(3,2),
  algorithm_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, metric_date)
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_optimizations_tech_date ON route_optimizations(technician_id, date);
CREATE INDEX IF NOT EXISTS idx_technician_capacity_user_dow ON technician_capacity(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_service_territories_company ON service_territories(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_time_prefs_client_site ON customer_time_preferences(client_id, site_id);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_prerequisite ON job_dependencies(prerequisite_job_id, prerequisite_job_type);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_dependent ON job_dependencies(dependent_job_id, dependent_job_type);
CREATE INDEX IF NOT EXISTS idx_schedule_updates_company_time ON schedule_updates(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_travel_time_cache_coords ON travel_time_cache(origin_lat, origin_lng, destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_travel_time_cache_expires ON travel_time_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_schedule_conflicts_company_status ON schedule_conflicts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_optimization_metrics_company_date ON optimization_metrics(company_id, metric_date);

-- Triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS update_route_optimization_timestamp
  AFTER UPDATE ON route_optimizations
  FOR EACH ROW
  BEGIN
    UPDATE route_optimizations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_scheduling_rules_timestamp
  AFTER UPDATE ON scheduling_rules
  FOR EACH ROW
  BEGIN
    UPDATE scheduling_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_technician_capacity_timestamp
  AFTER UPDATE ON technician_capacity
  FOR EACH ROW
  BEGIN
    UPDATE technician_capacity SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Clean up expired travel time cache entries
CREATE TRIGGER IF NOT EXISTS cleanup_expired_travel_cache
  AFTER INSERT ON travel_time_cache
  FOR EACH ROW
  BEGIN
    DELETE FROM travel_time_cache WHERE expires_at < datetime('now');
  END;

-- Insert default capacity for existing technicians
INSERT OR IGNORE INTO technician_capacity (
  user_id, company_id, day_of_week, max_jobs_per_day, max_hours_per_day, max_travel_distance_miles
)
SELECT 
  u.id, u.company_id, dow.day_of_week, 8, 8.0, 50
FROM users u
CROSS JOIN (
  SELECT 1 as day_of_week UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL 
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 0
) dow
WHERE u.role = 'tech' AND u.is_active = 1;

-- Insert basic scheduling rules for companies
INSERT OR IGNORE INTO scheduling_rules (company_id, rule_name, rule_type, conditions, actions)
SELECT 
  id as company_id,
  'Max 8 Jobs Per Day',
  'workload_limit',
  '{"max_jobs_per_day": 8, "include_travel_time": true}',
  '{"prevent_assignment": true, "suggest_alternatives": true}'
FROM companies
WHERE deleted_at IS NULL;

INSERT OR IGNORE INTO scheduling_rules (company_id, rule_name, rule_type, conditions, actions)
SELECT 
  id as company_id,
  'Business Hours Only',
  'time_window',
  '{"start_time": "08:00", "end_time": "17:00", "days": [1,2,3,4,5]}',
  '{"prevent_assignment": true, "suggest_nearest_time": true}'
FROM companies
WHERE deleted_at IS NULL;