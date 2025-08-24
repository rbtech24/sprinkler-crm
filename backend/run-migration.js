const fs = require('fs');
const path = require('path');
const { db } = require('./src/database/sqlite');

async function runMigration() {
  try {
    console.log('🚀 Running trial system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/008_trial_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements and execute them
    const statements = migrationSQL.split(';').filter(statement => statement.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}`);
        await new Promise((resolve, reject) => {
          db.run(statement, (err) => {
            if (err) {
              console.error(`Error in statement ${i + 1}:`, err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();