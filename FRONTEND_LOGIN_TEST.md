# Frontend Login Testing Guide

## 🚀 Quick Test Steps

### 1. Access the Login Page
- Go to: **http://localhost:3008/auth/login**
- You should see a professional split-screen login with "Irrigation Pro" branding

### 2. Demo Credentials Button
- Click the **"Use Demo Credentials"** button in the blue box
- This will auto-fill: `owner@demo.com` / `password`
- Click **"Sign in"**
- Should redirect to Company Dashboard

### 3. Test All User Types

#### 🏢 Company Owner
- **Email**: `owner@demo.com`
- **Password**: `password`
- **Expected**: Company Dashboard with KPIs, charts, pipeline

#### ⚙️ System Administrator  
- **Email**: `sysadmin@sprinklerinspect.com`
- **Password**: `admin123`
- **Expected**: Company Dashboard (or Admin Dashboard if implemented)

#### 📡 Dispatcher
- **Email**: `dispatcher@demo.com` 
- **Password**: `password`
- **Expected**: Company Dashboard with dispatch features

#### 🔧 Field Technician
- **Email**: `tech@demo.com`
- **Password**: `password`
- **Expected**: Tech Dashboard with route map, job timeline

## 🔍 Troubleshooting

### If Login Redirects Back to Login Screen:

1. **Check Browser Console**:
   - Press `F12` → Console tab
   - Look for errors (especially authentication/token errors)

2. **Check Network Tab**:
   - Press `F12` → Network tab
   - Try logging in and watch for failed requests
   - Look for 401/403/500 errors

3. **Clear Browser Data**:
   - Clear localStorage: `localStorage.clear()`
   - Clear cookies
   - Try in incognito/private mode

### If Dashboard Loads but Shows Errors:

1. **Check API Calls**:
   - Look in Network tab for failed `/api/dashboard/` calls
   - Should see successful 200 responses

2. **Check Token Storage**:
   - In Console: `localStorage.getItem('auth_token')`
   - Should return a long JWT token

## ✅ Expected Behavior

### After Successful Login:
1. ✅ Login form disappears  
2. ✅ Redirect to `/dashboard`
3. ✅ Dashboard loads with sidebar navigation
4. ✅ Header shows user name and role
5. ✅ API calls return real data (not 404/403 errors)

### Role-Based Dashboard Routing:
- **Technician** → Tech Dashboard (route map, job timeline)
- **Owner/Admin/Dispatcher** → Company Dashboard (KPIs, charts)
- **System Admin** → Company Dashboard (platform management)

## 🛠️ Current System Status

✅ **Backend Status**: All APIs working (tested via curl)  
✅ **User Accounts**: All 4 roles exist with correct passwords  
✅ **Authentication**: JWT tokens generated successfully  
✅ **API Endpoints**: All returning real data from database  
✅ **Frontend Fixes**: Applied localStorage, role routing, token fixes

## 🔧 If Still Having Issues

**Common Issues & Solutions:**

1. **"localStorage not defined"** → Fixed with SSR check
2. **"403 Forbidden on API calls"** → Fixed token key mismatch  
3. **"Redirects to login after success"** → Fixed role routing arrays
4. **"Unexpected token '<'"** → Fixed API URL configuration

**Latest Changes Applied:**
- ✅ Fixed `localStorage` SSR error
- ✅ Added all roles to dashboard routing
- ✅ Fixed token storage key (`auth_token` vs `token`)
- ✅ Updated API calls to use correct backend URL
- ✅ Added dispatcher role to company dashboard

Try the login flow now - it should work perfectly! 🎉