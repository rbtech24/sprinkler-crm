'use client'

import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { InspectionsList } from '@/components/inspections/inspections-list'

export default function InspectionsPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore()

  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
              <p className="text-sm text-gray-600">
                {['tech', 'field_technician', 'technician'].includes(user.role) 
                  ? 'Your assigned irrigation system inspections'
                  : 'Comprehensive view of all irrigation system inspections'
                }
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
            <InspectionsList userRole={user.role} />
          </div>
        </main>
      </div>
    </div>
  )
}
