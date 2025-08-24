'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input, Badge } from '@/components/ui'
import { PlusCircle, Search, User, Phone, MapPin, Calendar } from 'lucide-react'

interface Technician {
  id: number
  name: string
  email: string
  phone: string
  specialties: string[]
  status: 'active' | 'busy' | 'offline'
  jobs_today: number
  current_location?: string
  next_appointment?: string
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Mock data for now
  const mockTechnicians: Technician[] = [
    {
      id: 1,
      name: "Mike Rodriguez",
      email: "mike@company.com",
      phone: "(555) 123-4567",
      specialties: ["Residential", "Repairs", "Installation"],
      status: 'active',
      jobs_today: 5,
      current_location: "North Austin",
      next_appointment: "2:30 PM"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah@company.com", 
      phone: "(555) 234-5678",
      specialties: ["Commercial", "Maintenance", "Winterization"],
      status: 'busy',
      jobs_today: 3,
      current_location: "Downtown",
      next_appointment: "4:00 PM"
    },
    {
      id: 3,
      name: "David Chen",
      email: "david@company.com",
      phone: "(555) 345-6789",
      specialties: ["Installation", "Troubleshooting"],
      status: 'offline',
      jobs_today: 2,
      current_location: "South Austin"
    }
  ]

  const filteredTechnicians = mockTechnicians.filter(tech => 
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.specialties.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'  
      case 'offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout title="Technicians">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
            <p className="text-gray-600">Manage your field service team</p>
          </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Technician
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search technicians..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {mockTechnicians.filter(t => t.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {mockTechnicians.filter(t => t.status === 'busy').length}
            </div>
            <div className="text-sm text-gray-600">On Job</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {mockTechnicians.filter(t => t.status === 'offline').length}
            </div>
            <div className="text-sm text-gray-600">Offline</div>
          </CardContent>
        </Card>
      </div>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTechnicians.map((tech) => (
          <Card key={tech.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <User className="h-10 w-10 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{tech.name}</h3>
                    <p className="text-sm text-gray-600">{tech.email}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(tech.status)}>
                  {tech.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {tech.phone}
                </div>

                {tech.current_location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tech.current_location}
                  </div>
                )}

                {tech.next_appointment && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Next: {tech.next_appointment}
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  Jobs today: <span className="font-medium">{tech.jobs_today}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {tech.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Schedule
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Assign Job
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTechnicians.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No technicians found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No technicians match your search criteria.' : 'Add your first technician to get started.'}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Technician
          </Button>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}