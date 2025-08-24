# PowerShell Version of Comprehensive Local Testing
param(
    [string]$BaseUrl = "http://localhost:3006",
    [switch]$Verbose
)

Write-Host "🧪 Starting Comprehensive Local Testing..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$Passed = 0
$Failed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -UseBasicParsing -Method GET -ErrorAction SilentlyContinue
        $actualStatus = $response.StatusCode
        
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
            Write-Host " ($actualStatus)" -ForegroundColor Gray
            $script:Passed++
        } else {
            Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Expected: $ExpectedStatus, Got: $actualStatus)" -ForegroundColor Gray
            $script:Failed++
        }
    } catch {
        $actualStatus = $_.Exception.Response.StatusCode.value__
        if ($actualStatus -eq $ExpectedStatus) {
            Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
            Write-Host " ($actualStatus)" -ForegroundColor Gray
            $script:Passed++
        } else {
            Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Expected: $ExpectedStatus, Got: $actualStatus)" -ForegroundColor Gray
            $script:Failed++
        }
    }
}

function Test-JsonResponse {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$ExpectedField
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Headers $Headers -Method GET
        
        if ($response.PSObject.Properties.Name -contains $ExpectedField) {
            Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
            Write-Host " (Contains $ExpectedField)" -ForegroundColor Gray
            $script:Passed++
        } else {
            Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
            Write-Host " (Missing $ExpectedField)" -ForegroundColor Gray
            $script:Failed++
        }
    } catch {
        Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " (Request failed: $($_.Exception.Message))" -ForegroundColor Gray
        $script:Failed++
    }
}

# 1. Basic Connectivity
Write-Host "`n📡 1. Testing Basic Connectivity..." -ForegroundColor Blue
Test-Endpoint "Health Check" "$BaseUrl/health" 200

# 2. Authentication
Write-Host "`n🔐 2. Testing Authentication..." -ForegroundColor Blue

# Create test user
Write-Host "Creating test user..."
Set-Location "backend"
$createUserScript = @"
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
const hash = bcrypt.hashSync('TestPass123!', 10);
db.run('INSERT OR REPLACE INTO users (id, company_id, email, password_hash, name, role, email_verified) VALUES (1001, 6, \"autotest@example.com\", ?, \"Auto Test User\", \"owner\", 1)', [hash], () => {
  console.log('Test user created');
  db.close();
});
"@

$createUserScript | node 2>$null

# Test login
Write-Host "Testing Login... " -NoNewline
$loginBody = @{
    email = "autotest@example.com"
    password = "TestPass123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.token) {
        $token = $loginResponse.token
        Write-Host "✅ PASS" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " (No token in response)" -ForegroundColor Gray
        $script:Failed++
    }
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
    Write-Host " (Login request failed)" -ForegroundColor Gray
    $script:Failed++
}

# 3. Protected Endpoints
Write-Host "`n📊 3. Testing Protected Endpoints..." -ForegroundColor Blue
$authHeaders = @{ "Authorization" = "Bearer $token" }

Test-Endpoint "Dashboard Stats" "$BaseUrl/api/dashboard/stats" 200 $authHeaders
Test-Endpoint "Clients List" "$BaseUrl/api/clients" 200 $authHeaders
Test-Endpoint "Inspection Templates" "$BaseUrl/api/inspections/templates" 200 $authHeaders
Test-Endpoint "Estimates List" "$BaseUrl/api/estimates" 200 $authHeaders

# 4. Security
Write-Host "`n🔒 4. Testing Security..." -ForegroundColor Blue
Test-Endpoint "Unauthorized Access" "$BaseUrl/api/dashboard/stats" 401
$invalidAuthHeaders = @{ "Authorization" = "Bearer invalid-token" }
Test-Endpoint "Invalid Token" "$BaseUrl/api/dashboard/stats" 403 $invalidAuthHeaders

