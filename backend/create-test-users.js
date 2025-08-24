const { run, query, get } = require('./src/database/sqlite');
const bcrypt = require('bcrypt');

async function createTestUsers() {
  try {
    console.log('🚀 Creating test users for all dashboard types...');
    
    // Check if test company exists
    let testCompany = await get('SELECT * FROM companies WHERE name = ?', ['Test Irrigation Company']);
    
    if (!testCompany) {
      // Create test company with trial
      const companyResult = await run(`
        INSERT INTO companies (
          name, 
          email, 
          phone, 
          created_at,
          trial_starts_at,
          trial_ends_at,
          subscription_status,
          subscription_plan
        ) VALUES (?, ?, ?, datetime('now'), datetime('now'), datetime('now', '+7 days'), 'trial', 'trial')
      `, ['Test Irrigation Company', 'test@company.com', '555-0123']);
      
      testCompany = { id: companyResult.lastID };
      console.log(`✅ Created test company (ID: ${testCompany.id})`);
    }
    
    // Hash password for all test users
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Test users to create
    const testUsers = [
      {
        email: 'admin@test.com',
        name: 'Company Admin',
        role: 'admin',
        description: 'Company Admin Dashboard - Full company management'
      },
      {
        email: 'owner@test.com', 
        name: 'Company Owner',
        role: 'owner',
        description: 'Company Owner Dashboard - Business overview'
      },
      {
        email: 'dispatcher@test.com',
        name: 'Dispatch Manager',
        role: 'dispatcher', 
        description: 'Dispatcher Dashboard - Real-time technician tracking and job assignment'
      },
      {
        email: 'tech@test.com',
        name: 'Field Technician',
        role: 'technician',
        description: 'Mobile Tech PWA - Service plans, inspections, mobile-first interface'
      },
      {
        email: 'manager@test.com',
        name: 'Operations Manager', 
        role: 'manager',
        description: 'Manager Dashboard - Operations oversight'
      }
    ];
    
    // Create system admin (using the test company)
    const systemAdminExists = await get('SELECT * FROM users WHERE email = ?', ['sysadmin@test.com']);
    if (!systemAdminExists) {
      await run(`
        INSERT INTO users (
          email, 
          password_hash, 
          name, 
          role, 
          company_id,
          email_verified,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, ['sysadmin@test.com', hashedPassword, 'System Administrator', 'system_admin', testCompany.id, 1]);
      
      console.log('✅ Created System Admin user');
    }
    
    // Create company users
    for (const user of testUsers) {
      const existingUser = await get('SELECT * FROM users WHERE email = ?', [user.email]);
      
      if (!existingUser) {
        await run(`
          INSERT INTO users (
            email, 
            password_hash, 
            name, 
            role, 
            company_id,
            email_verified,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [user.email, hashedPassword, user.name, user.role, testCompany.id, 1]);
        
        console.log(`✅ Created ${user.role} user: ${user.email}`);
      }
    }
    
    // Create some test clients for the company
    const testClients = [
      { name: 'Greenfield Resort', email: 'contact@greenfield.com', phone: '555-0201' },
      { name: 'Sunset Golf Club', email: 'manager@sunsetgolf.com', phone: '555-0202' },
      { name: 'Downtown Office Complex', email: 'facilities@downtown.com', phone: '555-0203' }
    ];
    
    for (const client of testClients) {
      const existingClient = await get('SELECT * FROM clients WHERE email = ? AND company_id = ?', [client.email, testCompany.id]);
      
      if (!existingClient) {
        await run(`
          INSERT INTO clients (
            company_id,
            name,
            email, 
            phone,
            created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [testCompany.id, client.name, client.email, client.phone]);
        
        console.log(`✅ Created test client: ${client.name}`);
      }
    }
    
    console.log('\n🎉 Test users created successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('=====================');
    console.log('🌐 Frontend: http://localhost:3008');
    console.log('🔧 Backend: http://localhost:3000');
    console.log('Password for all users: password123\n');
    
    console.log('👤 SYSTEM ADMIN DASHBOARD:');
    console.log('Email: sysadmin@test.com');
    console.log('Role: System Administrator');
    console.log('Features: SaaS management, trial monitoring, company oversight\n');
    
    console.log('🏢 COMPANY ADMIN DASHBOARD:');
    console.log('Email: admin@test.com');
    console.log('Role: Company Admin');
    console.log('Features: Full company management, all inspections, reports\n');
    
    console.log('👑 COMPANY OWNER DASHBOARD:');
    console.log('Email: owner@test.com');  
    console.log('Role: Company Owner');
    console.log('Features: Business overview, high-level analytics\n');
    
    console.log('📡 DISPATCHER DASHBOARD:');
    console.log('Email: dispatcher@test.com');
    console.log('Role: Dispatcher');
    console.log('Features: Live tech tracking, job assignment, route optimization\n');
    
    console.log('🔧 MANAGER DASHBOARD:');
    console.log('Email: manager@test.com');
    console.log('Role: Operations Manager'); 
    console.log('Features: Operations oversight, team management\n');
    
    console.log('📱 MOBILE TECH PWA:');
    console.log('Email: tech@test.com');
    console.log('Role: Field Technician');
    console.log('Features: Mobile inspections, service plan sales, PWA interface');
    console.log('Dashboard: Redirects to /tech (mobile-optimized)\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();