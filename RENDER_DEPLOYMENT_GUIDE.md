# Render.com Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Backend Deployment

1. **Create a new Web Service** on Render.com
2. **Connect your GitHub repository** (https://github.com/rbtech24/sprinkler-crm)
3. **Configure the service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm ci --only=production`
   - **Start Command**: `node src/server.js`
   - **Environment**: `Node.js`
   - **Region**: Choose closest to your users

4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret-32-chars-min
   SESSION_SECRET=your-super-secure-session-secret-32-chars-min
   FRONTEND_URL=https://your-frontend.onrender.com
   DATABASE_URL=sqlite:/opt/render/project/src/data/sprinkler_repair.db
   BASE_URL=https://your-backend.onrender.com
   ```

5. **Advanced Settings**:
   - **Auto-Deploy**: Yes
   - **Health Check Path**: `/health`

### 2. Frontend Deployment

1. **Create a new Web Service** on Render.com
2. **Connect the same GitHub repository**
3. **Configure the service**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node.js`
   - **Region**: Same as backend

4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   PORT=3000
   ```

5. **Advanced Settings**:
   - **Auto-Deploy**: Yes
   - **Health Check Path**: `/`

## 🔧 Production Optimizations

### Database Considerations

**Option 1: PostgreSQL (Recommended for Production)**
- Use Render's PostgreSQL service
- Update `DATABASE_URL` to PostgreSQL connection string
- More scalable and reliable than SQLite

**Option 2: SQLite (Current Setup)**
- Works for small-medium applications
- Data persists on Render's disk storage
- Automatic backups available

### Security Configuration

1. **Generate Secure Secrets**:
   ```bash
   # Generate JWT Secret (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate Session Secret (32+ characters)  
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update CORS Origins**:
   - Frontend URL: `https://your-frontend.onrender.com`
   - Custom domain: `https://yourdomain.com`

### Performance Optimization

1. **Backend Scaling**:
   - Start with **Starter** plan ($7/month)
   - Monitor performance and upgrade if needed
   - Enable **Auto-scaling** for traffic spikes

2. **Frontend Optimization**:
   - **Static Site Generation** enabled in Next.js config
   - **Image optimization** disabled for compatibility
   - **Bundle analysis** with optimized imports

## 🔍 Troubleshooting Common Issues

### 1. CORS Errors
- Verify `FRONTEND_URL` environment variable
- Check Render service URLs match CORS configuration
- Ensure both services are deployed and running

### 2. Database Connection Issues
- For SQLite: Verify data directory permissions
- For PostgreSQL: Check connection string format
- Monitor database connection logs

### 3. Build Failures
- Check Node.js version compatibility (18+)
- Verify all dependencies in package.json
- Review build logs for specific errors

### 4. Health Check Failures
- Backend: Ensure `/health` endpoint returns 200
- Frontend: Verify homepage loads correctly
- Check service logs for startup errors

## 📊 Monitoring & Maintenance

### Environment Variables Checklist
- [ ] `NODE_ENV=production`
- [ ] Secure `JWT_SECRET` (32+ chars)
- [ ] Secure `SESSION_SECRET` (32+ chars)
- [ ] Correct `FRONTEND_URL`
- [ ] Valid `DATABASE_URL`
- [ ] Email configuration (SMTP)
- [ ] Stripe keys (if using payments)

### Post-Deployment Testing
1. **Backend Health Check**: `https://your-backend.onrender.com/health`
2. **Frontend Load Test**: `https://your-frontend.onrender.com`
3. **API Integration**: Test login/authentication
4. **CORS Validation**: Test frontend-backend communication
5. **Database Operations**: Verify data persistence

## 🚦 Deployment Status

- ✅ **Backend Dockerfile**: Production-ready
- ✅ **Frontend Dockerfile**: Standalone mode configured
- ✅ **CORS Configuration**: Dynamic origin handling
- ✅ **Environment Variables**: Production templates created
- ✅ **Health Checks**: Implemented for both services
- ✅ **Security**: Helmet, rate limiting, input validation
- ✅ **Database**: SQLite ready, PostgreSQL compatible

## 💰 Cost Estimation

### Render.com Pricing (as of 2024)
- **Backend Service**: $7/month (Starter) - $25/month (Standard)
- **Frontend Service**: $7/month (Starter) - $25/month (Standard)
- **PostgreSQL**: $7/month (Starter) - $90/month (Standard)
- **Total Minimum**: $14-21/month

### Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- 750 hours/month total usage
- Suitable for development/testing only

## 🔗 Useful Links
- [Render.com Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Custom Domains](https://render.com/docs/custom-domains)

---

**Need Help?** Check the troubleshooting section or contact support through the `/support` page!