'use client'

import { useState } from 'react'
import { Search, AlertTriangle, Building2, CreditCard, MessageSquare, Settings } from 'lucide-react'

export function SystemAdminHeader() {
  const [environment, setEnvironment] = useState('production')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SA</span>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">System Admin</h1>
                <p className="text-xs text-gray-500">SaaS Back Office</p>
              </div>
            </div>

            {/* Environment Switch */}
            <div className="hidden md:flex items-center space-x-2">
              <select 
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
              
              {/* Incident Badge */}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Center - Universal Search */}
          <div className="flex-1 max-w-lg mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies, users, invoices, jobs, webhooks..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Right side - Quick Actions */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <div className="hidden lg:flex space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700">
                <Building2 className="h-4 w-4" />
                <span>Create Company</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                <CreditCard className="h-4 w-4" />
                <span>Credit/Comp Plan</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <MessageSquare className="h-4 w-4" />
                <span>Broadcast Message</span>
              </button>
            </div>

            {/* Impersonate Action */}
            <button className="p-2 text-gray-400 hover:text-gray-600" title="Impersonate Company">
              <Settings className="h-5 w-5" />
            </button>

            {/* Admin Menu */}
            <div className="flex items-center">
              <button className="flex items-center space-x-2 text-sm">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">SA</span>
                </div>
                <span className="hidden md:block text-gray-700">System Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
