'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { ChevronRight, DollarSign, BarChart3 } from 'lucide-react'
import { usePipelineData } from '@/hooks/useApi'

export function PipelineSnapshot() {
  const { data: pipelineData, isLoading } = usePipelineData()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Pipeline Snapshot</h3>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const pipeline = pipelineData || []
  
  // Transform backend data into display format
  const stages = [
    { 
      name: 'Draft', 
      count: pipeline.find(p => p.status === 'draft')?.count || 0, 
      value: `$${((pipeline.find(p => p.status === 'draft')?.total_value || 0) / 100).toLocaleString()}`, 
      color: 'bg-gray-500' 
    },
    { 
      name: 'Sent', 
      count: pipeline.find(p => p.status === 'sent')?.count || 0, 
      value: `$${((pipeline.find(p => p.status === 'sent')?.total_value || 0) / 100).toLocaleString()}`, 
      color: 'bg-blue-500' 
    },
    { 
      name: 'Approved', 
      count: pipeline.find(p => p.status === 'approved')?.count || 0, 
      value: `$${((pipeline.find(p => p.status === 'approved')?.total_value || 0) / 100).toLocaleString()}`, 
      color: 'bg-green-500' 
    },
    { 
      name: 'Declined', 
      count: pipeline.find(p => p.status === 'declined')?.count || 0, 
      value: `$${((pipeline.find(p => p.status === 'declined')?.total_value || 0) / 100).toLocaleString()}`, 
      color: 'bg-red-500' 
    }
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-semibold">Pipeline Snapshot</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
          Full Pipeline
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </CardHeader>
      <CardContent>
        {stages.every(stage => stage.count === 0) ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pipeline data</h3>
            <p className="text-gray-500">Create estimates to see your sales pipeline.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {stages.map((stage) => (
            <div key={stage.name} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                <span className="text-xs text-gray-500">{stage.count} jobs</span>
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">{stage.name}</h4>
              <div className="flex items-center text-sm font-semibold text-gray-900">
                <DollarSign className="h-3 w-3 mr-1" />
                {stage.value}
              </div>
            </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
