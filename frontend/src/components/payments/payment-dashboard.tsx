'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { 
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Plus,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react'

interface PaymentTransaction {
  id: number
  client_name: string
  amount_cents: number
  status: string
  payment_method_type: string
  last_four: string
  brand: string
  created_at: string
  invoice_number?: string
}

interface PaymentAnalytics {
  total_transactions: number
  total_revenue_cents: number
  successful_payments: number
  failed_payments: number
  avg_payment_cents: number
}

export function PaymentDashboard() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchPaymentData()
  }, [])

  const fetchPaymentData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch payment analytics
      const analyticsRes = await fetch('/api/payments/analytics?period=30', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData.summary)
      }

      // Fetch recent transactions
      const transactionsRes = await fetch('/api/payments/history?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setTransactions(transactionsData.transactions)
      }

      // Fetch invoices
      const invoicesRes = await fetch('/api/payments/invoices?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.invoices)
      }

    } catch (error) {
      console.error('Error fetching payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAutoBilling = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/payments/auto-bill', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Auto-billing completed: ${result.processed} subscriptions processed`)
        fetchPaymentData() // Refresh data
      } else {
        alert('Auto-billing failed')
      }
    } catch (error) {
      console.error('Auto-billing error:', error)
      alert('Auto-billing error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
          <p className="text-gray-600">Process payments, manage invoices, and track revenue</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={runAutoBilling}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Run Auto-Billing
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'transactions', name: 'Transactions' },
            { id: 'invoices', name: 'Invoices' },
            { id: 'methods', name: 'Payment Methods' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-4">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue (30d)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics?.total_revenue_cents || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-4">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Successful Payments</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.successful_payments || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg mr-4">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Payment</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics?.avg_payment_cents || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg mr-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failed Payments</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.failed_payments || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Recent Transactions</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg mr-3">
                          <CreditCard className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.client_name}</p>
                          <p className="text-sm text-gray-600">
                            {transaction.payment_method_type} •••• {transaction.last_four}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(transaction.amount_cents)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Invoices */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Outstanding Invoices</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.filter((inv: any) => inv.status !== 'paid').slice(0, 5).map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                          <FileText className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-600">{invoice.client_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(invoice.total_cents)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment Transactions</h3>
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.client_name}
                            </div>
                            {transaction.invoice_number && (
                              <div className="text-sm text-gray-500">
                                {transaction.invoice_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.amount_cents)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.payment_method_type} •••• {transaction.last_four}
                        {transaction.brand && ` (${transaction.brand})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Invoices</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice: any) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.total_cents)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          View
                        </button>
                        {invoice.status !== 'paid' && (
                          <button className="text-green-600 hover:text-green-900">
                            Collect Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Payment Methods</h3>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Payment method management coming soon</p>
              <p className="text-sm">Integrate with Stripe Elements for secure card collection</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}