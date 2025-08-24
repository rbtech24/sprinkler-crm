const axios = require('axios');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');

// Test configuration
const BASE_URL = 'http://localhost:3006';
const TEST_USER = {
  email: 'testall@example.com',
  password: 'TestPass123!',
  name: 'Test All User',
  role: 'owner',
  company_id: 6
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;
let authToken = '';

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
  passed++;
}

function fail(message) {
  log(`❌ ${message}`, 'red');
  failed++;
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
}

// Test functions
async function setupTestUser() {
  return new Promise((resolve) => {
    const db = new sqlite3.Database('data/sprinkler_repair.db');
    const hash = bcrypt.hashSync(TEST_USER.password, 10);
    
    db.run(`
      INSERT OR REPLACE INTO users (id, company_id, email, password_hash, name, role, email_verified)
      VALUES (2000, ?, ?, ?, ?, ?, 1)
    `, [TEST_USER.company_id, TEST_USER.email, hash, TEST_USER.name, TEST_USER.role], () => {
      db.close();
      resolve();
    });
  });
}

async function testHealthCheck() {
  info('Testing health check...');
  const result = await apiCall('GET', '/health');
  
  if (result.success && result.data.status === 'OK') {
    success('Health check passed');
  } else {
    fail(`Health check failed: ${JSON.stringify(result)}`);
  }
}

async function testAuthentication() {
  info('Testing authentication...');
  
  // Test login
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    success('Login successful');
  } else {
    fail(`Login failed: ${JSON.stringify(loginResult)}`);
    return;
  }
  
  // Test invalid credentials
  const invalidResult = await apiCall('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: 'wrongpassword'
  });
  
  if (!invalidResult.success && invalidResult.status === 401) {
    success('Invalid credentials properly rejected');
  } else {
    fail('Invalid credentials not properly rejected');
  }
}

async function testProtectedEndpoints() {
  info('Testing protected endpoints...');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  const endpoints = [
    { name: 'Dashboard Stats', endpoint: '/api/dashboard/stats', expectedFields: ['total_clients', 'total_sites'] },
    { name: 'Clients List', endpoint: '/api/clients', expectedFields: ['data', 'pagination'] },
    { name: 'Inspection Templates', endpoint: '/api/inspections/templates', expectedFields: [] },
    { name: 'Estimates List', endpoint: '/api/estimates', expectedFields: ['pagination'] },
    { name: 'Company Info', endpoint: '/api/company', expectedFields: [] },
    { name: 'Users List', endpoint: '/api/users', expectedFields: [] },
    { name: 'Work Orders', endpoint: '/api/work-orders', expectedFields: [] },
    { name: 'Price Books', endpoint: '/api/price-books', expectedFields: [] }
  ];
  
  for (const test of endpoints) {
    const result = await apiCall('GET', test.endpoint, null, authHeaders);
    
    if (result.success) {
      let fieldsOk = true;
      for (const field of test.expectedFields) {
        if (!result.data.hasOwnProperty(field)) {
          fieldsOk = false;
          break;
        }
      }
      
      if (fieldsOk) {
        success(`${test.name} endpoint working`);
      } else {
        fail(`${test.name} endpoint missing expected fields`);
      }
    } else {
      fail(`${test.name} endpoint failed: ${result.error}`);
    }
  }
}

async function testUnauthorizedAccess() {
  info('Testing unauthorized access...');
  
  const result = await apiCall('GET', '/api/dashboard/stats');
  
  if (!result.success && result.status === 401) {
    success('Unauthorized access properly blocked');
  } else {
    fail('Unauthorized access not properly blocked');
  }
}

async function testCrudOperations() {
  info('Testing CRUD operations...');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  // Create a client
  const clientData = {
    name: 'Test CRUD Client',
    contact_type: 'residential',
    billing_email: 'crud@test.com',
    phone: '555-CRUD-TEST'
  };
  
  const createResult = await apiCall('POST', '/api/clients', clientData, authHeaders);
  
  if (createResult.success) {
    success('Client creation successful');
    
    const clientId = createResult.data.id;
    
    // Update the client
    const updateData = { phone: '555-UPDATED' };
    const updateResult = await apiCall('PUT', `/api/clients/${clientId}`, updateData, authHeaders);
    
    if (updateResult.success) {
      success('Client update successful');
    } else {
      fail(`Client update failed: ${updateResult.error}`);
    }
    
    // Get the client
    const getResult = await apiCall('GET', `/api/clients/${clientId}`, null, authHeaders);
    
    if (getResult.success && getResult.data.phone === '555-UPDATED') {
      success('Client retrieval and update verification successful');
    } else {
      fail('Client retrieval or update verification failed');
    }
    
  } else {
    fail(`Client creation failed: ${createResult.error}`);
  }
}

