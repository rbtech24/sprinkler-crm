# Deployment Guide

## Production Deployment with Docker

### Prerequisites
- Docker & Docker Compose installed
- PostgreSQL database (can use docker-compose)
- Domain name with SSL certificate
- Environment variables configured

### Quick Start

1. **Clone and Setup**
```bash
git clone <repository>
cd sprinkler-repair-saas
```

2. **Configure Environment**
```bash
cp .env.docker .env
# Edit .env with your production values
```

3. **Deploy with Docker Compose**
```bash
docker-compose up -d
```

### Environment Configuration

Create a `.env` file with these production values:

```env
# Database
POSTGRES_PASSWORD=your-secure-database-password

# Application Secrets (CRITICAL - Use generated values)
JWT_SECRET=8932ac4c294406e88edda2014b6db539877dd7723cf4b67f8de0794225478d035a00ca75ea20cdd66871d45bdd4531a19c77a7d1d515fd3f88c4617bbd8dea28
SESSION_SECRET=701bb39b34a5c1a3a1a34a27a4ecc27e682b36f67f16fbd50bcf58090a6514a6a1ff05c1982b66434d40eb325a5614946b8959f5780d6d73adcc32793dcd5712

# Email (Required for user verification)
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password

# AWS S3 (Required for file uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-production-bucket

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_live_your-production-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### Database Migration

For PostgreSQL production deployment:

1. **Switch to PostgreSQL**
```bash
# Edit backend/src/database.js
# Change: const sqlite = require('./database/sqlite');
# To: const postgresql = require('./database/postgresql');
```

2. **Run Migrations**
```bash
# Create database schema
psql -h localhost -U sprinkler_user -d sprinkler_repair_saas -f database/setup.sql

# Run all migrations
for file in database/migrations/*.sql; do
  psql -h localhost -U sprinkler_user -d sprinkler_repair_saas -f "$file"
done
```

### Production Checklist

**Security:**
- ✅ Generated secure JWT/Session secrets
- ✅ HTTPS/SSL configured
- ✅ Database passwords changed
- ✅ CORS properly configured
- ✅ Rate limiting enabled

**Configuration:**
- ✅ Environment variables set
- ✅ Database connection working
- ✅ Email service configured
- ✅ File storage (AWS S3) configured
- ✅ Payment processing (Stripe) configured

**Monitoring:**
- ✅ Health checks enabled
- ✅ Container restart policies set
- ✅ Log aggregation configured
- ✅ Database backups scheduled

### Container Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   Database      │
│   Port: 3007    │    │   Port: 3006    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Health Monitoring

**Endpoints:**
- Backend Health: `http://localhost:3006/health`
- Database Status: Check container logs
- Frontend Status: `http://localhost:3007`

**Docker Commands:**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Restart services
docker-compose restart backend
```

### Performance Optimization

**Backend:**
- Connection pooling enabled (20 connections)
- Request rate limiting (50 req/15min)
- Compression middleware enabled
- Helmet security headers

**Frontend:**
- Static asset optimization
- Image optimization with Next.js
- Code splitting enabled
- Production build optimized

### Scaling Considerations

**Horizontal Scaling:**
- Load balancer required
- Session storage in Redis/database
- File storage in S3 (not local)
- Database connection pooling

**Vertical Scaling:**
- Increase container memory/CPU
- Adjust PostgreSQL settings
- Monitor database connections

### Troubleshooting

**Common Issues:**

1. **Database Connection Errors**
```bash
# Check PostgreSQL container
docker-compose logs postgres
# Verify environment variables
docker-compose exec backend env | grep DATABASE
```

2. **Authentication Issues**
```bash
# Verify JWT secrets are set
docker-compose exec backend env | grep JWT_SECRET
# Check user creation
docker-compose exec postgres psql -U sprinkler_user -d sprinkler_repair_saas -c "SELECT * FROM users LIMIT 1;"
```

3. **File Upload Issues**
```bash
# Check AWS credentials
docker-compose exec backend env | grep AWS
# Verify S3 bucket permissions
```

### Backup Strategy

**Database Backups:**
```bash
# Manual backup
docker-compose exec postgres pg_dump -U sprinkler_user sprinkler_repair_saas > backup.sql

# Automated backup (add to cron)
0 2 * * * docker-compose -f /path/to/docker-compose.yml exec postgres pg_dump -U sprinkler_user sprinkler_repair_saas | gzip > /backups/sprinkler_$(date +\%Y\%m\%d).sql.gz
```

**Volume Backups:**
```bash
# Backup uploaded files
docker run --rm -v sprinkler_backend_uploads:/data -v $(pwd)/backups:/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

### Security Hardening

**Additional Steps:**
1. Enable firewall (UFW/iptables)
2. Regular security updates
3. Monitor access logs
4. Implement intrusion detection
5. Use secrets management (HashiCorp Vault, AWS Secrets Manager)
6. Enable audit logging
7. Regular vulnerability scanning

### Monitoring & Alerting

**Recommended Tools:**
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack or Loki
- **Alerting:** Alertmanager or PagerDuty
- **Uptime:** Pingdom or UptimeRobot

**Key Metrics:**
- Response time
- Error rates
- Database connections
- Memory/CPU usage
- Disk space
- Active users