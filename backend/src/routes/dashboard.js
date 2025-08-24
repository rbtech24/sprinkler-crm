const express = require('express');
const { query } = require('../database/sqlite');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { requireSubscriptionAccess, hasFeatureAccess } = require('../middleware/subscriptionAccess');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Company Dashboard KPIs endpoint
router.get('/company/kpis', authenticateToken, requireAuth, requireSubscriptionAccess('dashboard:basic'), asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  // Check what features the user has access to
  const hasClientsAccess = await hasFeatureAccess(companyId, 'clients:view');
  const hasEstimatesAccess = await hasFeatureAccess(companyId, 'estimates:view');
  const hasWorkOrdersAccess = await hasFeatureAccess(companyId, 'work_orders:view');

  // Base queries that all plans can access
  const baseQueries = [
    // Inspections in last 30 days
    query(`
      SELECT COUNT(*) as count 
      FROM inspections 
      WHERE company_id = ? AND created_at >= datetime('now', '-30 days')
    `, [companyId]),
  ];

  // Additional queries for full CRM access
  const crmQueries = [];
  
  if (hasClientsAccess) {
    crmQueries.push(
      // Total clients
      query('SELECT COUNT(*) as count FROM clients WHERE company_id = ?', [companyId]),
      // Total sites
      query('SELECT COUNT(*) as count FROM sites WHERE company_id = ?', [companyId])
    );
  }

  if (hasEstimatesAccess) {
    crmQueries.push(
      // Estimates data
      query(`
        SELECT 
          COUNT(*) as total_estimates,
          SUM(CASE WHEN status = 'approved' THEN total_cents ELSE 0 END) as total_approved_value,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_estimates,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_estimates
        FROM estimates 
        WHERE company_id = ?
      `, [companyId]),
      // Revenue calculation
      query(`
        SELECT 
          SUM(total_cents) as total_revenue_cents,
          COUNT(*) as completed_jobs
        FROM estimates 
        WHERE company_id = ? AND status = 'approved'
      `, [companyId])
    );
  }

  if (hasWorkOrdersAccess) {
    crmQueries.push(
      // Work orders
      query(`
        SELECT 
          COUNT(*) as total_work_orders,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_work_orders,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_work_orders
        FROM work_orders 
        WHERE company_id = ?
      `, [companyId])
    );
  }

  // Execute all queries
  const results = await Promise.all([...baseQueries, ...crmQueries]);

  // Build stats based on available data
  let resultIndex = 0;
  
  // Always available: inspections
  const inspectionsResult = results[resultIndex++];
  const stats = {
    inspections_last_30_days: inspectionsResult[0].count,
  };

  // Add client/site stats if available
  if (hasClientsAccess) {
    const clientsResult = results[resultIndex++];
    const sitesResult = results[resultIndex++];
    stats.total_clients = clientsResult[0].count;
    stats.total_sites = sitesResult[0].count;
  }

  // Add estimate stats if available
  if (hasEstimatesAccess) {
    const estimatesResult = results[resultIndex++];
    const revenueResult = results[resultIndex++];
    stats.total_estimates = estimatesResult[0].total_estimates || 0;
    stats.total_approved_value = estimatesResult[0].total_approved_value || 0;
    stats.pending_estimates = estimatesResult[0].pending_estimates || 0;
    stats.approval_rate = estimatesResult[0].total_estimates > 0
      ? Math.round((estimatesResult[0].approved_estimates / estimatesResult[0].total_estimates) * 100)
      : 0;
    stats.total_revenue_cents = revenueResult[0].total_revenue_cents || 0;
    stats.avg_job_value = revenueResult[0].completed_jobs > 0
      ? Math.round((revenueResult[0].total_revenue_cents || 0) / revenueResult[0].completed_jobs)
      : 0;
  }

  // Add work order stats if available
  if (hasWorkOrdersAccess) {
    const workOrdersResult = results[resultIndex++];
    stats.total_work_orders = workOrdersResult[0].total_work_orders || 0;
    stats.in_progress_work_orders = workOrdersResult[0].in_progress_work_orders || 0;
    stats.scheduled_work_orders = workOrdersResult[0].scheduled_work_orders || 0;
  }

  res.json({
    success: true,
    data: stats
  });
}));

