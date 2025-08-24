const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data/sprinkler_repair.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking users in database...');

db.all('SELECT id, email, name, role FROM users', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users found:', rows);
    if (rows.length === 0) {
      console.log('No users found. Creating test user...');
      
      const bcrypt = require('bcryptjs');
      bcrypt.hash('test123', 12, (err, hash) => {
        if (err) {
          console.error('Hash error:', err);
          return;
        }
        
        // First create company
        db.run(`INSERT INTO companies (name, email, phone, plan) VALUES (?, ?, ?, ?)`, 
          ['Test Company', 'test@company.com', '555-0123', 'professional'], 
          function(err) {
            if (err && err.code !== 'SQLITE_CONSTRAINT') {
              console.error('Company creation error:', err);
              return;
            }
            
            const companyId = this.lastID || 1;
            
            // Create test user
            db.run(`INSERT INTO users (company_id, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)`, 
              [companyId, 'owner@test.com', hash, 'Test Owner', 'company_owner', 1], 
              function(err) {
                if (err) {
                  console.error('User creation error:', err);
                } else {
                  console.log('✅ Test user created successfully');
                }
                db.close();
              });
          });
      });
    } else {
      db.close();
    }
  }
});