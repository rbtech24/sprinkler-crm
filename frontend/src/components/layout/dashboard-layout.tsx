import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { TopBar } from './topbar'

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar title={title} />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