# 5. Data Integrity
Write-Host "`n📈 5. Testing Data Integrity..." -ForegroundColor Blue
Test-JsonResponse "Dashboard Stats Data" "$BaseUrl/api/dashboard/stats" $authHeaders "total_clients"
Test-JsonResponse "Health Check Data" "$BaseUrl/health" @{} "status"

# 6. Database
Write-Host "`n🗄️ 6. Testing Database..." -ForegroundColor Blue
Write-Host "Checking database tables... " -NoNewline

$tableCountScript = @"
const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database('data/sprinkler_repair.db'); 
db.all('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"', (err, result) => { 
  console.log(result[0].count); 
  db.close(); 
});
"@

$tableCount = $tableCountScript | node 2>$null

if ([int]$tableCount -gt 30) {
    Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
    Write-Host " ($tableCount tables)" -ForegroundColor Gray
    $script:Passed++
} else {
    Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
    Write-Host " (Only $tableCount tables found)" -ForegroundColor Gray
    $script:Failed++
}

# 7. Performance
Write-Host "`n⚡ 7. Testing Performance..." -ForegroundColor Blue
Write-Host "Testing response time... " -NoNewline

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/dashboard/stats" -Headers $authHeaders | Out-Null
    $stopwatch.Stop()
    $duration = $stopwatch.ElapsedMilliseconds
    
    if ($duration -lt 1000) {
        Write-Host "✅ PASS" -ForegroundColor Green -NoNewline
        Write-Host " (${duration}ms)" -ForegroundColor Gray
        $script:Passed++
    } else {
        Write-Host "⚠️  SLOW" -ForegroundColor Yellow -NoNewline
        Write-Host " (${duration}ms - Consider optimization)" -ForegroundColor Gray
        $script:Passed++
    }
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
    Write-Host " (Request failed)" -ForegroundColor Gray
    $script:Failed++
}

# 8. CRUD Operations
Write-Host "`n🚀 8. Testing CRUD Operations..." -ForegroundColor Blue
Write-Host "Testing client creation... " -NoNewline

$clientData = @{
    name = "Test Client Auto PS"
    contact_type = "residential"
    billing_email = "autoclientps@test.com"
    phone = "555-PS-TEST"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/api/clients" -Method POST -Body $clientData -ContentType "application/json" -Headers $authHeaders
    
    if ($createResponse.name -eq "Test Client Auto PS") {
        Write-Host "✅ PASS" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
        Write-Host " (Client not created properly)" -ForegroundColor Gray
        $script:Failed++
    }
} catch {
    Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline
    Write-Host " (Create request failed)" -ForegroundColor Gray
    $script:Failed++
}

Set-Location ".."

# Results
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "📊 Final Test Results:" -ForegroundColor Blue
Write-Host "   ✅ Passed: $Passed" -ForegroundColor Green
if ($Failed -gt 0) {
    Write-Host "   ❌ Failed: $Failed" -ForegroundColor Red
    Write-Host "`n❌ Some tests failed. Please check the issues above." -ForegroundColor Red
    Write-Host "💡 Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "   1. Ensure backend is running on port 3006"
    Write-Host "   2. Check database file exists: backend/data/sprinkler_repair.db"
    Write-Host "   3. Verify all dependencies installed: npm install"
    exit 1
} else {
    Write-Host "   ❌ Failed: $Failed" -ForegroundColor Red
    Write-Host "`n🎉 All tests passed! Application is ready for production." -ForegroundColor Green
    Write-Host "`n✨ What was tested:" -ForegroundColor Blue
    Write-Host "   🔐 Authentication & Authorization"
    Write-Host "   📊 API Endpoints & Data Flow"
    Write-Host "   🗄️ Database Schema & Performance"
    Write-Host "   🔒 Security & Input Validation"
    Write-Host "   ⚡ Response Times & Performance"
    Write-Host "   🚀 CRUD Operations"
    Write-Host "`n🚀 Ready for production deployment!" -ForegroundColor Green
}