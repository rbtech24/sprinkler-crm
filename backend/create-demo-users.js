const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createDemoUsers() {
  console.log('🔧 Creating demo users with different roles...');
  
  const db = new sqlite3.Database(path.join(__dirname, 'data', 'sprinkler_repair.db'));
  
  try {
    // First create or get demo company
    const demoCompany = await new Promise((resolve, reject) => {
      // Try to get existing demo company first
      db.get('SELECT id FROM companies WHERE name = ?', ['Demo Irrigation Services'], (err, existing) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (existing) {
          console.log(`✅ Using existing demo company ID: ${existing.id}`);
          resolve(existing);
          return;
        }
        
        // Create demo company
        console.log('Creating demo company...');
        db.run(`INSERT INTO companies (name, plan, email, phone, website, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, 
               ['Demo Irrigation Services', 'pro', 'info@demo-irrigation.com', '555-DEMO-123', 'https://demo-irrigation.com'],
               function(err) {
                 if (err) {
                   reject(err);
                 } else {
                   console.log(`✅ Created demo company with ID: ${this.lastID}`);
                   resolve({ id: this.lastID });
                 }
               });
      });
    });
    
    const companyId = demoCompany.id;
    
    // Demo users to create
    const demoUsers = [
      {
        email: 'owner@demo.com',
        password: 'password',
        name: 'Business Owner',
        role: 'owner'
      },
      {
        email: 'admin@demo.com',
        password: 'password',
        name: 'Office Admin',
        role: 'admin'
      },
      {
        email: 'dispatcher@demo.com',
        password: 'password',
        name: 'Dispatch Manager',
        role: 'dispatcher'
      },
      {
        email: 'tech@demo.com',
        password: 'password',
        name: 'Field Technician',
        role: 'technician'
      },
      {
        email: 'viewer@demo.com',
        password: 'password',
        name: 'Report Viewer',
        role: 'viewer'
      }
    ];
    
    // Create each user
    for (const user of demoUsers) {
      try {
        const passwordHash = await bcrypt.hash(user.password, 12);
        
        await new Promise((resolve, reject) => {
          // First try to update if exists, otherwise insert
          db.run(
            `INSERT OR REPLACE INTO users (
              company_id, email, password_hash, name, role, 
              created_at, updated_at, email_verified, is_active
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, 1)`,
            [companyId, user.email, passwordHash, user.name, user.role],
            function(err) {
              if (err) {
                reject(err);
              } else {
                console.log(`✅ Created/Updated ${user.role}: ${user.email}`);
                resolve(this.lastID);
              }
            }
          );
        });
        
      } catch (error) {
        console.error(`❌ Error creating user ${user.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Demo users ready! Login credentials:');
    demoUsers.forEach(user => {
      console.log(`   ${user.role.toUpperCase()}: ${user.email} / password`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error creating demo users:', error.message);
    db.close();
  }
}

createDemoUsers();
