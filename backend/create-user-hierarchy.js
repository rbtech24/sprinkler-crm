const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createUserHierarchy() {
  console.log('🏗️ Creating proper user hierarchy...');
  console.log('System Admin → Companies → (Tech + Dispatcher)');
  
  const db = new sqlite3.Database(path.join(__dirname, 'data', 'sprinkler_repair.db'));
  
  try {
    // 1. SYSTEM ADMIN - Top level system administration
    console.log('\n📊 Creating System Admin...');
    const systemAdminCompany = await createOrGetCompany(db, {
      name: 'SprinklerInspect Platform',
      plan: 'enterprise',
      email: 'admin@sprinklerinspect.com',
      phone: '555-ADMIN-SYS',
      website: 'https://sprinklerinspect.com'
    });

    await createOrUpdateUser(db, {
      email: 'sysadmin@sprinklerinspect.com',
      password: 'admin123',
      name: 'System Administrator',
      role: 'system_admin',
      company_id: systemAdminCompany.id
    });

    // 2. COMPANY ACCOUNTS - Multiple demo companies
    console.log('\n🏢 Creating Company Accounts...');
    
    // Company 1: ABC Irrigation Services
    const company1 = await createOrGetCompany(db, {
      name: 'ABC Irrigation Services',
      plan: 'pro',
      email: 'info@abc-irrigation.com',
      phone: '555-ABC-1234',
      website: 'https://abc-irrigation.com'
    });

    // Company Owner for ABC
    await createOrUpdateUser(db, {
      email: 'owner@abc-irrigation.com',
      password: 'password',
      name: 'John Smith (Owner)',
      role: 'company_owner',
      company_id: company1.id
    });

    // Tech for ABC
    await createOrUpdateUser(db, {
      email: 'tech@abc-irrigation.com', 
      password: 'password',
      name: 'Mike Johnson (Tech)',
      role: 'technician',
      company_id: company1.id
    });

    // Dispatcher for ABC
    await createOrUpdateUser(db, {
      email: 'dispatch@abc-irrigation.com',
      password: 'password', 
      name: 'Sarah Wilson (Dispatcher)',
      role: 'dispatcher',
      company_id: company1.id
    });

    // Company 2: XYZ Sprinkler Pros
    const company2 = await createOrGetCompany(db, {
      name: 'XYZ Sprinkler Pros',
      plan: 'starter',
      email: 'contact@xyz-sprinkler.com',
      phone: '555-XYZ-5678',
      website: 'https://xyz-sprinkler.com'
    });

    // Company Owner for XYZ
    await createOrUpdateUser(db, {
      email: 'owner@xyz-sprinkler.com',
      password: 'password',
      name: 'Lisa Brown (Owner)',
      role: 'company_owner',
      company_id: company2.id
    });

    // Tech for XYZ
    await createOrUpdateUser(db, {
      email: 'tech@xyz-sprinkler.com',
      password: 'password',
      name: 'David Garcia (Tech)', 
      role: 'technician',
      company_id: company2.id
    });

    // Dispatcher for XYZ
    await createOrUpdateUser(db, {
      email: 'dispatch@xyz-sprinkler.com',
      password: 'password',
      name: 'Jennifer Lee (Dispatcher)',
      role: 'dispatcher', 
      company_id: company2.id
    });

    // 3. Show hierarchy
    console.log('\n📋 User Hierarchy Created:');
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.email, u.name, u.role, c.name as company_name, c.plan
         FROM users u 
         JOIN companies c ON u.company_id = c.id 
         ORDER BY 
           CASE u.role 
             WHEN 'system_admin' THEN 1
             WHEN 'company_owner' THEN 2  
             WHEN 'dispatcher' THEN 3
             WHEN 'technician' THEN 4
           END, c.name, u.name`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log('\n🎯 SYSTEM ADMIN (Platform Level):');
    users.filter(u => u.role === 'system_admin').forEach(user => {
      console.log(`  🔐 ${user.email} - ${user.name}`);
    });

    console.log('\n🏢 COMPANY ACCOUNTS:');
    const companies = [...new Set(users.filter(u => u.role !== 'system_admin').map(u => u.company_name))];
    
    companies.forEach(companyName => {
      console.log(`\n  📊 ${companyName}:`);
      const companyUsers = users.filter(u => u.company_name === companyName);
      
      const owner = companyUsers.find(u => u.role === 'company_owner');
      if (owner) {
        console.log(`    👑 OWNER: ${owner.email} - ${owner.name}`);
      }
      
      const dispatcher = companyUsers.find(u => u.role === 'dispatcher');
      if (dispatcher) {
        console.log(`    📱 DISPATCHER: ${dispatcher.email} - ${dispatcher.name}`);
      }
      
      const techs = companyUsers.filter(u => u.role === 'technician');
      techs.forEach(tech => {
        console.log(`    🔧 TECH: ${tech.email} - ${tech.name}`);
      });
    });

    console.log('\n🔑 LOGIN CREDENTIALS (All passwords: "password" except System Admin: "admin123"):');
    console.log('\n🎯 SYSTEM ADMIN:');
    console.log('  sysadmin@sprinklerinspect.com / admin123');
    
    console.log('\n🏢 ABC IRRIGATION SERVICES:');
    console.log('  owner@abc-irrigation.com / password (Full company access)');
    console.log('  dispatch@abc-irrigation.com / password (Scheduling & dispatch)'); 
    console.log('  tech@abc-irrigation.com / password (Field technician)');

    console.log('\n🏢 XYZ SPRINKLER PROS:');
    console.log('  owner@xyz-sprinkler.com / password (Full company access)');
    console.log('  dispatch@xyz-sprinkler.com / password (Scheduling & dispatch)');
    console.log('  tech@xyz-sprinkler.com / password (Field technician)');

  } catch (error) {
    console.error('❌ Error creating user hierarchy:', error);
  } finally {
    db.close();
  }
}

async function createOrGetCompany(db, companyData) {
  return new Promise((resolve, reject) => {
    // Try to get existing company
    db.get('SELECT id FROM companies WHERE name = ?', [companyData.name], (err, existing) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (existing) {
        console.log(`  ✅ Using existing company: ${companyData.name} (ID: ${existing.id})`);
        resolve(existing);
        return;
      }
      
      // Create company
      db.run(
        `INSERT INTO companies (name, plan, email, phone, website, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [companyData.name, companyData.plan, companyData.email, companyData.phone, companyData.website],
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`  ✅ Created company: ${companyData.name} (ID: ${this.lastID})`);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });
}

async function createOrUpdateUser(db, userData) {
  return new Promise(async (resolve, reject) => {
    try {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      db.run(
        `INSERT OR REPLACE INTO users (
          company_id, email, password_hash, name, role, 
          created_at, updated_at, email_verified, is_active
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, 1)`,
        [userData.company_id, userData.email, passwordHash, userData.name, userData.role],
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`    ✅ ${userData.role}: ${userData.email}`);
            resolve(this.lastID);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

createUserHierarchy();