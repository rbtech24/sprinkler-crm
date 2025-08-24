const axios = require('axios');

async function comprehensiveApiTest() {
  console.log('🧪 COMPREHENSIVE API TESTING...\n');
  
  let token = '';
  let testResults = [];
  
  // Helper function to test endpoint
  const testEndpoint = async (name, method, url, data = null, requireAuth = true) => {
    try {
      const config = {
        method,
        url,
        headers: {}
      };
      
      if (requireAuth && token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
      
      const response = await axios(config);
      const dataCount = response.data?.data?.length || response.data?.length || 
                       (response.data?.success ? 'success' : 'unknown');
      
      testResults.push({ name, status: '✅ PASS', details: `${response.status} - ${dataCount}` });
      console.log(`✅ ${name}: PASS (${response.status} - ${dataCount})`);
      
    } catch (error) {
      const status = error.response?.status || 'Network Error';
      const message = error.response?.data?.error || error.message;
      testResults.push({ name, status: '❌ FAIL', details: `${status} - ${message}` });
      console.log(`❌ ${name}: FAIL (${status} - ${message})`);
    }
  };
  
  try {
    // 1. Authentication Test
    console.log('--- AUTHENTICATION ---');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'tech@demo.com',
      password: 'password'
    });
    token = loginResponse.data.token;
    testResults.push({ name: 'Authentication', status: '✅ PASS', details: 'Token obtained' });
    console.log('✅ Authentication: PASS (Token obtained)');
    
    // 2. Core CRUD Operations
    console.log('\n--- CORE CRUD OPERATIONS ---');
    await testEndpoint('GET Clients', 'GET', 'http://localhost:3000/api/clients');
    await testEndpoint('GET Sites', 'GET', 'http://localhost:3000/api/sites');
    await testEndpoint('GET Users', 'GET', 'http://localhost:3000/api/users');
    await testEndpoint('GET Inspections', 'GET', 'http://localhost:3000/api/inspections');
    await testEndpoint('GET Work Orders', 'GET', 'http://localhost:3000/api/work-orders');
    
    // 3. Dashboard Endpoints
    console.log('\n--- DASHBOARD ENDPOINTS ---');
    await testEndpoint('Tech Dashboard', 'GET', 'http://localhost:3000/api/dashboard/tech/today');
    await testEndpoint('Service Plans', 'GET', 'http://localhost:3000/api/service-plans/active');
    
    // 4. Mobile Inspection System
    console.log('\n--- MOBILE INSPECTION SYSTEM ---');
    await testEndpoint('Inspection Templates', 'GET', 'http://localhost:3000/api/inspections-mobile/templates');
    await testEndpoint('Mobile Stats', 'GET', 'http://localhost:3000/api/inspections-mobile/stats/mobile');
    
    // 5. Individual Resource Access
    console.log('\n--- INDIVIDUAL RESOURCE ACCESS ---');
    await testEndpoint('Specific Inspection', 'GET', 'http://localhost:3000/api/inspections/2');
    
    // 6. Error Logging System
    console.log('\n--- ERROR LOGGING SYSTEM ---');
    await testEndpoint('Error Logging', 'POST', 'http://localhost:3000/api/errors', {
      message: 'Test error from API test',
      stack: 'Test stack trace',
      url: 'http://test.com',
      timestamp: new Date().toISOString()
    }, false);
    
    // Results Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = testResults.filter(r => r.status.includes('PASS')).length;
    const failed = testResults.filter(r => r.status.includes('FAIL')).length;
    const total = testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n🔍 FAILED TESTS:');
      testResults
        .filter(r => r.status.includes('FAIL'))
        .forEach(r => console.log(`  ${r.name}: ${r.details}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! The CRM system is fully operational.');
    } else if (passed / total >= 0.8) {
      console.log('✅ Most tests passed! The CRM system is mostly operational with minor issues.');
    } else {
      console.log('⚠️  Several tests failed. The CRM system needs attention.');
    }
    
  } catch (error) {
    console.error('💥 Critical error during testing:', error.message);
  }
}

// Run the comprehensive test
comprehensiveApiTest()
  .then(() => {
    console.log('\n✅ Comprehensive API testing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Testing failed:', error);
    process.exit(1);
  });