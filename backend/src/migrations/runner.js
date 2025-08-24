const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Read and execute setup.sql
    const setupPath = path.join(__dirname, '../../database/setup.sql');
    if (fs.existsSync(setupPath)) {
      const setupSql = fs.readFileSync(setupPath, 'utf8');
      await pool.query(setupSql);
      console.log('✅ Setup SQL executed');
    }

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('✅ Schema created');
    }

    // Run migrations
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        await pool.query(migrationSql);
        console.log(`✅ Migration ${file} completed`);
      }
    }

    // Run seeds
    const seedsDir = path.join(__dirname, '../../database/seeds');
    if (fs.existsSync(seedsDir)) {
      const seedFiles = fs.readdirSync(seedsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of seedFiles) {
        const seedPath = path.join(seedsDir, file);
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await pool.query(seedSql);
        console.log(`✅ Seed ${file} completed`);
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
