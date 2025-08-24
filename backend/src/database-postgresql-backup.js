const { Pool } = require('pg');

// Database connection pool
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
    return result;
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

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
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

module.exports = {
  query,
  transaction,
  healthCheck,
  pool,
};
