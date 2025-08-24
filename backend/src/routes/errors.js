const express = require('express');
const { run } = require('../database/sqlite');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Create errors table if it doesn't exist
const createErrorsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS client_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      stack TEXT,
      component_stack TEXT,
      user_agent TEXT,
      url TEXT,
      user_id INTEGER,
      company_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Initialize table
createErrorsTable().catch(console.error);

// Log client-side errors
router.post('/', asyncHandler(async (req, res) => {
  const {
    message,
    stack,
    componentStack,
    userAgent,
    url,
    timestamp
  } = req.body;

  // Get user info from JWT if available
  let userId = null;
  let companyId = null;
  
  if (req.user) {
    userId = req.user.id || req.user.userId;
    companyId = req.user.company_id || req.user.companyId;
  }

  // Log to database
  await run(`
    INSERT INTO client_errors (
      message,
      stack,
      component_stack,
      user_agent,
      url,
      user_id,
      company_id,
      timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    message,
    stack,
    componentStack,
    userAgent,
    url,
    userId,
    companyId,
    timestamp || new Date().toISOString()
  ]);

  // Also log to console for immediate visibility
  console.error('🚨 CLIENT ERROR LOGGED:', {
    message,
    url,
    userId,
    companyId,
    timestamp: timestamp || new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Error logged successfully'
  });
}));

// Get error statistics (admin only)
router.get('/stats', asyncHandler(async (req, res) => {
  // This would normally require admin auth, but simplified for now
  const { query } = require('../database/sqlite');
  
  const stats = await query(`
    SELECT 
      COUNT(*) as total_errors,
      COUNT(CASE WHEN resolved = 0 THEN 1 END) as unresolved_errors,
      COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as today_errors,
      COUNT(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 END) as week_errors
    FROM client_errors
  `);

  const topErrors = await query(`
    SELECT 
      message,
      COUNT(*) as count,
      MAX(created_at) as last_occurrence
    FROM client_errors
    WHERE DATE(created_at) >= DATE('now', '-30 days')
    GROUP BY message
    ORDER BY count DESC
    LIMIT 10
  `);

  res.json({
    success: true,
    data: {
      stats: stats[0],
      topErrors
    }
  });
}));

module.exports = router;