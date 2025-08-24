'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { CreditCard, AlertTriangle, Calendar, ExternalLink, Mail, Settings, Users, TrendingUp, Filter } from 'lucide-react'
import { useBillingAnalytics } from '@/hooks/useAdminData'

export function BillingAccountsSection() {
  const { data: billingData, loading, error } = useBillingAnalytics()

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'High': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !billingData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4 text-center text-red-600">
            Failed to load billing data. Please try again later.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Billing Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total MRR</p>
                <p className="text-2xl font-bold text-green-900">${(billingData.overview.totalMRR / 1000).toFixed(1)}K</p>
                <p className="text-xs text-green-700">Real-time calculation</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Active Seats</p>
                <p className="text-2xl font-bold text-blue-900">{billingData.overview.activeSeats.toLocaleString()}</p>
                <p className="text-xs text-blue-700">Across {billingData.overview.activeCompanies} companies</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Past Due</p>
                <p className="text-2xl font-bold text-yellow-900">$0</p>
                <p className="text-xs text-yellow-700">All accounts current</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Seat Utilization</p>
                <p className="text-2xl font-bold text-purple-900">{billingData.overview.seatUtilization}%</p>
                <p className="text-xs text-purple-700">Weekly active users</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Past Due Accounts */}
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Past-Due Accounts</h3>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pastDueAccounts.map((account) => (
              <div key={account.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.company}</p>
                    <p className="text-xs text-gray-600">{account.plan} Plan</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-900">{account.amountDue}</p>
                    <p className="text-xs text-red-600">{account.daysPastDue} days</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Last email: {account.lastEmail}</span>
                  <button className="flex items-center text-xs text-blue-600 hover:text-blue-800">
                    <Mail className="h-3 w-3 mr-1" />
                    Send Pay Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Renewals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Upcoming Renewals (30d)</h3>
          <Calendar className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingRenewals.map((renewal) => (
              <div key={renewal.id} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{renewal.company}</p>
                    <p className="text-xs text-gray-600">{renewal.plan} Plan • {renewal.seats} seats</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadgeColor(renewal.riskScore)}`}>
                    {renewal.riskScore}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(renewal.renewalDate).toLocaleDateString()} • {renewal.csmOwner}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    View Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Utilization */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Plan & Seat Utilization</h3>
          <CreditCard className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {planUtilization.map((plan, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{plan.plan}</span>
                  <span className="text-xs text-gray-500">{plan.companies} companies</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Avg seats: {plan.avgSeats}</span>
                  <span className="text-xs text-gray-600">Max: {plan.maxSeats}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(plan.avgSeats / plan.maxSeats) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md py-2">
              Adjust Seat Caps
            </button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Company Management Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-lg font-semibold">Bulk Account Actions</h3>
            <Settings className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-center">
                  <Mail className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Send Payment<br />Reminders</span>
                </div>
              </button>
              <button className="flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Adjust Seat<br />Limits</span>
                </div>
              </button>
              <button className="flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
                <div className="text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Plan Usage<br />Analytics</span>
                </div>
              </button>
              <button className="flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-colors">
                <div className="text-center">
                  <Filter className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Export Billing<br />Reports</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-lg font-semibold">Revenue Insights</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-900">Q4 Growth Rate</span>
                <span className="text-lg font-bold text-green-900">+23.7%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-900">Avg Deal Size</span>
                <span className="text-lg font-bold text-blue-900">$2,847</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-purple-900">Customer LTV</span>
                <span className="text-lg font-bold text-purple-900">$18,432</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm text-yellow-900">Churn Prevention</span>
                <span className="text-lg font-bold text-yellow-900">$47K saved</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
