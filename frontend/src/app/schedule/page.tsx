'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar'
import { ScheduleList } from '@/components/schedule/schedule-list'
import { CreateEventModal } from '@/components/schedule/create-event-modal'
import { EventDetailsModal } from '@/components/schedule/event-details-modal'
import { Button } from '@/components/ui'
import { Calendar, List, Plus } from 'lucide-react'

// Mock data for schedule events
const mockEvents = [
  {
    id: '1',
    title: 'Inspection - Downtown Plaza',
    type: 'inspection' as const,
    start: '2025-08-22T09:00:00',
    end: '2025-08-22T11:00:00',
    technician: 'Mike Rodriguez',
    client: 'Johnson Commercial',
    site: 'Downtown Plaza',
    status: 'scheduled'
  },
  {
    id: '2',
    title: 'Repair - Community Center',
    type: 'work_order' as const,
    start: '2025-08-22T14:00:00',
    end: '2025-08-22T16:00:00',
    technician: 'Sarah Johnson',
    client: 'Green Valley HOA',
    site: 'Community Center',
    status: 'in_progress'
  },
  {
    id: '3',
    title: 'Estimate Meeting - Riverside Gardens',
    type: 'estimate' as const,
    start: '2025-08-23T10:00:00',
    end: '2025-08-23T11:00:00',
    technician: 'Mike Rodriguez',
    client: 'Riverside Management',
    site: 'Riverside Gardens',
    status: 'scheduled'
  }
]

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [events, setEvents] = useState(mockEvents)

  const handleEventClick = (event: any) => {
    setSelectedEvent(event)
    setShowEventDetails(true)
  }

  const handleStatusChange = (eventId: string, newStatus: string) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId ? { ...event, status: newStatus } : event
      )
    )
    setShowEventDetails(false)
  }

  const handleEventDelete = (eventId: string) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId))
    setShowEventDetails(false)
  }

  const handleEventEdit = (event: any) => {
    // TODO: Implement edit functionality
    console.log('Edit event:', event)
    setShowEventDetails(false)
  }

  const handleEventMove = (eventId: string, newDate: Date) => {
    setEvents(prevEvents => 
      prevEvents.map(event => {
        if (event.id === eventId) {
          // Calculate the time difference to preserve the duration
          const oldStart = new Date(event.start)
          const oldEnd = new Date(event.end)
          const duration = oldEnd.getTime() - oldStart.getTime()
          
          // Create new start time with same time but new date
          const newStart = new Date(newDate)
          newStart.setHours(oldStart.getHours(), oldStart.getMinutes())
          
          // Calculate new end time
          const newEnd = new Date(newStart.getTime() + duration)
          
          return {
            ...event,
            start: newStart.toISOString(),
            end: newEnd.toISOString()
          }
        }
        return event
      })
    )
  }

  return (
    <DashboardLayout title="Schedule">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-7 w-7 mr-3 text-blue-600" />
              Schedule
            </h1>
            <p className="text-gray-600">Manage inspections, work orders, and appointments</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'calendar'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-l-md border-r border-gray-300`}
              >
                <Calendar className="h-4 w-4 mr-1 inline" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } rounded-r-md`}
              >
                <List className="h-4 w-4 mr-1 inline" />
                List
              </button>
            </div>

            {/* Create Event Button */}
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Schedule View */}
        {viewMode === 'calendar' ? (
          <ScheduleCalendar
            events={events}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventClick={handleEventClick}
            onEventMove={handleEventMove}
          />
        ) : (
          <ScheduleList
            events={events}
            onEventClick={handleEventClick}
          />
        )}

        {/* Create Event Modal */}
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          initialDate={selectedDate}
        />

        {/* Event Details Modal */}
        <EventDetailsModal
          isOpen={showEventDetails}
          onClose={() => setShowEventDetails(false)}
          event={selectedEvent}
          onStatusChange={handleStatusChange}
          onDelete={handleEventDelete}
          onEdit={handleEventEdit}
        />
      </div>
    </DashboardLayout>
  )
}
