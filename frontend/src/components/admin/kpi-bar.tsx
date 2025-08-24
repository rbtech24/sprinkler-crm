'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { TrendingUp, TrendingDown, Building2, DollarSign, Users, AlertTriangle, Calendar, Activity } from 'lucide-react'
import { useAdminKPIs } from '@/hooks/useAdminData'

interface AdminKPIItem {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}

export function AdminKPIBar() {
  const { data: kpiData, loading, error } = useAdminKPIs()
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !kpiData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card className="col-span-full">
          <CardContent className="p-4 text-center text-red-600">
            Failed to load KPI data. Please try again later.
          </CardContent>
        </Card>
      </div>
    )
  }

  const kpis: AdminKPIItem[] = [
    {
      title: 'Active Companies',
      value: kpiData.activeCompanies.value,
      change: kpiData.activeCompanies.change,
      trend: kpiData.activeCompanies.trend,
      icon: Building2,
      color: 'purple'
    },
    {
      title: 'MRR',
      value: kpiData.mrr.value,
      change: kpiData.mrr.change,
      trend: kpiData.mrr.trend,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Active Users',
      value: kpiData.activeUsers.value,
      change: kpiData.activeUsers.change,
      trend: kpiData.activeUsers.trend,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Churn Rate',
      value: kpiData.churnRate.value,
      change: kpiData.churnRate.change,
      trend: kpiData.churnRate.trend,
      icon: TrendingDown,
      color: 'red'
    },
    {
      title: 'Weekly Growth',
      value: kpiData.weeklyGrowth.value,
      change: kpiData.weeklyGrowth.change,
      trend: kpiData.weeklyGrowth.trend,
      icon: Calendar,
      color: 'indigo'
    },
    {
      title: 'System Health',
      value: kpiData.systemHealth.value,
      change: kpiData.systemHealth.change,
      trend: kpiData.systemHealth.trend,
      icon: Activity,
      color: 'yellow'
    }
  ]

  const getColorClasses = (color: string) => {
    const colorMap = {
      purple: 'bg-purple-50 text-purple-600',
      green: 'bg-green-50 text-green-600',
      blue: 'bg-blue-50 text-blue-600',
      red: 'bg-red-50 text-red-600',
      indigo: 'bg-indigo-50 text-indigo-600',
      yellow: 'bg-yellow-50 text-yellow-600'
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-50 text-gray-600'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <Card key={index} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <div className="flex items-center mt-2">
                    {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
                    {kpi.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
                    <span className={`text-xs ${
                      kpi.trend === 'up' ? 'text-green-600' : 
                      kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${getColorClasses(kpi.color)}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
