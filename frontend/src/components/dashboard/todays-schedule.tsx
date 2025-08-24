'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { Clock, MapPin, User, ChevronRight, Calendar } from 'lucide-react'
import { useTodaysSchedule } from '@/hooks/useApi'

export function TodaysSchedule() {
  const { data: schedule, isLoading } = useTodaysSchedule()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Today's Schedule</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const jobs = schedule || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En Route': return 'bg-blue-100 text-blue-800'
      case 'In Progress': return 'bg-green-100 text-green-800'
      case 'Scheduled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'inspection' ? 'bg-blue-500' : 'bg-purple-500'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-semibold">Today's Schedule</h3>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">All</button>
          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Inspections</button>
          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Work Orders</button>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments today</h3>
            <p className="text-gray-500">Your schedule is clear for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getTypeColor(job.type)}`}></div>
                  <span className="text-sm font-medium text-gray-900">{job.time}</span>
                </div>
                
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{job.client}</p>
                  <p className="text-xs text-gray-500 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {job.site}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>{job.tech}</span>
                </div>
                
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
                
                <div className="text-xs text-gray-500">
                  ETA: {job.eta}
                </div>
              </div>
              
              <div className="flex space-x-1">
                <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Dispatch</button>
                <button className="px-2 py-1 text-xs bg-green-600 text-white rounded">Start Nav</button>
              </div>
            </div>
          ))}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center">
            View Full Schedule
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
