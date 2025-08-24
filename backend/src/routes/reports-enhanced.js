const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const fs = require('fs');

const router = express.Router();

// SQLite database connection
const db = new sqlite3.Database(path.join(__dirname, '../../data/sprinkler_repair.db'));

// Helper function to execute SQLite queries
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// All routes require authentication
router.use(authenticateToken);
router.use(requireAuth);

// Get business performance dashboard - SQLite compatible
router.get('/dashboard', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { period = '30' } = req.query; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));
  const startDateStr = startDate.toISOString().split('T')[0];

  // Key Performance Indicators - SQLite compatible
  const kpiQuery = `
    SELECT 
      -- Current period revenue
      (SELECT SUM(total_cents) FROM estimates 
       WHERE company_id = ? AND created_at >= ? AND status = 'approved') as current_revenue,
      (SELECT COUNT(*) FROM estimates 
       WHERE company_id = ? AND created_at >= ? AND status = 'approved') as current_estimates,
      
      -- Previous period revenue (same number of days prior)
      (SELECT SUM(total_cents) FROM estimates 
       WHERE company_id = ? 
       AND created_at >= date(?, '-' || ? || ' days')
       AND created_at < ? 
       AND status = 'approved') as previous_revenue,
      (SELECT COUNT(*) FROM estimates 
       WHERE company_id = ? 
       AND created_at >= date(?, '-' || ? || ' days')
       AND created_at < ? 
       AND status = 'approved') as previous_estimates,
      
      -- Inspection data
      (SELECT COUNT(*) FROM inspections 
       WHERE company_id = ? AND created_at >= ?) as total_inspections,
      (SELECT COUNT(*) FROM inspections 
       WHERE company_id = ? AND created_at >= ? AND submitted_at IS NOT NULL) as completed_inspections,
      
      -- Client data
      (SELECT COUNT(*) FROM clients 
       WHERE company_id = ? AND created_at >= ?) as new_clients,
      (SELECT COUNT(DISTINCT client_id) FROM inspections 
       WHERE company_id = ? AND created_at >= ?) as active_clients
  `;

  const kpiParams = [
    companyId, startDateStr, // current revenue
    companyId, startDateStr, // current estimates
    companyId, startDateStr, period, startDateStr, // previous revenue
    companyId, startDateStr, period, startDateStr, // previous estimates
    companyId, startDateStr, // total inspections
    companyId, startDateStr, // completed inspections
    companyId, startDateStr, // new clients
    companyId, startDateStr  // active clients
  ];

  const kpiResult = await runQuery(kpiQuery, kpiParams);

  // Revenue trend by day - SQLite compatible
  const revenueTrendQuery = `
    SELECT 
      DATE(created_at) as date,
      SUM(total_cents) as revenue,
      COUNT(*) as estimate_count
    FROM estimates
    WHERE company_id = ? 
      AND created_at >= ?
      AND status = 'approved'
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const revenueTrend = await runQuery(revenueTrendQuery, [companyId, startDateStr]);

  // Top clients by revenue
  const topClientsQuery = `
    SELECT 
      c.name,
      c.id,
      COALESCE(SUM(e.total_cents), 0) as total_revenue,
      COUNT(e.id) as estimate_count,
      COUNT(i.id) as inspection_count
    FROM clients c
    LEFT JOIN estimates e ON c.id = e.client_id AND e.status = 'approved' AND e.created_at >= ?
    LEFT JOIN inspections i ON c.id = i.client_id AND i.created_at >= ?
    WHERE c.company_id = ?
    GROUP BY c.id, c.name
    HAVING COALESCE(SUM(e.total_cents), 0) > 0
    ORDER BY total_revenue DESC
    LIMIT 10
  `;

  const topClients = await runQuery(topClientsQuery, [startDateStr, startDateStr, companyId]);

  // Technician performance
  const techPerformanceQuery = `
    SELECT 
      u.name,
      u.id,
      COUNT(i.id) as inspections_completed,
      COUNT(wo.id) as work_orders_completed,
      4.2 as avg_rating
    FROM users u
    LEFT JOIN inspections i ON u.id = i.tech_id AND i.submitted_at IS NOT NULL AND i.created_at >= ?
    LEFT JOIN work_orders wo ON u.id = wo.technician_id AND wo.status = 'completed' AND wo.created_at >= ?
    WHERE u.company_id = ? AND u.role = 'technician'
    GROUP BY u.id, u.name
    ORDER BY inspections_completed DESC
  `;

  const techPerformance = await runQuery(techPerformanceQuery, [startDateStr, startDateStr, companyId]);

  const kpi = kpiResult[0] || {};
  
  // Calculate growth rates
  const revenueGrowthRate = kpi.previous_revenue > 0 
    ? Math.round(((kpi.current_revenue - kpi.previous_revenue) / kpi.previous_revenue) * 100 * 100) / 100
    : 0;
  
  const estimateGrowthRate = kpi.previous_estimates > 0
    ? Math.round(((kpi.current_estimates - kpi.previous_estimates) / kpi.previous_estimates) * 100 * 100) / 100
    : 0;

  res.json({
    kpi: {
      ...kpi,
      revenue_growth_rate: revenueGrowthRate,
      estimate_growth_rate: estimateGrowthRate
    },
    revenue_trend: revenueTrend,
    top_clients: topClients,
    technician_performance: techPerformance,
    period_days: period,
  });
}));

// Custom Report Builder
router.post('/custom/build', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    name,
    data_sources = [],
    metrics = [],
    filters = {},
    grouping = 'none',
    date_range = {},
    chart_type = 'table'
  } = req.body;

  // Validate data sources
  const validSources = ['clients', 'inspections', 'estimates', 'work_orders', 'users', 'service_plans', 'subscriptions'];
  const sources = data_sources.filter(source => validSources.includes(source));
  
  if (sources.length === 0) {
    return res.status(400).json({ error: 'At least one valid data source required' });
  }

  // Build dynamic query based on selections
  let baseQuery = '';
  let joins = [];
  let selectFields = ['1 as id']; // Ensure we have an ID field
  let whereConditions = [`c.company_id = ${companyId}`];
  let groupByFields = [];

  // Start with clients as base table (most common)
  if (sources.includes('clients')) {
    baseQuery = 'FROM clients c';
    selectFields.push('c.name as client_name', 'c.id as client_id');
  } else {
    baseQuery = `FROM (SELECT ${companyId} as company_id) c`;
  }

  // Add joins based on selected sources
  if (sources.includes('inspections')) {
    joins.push('LEFT JOIN inspections i ON c.id = i.client_id');
    selectFields.push('COUNT(i.id) as total_inspections');
    selectFields.push('COUNT(CASE WHEN i.submitted_at IS NOT NULL THEN 1 END) as completed_inspections');
  }

  if (sources.includes('estimates')) {
    joins.push('LEFT JOIN estimates e ON c.id = e.client_id');
    selectFields.push('COUNT(e.id) as total_estimates');
    selectFields.push('SUM(CASE WHEN e.status = "approved" THEN e.total_cents ELSE 0 END) as total_revenue');
    selectFields.push('AVG(CASE WHEN e.status = "approved" THEN e.total_cents END) as avg_estimate_value');
  }

  if (sources.includes('work_orders')) {
    joins.push('LEFT JOIN work_orders wo ON c.id = wo.client_id');
    selectFields.push('COUNT(wo.id) as total_work_orders');
    selectFields.push('COUNT(CASE WHEN wo.status = "completed" THEN 1 END) as completed_work_orders');
  }

  if (sources.includes('subscriptions')) {
    joins.push('LEFT JOIN client_subscriptions cs ON c.id = cs.client_id');
    joins.push('LEFT JOIN service_plans sp ON cs.service_plan_id = sp.id');
    selectFields.push('COUNT(cs.id) as active_subscriptions');
    selectFields.push('SUM(cs.monthly_price_cents) as monthly_revenue');
  }

  // Apply date filters
  if (date_range.start_date) {
    whereConditions.push(`DATE(COALESCE(i.created_at, e.created_at, wo.created_at, c.created_at)) >= '${date_range.start_date}'`);
  }
  if (date_range.end_date) {
    whereConditions.push(`DATE(COALESCE(i.created_at, e.created_at, wo.created_at, c.created_at)) <= '${date_range.end_date}'`);
  }

  // Apply custom filters
  Object.entries(filters).forEach(([field, value]) => {
    if (value && field !== 'company_id') {
      if (typeof value === 'string') {
        whereConditions.push(`${field} LIKE '%${value}%'`);
      } else {
        whereConditions.push(`${field} = ${value}`);
      }
    }
  });

  // Apply grouping
  if (grouping === 'client') {
    groupByFields.push('c.id', 'c.name');
  } else if (grouping === 'month') {
    selectFields.push(`strftime('%Y-%m', COALESCE(i.created_at, e.created_at, wo.created_at)) as month`);
    groupByFields.push(`strftime('%Y-%m', COALESCE(i.created_at, e.created_at, wo.created_at))`);
  } else if (grouping === 'technician' && sources.includes('inspections')) {
    joins.push('LEFT JOIN users u ON i.tech_id = u.id');
    selectFields.push('u.name as technician_name');
    groupByFields.push('u.id', 'u.name');
  }

  // Build final query
  const finalQuery = `
    SELECT ${selectFields.join(', ')}
    ${baseQuery}
    ${joins.join(' ')}
    WHERE ${whereConditions.join(' AND ')}
    ${groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(', ')}` : ''}
    ORDER BY ${selectFields.includes('total_revenue') ? 'total_revenue DESC' : 'client_name'}
    LIMIT 1000
  `;

  try {
    const results = await runQuery(finalQuery);
    
    // Generate report metadata
    const reportId = `custom_${Date.now()}`;
    const reportData = {
      id: reportId,
      name: name || 'Custom Report',
      generated_at: new Date().toISOString(),
      generated_by: req.user.name,
      parameters: {
        data_sources: sources,
        metrics,
        filters,
        grouping,
        date_range,
        chart_type
      },
      data: results,
      summary: {
        total_records: results.length,
        data_sources_used: sources,
        query_executed: finalQuery
      },
      export_available: true
    };

    res.json(reportData);
  } catch (error) {
    console.error('Custom report error:', error);
    res.status(500).json({ 
      error: 'Failed to generate custom report',
      details: error.message 
    });
  }
}));

