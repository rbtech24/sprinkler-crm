'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui'
import { 
  BarChart3,
  Download,
  Save,
  Calendar,
  Filter,
  Database,
  FileText,
  Mail,
  Clock,
  CheckCircle,
  Play
} from 'lucide-react'

interface ReportBuilder {
  name: string
  data_sources: string[]
  metrics: string[]
  filters: Record<string, string>
  grouping: string
  date_range: {
    start_date: string
    end_date: string
  }
  chart_type: string
}

export function CustomReportBuilder() {
  const [reportConfig, setReportConfig] = useState<ReportBuilder>({
    name: '',
    data_sources: [],
    metrics: [],
    filters: {},
    grouping: 'none',
    date_range: {
      start_date: '',
      end_date: ''
    },
    chart_type: 'table'
  })

  const [reportResult, setReportResult] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedReports, setSavedReports] = useState([
    {
      id: 'monthly_revenue',
      name: 'Monthly Revenue Report',
      description: 'Monthly breakdown of revenue by service type',
      last_run: '2024-12-20',
      data_sources: ['estimates', 'clients']
    },
    {
      id: 'technician_performance',
      name: 'Technician Performance Report', 
      description: 'Inspection completion rates by technician',
      last_run: '2024-12-19',
      data_sources: ['inspections', 'users']
    }
  ])

  const dataSources = [
    { id: 'clients', name: 'Clients', icon: '👥' },
    { id: 'inspections', name: 'Inspections', icon: '📋' },
    { id: 'estimates', name: 'Estimates', icon: '💰' },
    { id: 'work_orders', name: 'Work Orders', icon: '🔧' },
    { id: 'users', name: 'Users/Technicians', icon: '👨‍💼' },
    { id: 'subscriptions', name: 'Service Plans', icon: '🔄' }
  ]

  const chartTypes = [
    { id: 'table', name: 'Data Table', icon: '📊' },
    { id: 'bar', name: 'Bar Chart', icon: '📊' },
    { id: 'line', name: 'Line Chart', icon: '📈' },
    { id: 'pie', name: 'Pie Chart', icon: '🥧' }
  ]

  const groupingOptions = [
    { id: 'none', name: 'No Grouping' },
    { id: 'client', name: 'By Client' },
    { id: 'month', name: 'By Month' },
    { id: 'technician', name: 'By Technician' }
  ]

  const handleDataSourceToggle = (sourceId: string) => {
    setReportConfig(prev => ({
      ...prev,
      data_sources: prev.data_sources.includes(sourceId)
        ? prev.data_sources.filter(id => id !== sourceId)
        : [...prev.data_sources, sourceId]
    }))
  }

  const generateReport = async () => {
    if (reportConfig.data_sources.length === 0) {
      alert('Please select at least one data source')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/reports/custom/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reportConfig)
      })

      if (response.ok) {
        const result = await response.json()
        setReportResult(result)
      } else {
        alert('Failed to generate report')
      }
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Error generating report')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReport = async (format: string) => {
    if (!reportResult) return

    try {
      const response = await fetch(`/api/reports/export/${reportResult.id}?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportResult.name}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting report')
    }
  }

  const runSavedReport = async (reportId: string) => {
    // This would load and run a saved report configuration
    alert(`Running saved report: ${reportId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custom Report Builder</h2>
          <p className="text-gray-600">Create and export custom reports from your data</p>
        </div>
        <div className="flex space-x-3">
          {reportResult && (
            <>
              <button
                onClick={() => exportReport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => exportReport('xlsx')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Name */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Report Configuration
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Name
                </label>
                <input
                  type="text"
                  value={reportConfig.name}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter report name..."
                />
              </div>

              {/* Data Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Sources
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {dataSources.map((source) => (
                    <label key={source.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig.data_sources.includes(source.id)}
                        onChange={() => handleDataSourceToggle(source.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {source.icon} {source.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={reportConfig.date_range.start_date}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      date_range: { ...prev.date_range, start_date: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reportConfig.date_range.end_date}
                    onChange={(e) => setReportConfig(prev => ({
                      ...prev,
                      date_range: { ...prev.date_range, end_date: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Grouping */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group By
                </label>
                <select
                  value={reportConfig.grouping}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, grouping: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {groupingOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chart Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {chartTypes.map((chart) => (
                    <label key={chart.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="chart_type"
                        value={chart.id}
                        checked={reportConfig.chart_type === chart.id}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, chart_type: e.target.value }))}
                        className="text-blue-600"
                      />
                      <span className="text-sm">
                        {chart.icon} {chart.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateReport}
                disabled={isGenerating || reportConfig.data_sources.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Saved Reports */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center">
                <Save className="h-5 w-5 mr-2" />
                Saved Reports
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedReports.map((report) => (
                  <div key={report.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          Last run: {report.last_run}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => runSavedReport(report.id)}
                      className="w-full mt-3 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Run Report
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Reports */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Scheduled Reports
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Monthly Revenue</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Every 1st of month at 8:00 AM
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Next: Jan 1, 2025
                  </div>
                </div>
                
                <button className="w-full px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  + Schedule New Report
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Quick Reports</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button 
                  onClick={() => exportReport('csv')}
                  className="w-full px-3 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded"
                >
                  📊 Revenue Summary (30 days)
                </button>
                <button 
                  onClick={() => exportReport('csv')}
                  className="w-full px-3 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded"
                >
                  👥 Client List Export
                </button>
                <button 
                  onClick={() => exportReport('csv')}
                  className="w-full px-3 py-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded"
                >
                  📋 Inspection Report
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Results */}
      {reportResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Report Results: {reportResult.name}
              </h3>
              <div className="text-sm text-gray-600">
                {reportResult.data.length} records found
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reportResult.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(reportResult.data[0]).map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportResult.data.slice(0, 10).map((row: any, index: number) => (
                      <tr key={index}>
                        {Object.values(row).map((value: any, cellIndex: number) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof value === 'number' && value > 1000 ? 
                              `$${(value / 100).toLocaleString()}` : 
                              String(value || '-')
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportResult.data.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-600">
                    Showing 10 of {reportResult.data.length} records. Export to view all data.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No data found for the selected criteria.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}