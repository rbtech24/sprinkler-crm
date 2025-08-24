# 🧪 Comprehensive Local Testing Guide

## Overview
This guide provides step-by-step instructions to test every aspect of the Sprinkler Repair SaaS application locally before production deployment.

## 🚀 Quick Start Testing

### 1. Environment Setup
```bash
# Terminal 1: Start Backend
cd backend
npm install
PORT=3006 node src/server.js

# Terminal 2: Start Frontend  
cd frontend
npm install
npm run dev

# Terminal 3: Testing Commands
cd backend
```

### 2. Basic Health Check
```bash
# Test server health
curl http://localhost:3006/health

# Expected: {"status":"OK","timestamp":"...","version":"1.0.0"}
```

## 🔐 Authentication Testing

### Create Test User & Login
```bash
# Create test user
node -e "
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
const hash = bcrypt.hashSync('TestPass123!', 10);
db.run('INSERT OR REPLACE INTO users (id, company_id, email, password_hash, name, role, email_verified) VALUES (1000, 6, \"testuser@example.com\", ?, \"Test User\", \"owner\", 1)', [hash], () => { console.log('✅ Test user created: testuser@example.com / TestPass123!'); db.close(); });
"

# Test login
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "TestPass123!"}'

# Save the token from response for further testing
export TOKEN="your-jwt-token-here"
```

### Test Authentication Security
```bash
# Test invalid credentials
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "password": "wrongpassword"}'

# Test missing token
curl http://localhost:3006/api/dashboard/stats

# Test invalid token
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:3006/api/dashboard/stats
```

## 📊 API Endpoint Testing

### Dashboard Endpoints
```bash
# Test all dashboard endpoints
export TOKEN="your-jwt-token"

echo "Testing Dashboard Stats..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/dashboard/stats | jq

echo "Testing Clients..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/clients | jq

echo "Testing Inspection Templates..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/inspections/templates | jq

echo "Testing Estimates..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/estimates | jq
```

### CRUD Operations Testing
```bash
# Create a client
curl -X POST http://localhost:3006/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "contact_type": "residential",
    "billing_email": "client@test.com",
    "phone": "555-123-4567"
  }'

# Get clients list
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/clients

# Update client (use ID from create response)
curl -X PUT http://localhost:3006/api/clients/CLIENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "555-999-8888"}'
```

## 🗄️ Database Testing

### Schema Validation
```bash
# Check all tables exist
node -e "
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
db.all('SELECT name FROM sqlite_master WHERE type=\"table\"', (err, tables) => { 
  console.log('📊 Database Tables (' + tables.length + '):'); 
  tables.forEach(t => console.log('  ✅', t.name)); 
  db.close(); 
});
"

# Check indexes
node -e "
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
db.all('SELECT name FROM sqlite_master WHERE type=\"index\" AND name NOT LIKE \"sqlite_%\"', (err, indexes) => { 
  console.log('🚀 Performance Indexes (' + indexes.length + '):'); 
  indexes.forEach(i => console.log('  ✅', i.name)); 
  db.close(); 
});
"
```

### Data Integrity Testing
```bash
# Test foreign key constraints
node -e "
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
console.log('🔗 Testing Foreign Key Constraints...');

// Test invalid company_id
db.run('INSERT INTO clients (company_id, name, contact_type) VALUES (99999, \"Invalid Client\", \"residential\")', (err) => {
  if (err) console.log('✅ Foreign key constraint working:', err.message);
  else console.log('❌ Foreign key constraint failed');
  db.close();
});
"
```

## ⚡ Performance Testing

### Database Performance
```bash
# Run database analysis
node -e "const { analyzeDatabase } = require('./src/database/indexes'); analyzeDatabase();"

# Test query performance
node -e "
const { query } = require('./src/database/sqlite');
console.time('Dashboard Stats Query');
query('SELECT COUNT(*) as clients FROM clients WHERE company_id = 6').then(() => {
  console.timeEnd('Dashboard Stats Query');
}).catch(console.error);
"
```

