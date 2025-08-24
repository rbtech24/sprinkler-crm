import { Clock, User, MapPin, Calendar } from 'lucide-react'
import { Card, CardContent, Badge } from '@/components/ui'

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
}

interface ScheduleListProps {
  events: ScheduleEvent[]
  onEventClick: (event: ScheduleEvent) => void
}

export function ScheduleList({ events, onEventClick }: ScheduleListProps) {
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
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = new Date(event.start).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(event)
    return acc
  }, {} as Record<string, ScheduleEvent[]>)

  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  )

  return (
    <div className="space-y-6">
      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
            <p className="text-gray-600">Create your first event to get started.</p>
          </CardContent>
        </Card>
      ) : (
        sortedDates.map(date => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <div className="px-4 py-2 bg-gray-50 rounded-full">
                <span className="text-sm font-medium text-gray-700">
                  {formatDate(eventsByDate[date][0].start)}
                </span>
              </div>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Events for this date */}
            <div className="space-y-3">
              {eventsByDate[date]
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .map(event => (
                  <div 
                    key={event.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onEventClick(event)}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {event.title}
                              </h3>
                              <Badge className={getEventTypeColor(event.type)}>
                                {event.type.replace('_', ' ')}
                              </Badge>
                              <Badge className={getStatusColor(event.status)}>
                                {event.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {formatTime(event.start)} - {formatTime(event.end)}
                              </div>
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                {event.technician}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {event.site}
                              </div>
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Client:</span> {event.client}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
