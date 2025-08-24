const bcrypt = require('bcryptjs');
const { query } = require('./src/database/sqlite');

async function testLogin() {
  try {
    // Get the demo user
    const user = await query('SELECT * FROM users WHERE email = ?', ['owner@demo.com']);
    
    if (!user || user.length === 0) {
      console.log('User not found');
      return;
    }
    
    const userData = user[0];
    console.log('User found:', {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      company_id: userData.company_id
    });
    
    // Test multiple common passwords
    const testPasswords = [
      'password123',
      'demo123',
      'admin123',
      'test123',
      'password',
      'demo',
      'admin'
    ];
    
    console.log('Testing passwords...');
    
    for (const password of testPasswords) {
      try {
        const isValid = await bcrypt.compare(password, userData.password_hash);
        console.log(`Password "${password}": ${isValid ? 'VALID' : 'INVALID'}`);
        
        if (isValid) {
          console.log(`\n✅ WORKING CREDENTIALS FOUND:`);
          console.log(`Email: ${userData.email}`);
          console.log(`Password: ${password}`);
          break;
        }
      } catch (error) {
        console.log(`Error testing password "${password}":`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();