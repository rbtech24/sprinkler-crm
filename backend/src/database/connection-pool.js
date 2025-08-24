/**
 * Advanced PostgreSQL Connection Pool with Monitoring and Health Checks
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

class DatabasePool extends EventEmitter {
  constructor(config = {}) {
    super();
    
    const defaultConfig = {
      connectionString: process.env.DATABASE_URL,
      
      // Connection pool configuration
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      
      // Connection configuration
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      
      // Statement timeout (30 seconds)
      statement_timeout: 30000,
      
      // Query timeout (45 seconds)
      query_timeout: 45000,
      
      // SSL configuration
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      
      // Application name for connection tracking
      application_name: `irrigation_pro_${process.env.NODE_ENV || 'development'}`,
    };
    
    this.config = { ...defaultConfig, ...config };
    this.pool = new Pool(this.config);
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      errors: 0,
      queries: 0,
      slowQueries: 0,
      totalQueryTime: 0,
    };
    
    this.setupEventListeners();
    this.startMonitoring();
  }

  setupEventListeners() {
    this.pool.on('connect', (client) => {
      this.stats.totalConnections++;
      this.emit('connect', client);
      
      // Set application-specific parameters
      client.query(`
        SET application_name = '${this.config.application_name}';
        SET statement_timeout = '${this.config.statement_timeout}ms';
      `).catch(err => {
        console.warn('Failed to set client parameters:', err);
      });
    });

    this.pool.on('acquire', () => {
      this.stats.activeConnections++;
      this.emit('acquire');
    });

    this.pool.on('release', () => {
      this.stats.activeConnections--;
      this.emit('release');
    });

    this.pool.on('remove', () => {
      this.stats.totalConnections--;
      this.emit('remove');
    });

    this.pool.on('error', (err, client) => {
      this.stats.errors++;
      console.error('Database pool error:', err);
      this.emit('error', err, client);
    });
  }

  startMonitoring() {
    // Log pool stats every 60 seconds in production
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        this.logStats();
      }, 60000);
    }
    
    // Health check every 30 seconds
    setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
        this.emit('health-check-failed', error);
      }
    }, 30000);
  }

  async query(text, params = [], options = {}) {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      this.stats.queries++;
      
      // Set company context if provided
      if (options.companyId) {
        await client.query(`SET LOCAL app.current_company_id = '${options.companyId}'`);
      }
      
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      this.stats.totalQueryTime += duration;
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        this.stats.slowQueries++;
        console.warn(`Slow query detected (${duration}ms):`, {
          query: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          duration,
          companyId: options.companyId,
        });
      }
      
      return result.rows;
      
    } finally {
      client.release();
    }
  }

  async get(text, params = [], options = {}) {
    const rows = await this.query(text, params, options);
    return rows[0] || null;
  }

  async run(text, params = [], options = {}) {
    const client = await this.pool.connect();
    
    try {
      if (options.companyId) {
        await client.query(`SET LOCAL app.current_company_id = '${options.companyId}'`);
      }
      
      const result = await client.query(text, params);
      
      return {
        lastInsertRowid: result.rows[0]?.id,
        changes: result.rowCount,
        rows: result.rows,
      };
      
    } finally {
      client.release();
    }
  }

  async transaction(callback, options = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      if (options.companyId) {
        await client.query(`SET LOCAL app.current_company_id = '${options.companyId}'`);
      }
      
      const result = await callback({
        query: async (text, params) => {
          const queryResult = await client.query(text, params);
          return { rows: queryResult.rows, rowCount: queryResult.rowCount };
        },
        get: async (text, params) => {
          const queryResult = await client.query(text, params);
          return queryResult.rows[0] || null;
        },
        run: async (text, params) => {
          const queryResult = await client.query(text, params);
          return {
            lastInsertRowid: queryResult.rows[0]?.id,
            changes: queryResult.rowCount,
            rows: queryResult.rows,
          };
        },
      });
      
      await client.query('COMMIT');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck() {
    const start = Date.now();
    
    try {
      await this.query('SELECT 1 as health_check');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: duration,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getStats() {
    return {
      ...this.stats,
      pool: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount,
      },
      averageQueryTime: this.stats.queries > 0 
        ? Math.round(this.stats.totalQueryTime / this.stats.queries) 
        : 0,
    };
  }

  logStats() {
    const stats = this.getStats();
    console.log('🗄️  Database Pool Stats:', {
      connections: {
        total: stats.pool.totalCount,
        idle: stats.pool.idleCount,
        waiting: stats.pool.waitingCount,
      },
      queries: {
        total: stats.queries,
        slow: stats.slowQueries,
        averageTime: stats.averageQueryTime,
      },
      errors: stats.errors,
    });
  }

  async drain() {
    console.log('🔄 Draining database connection pool...');
    
    try {
      await this.pool.end();
      console.log('✅ Database pool drained successfully');
    } catch (error) {
      console.error('❌ Error draining database pool:', error);
      throw error;
    }
  }

  // Graceful shutdown
  async close() {
    return this.drain();
  }
}

// Singleton instance
let poolInstance = null;

function createPool(config) {
  if (poolInstance) {
    console.warn('Database pool already created, returning existing instance');
    return poolInstance;
  }
  
  poolInstance = new DatabasePool(config);
  
  // Handle process shutdown
  process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM, closing database pool...');
    await poolInstance.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('🔄 Received SIGINT, closing database pool...');
    await poolInstance.close();
    process.exit(0);
  });
  
  return poolInstance;
}

function getPool() {
  if (!poolInstance) {
    throw new Error('Database pool not initialized. Call createPool() first.');
  }
  return poolInstance;
}

module.exports = {
  DatabasePool,
  createPool,
  getPool,
};