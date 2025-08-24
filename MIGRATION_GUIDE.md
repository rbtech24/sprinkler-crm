# Database Migration & Performance Optimization Guide

## Overview

This guide walks through migrating your Sprinkler Repair Inspection System from SQLite to PostgreSQL with Redis caching for production deployment.

## Phase 2 Implementation: Database Migration & Performance Optimization

### ✅ Completed Components

1. **PostgreSQL Migration Scripts** - Complete schema conversion
2. **Advanced Connection Pooling** - Production-ready database connections
3. **Redis Caching Layer** - Intelligent caching with fallback support
4. **Database Monitoring** - Query performance tracking and alerting
5. **Migration Testing** - Automated validation and data integrity checks
6. **Production Configuration** - Secure environment setup

---

## 🚀 Quick Start Guide

### Prerequisites

- PostgreSQL 14+ server
- Redis 6+ server (optional but recommended)
- Node.js 18+ with npm
- Production environment access

### 1. Database Setup

**Create PostgreSQL Database:**
```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE irrigation_prod;
CREATE USER irrigation_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE irrigation_prod TO irrigation_user;
ALTER USER irrigation_user CREATEDB; -- For running tests
```

**Set Connection String:**
```bash
export DATABASE_URL="postgresql://irrigation_user:your_secure_password@localhost:5432/irrigation_prod"
```

### 2. Run Migrations

**Execute the migration runner:**
```bash
cd database
node migration-runner.js migrate
```

**Verify migration status:**
```bash
node migration-runner.js status
```

### 3. Test Migration

**Run comprehensive tests:**
```bash
# Test migrations with validation
node test-migration.js test

# Generate detailed report
node test-migration.js report
```

### 4. Configure Production Environment

**Copy and configure production environment:**
```bash
cp backend/.env.production.template backend/.env.production
# Edit .env.production with your production values
```

**Generate secure secrets:**
```bash
# JWT Secret (64 characters)
openssl rand -hex 64

# Session Secret (32 characters)
openssl rand -hex 32
```

### 5. Start Production Server

**With PostgreSQL and Redis:**
```bash
cd backend
NODE_ENV=production npm start
```

---

## 📊 Performance Features

### Connection Pool Configuration

The advanced connection pool provides:
- **Intelligent Sizing**: 5-20 connections based on load
- **Health Monitoring**: Automatic connection health checks
- **Performance Metrics**: Real-time connection statistics
- **Graceful Shutdown**: Clean connection cleanup

### Redis Caching Strategy

| Cache Type | TTL | Use Case |
|------------|-----|----------|
| Dashboard Stats | 5 minutes | Real-time KPIs |
| User Profiles | 1 hour | Authentication data |
| Client Lists | 30 minutes | Frequently accessed lists |
| Service Plans | 2 hours | Rarely changing data |
| Price Books | 2 hours | Static pricing data |

### Database Indexes

25+ optimized indexes covering:
- **Multi-tenancy**: Company-based data isolation
- **Performance**: Join optimization and query acceleration
- **Text Search**: Full-text search capabilities
- **Date Ranges**: Time-based filtering and sorting

---

## 🔍 Monitoring & Health Checks

### Database Monitoring Endpoints

```bash
# Overall health check
GET /api/monitoring/health

# Detailed database metrics
GET /api/monitoring/database

# Slow query analysis
GET /api/monitoring/slow-queries
```

### Performance Metrics Tracked

- **Query Performance**: Response times, slow query detection
- **Connection Health**: Pool utilization, connection errors
- **Cache Performance**: Hit rates, invalidation patterns
- **Error Monitoring**: Database errors and alerting

### Real-time Alerts

Automatic alerts for:
- High error rates (>5%)
- Slow query rates (>15%)
- Connection pool exhaustion
- Cache failures

---

## 🛠️ Advanced Configuration

### Database Pool Tuning

```javascript
// Production pool configuration
const poolConfig = {
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Connection idle timeout
  connectionTimeoutMillis: 2000, // Connection establishment timeout
  acquireTimeoutMillis: 60000,   // Query acquisition timeout
};
```

### Cache Configuration

```javascript
// Redis cache TTL settings
const cacheTTL = {
  dashboard: 300,     // 5 minutes
  users: 3600,        // 1 hour  
  clients: 1800,      // 30 minutes
  reports: 1800,      // 30 minutes
  servicePlans: 7200, // 2 hours
};
```

