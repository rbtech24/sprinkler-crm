'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input } from '@/components/ui'
import { PlusCircle, Search, MapPin, Building2 } from 'lucide-react'

interface Site {
  id: number
  name: string
  address: string
  client_name: string
  inspection_count: number
  last_inspection?: string
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Mock data for now
  const mockSites: Site[] = [
    {
      id: 1,
      name: "Main Office Complex",
      address: "123 Business Blvd, Austin TX",
      client_name: "ABC Corporation",
      inspection_count: 12,
      last_inspection: "2024-01-15"
    },
    {
      id: 2, 
      name: "Residential Property",
      address: "456 Oak Street, Austin TX",
      client_name: "Johnson Family",
      inspection_count: 5,
      last_inspection: "2024-01-10"
    }
  ]

  const filteredSites = mockSites.filter(site => 
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout title="Sites">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
            <p className="text-gray-600">Manage all service locations</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Site
          </Button>
        </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search sites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSites.map((site) => (
          <Card key={site.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{site.name}</h3>
                    <p className="text-sm text-gray-600">{site.client_name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {site.address}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {site.inspection_count} inspections
                  </span>
                  {site.last_inspection && (
                    <span className="text-gray-500">
                      Last: {site.last_inspection}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  New Inspection
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sites found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No sites match your search criteria.' : 'Get started by adding your first site.'}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Site
          </Button>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}