const db = require('../database/sqlite');

class AnalyticsService {
  /**
   * Get comprehensive business dashboard analytics
   * @param {number} companyId - Company ID
   * @param {Object} options - Query options (date range, filters)
   * @returns {Promise<Object>} Dashboard analytics data
   */
  async getDashboardAnalytics(companyId, options = {}) {
    try {
      const {
        start_date = this.getDateDaysAgo(30),
        end_date = new Date().toISOString(),
        compare_period = true,
      } = options;

      const analytics = {
        period: { start_date, end_date },
        summary: {},
        trends: {},
        comparisons: {},
      };

      // Get summary metrics
      analytics.summary = await this.getSummaryMetrics(companyId, start_date, end_date);

      // Get trend data
      analytics.trends = await this.getTrendData(companyId, start_date, end_date);

      // Get comparison data if requested
      if (compare_period) {
        const prevStart = this.getDateDaysAgo(this.getDaysDifference(start_date, end_date) * 2);
        const prevEnd = start_date;
        analytics.comparisons = await this.getComparisonData(companyId, prevStart, prevEnd, start_date, end_date);
      }

      return analytics;
    } catch (error) {
      console.error('Dashboard analytics error:', error);
      throw error;
    }
  }

  /**
   * Get summary metrics for the dashboard
   * @private
   */
  async getSummaryMetrics(companyId, startDate, endDate) {
    const [
      inspectionStats,
      workOrderStats,
      estimateStats,
      revenueStats,
      customerStats,
    ] = await Promise.all([
      this.getInspectionMetrics(companyId, startDate, endDate),
      this.getWorkOrderMetrics(companyId, startDate, endDate),
      this.getEstimateMetrics(companyId, startDate, endDate),
      this.getRevenueMetrics(companyId, startDate, endDate),
      this.getCustomerMetrics(companyId, startDate, endDate),
    ]);

    return {
      inspections: inspectionStats,
      work_orders: workOrderStats,
      estimates: estimateStats,
      revenue: revenueStats,
      customers: customerStats,
    };
  }

  /**
   * Get inspection metrics
   * @private
   */
  async getInspectionMetrics(companyId, startDate, endDate) {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_inspections,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_inspections,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_inspections,
        COUNT(CASE WHEN issues_count > 0 THEN 1 END) as inspections_with_issues,
        AVG(issues_count) as avg_issues_per_inspection,
        COUNT(CASE WHEN has_estimate = 1 THEN 1 END) as inspections_with_estimates
      FROM inspections
      WHERE company_id = ?
        AND created_at BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    const completionRate = stats.total_inspections > 0
      ? (stats.completed_inspections / stats.total_inspections * 100).toFixed(1)
      : 0;

    const estimateConversionRate = stats.total_inspections > 0
      ? (stats.inspections_with_estimates / stats.total_inspections * 100).toFixed(1)
      : 0;

    return {
      total: stats.total_inspections || 0,
      completed: stats.completed_inspections || 0,
      in_progress: stats.in_progress_inspections || 0,
      with_issues: stats.inspections_with_issues || 0,
      avg_issues: Math.round((stats.avg_issues_per_inspection || 0) * 10) / 10,
      completion_rate: parseFloat(completionRate),
      estimate_conversion_rate: parseFloat(estimateConversionRate),
    };
  }

  /**
   * Get work order metrics
   * @private
   */
  async getWorkOrderMetrics(companyId, startDate, endDate) {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_work_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_work_orders,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_work_orders,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_work_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_work_orders,
        AVG(CASE 
          WHEN status = 'completed' AND scheduled_at IS NOT NULL 
          THEN JULIANDAY(updated_at) - JULIANDAY(scheduled_at) 
        END) as avg_completion_days
      FROM work_orders
      WHERE company_id = ?
        AND created_at BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    const completionRate = stats.total_work_orders > 0
      ? (stats.completed_work_orders / stats.total_work_orders * 100).toFixed(1)
      : 0;

    return {
      total: stats.total_work_orders || 0,
      completed: stats.completed_work_orders || 0,
      scheduled: stats.scheduled_work_orders || 0,
      in_progress: stats.in_progress_work_orders || 0,
      cancelled: stats.cancelled_work_orders || 0,
      completion_rate: parseFloat(completionRate),
      avg_completion_days: Math.round((stats.avg_completion_days || 0) * 10) / 10,
    };
  }

