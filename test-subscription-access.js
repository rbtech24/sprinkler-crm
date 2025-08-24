const axios = require('./backend/node_modules/axios');

const API_BASE = 'http://localhost:3000';

async function testLogin(email, password, expectedPlan) {
  try {
    console.log(`\n🧪 Testing login for ${email} (expected plan: ${expectedPlan})`);
    
    // 1. Login
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email,
      password: 'admin123'
    });

    if (loginResponse.status !== 200) {
      console.log('❌ Login failed');
      return false;
    }

    const { token, user } = loginResponse.data;
    console.log('✅ Login successful');
    console.log(`   User: ${user.email} (Role: ${user.role})`);
    console.log(`   Company: ${user.company_name}`);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test dashboard stats (should work for all plans)
    try {
      const statsResponse = await axios.get(`${API_BASE}/api/dashboard/stats`, { headers });
      console.log('✅ Dashboard stats access: SUCCESS');
      console.log(`   Plan: ${statsResponse.data.subscription?.plan || 'unknown'}`);
      
      // Verify the returned plan matches expected
      const actualPlan = statsResponse.data.subscription?.plan;
      if (actualPlan !== expectedPlan) {
        console.log(`⚠️  Plan mismatch: expected ${expectedPlan}, got ${actualPlan}`);
      }
    } catch (err) {
      console.log('❌ Dashboard stats access: FAILED');
      console.log(`   Error: ${err.response?.data?.error || err.message}`);
    }

    // 3. Test CRM-only endpoint (clients) - should fail for inspection_only
    try {
      const clientsResponse = await axios.get(`${API_BASE}/api/clients`, { headers });
      if (expectedPlan === 'inspection_only') {
        console.log('❌ Clients access: UNEXPECTED SUCCESS (should have failed)');
      } else {
        console.log('✅ Clients access: SUCCESS');
      }
    } catch (err) {
      if (expectedPlan === 'inspection_only' && err.response?.status === 403) {
        console.log('✅ Clients access: CORRECTLY BLOCKED');
        console.log(`   Error: ${err.response.data.error}`);
      } else if (expectedPlan === 'full_crm') {
        console.log('❌ Clients access: FAILED (should have worked)');
        console.log(`   Error: ${err.response?.data?.error || err.message}`);
      }
    }

    // 4. Test inspection endpoints (should work for both plans)
    try {
      const inspectionsResponse = await axios.get(`${API_BASE}/api/inspections`, { headers });
      console.log('✅ Inspections access: SUCCESS');
    } catch (err) {
      console.log('❌ Inspections access: FAILED');
      console.log(`   Error: ${err.response?.data?.error || err.message}`);
    }

    return true;
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔬 Starting Subscription Access Tests\n');
  console.log('Backend URL:', API_BASE);
  
  // Test inspection_only user
  await testLogin('admin@demo.com', 'admin123', 'inspection_only');
  
  // Test full_crm user  
  await testLogin('owner@test.com', 'admin123', 'full_crm');
  
  console.log('\n✨ Tests completed');
}

runTests().catch(console.error);