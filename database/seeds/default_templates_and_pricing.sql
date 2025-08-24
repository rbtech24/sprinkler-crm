-- Seed data for Sprinkler Repair SaaS
-- Run after schema.sql

-- Default Inspection Templates
INSERT INTO inspection_templates (
  id, 
  company_id, 
  name, 
  code, 
  schema_json, 
  callouts_json,
  is_active
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000', -- Global template
  'Repair Focused',
  'repair_focused',
  '{
    "version": 1,
    "sections": [
      {
        "key": "controller",
        "label": "Controller Information",
        "fields": [
          {"key": "model", "type": "text", "label": "Controller Model", "required": false},
          {"key": "zones", "type": "number", "label": "Number of Zones", "required": true, "min": 1, "max": 50},
          {"key": "has_master_valve", "type": "boolean", "label": "Master Valve Present", "default": false},
          {"key": "sensors", "type": "multiselect", "label": "Sensors", "options": ["Rain", "Flow", "Soil", "Weather Station"]}
        ]
      },
      {
        "key": "system_overview",
        "label": "System Overview",
        "fields": [
          {"key": "system_type", "type": "select", "label": "System Type", "options": ["Spray", "Drip", "Mixed"], "required": true},
          {"key": "water_source", "type": "select", "label": "Water Source", "options": ["Municipal", "Well", "Reclaimed"], "required": true},
          {"key": "backflow_device", "type": "select", "label": "Backflow Device", "options": ["RPZ", "PVB", "DC", "None"], "required": true}
        ]
      },
      {
        "key": "zone_inspection",
        "label": "Zone-by-Zone Inspection",
        "repeatable": true,
        "fields": [
          {"key": "zone_number", "type": "number", "label": "Zone Number", "required": true},
          {"key": "area_label", "type": "text", "label": "Area Description", "placeholder": "e.g., Front Lawn, Parking Strip"},
          {"key": "head_count", "type": "number", "label": "Number of Heads", "min": 0},
          {"key": "head_type", "type": "select", "label": "Head Type", "options": ["spray", "rotor", "drip", "bubbler", "unknown"]},
          {"key": "pressure_ok", "type": "boolean", "label": "Adequate Pressure", "default": true},
          {"key": "coverage_ok", "type": "boolean", "label": "Good Coverage", "default": true}
        ]
      }
    ]
  }',
  '{
    "version": 1,
    "callouts": [
      {
        "code": "BROKEN_HEAD",
        "label": "Broken Spray Head",
        "description": "Spray head is cracked, broken, or missing",
        "severityDefault": "medium",
        "applicableDevices": ["spray", "rotor"],
        "mapsTo": [
          {"sku": "HEAD-SPRAY-2IN", "qty": 1, "description": "2\" Spray Head Replacement"},
          {"sku": "LABOR-REPLACE-HEAD", "qty": 0.25, "description": "Labor - Replace Head (15 min)"}
        ]
      },
      {
        "code": "LEAK_AT_VALVE",
        "label": "Leak at Valve",
        "description": "Water leak detected at valve box",
        "severityDefault": "high",
        "applicableDevices": ["valve"],
        "mapsTo": [
          {"sku": "VALVE-1IN", "qty": 1, "description": "1\" Control Valve"},
          {"sku": "LABOR-VALVE-REPLACE", "qty": 1.5, "description": "Labor - Valve Replacement (1.5 hrs)"}
        ]
      },
      {
        "code": "CLOGGED_HEAD",
        "label": "Clogged Spray Head",
        "description": "Head not spraying properly due to debris",
        "severityDefault": "low",
        "applicableDevices": ["spray", "rotor"],
        "mapsTo": [
          {"sku": "LABOR-CLEAN-HEAD", "qty": 0.1, "description": "Labor - Clean Head (6 min)"}
        ]
      },
      {
        "code": "MISALIGNED_HEAD",
        "label": "Misaligned Head",
        "description": "Head is not aimed properly",
        "severityDefault": "low",
        "applicableDevices": ["spray", "rotor"],
        "mapsTo": [
          {"sku": "LABOR-ADJUST-HEAD", "qty": 0.05, "description": "Labor - Adjust Head (3 min)"}
        ]
      },
      {
        "code": "LOW_PRESSURE",
        "label": "Low Water Pressure",
        "description": "Insufficient pressure affecting coverage",
        "severityDefault": "medium",
        "applicableDevices": ["valve", "controller"],
        "mapsTo": [
          {"sku": "LABOR-PRESSURE-DIAG", "qty": 0.5, "description": "Labor - Pressure Diagnosis (30 min)"}
        ]
      },
      {
        "code": "BROKEN_PIPE",
        "label": "Broken Pipe",
        "description": "Underground pipe break or leak",
        "severityDefault": "high",
        "applicableDevices": ["valve"],
        "mapsTo": [
          {"sku": "PIPE-1IN-PVC", "qty": 5, "description": "1\" PVC Pipe (5 ft estimate)"},
          {"sku": "FITTING-COUPLER", "qty": 2, "description": "PVC Couplers"},
          {"sku": "LABOR-PIPE-REPAIR", "qty": 2, "description": "Labor - Pipe Repair (2 hrs)"}
        ]
      }
    ]
  }',
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000', -- Global template
  'Conservation Focused',
  'conservation_focused',
  '{
    "version": 1,
    "sections": [
      {
        "key": "controller",
        "label": "Controller Settings",
        "fields": [
          {"key": "model", "type": "text", "label": "Controller Model"},
          {"key": "zones", "type": "number", "label": "Number of Zones", "required": true},
          {"key": "has_weather_station", "type": "boolean", "label": "Weather Station Connected"},
          {"key": "has_rain_sensor", "type": "boolean", "label": "Rain Sensor Installed"},
          {"key": "has_soil_sensor", "type": "boolean", "label": "Soil Moisture Sensor"}
        ]
      },
      {
        "key": "current_program",
        "label": "Current Watering Program",
        "fields": [
          {"key": "days_per_week", "type": "number", "label": "Days per Week", "min": 1, "max": 7},
          {"key": "start_times", "type": "list", "label": "Start Times", "itemType": "time"},
          {"key": "seasonal_adjust", "type": "number", "label": "Seasonal Adjustment %", "min": 0, "max": 200}
        ]
      },
      {
        "key": "zone_settings",
        "label": "Zone Settings",
        "repeatable": true,
        "fields": [
          {"key": "zone_number", "type": "number", "label": "Zone Number", "required": true},
          {"key": "area_sqft", "type": "number", "label": "Area (sq ft)", "min": 0},
          {"key": "plant_type", "type": "select", "label": "Plant Type", "options": ["Grass", "Shrubs", "Trees", "Flowers", "Vegetables", "Mixed"]},
          {"key": "sun_exposure", "type": "select", "label": "Sun Exposure", "options": ["Full Sun", "Partial Sun", "Shade"]},
          {"key": "soil_type", "type": "select", "label": "Soil Type", "options": ["Clay", "Sand", "Loam", "Rocky"]},
          {"key": "current_runtime", "type": "number", "label": "Current Runtime (minutes)", "min": 0},
          {"key": "precipitation_rate", "type": "number", "label": "Precipitation Rate (in/hr)", "min": 0, "step": 0.1}
        ]
      }
    ],
    "computed": [
      {
        "key": "estimated_water_usage_gal_per_week",
        "from": "zone_settings",
        "function": "calculateWeeklyWaterUsage"
      },
      {
        "key": "potential_savings_gal_per_week", 
        "from": "zone_settings",
        "function": "calculatePotentialSavings"
      }
    ]
  }',
  '{
    "version": 1,
    "callouts": [
      {
        "code": "OVERWATERING_DETECTED",
        "label": "Overwatering Detected",
        "description": "Zone runtime exceeds recommended levels for plant type",
        "severityDefault": "medium",
        "mapsTo": [
          {"sku": "LABOR-PROGRAM-ADJUST", "qty": 0.25, "description": "Labor - Program Adjustment (15 min)"}
        ]
      },
      {
        "code": "NO_RAIN_SENSOR",
        "label": "Missing Rain Sensor",
        "description": "Rain sensor not installed - potential water waste",
        "severityDefault": "medium",
        "mapsTo": [
          {"sku": "RAIN-SENSOR-WIRELESS", "qty": 1, "description": "Wireless Rain Sensor"},
          {"sku": "LABOR-SENSOR-INSTALL", "qty": 1, "description": "Labor - Sensor Installation (1 hr)"}
        ]
      },
      {
        "code": "INEFFICIENT_HEADS",
        "label": "Inefficient Spray Heads",
        "description": "Standard heads could be upgraded to high-efficiency",
        "severityDefault": "low",
        "mapsTo": [
          {"sku": "HEAD-HE-SPRAY", "qty": 1, "description": "High-Efficiency Spray Head"},
          {"sku": "LABOR-REPLACE-HEAD", "qty": 0.25, "description": "Labor - Replace Head (15 min)"}
        ]
      },
      {
        "code": "POOR_UNIFORMITY",
        "label": "Poor Water Distribution",
        "description": "Uneven coverage leading to overwatering in some areas",
        "severityDefault": "medium",
        "mapsTo": [
          {"sku": "LABOR-UNIFORMITY-TEST", "qty": 1, "description": "Labor - Uniformity Testing (1 hr)"},
          {"sku": "HEAD-ADJUSTMENT", "qty": 4, "description": "Head Adjustments (avg 4 per zone)"}
        ]
      },
      {
        "code": "SMART_CONTROLLER_UPGRADE",
        "label": "Smart Controller Recommended",
        "description": "Weather-based controller would optimize watering",
        "severityDefault": "low",
        "mapsTo": [
          {"sku": "CONTROLLER-SMART-12STN", "qty": 1, "description": "12-Station Smart Controller"},
          {"sku": "LABOR-CONTROLLER-INSTALL", "qty": 3, "description": "Labor - Controller Installation (3 hrs)"}
        ]
      }
    ]
  }',
  true
);

