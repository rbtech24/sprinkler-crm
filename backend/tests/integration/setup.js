/**
 * Integration Test Setup
 * Sets up test database and server for integration testing
 */

const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();

// Test database path
const testDbPath = path.join(__dirname, '..', '..', 'test.db');

// Global test server instance
let testServer = null;
let testDb = null;

/**
 * Setup test database with required tables
 */
async function setupTestDatabase() {
  return new Promise((resolve, reject) => {
    testDb = new sqlite3.Database(testDbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create required tables for testing
      testDb.serialize(() => {
        // Companies table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            plan TEXT DEFAULT 'starter',
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Users table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'tech',
            email_verified BOOLEAN DEFAULT 0,
            email_verification_token TEXT,
            password_reset_token TEXT,
            password_reset_expires DATETIME,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id)
          )
        `);

        // Refresh tokens table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            revoked_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // User sessions table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT NOT NULL,
            device_info TEXT,
            ip_address TEXT,
            user_agent TEXT,
            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Clients table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            type TEXT DEFAULT 'residential',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id)
          )
        `);

        // Sites table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            client_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id),
            FOREIGN KEY (client_id) REFERENCES clients (id)
          )
        `);

        // Inspections table
        testDb.run(`
          CREATE TABLE IF NOT EXISTS inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            site_id INTEGER NOT NULL,
            tech_id INTEGER,
            status TEXT DEFAULT 'draft',
            issues_count INTEGER DEFAULT 0,
            has_estimate BOOLEAN DEFAULT 0,
            pdf_ready BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id),
            FOREIGN KEY (site_id) REFERENCES sites (id),
            FOREIGN KEY (tech_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

/**
 * Insert test data for integration tests
 */
async function insertTestData() {
  return new Promise((resolve, reject) => {
    testDb.serialize(() => {
      // Insert test company
      testDb.run(`
        INSERT OR REPLACE INTO companies (id, name, plan, email) 
        VALUES (1, 'Test Irrigation Co', 'professional', 'test@irrigation.com')
      `);

      // Insert test users
      testDb.run(`
        INSERT OR REPLACE INTO users (id, company_id, email, password_hash, name, role, email_verified) 
        VALUES 
          (1, 1, 'admin@test.com', '$2a$12$test.hash.for.testing.purposes', 'Test Admin', 'admin', 1),
          (2, 1, 'tech@test.com', '$2a$12$test.hash.for.testing.purposes', 'Test Tech', 'tech', 1)
      `);

      // Insert test client
      testDb.run(`
        INSERT OR REPLACE INTO clients (id, company_id, name, email, type) 
        VALUES (1, 1, 'Test Client', 'client@test.com', 'residential')
      `);

      // Insert test site
      testDb.run(`
        INSERT OR REPLACE INTO sites (id, company_id, client_id, name, address) 
        VALUES (1, 1, 1, 'Test Site', '123 Test Street')
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

/**
 * Clean test database
 */
async function cleanTestDatabase() {
  if (!testDb) return;

  return new Promise((resolve) => {
    const tables = [
      'refresh_tokens',
      'user_sessions', 
      'inspections',
      'sites',
      'clients',
      'users',
      'companies'
    ];

    let completed = 0;
    tables.forEach(table => {
      testDb.run(`DELETE FROM ${table}`, (err) => {
        if (err) console.warn(`Warning: Could not clean table ${table}:`, err);
        completed++;
        if (completed === tables.length) {
          resolve();
        }
      });
    });
  });
}

/**
 * Close test database connection
 */
async function closeTestDatabase() {
  if (testDb) {
    return new Promise((resolve) => {
      testDb.close((err) => {
        if (err) console.warn('Warning: Error closing test database:', err);
        testDb = null;
        resolve();
      });
    });
  }
}

/**
 * Remove test database file
 */
async function removeTestDatabase() {
  try {
    await fs.unlink(testDbPath);
  } catch (error) {
    // File might not exist, ignore error
  }
}

// Global setup before all integration tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `sqlite:${testDbPath}`;
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.SESSION_SECRET = 'test-session-secret-for-integration';
  process.env.REDIS_URL = 'disabled';

  // Setup test database
  await setupTestDatabase();
  await insertTestData();

  console.log('Integration test environment setup complete');
});

// Global cleanup after all integration tests
afterAll(async () => {
  // Close database connection
  await closeTestDatabase();
  
  // Remove test database file
  await removeTestDatabase();

  // Close test server if running
  if (testServer && typeof testServer.close === 'function') {
    await new Promise((resolve) => {
      testServer.close(resolve);
    });
  }

  console.log('Integration test environment cleanup complete');
});

// Clean data before each test
beforeEach(async () => {
  await cleanTestDatabase();
  await insertTestData();
});

module.exports = {
  testDb,
  testDbPath,
  setupTestDatabase,
  insertTestData,
  cleanTestDatabase,
  closeTestDatabase,
};