### Load Testing (Simple)
```bash
# Install Apache Bench if not available
# On Windows: Install via Git Bash or WSL
# On Mac: brew install httpd
# On Linux: sudo apt-get install apache2-utils

# Test concurrent requests
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3006/api/dashboard/stats

# Test without caching (force cache miss)
for i in {1..5}; do
  echo "Request $i:"
  time curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:3006/api/clients?page=$i" > /dev/null
done
```

## 🔒 Security Testing

### Input Validation Testing
```bash
# Test SQL injection protection
curl -X POST http://localhost:3006/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test'; DROP TABLE clients; --", "contact_type": "residential"}'

# Test XSS protection
curl -X POST http://localhost:3006/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(\"xss\")</script>", "contact_type": "residential"}'

# Test oversized payload
curl -X POST http://localhost:3006/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "'$(python3 -c "print('A' * 10000)")'", "contact_type": "residential"}'
```

### Rate Limiting Testing
```bash
# Test rate limiting (should get blocked after 50 requests)
for i in {1..55}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    http://localhost:3006/api/dashboard/stats
  sleep 0.1
done
```

## 🖥️ Frontend Testing

### Manual UI Testing Checklist
1. **Navigate to http://localhost:3007**
2. **Test Authentication:**
   - [ ] Login page loads
   - [ ] Login with test credentials works
   - [ ] Invalid credentials show error
   - [ ] Logout works

3. **Test Dashboard:**
   - [ ] Dashboard loads with stats
   - [ ] All KPI cards show data
   - [ ] Charts render properly
   - [ ] No console errors

4. **Test Navigation:**
   - [ ] All sidebar links work
   - [ ] Role-based access control works
   - [ ] Page transitions smooth

### Frontend API Integration Test
```bash
# Check frontend API configuration
cd frontend
grep -r "NEXT_PUBLIC_API_URL" .env.local

# Expected: NEXT_PUBLIC_API_URL=http://localhost:3006/api
```

## 🐳 Docker Testing

### Local Container Testing
```bash
# Build and test backend container
cd backend
docker build -t sprinkler-backend .

# Test backend container
docker run -p 3006:3006 \
  -e NODE_ENV=production \
  -e JWT_SECRET=test-secret \
  sprinkler-backend

# Build and test frontend container
cd ../frontend
docker build -t sprinkler-frontend .

# Test full stack with docker-compose
cd ..
cp .env.docker .env
docker-compose up -d

# Test containers
docker-compose ps
docker-compose logs backend
curl http://localhost:3006/health
curl http://localhost:3007
```

## 📝 Automated Test Suite

