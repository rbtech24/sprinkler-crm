const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('data/sprinkler_repair.db');

console.log('\n=== ACTUAL USERS IN DATABASE ===');

db.all('SELECT id, email, role, company_id, name FROM users ORDER BY email', (err, users) => {
  if (err) {
    console.error('Error:', err);
  } else {
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Company ID: ${user.company_id}`);
      console.log(`Name: ${user.name || 'No name'}`);
      console.log('---');
    });
    
    console.log(`\nTotal users found: ${users.length}`);
  }
  db.close();
});