'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { BarChart3, Flag, ToggleLeft, ToggleRight } from 'lucide-react'

export function AdoptionFeaturesSection() {
  const moduleAdoption = [
    { module: 'Inspections', starter: 85, pro: 92, enterprise: 98 },
    { module: 'Estimates', starter: 45, pro: 78, enterprise: 95 },
    { module: 'Work Orders', starter: 25, pro: 65, enterprise: 88 },
    { module: 'Inventory', starter: 12, pro: 34, enterprise: 72 },
    { module: 'Invoicing', starter: 8, pro: 45, enterprise: 85 },
    { module: 'Portal', starter: 5, pro: 23, enterprise: 67 }
  ]

  const flagOverrides = [
    {
      company: 'Green Valley Sprinklers',
      flag: 'new_pdf_engine',
      value: true,
      updatedBy: 'Support Team',
      updatedAt: '2 hours ago',
      id: 1
    },
    {
      company: 'Desert Oasis Irrigation',
      flag: 'advanced_scheduling',
      value: false,
      updatedBy: 'Product Team',
      updatedAt: '1 day ago',
      id: 2
    },
    {
      company: 'Metro Water Services',
      flag: 'beta_mobile_app',
      value: true,
      updatedBy: 'Engineering',
      updatedAt: '3 days ago',
      id: 3
    }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Module Adoption */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Module Adoption by Plan</h3>
          <BarChart3 className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {moduleAdoption.map((module, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{module.module}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Starter</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${module.starter}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-8">{module.starter}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Pro</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${module.pro}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-8">{module.pro}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Enterprise</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${module.enterprise}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 w-8">{module.enterprise}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Flag Overrides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Feature Flag Overrides</h3>
          <Flag className="h-5 w-5 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {flagOverrides.map((override) => (
              <div key={override.id} className="p-3 bg-gray-50 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{override.company}</p>
                    <p className="text-xs text-gray-600 font-mono">{override.flag}</p>
                  </div>
                  <button className="flex items-center">
                    {override.value ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {override.updatedBy} • {override.updatedAt}
                  </span>
                  <div className="flex space-x-2">
                    <button className="text-xs text-blue-600 hover:text-blue-800">
                      Edit
                    </button>
                    <button className="text-xs text-red-600 hover:text-red-800">
                      Revert
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md py-2">
              Bulk Edit Flags
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