### Create Test Runner Script
```bash
# Create comprehensive test script
cat > run-tests.sh << 'EOF'
#!/bin/bash
set -e

echo "🧪 Starting Comprehensive Local Testing..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="$3"
  local headers="$4"
  
  echo -n "Testing $name... "
  
  if [ -n "$headers" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" -H "$headers" "$url")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  fi
  
  if [ "$status" -eq "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} ($status)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
    ((FAILED++))
  fi
}

# Setup
export BASE_URL="http://localhost:3006"
export TOKEN=""

echo "1. Testing Basic Connectivity..."
test_endpoint "Health Check" "$BASE_URL/health" 200

echo -e "\n2. Testing Authentication..."
echo "Creating test user..."
node -e "
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
const hash = bcrypt.hashSync('TestPass123!', 10);
db.run('INSERT OR REPLACE INTO users (id, company_id, email, password_hash, name, role, email_verified) VALUES (1001, 6, \"autotest@example.com\", ?, \"Auto Test User\", \"owner\", 1)', [hash], () => db.close());
" 2>/dev/null

echo -n "Testing Login... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "autotest@example.com", "password": "TestPass123!"}')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  export TOKEN=$(echo "$LOGIN_RESPONSE" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin')).token)")
  echo -e "${GREEN}✅ PASS${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}"
  ((FAILED++))
fi

echo -e "\n3. Testing Protected Endpoints..."
test_endpoint "Dashboard Stats" "$BASE_URL/api/dashboard/stats" 200 "Authorization: Bearer $TOKEN"
test_endpoint "Clients List" "$BASE_URL/api/clients" 200 "Authorization: Bearer $TOKEN"
test_endpoint "Inspection Templates" "$BASE_URL/api/inspections/templates" 200 "Authorization: Bearer $TOKEN"
test_endpoint "Estimates List" "$BASE_URL/api/estimates" 200 "Authorization: Bearer $TOKEN"

echo -e "\n4. Testing Security..."
test_endpoint "Unauthorized Access" "$BASE_URL/api/dashboard/stats" 401
test_endpoint "Invalid Token" "$BASE_URL/api/dashboard/stats" 403 "Authorization: Bearer invalid-token"

echo -e "\n=========================================="
echo -e "📊 Test Results:"
echo -e "   ${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "   ${RED}Failed: $FAILED${NC}"
  echo -e "\n❌ Some tests failed. Please check the issues above."
  exit 1
else
  echo -e "   ${RED}Failed: $FAILED${NC}"
  echo -e "\n🎉 All tests passed! Application is ready for production."
fi
EOF

chmod +x run-tests.sh
```

### Run All Tests
```bash
# Run the comprehensive test suite
./run-tests.sh
```

## 📋 Manual Testing Checklist

### Backend API Testing
- [ ] Health endpoint responds correctly
- [ ] Authentication working (login/logout)
- [ ] All dashboard endpoints return data
- [ ] CRUD operations work for clients/sites
- [ ] Error handling returns proper status codes
- [ ] Rate limiting triggers after threshold
- [ ] Input validation rejects invalid data

### Database Testing
- [ ] All 50 tables exist
- [ ] 40+ performance indexes created
- [ ] Foreign key constraints working
- [ ] Multi-tenant data isolation
- [ ] Query performance acceptable (< 100ms)

### Security Testing
- [ ] JWT tokens properly validated
- [ ] SQL injection attempts blocked
- [ ] XSS protection working
- [ ] Rate limiting functional
- [ ] CORS properly configured

### Frontend Testing
- [ ] Application loads at localhost:3007
- [ ] Login/logout flow works
- [ ] Dashboard displays data
- [ ] Navigation between pages works
- [ ] No console errors
- [ ] API calls successful

### Performance Testing
- [ ] Dashboard loads in < 2 seconds
- [ ] Database queries execute in < 100ms
- [ ] Caching reduces response times
- [ ] Memory usage stable under load

### Docker Testing
- [ ] Backend container builds successfully
- [ ] Frontend container builds successfully
- [ ] docker-compose stack starts
- [ ] All services healthy
- [ ] Inter-container communication works

## 🎯 Success Criteria

**All tests must pass before production deployment:**

✅ **Connectivity:** Health check returns 200
✅ **Authentication:** Login/logout cycle works
✅ **Authorization:** Protected routes require valid tokens
✅ **Data Flow:** All CRUD operations functional
✅ **Security:** Rate limiting and validation active
✅ **Performance:** Responses under acceptable thresholds
✅ **Database:** All tables, indexes, constraints working
✅ **Frontend:** UI loads and displays data correctly
✅ **Containers:** Docker deployment successful

## 🚀 Next Steps After Local Testing

1. **Performance Baseline:** Record response times
2. **Security Scan:** Run OWASP security checks
3. **Load Testing:** Test with realistic user loads
4. **Integration Testing:** Test with external services
5. **Staging Deployment:** Deploy to staging environment
6. **Production Readiness:** Final verification before launch

Run this comprehensive testing suite to ensure 100% confidence in your production deployment!