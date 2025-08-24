const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get KPI data (placeholder)
router.get('/kpi', asyncHandler(async (req, res) => {
  // Mock KPI data
  const mockKPIData = {
    total_revenue: 125000,
    total_inspections: 450,
    total_estimates: 320,
    total_work_orders: 280,
    conversion_rate: 0.875,
    avg_inspection_time: 45,
    avg_estimate_value: 2500,
    customer_satisfaction: 4.8,
  };
  res.json(mockKPIData);
}));

// Get financial reports (placeholder)
router.get('/financial', asyncHandler(async (req, res) => {
  // Mock financial data
  const mockFinancialReports = [
    {
      month: 'January 2024',
      revenue: 32000,
      inspections: 120,
      estimates: 95,
      work_orders: 85,
    },
    {
      month: 'February 2024',
      revenue: 28000,
      inspections: 105,
      estimates: 82,
      work_orders: 75,
    },
    {
      month: 'March 2024',
      revenue: 35000,
      inspections: 140,
      estimates: 110,
      work_orders: 98,
    },
  ];
  res.json(mockFinancialReports);
}));

// Get operational metrics (placeholder)
router.get('/operational', asyncHandler(async (req, res) => {
  // Mock operational data
  const mockOperationalMetrics = [
    {
      technician_name: 'John Smith',
      inspections_completed: 85,
      estimates_generated: 68,
      avg_inspection_time: 42,
      customer_rating: 4.9,
      efficiency_score: 92,
    },
    {
      technician_name: 'Sarah Johnson',
      inspections_completed: 78,
      estimates_generated: 61,
      avg_inspection_time: 38,
      customer_rating: 4.7,
      efficiency_score: 88,
    },
  ];
  res.json(mockOperationalMetrics);
}));

// Get custom reports (placeholder)
router.get('/custom', asyncHandler(async (req, res) => {
  // Mock custom reports
  const mockCustomReports = [
    {
      id: '1',
      name: 'Monthly Performance Report',
      description: 'Comprehensive monthly performance analysis',
      report_type: 'performance',
      parameters: { period: 'monthly', metrics: ['revenue', 'efficiency'] },
      created_at: '2024-01-15',
      last_run: '2024-03-01',
    },
  ];
  res.json(mockCustomReports);
}));

// Export report (placeholder)
router.get('/export', asyncHandler(async (req, res) => {
  const { report_type, format } = req.query;

  // Mock export response
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${report_type}_report.${format}"`);

  const csvData = `Date,Revenue,Inspections,Estimates
2024-01-01,32000,120,95
2024-02-01,28000,105,82
2024-03-01,35000,140,110`;

  res.send(csvData);
}));

module.exports = router;