-- Default Price Book Items (for seeding new companies)
-- These will be copied to each new company's price book during onboarding

CREATE TEMP TABLE default_price_items (
  sku text,
  name text,
  category text,
  description text,
  unit item_unit,
  cost_cents int,
  price_cents int
);

INSERT INTO default_price_items VALUES
-- Spray Heads
('HEAD-SPRAY-2IN', '2" Spray Head', 'Heads', 'Standard 2" pop-up spray head', 'each', 250, 500),
('HEAD-SPRAY-4IN', '4" Spray Head', 'Heads', 'Standard 4" pop-up spray head', 'each', 350, 700),
('HEAD-HE-SPRAY', 'High-Efficiency Spray Head', 'Heads', 'Water-saving spray head with pressure regulation', 'each', 450, 900),
('HEAD-ROTOR-4IN', '4" Rotor Head', 'Heads', 'Gear-driven rotor head', 'each', 1200, 2400),
('HEAD-ROTOR-6IN', '6" Rotor Head', 'Heads', 'Large area rotor head', 'each', 1800, 3600),

-- Valves
('VALVE-1IN', '1" Control Valve', 'Valves', 'Standard 1" irrigation control valve', 'each', 2500, 5000),
('VALVE-1-5IN', '1.5" Control Valve', 'Valves', 'Heavy duty 1.5" control valve', 'each', 3500, 7000),
('VALVE-BOX-STD', 'Standard Valve Box', 'Valves', '10" round valve box with lid', 'each', 800, 1600),
('VALVE-BOX-JUMBO', 'Jumbo Valve Box', 'Valves', '12" round valve box with lid', 'each', 1200, 2400),

