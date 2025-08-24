const http = require('http');

async function testLogin() {
  try {
    console.log('🔧 Testing login API...');
    
    const postData = JSON.stringify({
      email: 'owner@demo.com',
      password: 'password'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ Login successful!');
            console.log('Response structure:');
            console.log(JSON.stringify(response, null, 2));
            
            // Test if it matches frontend expectations
            const { token, user, company } = response;
            if (token && user && company) {
              console.log('✅ Response structure matches frontend expectations');
            } else {
              console.log('❌ Response structure does not match frontend expectations');
              console.log('Expected: token, user, company');
              console.log('Got:', Object.keys(response));
            }
          } else {
            console.error('❌ Login failed:', response);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
  }
}

testLogin();
