const { query, db } = require('./src/database/sqlite');

async function checkSchema() {
  try {
    console.log('🔍 Checking current database schema...');
    
    // Check if inspections table exists
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table' AND name='inspections'");
    
    if (tables.length > 0) {
      console.log('📋 Inspections table exists, checking columns...');
      const schema = await query("PRAGMA table_info(inspections)");
      console.log('Current inspections table columns:');
      schema.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
    } else {
      console.log('📋 No inspections table found - will create new one');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();