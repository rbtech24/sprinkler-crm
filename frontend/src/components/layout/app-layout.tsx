import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '@/store/auth'
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Users, 
  ClipboardList, 
  FileText, 
  Settings, 
  LogOut,
  Building,
  UserCircle,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
  title?: string
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  current?: boolean
  roles?: string[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['owner', 'admin', 'dispatcher', 'tech', 'viewer'] },
  { name: 'Schedule', href: '/schedule', icon: Calendar, roles: ['owner', 'admin', 'dispatcher', 'tech'] },
  { name: 'Clients', href: '/clients', icon: Users, roles: ['owner', 'admin', 'dispatcher'] },
  { name: 'Inspections', href: '/inspections', icon: ClipboardList, roles: ['owner', 'admin', 'dispatcher', 'tech'] },
  { name: 'Estimates', href: '/estimates', icon: FileText, roles: ['owner', 'admin', 'dispatcher'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['owner', 'admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'admin'] },
]

export function AppLayout({ children, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()
  const { user, company, logout } = useAuthStore()

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  ).map(item => ({
    ...item,
    current: router.pathname === item.href
  }))

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 flex z-40 md:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <SidebarContent navigation={filteredNavigation} company={company} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent navigation={filteredNavigation} company={company} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                {title && (
                  <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
                )}
              </div>
              
              {/* User menu */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <UserCircle className="h-8 w-8 text-gray-400" />
                  <span className="ml-2 text-gray-700 hidden sm:block">{user?.name}</span>
                  <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        <div className="font-medium">{user?.name}</div>
                        <div className="text-gray-500">{user?.email}</div>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="inline h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ navigation, company }: { navigation: NavItem[], company: { name?: string } | null }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <Building className="h-8 w-8 text-primary-600" />
          <span className="ml-2 text-xl font-semibold text-gray-900 truncate">
            {company?.name || 'Sprinkler Pro'}
          </span>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  item.current
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
              >
                <Icon
                  className={cn(
                    item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
