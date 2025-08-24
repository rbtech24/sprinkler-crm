'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Card } from '@/components/ui'
import { useRouter } from 'next/navigation'

interface DispatchStats {
  activeJobs: number
  pendingScheduled: number
  availableTechs: number
  emergencyJobs: number
  completedToday: number
  avgResponseTime: string
  customerSatisfaction: number
  routeEfficiency: number
}

interface JobData {
  id: number
  client: string
  address: string
  type: string
  priority: 'low' | 'medium' | 'high' | 'emergency'
  technician?: string
  scheduledTime: string
  estimatedDuration: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  lat?: number
  lng?: number
  specialInstructions?: string
  equipmentNeeded?: string[]
  customerPhone?: string
  urgencyLevel?: number
}

interface TechnicianData {
  id: number
  name: string
  phone: string
  email: string
  currentLocation: string
  status: 'available' | 'busy' | 'offline' | 'en_route'
  currentJob?: string
  nextAvailable: string
  skillSet: string[]
  todayHours: number
  completedJobs: number
  rating: number
  lat?: number
  lng?: number
  vehicleInfo?: string
}

interface RouteOptimization {
  totalDistance: string
  estimatedTime: string
  fuelSavings: string
  stops: number
}

export default function DispatcherDashboard() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const router = useRouter()
  const [activeView, setActiveView] = useState<'overview' | 'schedule' | 'map' | 'performance'>('overview')
  const [stats, setStats] = useState<DispatchStats>({
    activeJobs: 0,
    pendingScheduled: 0,
    availableTechs: 0,
    emergencyJobs: 0,
    completedToday: 0,
    avgResponseTime: '0 min',
    customerSatisfaction: 0,
    routeEfficiency: 0
  })
  const [jobs, setJobs] = useState<JobData[]>([])
  const [technicians, setTechnicians] = useState<TechnicianData[]>([])
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimization>({
    totalDistance: '0 miles',
    estimatedTime: '0 hours',
    fuelSavings: '$0',
    stops: 0
  })

  useEffect(() => {
    if (!hasHydrated) return // Wait for hydration
    
    if (!isAuthenticated || user?.role !== 'dispatcher') {
      router.push('/auth/login')
      return
    }

    // Simulate loading advanced dispatch data
    setStats({
      activeJobs: 15,
      pendingScheduled: 12,
      availableTechs: 4,
      emergencyJobs: 2,
      completedToday: 28,
      avgResponseTime: '18 min',
      customerSatisfaction: 4.7,
      routeEfficiency: 92
    })

    setJobs([
      {
        id: 1,
        client: 'Green Valley Resort',
        address: '123 Resort Dr, Valley City',
        type: 'Emergency Repair',
        priority: 'emergency',
        technician: 'Mike Johnson',
        scheduledTime: '09:00 AM',
        estimatedDuration: '2 hours',
        status: 'in_progress',
        lat: 40.7128,
        lng: -74.0060,
        specialInstructions: 'Main irrigation line rupture - priority repair',
        equipmentNeeded: ['Pipe cutter', 'PVC cement', 'Replacement pipes'],
        customerPhone: '(555) 123-0001',
        urgencyLevel: 5
      },
      {
        id: 2,
        client: 'City Park System',
        address: '456 Park Ave, Downtown',
        type: 'Routine Inspection',
        priority: 'medium',
        scheduledTime: '10:30 AM',
        estimatedDuration: '1.5 hours',
        status: 'scheduled',
        lat: 40.7589,
        lng: -73.9851,
        equipmentNeeded: ['Pressure gauge', 'Flow meter'],
        customerPhone: '(555) 123-0002',
        urgencyLevel: 2
      },
      {
        id: 3,
        client: 'Oakwood HOA',
        address: '789 Oak Street, Suburbs',
        type: 'System Upgrade',
        priority: 'high',
        technician: 'Sarah Wilson',
        scheduledTime: '02:00 PM',
        estimatedDuration: '3 hours',
        status: 'scheduled',
        lat: 40.6892,
        lng: -74.0445,
        specialInstructions: 'Replace aging controller system',
        equipmentNeeded: ['Smart controller', 'Wire', 'Connectors'],
        customerPhone: '(555) 123-0003',
        urgencyLevel: 4
      }
    ])

    setTechnicians([
      {
        id: 19,
        name: 'Mike Johnson',
        phone: '(555) 234-5678',
        email: 'mike.j@company.com',
        currentLocation: 'Green Valley Resort',
        status: 'busy',
        currentJob: 'Emergency Repair - Green Valley Resort',
        nextAvailable: '11:30 AM',
        skillSet: ['Irrigation Repair', 'Emergency Response', 'System Diagnostics'],
        todayHours: 6.5,
        completedJobs: 3,
        rating: 4.8,
        lat: 40.7128,
        lng: -74.0060,
        vehicleInfo: 'Service Van #1'
      },
      {
        id: 20,
        name: 'Sarah Wilson',
        phone: '(555) 345-6789',
        email: 'sarah.w@company.com',
        currentLocation: 'Heading to Oakwood HOA',
        status: 'en_route',
        nextAvailable: '1:30 PM',
        skillSet: ['System Installation', 'Smart Controllers', 'Troubleshooting'],
        todayHours: 4.0,
        completedJobs: 2,
        rating: 4.9,
        lat: 40.7200,
        lng: -74.0100,
        vehicleInfo: 'Service Van #2'
      },
      {
        id: 21,
        name: 'David Garcia',
        phone: '(555) 456-7890',
        email: 'david.g@company.com',
        currentLocation: 'Shop',
        status: 'available',
        nextAvailable: 'Now',
        skillSet: ['Backflow Testing', 'Inspections', 'Maintenance'],
        todayHours: 5.5,
        completedJobs: 4,
        rating: 4.6,
        lat: 40.7500,
        lng: -73.9800,
        vehicleInfo: 'Service Van #3'
      },
      {
        id: 22,
        name: 'Lisa Chen',
        phone: '(555) 567-8901',
        email: 'lisa.c@company.com',
        currentLocation: 'Shop',
        status: 'available',
        nextAvailable: 'Now',
        skillSet: ['Water Conservation', 'System Audits', 'Training'],
        todayHours: 3.0,
        completedJobs: 2,
        rating: 4.9,
        lat: 40.7500,
        lng: -73.9800,
        vehicleInfo: 'Service Van #4'
      }
    ])

    setRouteOptimization({
      totalDistance: '127 miles',
      estimatedTime: '8.5 hours',
      fuelSavings: '$24.80',
      stops: 15
    })
  }, [user, isAuthenticated, router])

  const assignJob = (jobId: number, techId: number) => {
    const tech = technicians.find(t => t.id === techId)
    if (tech) {
      setJobs(jobs.map(job => 
        job.id === jobId 
          ? { ...job, technician: tech.name, status: 'scheduled' as const }
          : job
      ))
    }
  }

  const optimizeRoutes = () => {
    // Simulate route optimization
    alert('Route optimization completed! Routes updated for maximum efficiency.')
  }

  if (!isAuthenticated || user?.role !== 'dispatcher') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📱 Dispatch Command Center</h1>
              <p className="text-sm text-gray-600">
                {user?.company?.name || 'Company Dispatch'} • Real-time Operations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-700">Live Status</span>
              </div>
              <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
              <button 
                onClick={() => useAuthStore.getState().logout()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: '📊 Overview', icon: '📊' },
                { id: 'schedule', label: '📅 Schedule', icon: '📅' },
                { id: 'map', label: '🗺️ Live Map', icon: '🗺️' },
                { id: 'performance', label: '📈 Performance', icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">🔧</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-xl font-bold text-gray-900">{stats.activeJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">📅</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold text-gray-900">{stats.pendingScheduled}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">👷</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-xl font-bold text-green-600">{stats.availableTechs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">🚨</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Emergency</p>
                <p className="text-xl font-bold text-red-600">{stats.emergencyJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">✅</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-xl font-bold text-purple-600">{stats.completedToday}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">⏱️</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Response</p>
                <p className="text-xl font-bold text-indigo-600">{stats.avgResponseTime}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">⭐</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-xl font-bold text-pink-600">{stats.customerSatisfaction}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">🎯</div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-xl font-bold text-teal-600">{stats.routeEfficiency}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Based on Active View */}
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Jobs Queue */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">🚨 Priority Jobs Queue</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={optimizeRoutes}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                    >
                      🎯 Optimize Routes
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                      ➕ Add Job
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className={`border rounded-lg p-4 ${
                      job.priority === 'emergency' ? 'border-red-300 bg-red-50' :
                      job.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                      job.status === 'in_progress' ? 'border-blue-300 bg-blue-50' :
                      'border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">{job.client}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              job.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                              job.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {job.priority}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                              job.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {job.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">📍 {job.address}</p>
                          <p className="text-sm text-gray-500 mb-1">
                            🔧 {job.type} • ⏰ {job.scheduledTime} • ⏱️ {job.estimatedDuration}
                          </p>
                          {job.technician && (
                            <p className="text-sm text-blue-600 mb-1">👷 {job.technician}</p>
                          )}
                          {job.specialInstructions && (
                            <p className="text-sm text-orange-600 mb-1">📝 {job.specialInstructions}</p>
                          )}
                          {job.equipmentNeeded && (
                            <p className="text-sm text-purple-600">
                              🛠️ {job.equipmentNeeded.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2">
                          {!job.technician && (
                            <select 
                              className="text-sm border-gray-300 rounded-md"
                              onChange={(e) => e.target.value && assignJob(job.id, parseInt(e.target.value))}
                            >
                              <option value="">Assign Tech</option>
                              {technicians.filter(t => t.status === 'available').map(tech => (
                                <option key={tech.id} value={tech.id}>
                                  {tech.name} ({tech.rating}⭐)
                                </option>
                              ))}
                            </select>
                          )}
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border">
                              📞 Call
                            </button>
                            <button className="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded border">
                              📍 Map
                            </button>
                            <button className="text-purple-600 hover:text-purple-800 text-sm px-2 py-1 rounded border">
                              ✏️ Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Technician Status & Route Optimization */}
            <div className="space-y-6">
              {/* Route Optimization */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🎯 Route Optimization</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Distance</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptimization.totalDistance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Est. Time</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptimization.estimatedTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fuel Savings</span>
                    <span className="text-sm font-medium text-green-600">{routeOptimization.fuelSavings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Stops</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptimization.stops}</span>
                  </div>
                </div>
                <button 
                  onClick={optimizeRoutes}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  🚀 Re-optimize Routes
                </button>
              </Card>

              {/* Technician Status */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">👷 Team Status</h3>
                <div className="space-y-4">
                  {technicians.map((tech) => (
                    <div key={tech.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{tech.name}</h4>
                          <p className="text-sm text-gray-600">{tech.phone}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          tech.status === 'available' ? 'bg-green-100 text-green-800' :
                          tech.status === 'busy' ? 'bg-red-100 text-red-800' :
                          tech.status === 'en_route' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tech.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">📍 {tech.currentLocation}</p>
                      
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">⏰ {tech.todayHours}h</span>
                        <span className="text-gray-600">✅ {tech.completedJobs}</span>
                        <span className="text-yellow-600">⭐ {tech.rating}</span>
                      </div>
                      
                      {tech.currentJob && (
                        <p className="text-sm text-blue-600 mb-1">🔧 {tech.currentJob}</p>
                      )}
                      
                      <p className="text-sm text-green-600">📅 Available: {tech.nextAvailable}</p>
                      
                      <div className="flex space-x-2 mt-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border">
                          📞
                        </button>
                        <button className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded border">
                          📍
                        </button>
                        <button className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded border">
                          📊
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Emergency Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🚨 Emergency Actions</h3>
                <div className="space-y-3">
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm">
                    🆘 Emergency Dispatch
                  </button>
                  <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm">
                    📢 Team Broadcast
                  </button>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                    📍 Track All Vehicles
                  </button>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm">
                    📊 Generate Report
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Other view content would go here */}
        {activeView === 'schedule' && (
          <Card className="p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">📅 Advanced Scheduling View</h2>
            <p className="text-gray-600">Calendar and timeline scheduling interface would be here...</p>
          </Card>
        )}

        {activeView === 'map' && (
          <Card className="p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">🗺️ Live Map & GPS Tracking</h2>
            <p className="text-gray-600">Interactive map with real-time technician locations would be here...</p>
          </Card>
        )}

        {activeView === 'performance' && (
          <Card className="p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">📈 Performance Analytics</h2>
            <p className="text-gray-600">Charts, metrics, and performance analysis would be here...</p>
          </Card>
        )}
      </div>
    </div>
  )
}