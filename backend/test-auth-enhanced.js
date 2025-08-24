// Enhanced Authentication System Test
const API_BASE = 'http://localhost:3000/api';

class AuthTester {
  constructor() {
    this.testResults = [];
  }

  async log(message, success = true) {
    const timestamp = new Date().toISOString();
    const status = success ? '✅' : '❌';
    const logMessage = `${timestamp} ${status} ${message}`;
    console.log(logMessage);
    this.testResults.push({ timestamp, success, message });
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();
      return { response, data, ok: response.ok };
    } catch (error) {
      return { error: error.message, ok: false };
    }
  }

  async testPasswordValidation() {
    await this.log('Testing password validation requirements...');
    
    const weakPasswords = [
      'weak',                    // Too short
      'password',               // Common word
      'PASSWORD',               // No lowercase
      'password123',            // No uppercase
      'Password',               // No number
      'Password123'             // No special character
    ];

    for (const password of weakPasswords) {
      const { data, ok } = await this.makeRequest(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password,
          name: 'Test User',
          companyName: 'Test Company'
        })
      });

      if (!ok && data.error?.includes('Password does not meet requirements')) {
        await this.log(`Correctly rejected weak password: "${password}"`);
      } else {
        await this.log(`Failed to reject weak password: "${password}"`, false);
      }
    }
  }

  async testRegistrationFlow() {
    await this.log('Testing enhanced registration flow...');
    
    const testUser = {
      email: 'newuser@example.com',
      password: 'StrongPass123!',
      name: 'New User',
      companyName: 'New Company'
    };

    const { data, ok } = await this.makeRequest(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(testUser)
    });

    if (ok && data.success && !data.user.email_verified) {
      await this.log('Registration successful with email verification required');
      return data.user;
    } else {
      await this.log('Registration failed', false);
      console.log('Registration response:', data);
      return null;
    }
  }

  async testLoginSecurity() {
    await this.log('Testing enhanced login security...');
    
    // Test with non-existent user
    const { data: loginData1 } = await this.makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'anypassword'
      })
    });

    if (loginData1.error === 'Invalid credentials') {
      await this.log('Correctly handled non-existent user');
    } else {
      await this.log('Failed to handle non-existent user properly', false);
    }

    // Test failed login attempts (should work with existing seeded users)
    const { data: loginData2 } = await this.makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@acmecorp.com', // Seeded user
        password: 'wrongpassword'
      })
    });

    if (loginData2.error === 'Invalid credentials') {
      await this.log('Correctly handled wrong password');
    } else {
      await this.log('Failed to handle wrong password', false);
    }
  }

  async testSuccessfulLogin() {
    await this.log('Testing successful login with enhanced features...');
    
    const { data, ok } = await this.makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@acmecorp.com', // Seeded user
        password: 'password123',    // Seeded password
        rememberMe: true
      })
    });

    if (ok && data.success && data.tokens) {
      await this.log('Login successful with tokens and session management');
      await this.log(`Access token received: ${data.tokens.accessToken ? 'Yes' : 'No'}`);
      await this.log(`Refresh token received: ${data.tokens.refreshToken ? 'Yes' : 'No'}`);
      await this.log(`Session token received: ${data.tokens.sessionToken ? 'Yes' : 'No'}`);
      return data;
    } else {
      await this.log('Enhanced login failed', false);
      console.log('Login response:', data);
      return null;
    }
  }

  async testTokenRefresh(tokens) {
    if (!tokens?.refreshToken) {
      await this.log('No refresh token available for testing', false);
      return null;
    }

    await this.log('Testing refresh token functionality...');
    
    const { data, ok } = await this.makeRequest(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: tokens.refreshToken
      })
    });

    if (ok && data.success && data.tokens) {
      await this.log('Token refresh successful');
      return data.tokens;
    } else {
      await this.log('Token refresh failed', false);
      console.log('Refresh response:', data);
      return null;
    }
  }

  async testProtectedRoute(accessToken) {
    if (!accessToken) {
      await this.log('No access token available for protected route testing', false);
      return;
    }

    await this.log('Testing protected route access...');
    
    const { data, ok } = await this.makeRequest(`${API_BASE}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (ok && data.success && data.user) {
      await this.log('Protected route access successful');
      await this.log(`User profile retrieved: ${data.user.name} (${data.user.email})`);
    } else {
      await this.log('Protected route access failed', false);
      console.log('Profile response:', data);
    }
  }

  async testPasswordReset() {
    await this.log('Testing password reset flow...');
    
    const { data, ok } = await this.makeRequest(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'john@acmecorp.com'
      })
    });

    if (ok && data.success) {
      await this.log('Password reset request successful (email would be sent)');
    } else {
      await this.log('Password reset request failed', false);
      console.log('Reset response:', data);
    }
  }

  async testLogout(tokens) {
    if (!tokens?.accessToken) {
      await this.log('No tokens available for logout testing', false);
      return;
    }

    await this.log('Testing enhanced logout...');
    
    const { data, ok } = await this.makeRequest(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'X-Session-Token': tokens.sessionToken
      },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken
      })
    });

    if (ok && data.success) {
      await this.log('Logout successful with token cleanup');
    } else {
      await this.log('Logout failed', false);
      console.log('Logout response:', data);
    }
  }

  async testRateLimiting() {
    await this.log('Testing rate limiting (making multiple rapid requests)...');
    
    const promises = Array(6).fill().map(() => 
      this.makeRequest(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      })
    );

    const results = await Promise.all(promises);
    const rateLimited = results.some(result => 
      result.response?.status === 429 || 
      result.data?.error?.includes('Too many attempts')
    );

    if (rateLimited) {
      await this.log('Rate limiting working correctly');
    } else {
      await this.log('Rate limiting may not be working', false);
    }
  }

  async runAllTests() {
    console.log('🔧 Starting Enhanced Authentication System Tests');
    console.log('================================================\n');

    try {
      // Test password validation
      await this.testPasswordValidation();
      
      // Test registration
      const newUser = await this.testRegistrationFlow();
      
      // Test login security
      await this.testLoginSecurity();
      
      // Test successful login
      const loginResult = await this.testSuccessfulLogin();
      
      // Test token refresh
      if (loginResult?.tokens) {
        const newTokens = await this.testTokenRefresh(loginResult.tokens);
        
        // Test protected route access
        await this.testProtectedRoute(newTokens?.accessToken || loginResult.tokens.accessToken);
        
        // Test logout
        await this.testLogout(loginResult.tokens);
      }
      
      // Test password reset
      await this.testPasswordReset();
      
      // Test rate limiting
      await this.testRateLimiting();
      
    } catch (error) {
      await this.log(`Test suite error: ${error.message}`, false);
    }

    // Summary
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.message}`));
    }

    console.log('\n🎉 Enhanced Authentication System Testing Complete!');
  }
}

// Run the tests
const tester = new AuthTester();
tester.runAllTests();
