#!/usr/bin/env node

/**
 * PostgreSQL Migration Runner
 * Handles database schema migrations with proper error handling and rollback support
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class MigrationRunner {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Smaller pool for migrations
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async init() {
    console.log('🔄 Initializing migration system...');
    
    // Create schema_migrations table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
    `);
    
    console.log('✅ Migration system initialized');
  }

  async getAppliedMigrations() {
    const result = await this.pool.query(
      'SELECT version, checksum FROM schema_migrations ORDER BY version'
    );
    return new Map(result.rows.map(row => [row.version, row.checksum]));
  }

  async getPendingMigrations() {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await fs.readdir(this.migrationsPath);
    
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();

    const pendingMigrations = [];
    
    for (const file of sqlFiles) {
      const version = path.basename(file, '.sql');
      const filePath = path.join(this.migrationsPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      
      const appliedChecksum = appliedMigrations.get(version);
      
      if (!appliedChecksum) {
        // New migration
        pendingMigrations.push({ version, file, content, checksum });
      } else if (appliedChecksum !== checksum) {
        // Migration file has been modified
        throw new Error(
          `Migration ${version} has been modified after being applied. ` +
          `Expected checksum: ${appliedChecksum}, Current: ${checksum}`
        );
      }
    }
    
    return pendingMigrations;
  }

  async runMigration(migration) {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Running migration: ${migration.version}`);
      
      await client.query('BEGIN');
      
      // Execute migration
      await client.query(migration.content);
      
      // Record migration
      await client.query(
        `INSERT INTO schema_migrations (version, checksum, execution_time_ms) 
         VALUES ($1, $2, $3)`,
        [migration.version, migration.checksum, Date.now() - startTime]
      );
      
      await client.query('COMMIT');
      
      console.log(`✅ Migration completed: ${migration.version} (${Date.now() - startTime}ms)`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${migration.version}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate() {
    try {
      await this.init();
      
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }
      
      console.log(`📄 Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully');
      
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async rollback(targetVersion = null) {
    try {
      await this.init();
      
      const appliedMigrations = await this.getAppliedMigrations();
      const migrations = Array.from(appliedMigrations.keys()).sort().reverse();
      
      if (migrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      let migrationsToRollback;
      
      if (targetVersion) {
        const targetIndex = migrations.indexOf(targetVersion);
        if (targetIndex === -1) {
          throw new Error(`Migration ${targetVersion} not found`);
        }
        migrationsToRollback = migrations.slice(0, targetIndex + 1);
      } else {
        // Rollback just the last migration
        migrationsToRollback = [migrations[0]];
      }
      
      console.log(`⚠️  Rolling back ${migrationsToRollback.length} migrations`);
      
      for (const version of migrationsToRollback) {
        await this.rollbackMigration(version);
      }
      
      console.log('✅ Rollback completed');
      
    } catch (error) {
      console.error('💥 Rollback failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async rollbackMigration(version) {
    const client = await this.pool.connect();
    
    try {
      console.log(`⏪ Rolling back migration: ${version}`);
      
      await client.query('BEGIN');
      
      // Look for rollback file
      const rollbackFile = path.join(this.migrationsPath, `${version}_rollback.sql`);
      
      try {
        const rollbackContent = await fs.readFile(rollbackFile, 'utf8');
        await client.query(rollbackContent);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(`⚠️  No rollback file found for ${version}, manual intervention may be required`);
        } else {
          throw err;
        }
      }
      
      // Remove migration record
      await client.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
      
      await client.query('COMMIT');
      
      console.log(`✅ Rolled back: ${version}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Rollback failed: ${version}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async status() {
    try {
      await this.init();
      
      const appliedMigrations = await this.getAppliedMigrations();
      const pendingMigrations = await this.getPendingMigrations();
      
      console.log('\n📊 Migration Status');
      console.log('==================');
      
      if (appliedMigrations.size > 0) {
        console.log('\n✅ Applied Migrations:');
        for (const version of Array.from(appliedMigrations.keys()).sort()) {
          console.log(`  • ${version}`);
        }
      }
      
      if (pendingMigrations.length > 0) {
        console.log('\n⏳ Pending Migrations:');
        for (const migration of pendingMigrations) {
          console.log(`  • ${migration.version}`);
        }
      } else {
        console.log('\n✅ All migrations are up to date');
      }
      
    } catch (error) {
      console.error('💥 Status check failed:', error.message);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const runner = new MigrationRunner();
  
  switch (command) {
    case 'migrate':
    case 'up':
      await runner.migrate();
      break;
      
    case 'rollback':
    case 'down':
      const targetVersion = process.argv[3];
      await runner.rollback(targetVersion);
      break;
      
    case 'status':
      await runner.status();
      break;
      
    default:
      console.log(`
PostgreSQL Migration Runner

Usage:
  node migration-runner.js migrate     # Run pending migrations
  node migration-runner.js rollback    # Rollback last migration
  node migration-runner.js rollback <version>  # Rollback to specific version
  node migration-runner.js status      # Show migration status

Environment Variables:
  DATABASE_URL - PostgreSQL connection string

Examples:
  DATABASE_URL=postgresql://user:pass@localhost/db node migration-runner.js migrate
  node migration-runner.js rollback 001_initial_postgresql_schema
      `);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Migration runner failed:', error);
    process.exit(1);
  });
}

module.exports = MigrationRunner;