const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get comprehensive dashboard analytics
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
  query('compare_period').optional().isBoolean().toBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const options = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      compare_period: req.query.compare_period !== false, // Default to true
    };

    const analytics = await analyticsService.getDashboardAnalytics(companyId, options);
    res.json(analytics);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to get dashboard analytics' });
  }
});

/**
 * Get technician performance analytics
 * GET /api/analytics/technicians
 */
router.get('/technicians', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
  query('technician_id').optional().isInt().toInt()
    .withMessage('Valid technician ID required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const options = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      technician_id: req.query.technician_id,
    };

    const performance = await analyticsService.getTechnicianPerformance(companyId, options);
    res.json(performance);
  } catch (error) {
    console.error('Technician performance analytics error:', error);
    res.status(500).json({ error: 'Failed to get technician performance analytics' });
  }
});

/**
 * Get individual technician detailed performance
 * GET /api/analytics/technicians/:id
 */
router.get('/technicians/:id', [
  param('id').isInt().withMessage('Valid technician ID required'),
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const technicianId = parseInt(req.params.id);
    const companyId = req.user.company_id;

    // Verify technician belongs to company
    const db = require('../database/sqlite');
    const technician = await db.get(`
      SELECT id, name FROM users 
      WHERE id = ? AND company_id = ? AND role = 'tech'
    `, [technicianId, companyId]);

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const options = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      technician_id: technicianId,
    };

    const performance = await analyticsService.getTechnicianPerformance(companyId, options);

    // Return only the specific technician's data
    const technicianData = performance.technicians.find((t) => t.id === technicianId);

    if (!technicianData) {
      return res.status(404).json({ error: 'No performance data found for this technician' });
    }

    res.json({
      technician: technicianData,
      period: performance.period,
    });
  } catch (error) {
    console.error('Individual technician analytics error:', error);
    res.status(500).json({ error: 'Failed to get technician analytics' });
  }
});

/**
 * Get customer analytics
 * GET /api/analytics/customers
 */
router.get('/customers', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const options = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };

    const customerAnalytics = await analyticsService.getCustomerAnalytics(companyId, options);
    res.json(customerAnalytics);
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ error: 'Failed to get customer analytics' });
  }
});

/**
 * Get operational efficiency metrics
 * GET /api/analytics/efficiency
 */
router.get('/efficiency', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const options = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };

    const efficiency = await analyticsService.getOperationalEfficiency(companyId, options);
    res.json(efficiency);
  } catch (error) {
    console.error('Operational efficiency analytics error:', error);
    res.status(500).json({ error: 'Failed to get operational efficiency metrics' });
  }
});

/**
 * Get revenue analytics with breakdown
 * GET /api/analytics/revenue
 */
