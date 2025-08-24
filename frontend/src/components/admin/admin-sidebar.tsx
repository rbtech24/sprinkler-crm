'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, 
  X, 
  BarChart3,
  Users,
  Building,
  DollarSign,
  Settings,
  LogOut,
  Activity,
  AlertTriangle,
  Server,
  Webhook,
  CreditCard,
  UserCheck
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

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  // System Admin Navigation
  const navigation: NavigationSection[] = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Overview', href: '/admin', icon: BarChart3 }
      ]
    },
    {
      title: 'Platform Management',
      items: [
        { name: 'Companies', href: '/admin/companies', icon: Building },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'System Health', href: '/admin/health', icon: Server }
      ]
    },
    {
      title: 'Billing & Revenue',
      items: [
        { name: 'Billing Overview', href: '/admin/billing', icon: DollarSign },
        { name: 'Past Due Accounts', href: '/admin/billing/past-due', icon: AlertTriangle },
        { name: 'Payment Methods', href: '/admin/billing/payments', icon: CreditCard }
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Platform Activity', href: '/admin/activity', icon: Activity },
        { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
        { name: 'Support', href: '/admin/support', icon: UserCheck }
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Settings', href: '/admin/settings', icon: Settings }
      ]
    }
  ]

  return (
    <div className={cn(
      'bg-gray-900 text-white flex flex-col h-screen transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            <div>
              <span className="font-semibold text-white">System Admin</span>
              <p className="text-xs text-gray-400">SprinklerInspect</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
                      'text-gray-300 hover:text-white hover:bg-gray-800',
                      item.disabled && 'opacity-50 cursor-not-allowed',
                      isCollapsed ? 'justify-center' : 'justify-start'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                    {!isCollapsed && (
                      <>
                        {item.name}
                        {item.count !== undefined && (
                          <span className="ml-auto bg-gray-700 text-gray-300 text-xs rounded-full px-2 py-0.5">
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
      <div className="border-t border-gray-700 p-4">
        {!isCollapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:text-white hover:bg-gray-800 transition-colors',
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