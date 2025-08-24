'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { 
  MapPin, 
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Navigation,
  Camera,
  Mic,
  Share2,
  Settings,
  LogOut,
  Bell,
  User,
  DollarSign,
  Menu,
  X,
  Home,
  Tool,
  CreditCard,
  Star,
  FileText,
  ClipboardCheck,
  Wrench,
  Droplets
} from 'lucide-react'

interface TodayData {
  schedule: Array<{
    id: number
    site_name: string
    client_name: string
    address: string
    scheduled_at: string
    status: string
  }>
  timeline: Array<{
    id: number
    site_name: string
    client_name: string
    status: string
    created_at: string
  }>
  productivity: {
    completed_today: number
    total_assigned: number
  }
}

interface ServicePlan {
  id: number
  name: string
  description: string
  price_cents: number
  billing_frequency: 'monthly' | 'quarterly' | 'annual'
  features: string[]
  is_popular?: boolean
}

interface Inspection {
  id: number
  client_name: string
  site_name?: string
  property_address: string
  scheduled_date: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'needs_followup'
  inspection_type: string
  overall_condition?: string
  estimated_duration: number
  zone_count: number
  photo_count: number
}

export default function TechMobilePage() {
  const { user, isAuthenticated, hasHydrated, logout } = useAuthStore()
  const router = useRouter()
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'today' | 'route' | 'history' | 'plans' | 'inspections'>('today')
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [isCreatingInspection, setIsCreatingInspection] = useState(false)

  // Protect page - technicians only
  useEffect(() => {
    if (!hasHydrated) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    
    if (!isAuthenticated && !token) {
      router.push('/auth/login')
      return
    }

    if (user && !['tech', 'field_technician', 'technician'].includes(user.role)) {
      router.push('/dashboard')
      return
    }
  }, [user, isAuthenticated, hasHydrated, router])

  useEffect(() => {
    if (user && ['tech', 'field_technician', 'technician'].includes(user.role)) {
      fetchTechData()
      fetchServicePlans()
      fetchInspections()
      fetchClients()
    }
  }, [user])

  const fetchTechData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const response = await fetch(`${apiUrl}/dashboard/tech/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setTodayData(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch tech data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchServicePlans = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const response = await fetch(`${apiUrl}/service-plans/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setServicePlans(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch service plans:', error)
    }
  }

  const fetchInspections = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const response = await fetch(`${apiUrl}/inspections?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setInspections(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch inspections:', error)
    }
  }

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const response = await fetch(`${apiUrl}/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setClients(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    }
  }

  const createNewInspection = async (inspectionData: any) => {
    try {
      setIsCreatingInspection(true)
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      
      const response = await fetch(`${apiUrl}/inspections`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inspectionData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Refresh inspections list
          fetchInspections()
          setShowNewInspectionModal(false)
          // Optionally start the inspection immediately
          if (result.data?.id) {
            startInspection(result.data.id)
          }
        }
      } else {
        const error = await response.json()
        alert(`Failed to create inspection: ${error.error || 'Please try again'}`)
      }
    } catch (error) {
      console.error('Failed to create inspection:', error)
      alert('Failed to create inspection. Please try again.')
    } finally {
      setIsCreatingInspection(false)
    }
  }

  const startInspection = async (inspectionId: number) => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const response = await fetch(`${apiUrl}/inspections/${inspectionId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Refresh inspections list
          fetchInspections()
          // Navigate to detailed inspection interface
          router.push(`/tech/inspection/${inspectionId}`)
        }
      }
    } catch (error) {
      console.error('Failed to start inspection:', error)
      alert('Failed to start inspection. Please try again.')
    }
  }

  const presentPlanToCustomer = (plan: ServicePlan) => {
    setSelectedPlan(plan)
    setShowPlanModal(true)
  }

  const sellServicePlan = async (planId: number, customerInfo: any) => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      const response = await fetch(`${apiUrl}/service-plans/sell`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          customer_info: customerInfo,
          sold_by_technician_id: user?.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert('Service plan sold successfully!')
          setShowPlanModal(false)
          setSelectedPlan(null)
        }
      }
    } catch (error) {
      console.error('Failed to sell service plan:', error)
      alert('Failed to sell service plan. Please try again.')
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!hasHydrated || (!isAuthenticated && !localStorage.getItem('auth_token'))) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && !['tech', 'field_technician', 'technician'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">This mobile interface is for field technicians only.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Go to Main Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-blue-600 text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="mr-3 p-1"
            >
              {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <div>
              <h1 className="font-semibold text-lg">Field Tech</h1>
              <p className="text-blue-100 text-sm">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg bg-blue-500">
              <Bell className="h-5 w-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg bg-blue-500"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {showMenu && (
          <div className="absolute top-full left-0 right-0 bg-blue-600 border-t border-blue-500 p-4">
            <div className="space-y-3">
              <button 
                onClick={() => { setActiveTab('today'); setShowMenu(false) }}
                className={`w-full flex items-center p-3 rounded-lg text-left ${
                  activeTab === 'today' ? 'bg-blue-500' : 'hover:bg-blue-500'
                }`}
              >
                <Calendar className="h-5 w-5 mr-3" />
                Today's Jobs
              </button>
              <button 
                onClick={() => { setActiveTab('route'); setShowMenu(false) }}
                className={`w-full flex items-center p-3 rounded-lg text-left ${
                  activeTab === 'route' ? 'bg-blue-500' : 'hover:bg-blue-500'
                }`}
              >
                <MapPin className="h-5 w-5 mr-3" />
                Route Map
              </button>
              <button 
                onClick={() => { setActiveTab('history'); setShowMenu(false) }}
                className={`w-full flex items-center p-3 rounded-lg text-left ${
                  activeTab === 'history' ? 'bg-blue-500' : 'hover:bg-blue-500'
                }`}
              >
                <Clock className="h-5 w-5 mr-3" />
                Job History
              </button>
              <button 
                onClick={() => { setActiveTab('inspections'); setShowMenu(false) }}
                className={`w-full flex items-center p-3 rounded-lg text-left ${
                  activeTab === 'inspections' ? 'bg-blue-500' : 'hover:bg-blue-500'
                }`}
              >
                <ClipboardCheck className="h-5 w-5 mr-3" />
                Inspections
              </button>
              <button 
                onClick={() => { setActiveTab('plans'); setShowMenu(false) }}
                className={`w-full flex items-center p-3 rounded-lg text-left ${
                  activeTab === 'plans' ? 'bg-blue-500' : 'hover:bg-blue-500'
                }`}
              >
                <CreditCard className="h-5 w-5 mr-3" />
                Service Plans
              </button>
              <button 
                onClick={() => router.push('/tech/settings')}
                className="w-full flex items-center p-3 rounded-lg text-left hover:bg-blue-500"
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Quick Stats */}
      <div className="p-4 bg-white border-b">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {todayData?.productivity.completed_today || 0}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {todayData?.schedule.length || 0}
            </div>
            <div className="text-xs text-gray-600">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">92%</div>
            <div className="text-xs text-gray-600">Efficiency</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white border-b overflow-x-auto">
        {[
          { key: 'today', label: 'Today', icon: Calendar },
          { key: 'inspections', label: 'Inspect', icon: ClipboardCheck },
          { key: 'plans', label: 'Plans', icon: CreditCard },
          { key: 'history', label: 'History', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center py-3 border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'today' && (
          <div className="p-4 space-y-4">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowNewInspectionModal(true)}
                  className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <CheckCircle2 className="h-6 w-6 text-blue-600 mb-1" />
                  <span className="text-sm font-medium text-blue-900">New Inspection</span>
                </button>
                <button className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                  <Camera className="h-6 w-6 text-green-600 mb-1" />
                  <span className="text-sm font-medium text-green-900">Add Photo</span>
                </button>
                <button className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
                  <Mic className="h-6 w-6 text-purple-600 mb-1" />
                  <span className="text-sm font-medium text-purple-900">Voice Note</span>
                </button>
                <button className="flex flex-col items-center p-3 bg-orange-50 rounded-lg">
                  <Share2 className="h-6 w-6 text-orange-600 mb-1" />
                  <span className="text-sm font-medium text-orange-900">Share ETA</span>
                </button>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Today's Schedule</h3>
              </div>
              <div className="divide-y">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : todayData?.schedule.length ? (
                  todayData.schedule.map((job) => (
                    <div key={job.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{job.site_name}</h4>
                          <p className="text-sm text-gray-600">{job.client_name}</p>
                          <p className="text-sm text-gray-500">{job.address}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(job.scheduled_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Phone className="h-4 w-4" />
                          </button>
                          <button className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <Navigation className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No jobs scheduled for today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'route' && (
          <div className="p-4">
            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Route Map</h3>
              <p className="text-gray-600 mb-4">Interactive route map with turn-by-turn navigation</p>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">
                Open Navigation
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Recent Jobs</h3>
              </div>
              <div className="divide-y">
                {todayData?.timeline.map((job) => (
                  <div key={job.id} className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{job.site_name}</h4>
                      <p className="text-sm text-gray-600">{job.client_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center">
                  <ClipboardCheck className="h-5 w-5 mr-2 text-blue-600" />
                  Irrigation Inspections
                </h3>
                <button 
                  onClick={() => setShowNewInspectionModal(true)}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  New Inspection
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Perform comprehensive inspections of irrigation systems. Document findings and generate reports.
              </p>
              <div className="flex items-center bg-blue-50 p-3 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800">
                  <strong>Professional:</strong> Follow systematic inspection procedures for accurate documentation
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {inspections.map((inspection) => (
                <div key={inspection.id} className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{inspection.client_name}</h4>
                        <p className="text-sm text-gray-600">{inspection.site_name || 'Main Property'}</p>
                        <p className="text-sm text-gray-500">{inspection.property_address}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(inspection.status)}`}>
                          {inspection.status.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          {inspection.inspection_type}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(inspection.scheduled_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {inspection.estimated_duration} min
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Wrench className="h-3 w-3 mr-1" />
                        {inspection.zone_count} zones
                      </div>
                      <div className="flex items-center">
                        <Camera className="h-3 w-3 mr-1" />
                        {inspection.photo_count} photos
                      </div>
                    </div>
                    
                    {inspection.status === 'scheduled' && (
                      <button 
                        onClick={() => startInspection(inspection.id)}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Start Inspection
                      </button>
                    )}
                    
                    {inspection.status === 'in_progress' && (
                      <button 
                        onClick={() => router.push(`/tech/inspection/${inspection.id}`)}
                        className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center"
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Continue Inspection
                      </button>
                    )}
                    
                    {inspection.status === 'completed' && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => router.push(`/tech/inspection/${inspection.id}`)}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Report
                        </button>
                        {inspection.overall_condition && (
                          <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                            inspection.overall_condition === 'excellent' ? 'bg-green-100 text-green-800' :
                            inspection.overall_condition === 'good' ? 'bg-blue-100 text-blue-800' :
                            inspection.overall_condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {inspection.overall_condition}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {inspections.length === 0 && (
              <div className="bg-white rounded-lg p-8 shadow-sm text-center">
                <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Inspections Assigned</h3>
                <p className="text-gray-600">
                  Check with your dispatcher for scheduled inspections
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-2">Sell Service Plans</h3>
              <p className="text-sm text-gray-600 mb-4">
                Present and sell service plans to customers while on-site. Earn commission for each sale!
              </p>
              <div className="flex items-center bg-green-50 p-3 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-green-800">
                  <strong>Tip:</strong> Best time to sell is after completing a successful job
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {servicePlans.map((plan) => (
                <div key={plan.id} className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{plan.name}</h4>
                        {plan.is_popular && (
                          <div className="inline-flex items-center bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full mt-1">
                            <Star className="h-3 w-3 mr-1" />
                            Most Popular
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${(plan.price_cents / 100).toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-500">/{plan.billing_frequency}</div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <div className="text-sm text-blue-600">
                          +{plan.features.length - 3} more features
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => presentPlanToCustomer(plan)}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Present to Customer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {servicePlans.length === 0 && (
              <div className="bg-white rounded-lg p-8 shadow-sm text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Service Plans Available</h3>
                <p className="text-gray-600">
                  Contact your admin to create service plans for selling
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t p-2 sticky bottom-0">
        <div className="flex justify-center">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-full flex items-center shadow-lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Start Next Job
          </button>
        </div>
      </div>

      {/* New Inspection Modal */}
      {showNewInspectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create New Inspection</h3>
                <button 
                  onClick={() => setShowNewInspectionModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const selectedClient = clients.find(c => c.id === parseInt(formData.get('client_id') as string))
                
                const inspectionData = {
                  client_id: parseInt(formData.get('client_id') as string),
                  inspection_type: formData.get('inspection_type'),
                  scheduled_date: formData.get('scheduled_date'),
                  property_address: formData.get('property_address') || selectedClient?.billing_address_street,
                  property_type: formData.get('property_type'),
                  estimated_duration: parseInt(formData.get('estimated_duration') as string) || 60
                }
                
                createNewInspection(inspectionData)
              }}>
                <div className="space-y-4">
                  {/* Client Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Client *
                    </label>
                    <select
                      name="client_id"
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Choose a client...</option>
                      {Array.isArray(clients) && clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} - {client.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Inspection Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inspection Type
                    </label>
                    <select
                      name="inspection_type"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="routine">Routine Inspection</option>
                      <option value="seasonal_startup">Seasonal Startup</option>
                      <option value="seasonal_shutdown">Seasonal Shutdown</option>
                      <option value="repair_assessment">Repair Assessment</option>
                      <option value="compliance">Compliance Check</option>
                    </select>
                  </div>

                  {/* Scheduled Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scheduled Date *
                    </label>
                    <input
                      type="date"
                      name="scheduled_date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Property Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Address
                    </label>
                    <input
                      type="text"
                      name="property_address"
                      placeholder="Enter property address (optional if using client address)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type
                    </label>
                    <select
                      name="property_type"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="municipal">Municipal</option>
                      <option value="athletic">Athletic Field</option>
                    </select>
                  </div>

                  {/* Estimated Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Duration (minutes)
                    </label>
                    <select
                      name="estimated_duration"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                      <option value="180">3 hours</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewInspectionModal(false)}
                    className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingInspection}
                    className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
                  >
                    {isCreatingInspection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Create & Start
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service Plan Presentation Modal */}
      {showPlanModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Present to Customer</h3>
                <button 
                  onClick={() => setShowPlanModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Plan Details */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-blue-600 mb-2">{selectedPlan.name}</h2>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${(selectedPlan.price_cents / 100).toFixed(0)}
                  <span className="text-lg text-gray-500">/{selectedPlan.billing_frequency}</span>
                </div>
                <p className="text-gray-600">{selectedPlan.description}</p>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">What's Included:</h4>
                <div className="space-y-2">
                  {selectedPlan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Information Form */}
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const customerInfo = {
                  name: formData.get('customer_name'),
                  email: formData.get('customer_email'),
                  phone: formData.get('customer_phone'),
                  property_address: formData.get('property_address')
                }
                sellServicePlan(selectedPlan.id, customerInfo)
              }}>
                <h4 className="font-semibold mb-3">Customer Information:</h4>
                
                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    name="customer_name"
                    placeholder="Customer Name"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    name="customer_email"
                    placeholder="Email Address"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    name="customer_phone"
                    placeholder="Phone Number"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    name="property_address"
                    placeholder="Property Address"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-semibold flex items-center justify-center"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Complete Sale
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}