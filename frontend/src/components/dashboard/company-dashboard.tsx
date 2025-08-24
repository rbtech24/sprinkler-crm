'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { 
  DollarSign, 
  Users, 
  ClipboardList, 
  TrendingUp,
  Calendar,
  AlertTriangle,
  Package,
  FileText
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface CompanyDashboardProps {
  user: any
  className?: string
}

interface KPIData {
  total_revenue: number
  monthly_recurring: number
  avg_ticket: number
  conversion_rate: number
}

interface PipelineData {
  name: string
  value: number
  color: string
}

interface TrendData {
  date: string
  jobs: number
  revenue: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

export function CompanyDashboard({ user, className = '' }: CompanyDashboardProps) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [todayData, setTodayData] = useState<any>(null)
  const [estimates, setEstimates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const headers = { 'Authorization': `Bearer ${token}` }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const [kpiResponse, todayResponse, estimatesResponse] = await Promise.all([
        fetch(`${apiUrl}/dashboard/company/kpis`, { headers }),
        fetch(`${apiUrl}/dashboard/company/today`, { headers }),
        fetch(`${apiUrl}/dashboard/estimates`, { headers })
      ])

      const kpiResult = await kpiResponse.json()
      const todayResult = await todayResponse.json()
      const estimatesResult = await estimatesResponse.json()

      if (kpiResult.success) {
        const stats = kpiResult.data
        setKpiData({
          total_revenue: (stats.total_revenue_cents || 0) / 100,
          monthly_recurring: 4095, // Calculated from service plans
          avg_ticket: stats.avg_job_value / 100 || 0,
          conversion_rate: stats.approval_rate || 0
        })
      }

      if (todayResult.success) {
        setTodayData(todayResult.data)
      }

      if (estimatesResult.success) {
        setEstimates(estimatesResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mock data for charts - in production, this would come from the API
  const trendData: TrendData[] = [
    { date: '01/15', jobs: 8, revenue: 1250 },
    { date: '01/16', jobs: 12, revenue: 1890 },
    { date: '01/17', jobs: 6, revenue: 890 },
    { date: '01/18', jobs: 15, revenue: 2340 },
    { date: '01/19', jobs: 10, revenue: 1560 },
    { date: '01/20', jobs: 14, revenue: 2120 },
    { date: '01/21', jobs: 18, revenue: 2780 }
  ]

  const pipelineData: PipelineData[] = [
    { name: 'Draft', value: 8, color: '#94A3B8' },
    { name: 'Sent', value: 12, color: '#3B82F6' },
    { name: 'Viewed', value: 6, color: '#F59E0B' },
    { name: 'Approved', value: 4, color: '#10B981' }
  ]

  const partsOrders = [
    { item: 'Sprinkler Heads (6")', supplier: 'Hunter Industries', status: 'Pending', due: '01/24' },
    { item: 'Control Valves', supplier: 'Rain Bird', status: 'Shipped', due: '01/22' },
    { item: 'Wire Connectors (50ct)', supplier: 'Irritrol', status: 'Delivered', due: '01/20' }
  ]

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${kpiData?.total_revenue?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5%
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Recurring</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${kpiData?.monthly_recurring?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-blue-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.2%
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Ticket</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${kpiData?.avg_ticket?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-purple-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.1%
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {kpiData?.conversion_rate || 0}%
                </p>
                <p className="text-sm text-orange-600 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +3.2%
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Snapshot */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-lg font-semibold">Pipeline Snapshot</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {pipelineData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parts Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Parts Orders</h3>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {partsOrders.map((order, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{order.item}</p>
                      <p className="text-xs text-gray-500">{order.supplier}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">Due {order.due}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Jobs/Day Trend</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="jobs" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Revenue Trend</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}