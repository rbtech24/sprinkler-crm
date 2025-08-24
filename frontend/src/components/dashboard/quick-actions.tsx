'use client'

import { Plus, FileText, Wrench, Users, Upload } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      name: 'New Inspection',
      icon: FileText,
      href: '/inspections/new',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'New Estimate',
      icon: FileText,
      href: '/estimates/new',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'New Work Order',
      icon: Wrench,
      href: '/work-orders/new',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      name: 'New Client/Site',
      icon: Users,
      href: '/clients/new',
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      name: 'Import Price Book',
      icon: Upload,
      href: '/price-books/import',
      color: 'bg-gray-600 hover:bg-gray-700'
    }
  ]

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.name}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${action.color}`}
            >
              <Icon className="h-4 w-4" />
              <span>{action.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