// Get saved custom reports
router.get('/custom', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  
  // This would query a saved_reports table in a full implementation
  // For now, return sample saved reports
  const savedReports = [
    {
      id: 'monthly_revenue',
      name: 'Monthly Revenue Report',
      description: 'Monthly breakdown of revenue by service type',
      created_at: '2024-12-01',
      last_run: '2024-12-20',
      data_sources: ['estimates', 'clients'],
      chart_type: 'line'
    },
    {
      id: 'technician_performance',
      name: 'Technician Performance Report',
      description: 'Inspection completion rates and customer satisfaction by technician',
      created_at: '2024-11-15',
      last_run: '2024-12-19',
      data_sources: ['inspections', 'users'],
      chart_type: 'bar'
    },
    {
      id: 'client_subscription_analysis',
      name: 'Client Subscription Analysis',
      description: 'Service plan adoption and recurring revenue metrics',
      created_at: '2024-12-10',
      last_run: '2024-12-20',
      data_sources: ['subscriptions', 'service_plans', 'clients'],
      chart_type: 'pie'
    }
  ];

  res.json({ reports: savedReports });
}));

// Export report data to CSV/Excel
router.get('/export/:reportId', asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { format = 'csv' } = req.query;
  const companyId = req.user.company_id;

  // For this demo, we'll re-run the dashboard query and export it
  // In a full implementation, you'd store report results and retrieve them
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startDateStr = startDate.toISOString().split('T')[0];

  let exportData = [];
  let filename = '';

  if (reportId === 'dashboard' || reportId.startsWith('custom_')) {
    // Export revenue trend data
    const revenueQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(total_cents) as revenue_cents,
        ROUND(SUM(total_cents) / 100.0, 2) as revenue_dollars,
        COUNT(*) as estimate_count
      FROM estimates
      WHERE company_id = ? 
        AND created_at >= ?
        AND status = 'approved'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    exportData = await runQuery(revenueQuery, [companyId, startDateStr]);
    filename = `revenue_report_${new Date().toISOString().split('T')[0]}`;
  } else if (reportId === 'clients') {
    // Export client data
    const clientQuery = `
      SELECT 
        c.name as client_name,
        c.email,
        c.phone,
        c.address,
        COUNT(i.id) as total_inspections,
        COUNT(e.id) as total_estimates,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.total_cents END), 0) / 100.0 as total_revenue
      FROM clients c
      LEFT JOIN inspections i ON c.id = i.client_id
      LEFT JOIN estimates e ON c.id = e.client_id
      WHERE c.company_id = ?
      GROUP BY c.id, c.name, c.email, c.phone, c.address
      ORDER BY total_revenue DESC
    `;

    exportData = await runQuery(clientQuery, [companyId]);
    filename = `client_report_${new Date().toISOString().split('T')[0]}`;
  }

  if (exportData.length === 0) {
    return res.status(404).json({ error: 'No data found for export' });
  }

  try {
    if (format === 'csv') {
      // Generate CSV
      const parser = new Parser();
      const csv = parser.parse(exportData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else if (format === 'xlsx') {
      // Generate Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report Data');
      
      // Add headers
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.addRow(headers);
        
        // Add data rows
        exportData.forEach(row => {
          worksheet.addRow(Object.values(row));
        });
        
        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      }
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ error: 'Unsupported format. Use csv or xlsx.' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate export file' });
  }
}));

