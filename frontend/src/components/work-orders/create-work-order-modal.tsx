import { useState } from 'react'
import { Modal, Button, LoadingSpinner } from '@/components/ui'
import { useClients, useUsers } from '@/hooks/useApi'
import { toast } from 'react-hot-toast'
import { MapPin, User, Calendar, AlertTriangle, FileText } from 'lucide-react'

interface CreateWorkOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateWorkOrderModal({ isOpen, onClose }: CreateWorkOrderModalProps) {
  const [formData, setFormData] = useState({
    client_id: '',
    site_id: '',
    technician_id: '',
    priority: 'medium',
    scheduled_date: '',
    estimated_hours: '',
    description: '',
    notes: ''
  })
  const [sites, setSites] = useState<Array<{id: string, nickname: string, address: string}>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: clientsData } = useClients()
  const { data: usersData } = useUsers({ role: 'tech' })

  const clients = clientsData?.data || []
  const technicians = usersData || []

  // Load sites when client is selected
  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({ ...prev, client_id: clientId, site_id: '' }))
    
    if (clientId) {
      // Mock sites - would come from API
      setSites([
        { id: '1', nickname: 'Main Building', address: '123 Main St' },
        { id: '2', nickname: 'West Wing', address: '456 West Ave' },
      ])
    } else {
      setSites([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.client_id || !formData.site_id || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Work order created successfully!')
      onClose()
      setFormData({
        client_id: '',
        site_id: '',
        technician_id: '',
        priority: 'medium',
        scheduled_date: '',
        estimated_hours: '',
        description: '',
        notes: ''
      })
      setSites([])
    } catch {
      toast.error('Failed to create work order')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Work Order" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            Client *
          </label>
          <select
            value={formData.client_id}
            onChange={(e) => handleClientChange(e.target.value)}
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
            Site *
          </label>
          <select
            value={formData.site_id}
            onChange={(e) => setFormData(prev => ({ ...prev, site_id: e.target.value }))}
            disabled={!formData.client_id}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Scheduled Date
            </label>
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Technician */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Assign Technician
            </label>
            <select
              value={formData.technician_id}
              onChange={(e) => setFormData(prev => ({ ...prev, technician_id: e.target.value }))}
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

          {/* Estimated Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Hours
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
              placeholder="e.g. 2.5"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the work to be performed..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes or special instructions..."
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Work Order'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
