'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { CompanyDashboard } from '@/components/dashboard/company-dashboard'
import { TechDashboard } from '@/components/dashboard/tech-dashboard'
import { DispatcherDashboard } from '@/components/dashboard/dispatcher-dashboard'
import { AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { user, company, isAuthenticated, hasHydrated } = useAuthStore()
  const router = useRouter()
  const [dashboardType, setDashboardType] = useState<'company' | 'tech' | 'dispatcher'>('company')

  // Protect dashboard and determine dashboard type
  useEffect(() => {
    if (!hasHydrated) return // Wait for hydration
    
    // Check for token in localStorage as fallback
    const token = localStorage.getItem('auth_token')
    
    if (!isAuthenticated && !token) {
      // Add a small delay to prevent immediate redirect during login process
      const redirectTimeout = setTimeout(() => {
        router.push('/auth/login')
      }, 200)
      return () => clearTimeout(redirectTimeout)
    }
    
    if (user) {
      // Determine dashboard type based on user role
      if (['tech', 'field_technician', 'technician'].includes(user.role)) {
        // Redirect technicians to mobile PWA dashboard
        router.push('/tech')
        return
      } else if (user.role === 'system_admin') {
        // Redirect system admin to dedicated admin page
        router.push('/admin')
        return
      } else if (user.role === 'dispatcher') {
        setDashboardType('dispatcher')
      } else if (['owner', 'admin', 'company_owner', 'manager'].includes(user.role)) {
        setDashboardType('company')
      } else {
        router.push('/auth/login') // Redirect unauthorized users
        return
      }
    }
  }, [user, isAuthenticated, hasHydrated, router])

  // Show loading if not hydrated or if we have a token but no user yet
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (!hasHydrated || (!isAuthenticated && token) || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {dashboardType === 'tech' ? 'Tech Dashboard' : 
                 dashboardType === 'dispatcher' ? 'Dispatch Center' : 'Company Dashboard'}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {company?.name || 'User'}!
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Render appropriate dashboard */}
            {dashboardType === 'company' ? (
              <CompanyDashboard user={user} />
            ) : dashboardType === 'dispatcher' ? (
              <DispatcherDashboard />
            ) : (
              <TechDashboard user={user} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}