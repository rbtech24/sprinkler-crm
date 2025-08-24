const axios = require('axios');

async function testDispatchLogin() {
  console.log('Testing dispatch@abc-irrigation.com login specifically...\n');
  
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'dispatch@abc-irrigation.com',
      password: 'password'
    }, {
      timeout: 5000,
      validateStatus: function (status) {
        return true; // Accept any status code
      }
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ LOGIN SUCCESS');
      console.log(`User: ${response.data.user.name}`);
      console.log(`Email: ${response.data.user.email}`);
      console.log(`Role: ${response.data.user.role}`);
      console.log(`Company: ${response.data.company.name}`);
      console.log(`User ID: ${response.data.user.id}`);
      console.log(`Company ID: ${response.data.user.company_id}`);
      console.log(`Token (first 100 chars): ${response.data.token.substring(0, 100)}...`);
    } else {
      console.log('❌ LOGIN FAILED');
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDispatchLogin();