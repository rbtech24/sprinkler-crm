'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { Activity, Building2, CreditCard, Flag, Webhook } from 'lucide-react'

export function ActivityFeedSidebar() {
  const activities = [
    {
      type: 'company_created',
      actor: 'System',
      entity: 'TechFlow Irrigation Inc',
      action: 'Company created',
      timestamp: '5 minutes ago',
      icon: Building2,
      color: 'green'
    },
    {
      type: 'plan_changed',
      actor: 'Support Team',
      entity: 'Green Valley Sprinklers',
      action: 'Upgraded to Pro plan',
      timestamp: '23 minutes ago',
      icon: CreditCard,
      color: 'blue'
    },
    {
      type: 'webhook_added',
      actor: 'Metro Water Services',
      entity: 'https://api.metrowater.com/hooks',
      action: 'Webhook endpoint added',
      timestamp: '1 hour ago',
      icon: Webhook,
      color: 'purple'
    },
    {
      type: 'limit_hit',
      actor: 'Desert Oasis Irrigation',
      entity: 'API Rate Limit',
      action: 'Hit rate limit (1000/hour)',
      timestamp: '2 hours ago',
      icon: Activity,
      color: 'yellow'
    },
    {
      type: 'flag_override',
      actor: 'Engineering Team',
      entity: 'beta_mobile_app',
      action: 'Flag enabled for 5 companies',
      timestamp: '3 hours ago',
      icon: Flag,
      color: 'indigo'
    }
  ]

  const getIconColor = (color: string) => {
    const colorMap = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      indigo: 'bg-indigo-100 text-indigo-600'
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-600'
  }

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-semibold">Activity Feed</h3>
        <Activity className="h-5 w-5 text-gray-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = activity.icon
            return (
              <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <div className={`p-2 rounded-lg ${getIconColor(activity.color)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-blue-600">{activity.actor}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{activity.entity}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )
          })}
          
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md py-2 mt-4">
            View Audit Log
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
