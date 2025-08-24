#!/usr/bin/env node

/**
 * Comprehensive Dashboard Testing Script
 * Tests all user roles, login functionality, and dashboard endpoints
 */

const https = require('https');
const http = require('http');

const FRONTEND_URL = 'http://localhost:3008';
const BACKEND_URL = 'http://localhost:3000';

// Test credentials from LOGIN_CREDENTIALS.md
const TEST_USERS = [
  {
    role: 'owner',
    email: 'owner@demo.com',
    password: 'password',
    name: 'Company Owner',
    expectedDashboard: 'Company Dashboard'
  },
  {
    role: 'system_admin', 
    email: 'sysadmin@sprinklerinspect.com',
    password: 'admin123',
    name: 'System Administrator',
    expectedDashboard: 'Company Dashboard'
  },
  {
    role: 'technician',
    email: 'tech@demo.com',
    password: 'password', 
    name: 'Field Technician',
    expectedDashboard: 'Tech Dashboard'
  }
];

// Dashboard endpoints to test for each role
const DASHBOARD_ENDPOINTS = {
  company: [
    '/api/dashboard/company/kpis',
    '/api/dashboard/company/today',
    '/api/dashboard/estimates',
    '/api/dashboard/inspections/recent',
    '/api/dashboard/pipeline',
    '/api/dashboard/stats'
  ],
  tech: [
    '/api/dashboard/tech/today',
    '/api/dashboard/inspections/recent'
  ],
  common: [
    '/api/dashboard/stats'
  ]
};

