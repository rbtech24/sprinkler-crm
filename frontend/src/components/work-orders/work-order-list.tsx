import { useState } from 'react'
import { Search, Calendar, User, AlertTriangle, CheckCircle, Clock, Play, MapPin, Wrench } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Badge, Card, CardContent } from '@/components/ui'

interface WorkOrder {
  id: string
  status: string
  priority: string
  client_name: string
  site_name: string
  technician_name: string
  scheduled_date: string
  description: string
  estimated_hours: number
  created_at: string
}

interface WorkOrderListProps {
  workOrders: WorkOrder[]
  onFiltersChange: (filters: any) => void
  filters: any
}

export function WorkOrderList({ workOrders, onFiltersChange, filters }: WorkOrderListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredWorkOrders = workOrders.filter(workOrder => 
    workOrder.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workOrder.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workOrder.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="info" className="flex items-center">
            <Play className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'scheduled':
        return (
          <Badge variant="warning" className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        )
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <Badge variant="danger">High Priority</Badge>
      case 'medium':
        return <Badge variant="warning">Medium</Badge>
      case 'low':
        return <Badge variant="default">Low</Badge>
      default:
        return <Badge variant="default">{priority}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search work orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority}
              onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Date Range */}
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => onFiltersChange({ ...filters, start_date: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => onFiltersChange({ ...filters, end_date: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Technician Filter */}
            <select
              value={filters.technician_id}
              onChange={(e) => onFiltersChange({ ...filters, technician_id: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Technicians</option>
              {/* This would be populated from a technicians API call */}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Work Orders</p>
                <p className="text-xl font-bold text-gray-900">{workOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-xl font-bold text-gray-900">
                  {workOrders.filter(wo => wo.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Play className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-gray-900">
                  {workOrders.filter(wo => wo.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold text-gray-900">
                  {workOrders.filter(wo => wo.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client/Site</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Est. Hours</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkOrders.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8">
                    <div className="text-gray-500">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No work orders found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkOrders.map((workOrder) => (
                  <TableRow 
                    key={workOrder.id} 
                    onClick={() => window.location.href = `/work-orders/${workOrder.id}`} 
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          {workOrder.client_name}
                        </div>
                        <div className="text-sm text-gray-600">{workOrder.site_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={workOrder.description}>
                        {workOrder.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {workOrder.technician_name}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(workOrder.status)}</TableCell>
                    <TableCell>{getPriorityBadge(workOrder.priority)}</TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(workOrder.scheduled_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-gray-600">{workOrder.estimated_hours}h</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        {workOrder.status !== 'completed' && (
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
