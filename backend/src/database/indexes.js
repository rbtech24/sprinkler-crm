const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/sprinkler_repair.db');

// Database performance indexes for SQLite
const createIndexes = () => {
  const db = new sqlite3.Database(dbPath);
  
  console.log('🔄 Creating database indexes for performance...');

  const indexes = [
    // Company-based indexes (for multi-tenancy)
    'CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_sites_company_id ON sites(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_inspections_company_id ON inspections(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_company_id ON estimates(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_company_id ON work_orders(company_id)',

    // Foreign key indexes
    'CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_inspections_site_id ON inspections(site_id)',
    'CREATE INDEX IF NOT EXISTS idx_inspections_tech_id ON inspections(tech_id)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_client_id ON estimates(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_site_id ON estimates(site_id)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_inspection_id ON estimates(inspection_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_estimate_id ON work_orders(estimate_id)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_tech_id ON work_orders(tech_id)',
    'CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id)',

    // Status indexes for filtering
    'CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)',

    // Date indexes for sorting and filtering
    'CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_at ON work_orders(scheduled_at)',

    // Email indexes for authentication
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_clients_billing_email ON clients(billing_email)',

    // Composite indexes for common queries
    'CREATE INDEX IF NOT EXISTS idx_inspections_company_status ON inspections(company_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_estimates_company_status ON estimates(company_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_work_orders_company_status ON work_orders(company_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_sites_company_client ON sites(company_id, client_id)',

    // Authentication indexes
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',

    // Service plan indexes
    'CREATE INDEX IF NOT EXISTS idx_service_plans_company_id ON service_plans(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_subscriptions_company_id ON client_subscriptions(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client_id ON client_subscriptions(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_client_subscriptions_status ON client_subscriptions(status)',
    'CREATE INDEX IF NOT EXISTS idx_service_visits_company_id ON service_visits(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_service_visits_subscription_id ON service_visits(subscription_id)',

    // Price book indexes
    'CREATE INDEX IF NOT EXISTS idx_price_books_company_id ON price_books(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_price_book_items_price_book_id ON price_book_items(price_book_id)',
    'CREATE INDEX IF NOT EXISTS idx_inspection_templates_company_id ON inspection_templates(company_id)',
  ];

  let completed = 0;
  const total = indexes.length;

  indexes.forEach((indexSql, i) => {
    db.run(indexSql, (err) => {
      if (err) {
        console.error(`❌ Error creating index ${i + 1}:`, err.message);
      } else {
        console.log(`✅ Created index ${i + 1}/${total}`);
      }
      
      completed++;
      if (completed === total) {
        console.log('✅ All database indexes created successfully!');
        console.log('🚀 Database performance optimized');
        db.close();
      }
    });
  });
};

// Analyze database performance
const analyzeDatabase = () => {
  const db = new sqlite3.Database(dbPath);
  
  console.log('📊 Analyzing database performance...');
  
  db.run('ANALYZE', (err) => {
    if (err) {
      console.error('❌ Error analyzing database:', err.message);
    } else {
      console.log('✅ Database analysis completed');
    }
    db.close();
  });
};

module.exports = {
  createIndexes,
  analyzeDatabase,
};