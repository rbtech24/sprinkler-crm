'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  Users, 
  Calendar,
  Settings,
  TrendingUp
} from 'lucide-react'

interface ServicePlan {
  id: number
  name: string
  description: string
  price_cents: number
  billing_cycle: string
  is_active: boolean
  service_inclusions: string
  service_exclusions: string
  max_annual_visits: number
  priority_level: number
  discount_percentage: number
  active_subscriptions: number
  monthly_revenue: number
}

export default function ServicePlansPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const router = useRouter()
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Protect page and check admin permissions
  useEffect(() => {
    if (!hasHydrated) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    
    if (!isAuthenticated && !token) {
      router.push('/auth/login')
      return
    }

    if (user && !['owner', 'admin', 'manager', 'company_owner'].includes(user.role)) {
      router.push('/dashboard')
      return
    }
  }, [user, isAuthenticated, hasHydrated, router])

  useEffect(() => {
    if (user && ['owner', 'admin', 'manager', 'company_owner'].includes(user.role)) {
      fetchServicePlans()
    }
  }, [user])

  const fetchServicePlans = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/service-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      } else {
        console.error('Failed to fetch service plans:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch service plans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getPriorityLabel = (level: number) => {
    switch (level) {
      case 1: return 'Standard'
      case 2: return 'Priority'
      case 3: return 'Emergency'
      default: return 'Standard'
    }
  }

  const getPriorityColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-gray-100 text-gray-800'
      case 2: return 'bg-blue-100 text-blue-800'
      case 3: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!hasHydrated || (!isAuthenticated && !localStorage.getItem('auth_token'))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && !['owner', 'admin', 'manager', 'company_owner'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Settings className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access service plan management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
              <p className="text-sm text-gray-600">
                Manage subscription plans and pricing for your services
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Plan</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <Card>
                      <CardHeader className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Service Plans</h3>
                <p className="text-gray-600 mb-6">
                  Create your first service plan to start offering subscription services to clients
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Service Plan</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatPrice(plan.price_cents)}
                          <span className="text-sm font-normal text-gray-500">
                            /{plan.billing_cycle === 'monthly' ? 'mo' : plan.billing_cycle}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(plan.priority_level)}`}>
                          {getPriorityLabel(plan.priority_level)}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Statistics */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Users className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-lg font-semibold">{plan.active_subscriptions}</span>
                          </div>
                          <p className="text-xs text-gray-600">Active</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-lg font-semibold text-green-600">
                              {formatPrice(plan.monthly_revenue)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">Monthly</p>
                        </div>
                      </div>
                      
                      {/* Plan Details */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Included Services:</p>
                          <p className="text-xs text-gray-600 line-clamp-3">{plan.service_inclusions}</p>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {plan.max_annual_visits} visits/year
                          </div>
                          {plan.discount_percentage > 0 && (
                            <div className="text-green-600">
                              {plan.discount_percentage}% discount
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            plan.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}