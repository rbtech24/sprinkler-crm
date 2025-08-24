const db = require('./src/database');
const axios = require('axios');

async function simpleTest() {
  console.log('Database functions:', Object.keys(db));
  
  try {
    // Test login directly
    console.log('🔐 Testing login endpoint...');
    const loginResponse = await axios.post('http://localhost:3006/api/auth/login', {
      email: 'test@test.com',
      password: 'test123'
    });
    
    console.log('Login response:', loginResponse.data);
  } catch (error) {
    if (error.response) {
      console.log('Login failed with:', error.response.status, error.response.data);
    } else {
      console.log('Login error:', error.message);
    }
  }
  
  // Try with different credentials
  try {
    console.log('🔐 Testing with owner credentials...');
    const loginResponse = await axios.post('http://localhost:3006/api/auth/login', {
      email: 'owner@test.com',
      password: 'test123'
    });
    
    console.log('✅ Login successful!');
    const token = loginResponse.data.token;
    
    // Test company stats endpoint
    try {
      const statsResponse = await axios.get('http://localhost:3006/api/company/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Company stats:', statsResponse.data);
    } catch (err) {
      console.log('❌ Company stats failed:', err.response?.data);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('Owner login failed with:', error.response.status, error.response.data);
    } else {
      console.log('Owner login error:', error.message);
    }
  }
}

simpleTest();