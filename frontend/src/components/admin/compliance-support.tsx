'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { Shield, MessageCircle, Star, Activity } from 'lucide-react'

export function ComplianceSupportSection() {
  const dataRequests = [
    {
      company: 'Green Valley Sprinklers',
      type: 'Export',
      slaDue: '2 days',
      assignee: 'Legal Team',
      status: 'In Progress',
      id: 1
    },
    {
      company: 'City Park District',
      type: 'Delete',
      slaDue: '5 days',
      assignee: 'Data Protection',
      status: 'Pending',
      id: 2
    },
    {
      company: 'Metro Water Services',
      type: 'Export',
      slaDue: '1 day',
      assignee: 'Support Team',
      status: 'Urgent',
      id: 3
    }
  ]

  const tickets = [
    {
      title: 'PDF generation timeout issues',
      category: 'Technical',
      priority: 'High',
      company: 'Desert Oasis Irrigation',
      created: '2 hours ago',
      id: 1
    },
    {
      title: 'Billing discrepancy question',
      category: 'Billing',
      priority: 'Medium',
      company: 'Residential Pros',
      created: '4 hours ago',
      id: 2
    },
    {
      title: 'Feature request: bulk import',
      category: 'Feature Request',
      priority: 'Low',
      company: 'Sunset Landscaping',
      created: '1 day ago',
      id: 3
    }
  ]

  const npsData = {
    score: 8.7,
    trend: '+0.3',
    responses: 156,
    promoters: 68,
    detractors: 8
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Urgent': return 'bg-red-100 text-red-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Data Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Data Requests Queue</h3>
          <Shield className="h-5 w-5 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dataRequests.map((request) => (
              <div key={request.id} className="p-3 bg-gray-50 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{request.company}</p>
                    <p className="text-xs text-gray-600">{request.type} Request</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    SLA: {request.slaDue} • {request.assignee}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tickets & NPS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Support & NPS</h3>
          <MessageCircle className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          {/* NPS Score */}
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">NPS Score (30d)</span>
              <Star className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-green-900">{npsData.score}</span>
              <span className="text-sm text-green-600">({npsData.trend} vs last month)</span>
            </div>
            <div className="text-xs text-green-700 mt-1">
              {npsData.responses} responses • {npsData.promoters}% promoters • {npsData.detractors}% detractors
            </div>
          </div>

          {/* Recent Tickets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Recent Tickets</h4>
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-3 bg-gray-50 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                    <p className="text-xs text-gray-600">{ticket.company}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {ticket.category} • {ticket.created}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    View Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
