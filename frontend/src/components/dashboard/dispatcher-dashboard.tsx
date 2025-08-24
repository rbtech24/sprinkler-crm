import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, Button, Badge, LoadingSpinner } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { 
  MapPin, 
  Clock, 
  Navigation, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Phone,
  MessageSquare,
  RotateCcw,
  Filter
} from 'lucide-react'

// Map integration (using Leaflet)
import dynamic from 'next/dynamic'

// Dynamically import map component to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

interface Technician {
  id: string
  name: string
  email: string
  phone: string
  status: 'available' | 'busy' | 'offline' | 'en_route'
  current_job?: any
  location?: {
    latitude: number
    longitude: number
    accuracy?: number
    last_updated: string
  }
  skills: string[]
  performance_score: number
  jobs_today: number
  next_job?: any
}

interface Job {
  id: string
  type: 'inspection' | 'work_order' | 'estimate'
  client_name: string
  site_name: string
  address: string
  scheduled_time: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to?: string
  estimated_duration: number
  skills_required: string[]
  location: {
    latitude: number
    longitude: number
  }
}

interface DispatcherDashboardProps {
  className?: string
}

export function DispatcherDashboard({ className }: DispatcherDashboardProps) {
  const { api } = useApi()
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]) // US center
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'busy' | 'issues'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshInterval = useRef<NodeJS.Timeout>()

  // Load dispatcher data
  useEffect(() => {
    loadDispatcherData()
    
    if (autoRefresh) {
      refreshInterval.current = setInterval(loadDispatcherData, 30000) // Refresh every 30 seconds
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [autoRefresh])

  const loadDispatcherData = async () => {
    try {
      setIsLoading(true)
      
      // Load technicians with real-time data
      const techResponse = await api.get<Technician[]>('/api/dispatch/technicians')
      setTechnicians(techResponse)
      
      // Load jobs for today
      const today = new Date().toISOString().split('T')[0]
      const jobsResponse = await api.get<Job[]>(`/api/dispatch/jobs?date=${today}`)
      setJobs(jobsResponse)
      
      // Set map center to average location of technicians
      if (techResponse.length > 0) {
        const validLocations = techResponse.filter(t => t.location)
        if (validLocations.length > 0) {
          const avgLat = validLocations.reduce((sum, t) => sum + t.location!.latitude, 0) / validLocations.length
          const avgLng = validLocations.reduce((sum, t) => sum + t.location!.longitude, 0) / validLocations.length
          setMapCenter([avgLat, avgLng])
        }
      }
      
    } catch (error) {
      console.error('Failed to load dispatcher data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFilteredTechnicians = () => {
    switch (filter) {
      case 'available':
        return technicians.filter(t => t.status === 'available')
      case 'busy':
        return technicians.filter(t => t.status === 'busy' || t.status === 'en_route')
      case 'issues':
        return technicians.filter(t => t.status === 'offline' || t.performance_score < 70)
      default:
        return technicians
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge>
      case 'busy':
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" />Busy</Badge>
      case 'en_route':
        return <Badge variant="info" className="flex items-center"><Navigation className="h-3 w-3 mr-1" />En Route</Badge>
      case 'offline':
        return <Badge variant="secondary" className="flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Offline</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="danger">Critical</Badge>
      case 'high':
        return <Badge variant="warning">High</Badge>
      case 'medium':
        return <Badge variant="info">Medium</Badge>
      case 'low':
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="default">{priority}</Badge>
    }
  }

  const assignJob = async (jobId: string, technicianId: string) => {
    try {
      await api.post('/api/dispatch/assign', {
        job_id: jobId,
        technician_id: technicianId
      })
      
      // Refresh data
      await loadDispatcherData()
      
    } catch (error) {
      console.error('Failed to assign job:', error)
    }
  }

  const useSmartAssignment = async (jobId: string) => {
    try {
      const response = await api.post(`/api/dispatch/smart-assign/${jobId}`)
      
      if (response.success) {
        // Refresh data
        await loadDispatcherData()
      }
      
    } catch (error) {
      console.error('Smart assignment failed:', error)
    }
  }

  const contactTechnician = (technician: Technician, method: 'call' | 'message') => {
    if (method === 'call') {
      window.open(`tel:${technician.phone}`)
    } else {
      // Open messaging interface (could integrate with SMS service)
      window.open(`sms:${technician.phone}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Dispatch Center</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant={autoRefresh ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center"
            >
              <RotateCcw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDispatcherData}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Refresh Now
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="all">All Technicians</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="issues">Issues</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {technicians.filter(t => t.status === 'available').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Busy</p>
                <p className="text-2xl font-bold text-orange-600">
                  {technicians.filter(t => t.status === 'busy').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Route</p>
                <p className="text-2xl font-bold text-blue-600">
                  {technicians.filter(t => t.status === 'en_route').length}
                </p>
              </div>
              <Navigation className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {technicians.filter(t => t.status === 'offline' || t.performance_score < 70).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Map and Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Technicians List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Technicians ({getFilteredTechnicians().length})</h3>
            </CardHeader>
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              <div className="space-y-2 p-4">
                {getFilteredTechnicians().map((technician) => (
                  <div
                    key={technician.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTechnician?.id === technician.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTechnician(technician)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{technician.name}</h4>
                      {getStatusBadge(technician.status)}
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Jobs Today:</span>
                        <span className="font-medium">{technician.jobs_today}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Performance:</span>
                        <span className={`font-medium ${
                          technician.performance_score >= 80 ? 'text-green-600' :
                          technician.performance_score >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {technician.performance_score}%
                        </span>
                      </div>
                      {technician.location && (
                        <div className="flex items-center text-gray-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="text-xs">
                            Updated {new Date(technician.location.last_updated).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          contactTechnician(technician, 'call')
                        }}
                        className="p-1"
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          contactTechnician(technician, 'message')
                        }}
                        className="p-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Live Map View
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 rounded-lg overflow-hidden">
                {typeof window !== 'undefined' && (
                  <MapContainer
                    center={mapCenter}
                    zoom={10}
                    className="h-full w-full"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="© OpenStreetMap contributors"
                    />
                    
                    {/* Technician Markers */}
                    {technicians
                      .filter(t => t.location)
                      .map((technician) => (
                        <Marker
                          key={technician.id}
                          position={[technician.location!.latitude, technician.location!.longitude]}
                        >
                          <Popup>
                            <div className="p-2">
                              <h4 className="font-medium">{technician.name}</h4>
                              <p className="text-sm text-gray-600">{technician.status}</p>
                              {technician.current_job && (
                                <p className="text-xs text-blue-600">
                                  Current: {technician.current_job.site_name}
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    
                    {/* Job Markers */}
                    {jobs.map((job) => (
                      <Marker
                        key={job.id}
                        position={[job.location.latitude, job.location.longitude]}
                      >
                        <Popup>
                          <div className="p-2">
                            <h4 className="font-medium">{job.site_name}</h4>
                            <p className="text-sm text-gray-600">{job.client_name}</p>
                            <p className="text-xs text-gray-500">{job.type}</p>
                            {getPriorityBadge(job.priority)}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Queue */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Today's Jobs ({jobs.length})</h3>
            </CardHeader>
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              <div className="space-y-2 p-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedJob?.id === job.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{job.site_name}</h4>
                      {getPriorityBadge(job.priority)}
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>{job.client_name}</p>
                      <p className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(job.scheduled_time).toLocaleTimeString()}
                      </p>
                      <p className="capitalize">{job.type.replace('_', ' ')}</p>
                      
                      {job.assigned_to ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span>Assigned</span>
                        </div>
                      ) : (
                        <div className="space-y-1 mt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              useSmartAssignment(job.id)
                            }}
                            className="w-full text-xs"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Smart Assign
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
