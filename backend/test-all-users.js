const bcrypt = require('bcryptjs');
const { query } = require('./src/database/sqlite');

async function testAllUsers() {
  try {
    // Get all users
    const users = await query('SELECT * FROM users ORDER BY id');
    
    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }
    
    console.log(`Found ${users.length} users:\n`);
    
    // Test passwords from credentials file
    const testPasswords = [
      'password',
      'admin123',
      'password123',
      'demo123',
      'test123',
      'demo',
      'admin'
    ];
    
    for (const user of users) {
      console.log(`\n=== Testing User: ${user.email} ===`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Company ID: ${user.company_id}`);
      console.log('Testing passwords...');
      
      let foundPassword = false;
      
      for (const password of testPasswords) {
        try {
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (isValid) {
            console.log(`✅ WORKING CREDENTIALS:`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Password: ${password}`);
            console.log(`   Role: ${user.role}`);
            foundPassword = true;
            break;
          }
        } catch (error) {
          console.log(`   Error testing password "${password}":`, error.message);
        }
      }
      
      if (!foundPassword) {
        console.log(`❌ No working password found for ${user.email}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAllUsers();