'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { ChevronDown, Bell, Search, Calendar, Settings } from 'lucide-react'

export function DashboardHeader() {
  const { user, company } = useAuthStore()
  const [dateRange, setDateRange] = useState('last30d')

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Company Logo/Name */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {company?.name?.charAt(0) || 'C'}
                </span>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">{company?.name}</h1>
                <p className="text-xs text-gray-500 capitalize">{company?.plan} Plan</p>
              </div>
            </div>

            {/* Company Switcher (for multi-branch) */}
            <div className="hidden md:block">
              <button className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                <span>Main Branch</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
            </div>

            {/* Date Range Picker */}
            <div className="hidden lg:block">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="last7d">Last 7 days</option>
                <option value="last30d">Last 30 days</option>
                <option value="last90d">Last 90 days</option>
                <option value="ytd">Year to date</option>
              </select>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients, sites, jobs..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>

            {/* Quick Actions */}
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Calendar className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Settings className="h-5 w-5" />
            </button>

            {/* System Admin Link (for system admins) */}
            <a 
              href="/admin" 
              className="hidden lg:block p-2 text-gray-400 hover:text-purple-600 transition-colors"
              title="System Admin Dashboard"
            >
              <div className="w-5 h-5 bg-purple-600 rounded text-white text-xs flex items-center justify-center font-bold">
                SA
              </div>
            </a>

            {/* User Menu */}
            <div className="flex items-center">
              <button className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-gray-700">{user?.name}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
