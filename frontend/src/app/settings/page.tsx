'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui'
import { Button } from '@/components/ui'
import { 
  Building2, 
  Users, 
  Bell, 
  CreditCard, 
  Shield, 
  Smartphone,
  FileText,
  ChevronRight 
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const settingsGroups = [
    {
      title: "Organization",
      items: [
        {
          icon: Building2,
          name: "Company Settings",
          description: "Manage company information, branding, and preferences",
          href: "/settings/company"
        },
        {
          icon: Users,
          name: "Users & Permissions",
          description: "Manage user accounts, roles, and access levels",
          href: "/settings/users"
        }
      ]
    },
    {
      title: "Communication",
      items: [
        {
          icon: Bell,
          name: "Notifications",
          description: "Configure email and push notification preferences",
          href: "/settings/notifications"
        },
        {
          icon: FileText,
          name: "Templates",
          description: "Customize email templates and documents",
          href: "/settings/templates"
        }
      ]
    },
    {
      title: "Business",
      items: [
        {
          icon: CreditCard,
          name: "Billing & Subscription",
          description: "Manage payment methods and subscription details",
          href: "/settings/billing"
        },
        {
          icon: Smartphone,
          name: "Mobile App",
          description: "Configure mobile app settings and features",
          href: "/settings/mobile"
        }
      ]
    },
    {
      title: "Security",
      items: [
        {
          icon: Shield,
          name: "Security & Privacy",
          description: "Manage security settings and data privacy options",
          href: "/settings/security"
        }
      ]
    }
  ]

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>

        {/* Settings Groups */}
        <div className="space-y-8">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-lg font-medium text-gray-900 mb-4">{group.title}</h2>
              
              <div className="space-y-3">
                {group.items.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <item.icon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{item.name}</h3>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}