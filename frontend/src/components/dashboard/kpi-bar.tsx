'use client'

import { Card, CardContent } from '@/components/ui'
import { TrendingUp, TrendingDown, Calendar, DollarSign, Droplets, Clock } from 'lucide-react'
import { DashboardStats } from '@/types/api'

interface KPIItem {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
}

interface KPIBarProps {
  stats: Partial<DashboardStats>
  isLoading?: boolean
}

export function KPIBar({ stats, isLoading }: KPIBarProps) {

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const kpis: KPIItem[] = [
    {
      title: 'Total Clients',
      value: (stats?.total_clients || 0).toString(),
      change: `${stats?.total_sites || 0} sites`,
      trend: stats?.total_clients > 0 ? 'up' : 'neutral',
      icon: Calendar
    },
    {
      title: 'Open Estimates Value',
      value: `$${((stats?.total_approved_value || 0) / 100).toLocaleString()}`,
      change: `${stats?.approval_rate || 0}% approval rate`,
      trend: (stats?.approval_rate || 0) > 70 ? 'up' : 'neutral',
      icon: DollarSign
    },
    {
      title: 'Work Orders In Progress',
      value: (stats?.in_progress_work_orders || 0).toString(),
      change: `${stats?.scheduled_work_orders || 0} scheduled`,
      trend: stats?.in_progress_work_orders > 0 ? 'up' : 'neutral',
      icon: Clock
    },
    {
      title: 'Inspections (30d)',
      value: (stats?.inspections_last_30_days || 0).toString(),
      change: 'Last 30 days',
      trend: stats?.inspections_last_30_days > 0 ? 'up' : 'neutral',
      icon: Droplets
    },
    {
      title: 'Avg Job Value',
      value: `$${((stats?.avg_job_value || 0) / 100).toLocaleString()}`,
      change: `${stats?.approval_rate || 0}% win rate`,
      trend: (stats?.avg_job_value || 0) > 40000 ? 'up' : 'neutral',
      icon: TrendingUp
    },
    {
      title: 'Total Revenue',
      value: `$${((stats?.total_revenue_cents || 0) / 100).toLocaleString()}`,
      change: 'All time',
      trend: stats?.total_revenue_cents > 0 ? 'up' : 'neutral',
      icon: DollarSign
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <div className="flex items-center mt-1">
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
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
