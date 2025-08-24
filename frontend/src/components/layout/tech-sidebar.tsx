'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, 
  X, 
  Home,
  ClipboardList,
  Wrench,
  Calendar,
  LogOut,
  MapPin,
  Camera,
  Phone,
  FileText,
  Settings,
  Clock,
  Tool,
  CheckSquare,
  Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  disabled?: boolean
}

interface NavigationSection {
  title?: string
  items: NavigationItem[]
}

export function TechSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  // Technician Navigation
  const navigation: NavigationSection[] = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Field Dashboard', href: '/tech', icon: Home }
      ]
    },
    {
      title: 'Daily Work',
      items: [
        { name: 'Today\'s Schedule', href: '/tech/schedule', icon: Calendar },
        { name: 'Active Jobs', href: '/tech/jobs', icon: Wrench },
        { name: 'Inspections', href: '/tech/inspections', icon: ClipboardList }
      ]
    },
    {
      title: 'Field Tools',
      items: [
        { name: 'New Inspection', href: '/tech/inspection/new', icon: CheckSquare },
        { name: 'Photo Capture', href: '/tech/photos', icon: Camera },
        { name: 'Navigation', href: '/tech/navigation', icon: Navigation },
        { name: 'Time Tracking', href: '/tech/time', icon: Clock }
      ]
    },
    {
      title: 'Resources',
      items: [
        { name: 'Equipment List', href: '/tech/equipment', icon: Tool },
        { name: 'Reports', href: '/tech/reports', icon: FileText },
        { name: 'Contact Dispatch', href: '/tech/contact', icon: Phone }
      ]
    },
    {
      title: 'Settings',
      items: [
        { name: 'Offline Mode', href: '/tech/offline', icon: Settings }
      ]
    }
  ]

  return (
    <div className={cn(
      'bg-blue-900 text-white flex flex-col h-screen transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-blue-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SI</span>
            </div>
            <div>
              <span className="font-semibold text-white">Field Tech</span>
              <p className="text-xs text-blue-300">SprinklerInspect</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-blue-800 transition-colors"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Status Indicator */}
      {!isCollapsed && (
        <div className="px-4 py-3 bg-blue-800 border-b border-blue-700">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-blue-200">Online • GPS Active</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !isCollapsed && (
              <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group',
                      'text-blue-200 hover:text-white hover:bg-blue-800',
                      item.disabled && 'opacity-50 cursor-not-allowed',
                      isCollapsed ? 'justify-center' : 'justify-start'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                    {!isCollapsed && (
                      <>
                        {item.name}
                        {item.count !== undefined && (
                          <span className="ml-auto bg-blue-700 text-blue-200 text-xs rounded-full px-2 py-0.5">
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-blue-700 p-4">
        {!isCollapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-blue-300">{user.email}</p>
            <p className="text-xs text-blue-300 capitalize">Field Technician</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center w-full px-3 py-2 text-sm font-medium text-blue-200 rounded-md hover:text-white hover:bg-blue-800 transition-colors',
            isCollapsed ? 'justify-center' : 'justify-start'
          )}
        >
          <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
          {!isCollapsed && 'Sign out'}
        </button>
      </div>
    </div>
  )
}