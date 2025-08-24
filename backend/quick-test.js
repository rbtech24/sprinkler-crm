const axios = require('axios');

// Quick production readiness test
const BASE_URL = 'http://localhost:3006';

async function quickTest() {
  console.log('🚀 Quick Production Readiness Test');
  console.log('===================================');
  
  let passed = 0;
  let total = 0;
  
  // Test 1: Health Check
  total++;
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    if (health.data.status === 'OK') {
      console.log('✅ Health Check: PASS');
      passed++;
    } else {
      console.log('❌ Health Check: FAIL');
    }
  } catch (error) {
    console.log('❌ Health Check: FAIL - Server not running');
  }
  
  // Test 2: Authentication endpoint exists
  total++;
  try {
    const auth = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    console.log('❌ Authentication: FAIL - Should reject invalid credentials');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Authentication: PASS');
      passed++;
    } else {
      console.log('❌ Authentication: FAIL');
    }
  }
  
  // Test 3: Protected endpoint security
  total++;
  try {
    const protected = await axios.get(`${BASE_URL}/api/dashboard/stats`);
    console.log('❌ Security: FAIL - Should require authentication');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Security: PASS');
      passed++;
    } else {
      console.log('❌ Security: FAIL');
    }
  }
  
  // Test 4: Database connection
  total++;
  try {
    const sqlite3 = require('sqlite3');
    const db = new sqlite3.Database('./backend/data/sprinkler_repair.db');
    db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"', (err, row) => {
      if (err) {
        console.log('❌ Database: FAIL');
      } else if (row.count > 30) {
        console.log('✅ Database: PASS');
        passed++;
      } else {
        console.log('❌ Database: FAIL - Insufficient tables');
      }
      db.close();
      
      // Final results
      console.log('\n📊 Results:');
      console.log(`Passed: ${passed}/${total}`);
      
      if (passed === total) {
        console.log('🎉 All core systems operational!');
        console.log('🚀 Ready for production deployment');
      } else {
        console.log('⚠️  Some issues found - see details above');
      }
    });
  } catch (error) {
    console.log('❌ Database: FAIL - Cannot connect');
    
    // Final results
    console.log('\n📊 Results:');
    console.log(`Passed: ${passed}/${total}`);
    console.log('⚠️  Some issues found - see details above');
  }
}

quickTest();