async function testInputValidation() {
  info('Testing input validation...');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  // Test missing required fields
  const invalidData = { contact_type: 'residential' }; // Missing name
  const result = await apiCall('POST', '/api/clients', invalidData, authHeaders);
  
  if (!result.success && result.status === 400) {
    success('Input validation working (missing required fields)');
  } else {
    fail('Input validation not working for missing required fields');
  }
  
  // Test invalid enum values
  const invalidEnum = { 
    name: 'Test Client',
    contact_type: 'invalid_type'
  };
  const enumResult = await apiCall('POST', '/api/clients', invalidEnum, authHeaders);
  
  if (!enumResult.success) {
    success('Input validation working (invalid enum values)');
  } else {
    fail('Input validation not working for invalid enum values');
  }
}

async function testDatabasePerformance() {
  info('Testing database performance...');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  const startTime = Date.now();
  const result = await apiCall('GET', '/api/dashboard/stats', null, authHeaders);
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  
  if (result.success) {
    if (responseTime < 500) {
      success(`Database performance good (${responseTime}ms)`);
    } else if (responseTime < 1000) {
      log(`⚠️  Database performance acceptable (${responseTime}ms)`, 'yellow');
      passed++;
    } else {
      fail(`Database performance poor (${responseTime}ms)`);
    }
  } else {
    fail('Database performance test failed - endpoint not working');
  }
}

async function testConcurrency() {
  info('Testing concurrent requests...');
  const authHeaders = { 'Authorization': `Bearer ${authToken}` };
  
  const promises = [];
  const requestCount = 10;
  
  for (let i = 0; i < requestCount; i++) {
    promises.push(apiCall('GET', '/api/dashboard/stats', null, authHeaders));
  }
  
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  const successCount = results.filter(r => r.success).length;
  const totalTime = endTime - startTime;
  
  if (successCount === requestCount) {
    success(`Concurrency test passed (${requestCount} requests in ${totalTime}ms)`);
  } else {
    fail(`Concurrency test failed (${successCount}/${requestCount} requests succeeded)`);
  }
}

async function testDatabaseTables() {
  info('Testing database schema...');
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database('data/sprinkler_repair.db');
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        fail(`Database schema test failed: ${err.message}`);
        resolve();
        return;
      }
      
      const tableCount = tables.length;
      const expectedTables = ['users', 'companies', 'clients', 'sites', 'inspections', 'estimates', 'work_orders'];
      const missingTables = expectedTables.filter(table => 
        !tables.some(t => t.name === table)
      );
      
      if (missingTables.length === 0) {
        success(`Database schema complete (${tableCount} tables)`);
      } else {
        fail(`Database schema incomplete - missing tables: ${missingTables.join(', ')}`);
      }
      
      // Check indexes
      db.all("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'", (err, indexes) => {
        if (err) {
          fail(`Database indexes test failed: ${err.message}`);
        } else {
          const indexCount = indexes.length;
          if (indexCount > 20) {
            success(`Database indexes created (${indexCount} indexes)`);
          } else {
            fail(`Insufficient database indexes (${indexCount} found, expected >20)`);
          }
        }
        
        db.close();
        resolve();
      });
    });
  });
}

// Main test runner
async function runAllTests() {
  log('🧪 Starting Comprehensive API Testing...', 'cyan');
  log('==========================================', 'cyan');
  
  try {
    // Setup
    await setupTestUser();
    
    // Run tests
    await testHealthCheck();
    await testAuthentication();
    await testUnauthorizedAccess();
    await testProtectedEndpoints();
    await testCrudOperations();
    await testInputValidation();
    await testDatabasePerformance();
    await testConcurrency();
    await testDatabaseTables();
    
    // Results
    log('\n==========================================', 'cyan');
    log('📊 Test Results:', 'blue');
    log(`   ✅ Passed: ${passed}`, 'green');
    log(`   ❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    
    if (failed === 0) {
      log('\n🎉 All tests passed! API is production ready.', 'green');
      process.exit(0);
    } else {
      log('\n❌ Some tests failed. Please fix issues before production.', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests();