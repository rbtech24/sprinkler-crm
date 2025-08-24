const axios = require('axios');

async function testFrontendLoginFlow() {
  console.log('Testing frontend login flow...\n');
  
  try {
    // First, test if frontend is accessible
    console.log('1. Testing frontend accessibility...');
    const frontendResponse = await axios.get('http://localhost:3008/auth/login', {
      timeout: 5000,
      validateStatus: function (status) {
        return true; // Accept any status
      }
    });
    
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible at http://localhost:3008/auth/login');
    } else {
      console.log(`❌ Frontend returned status: ${frontendResponse.status}`);
      return;
    }
    
    // Test the API login directly through the frontend's expected endpoint
    console.log('\n2. Testing API login through frontend expected endpoint...');
    const loginResponse = await axios.post('http://localhost:3008/api/auth/login', {
      email: 'owner@demo.com',
      password: 'password'
    }, {
      timeout: 5000,
      validateStatus: function (status) {
        return true; // Accept any status
      }
    });
    
    if (loginResponse.status === 200) {
      console.log('✅ Login successful through frontend API proxy');
      console.log(`   User: ${loginResponse.data.user.name}`);
      console.log(`   Role: ${loginResponse.data.user.role}`);
      console.log(`   Token exists: ${!!loginResponse.data.token}`);
    } else if (loginResponse.status === 404) {
      console.log('❌ Frontend API proxy not found - likely using direct backend connection');
      console.log('   This is normal if frontend calls backend directly');
    } else {
      console.log(`❌ Login failed with status: ${loginResponse.status}`);
      console.log(`   Error: ${loginResponse.data?.error || 'Unknown error'}`);
    }
    
    // Test backend directly (which we know works)
    console.log('\n3. Testing backend API directly (for comparison)...');
    const backendResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'owner@demo.com',
      password: 'password'
    }, {
      timeout: 5000,
      validateStatus: function (status) {
        return true;
      }
    });
    
    if (backendResponse.status === 200) {
      console.log('✅ Backend API login successful');
      console.log(`   User: ${backendResponse.data.user.name}`);
      console.log(`   Role: ${backendResponse.data.user.role}`);
      console.log(`   Company: ${backendResponse.data.company.name}`);
    } else {
      console.log(`❌ Backend API failed: ${backendResponse.status}`);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`❌ Connection refused to ${error.config?.url || 'unknown URL'}`);
      console.log('   Make sure the server is running');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testFrontendLoginFlow();