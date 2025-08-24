/**
 * Redis Caching Service for Performance Optimization
 * Provides intelligent caching with TTL management and cache invalidation
 */

const Redis = require('ioredis');
const crypto = require('crypto');

class CacheService {
  constructor() {
    this.redis = null;
    this.isEnabled = process.env.REDIS_URL && process.env.REDIS_URL !== 'disabled';
    this.keyPrefix = `irrigation_pro_${process.env.NODE_ENV || 'development'}:`;
    
    // Default TTL values (in seconds)
    this.defaultTTL = {
      dashboard: 300,        // 5 minutes - dashboard data
      user: 3600,           // 1 hour - user profiles
      company: 7200,        // 2 hours - company data
      clients: 1800,        // 30 minutes - client lists
      sites: 1800,          // 30 minutes - site data
      inspections: 900,     // 15 minutes - inspection lists
      estimates: 600,       // 10 minutes - estimate data
      workOrders: 300,      // 5 minutes - work order status
      servicePlans: 3600,   // 1 hour - service plan data
      priceBooks: 7200,     // 2 hours - pricing data
      reports: 1800,        // 30 minutes - report data
      session: 900,         // 15 minutes - session data
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
    
    this.init();
  }

  async init() {
    if (!this.isEnabled) {
      console.log('⚠️  Redis caching disabled (REDIS_URL not configured)');
      return;
    }

    try {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis cache connected');
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis cache error:', error);
        this.stats.errors++;
      });

      this.redis.on('close', () => {
        console.log('⚠️  Redis cache connection closed');
      });

      // Test connection
      await this.redis.ping();
      console.log('🚀 Redis caching service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Redis cache:', error);
      this.redis = null;
      this.isEnabled = false;
    }
  }

  generateKey(type, identifier, companyId = null) {
    const parts = [this.keyPrefix, type];
    
    if (companyId) {
      parts.push(`company:${companyId}`);
    }
    
    if (typeof identifier === 'object') {
      const hash = crypto.createHash('md5')
        .update(JSON.stringify(identifier))
        .digest('hex');
      parts.push(hash);
    } else {
      parts.push(identifier);
    }
    
    return parts.join(':');
  }

  async get(type, identifier, companyId = null) {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const key = this.generateKey(type, identifier, companyId);
      const cached = await this.redis.get(key);
      
      if (cached) {
        this.stats.hits++;
        return JSON.parse(cached);
      }
      
      this.stats.misses++;
      return null;
      
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async set(type, identifier, data, ttl = null, companyId = null) {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const key = this.generateKey(type, identifier, companyId);
      const cacheTTL = ttl || this.defaultTTL[type] || this.defaultTTL.dashboard;
      
      await this.redis.setex(key, cacheTTL, JSON.stringify(data));
      this.stats.sets++;
      return true;
      
    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async delete(type, identifier, companyId = null) {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const key = this.generateKey(type, identifier, companyId);
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        this.stats.deletes++;
      }
      
      return deleted > 0;
      
    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async invalidatePattern(pattern, companyId = null) {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const searchPattern = companyId 
        ? `${this.keyPrefix}*company:${companyId}*${pattern}*`
        : `${this.keyPrefix}*${pattern}*`;
      
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.stats.deletes += deleted;
        return deleted;
      }
      
      return 0;
      
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  async invalidateCompany(companyId) {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const pattern = `${this.keyPrefix}*company:${companyId}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.stats.deletes += deleted;
        console.log(`🗑️  Invalidated ${deleted} cache entries for company ${companyId}`);
        return deleted;
      }
      
      return 0;
      
    } catch (error) {
      console.error('Cache invalidate company error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  async flush() {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️  Flushed ${keys.length} cache entries`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Cache flush error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // High-level caching methods for common use cases
  async cacheDashboardStats(companyId, data, ttl = null) {
    return this.set('dashboard', `stats:${companyId}`, data, ttl, companyId);
  }

  async getCachedDashboardStats(companyId) {
    return this.get('dashboard', `stats:${companyId}`, companyId);
  }

  async cacheUserProfile(userId, data, ttl = null) {
    return this.set('user', `profile:${userId}`, data, ttl);
  }

  async getCachedUserProfile(userId) {
    return this.get('user', `profile:${userId}`);
  }

  async cacheClientList(companyId, filters, data, ttl = null) {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.set('clients', key, data, ttl, companyId);
  }

  async getCachedClientList(companyId, filters) {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.get('clients', key, companyId);
  }

  async cacheInspectionList(companyId, filters, data, ttl = null) {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.set('inspections', key, data, ttl, companyId);
  }

  async getCachedInspectionList(companyId, filters) {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.get('inspections', key, companyId);
  }

  async cacheEstimateList(companyId, filters, data, ttl = null) {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.set('estimates', key, data, ttl, companyId);
  }

  async getCachedEstimateList(companyId, filters) {
    const key = `list:${JSON.stringify(filters || {})}`;
    return this.get('estimates', key, companyId);
  }

  // Invalidation helpers for data changes
  async invalidateUserCache(userId) {
    return this.invalidatePattern(`user:profile:${userId}`);
  }

  async invalidateClientCache(companyId) {
    return this.invalidatePattern('clients', companyId);
  }

  async invalidateInspectionCache(companyId) {
    return this.invalidatePattern('inspections', companyId);
  }

  async invalidateEstimateCache(companyId) {
    return this.invalidatePattern('estimates', companyId);
  }

  async invalidateDashboardCache(companyId) {
    return this.invalidatePattern('dashboard', companyId);
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      isEnabled: this.isEnabled,
      connected: this.redis?.status === 'ready',
    };
  }

  async healthCheck() {
    if (!this.isEnabled || !this.redis) {
      return { status: 'disabled' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
        stats: this.getStats(),
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async close() {
    if (this.redis) {
      await this.redis.disconnect();
      console.log('✅ Redis cache connection closed');
    }
  }
}

// Singleton instance
let cacheInstance = null;

function createCacheService() {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

function getCacheService() {
  if (!cacheInstance) {
    cacheInstance = createCacheService();
  }
  return cacheInstance;
}

module.exports = {
  CacheService,
  createCacheService,
  getCacheService,
};