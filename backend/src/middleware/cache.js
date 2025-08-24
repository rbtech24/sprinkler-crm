/**
 * Enhanced Caching Middleware with Redis Support
 * Backwards compatible with existing NodeCache implementation
 */

const NodeCache = require('node-cache');
const { getCacheService } = require('../services/cacheService');

// Fallback NodeCache instances (used when Redis is not available)
const nodeCache = {
  // Short-term cache (5 minutes) for API responses
  api: new NodeCache({ stdTTL: 300, checkperiod: 60 }),
  
  // Medium-term cache (30 minutes) for stats and aggregations
  stats: new NodeCache({ stdTTL: 1800, checkperiod: 300 }),
  
  // Long-term cache (24 hours) for rarely changing data
  static: new NodeCache({ stdTTL: 86400, checkperiod: 3600 }),
};

// Enhanced cache wrapper that uses Redis when available, NodeCache as fallback
const cache = {
  async get(type, key) {
    const cacheService = getCacheService();
    
    if (cacheService.isEnabled) {
      return await cacheService.get(type, key);
    } else {
      // Fallback to NodeCache
      const cacheInstance = nodeCache[type] || nodeCache.api;
      return cacheInstance.get(key);
    }
  },

  async set(type, key, value, ttl = null) {
    const cacheService = getCacheService();
    
    if (cacheService.isEnabled) {
      return await cacheService.set(type, key, value, ttl);
    } else {
      // Fallback to NodeCache
      const cacheInstance = nodeCache[type] || nodeCache.api;
      return cacheInstance.set(key, value, ttl || 300);
    }
  },

  async del(type, key) {
    const cacheService = getCacheService();
    
    if (cacheService.isEnabled) {
      return await cacheService.delete(type, key);
    } else {
      // Fallback to NodeCache
      const cacheInstance = nodeCache[type] || nodeCache.api;
      return cacheInstance.del(key);
    }
  },

  // Legacy NodeCache interface (for backwards compatibility)
  api: nodeCache.api,
  stats: nodeCache.stats,
  static: nodeCache.static,
};

// Generic cache middleware factory
const cacheMiddleware = (cacheType = 'api', keyGenerator = null) => {
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${req.originalUrl}_${req.user?.company_id || 'public'}`;

    // Try to get from cache
    const cachedData = cache[cacheType].get(key);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original res.json
    const originalJson = res.json;
    
    // Override res.json to cache successful responses
    res.json = function(data) {
      if (res.statusCode === 200) {
        cache[cacheType].set(key, data);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Specific cache middleware for common endpoints
const cacheStrategies = {
  // Dashboard stats - cache for 5 minutes
  dashboardStats: cacheMiddleware('stats', (req) => 
    `dashboard_stats_${req.user.company_id}`),

  // Client list - cache for 2 minutes
  clientList: cacheMiddleware('api', (req) => 
    `clients_${req.user.company_id}_${JSON.stringify(req.query)}`),

  // Site list - cache for 2 minutes
  siteList: cacheMiddleware('api', (req) => 
    `sites_${req.user.company_id}_${JSON.stringify(req.query)}`),

  // Inspection templates - cache for 1 hour (rarely change)
  inspectionTemplates: cacheMiddleware('static', (req) => 
    `templates_${req.user.company_id}`),

  // Price books - cache for 30 minutes
  priceBooks: cacheMiddleware('stats', (req) => 
    `price_books_${req.user.company_id}`),
};

// Cache invalidation helpers
const invalidateCache = {
  // Clear all caches for a company
  company: (companyId) => {
    const patterns = [`*_${companyId}*`, `*_${companyId}_*`];
    patterns.forEach(pattern => {
      Object.values(cache).forEach(cacheInstance => {
        cacheInstance.keys().forEach(key => {
          if (key.includes(companyId.toString())) {
            cacheInstance.del(key);
          }
        });
      });
    });
  },

  // Clear specific cache types
  dashboardStats: (companyId) => {
    cache.stats.del(`dashboard_stats_${companyId}`);
  },

  clients: (companyId) => {
    cache.api.keys().forEach(key => {
      if (key.startsWith(`clients_${companyId}`)) {
        cache.api.del(key);
      }
    });
  },

  sites: (companyId) => {
    cache.api.keys().forEach(key => {
      if (key.startsWith(`sites_${companyId}`)) {
        cache.api.del(key);
      }
    });
  },

  priceBooks: (companyId) => {
    cache.stats.del(`price_books_${companyId}`);
    cache.static.del(`templates_${companyId}`);
  },
};

// Cache stats for monitoring
const getCacheStats = () => {
  return {
    api: cache.api.getStats(),
    stats: cache.stats.getStats(),
    static: cache.static.getStats(),
  };
};

module.exports = {
  cache,
  cacheMiddleware,
  cacheStrategies,
  invalidateCache,
  getCacheStats,
};