# 🧪 Quick Testing Commands

## Prerequisites
Make sure both backend and frontend are running:

```bash
# Terminal 1: Backend
cd backend
PORT=3006 node src/server.js

# Terminal 2: Frontend (optional)
cd frontend  
npm run dev
```

## 🚀 Quick Tests (30 seconds)

### Option 1: Super Quick Test
```bash
cd backend
node quick-test.js
```

### Option 2: Manual API Tests
```bash
# Health check
curl http://localhost:3006/health

# Test login (should fail with invalid credentials)
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "invalid"}'

# Test protected endpoint (should require auth)
curl http://localhost:3006/api/dashboard/stats

# Create test user and login
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "testpass123"}'

# Use the token from login response
export TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/dashboard/stats
```

## 🔬 Comprehensive Tests (2-3 minutes)

### Option 1: Node.js Test Suite
```bash
cd backend
node test-all-endpoints.js
```

### Option 2: Bash Script (Linux/Mac/Git Bash)
```bash
chmod +x run-tests.sh
./run-tests.sh
```

### Option 3: PowerShell Script (Windows)
```powershell
.\run-tests.ps1
```

## 🐳 Docker Testing

### Test Container Build
```bash
# Backend container
cd backend
docker build -t sprinkler-backend .

# Frontend container  
cd ../frontend
docker build -t sprinkler-frontend .

# Full stack
cd ..
cp .env.docker .env
docker-compose up -d
docker-compose ps
```

### Test Container Health
```bash
# Check backend health
curl http://localhost:3006/health

# Check frontend
curl http://localhost:3007

# View logs
docker-compose logs backend
docker-compose logs frontend
```

## 📊 Performance Testing

### Response Time Test
```bash
# Single request timing
time curl -s http://localhost:3006/health

# Multiple requests
for i in {1..10}; do
  echo "Request $i:"
  time curl -s http://localhost:3006/health > /dev/null
done
```

### Database Performance
```bash
cd backend
node -e "
const { query } = require('./src/database/sqlite');
console.time('Query Performance');
query('SELECT COUNT(*) FROM clients').then(() => {
  console.timeEnd('Query Performance');
}).catch(console.error);
"
```

### Load Testing (if Apache Bench available)
```bash
# Install ab: sudo apt-get install apache2-utils (Linux)
# or brew install httpd (Mac)

# Basic load test
ab -n 100 -c 10 http://localhost:3006/health

# With authentication
export TOKEN="your-jwt-token"
ab -n 50 -c 5 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/dashboard/stats
```

## 🔒 Security Testing

### Test Authentication
```bash
# Test without token (should fail)
curl http://localhost:3006/api/dashboard/stats

# Test with invalid token (should fail)
curl -H "Authorization: Bearer invalid" \
  http://localhost:3006/api/dashboard/stats

# Test with valid token (should work)
curl -H "Authorization: Bearer $VALID_TOKEN" \
  http://localhost:3006/api/dashboard/stats
```

### Test Input Validation
```bash
# Test SQL injection protection
curl -X POST http://localhost:3006/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test\"; DROP TABLE clients; --"}'

# Test oversized input
curl -X POST http://localhost:3006/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "'$(python3 -c "print('A'*5000)")'}'
```

## 🖥️ Frontend Testing

### Basic Frontend Test
1. Navigate to http://localhost:3007
2. Try to access dashboard (should redirect to login)
3. Login with test credentials
4. Verify dashboard loads with data
5. Test navigation between pages

### Frontend API Integration
```bash
# Check frontend environment
cd frontend
cat .env.local

# Should show: NEXT_PUBLIC_API_URL=http://localhost:3006/api
```

## ✅ Success Criteria

**All these should pass:**
- [ ] Health endpoint returns `{"status":"OK"}`
- [ ] Authentication rejects invalid credentials
- [ ] Protected endpoints require valid tokens  
- [ ] Database has 50+ tables and 40+ indexes
- [ ] Dashboard API returns valid data
- [ ] Frontend loads without errors
- [ ] Response times under 500ms
- [ ] Docker containers build successfully

## 🎯 Expected Results

### Healthy System Output:
```json
// Health check
{"status":"OK","timestamp":"2025-01-XX...","version":"1.0.0"}

// Dashboard stats (with auth)
{"total_clients":5,"total_sites":8,"inspections_last_30_days":0...}

// Authentication failure (without auth)
{"error":"Access token required"}
```

### Performance Benchmarks:
- Health check: < 50ms
- Dashboard stats: < 200ms  
- Database queries: < 100ms
- Frontend page load: < 2s

## 🚨 Troubleshooting

**Common Issues:**

1. **Connection Refused**
   ```bash
   # Check if backend is running
   ps aux | grep node
   netstat -an | grep 3006
   ```

2. **Database Errors**
   ```bash
   # Check database file
   ls -la backend/data/sprinkler_repair.db
   
   # Recreate if needed
   cd backend
   node add-missing-tables.js
   ```

3. **Frontend Issues**
   ```bash
   # Check environment variables
   cd frontend
   cat .env.local
   
   # Should have: NEXT_PUBLIC_API_URL=http://localhost:3006/api
   ```

4. **Docker Issues**
   ```bash
   # Check container status
   docker-compose ps
   
   # View logs
   docker-compose logs backend
   
   # Restart services
   docker-compose restart
   ```

Run any of these test suites to verify your application is production-ready!