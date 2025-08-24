/**
 * Database Query Monitoring and Performance Tracking Middleware
 */

const { performance } = require('perf_hooks');
const { getCacheService } = require('../services/cacheService');

class QueryMonitor {
  constructor() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      totalTime: 0,
      averageTime: 0,
      queryTypes: {},
      slowQueryThreshold: 1000, // 1 second
      topSlowQueries: [],
      maxSlowQueries: 50,
    };
    
    this.realTimeStats = new Map();
    this.monitoringEnabled = process.env.DB_MONITORING !== 'false';
  }

  recordQuery(query, params, duration, error = null, companyId = null) {
    if (!this.monitoringEnabled) return;

    this.metrics.totalQueries++;
    this.metrics.totalTime += duration;
    this.metrics.averageTime = this.metrics.totalTime / this.metrics.totalQueries;

    if (error) {
      this.metrics.errors++;
    }

    if (duration > this.metrics.slowQueryThreshold) {
      this.metrics.slowQueries++;
      
      // Store slow query details
      const slowQuery = {
        query: query.substring(0, 500), // Truncate for storage
        params: params ? params.slice(0, 10) : [], // Limit params
        duration,
        timestamp: new Date().toISOString(),
        companyId,
        error: error?.message,
      };
      
      this.metrics.topSlowQueries.push(slowQuery);
      
      // Keep only recent slow queries
      if (this.metrics.topSlowQueries.length > this.metrics.maxSlowQueries) {
        this.metrics.topSlowQueries = this.metrics.topSlowQueries
          .slice(-this.metrics.maxSlowQueries);
      }
      
      // Log slow query
      console.warn(`🐌 Slow Query (${duration}ms):`, {
        query: query.substring(0, 200),
        duration,
        companyId,
      });
    }

    // Track query types
    const queryType = this.getQueryType(query);
    this.metrics.queryTypes[queryType] = (this.metrics.queryTypes[queryType] || 0) + 1;

    // Real-time stats for current minute
    const currentMinute = Math.floor(Date.now() / 60000);
    if (!this.realTimeStats.has(currentMinute)) {
      this.realTimeStats.set(currentMinute, {
        queries: 0,
        errors: 0,
        totalTime: 0,
        slowQueries: 0,
      });
    }
    
    const minuteStats = this.realTimeStats.get(currentMinute);
    minuteStats.queries++;
    minuteStats.totalTime += duration;
    
    if (error) minuteStats.errors++;
    if (duration > this.metrics.slowQueryThreshold) minuteStats.slowQueries++;

    // Clean up old minute stats (keep last 60 minutes)
    const cutoff = currentMinute - 60;
    for (const [minute] of this.realTimeStats) {
      if (minute < cutoff) {
        this.realTimeStats.delete(minute);
      }
    }
  }

  getQueryType(query) {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('DROP')) return 'DROP';
    return 'OTHER';
  }

  getMetrics() {
    return {
      ...this.metrics,
      realTimeStats: Array.from(this.realTimeStats.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(-10), // Last 10 minutes
    };
  }

  getHealthStatus() {
    const recentMinutes = Array.from(this.realTimeStats.values()).slice(-5);
    const recentErrors = recentMinutes.reduce((sum, stats) => sum + stats.errors, 0);
    const recentQueries = recentMinutes.reduce((sum, stats) => sum + stats.queries, 0);
    const recentSlowQueries = recentMinutes.reduce((sum, stats) => sum + stats.slowQueries, 0);
    
    const errorRate = recentQueries > 0 ? (recentErrors / recentQueries) * 100 : 0;
    const slowQueryRate = recentQueries > 0 ? (recentSlowQueries / recentQueries) * 100 : 0;

    let status = 'healthy';
    const issues = [];

    if (errorRate > 5) {
      status = 'unhealthy';
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    } else if (errorRate > 1) {
      status = 'warning';
      issues.push(`Elevated error rate: ${errorRate.toFixed(2)}%`);
    }

    if (slowQueryRate > 20) {
      status = 'unhealthy';
      issues.push(`High slow query rate: ${slowQueryRate.toFixed(2)}%`);
    } else if (slowQueryRate > 10) {
      if (status === 'healthy') status = 'warning';
      issues.push(`Elevated slow query rate: ${slowQueryRate.toFixed(2)}%`);
    }

    return {
      status,
      issues,
      metrics: {
        errorRate: errorRate.toFixed(2) + '%',
        slowQueryRate: slowQueryRate.toFixed(2) + '%',
        queriesPerMinute: recentQueries / Math.min(5, recentMinutes.length),
        averageResponseTime: this.metrics.averageTime.toFixed(2) + 'ms',
      },
    };
  }

  reset() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      totalTime: 0,
      averageTime: 0,
      queryTypes: {},
      slowQueryThreshold: 1000,
      topSlowQueries: [],
      maxSlowQueries: 50,
    };
    this.realTimeStats.clear();
  }
}

