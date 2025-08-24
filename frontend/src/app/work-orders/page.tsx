'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { WorkOrderList } from '@/components/work-orders/work-order-list'
import { CreateWorkOrderModal } from '@/components/work-orders/create-work-order-modal'
import { LoadingSpinner, Button } from '@/components/ui'
import { AlertTriangle, Plus, Wrench } from 'lucide-react'

interface WorkOrder {
  id: string
  status: string
  priority: string
  client_name: string
  site_name: string
  technician_name: string
  scheduled_date: string
  description: string
  estimated_hours: number
  created_at: string
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    technician_id: '',
    start_date: '',
    end_date: ''
  })

  const fetchWorkOrders = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/work-orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch work orders')
      }

      const data = await response.json()
      
      // Transform backend response to match frontend interface
      const transformedWorkOrders = data.data.map((wo: any) => ({
        id: wo.id.toString(),
        status: wo.status,
        priority: wo.priority,
        client_name: wo.client_name,
        site_name: wo.site_name,
        technician_name: wo.tech_name || 'Unassigned',
        scheduled_date: wo.scheduled_start,
        description: wo.description,
        estimated_hours: wo.estimated_duration || 0,
        created_at: wo.created_at,
      }))

      setWorkOrders(transformedWorkOrders)
    } catch (error) {
      console.error('Error fetching work orders:', error)
      // For now, use mock data if API fails
      setWorkOrders([
        {
          id: '1',
          status: 'scheduled',
          priority: 'high',
          client_name: 'Johnson Commercial',
          site_name: 'Downtown Plaza',
          technician_name: 'Mike Rodriguez',
          scheduled_date: '2025-08-22',
          description: 'Repair main valve system',
          estimated_hours: 4,
          created_at: '2025-08-20'
        },
        {
          id: '2',
          status: 'in_progress',
          priority: 'medium',
          client_name: 'Green Valley HOA',
          site_name: 'Community Center',
          technician_name: 'Sarah Johnson',
          scheduled_date: '2025-08-21',
          description: 'Replace damaged sprinkler heads',
          estimated_hours: 2,
          created_at: '2025-08-19'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkOrders()
  }, [filters])

  if (loading) {
    return (
      <DashboardLayout title="Work Orders">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Work Orders">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Wrench className="h-7 w-7 mr-3 text-orange-600" />
              Work Orders
            </h1>
            <p className="text-gray-600">Manage scheduled repairs and maintenance</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        </div>

        {/* Work Order List */}
        <WorkOrderList
          workOrders={workOrders}
          onFiltersChange={setFilters}
          filters={filters}
        />

        {/* Create Work Order Modal */}
        <CreateWorkOrderModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    </DashboardLayout>
  )
}
