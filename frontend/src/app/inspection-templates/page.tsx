'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input } from '@/components/ui'
import { PlusCircle, Search, FileText, Copy, Edit3 } from 'lucide-react'

interface Template {
  id: number
  name: string
  description: string
  sections: number
  items: number
  last_used?: string
  created_at: string
}

export default function InspectionTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Mock data for now
  const mockTemplates: Template[] = [
    {
      id: 1,
      name: "Standard Sprinkler Inspection",
      description: "Comprehensive inspection checklist for residential sprinkler systems",
      sections: 5,
      items: 24,
      last_used: "2024-01-15",
      created_at: "2023-12-01"
    },
    {
      id: 2,
      name: "Commercial System Check", 
      description: "Detailed inspection template for commercial irrigation systems",
      sections: 8,
      items: 35,
      last_used: "2024-01-12",
      created_at: "2023-11-15"
    },
    {
      id: 3,
      name: "Winterization Checklist",
      description: "Pre-winter system shutdown and protection checklist",
      sections: 3,
      items: 15,
      last_used: "2023-11-20",
      created_at: "2023-10-01"
    }
  ]

  const filteredTemplates = mockTemplates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout title="Inspection Templates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inspection Templates</h1>
            <p className="text-gray-600">Create and manage inspection checklists</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            New Template
          </Button>
        </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {template.sections} sections, {template.items} items
                  </span>
                </div>

                {template.last_used && (
                  <div className="text-sm text-gray-500">
                    Last used: {template.last_used}
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  Created: {template.created_at}
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="h-4 w-4 mr-1" />
                  Clone
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No templates match your search criteria.' : 'Create your first inspection template to get started.'}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            New Template
          </Button>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}