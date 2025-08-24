import { useState, useEffect } from 'react'
import { Modal, Button, LoadingSpinner } from '@/components/ui'
import { useClients, useInspectionTemplates, useCreateInspection, useUsers } from '@/hooks/useApi'
import { toast } from 'react-hot-toast'
import { MapPin, User, FileText } from 'lucide-react'

interface CreateInspectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateInspectionModal({ isOpen, onClose }: CreateInspectionModalProps) {
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedSite, setSelectedSite] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedTechnician, setSelectedTechnician] = useState('')
  const [sites, setSites] = useState<Array<{id: string, nickname: string, address: string}>>([])

  const { data: clientsData } = useClients()
  const { data: templatesData } = useInspectionTemplates()
  const { data: usersData } = useUsers({ role: 'tech' })
  const createInspection = useCreateInspection()

  const clients = clientsData?.data || []
  const templates = templatesData || []
  const technicians = usersData || []

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClient('')
      setSelectedSite('')
      setSelectedTemplate('')
      setSelectedTechnician('')
      setSites([])
    }
  }, [isOpen])

  // Load sites when client is selected
  useEffect(() => {
    if (selectedClient) {
      // In a real app, you'd call an API to get sites for the client
      // For now, we'll use mock data
      setSites([
        { id: '1', nickname: 'Main Building', address: '123 Main St' },
        { id: '2', nickname: 'West Wing', address: '456 West Ave' },
      ])
    } else {
      setSites([])
      setSelectedSite('')
    }
  }, [selectedClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSite || !selectedTemplate) {
      toast.error('Please select a site and template')
      return
    }

    try {
      await createInspection.mutateAsync({
        site_id: selectedSite,
        template_id: selectedTemplate,
        tech_id: selectedTechnician || undefined
      })
      
      onClose()
      toast.success('Inspection created successfully!')
    } catch (error) {
      console.error('Failed to create inspection:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Inspection" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Client
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Site Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Site
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            disabled={!selectedClient}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            required
          >
            <option value="">Select a site...</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.nickname} - {site.address}
              </option>
            ))}
          </select>
          {!selectedClient && (
            <p className="text-sm text-gray-500 mt-1">Select a client first</p>
          )}
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Inspection Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.code})
              </option>
            ))}
          </select>
        </div>

        {/* Technician Selection (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Assign Technician (Optional)
          </label>
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Assign later...</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createInspection.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInspection.isPending}
          >
            {createInspection.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Inspection'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
