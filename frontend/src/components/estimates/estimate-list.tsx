import { useState } from 'react'
import { Search, DollarSign, Calendar, User, FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Badge, Card, CardContent } from '@/components/ui'

interface Estimate {
  id: string
  status: string
  total_cents: number
  currency: string
  client_name: string
  site_name: string
  created_at: string
  line_item_count: number
}

interface EstimateListProps {
  estimates: Estimate[]
  onFiltersChange: (filters: any) => void
  filters: any
}

export function EstimateList({ estimates, onFiltersChange, filters }: EstimateListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEstimates = estimates.filter(estimate => 
    estimate.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.site_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return (
          <Badge variant="success" className="flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="danger" className="flex items-center">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const formatCurrency = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100)
  }

  const totalValue = filteredEstimates.reduce((sum, est) => sum + est.total_cents, 0)
  const approvedValue = filteredEstimates
    .filter(est => est.status.toLowerCase() === 'approved')
    .reduce((sum, est) => sum + est.total_cents, 0)

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
                placeholder="Search estimates..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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

            {/* Client Filter */}
            <select
              value={filters.client_id}
              onChange={(e) => onFiltersChange({ ...filters, client_id: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Clients</option>
              {/* This would be populated from a clients API call */}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Estimates</p>
                <p className="text-xl font-bold text-gray-900">{estimates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalValue)}
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
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-xl font-bold text-gray-900">
                  {estimates.filter(e => e.status.toLowerCase() === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Approved Value</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(approvedValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEstimates.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8">
                    <div className="text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No estimates found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEstimates.map((estimate) => (
                  <TableRow 
                    key={estimate.id} 
                    onClick={() => window.location.href = `/estimates/${estimate.id}`} 
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">{estimate.client_name}</TableCell>
                    <TableCell className="text-gray-600">{estimate.site_name}</TableCell>
                    <TableCell>{getStatusBadge(estimate.status)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(estimate.total_cents, estimate.currency)}
                    </TableCell>
                    <TableCell className="text-gray-600">{estimate.line_item_count} items</TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(estimate.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        {estimate.status.toLowerCase() === 'pending' && (
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