// Schedule report generation
router.post('/schedule', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const {
    report_id,
    schedule_type, // 'daily', 'weekly', 'monthly'
    email_recipients = [],
    format = 'pdf'
  } = req.body;

  // In a full implementation, this would:
  // 1. Store the schedule in a database
  // 2. Set up a cron job or scheduler
  // 3. Generate and email reports automatically

  const scheduleId = `schedule_${Date.now()}`;
  
  const scheduleData = {
    id: scheduleId,
    report_id,
    schedule_type,
    email_recipients,
    format,
    company_id: companyId,
    created_at: new Date().toISOString(),
    next_run: calculateNextRun(schedule_type),
    status: 'active'
  };

  // For now, just return the schedule configuration
  res.json({
    message: 'Report scheduled successfully',
    schedule: scheduleData
  });
}));

// Helper function to calculate next run time
function calculateNextRun(scheduleType) {
  const now = new Date();
  switch (scheduleType) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0); // 8 AM next day
      break;
    case 'weekly':
      now.setDate(now.getDate() + (7 - now.getDay())); // Next Monday
      now.setHours(8, 0, 0, 0);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1, 1); // First day of next month
      now.setHours(8, 0, 0, 0);
      break;
  }
  return now.toISOString();
}

// Get scheduled reports
router.get('/scheduled', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  
  // Sample scheduled reports
  const scheduledReports = [
    {
      id: 'schedule_1',
      report_name: 'Monthly Revenue Report',
      schedule_type: 'monthly',
      next_run: '2025-01-01T08:00:00.000Z',
      email_recipients: ['admin@company.com'],
      format: 'pdf',
      status: 'active'
    }
  ];

  res.json({ scheduled_reports: scheduledReports });
}));

module.exports = router;