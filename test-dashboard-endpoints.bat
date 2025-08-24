@echo off
echo ============================================
echo Comprehensive Dashboard Testing Script
echo Testing all user roles and endpoints
echo ============================================
echo.

set BACKEND_URL=http://localhost:3000
set FRONTEND_URL=http://localhost:3008

echo Testing server health...
curl -s %BACKEND_URL%/health
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend server not responding
    pause
    exit /b 1
)
echo Backend health check: PASSED
echo.

echo Testing frontend accessibility...
curl -s %FRONTEND_URL%/auth/login > nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend not accessible
    pause
    exit /b 1
)
echo Frontend accessibility: PASSED
echo.

echo ============================================
echo Testing Company Owner Login
echo ============================================
echo Attempting login for owner@demo.com...

for /f "tokens=*" %%i in ('curl -s -X POST "%BACKEND_URL%/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"owner@demo.com\",\"password\":\"password\"}"') do set OWNER_RESPONSE=%%i

echo Response: %OWNER_RESPONSE%
echo.

:: Extract token from response (simplified - in production would use jq or similar)
echo %OWNER_RESPONSE% | findstr "token" > nul
if %ERRORLEVEL% EQU 0 (
    echo Owner login: PASSED
    
    echo Testing Company Dashboard endpoints...
    echo Testing /api/dashboard/company/kpis
    curl -s -H "Authorization: Bearer TOKEN_PLACEHOLDER" "%BACKEND_URL%/api/dashboard/company/kpis"
    echo.
    
    echo Testing /api/dashboard/company/today
    curl -s -H "Authorization: Bearer TOKEN_PLACEHOLDER" "%BACKEND_URL%/api/dashboard/company/today"
    echo.
    
    echo Testing /api/dashboard/estimates
    curl -s -H "Authorization: Bearer TOKEN_PLACEHOLDER" "%BACKEND_URL%/api/dashboard/estimates"
    echo.
) else (
    echo Owner login: FAILED
)

echo.
echo ============================================
echo Testing System Admin Login
echo ============================================
echo Attempting login for sysadmin@sprinklerinspect.com...

for /f "tokens=*" %%i in ('curl -s -X POST "%BACKEND_URL%/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"sysadmin@sprinklerinspect.com\",\"password\":\"admin123\"}"') do set ADMIN_RESPONSE=%%i

echo Response: %ADMIN_RESPONSE%
echo %ADMIN_RESPONSE% | findstr "token" > nul
if %ERRORLEVEL% EQU 0 (
    echo Admin login: PASSED
) else (
    echo Admin login: FAILED
)

echo.
echo ============================================
echo Testing Technician Login
echo ============================================
echo Attempting login for tech@demo.com...

for /f "tokens=*" %%i in ('curl -s -X POST "%BACKEND_URL%/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"tech@demo.com\",\"password\":\"password\"}"') do set TECH_RESPONSE=%%i

echo Response: %TECH_RESPONSE%
echo %TECH_RESPONSE% | findstr "token" > nul
if %ERRORLEVEL% EQU 0 (
    echo Technician login: PASSED
    
    echo Testing Tech Dashboard endpoints...
    echo Testing /api/dashboard/tech/today
    curl -s -H "Authorization: Bearer TOKEN_PLACEHOLDER" "%BACKEND_URL%/api/dashboard/tech/today"
    echo.
    
) else (
    echo Technician login: FAILED
)

echo.
echo ============================================
echo Test Summary
echo ============================================
echo All login tests completed.
echo Check the responses above for any errors.
echo If you see "token" in the responses, logins are working.
echo.
pause