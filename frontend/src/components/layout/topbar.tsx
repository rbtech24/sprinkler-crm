import { Bell, Search, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth'

interface TopBarProps {
  title?: string
}

export function TopBar({ title }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { user } = useAuthStore()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title */}
        <div>
          {title && (
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Right side - Search, Notifications, Profile */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-gray-600 relative"
            >
              <Bell className="h-5 w-5" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="p-3 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-900">New inspection scheduled</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                  <div className="p-3 hover:bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-900">Estimate approved by client</p>
                    <p className="text-xs text-gray-500">1 hour ago</p>
                  </div>
                  <div className="p-3 hover:bg-gray-50">
                    <p className="text-sm text-gray-900">New client registration</p>
                    <p className="text-xs text-gray-500">3 hours ago</p>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200">
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Profile dropdown */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                    Preferences
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                    Help & Support
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
