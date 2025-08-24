const bcrypt = require('bcryptjs');
const db = require('./src/database');

async function testDashboardEndpoints() {
  try {
    console.log('🚀 Setting up test user and testing dashboard endpoints...\n');

    // Create test company if it doesn't exist
    let companyResult;
    try {
      companyResult = await db.run(`
        INSERT INTO companies (name, email, phone, plan, created_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
      `, ['Test Company', 'test@company.com', '555-0123', 'professional']);
      console.log('✅ Created test company');
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        const existing = await db.get('SELECT id FROM companies WHERE email = ?', ['test@company.com']);
        companyResult = { id: existing.id };
        console.log('✅ Using existing test company');
      } else {
        throw err;
      }
    }

    const companyId = companyResult.id;

    // Create test users with different roles
    const password = await bcrypt.hash('test123', 12);
    const testUsers = [
      { email: 'owner@test.com', name: 'Test Owner', role: 'company_owner' },
      { email: 'admin@test.com', name: 'Test Admin', role: 'system_admin' },
      { email: 'dispatcher@test.com', name: 'Test Dispatcher', role: 'dispatcher' },
      { email: 'tech@test.com', name: 'Test Technician', role: 'technician' }
    ];

    for (const user of testUsers) {
      try {
        await db.run(`
          INSERT INTO users (company_id, email, password_hash, name, role, created_at, updated_at, email_verified)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
        `, [companyId, user.email, password, user.name, user.role]);
        console.log(`✅ Created ${user.role}: ${user.email}`);
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          console.log(`✅ User already exists: ${user.email}`);
        } else {
          throw err;
        }
      }
    }

    // Create some test data
    await createTestData(companyId);
    
    console.log('\n📊 Testing API endpoints...\n');
    await testEndpoints();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function createTestData(companyId) {
  try {
    // Create test clients  
    for (let i = 1; i <= 3; i++) {
      try {
        const clientResult = await db.run(`
          INSERT INTO clients (company_id, name, type, email, phone, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [companyId, `Test Client ${i}`, 'commercial', `client${i}@test.com`, `555-010${i}`]);

        // Create test sites for each client
        await db.run(`
          INSERT INTO sites (company_id, client_id, name, address, city, state, zip, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [companyId, clientResult.id, `Site ${i}`, `${100 + i} Test Street`, 'Test City', 'CA', '12345']);

        console.log(`✅ Created test client ${i} with site`);
      } catch (err) {
        if (err.code !== 'SQLITE_CONSTRAINT') throw err;
      }
    }

    console.log('✅ Test data created');
  } catch (error) {
    console.log('⚠️  Test data creation failed:', error.message);
  }
}

async function testEndpoints() {
  const axios = require('axios');
  const baseURL = 'http://localhost:3006/api';

  try {
    // Test login
    console.log('🔐 Testing login...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'owner@test.com',
      password: 'test123'
    });
    
    if (loginResponse.status === 200) {
      console.log('✅ Login successful');
      const token = loginResponse.data.token;
      
      // Test dashboard endpoints
      const headers = { 'Authorization': `Bearer ${token}` };
      
      console.log('\n📊 Testing dashboard endpoints:');
      
      // Test company stats (main dashboard endpoint)
      try {
        const statsResponse = await axios.get(`${baseURL}/company/stats`, { headers });
        console.log('✅ Company stats endpoint working');
        console.log('📈 Stats:', JSON.stringify(statsResponse.data, null, 2));
      } catch (err) {
        console.log('❌ Company stats failed:', err.response?.status, err.response?.data?.error);
      }

      // Test clients endpoint
      try {
        const clientsResponse = await axios.get(`${baseURL}/clients`, { headers });
        console.log('✅ Clients endpoint working');
        console.log('👥 Clients count:', clientsResponse.data.data?.length || 0);
      } catch (err) {
        console.log('❌ Clients endpoint failed:', err.response?.status, err.response?.data?.error);
      }

      // Test inspections endpoint
      try {
        const inspectionsResponse = await axios.get(`${baseURL}/inspections`, { headers });
        console.log('✅ Inspections endpoint working');
        console.log('📋 Inspections count:', inspectionsResponse.data.data?.length || 0);
      } catch (err) {
        console.log('❌ Inspections endpoint failed:', err.response?.status, err.response?.data?.error);
      }

      // Test estimates endpoint
      try {
        const estimatesResponse = await axios.get(`${baseURL}/estimates`, { headers });
        console.log('✅ Estimates endpoint working');
        console.log('💰 Estimates count:', estimatesResponse.data.data?.length || 0);
      } catch (err) {
        console.log('❌ Estimates endpoint failed:', err.response?.status, err.response?.data?.error);
      }

      // Test users endpoint
      try {
        const usersResponse = await axios.get(`${baseURL}/users`, { headers });
        console.log('✅ Users endpoint working');
        console.log('👤 Users count:', usersResponse.data?.length || 0);
      } catch (err) {
        console.log('❌ Users endpoint failed:', err.response?.status, err.response?.data?.error);
      }

      console.log('\n✅ Dashboard endpoint testing completed!');
      
    } else {
      console.log('❌ Login failed:', loginResponse.status);
    }

  } catch (error) {
    console.error('❌ API testing failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
  }
}

testDashboardEndpoints();