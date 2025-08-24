import { useState } from 'react'
import { Plus, Search, Filter, MoreHorizontal, MapPin, Phone, Mail } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Badge } from '@/components/ui'
import { Client } from '@/types/api'

type ClientType = 'all' | 'residential' | 'commercial'

interface ClientListProps {
  clients: Client[]
  onCreateClient: () => void
  onEditClient: (client: Client) => void
  onViewClient: (client: Client) => void
}

export function ClientList({ clients, onCreateClient, onEditClient, onViewClient }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ClientType>('all')

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || client.type === filterType
    
    return matchesSearch && matchesFilter
  })

  const getClientTypeColor = (type: string) => {
    switch (type) {
      case 'residential':
        return 'bg-blue-100 text-blue-800'
      case 'commercial':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-gray-600">Manage your client relationships and contact information</p>
        </div>
        <Button onClick={onCreateClient}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ClientType)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Clients</p>
          <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Residential</p>
          <p className="text-2xl font-bold text-blue-600">
            {clients.filter(c => c.type === 'residential').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Commercial</p>
          <p className="text-2xl font-bold text-green-600">
            {clients.filter(c => c.type === 'commercial').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Sites</TableHead>
              <TableHead>Last Inspection</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} onClick={() => onViewClient(client)}>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    {client.company && (
                      <p className="text-sm text-gray-500">{client.company}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getClientTypeColor(client.type)}>
                    {client.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {client.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-1" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-1" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-3 w-3 mr-1" />
                    {client.sites?.length || 0} sites
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-500">
                    {client.lastInspection ? 
                      new Date(client.lastInspection).toLocaleDateString() : 
                      'Never'
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditClient(client)
                      }}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Show more options menu
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No clients found matching your criteria</p>
            <Button onClick={onCreateClient} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Client
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
