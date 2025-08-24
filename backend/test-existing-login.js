const axios = require('axios');

async function testExistingUsers() {
  const baseURL = 'http://localhost:3006/api';
  
  // Test with existing users - trying common passwords
  const testUsers = [
    { email: 'owner@abc-irrigation.com', passwords: ['password', '123456', 'admin123', 'test123', 'demo'] },
    { email: 'owner@greenvalley.com', passwords: ['password', '123456', 'admin123', 'test123', 'demo'] },
    { email: 'sysadmin@sprinklerinspect.com', passwords: ['password', '123456', 'admin123', 'test123', 'demo'] },
    { email: 'owner@demo.com', passwords: ['password', '123456', 'admin123', 'test123', 'demo'] }
  ];

  for (const user of testUsers) {
    for (const password of user.passwords) {
      try {
        console.log(`🔐 Trying ${user.email} with password: ${password}`);
        const response = await axios.post(`${baseURL}/auth/login`, {
          email: user.email,
          password: password
        });
        
        if (response.status === 200) {
          console.log(`✅ SUCCESS! Login worked for ${user.email} with password: ${password}`);
          console.log('User data:', response.data.user);
          
          // Test dashboard endpoints with this token
          const token = response.data.token;
          await testDashboardEndpoints(token, user.email);
          return; // Exit after first successful login
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.log(`❌ Unexpected error for ${user.email}:`, error.message);
        }
      }
    }
  }
  
  console.log('❌ No successful logins found with common passwords');
}

async function testDashboardEndpoints(token, userEmail) {
  const baseURL = 'http://localhost:3006/api';
  const headers = { 'Authorization': `Bearer ${token}` };
  
  console.log(`\n📊 Testing dashboard endpoints for ${userEmail}:\n`);
  
  const endpoints = [
    { name: 'Company Stats', path: '/company/stats' },
    { name: 'Clients', path: '/clients' },
    { name: 'Inspections', path: '/inspections' },
    { name: 'Estimates', path: '/estimates' },
    { name: 'Users', path: '/users' },
    { name: 'Company Info', path: '/company' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${baseURL}${endpoint.path}`, { headers });
      console.log(`✅ ${endpoint.name}: Status ${response.status}`);
      
      if (endpoint.name === 'Company Stats' && response.data) {
        console.log('   📈 Stats data:', JSON.stringify(response.data, null, 2));
      } else if (response.data?.data) {
        console.log(`   📊 Found ${response.data.data.length} items`);
      } else if (response.data?.length !== undefined) {
        console.log(`   📊 Found ${response.data.length} items`);
      }
      
      results.push({ endpoint: endpoint.name, status: 'SUCCESS', code: response.status });
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Status ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
      results.push({ endpoint: endpoint.name, status: 'FAILED', code: error.response?.status, error: error.response?.data?.error });
    }
  }
  
  console.log('\n📋 Dashboard Endpoint Test Summary:');
  console.log('='.repeat(50));
  results.forEach(result => {
    const status = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${status} ${result.endpoint}: ${result.status} (${result.code})`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });
}

testExistingUsers();