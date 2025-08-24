'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ClientList } from '@/components/clients/client-list'
import { CreateClientModal } from '@/components/clients/create-client-modal'
import { LoadingSpinner } from '@/components/ui'
import { useClients } from '@/hooks/useApi'
import { AlertTriangle } from 'lucide-react'

export default function ClientsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)

  const { data: clientsData, isLoading, error } = useClients()
  const clients = clientsData?.data || []

  const handleCreateClient = () => {
    setSelectedClient(null)
    setShowCreateModal(true)
  }

  const handleEditClient = (client: any) => {
    setSelectedClient(client)
    setShowEditModal(true)
  }

  const handleViewClient = (client: any) => {
    // Navigate to client detail page
    window.location.href = `/clients/${client.id}`
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Clients">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Clients">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load clients</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Clients">
      <ClientList
        clients={clients}
        onCreateClient={handleCreateClient}
        onEditClient={handleEditClient}
        onViewClient={handleViewClient}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Edit Client Modal - would be similar to create but with existing data */}
      {showEditModal && (
        <div>
          {/* Edit modal would go here */}
        </div>
      )}
    </DashboardLayout>
  )
}