router.get('/revenue', [
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
  query('group_by').optional().isIn(['day', 'week', 'month', 'quarter']).withMessage('Valid grouping required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const {
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date = new Date().toISOString(),
      group_by = 'day',
    } = req.query;

    const db = require('../database/sqlite');

    // Determine date grouping format
    let dateFormat;
    switch (group_by) {
      case 'week':
        dateFormat = '%Y-W%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'quarter':
        dateFormat = '%Y-Q' + "||CASE WHEN CAST(strftime('%m', created_at) AS INTEGER) <= 3 THEN '1' WHEN CAST(strftime('%m', created_at) AS INTEGER) <= 6 THEN '2' WHEN CAST(strftime('%m', created_at) AS INTEGER) <= 9 THEN '3' ELSE '4' END";
        break;
      default: // day
        dateFormat = '%Y-%m-%d';
    }

    // Revenue over time
    const revenueOverTime = await db.query(`
      SELECT 
        strftime('${dateFormat}', p.created_at) as period,
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as revenue_cents,
        COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
        COUNT(*) as total_payment_attempts,
        AVG(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END) as avg_payment_cents
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
      GROUP BY strftime('${dateFormat}', p.created_at)
      ORDER BY period
    `, [companyId, start_date, end_date]);

    // Revenue by service type
    const revenueByService = await db.query(`
      SELECT 
        CASE 
          WHEN e.inspection_id IS NOT NULL THEN 'Inspection'
          WHEN p.work_order_id IS NOT NULL THEN 'Work Order'
          ELSE 'Other'
        END as service_type,
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as revenue_cents,
        COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as payment_count
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      LEFT JOIN estimates e ON p.estimate_id = e.id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
        AND p.status = 'succeeded'
      GROUP BY service_type
      ORDER BY revenue_cents DESC
    `, [companyId, start_date, end_date]);

    // Top revenue clients
    const topRevenueClients = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.type,
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as total_revenue_cents,
        COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as payment_count,
        AVG(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END) as avg_payment_cents
      FROM clients c
      JOIN payments p ON c.id = p.client_id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
        AND p.status = 'succeeded'
      GROUP BY c.id
      ORDER BY total_revenue_cents DESC
      LIMIT 10
    `, [companyId, start_date, end_date]);

    // Summary statistics
    const summary = await db.get(`
      SELECT 
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as total_revenue_cents,
        COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
        COUNT(*) as total_payment_attempts,
        AVG(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END) as avg_payment_cents,
        MIN(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END) as min_payment_cents,
        MAX(CASE WHEN p.status = 'succeeded' THEN p.amount_cents END) as max_payment_cents
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
    `, [companyId, start_date, end_date]);

    const successRate = summary.total_payment_attempts > 0
      ? (summary.successful_payments / summary.total_payment_attempts * 100).toFixed(1)
      : 0;

    res.json({
      summary: {
        total_revenue_cents: summary.total_revenue_cents || 0,
        successful_payments: summary.successful_payments || 0,
        success_rate: parseFloat(successRate),
        avg_payment_cents: Math.round(summary.avg_payment_cents || 0),
        min_payment_cents: summary.min_payment_cents || 0,
        max_payment_cents: summary.max_payment_cents || 0,
      },
      trends: revenueOverTime,
      by_service_type: revenueByService,
      top_clients: topRevenueClients,
      period: { start_date, end_date },
      group_by,
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
router.get('/export', [
  query('type').isIn(['dashboard', 'technicians', 'customers', 'revenue']).withMessage('Valid export type required'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Valid format required'),
  query('start_date').optional().isISO8601().withMessage('Valid start date required'),
  query('end_date').optional().isISO8601().withMessage('Valid end date required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.company_id;
    const {
      type, format = 'json', start_date, end_date,
    } = req.query;
    const options = { start_date, end_date };

    let data;
    switch (type) {
      case 'dashboard':
        data = await analyticsService.getDashboardAnalytics(companyId, options);
        break;
      case 'technicians':
        data = await analyticsService.getTechnicianPerformance(companyId, options);
        break;
      case 'customers':
        data = await analyticsService.getCustomerAnalytics(companyId, options);
        break;
      case 'revenue':
        // Use the revenue endpoint logic for consistency
        return res.redirect(`/api/analytics/revenue?${req.url.split('?')[1]}&format=${format}`);
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Simple CSV conversion for flat data structures
      const csvData = this.convertToCSV(data, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } else {
      // JSON export with timestamp
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exported_at: new Date().toISOString(),
        export_type: type,
        ...data,
      });
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

/**
 * Helper function to convert data to CSV
 * @private
 */
function convertToCSV(data, type) {
  // Simple CSV conversion - in a real implementation, you'd use a proper CSV library
  let csvContent = '';

  switch (type) {
    case 'technicians':
      if (data.technicians && data.technicians.length > 0) {
        const headers = Object.keys(data.technicians[0]).join(',');
        csvContent = `${headers}\n`;
        data.technicians.forEach((tech) => {
          const values = Object.values(tech).map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',');
          csvContent += `${values}\n`;
        });
      }
      break;
    case 'customers':
      if (data.top_customers && data.top_customers.length > 0) {
        const headers = Object.keys(data.top_customers[0]).join(',');
        csvContent = `${headers}\n`;
        data.top_customers.forEach((customer) => {
          const values = Object.values(customer).map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(',');
          csvContent += `${values}\n`;
        });
      }
      break;
    default:
      csvContent = 'Export type not supported for CSV format';
  }

  return csvContent;
}

module.exports = router;