// Company Dashboard Today's data
router.get('/company/today', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  const schedule = await query(`
    SELECT 
      wo.id,
      wo.status,
      wo.scheduled_at,
      s.name as site_name,
      s.address,
      c.name as client_name,
      u.name as tech_name,
      'work-order' as type
    FROM work_orders wo
    JOIN sites s ON wo.site_id = s.id
    JOIN clients c ON s.client_id = c.id
    LEFT JOIN users u ON wo.technician_id = u.id
    WHERE wo.company_id = ? 
    AND date(wo.scheduled_at) = date('now')
    ORDER BY wo.scheduled_at ASC
  `, [companyId]);

  const inspections = await query(`
    SELECT 
      i.id,
      i.status,
      i.status as inspection_status,
      i.created_at,
      s.name as site_name,
      c.name as client_name
    FROM inspections i
    JOIN sites s ON i.site_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE i.company_id = ?
    AND date(i.created_at) = date('now')
    ORDER BY i.created_at DESC
    LIMIT 5
  `, [companyId]);

  res.json({
    success: true,
    data: {
      schedule,
      recent_inspections: inspections,
      parts_orders: [], // To be implemented
      trends: {
        jobs_per_day: 2.5,
        avg_ticket: 85.50
      }
    }
  });
}));

// Tech Dashboard Today's data
router.get('/tech/today', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const techId = req.user.id;

  const schedule = await query(`
    SELECT 
      wo.id,
      wo.status,
      wo.scheduled_at,
      s.name as site_name,
      s.address,
      c.name as client_name
    FROM work_orders wo
    JOIN sites s ON wo.site_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE wo.company_id = ? AND wo.technician_id = ?
    AND date(wo.scheduled_at) = date('now')
    ORDER BY wo.scheduled_at ASC
  `, [companyId, techId]);

  const timeline = await query(`
    SELECT 
      i.id,
      i.status,
      i.created_at,
      s.name as site_name,
      c.name as client_name,
      'inspection' as type
    FROM inspections i
    JOIN sites s ON i.site_id = s.id
    JOIN clients c ON s.client_id = c.id
    WHERE i.company_id = ? AND i.technician_id = ?
    ORDER BY i.created_at DESC
    LIMIT 10
  `, [companyId, techId]);

  res.json({
    success: true,
    data: {
      schedule,
      timeline,
      productivity: {
        completed_today: timeline.filter(t => t.status === 'completed').length,
        total_assigned: schedule.length
      }
    }
  });
}));

// Job status update endpoint
router.put('/jobs/:id/status', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const companyId = req.user.company_id;

  await query(`
    UPDATE work_orders 
    SET status = ?, updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `, [status, id, companyId]);

  res.json({
    success: true,
    message: 'Job status updated successfully'
  });
}));

// Get recent inspections
router.get('/inspections/recent', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  const inspections = await query(`
    SELECT 
      i.id,
      i.status,
      i.status as inspection_status,
      i.has_estimate,
      i.is_pdf_ready as pdf_ready,
      i.created_at,
      s.name as site_name,
      c.name as client_name,
      u.name as tech_name
    FROM inspections i
    JOIN sites s ON i.site_id = s.id
    JOIN clients c ON s.client_id = c.id
    JOIN users u ON i.technician_id = u.id
    WHERE i.company_id = ?
    ORDER BY i.created_at DESC
    LIMIT 10
  `, [companyId]);

  res.json({
    success: true,
    data: inspections
  });
}));

// Get pipeline data
router.get('/pipeline', authenticateToken, requireAuth, requireSubscriptionAccess('estimates:view'), asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  const pipeline = await query(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(total_cents) as total_value
    FROM estimates
    WHERE company_id = ?
    GROUP BY status
  `, [companyId]);

  res.json({
    success: true,
    data: pipeline
  });
}));

// Legacy stats endpoint (keep for backward compatibility)
router.get('/stats', authenticateToken, requireAuth, asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;

  const [clientsResult, sitesResult, inspectionsResult] = await Promise.all([
    query('SELECT COUNT(*) as count FROM clients WHERE company_id = ?', [companyId]),
    query('SELECT COUNT(*) as count FROM sites WHERE company_id = ?', [companyId]),
    query(`SELECT COUNT(*) as count FROM inspections WHERE company_id = ? AND created_at >= datetime('now', '-30 days')`, [companyId])
  ]);

  res.json({
    total_clients: clientsResult[0].count,
    total_sites: sitesResult[0].count,
    inspections_last_30_days: inspectionsResult[0].count
  });
}));

// Get estimates data
router.get('/estimates', authenticateToken, requireAuth, requireSubscriptionAccess('estimates:view'), asyncHandler(async (req, res) => {
  const companyId = req.user.company_id;
  const { status } = req.query;

  let whereClause = 'WHERE e.company_id = ?';
  const params = [companyId];

  if (status) {
    whereClause += ' AND e.status = ?';
    params.push(status);
  }

  const estimates = await query(`
    SELECT 
      e.id,
      e.status,
      e.total_cents,
      e.sent_at,
      e.viewed_at,
      e.approved_at,
      e.created_at,
      s.name as site_name,
      c.name as client_name
    FROM estimates e
    JOIN sites s ON e.site_id = s.id
    JOIN clients c ON s.client_id = c.id
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT 50
  `, params);

  res.json({
    success: true,
    data: estimates
  });
}));

module.exports = router;