  /**
   * Get estimate metrics
   * @private
   */
  async getEstimateMetrics(companyId, startDate, endDate) {
    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_estimates,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_estimates,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_estimates,
        COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_estimates,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_estimates,
        AVG(total_cents) as avg_estimate_amount,
        SUM(CASE WHEN status IN ('approved', 'paid') THEN total_cents ELSE 0 END) as approved_value_cents
      FROM estimates
      WHERE company_id = ?
        AND created_at BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    const approvalRate = stats.sent_estimates > 0
      ? (stats.approved_estimates / stats.sent_estimates * 100).toFixed(1)
      : 0;

    const paymentRate = stats.approved_estimates > 0
      ? (stats.paid_estimates / stats.approved_estimates * 100).toFixed(1)
      : 0;

    return {
      total: stats.total_estimates || 0,
      sent: stats.sent_estimates || 0,
      approved: stats.approved_estimates || 0,
      declined: stats.declined_estimates || 0,
      paid: stats.paid_estimates || 0,
      approval_rate: parseFloat(approvalRate),
      payment_rate: parseFloat(paymentRate),
      avg_amount_cents: Math.round(stats.avg_estimate_amount || 0),
      approved_value_cents: stats.approved_value_cents || 0,
    };
  }

  /**
   * Get revenue metrics
   * @private
   */
  async getRevenueMetrics(companyId, startDate, endDate) {
    // Get payment revenue
    const paymentRevenue = await db.get(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'succeeded' THEN amount_cents ELSE 0 END) as total_revenue_cents,
        AVG(CASE WHEN status = 'succeeded' THEN amount_cents END) as avg_payment_cents
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    // Get estimate pipeline value
    const pipelineValue = await db.get(`
      SELECT 
        SUM(CASE WHEN status = 'sent' THEN total_cents ELSE 0 END) as pending_value_cents,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_estimates
      FROM estimates
      WHERE company_id = ?
        AND created_at BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    return {
      total_revenue_cents: paymentRevenue.total_revenue_cents || 0,
      total_payments: paymentRevenue.total_payments || 0,
      avg_payment_cents: Math.round(paymentRevenue.avg_payment_cents || 0),
      pipeline_value_cents: pipelineValue.pending_value_cents || 0,
      pending_estimates: pipelineValue.pending_estimates || 0,
    };
  }

  /**
   * Get customer metrics
   * @private
   */
  async getCustomerMetrics(companyId, startDate, endDate) {
    const stats = await db.get(`
      SELECT 
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN i.created_at BETWEEN ? AND ? THEN c.id END) as active_customers,
        COUNT(DISTINCT CASE WHEN c.created_at BETWEEN ? AND ? THEN c.id END) as new_customers
      FROM clients c
      LEFT JOIN sites s ON c.id = s.client_id
      LEFT JOIN inspections i ON s.id = i.site_id
      WHERE c.company_id = ?
    `, [startDate, endDate, startDate, endDate, companyId]);

    // Customer retention rate (customers with multiple services)
    const retentionStats = await db.get(`
      SELECT 
        COUNT(DISTINCT c.id) as customers_with_multiple_services
      FROM clients c
      JOIN sites s ON c.id = s.client_id
      JOIN inspections i ON s.id = i.site_id
      WHERE c.company_id = ?
        AND i.created_at BETWEEN ? AND ?
      GROUP BY c.id
      HAVING COUNT(i.id) > 1
    `, [companyId, startDate, endDate]);

    const retentionRate = stats.active_customers > 0
      ? ((retentionStats.customers_with_multiple_services || 0) / stats.active_customers * 100).toFixed(1)
      : 0;

    return {
      total: stats.total_customers || 0,
      active: stats.active_customers || 0,
      new: stats.new_customers || 0,
      retention_rate: parseFloat(retentionRate),
    };
  }

  /**
   * Get trend data over time
   * @private
   */
  async getTrendData(companyId, startDate, endDate) {
    // Daily inspection trends
    const inspectionTrends = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as inspections,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM inspections
      WHERE company_id = ?
        AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [companyId, startDate, endDate]);

    // Daily revenue trends
    const revenueTrends = await db.query(`
      SELECT 
        DATE(p.created_at) as date,
        SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as revenue_cents,
        COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as payments
      FROM payments p
      JOIN clients c ON p.client_id = c.id
      WHERE c.company_id = ?
        AND p.created_at BETWEEN ? AND ?
      GROUP BY DATE(p.created_at)
      ORDER BY date
    `, [companyId, startDate, endDate]);

    // Weekly work order completion trends
    const workOrderTrends = await db.query(`
      SELECT 
        strftime('%Y-W%W', created_at) as week,
        COUNT(*) as created,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM work_orders
      WHERE company_id = ?
        AND created_at BETWEEN ? AND ?
      GROUP BY strftime('%Y-W%W', created_at)
      ORDER BY week
    `, [companyId, startDate, endDate]);

    return {
      inspections: inspectionTrends,
      revenue: revenueTrends,
      work_orders: workOrderTrends,
    };
  }

  /**
   * Get comparison data with previous period
   * @private
   */
  async getComparisonData(companyId, prevStart, prevEnd, currentStart, currentEnd) {
    const [currentMetrics, previousMetrics] = await Promise.all([
      this.getSummaryMetrics(companyId, currentStart, currentEnd),
      this.getSummaryMetrics(companyId, prevStart, prevEnd),
    ]);

    const comparisons = {};

    // Calculate percentage changes
    for (const category in currentMetrics) {
      comparisons[category] = {};

      for (const metric in currentMetrics[category]) {
        const current = currentMetrics[category][metric];
        const previous = previousMetrics[category][metric];

        if (typeof current === 'number' && typeof previous === 'number') {
          if (previous === 0) {
            comparisons[category][metric] = current > 0 ? 100 : 0;
          } else {
            comparisons[category][metric] = ((current - previous) / previous * 100);
          }
        }
      }
    }

    return comparisons;
  }

  /**
   * Get technician performance analytics
   * @param {number} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Technician performance data
   */
  async getTechnicianPerformance(companyId, options = {}) {
    try {
      const {
        start_date = this.getDateDaysAgo(30),
        end_date = new Date().toISOString(),
        technician_id = null,
      } = options;

      let whereClause = 'WHERE u.company_id = ? AND u.role = "tech"';
      const params = [companyId];

      if (technician_id) {
        whereClause += ' AND u.id = ?';
        params.push(technician_id);
      }

      const performance = await db.query(`
        SELECT 
          u.id,
          u.name as technician_name,
          COUNT(DISTINCT i.id) as total_inspections,
          COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_inspections,
          COUNT(DISTINCT wo.id) as total_work_orders,
          COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) as completed_work_orders,
          AVG(i.issues_count) as avg_issues_found,
          COUNT(DISTINCT CASE WHEN i.has_estimate = 1 THEN i.id END) as inspections_with_estimates,
          SUM(CASE WHEN e.status IN ('approved', 'paid') THEN e.total_cents ELSE 0 END) as revenue_generated_cents
        FROM users u
        LEFT JOIN inspections i ON u.id = i.tech_id 
          AND i.created_at BETWEEN ? AND ?
        LEFT JOIN work_orders wo ON u.id = wo.tech_id 
          AND wo.created_at BETWEEN ? AND ?
        LEFT JOIN estimates e ON i.id = e.inspection_id
        ${whereClause}
        GROUP BY u.id, u.name
        ORDER BY total_inspections DESC
      `, [start_date, end_date, start_date, end_date, ...params]);

      // Calculate performance scores
      performance.forEach((tech) => {
        const completionRate = tech.total_inspections > 0
          ? (tech.completed_inspections / tech.total_inspections * 100).toFixed(1)
          : 0;

        const estimateRate = tech.total_inspections > 0
          ? (tech.inspections_with_estimates / tech.total_inspections * 100).toFixed(1)
          : 0;

        tech.completion_rate = parseFloat(completionRate);
        tech.estimate_conversion_rate = parseFloat(estimateRate);
        tech.avg_issues_found = Math.round((tech.avg_issues_found || 0) * 10) / 10;
        tech.revenue_generated_cents = tech.revenue_generated_cents || 0;
      });

      return {
        technicians: performance,
        period: { start_date, end_date },
      };
    } catch (error) {
      console.error('Technician performance analytics error:', error);
      throw error;
    }
  }

  /**
   * Get customer analytics
   * @param {number} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customer analytics data
   */
  async getCustomerAnalytics(companyId, options = {}) {
    try {
      const {
        start_date = this.getDateDaysAgo(365), // Default to 1 year
        end_date = new Date().toISOString(),
      } = options;

      // Top customers by revenue
      const topCustomers = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.type,
          COUNT(DISTINCT i.id) as total_inspections,
          COUNT(DISTINCT wo.id) as total_work_orders,
          COUNT(DISTINCT e.id) as total_estimates,
          SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as total_revenue_cents,
          MAX(i.created_at) as last_service_date
        FROM clients c
        LEFT JOIN sites s ON c.id = s.client_id
        LEFT JOIN inspections i ON s.id = i.site_id
        LEFT JOIN work_orders wo ON s.id = wo.site_id
        LEFT JOIN estimates e ON s.id = e.site_id
        LEFT JOIN payments p ON e.id = p.estimate_id
        WHERE c.company_id = ?
          AND (i.created_at BETWEEN ? AND ? OR wo.created_at BETWEEN ? AND ?)
        GROUP BY c.id
        ORDER BY total_revenue_cents DESC
        LIMIT 20
      `, [companyId, start_date, end_date, start_date, end_date]);

      // Customer segmentation by service frequency
      const segmentation = await db.get(`
        SELECT 
          COUNT(CASE WHEN service_count = 1 THEN 1 END) as one_time_customers,
          COUNT(CASE WHEN service_count BETWEEN 2 AND 5 THEN 1 END) as regular_customers,
          COUNT(CASE WHEN service_count > 5 THEN 1 END) as loyal_customers
        FROM (
          SELECT 
            c.id,
            COUNT(DISTINCT i.id) + COUNT(DISTINCT wo.id) as service_count
          FROM clients c
          LEFT JOIN sites s ON c.id = s.client_id
          LEFT JOIN inspections i ON s.id = i.site_id AND i.created_at BETWEEN ? AND ?
          LEFT JOIN work_orders wo ON s.id = wo.site_id AND wo.created_at BETWEEN ? AND ?
          WHERE c.company_id = ?
          GROUP BY c.id
          HAVING service_count > 0
        )
      `, [start_date, end_date, start_date, end_date, companyId]);

      // Geographic distribution
      const geographic = await db.query(`
        SELECT 
          COALESCE(s.city, 'Unknown') as city,
          COALESCE(s.state, 'Unknown') as state,
          COUNT(DISTINCT c.id) as customer_count,
          COUNT(DISTINCT i.id) as inspection_count,
          SUM(CASE WHEN p.status = 'succeeded' THEN p.amount_cents ELSE 0 END) as revenue_cents
        FROM clients c
        JOIN sites s ON c.id = s.client_id
        LEFT JOIN inspections i ON s.id = i.site_id AND i.created_at BETWEEN ? AND ?
        LEFT JOIN estimates e ON i.id = e.inspection_id
        LEFT JOIN payments p ON e.id = p.estimate_id
        WHERE c.company_id = ?
        GROUP BY s.city, s.state
        ORDER BY customer_count DESC
        LIMIT 10
      `, [start_date, end_date, companyId]);

      return {
        top_customers: topCustomers,
        segmentation: {
          one_time: segmentation.one_time_customers || 0,
          regular: segmentation.regular_customers || 0,
          loyal: segmentation.loyal_customers || 0,
        },
        geographic_distribution: geographic,
        period: { start_date, end_date },
      };
    } catch (error) {
      console.error('Customer analytics error:', error);
      throw error;
    }
  }

  /**
   * Get operational efficiency metrics
   * @param {number} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Efficiency metrics
   */
  async getOperationalEfficiency(companyId, options = {}) {
    try {
      const {
        start_date = this.getDateDaysAgo(30),
        end_date = new Date().toISOString(),
      } = options;

      // Schedule optimization metrics
      const scheduleEfficiency = await db.get(`
        SELECT 
          COUNT(DISTINCT ro.id) as optimized_routes,
          AVG(ro.total_distance_miles) as avg_route_distance,
          AVG(ro.total_time_minutes) as avg_route_time,
          COUNT(DISTINCT sc.id) as conflicts_detected,
          COUNT(DISTINCT CASE WHEN sc.status = 'resolved' THEN sc.id END) as conflicts_resolved
        FROM route_optimizations ro
        LEFT JOIN schedule_conflicts sc ON DATE(ro.date) = DATE(sc.created_at)
        WHERE ro.company_id = ?
          AND ro.created_at BETWEEN ? AND ?
      `, [companyId, start_date, end_date]);

      // Assignment efficiency
      const assignmentEfficiency = await db.get(`
        SELECT 
          COUNT(*) as total_assignments,
          AVG(algorithm_score) as avg_confidence_score,
          COUNT(CASE WHEN algorithm_score > 80 THEN 1 END) as high_confidence_assignments
        FROM assignment_logs al
        JOIN users u ON al.assigned_to = u.id
        WHERE u.company_id = ?
          AND al.created_at BETWEEN ? AND ?
      `, [companyId, start_date, end_date]);

      // Technician utilization
      const utilization = await db.query(`
        SELECT 
          u.name as technician_name,
          COUNT(DISTINCT DATE(i.created_at)) as active_days,
          COUNT(i.id) as total_jobs,
          AVG(CASE 
            WHEN i.created_at IS NOT NULL AND i.updated_at IS NOT NULL 
            THEN (JULIANDAY(i.updated_at) - JULIANDAY(i.created_at)) * 24 
          END) as avg_job_hours
        FROM users u
        LEFT JOIN inspections i ON u.id = i.tech_id 
          AND i.created_at BETWEEN ? AND ?
        WHERE u.company_id = ?
          AND u.role = 'tech'
        GROUP BY u.id, u.name
        ORDER BY total_jobs DESC
      `, [start_date, end_date, companyId]);

      const highConfidenceRate = assignmentEfficiency.total_assignments > 0
        ? (assignmentEfficiency.high_confidence_assignments / assignmentEfficiency.total_assignments * 100).toFixed(1)
        : 0;

      const conflictResolutionRate = scheduleEfficiency.conflicts_detected > 0
        ? (scheduleEfficiency.conflicts_resolved / scheduleEfficiency.conflicts_detected * 100).toFixed(1)
        : 0;

      return {
        schedule_optimization: {
          optimized_routes: scheduleEfficiency.optimized_routes || 0,
          avg_route_distance_miles: Math.round((scheduleEfficiency.avg_route_distance || 0) * 10) / 10,
          avg_route_time_minutes: Math.round(scheduleEfficiency.avg_route_time || 0),
          conflicts_detected: scheduleEfficiency.conflicts_detected || 0,
          conflict_resolution_rate: parseFloat(conflictResolutionRate),
        },
        assignment_efficiency: {
          total_assignments: assignmentEfficiency.total_assignments || 0,
          avg_confidence_score: Math.round((assignmentEfficiency.avg_confidence_score || 0) * 10) / 10,
          high_confidence_rate: parseFloat(highConfidenceRate),
        },
        technician_utilization: utilization.map((tech) => ({
          ...tech,
          active_days: tech.active_days || 0,
          total_jobs: tech.total_jobs || 0,
          avg_job_hours: Math.round((tech.avg_job_hours || 0) * 10) / 10,
        })),
        period: { start_date, end_date },
      };
    } catch (error) {
      console.error('Operational efficiency analytics error:', error);
      throw error;
    }
  }

  /**
   * Helper method to get date N days ago
   * @private
   */
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  /**
   * Helper method to get difference in days between two dates
   * @private
   */
  getDaysDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }
}

module.exports = new AnalyticsService();
