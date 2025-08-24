'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input, Badge } from '@/components/ui'
import { PlusCircle, Search, User, Phone, Mail, Building2 } from 'lucide-react'

interface Contact {
  id: number
  name: string
  email: string
  phone: string
  company?: string
  role: string
  type: 'client' | 'vendor' | 'employee'
  status: 'active' | 'inactive'
  last_contact?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  // Mock data for now
  const mockContacts: Contact[] = [
    {
      id: 1,
      name: "John Smith",
      email: "john@abccorp.com",
      phone: "(555) 123-4567",
      company: "ABC Corporation",
      role: "Property Manager",
      type: 'client',
      status: 'active',
      last_contact: "2024-01-15"
    },
    {
      id: 2,
      name: "Maria Garcia",
      email: "maria@johnson.com",
      phone: "(555) 234-5678", 
      company: "Johnson Residence",
      role: "Homeowner",
      type: 'client',
      status: 'active',
      last_contact: "2024-01-12"
    },
    {
      id: 3,
      name: "Bob Wilson",
      email: "bob@sprinklerparts.com",
      phone: "(555) 345-6789",
      company: "Sprinkler Parts Inc",
      role: "Sales Rep",
      type: 'vendor',
      status: 'active',
      last_contact: "2024-01-10"
    }
  ]

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.role.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || contact.type === filterType
    
    return matchesSearch && matchesFilter
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800'
      case 'vendor': return 'bg-green-100 text-green-800'
      case 'employee': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout title="Contacts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600">Manage all your business contacts</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              size="sm"
            >
              All
            </Button>
            <Button 
              variant={filterType === 'client' ? 'default' : 'outline'}
              onClick={() => setFilterType('client')}
              size="sm"
            >
              Clients
            </Button>
            <Button 
              variant={filterType === 'vendor' ? 'default' : 'outline'}
              onClick={() => setFilterType('vendor')}
              size="sm"
            >
              Vendors
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {mockContacts.filter(c => c.type === 'client').length}
              </div>
              <div className="text-sm text-gray-600">Clients</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {mockContacts.filter(c => c.type === 'vendor').length}
              </div>
              <div className="text-sm text-gray-600">Vendors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {mockContacts.filter(c => c.type === 'employee').length}
              </div>
              <div className="text-sm text-gray-600">Employees</div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <User className="h-10 w-10 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                      <p className="text-sm text-gray-600">{contact.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getTypeColor(contact.type)}>
                      {contact.type}
                    </Badge>
                    <Badge className={getStatusColor(contact.status)}>
                      {contact.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {contact.email}
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {contact.phone}
                  </div>

                  {contact.company && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-2" />
                      {contact.company}
                    </div>
                  )}

                  {contact.last_contact && (
                    <div className="text-sm text-gray-500">
                      Last contact: {contact.last_contact}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No contacts match your search criteria.' : 'Add your first contact to get started.'}
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-5 w-5 mr-2" />
              Add Contact
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}