### Environment-Specific Settings

**Development:**
```bash
NODE_ENV=development
DATABASE_URL=sqlite:./data/sprinkler_repair.db
REDIS_URL=disabled
DB_MONITORING=true
```

**Production:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/irrigation_prod
REDIS_URL=redis://prod-redis:6379/0
DB_MONITORING=true
LOG_LEVEL=info
```

---

## 🔐 Security Considerations

### Database Security

- **Connection Security**: SSL/TLS encryption required
- **User Permissions**: Least privilege database users
- **Query Safety**: Parameterized queries prevent SQL injection
- **Row Level Security**: Company-based data isolation

### Environment Security

- **Secret Management**: Secure environment variable handling
- **Token Security**: Cryptographically secure JWT secrets
- **Connection Pooling**: Protected against connection exhaustion
- **Error Handling**: No sensitive data in error messages

---

## 🚨 Troubleshooting

### Common Migration Issues

**1. Permission Errors**
```bash
# Grant necessary permissions
GRANT ALL ON SCHEMA public TO irrigation_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO irrigation_user;
```

**2. Connection Pool Exhaustion**
```bash
# Check pool configuration
SELECT count(*) FROM pg_stat_activity WHERE usename = 'irrigation_user';

# Tune pool size in .env
DB_POOL_MAX=30
DB_POOL_MIN=10
```

**3. Cache Connection Issues**
```bash
# Test Redis connection
redis-cli ping

# Fallback to memory cache if Redis unavailable
REDIS_URL=disabled
```

**4. Migration Rollback**
```bash
# Rollback last migration
node migration-runner.js rollback

# Rollback to specific version
node migration-runner.js rollback 001_initial_postgresql_schema
```

### Performance Optimization

**Slow Query Debugging:**
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Index Analysis:**
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0;
```

---

## 📋 Production Deployment Checklist

### Pre-deployment

- [ ] PostgreSQL server configured with SSL
- [ ] Redis server configured and secured
- [ ] Database user permissions verified
- [ ] Migration scripts tested on staging
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Monitoring endpoints accessible

### Post-deployment

- [ ] Migration status verified
- [ ] Health checks passing
- [ ] Cache performance metrics normal
- [ ] Database connection pool healthy
- [ ] Slow query monitoring active
- [ ] Error alerting configured
- [ ] Backup strategy implemented

---

## 📈 Performance Expectations

### Expected Improvements

| Metric | SQLite | PostgreSQL | Improvement |
|--------|---------|------------|-------------|
| Concurrent Users | 10-20 | 100+ | 5-10x |
| Query Performance | Variable | Consistent | 2-3x |
| Data Integrity | Basic | ACID Compliant | High |
| Scalability | Limited | Horizontal | Unlimited |
| Caching | None | Redis/Memory | 5-10x |

### Load Testing Results

```bash
# Example load test with 50 concurrent users
npm run load-test

# Expected results:
# - Average response time: <200ms
# - 95th percentile: <500ms  
# - Error rate: <0.1%
# - Cache hit rate: >80%
```

---

## 🔄 Maintenance

### Regular Tasks

**Daily:**
- Monitor slow query log
- Check cache hit rates
- Verify backup completion

**Weekly:**
- Analyze query performance trends
- Review error logs
- Update query statistics

**Monthly:**
- Optimize unused indexes
- Review connection pool sizing
- Performance baseline updates

### Database Maintenance

```sql
-- Update table statistics
ANALYZE;

-- Rebuild indexes if needed
REINDEX DATABASE irrigation_prod;

-- Check database size
SELECT pg_size_pretty(pg_database_size('irrigation_prod'));
```

---

## 🆘 Support & Next Steps

### Phase 3 Recommendations

1. **Enhanced Monitoring** - Implement APM tools (New Relic, Datadog)
2. **Automated Testing** - Add comprehensive test suite
3. **CI/CD Pipeline** - Automated deployment and testing
4. **Load Balancing** - Multiple application instances
5. **Read Replicas** - Database read scaling

### Getting Help

- Review monitoring dashboard: `/api/monitoring/health`
- Check application logs for errors
- Monitor database performance metrics
- Use migration testing tools for validation

This migration provides a solid foundation for production deployment with significant performance improvements and scalability enhancements.