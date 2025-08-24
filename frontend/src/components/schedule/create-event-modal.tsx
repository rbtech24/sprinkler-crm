import { useState } from 'react'
import { Modal, Button, LoadingSpinner } from '@/components/ui'
import { useClients, useUsers } from '@/hooks/useApi'
import { toast } from 'react-hot-toast'
import { Calendar, Clock, User, MapPin, FileText } from 'lucide-react'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
}

export function CreateEventModal({ isOpen, onClose, initialDate }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    type: 'inspection',
    client_id: '',
    site_id: '',
    technician_id: '',
    date: initialDate ? initialDate.toISOString().split('T')[0] : '',
    start_time: '09:00',
    end_time: '11:00',
    title: '',
    description: '',
    notes: ''
  })
  const [sites, setSites] = useState<Array<{id: string, nickname: string, address: string}>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: clientsData } = useClients()
  const { data: usersData } = useUsers({ role: 'tech' })

  const clients = clientsData?.data || []
  const technicians = usersData || []

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
    
    if (!formData.type || !formData.client_id || !formData.date) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    
    try {
      // In a real app, this would call the appropriate API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Event created successfully!')
      onClose()
      
      // Reset form
      setFormData({
        type: 'inspection',
        client_id: '',
        site_id: '',
        technician_id: '',
        date: '',
        start_time: '09:00',
        end_time: '11:00',
        title: '',
        description: '',
        notes: ''
      })
      setSites([])
    } catch {
      toast.error('Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Event" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Event Type *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="inspection">Inspection</option>
            <option value="work_order">Work Order</option>
            <option value="estimate">Estimate Meeting</option>
            <option value="maintenance">Maintenance</option>
            <option value="consultation">Consultation</option>
          </select>
        </div>

        {/* Client and Site */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Site
            </label>
            <select
              value={formData.site_id}
              onChange={(e) => setFormData(prev => ({ ...prev, site_id: e.target.value }))}
              disabled={!formData.client_id}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            >
              <option value="">Select a site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.nickname} - {site.address}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Start Time
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              End Time
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

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

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Weekly inspection at Downtown Plaza"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what will be done during this event..."
            rows={3}
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
              'Create Event'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
