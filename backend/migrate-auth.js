const db = require('./src/database/sqlite');

async function migrateAuthEnhancements() {
  try {
    console.log('🔄 Starting auth enhancement migration...');
    
    // Add new columns to users table
    const userColumns = [
      'ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false',
      'ALTER TABLE users ADD COLUMN email_verification_token TEXT',
      'ALTER TABLE users ADD COLUMN email_verification_expires DATETIME',
      'ALTER TABLE users ADD COLUMN password_reset_token TEXT',
      'ALTER TABLE users ADD COLUMN password_reset_expires DATETIME',
      'ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN locked_until DATETIME',
      'ALTER TABLE users ADD COLUMN last_login_at DATETIME',
      'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true'
    ];
    
    for (const sql of userColumns) {
      try {
        await db.run(sql);
        console.log('✅ Added column:', sql.split('ADD COLUMN ')[1]);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('⚠️  Column already exists:', sql.split('ADD COLUMN ')[1]);
        } else {
          throw error;
        }
      }
    }
    
    // Create refresh_tokens table
    await db.run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME,
        replaced_by TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created refresh_tokens table');
    
    // Create user_sessions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created user_sessions table');
    
    // Create audit_logs table for security tracking
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource TEXT,
        resource_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created audit_logs table');
    
    // Update existing users to be email verified for demo purposes
    await db.run('UPDATE users SET email_verified = true WHERE email = ?', ['admin@demo.com']);
    console.log('✅ Set demo user as email verified');
    
    console.log('🎉 Auth enhancement migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateAuthEnhancements();
