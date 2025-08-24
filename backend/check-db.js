const db = require('./src/database/sqlite');

async function checkTables() {
  try {
    console.log('Checking database tables...');
    const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.map(t => t.name));
    
    // Check users table structure
    const userSchema = await db.query("PRAGMA table_info(users)");
    console.log('Users table columns:', userSchema.map(col => `${col.name} (${col.type})`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTables();