// Singleton instance
const queryMonitor = new QueryMonitor();

/**
 * Database query wrapper with monitoring
 */
function monitorQuery(originalQueryFn) {
  return async function(query, params = [], options = {}) {
    const start = performance.now();
    let error = null;
    let result = null;

    try {
      result = await originalQueryFn.call(this, query, params, options);
      return result;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const duration = performance.now() - start;
      queryMonitor.recordQuery(
        query, 
        params, 
        Math.round(duration),
        error,
        options.companyId
      );
    }
  };
}

/**
 * Express middleware for database performance monitoring
 */
function databaseMonitoringMiddleware() {
  return (req, res, next) => {
    // Add monitoring stats to response headers in development
    if (process.env.NODE_ENV === 'development') {
      const stats = queryMonitor.getMetrics();
      res.set({
        'X-DB-Query-Count': stats.totalQueries.toString(),
        'X-DB-Slow-Queries': stats.slowQueries.toString(),
        'X-DB-Avg-Time': stats.averageTime.toFixed(2) + 'ms',
      });
    }

    next();
  };
}

/**
 * Express route for monitoring dashboard
 */
function createMonitoringRoutes(router) {
  // Database metrics endpoint
  router.get('/monitoring/database', (req, res) => {
    const metrics = queryMonitor.getMetrics();
    const health = queryMonitor.getHealthStatus();
    
    res.json({
      success: true,
      data: {
        health,
        metrics,
        cache: getCacheService().getStats(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Health check endpoint
  router.get('/monitoring/health', (req, res) => {
    const health = queryMonitor.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      metrics: health.metrics,
      issues: health.issues,
    });
  });

  // Slow queries endpoint
  router.get('/monitoring/slow-queries', (req, res) => {
    const metrics = queryMonitor.getMetrics();
    
    res.json({
      success: true,
      data: {
        slowQueries: metrics.topSlowQueries,
        threshold: metrics.slowQueryThreshold,
        totalSlowQueries: metrics.slowQueries,
      },
    });
  });

  // Reset metrics endpoint (development only)
  if (process.env.NODE_ENV === 'development') {
    router.post('/monitoring/reset', (req, res) => {
      queryMonitor.reset();
      res.json({
        success: true,
        message: 'Monitoring metrics reset',
      });
    });
  }
}

/**
 * Performance alert system
 */
class PerformanceAlerts {
  constructor() {
    this.thresholds = {
      errorRate: 5, // 5%
      slowQueryRate: 15, // 15%
      averageResponseTime: 500, // 500ms
      queriesPerMinute: 1000, // 1000 queries/min
    };
    
    this.alertHistory = [];
    this.maxHistorySize = 100;
    
    // Check for alerts every 5 minutes
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        this.checkAlerts();
      }, 5 * 60 * 1000);
    }
  }

  checkAlerts() {
    const health = queryMonitor.getHealthStatus();
    
    if (health.status === 'unhealthy') {
      this.triggerAlert('DATABASE_UNHEALTHY', {
        issues: health.issues,
        metrics: health.metrics,
        timestamp: new Date().toISOString(),
      });
    }

    // Check specific thresholds
    const metrics = queryMonitor.getMetrics();
    const recentStats = Array.from(queryMonitor.realTimeStats.values()).slice(-5);
    
    if (recentStats.length > 0) {
      const avgQueriesPerMinute = recentStats.reduce((sum, stats) => 
        sum + stats.queries, 0) / recentStats.length;
      
      if (avgQueriesPerMinute > this.thresholds.queriesPerMinute) {
        this.triggerAlert('HIGH_QUERY_VOLUME', {
          queriesPerMinute: avgQueriesPerMinute,
          threshold: this.thresholds.queriesPerMinute,
        });
      }
    }
  }

  triggerAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };

    this.alertHistory.push(alert);
    
    // Keep history size manageable
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }

    console.error(`🚨 Performance Alert: ${type}`, data);

    // Here you could integrate with external alerting systems:
    // - Send to Slack/Discord
    // - Send email notifications
    // - Push to monitoring services (Datadog, New Relic, etc.)
    
    this.sendToExternalSystems(alert);
  }

  sendToExternalSystems(alert) {
    // Placeholder for external integrations
    // Example: Send to webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      // Implementation would go here
    }
  }

  getAlerts() {
    return this.alertHistory;
  }
}

const performanceAlerts = new PerformanceAlerts();

module.exports = {
  queryMonitor,
  monitorQuery,
  databaseMonitoringMiddleware,
  createMonitoringRoutes,
  performanceAlerts,
};