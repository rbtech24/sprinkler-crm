'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { 
  MapPin, 
  Camera, 
  Mic, 
  Share2,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Navigation,
  Phone
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

interface TechDashboardProps {
  user: any
  className?: string
}

interface JobTimelineItem {
  id: number
  site_name: string
  client_name: string
  status: string
  created_at: string
  type: string
}

interface ProductivityData {
  date: string
  completed: number
  efficiency: number
}

export function TechDashboard({ user, className = '' }: TechDashboardProps) {
  const [todayData, setTodayData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTechData()
  }, [])

  const fetchTechData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/dashboard/tech/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        setTodayData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch tech dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mock productivity data - in production, this would come from the API
  const productivityData: ProductivityData[] = [
    { date: '01/15', completed: 6, efficiency: 85 },
    { date: '01/16', completed: 8, efficiency: 92 },
    { date: '01/17', completed: 5, efficiency: 78 },
    { date: '01/18', completed: 9, efficiency: 95 },
    { date: '01/19', completed: 7, efficiency: 88 },
    { date: '01/20', completed: 10, efficiency: 98 },
    { date: '01/21', completed: 8, efficiency: 90 }
  ]

  const updateJobStatus = async (jobId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      await fetch(`${apiUrl}/dashboard/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      // Refresh data after update
      fetchTechData()
    } catch (error) {
      console.error('Failed to update job status:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  const schedule = todayData?.schedule || []
  const timeline = todayData?.timeline || []
  const productivity = todayData?.productivity || { completed_today: 0, total_assigned: 0 }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Route Map Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Today's Route</h3>
            <div className="flex items-center space-x-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">{schedule.length} stops</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Route map will be displayed here</p>
              <p className="text-sm text-gray-500">Integration with Google Maps or similar service</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-gray-600">Estimated drive time: 45 min</span>
            <span className="text-gray-600">Total distance: 28 miles</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <CheckCircle className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-blue-900">New Inspection</span>
            </button>
            
            <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <Camera className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-green-900">Add Photo</span>
            </button>
            
            <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Mic className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-purple-900">Voice Note</span>
            </button>
            
            <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <Share2 className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-orange-900">Share ETA</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Job Timeline and Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Job Timeline</h3>
              <div className="text-sm text-gray-600">
                {productivity.completed_today}/{productivity.total_assigned} completed
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {timeline.length > 0 ? timeline.map((job: JobTimelineItem, index: number) => (
                <div key={job.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    job.status === 'completed' ? 'bg-green-500' :
                    job.status === 'in_progress' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{job.site_name}</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{job.client_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {job.status !== 'completed' && (
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => updateJobStatus(job.id, 'in_progress')}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => updateJobStatus(job.id, 'completed')}
                          className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No jobs scheduled for today</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Productivity Trend */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Productivity Trend</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                  name="Jobs Completed"
                />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                  name="Efficiency %"
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Daily Stats */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{productivity.completed_today}</p>
                <p className="text-xs text-gray-600">Completed Today</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">92%</p>
                <p className="text-xs text-gray-600">Efficiency</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">4.8</p>
                <p className="text-xs text-gray-600">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Today's Schedule</h3>
        </CardHeader>
        <CardContent>
          {schedule.length > 0 ? (
            <div className="space-y-3">
              {schedule.map((appointment: any, index: number) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-600">
                      {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <p className="font-medium">{appointment.site_name}</p>
                      <p className="text-sm text-gray-600">{appointment.client_name}</p>
                      <p className="text-xs text-gray-500">{appointment.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                    <button className="p-1 text-blue-600 hover:text-blue-800">
                      <Phone className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-green-600 hover:text-green-800">
                      <Navigation className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No appointments scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}