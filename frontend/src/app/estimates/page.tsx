'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { EstimateList } from '@/components/estimates/estimate-list'
import { useEstimates } from '@/hooks/useApi'
import { LoadingSpinner } from '@/components/ui'
import { AlertTriangle, DollarSign } from 'lucide-react'

export default function EstimatesPage() {
  const [filters, setFilters] = useState({
    status: '',
    client_id: '',
    start_date: '',
    end_date: ''
  })

  const { data: estimatesData, isLoading, error } = useEstimates(filters)
  const estimates = estimatesData?.data || []

  if (isLoading) {
    return (
      <DashboardLayout title="Estimates">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Estimates">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load estimates</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Estimates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
            <p className="text-gray-600">Manage quotes and proposals</p>
          </div>
          <div className="flex items-center text-green-600">
            <DollarSign className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">
              Total Value: ${estimates.reduce((sum, est) => sum + (est.total_cents / 100), 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Estimate List */}
        <EstimateList
          estimates={estimates}
          onFiltersChange={setFilters}
          filters={filters}
        />
      </div>
    </DashboardLayout>
  )
}
