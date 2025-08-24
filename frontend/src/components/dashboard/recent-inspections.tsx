'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { FileText, ExternalLink, Eye, DollarSign, User } from 'lucide-react'
import { useRecentInspections } from '@/hooks/useApi'
import { Inspection } from '@/types/api'

export function RecentInspections() {
  const { data: inspections, isLoading } = useRecentInspections()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Inspections</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-semibold">Recent Inspections</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800">View All</button>
      </CardHeader>
      <CardContent>
        {!inspections || !Array.isArray(inspections) || inspections.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inspections yet</h3>
            <p className="text-gray-500">Create your first inspection to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 font-medium text-gray-600">Client/Site</th>
                  <th className="text-left py-2 font-medium text-gray-600">Tech</th>
                  <th className="text-left py-2 font-medium text-gray-600">Issues</th>
                  <th className="text-left py-2 font-medium text-gray-600">Est.</th>
                  <th className="text-left py-2 font-medium text-gray-600">PDF</th>
                  <th className="text-left py-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(inspections as Inspection[]).map((inspection) => (
                  <tr key={inspection.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 text-gray-900">
                      {new Date(inspection.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="text-gray-900 font-medium">{inspection.client_name}</p>
                        <p className="text-gray-500 text-xs">{inspection.site_name}</p>
                      </div>
                    </td>
                    <td className="py-3 text-gray-700 flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {inspection.tech_name}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inspection.issues_count > 3 ? 'bg-red-100 text-red-800' : 
                        inspection.issues_count > 0 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {inspection.issues_count}
                      </span>
                    </td>
                    <td className="py-3">
                      {inspection.has_estimate ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <button className="text-blue-600 hover:text-blue-800 text-xs">Build</button>
                      )}
                    </td>
                    <td className="py-3">
                      {inspection.pdf_ready ? (
                        <button className="text-blue-600 hover:text-blue-800">
                          <FileText className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex space-x-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <DollarSign className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
