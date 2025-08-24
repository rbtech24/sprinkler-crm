import { Modal, Button, Badge } from '@/components/ui'
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Building2, 
  Phone, 
  Mail, 
  Edit, 
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ScheduleEvent {
  id: string
  title: string
  type: 'inspection' | 'work_order' | 'estimate'
  start: string
  end: string
  technician: string
  client: string
  site: string
  status: string
  description?: string
  address?: string
  clientPhone?: string
  clientEmail?: string
  priority?: 'low' | 'medium' | 'high'
  estimatedDuration?: number
}

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: ScheduleEvent | null
  onEdit?: (event: ScheduleEvent) => void
  onDelete?: (eventId: string) => void
  onStatusChange?: (eventId: string, status: string) => void
}

export function EventDetailsModal({ 
  isOpen, 
  onClose, 
  event, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: EventDetailsModalProps) {
  if (!event) return null

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'inspection':
        return 'bg-blue-100 text-blue-800'
      case 'work_order':
        return 'bg-orange-100 text-orange-800'
      case 'estimate':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const startDateTime = formatDateTime(event.start)
  const endDateTime = formatDateTime(event.end)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event.title}>
      <div className="space-y-6">
        {/* Event Type and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge className={getEventTypeColor(event.type)}>
              {event.type.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={getStatusColor(event.status)}>
              {event.status.replace('_', ' ').toUpperCase()}
            </Badge>
            {event.priority && (
              <Badge className={getPriorityColor(event.priority)}>
                {event.priority.toUpperCase()} PRIORITY
              </Badge>
            )}
          </div>
        </div>

        {/* Date and Time */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Calendar className="h-5 w-5 text-gray-500 mr-2" />
            <span className="font-medium text-gray-900">{startDateTime.date}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-gray-500 mr-2" />
            <span className="text-gray-700">
              {startDateTime.time} - {endDateTime.time}
            </span>
            {event.estimatedDuration && (
              <span className="ml-2 text-sm text-gray-500">
                ({event.estimatedDuration} hours)
              </span>
            )}
          </div>
        </div>

        {/* Location and Client */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Location
            </h4>
            <div className="text-sm text-gray-600">
              <div className="font-medium">{event.site}</div>
              {event.address && <div>{event.address}</div>}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Client
            </h4>
            <div className="text-sm text-gray-600">
              <div className="font-medium">{event.client}</div>
              {event.clientPhone && (
                <div className="flex items-center mt-1">
                  <Phone className="h-3 w-3 mr-1" />
                  {event.clientPhone}
                </div>
              )}
              {event.clientEmail && (
                <div className="flex items-center mt-1">
                  <Mail className="h-3 w-3 mr-1" />
                  {event.clientEmail}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technician */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
            <User className="h-4 w-4 mr-2" />
            Assigned Technician
          </h4>
          <div className="text-sm text-gray-600 font-medium">{event.technician}</div>
        </div>

        {/* Description */}
        {event.description && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
            <p className="text-sm text-gray-600">{event.description}</p>
          </div>
        )}

        {/* Status Actions */}
        {event.status !== 'completed' && event.status !== 'cancelled' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              {event.status === 'scheduled' && onStatusChange && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onStatusChange(event.id, 'in_progress')}
                  className="flex items-center"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Start Work
                </Button>
              )}
              {event.status === 'in_progress' && onStatusChange && (
                <Button 
                  size="sm" 
                  onClick={() => onStatusChange(event.id, 'completed')}
                  className="flex items-center bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              {onStatusChange && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onStatusChange(event.id, 'cancelled')}
                  className="flex items-center text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={() => onEdit(event)}
                className="flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="outline" 
                onClick={() => onDelete(event.id)}
                className="flex items-center text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}