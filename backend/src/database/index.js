// SQLite database configuration for development
const sqlite = require('./sqlite');

// Export SQLite functions - redirect everything to SQLite for now
module.exports = {
  query: sqlite.query,
  get: sqlite.get,
  run: sqlite.run,
  all: sqlite.query,  // alias for query
  transaction: async (callback) => {
    // Simple transaction implementation for SQLite
    // In production, you'd want proper transaction handling
    try {
      return await callback({
        query: sqlite.query,
        get: sqlite.get,
        run: sqlite.run,
      });
    } catch (error) {
      throw error;
    }
  },
};
