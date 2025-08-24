const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

const router = express.Router();

// SQLite database connection
const db = new sqlite3.Database(path.join(__dirname, '../../data/sprinkler_repair.db'));

// All routes require authentication
router.use(authenticateToken);

// Get business performance dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { period = '30' } = req.query; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Key Performance Indicators
  const kpiQuery = `
    WITH date_range AS (
      SELECT $1::date as start_date, CURRENT_DATE as end_date
    ),
    revenue_data AS (
      SELECT 
        SUM(total_cents) as current_revenue,
        COUNT(*) as current_estimates
      FROM estimates e, date_range dr
      WHERE e.company_id = $2 
        AND e.created_at >= dr.start_date
        AND e.status = 'approved'
    ),
    previous_revenue_data AS (
      SELECT 
        SUM(total_cents) as previous_revenue,
        COUNT(*) as previous_estimates
      FROM estimates e, date_range dr
      WHERE e.company_id = $2 
        AND e.created_at >= (dr.start_date - INTERVAL '${period} days')
        AND e.created_at < dr.start_date
        AND e.status = 'approved'
    ),
    inspection_data AS (
      SELECT 
        COUNT(*) as total_inspections,
        COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) as completed_inspections,
        AVG(EXTRACT(EPOCH FROM (submitted_at - started_at))/3600) as avg_inspection_hours
      FROM inspections i, date_range dr
      WHERE i.company_id = $2 
        AND i.created_at >= dr.start_date
    ),
    client_data AS (
      SELECT 
        COUNT(*) as new_clients,
        COUNT(DISTINCT c.id) as active_clients
      FROM clients c
      LEFT JOIN inspections i ON c.id = i.client_id, date_range dr
      WHERE c.company_id = $2 
        AND c.created_at >= dr.start_date
    )
    SELECT 
      rd.current_revenue,
      rd.current_estimates,
      prd.previous_revenue,
      prd.previous_estimates,
      id.total_inspections,
      id.completed_inspections,
      id.avg_inspection_hours,
      cd.new_clients,
      cd.active_clients,
      -- Calculate growth rates
      CASE 
        WHEN prd.previous_revenue > 0 THEN 
          ROUND(((rd.current_revenue - prd.previous_revenue)::numeric / prd.previous_revenue * 100), 2)
        ELSE 0
      END as revenue_growth_rate,
      CASE 
        WHEN prd.previous_estimates > 0 THEN 
          ROUND(((rd.current_estimates - prd.previous_estimates)::numeric / prd.previous_estimates * 100), 2)
        ELSE 0
      END as estimate_growth_rate
    FROM revenue_data rd, previous_revenue_data prd, inspection_data id, client_data cd
  `;

  const kpiResult = await query(kpiQuery, [startDate.toISOString().split('T')[0], companyId]);

  // Revenue trend by day
  const revenueTrendQuery = `
    SELECT 
      DATE(created_at) as date,
      SUM(total_cents) as revenue,
      COUNT(*) as estimate_count
    FROM estimates
    WHERE company_id = $1 
      AND created_at >= $2
      AND status = 'approved'
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const revenueTrend = await query(revenueTrendQuery, [companyId, startDate.toISOString()]);

  // Top clients by revenue
  const topClientsQuery = `
    SELECT 
      c.name,
      c.id,
      SUM(e.total_cents) as total_revenue,
      COUNT(e.id) as estimate_count,
      COUNT(i.id) as inspection_count
    FROM clients c
    LEFT JOIN estimates e ON c.id = e.client_id AND e.status = 'approved' AND e.created_at >= $2
    LEFT JOIN inspections i ON c.id = i.client_id AND i.created_at >= $2
    WHERE c.company_id = $1
    GROUP BY c.id, c.name
    HAVING SUM(e.total_cents) > 0
    ORDER BY total_revenue DESC
    LIMIT 10
  `;

  const topClients = await query(topClientsQuery, [companyId, startDate.toISOString()]);

  // Technician performance
  const techPerformanceQuery = `
    SELECT 
      u.name,
      u.id,
      COUNT(i.id) as inspections_completed,
      COUNT(wo.id) as work_orders_completed,
      AVG(EXTRACT(EPOCH FROM (i.submitted_at - i.started_at))/3600) as avg_inspection_time,
      -- Customer satisfaction would come from a feedback table
      4.2 as avg_rating -- Placeholder
    FROM users u
    LEFT JOIN inspections i ON u.id = i.tech_id AND i.submitted_at IS NOT NULL AND i.created_at >= $2
    LEFT JOIN work_orders wo ON u.id = wo.technician_id AND wo.status = 'completed' AND wo.created_at >= $2
    WHERE u.company_id = $1 AND u.role = 'tech'
    GROUP BY u.id, u.name
    ORDER BY inspections_completed DESC
  `;

  const techPerformance = await query(techPerformanceQuery, [companyId, startDate.toISOString()]);

  res.json({
    kpi: kpiResult.rows[0] || {},
    revenue_trend: revenueTrend.rows,
    top_clients: topClients.rows,
    technician_performance: techPerformance.rows,
    period_days: period,
  });
}));

// Get detailed financial report
router.get('/financial', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { start_date, end_date, breakdown = 'monthly' } = req.query;

  const dateFormat = breakdown === 'daily' ? 'YYYY-MM-DD'
    : breakdown === 'weekly' ? 'YYYY-WW' : 'YYYY-MM';

  const financialQuery = `
    SELECT 
      TO_CHAR(created_at, '${dateFormat}') as period,
      -- Revenue
      SUM(CASE WHEN status = 'approved' THEN total_cents ELSE 0 END) as revenue,
      SUM(CASE WHEN status = 'approved' THEN subtotal_cents ELSE 0 END) as subtotal,
      SUM(CASE WHEN status = 'approved' THEN tax_cents ELSE 0 END) as tax,
      -- Estimates
      COUNT(*) as total_estimates,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_estimates,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_estimates,
      COUNT(*) FILTER (WHERE status = 'declined') as declined_estimates,
      -- Conversion rate
      ROUND(
        COUNT(*) FILTER (WHERE status = 'approved')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as conversion_rate,
      -- Average order value
      ROUND(
        AVG(CASE WHEN status = 'approved' THEN total_cents ELSE NULL END) / 100.0, 2
      ) as avg_order_value
    FROM estimates
    WHERE company_id = $1
      AND created_at >= $2::date
      AND created_at <= $3::date
    GROUP BY TO_CHAR(created_at, '${dateFormat}')
    ORDER BY period
  `;

  const financialData = await query(financialQuery, [
    companyId,
    start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date || new Date().toISOString().split('T')[0],
  ]);

  // Service type breakdown
  const serviceBreakdownQuery = `
    SELECT 
      ei.category,
      SUM(ei.line_total_cents) as revenue,
      COUNT(DISTINCT e.id) as estimate_count,
      AVG(ei.line_total_cents) as avg_line_value
    FROM estimate_items ei
    JOIN estimates e ON ei.estimate_id = e.id
    WHERE e.company_id = $1
      AND e.status = 'approved'
      AND e.created_at >= $2::date
      AND e.created_at <= $3::date
    GROUP BY ei.category
    ORDER BY revenue DESC
  `;

  const serviceBreakdown = await query(serviceBreakdownQuery, [
    companyId,
    start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date || new Date().toISOString().split('T')[0],
  ]);

  res.json({
    financial_data: financialData.rows,
    service_breakdown: serviceBreakdown.rows,
    breakdown: breakdown,
  });
}));

// Get operational efficiency report
router.get('/operational', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { start_date, end_date } = req.query;

  // Inspection efficiency metrics
  const inspectionMetricsQuery = `
    SELECT 
      COUNT(*) as total_inspections,
      COUNT(*) FILTER (WHERE submitted_at IS NOT NULL) as completed_inspections,
      ROUND(
        COUNT(*) FILTER (WHERE submitted_at IS NOT NULL)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as completion_rate,
      AVG(EXTRACT(EPOCH FROM (submitted_at - started_at))/60) as avg_duration_minutes,
      -- Issue detection rate
      ROUND(
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM inspection_items ii 
            WHERE ii.inspection_id = inspections.id 
            AND ii.status IN ('fail', 'needs_attention')
          )
        )::numeric / NULLIF(COUNT(*), 0) * 100, 2
      ) as issue_detection_rate
    FROM inspections
    WHERE company_id = $1
      AND created_at >= $2::date
      AND created_at <= $3::date
  `;

  const inspectionMetrics = await query(inspectionMetricsQuery, [
    companyId,
    start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date || new Date().toISOString().split('T')[0],
  ]);

  // Schedule efficiency
  const scheduleEfficiencyQuery = `
    SELECT 
      COUNT(*) as total_appointments,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
      COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
      ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
      ) as completion_rate,
      AVG(duration_minutes) as avg_scheduled_duration,
      AVG(
        CASE WHEN actual_end_time IS NOT NULL AND actual_start_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (actual_end_time::time - actual_start_time::time))/60
        ELSE NULL END
      ) as avg_actual_duration
    FROM schedule
    WHERE company_id = $1
      AND scheduled_date >= $2::date
      AND scheduled_date <= $3::date
  `;

  const scheduleEfficiency = await query(scheduleEfficiencyQuery, [
    companyId,
    start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date || new Date().toISOString().split('T')[0],
  ]);

  // Response time metrics
  const responseTimeQuery = `
    SELECT 
      AVG(EXTRACT(EPOCH FROM (first_contact - created_at))/3600) as avg_first_response_hours,
      AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/24) as avg_approval_days,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (approved_at - created_at))/24
      ) as median_approval_days
    FROM estimates
    WHERE company_id = $1
      AND status = 'approved'
      AND created_at >= $2::date
      AND created_at <= $3::date
  `;

  const responseTime = await query(responseTimeQuery, [
    companyId,
    start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date || new Date().toISOString().split('T')[0],
  ]);

  res.json({
    inspection_metrics: inspectionMetrics.rows[0] || {},
    schedule_efficiency: scheduleEfficiency.rows[0] || {},
    response_time: responseTime.rows[0] || {},
  });
}));

// Get customer satisfaction report
router.get('/satisfaction', asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { start_date, end_date } = req.query;

  // This would require a customer feedback table
  // For now, return placeholder data structure
  const satisfactionData = {
    overall_rating: 4.2,
    response_rate: 68.5,
    ratings_breakdown: {
      5: 45,
      4: 23,
      3: 15,
      2: 8,
      1: 9,
    },
    feedback_categories: {
      timeliness: 4.3,
      quality: 4.1,
      communication: 4.0,
      pricing: 3.8,
    },
    trend: [
      { month: '2024-01', rating: 4.0 },
      { month: '2024-02', rating: 4.1 },
      { month: '2024-03', rating: 4.2 },
    ],
  };

  res.json(satisfactionData);
}));

// Generate custom report
router.post('/custom', asyncHandler(async (req, res) => {
  const {
    report_type,
    metrics,
    filters,
    date_range,
    grouping,
  } = req.body;

  const companyId = req.user.company_id;

  // This would build dynamic queries based on the request
  // For now, return a sample structure
  const customReport = {
    report_id: `custom_${Date.now()}`,
    generated_at: new Date().toISOString(),
    parameters: {
      report_type,
      metrics,
      filters,
      date_range,
      grouping,
    },
    data: [],
    summary: {},
    charts: [],
  };

  res.json(customReport);
}));

// Export report data
router.get('/:reportType/export', asyncHandler(async (req, res) => {
  const { reportType } = req.params;
  const { format = 'csv' } = req.query;
  const companyId = req.user.company_id;

  // This would generate and return export files
  // For now, just return the export URL
  const exportData = {
    export_url: `/api/reports/download/${reportType}_${Date.now()}.${format}`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    format: format,
  };

  res.json(exportData);
}));

module.exports = router;
