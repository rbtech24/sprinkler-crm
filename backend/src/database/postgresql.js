const { Pool } = require('pg');

// Database connection pool for production PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper function to run queries with company context
const query = async (text, params = [], companyId = null) => {
  const client = await pool.connect();

  try {
    // Set company context for RLS if provided
    if (companyId) {
      await client.query(`SET LOCAL app.current_company_id = '${companyId}'`);
    }

    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Helper function for single row queries
const get = async (text, params = [], companyId = null) => {
  const rows = await query(text, params, companyId);
  return rows[0] || null;
};

// Helper function for insert/update/delete
const run = async (text, params = [], companyId = null) => {
  const client = await pool.connect();

  try {
    // Set company context for RLS if provided
    if (companyId) {
      await client.query(`SET LOCAL app.current_company_id = '${companyId}'`);
    }

    const queryResult = await client.query(text, params);
    return {
      lastInsertRowid: queryResult.rows[0]?.id,
      changes: queryResult.rowCount,
      rows: queryResult.rows,
    };
  } finally {
    client.release();
  }
};

// Helper function for transactions
const transaction = async (callback, companyId = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set company context for RLS if provided
    if (companyId) {
      await client.query(`SET LOCAL app.current_company_id = '${companyId}'`);
    }

    const transactionResult = await callback({
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
    return transactionResult;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Health check for database connection
const healthCheck = async () => {
  try {
    await query('SELECT 1');
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Initialize database with PostgreSQL schema
const initDatabase = async () => {
  try {
    console.log('🔄 Initializing PostgreSQL database...');

    // Check if main tables exist
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('companies', 'users', 'clients')
    `);

    if (tablesResult.length > 0) {
      console.log('✅ PostgreSQL database already initialized');
      return;
    }

    console.log('🔄 Creating PostgreSQL tables...');
    // For production, use proper migration files
    console.log('⚠️  Run migrations manually for PostgreSQL setup');
    console.log('📄 See database/migrations/ directory');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  get,
  run,
  all: query, // alias for query
  transaction,
  healthCheck,
  initDatabase,
};