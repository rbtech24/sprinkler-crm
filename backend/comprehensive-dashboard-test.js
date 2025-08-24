const axios = require('axios');

async function testAllDashboardEndpoints() {
  console.log('🚀 Comprehensive Dashboard Endpoint Testing\n');
  console.log('='.repeat(60));
  
  const baseURL = 'http://localhost:3006/api';
  const testUsers = [
    { email: 'owner@demo.com', password: 'password', role: 'company_owner' },
    { email: 'sysadmin@sprinklerinspect.com', password: 'admin123', role: 'system_admin' },
    { email: 'dispatch@abc-irrigation.com', password: 'password', role: 'dispatcher' },
    { email: 'tech@abc-irrigation.com', password: 'password', role: 'technician' }
  ];

  for (const testUser of testUsers) {
    console.log(`\n🔐 Testing as ${testUser.role}: ${testUser.email}`);
    console.log('-'.repeat(50));
    
    try {
      // Login
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });

      if (loginResponse.status === 200) {
        console.log('✅ Login successful');
        const token = loginResponse.data.token;
        const user = loginResponse.data.user;
        console.log(`   User: ${user.name} (${user.role})`);
        
        // Test dashboard endpoints
        await testDashboardEndpointsForUser(token, testUser.role, baseURL);
        
      } else {
        console.log('❌ Login failed');
      }

    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Login failed - invalid credentials');
      } else {
        console.log('❌ Login error:', error.message);
      }
    }
  }
}

async function testDashboardEndpointsForUser(token, userRole, baseURL) {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Define endpoints to test based on user role
  const allEndpoints = [
    { name: 'Company Stats', path: '/company/stats', roles: ['company_owner', 'system_admin', 'admin'] },
    { name: 'Company Info', path: '/company', roles: ['company_owner', 'system_admin', 'admin'] },
    { name: 'Clients List', path: '/clients', roles: ['company_owner', 'system_admin', 'admin', 'dispatcher'] },
    { name: 'Clients (with pagination)', path: '/clients?page=1&limit=10', roles: ['company_owner', 'admin', 'dispatcher'] },
    { name: 'Inspections List', path: '/inspections', roles: ['company_owner', 'system_admin', 'admin', 'dispatcher', 'technician'] },
    { name: 'Estimates List', path: '/estimates', roles: ['company_owner', 'system_admin', 'admin', 'dispatcher'] },
    { name: 'Users List', path: '/users', roles: ['company_owner', 'system_admin', 'admin'] },
    { name: 'Price Books', path: '/price-books', roles: ['company_owner', 'admin', 'technician'] },
    { name: 'Work Orders', path: '/work-orders', roles: ['company_owner', 'admin', 'dispatcher', 'technician'] },
    { name: 'Inspection Templates', path: '/inspections/templates', roles: ['company_owner', 'admin', 'technician'] }
  ];
  
  // Filter endpoints based on user role
  const relevantEndpoints = allEndpoints.filter(endpoint => 
    endpoint.roles.includes(userRole) || endpoint.roles.includes('all')
  );
  
  console.log(`\n📊 Testing ${relevantEndpoints.length} relevant endpoints:\n`);
  
  const results = [];
  
  for (const endpoint of relevantEndpoints) {
    try {
      const response = await axios.get(`${baseURL}${endpoint.path}`, { headers });
      console.log(`✅ ${endpoint.name}: Status ${response.status}`);
      
      // Display relevant data from response
      if (endpoint.name === 'Company Stats' && response.data) {
        const stats = response.data.stats || response.data;
        console.log(`   📈 Active Users: ${stats.active_users || 0}`);
        console.log(`   👥 Total Clients: ${stats.total_clients || 0}`);
        console.log(`   📍 Total Sites: ${stats.total_sites || 0}`);
        console.log(`   📋 Total Inspections: ${stats.total_inspections || 0}`);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        console.log(`   📊 Found ${response.data.data.length} items`);
      } else if (Array.isArray(response.data)) {
        console.log(`   📊 Found ${response.data.length} items`);
      }
      
      results.push({ endpoint: endpoint.name, status: 'SUCCESS', code: response.status });
      
    } catch (error) {
      const errorCode = error.response?.status || 'ERROR';
      const errorMsg = error.response?.data?.error || error.message;
      
      if (errorCode === 401) {
        console.log(`❌ ${endpoint.name}: UNAUTHORIZED (${errorCode})`);
      } else if (errorCode === 403) {
        console.log(`❌ ${endpoint.name}: FORBIDDEN (${errorCode})`);
      } else if (errorCode === 404) {
        console.log(`❌ ${endpoint.name}: NOT FOUND (${errorCode})`);
      } else {
        console.log(`❌ ${endpoint.name}: ERROR (${errorCode}) - ${errorMsg}`);
      }
      
      results.push({ 
        endpoint: endpoint.name, 
        status: 'FAILED', 
        code: errorCode, 
        error: errorMsg 
      });
    }
  }
  
  // Summary for this user
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const failCount = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`\n📋 Summary for ${userRole}:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📊 Total tested: ${results.length}`);
  
  return results;
}

// Additional endpoint testing
async function testSpecificEndpoints() {
  console.log('\n🔧 Testing Specific Dashboard Features');
  console.log('='.repeat(60));
  
  const baseURL = 'http://localhost:3006/api';
  
  // Get a valid token first
  try {
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'owner@demo.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('\n📊 Testing dashboard-specific endpoints:\n');
    
    // Test health check
    try {
      const healthResponse = await axios.get('http://localhost:3006/health');
      console.log('✅ Health Check: Working');
    } catch (err) {
      console.log('❌ Health Check: Failed');
    }
    
    // Test endpoints with parameters
    const parameterizedTests = [
      { name: 'Clients with search', path: '/clients?search=test' },
      { name: 'Inspections with status', path: '/inspections?status=completed' },
      { name: 'Estimates with date range', path: '/estimates?start_date=2024-01-01' }
    ];
    
    for (const test of parameterizedTests) {
      try {
        const response = await axios.get(`${baseURL}${test.path}`, { headers });
        console.log(`✅ ${test.name}: Status ${response.status}`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Could not get authentication token for additional tests');
  }
}

async function main() {
  await testAllDashboardEndpoints();
  await testSpecificEndpoints();
  
  console.log('\n🎉 Dashboard endpoint testing completed!');
  console.log('='.repeat(60));
}

main().catch(console.error);