-- Controllers
('CONTROLLER-6STN', '6-Station Controller', 'Controllers', 'Basic 6-station irrigation controller', 'each', 8000, 16000),
('CONTROLLER-12STN', '12-Station Controller', 'Controllers', 'Standard 12-station controller', 'each', 12000, 24000),
('CONTROLLER-SMART-12STN', 'Smart 12-Station Controller', 'Controllers', 'Weather-based smart controller', 'each', 25000, 50000),

-- Sensors
('RAIN-SENSOR-WIRED', 'Wired Rain Sensor', 'Sensors', 'Wired rain sensor with bypass switch', 'each', 2000, 4000),
('RAIN-SENSOR-WIRELESS', 'Wireless Rain Sensor', 'Sensors', 'Wireless rain sensor', 'each', 3500, 7000),
('SOIL-SENSOR', 'Soil Moisture Sensor', 'Sensors', 'In-ground soil moisture sensor', 'each', 8000, 16000),

-- Pipes and Fittings
('PIPE-1IN-PVC', '1" PVC Pipe', 'Pipes', 'Class 200 PVC pipe', 'foot', 150, 300),
('PIPE-1-5IN-PVC', '1.5" PVC Pipe', 'Pipes', 'Class 200 PVC pipe', 'foot', 200, 400),
('FITTING-COUPLER', 'PVC Coupler', 'Fittings', 'Standard PVC coupler', 'each', 100, 200),
('FITTING-ELBOW-90', '90° Elbow', 'Fittings', 'PVC 90-degree elbow', 'each', 150, 300),
('FITTING-TEE', 'PVC Tee', 'Fittings', 'PVC tee fitting', 'each', 200, 400),

