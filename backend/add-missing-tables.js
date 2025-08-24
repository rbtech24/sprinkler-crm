const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/sprinkler_repair.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding missing database tables...\n');

// Create inspection_templates table
db.run(`
  CREATE TABLE IF NOT EXISTS inspection_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    schema_json TEXT, -- JSON for form fields
    callouts_json TEXT, -- JSON for callout definitions
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating inspection_templates table:', err);
  } else {
    console.log('✅ Created inspection_templates table');
    
    // Insert sample templates
    const sampleTemplates = [
      {
        company_id: 6, // Test company
        name: 'Standard Irrigation Inspection',
        code: 'STD_IRR',
        description: 'Standard irrigation system inspection checklist',
        schema_json: JSON.stringify({
          sections: [
            { name: 'System Overview', fields: ['pressure', 'coverage', 'controller'] },
            { name: 'Zone Inspection', fields: ['heads', 'pipes', 'valves'] }
          ]
        }),
        callouts_json: JSON.stringify({
          codes: {
            'H1': 'Broken sprinkler head',
            'P1': 'Pipe leak detected',
            'V1': 'Valve malfunction'
          }
        })
      },
      {
        company_id: 6,
        name: 'Commercial System Audit',
        code: 'COMM_AUDIT',
        description: 'Comprehensive commercial irrigation audit',
        schema_json: JSON.stringify({
          sections: [
            { name: 'Water Management', fields: ['flow_rate', 'efficiency', 'schedule'] },
            { name: 'Hardware Inspection', fields: ['controllers', 'sensors', 'distribution'] }
          ]
        }),
        callouts_json: JSON.stringify({
          codes: {
            'E1': 'Efficiency issue',
            'S1': 'Sensor malfunction',
            'C1': 'Controller problem'
          }
        })
      }
    ];

    sampleTemplates.forEach((template, index) => {
      db.run(`
        INSERT INTO inspection_templates (company_id, name, code, description, schema_json, callouts_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [template.company_id, template.name, template.code, template.description, template.schema_json, template.callouts_json], (err) => {
        if (err && err.code !== 'SQLITE_CONSTRAINT') {
          console.error(`Error inserting template ${index + 1}:`, err);
        } else if (!err) {
          console.log(`   ✅ Added sample template: ${template.name}`);
        }
      });
    });
  }
});

// Create estimate_items table
db.run(`
  CREATE TABLE IF NOT EXISTS estimate_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL,
    category TEXT,
    sku TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estimate_id) REFERENCES estimates (id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating estimate_items table:', err);
  } else {
    console.log('✅ Created estimate_items table');
  }
});

// Create price_books table
db.run(`
  CREATE TABLE IF NOT EXISTS price_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating price_books table:', err);
  } else {
    console.log('✅ Created price_books table');
    
    // Insert default price book
    db.run(`
      INSERT INTO price_books (company_id, name, description, is_default)
      VALUES (6, 'Standard Pricing', 'Default price book for irrigation services', 1)
    `, (err) => {
      if (err && err.code !== 'SQLITE_CONSTRAINT') {
        console.error('Error inserting default price book:', err);
      } else if (!err) {
        console.log('   ✅ Added default price book');
      }
    });
  }
});

// Create price_book_items table
db.run(`
  CREATE TABLE IF NOT EXISTS price_book_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price_book_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'each',
    price_cents INTEGER NOT NULL,
    cost_cents INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (price_book_id) REFERENCES price_books (id)
  )
`, (err) => {
  if (err) {
    console.error('Error creating price_book_items table:', err);
  } else {
    console.log('✅ Created price_book_items table');
    
    // Insert sample price book items
    const sampleItems = [
      { sku: 'SPR-001', name: 'Standard Spray Head', category: 'Sprinkler Heads', price_cents: 1250, cost_cents: 650 },
      { sku: 'SPR-002', name: 'Rotor Head - 15ft', category: 'Sprinkler Heads', price_cents: 2500, cost_cents: 1200 },
      { sku: 'PIPE-001', name: 'PVC Pipe 3/4"', category: 'Piping', unit: 'ft', price_cents: 125, cost_cents: 75 },
      { sku: 'VAL-001', name: 'Zone Control Valve', category: 'Valves', price_cents: 4500, cost_cents: 2200 },
      { sku: 'CTRL-001', name: 'Smart Controller - 8 Zone', category: 'Controllers', price_cents: 25000, cost_cents: 15000 }
    ];

    sampleItems.forEach((item, index) => {
      db.run(`
        INSERT INTO price_book_items (price_book_id, sku, name, category, unit, price_cents, cost_cents)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `, [item.sku, item.name, item.category, item.unit || 'each', item.price_cents, item.cost_cents], (err) => {
        if (err && err.code !== 'SQLITE_CONSTRAINT') {
          console.error(`Error inserting item ${index + 1}:`, err);
        } else if (!err) {
          console.log(`   ✅ Added sample item: ${item.name}`);
        }
      });
    });
  }
});

// Close database after all operations
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('\n🎉 Database tables created successfully!');
      console.log('Ready to test dashboard endpoints.');
    }
  });
}, 2000); // Wait for all insertions to complete