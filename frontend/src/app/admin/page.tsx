'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminKPIBar } from '@/components/admin/kpi-bar'
import { PlatformHealthSection } from '@/components/admin/platform-health'
import { BillingAccountsSection } from '@/components/admin/billing-accounts'
import { AdoptionFeaturesSection } from '@/components/admin/adoption-features'
import { ComplianceSupportSection } from '@/components/admin/compliance-support'
import { ActivityFeedSidebar } from '@/components/admin/activity-feed'

export default function SystemAdminDashboard() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const router = useRouter()

  // Protect admin route - only system_admin can access
  useEffect(() => {
    if (!hasHydrated) return // Wait for hydration
    
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    
    if (user && user.role !== 'system_admin') {
      router.push('/auth/login') // Redirect non-system-admins to login
      return
    }
  }, [user, isAuthenticated, hasHydrated, router])

  // Show loading while checking permissions
  if (!hasHydrated || !isAuthenticated || !user || user.role !== 'system_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Platform overview and management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">System Administrator</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* KPI Bar */}
          <AdminKPIBar />
          
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Content - 3 columns */}
            <div className="lg:col-span-3 space-y-6">
              {/* Row 1: Platform Health */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Health</h2>
                <PlatformHealthSection />
              </div>
              
              {/* Row 2: Billing & Accounts */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing & Accounts</h2>
                <BillingAccountsSection />
              </div>
              
              {/* Row 3: Adoption & Feature Flags */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Adoption & Feature Flags</h2>
                <AdoptionFeaturesSection />
              </div>
              
              {/* Row 4: Compliance & Support */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Compliance & Support</h2>
                <ComplianceSupportSection />
              </div>
            </div>
            
            {/* Right Sidebar - 1 column */}
            <div className="lg:col-span-1">
              <ActivityFeedSidebar />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
