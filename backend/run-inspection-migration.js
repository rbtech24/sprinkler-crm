const fs = require('fs');
const path = require('path');
const { db } = require('./src/database/sqlite');

async function runInspectionMigration() {
  try {
    console.log('🚀 Running inspection system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/009_inspection_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .filter(statement => {
        const trimmed = statement.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('--') && 
               trimmed !== 'DEFAULT templates will be inserted via API when companies are created';
      });
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement && !statement.startsWith('--')) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
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
    
    console.log('✅ Inspection system migration completed successfully!');
    console.log('📊 Created tables: inspections, inspection_zones, inspection_photos, inspection_templates');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runInspectionMigration();