# Login Credentials for Testing

## Application URLs
- **Frontend**: http://localhost:3008
- **Login Page**: http://localhost:3008/auth/login
- **Backend API**: http://localhost:3000

## Working Login Credentials

### 1. Company Owner (Company Dashboard)
- **Email**: `owner@demo.com`
- **Password**: `password`
- **Role**: `owner`
- **Dashboard**: Company Dashboard with KPIs, charts, pipeline

### 2. System Administrator (Company Dashboard)
- **Email**: `sysadmin@sprinklerinspect.com`
- **Password**: `admin123`
- **Role**: `system_admin`
- **Dashboard**: Company Dashboard with full access

### 3. Dispatcher (Company Dashboard)
- **Email**: `dispatcher@demo.com`
- **Password**: `password`
- **Role**: `dispatcher`
- **Dashboard**: Company Dashboard with dispatch management

### 4. Field Technician (Tech Dashboard)
- **Email**: `tech@demo.com`
- **Password**: `password`
- **Role**: `technician`
- **Dashboard**: Tech Dashboard with route map, job timeline

## Features Implemented
✅ Professional split-screen login with branding
✅ One-click demo credentials button
✅ Role-based dashboard routing
✅ Working API endpoints (all returning real data)
✅ Sidebar navigation only (no top navigation)
✅ Recharts integration for data visualization
✅ Company dashboard with KPIs, pipeline, charts
✅ Tech dashboard with route map, quick actions, timeline

## Status
- Backend: ✅ Running on port 3000
- Frontend: ✅ Running on port 3008
- Authentication: ✅ Working with JWT tokens
- API Endpoints: ✅ All functional with real data
- No mock/fake data: ✅ All data from database

## Quick Test
1. Go to: http://localhost:3008/auth/login
2. Click "Use Demo Credentials" for auto-fill
3. Login and access the dashboard