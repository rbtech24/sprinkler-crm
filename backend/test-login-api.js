const axios = require('axios');

async function testLoginAPI() {
  const testCredentials = [
    { email: 'owner@demo.com', password: 'password', role: 'owner' },
    { email: 'tech@demo.com', password: 'password', role: 'technician' },
    { email: 'sysadmin@sprinklerinspect.com', password: 'admin123', role: 'system_admin' },
    { email: 'dispatch@abc-irrigation.com', password: 'password', role: 'dispatcher' }
  ];

  console.log('Testing login API endpoints...\n');

  for (const creds of testCredentials) {
    console.log(`=== Testing ${creds.email} (${creds.role}) ===`);
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email: creds.email,
        password: creds.password
      }, {
        timeout: 5000,
        validateStatus: function (status) {
          // Accept any status code for testing
          return true;
        }
      });

      if (response.status === 200) {
        console.log('✅ LOGIN SUCCESS');
        console.log(`   User: ${response.data.user.name}`);
        console.log(`   Role: ${response.data.user.role}`);
        console.log(`   Company: ${response.data.company.name}`);
        console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
      } else {
        console.log(`❌ LOGIN FAILED (${response.status})`);
        console.log(`   Error: ${response.data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ SERVER NOT RUNNING - Please start the backend server');
        break;
      } else if (error.code === 'ETIMEDOUT') {
        console.log('❌ REQUEST TIMEOUT - Server may be slow');
      } else {
        console.log(`❌ REQUEST ERROR: ${error.message}`);
      }
    }
    
    console.log('');
  }
}

testLoginAPI();