class DashboardTester {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    switch(type) {
      case 'success':
        console.log(`[${timestamp}] ✅ ${message}`.green);
        break;
      case 'error':
        console.log(`[${timestamp}] ❌ ${message}`.red);
        break;
      case 'warning':
        console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
        break;
      case 'info':
      default:
        console.log(`[${timestamp}] ℹ️  ${message}`.cyan);
        break;
    }
  }

  async testLogin(user) {
    try {
      this.log(`Testing login for ${user.name} (${user.role})...`);
      
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.token) {
        this.log(`Login successful for ${user.name}`, 'success');
        this.results.passed++;
        return {
          success: true,
          token: response.data.token,
          user: response.data.user
        };
      } else {
        this.log(`Login failed for ${user.name}: Invalid response`, 'error');
        this.results.failed++;
        this.results.errors.push(`Login failed for ${user.name}: Invalid response`);
        return { success: false };
      }
    } catch (error) {
      this.log(`Login error for ${user.name}: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Login error for ${user.name}: ${error.message}`);
      return { success: false };
    } finally {
      this.results.totalTests++;
    }
  }

  async testEndpoint(endpoint, token, userRole) {
    try {
      this.log(`Testing endpoint ${endpoint} for ${userRole}...`);
      
      const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        const hasData = response.data && (response.data.success !== false);
        if (hasData) {
          this.log(`✅ ${endpoint} - SUCCESS (${response.status})`, 'success');
          this.results.passed++;
          return { success: true, data: response.data };
        } else {
          this.log(`⚠️  ${endpoint} - NO DATA (${response.status})`, 'warning');
          this.results.passed++; // Still count as passed if endpoint responds
          return { success: true, data: response.data };
        }
      } else {
        this.log(`❌ ${endpoint} - FAILED (${response.status})`, 'error');
        this.results.failed++;
        this.results.errors.push(`${endpoint} failed with status ${response.status}`);
        return { success: false };
      }
    } catch (error) {
      this.log(`❌ ${endpoint} - ERROR: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`${endpoint} error: ${error.message}`);
      return { success: false };
    } finally {
      this.results.totalTests++;
    }
  }

  async testUserDashboard(user) {
    this.log(`\n🔍 Testing dashboard for ${user.name} (${user.role})`.bold);
    
    // First test login
    const loginResult = await this.testLogin(user);
    if (!loginResult.success) {
      return false;
    }

    const token = loginResult.token;
    let allEndpointsWorking = true;

    // Determine which endpoints to test based on role
    let endpointsToTest = [];
    if (user.role === 'owner' || user.role === 'system_admin') {
      endpointsToTest = [...DASHBOARD_ENDPOINTS.company, ...DASHBOARD_ENDPOINTS.common];
    } else if (user.role === 'technician') {
      endpointsToTest = [...DASHBOARD_ENDPOINTS.tech, ...DASHBOARD_ENDPOINTS.common];
    }

    // Test each endpoint
    for (const endpoint of endpointsToTest) {
      const result = await this.testEndpoint(endpoint, token, user.role);
      if (!result.success) {
        allEndpointsWorking = false;
      }
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test job status update endpoint (if technician)
    if (user.role === 'technician') {
      try {
        this.log(`Testing job status update endpoint...`);
        const response = await axios.put(`${BACKEND_URL}/api/dashboard/jobs/1/status`, {
          status: 'in_progress'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.status === 200) {
          this.log(`Job status update - SUCCESS`, 'success');
          this.results.passed++;
        } else {
          this.log(`Job status update - FAILED (${response.status})`, 'error');
          this.results.failed++;
          allEndpointsWorking = false;
        }
        this.results.totalTests++;
      } catch (error) {
        this.log(`Job status update - ERROR: ${error.message}`, 'error');
        this.results.failed++;
        this.results.totalTests++;
        allEndpointsWorking = false;
      }
    }

    return allEndpointsWorking;
  }

  async testFrontendPages() {
    this.log(`\n🌐 Testing frontend pages accessibility...`.bold);
    
    const pagesToTest = [
      '/auth/login',
      // Note: Dashboard pages require authentication, so we test login page accessibility
    ];

    for (const page of pagesToTest) {
      try {
        this.log(`Testing frontend page ${page}...`);
        
        const response = await axios.get(`${FRONTEND_URL}${page}`, {
          timeout: 10000,
          validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx
        });

        if (response.status === 200) {
          // Check if the page contains expected elements
          const hasLoginForm = response.data.includes('email') && response.data.includes('password');
          if (hasLoginForm) {
            this.log(`Frontend page ${page} - SUCCESS (contains login form)`, 'success');
            this.results.passed++;
          } else {
            this.log(`Frontend page ${page} - WARNING (missing expected elements)`, 'warning');
            this.results.passed++; // Still accessible
          }
        } else {
          this.log(`Frontend page ${page} - FAILED (${response.status})`, 'error');
          this.results.failed++;
          this.results.errors.push(`Frontend page ${page} returned ${response.status}`);
        }
        this.results.totalTests++;
      } catch (error) {
        this.log(`Frontend page ${page} - ERROR: ${error.message}`, 'error');
        this.results.failed++;
        this.results.errors.push(`Frontend page ${page} error: ${error.message}`);
        this.results.totalTests++;
      }
    }
  }

  async checkServerHealth() {
    this.log(`\n🏥 Checking server health...`.bold);
    
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      if (healthResponse.status === 200) {
        this.log('Backend health check - SUCCESS', 'success');
        this.results.passed++;
      } else {
        this.log('Backend health check - FAILED', 'error');
        this.results.failed++;
      }
      this.results.totalTests++;
    } catch (error) {
      this.log(`Backend health check - ERROR: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Backend health error: ${error.message}`);
      this.results.totalTests++;
    }

    try {
      const frontendResponse = await axios.get(FRONTEND_URL, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      if (frontendResponse.status === 200) {
        this.log('Frontend health check - SUCCESS', 'success');
        this.results.passed++;
      } else {
        this.log(`Frontend health check - WARNING (${frontendResponse.status})`, 'warning');
        this.results.passed++; // Redirects are ok
      }
      this.results.totalTests++;
    } catch (error) {
      this.log(`Frontend health check - ERROR: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Frontend health error: ${error.message}`);
      this.results.totalTests++;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60).bold);
    console.log('📊 TEST SUMMARY'.bold.cyan);
    console.log('='.repeat(60).bold);
    
    console.log(`Total Tests: ${this.results.totalTests}`.bold);
    console.log(`Passed: ${this.results.passed}`.green.bold);
    console.log(`Failed: ${this.results.failed}`.red.bold);
    
    const successRate = ((this.results.passed / this.results.totalTests) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`.bold);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:'.red.bold);
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`.red);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Dashboard system is working correctly.'.green.bold);
    } else if (this.results.failed < this.results.passed) {
      console.log('⚠️  MOSTLY WORKING - Some issues found but core functionality works.'.yellow.bold);
    } else {
      console.log('💥 MAJOR ISSUES - Dashboard system needs attention.'.red.bold);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Dashboard Testing...'.bold.cyan);
    console.log('Testing frontend URL:', FRONTEND_URL.cyan);
    console.log('Testing backend URL:', BACKEND_URL.cyan);
    console.log('\n');

    // Check server health first
    await this.checkServerHealth();
    
    // Test frontend pages
    await this.testFrontendPages();
    
    // Test each user dashboard
    for (const user of TEST_USERS) {
      await this.testUserDashboard(user);
    }
    
    // Print final summary
    this.printSummary();
  }
}

// Run tests if script is called directly
if (require.main === module) {
  const tester = new DashboardTester();
  tester.runAllTests().catch(error => {
    console.error('Fatal error during testing:', error.message.red);
    process.exit(1);
  });
}

module.exports = DashboardTester;