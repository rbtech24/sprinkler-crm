'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  Star,
  ArrowRight,
  Phone,
  MapPin,
  Clock
} from 'lucide-react'

interface ServicePlan {
  id: string
  name: string
  price_cents: number
  commission_rate: number
  description: string
  included_services: string[]
  max_sites: number
}

export function FieldSales() {
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Mock data for demo
  const servicePlans: ServicePlan[] = [
    {
      id: '1',
      name: 'Basic Maintenance',
      price_cents: 9900,
      commission_rate: 0.10,
      description: 'Monthly sprinkler system inspection and basic maintenance',
      included_services: ['Monthly inspection', 'Basic repairs included', 'System performance check'],
      max_sites: 1
    },
    {
      id: '2',
      name: 'Premium Care',
      price_cents: 19900,
      commission_rate: 0.15,
      description: 'Comprehensive maintenance with priority support',
      included_services: ['Bi-weekly inspection', 'All repairs included', 'Priority support', 'Seasonal tune-ups'],
      max_sites: 3
    },
    {
      id: '3',
      name: 'Commercial Plus',
      price_cents: 49900,
      commission_rate: 0.20,
      description: 'Enterprise-level service for commercial properties',
      included_services: ['Weekly inspection', 'Emergency support', '24/7 monitoring', 'Preventive maintenance'],
      max_sites: 99
    }
  ]

  const todayClients = [
    {
      id: 1,
      name: 'Green Valley Apartments',
      address: '123 Green Valley Dr, Austin, TX',
      phone: '555-0123',
      appointment_time: '10:00 AM',
      service_type: 'Inspection',
      current_plan: null
    },
    {
      id: 2,
      name: 'Smith Residence',
      address: '456 Oak Street, Austin, TX',
      phone: '555-0124',
      appointment_time: '2:00 PM',
      service_type: 'Repair Estimate',
      current_plan: null
    }
  ]

  const handleSellPlan = () => {
    if (selectedClient && selectedPlan) {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setSelectedClient(null)
        setSelectedPlan(null)
      }, 3000)
    }
  }

  const calculateCommission = (plan: ServicePlan) => {
    return Math.round(plan.price_cents * plan.commission_rate) / 100
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sale Successful! 🎉</h2>
            <p className="text-gray-600 mb-4">
              {selectedClient?.name} is now subscribed to {selectedPlan?.name}
            </p>
            <div className="bg-green-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>Your Commission:</strong> ${calculateCommission(selectedPlan!).toLocaleString()}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Plus recurring monthly commission!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Field Sales</h1>
            <p className="text-gray-600">Sell service plans and earn commission</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">$1,247</div>
            <div className="text-sm text-gray-600">This month's commission</div>
          </div>
        </div>
      </div>

      {!selectedClient ? (
        <>
          {/* Today's Appointments */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Appointments</h2>
            <div className="space-y-3">
              {todayClients.map((client) => (
                <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{client.name}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {client.address}
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            {client.appointment_time}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-4 w-4 mr-1" />
                            {client.phone}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {client.service_type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                        >
                          Sell Plan
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sales This Month</p>
                    <p className="text-xl font-bold text-gray-900">5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commission Rate</p>
                    <p className="text-xl font-bold text-gray-900">15%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : !selectedPlan ? (
        /* Service Plan Selection */
        <div>
          <div className="mb-6">
            <button
              onClick={() => setSelectedClient(null)}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to appointments
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              Select Service Plan for {selectedClient.name}
            </h2>
            <p className="text-gray-600">Choose the best plan for this client</p>
          </div>

          <div className="space-y-4">
            {servicePlans.map((plan) => (
              <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-gray-600 mt-1">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        ${(plan.price_cents / 100).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">per month</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Included Services:</p>
                    <div className="space-y-1">
                      {plan.included_services.map((service, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          {service}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Your Commission: </span>
                      <span className="text-green-600 font-bold">
                        ${calculateCommission(plan).toLocaleString()}
                      </span>
                      <span className="text-gray-500"> ({(plan.commission_rate * 100)}%)</span>
                    </div>
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Select Plan
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Confirmation */
        <div>
          <div className="mb-6">
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Back to plans
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Confirm Sale</h2>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedClient.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Service Plan</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPlan.name}</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    ${(selectedPlan.price_cents / 100).toLocaleString()}/month
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>Your Commission:</strong>
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    ${calculateCommission(selectedPlan).toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Plus ${(calculateCommission(selectedPlan) * 0.5).toLocaleString()}/month recurring
                  </p>
                </div>

                <button
                  onClick={handleSellPlan}
                  className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
                >
                  Confirm Sale
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}