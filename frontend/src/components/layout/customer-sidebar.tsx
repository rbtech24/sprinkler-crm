'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, 
  X, 
  Home,
  Users,
  MapPin,
  ClipboardList,
  FileText,
  DollarSign,
  Calendar,
  Settings,
  LogOut,
  Building,
  Wrench,
  BarChart3,
  Phone,
  UserCheck,
  MessageSquare,
  CalendarClock,
  CreditCard,
  Bell
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

export function CustomerSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  // Customer/Company Navigation
  const navigation: NavigationSection[] = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: Home }
      ]
    },
    {
      title: 'Clients & Sites',
      items: [
        { name: 'Clients', href: '/clients', icon: Users },
        { name: 'Sites', href: '/sites', icon: MapPin }
      ]
    },
    {
      title: 'Inspections',
      items: [
        { name: 'Inspections', href: '/inspections', icon: ClipboardList },
        { name: 'New Inspection', href: '/inspections/new', icon: FileText }
      ]
    },
    {
      title: 'Work & Estimates',
      items: [
        { name: 'Estimates', href: '/estimates', icon: DollarSign },
        { name: 'Work Orders', href: '/work-orders', icon: Wrench }
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Schedule', href: '/schedule', icon: Calendar },
        { name: 'Technicians', href: '/tech', icon: UserCheck },
        { name: 'Communications', href: '/communications', icon: MessageSquare }
      ]
    },
    {
      title: 'Business',
      items: [
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Payments', href: '/payments', icon: CreditCard }
      ]
    },
    {
      title: 'Settings',
      items: [
        { name: 'Company', href: '/settings/company', icon: Building },
        { name: 'Users', href: '/settings/users', icon: Users },
        { name: 'General', href: '/settings', icon: Settings }
      ]
    }
  ]

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SI</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">SprinklerInspect</span>
              <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
                      'text-gray-700 hover:text-gray-900 hover:bg-gray-100',
                      item.disabled && 'opacity-50 cursor-not-allowed',
                      isCollapsed ? 'justify-center' : 'justify-start'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                    {!isCollapsed && (
                      <>
                        {item.name}
                        {item.count !== undefined && (
                          <span className="ml-auto bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-0.5">
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
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors',
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