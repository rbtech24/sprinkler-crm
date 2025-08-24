import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'

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

interface ScheduleCalendarProps {
  events: ScheduleEvent[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (event: ScheduleEvent) => void
  onEventMove?: (eventId: string, newDate: Date) => void
}

export function ScheduleCalendar({ events, selectedDate, onDateSelect, onEventClick, onEventMove }: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [draggedEvent, setDraggedEvent] = useState<ScheduleEvent | null>(null)

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    onDateSelect(today)
  }

  const getEventsForDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dateStr = date.toISOString().split('T')[0]
    
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'inspection':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'work_order':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'estimate':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    )
  }

  const handleDragStart = (e: React.DragEvent, event: ScheduleEvent) => {
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', event.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (draggedEvent) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault()
    if (draggedEvent && onEventMove) {
      const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      // Keep the same time, just change the date
      const originalDate = new Date(draggedEvent.start)
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes())
      onEventMove(draggedEvent.id, newDate)
    }
    setDraggedEvent(null)
  }

  // Generate calendar days
  const calendarDays = []
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
            >
              Today
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] p-2 border border-gray-100 ${
                day ? 'cursor-pointer hover:bg-gray-50' : ''
              } ${
                day && isToday(day) ? 'bg-primary-50 border-primary-200' : ''
              } ${
                day && isSelected(day) ? 'ring-2 ring-primary-500' : ''
              } ${
                draggedEvent && day ? 'transition-colors' : ''
              }`}
              onClick={() => {
                if (day) {
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  onDateSelect(date)
                }
              }}
              onDragOver={day ? handleDragOver : undefined}
              onDrop={day ? (e) => handleDrop(e, day) : undefined}
            >
              {day && (
                <>
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-primary-700' : 'text-gray-900'
                  }`}>
                    {day}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {getEventsForDate(day).map(event => (
                      <div
                        key={event.id}
                        draggable={!!onEventMove}
                        onDragStart={(e) => onEventMove && handleDragStart(e, event)}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                        className={`text-xs p-1 rounded border cursor-pointer hover:shadow-sm ${getEventTypeColor(event.type)} ${
                          onEventMove ? 'active:cursor-grabbing' : ''
                        } ${draggedEvent?.id === event.id ? 'opacity-50' : ''}`}
                        style={{ cursor: onEventMove ? (draggedEvent?.id === event.id ? 'grabbing' : 'grab') : 'pointer' }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="flex items-center text-xs opacity-75">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Inspections</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Work Orders</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Estimates</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
