'use client'

import { useState } from 'react'
import { Calendar, Users, ClipboardList, DollarSign, Package, Settings, BarChart3, Repeat, CreditCard } from 'lucide-react'

interface TabNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'service-plans', name: 'Service Plans', icon: Repeat },
    { id: 'payments', name: 'Payments', icon: CreditCard },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'clients', name: 'Clients & Sites', icon: Users },
    { id: 'inspections', name: 'Inspections', icon: ClipboardList },
    { id: 'estimates', name: 'Estimates', icon: DollarSign },
    { id: 'work-orders', name: 'Work Orders', icon: Settings },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'reports', name: 'Reports', icon: BarChart3 }
  ]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
