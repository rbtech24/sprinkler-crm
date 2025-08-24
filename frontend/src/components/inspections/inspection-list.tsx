import { useState } from 'react'
import { Search, Filter, Calendar, User, MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Badge, Card, CardContent } from '@/components/ui'

interface Inspection {
  id: string
  started_at: string
  submitted_at: string | null
  site_name: string
  client_name: string
  tech_name: string
  template_name: string
  total_items: number
  critical_issues: number
}

interface InspectionListProps {
  inspections: Inspection[]
  onFiltersChange: (filters: any) => void
  filters: any
}

export function InspectionList({ inspections, onFiltersChange, filters }: InspectionListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredInspections = inspections.filter(inspection => 
    inspection.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspection.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspection.tech_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (inspection: Inspection) => {
    if (inspection.submitted_at) {
      return (
        <Badge variant="success" className="flex items-center">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    } else {
      return (
        <Badge variant="warning" className="flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    }
  }

  const getIssuesBadge = (criticalIssues: number) => {
    if (criticalIssues === 0) {
      return <Badge variant="success">No Issues</Badge>
    } else if (criticalIssues <= 2) {
      return <Badge variant="warning">{criticalIssues} Issues</Badge>
    } else {
      return <Badge variant="destructive">{criticalIssues} Critical</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inspections..."
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
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
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
              value={filters.tech_id}
              onChange={(e) => onFiltersChange({ ...filters, tech_id: e.target.value })}
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
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Inspections</p>
                <p className="text-xl font-bold text-gray-900">{inspections.length}</p>
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
                  {inspections.filter(i => i.submitted_at).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-gray-900">
                  {inspections.filter(i => !i.submitted_at).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-xl font-bold text-gray-900">
                  {inspections.reduce((sum, i) => sum + i.critical_issues, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No inspections found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInspections.map((inspection) => (
                  <TableRow key={inspection.id} onClick={() => window.location.href = `/inspections/${inspection.id}`} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium">{inspection.site_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{inspection.client_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {inspection.tech_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{inspection.template_name}</TableCell>
                    <TableCell>{getStatusBadge(inspection)}</TableCell>
                    <TableCell>{getIssuesBadge(inspection.critical_issues)}</TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(inspection.started_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
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
