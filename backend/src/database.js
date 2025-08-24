// Redirect to SQLite database for development
const sqlite = require('./database/sqlite');

// Export SQLite functions to maintain compatibility
module.exports = {
  query: sqlite.query,
  get: sqlite.get,
  run: sqlite.run,
  all: sqlite.query, // alias for query
  transaction: async (callback) =>
    // Simple transaction implementation for SQLite
    await callback({
      query: sqlite.query,
      get: sqlite.get,
      run: sqlite.run,
    }),
};