-- Labor
('LABOR-REPLACE-HEAD', 'Replace Head', 'Labor', 'Labor to replace spray head or rotor', 'hour', 0, 7500),
('LABOR-CLEAN-HEAD', 'Clean Head', 'Labor', 'Labor to clean clogged head', 'hour', 0, 7500),
('LABOR-ADJUST-HEAD', 'Adjust Head', 'Labor', 'Labor to adjust head alignment/arc', 'hour', 0, 7500),
('LABOR-VALVE-REPLACE', 'Replace Valve', 'Labor', 'Labor to replace irrigation valve', 'hour', 0, 7500),
('LABOR-PIPE-REPAIR', 'Pipe Repair', 'Labor', 'Labor for pipe break repair', 'hour', 0, 7500),
('LABOR-CONTROLLER-INSTALL', 'Controller Installation', 'Labor', 'Labor to install new controller', 'hour', 0, 7500),
('LABOR-SENSOR-INSTALL', 'Sensor Installation', 'Labor', 'Labor to install sensors', 'hour', 0, 7500),
('LABOR-PROGRAM-ADJUST', 'Program Adjustment', 'Labor', 'Labor to adjust watering program', 'hour', 0, 7500),
('LABOR-PRESSURE-DIAG', 'Pressure Diagnosis', 'Labor', 'Labor to diagnose pressure issues', 'hour', 0, 7500),
('LABOR-UNIFORMITY-TEST', 'Uniformity Testing', 'Labor', 'Labor to perform catch cup test', 'hour', 0, 7500),

-- Backflow Prevention
('BACKFLOW-RPZ-1IN', '1" RPZ Valve', 'Backflow', 'Reduced pressure zone backflow preventer', 'each', 15000, 30000),
('BACKFLOW-PVB-1IN', '1" PVB Valve', 'Backflow', 'Pressure vacuum breaker', 'each', 8000, 16000),

-- Miscellaneous
('HEAD-ADJUSTMENT', 'Head Adjustment', 'Service', 'Minor head adjustment/cleaning', 'each', 0, 500),
('WIRE-14GA', '14 AWG Wire', 'Electrical', 'Direct burial irrigation wire', 'foot', 50, 100),
('WIRE-NUT', 'Wire Nut', 'Electrical', 'Waterproof wire connector', 'each', 25, 50);

-- Function to copy default price items to a company (called during company setup)
CREATE OR REPLACE FUNCTION create_default_price_book(company_uuid uuid)
RETURNS uuid AS $$
DECLARE
    price_book_uuid uuid;
    item record;
BEGIN
    -- Create default price book for company
    INSERT INTO price_books (company_id, name, description, is_active)
    VALUES (company_uuid, 'Default Price Book', 'Standard pricing for irrigation services and parts', true)
    RETURNING id INTO price_book_uuid;
    
    -- Copy all default items to this price book
    FOR item IN SELECT * FROM default_price_items LOOP
        INSERT INTO price_book_items (
            company_id, 
            price_book_id, 
            sku, 
            name, 
            category, 
            description, 
            unit, 
            cost_cents, 
            price_cents,
            is_active
        ) VALUES (
            company_uuid,
            price_book_uuid,
            item.sku,
            item.name,
            item.category,
            item.description,
            item.unit,
            item.cost_cents,
            item.price_cents,
            true
        );
    END LOOP;
    
    RETURN price_book_uuid;
END;
$$ LANGUAGE plpgsql;

DROP TABLE default_price_items;
