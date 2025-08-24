const axios = require('axios');

async function runFinalDashboardTest() {
  console.log('🎯 Final Dashboard Endpoint Test\n');
  console.log('='.repeat(50));
  
  const baseURL = 'http://localhost:3006/api';
  
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'owner@demo.com',
      password: 'password'
    });
    
    console.log('✅ Login successful!');
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log(`   User: ${user.name} (${user.role})`);
    console.log(`   Company ID: ${user.company_id}\n`);
    
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('📊 Testing Dashboard Endpoints:\n');
    
    // Test key dashboard endpoints
    const endpoints = [
      { name: 'Company Stats (Main Dashboard)', path: '/company/stats', critical: true },
      { name: 'Company Info', path: '/company', critical: true },
      { name: 'Clients List', path: '/clients', critical: true },
      { name: 'Inspections List', path: '/inspections', critical: true },
      { name: 'Estimates List', path: '/estimates', critical: true },
      { name: 'Users List', path: '/users', critical: true },
      { name: 'Price Books', path: '/price-books', critical: false },
      { name: 'Inspection Templates', path: '/inspections/templates', critical: false }
    ];
    
    let successCount = 0;
    let criticalFailures = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseURL}${endpoint.path}`, { headers });
        console.log(`✅ ${endpoint.name}: Status ${response.status}`);
        
        // Show data summary
        if (endpoint.name === 'Company Stats (Main Dashboard)') {
          const stats = response.data.stats || response.data;
          if (stats) {
            console.log(`   📈 Active Users: ${stats.active_users || 0}`);
            console.log(`   👥 Total Clients: ${stats.total_clients || 0}`);
            console.log(`   📍 Total Sites: ${stats.total_sites || 0}`);
            console.log(`   📋 Total Inspections: ${stats.total_inspections || 0}`);
          }
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          console.log(`   📊 Found ${response.data.data.length} items`);
        } else if (Array.isArray(response.data)) {
          console.log(`   📊 Found ${response.data.length} items`);
        }
        
        successCount++;
        
      } catch (error) {
        const errorCode = error.response?.status || 'ERROR';
        const errorMsg = error.response?.data?.error || error.message;
        
        console.log(`❌ ${endpoint.name}: ${errorCode} - ${errorMsg}`);
        
        if (endpoint.critical) {
          criticalFailures++;
        }
      }
    }
    
    // Test some parameterized endpoints
    console.log('\n🔍 Testing Parameterized Endpoints:\n');
    
    const paramTests = [
      { name: 'Clients with pagination', path: '/clients?page=1&limit=5' },
      { name: 'Clients with search', path: '/clients?search=test' },
      { name: 'Inspections with status filter', path: '/inspections?status=completed' }
    ];
    
    for (const test of paramTests) {
      try {
        const response = await axios.get(`${baseURL}${test.path}`, { headers });
        console.log(`✅ ${test.name}: Status ${response.status}`);
        if (response.data?.data) {
          console.log(`   📊 Found ${response.data.data.length} items`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'}`);
      }
    }
    
    // Summary
    console.log('\n📋 Test Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successful endpoints: ${successCount}/${endpoints.length}`);
    console.log(`❌ Critical failures: ${criticalFailures}`);
    
    if (criticalFailures === 0) {
      console.log('🎉 All critical dashboard endpoints working!');
    } else {
      console.log('⚠️  Some critical endpoints need attention');
    }
    
    // Test frontend startup
    console.log('\n🌐 Testing Frontend Connection:');
    console.log('='.repeat(50));
    console.log('Backend is ready for frontend connection on:');
    console.log('   API URL: http://localhost:3006/api');
    console.log('   Health check: http://localhost:3006/health');
    console.log('\nFrontend should use these credentials:');
    console.log('   Email: owner@demo.com');
    console.log('   Password: password');
    console.log('   Role: company_owner');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    }
  }
}

runFinalDashboardTest();