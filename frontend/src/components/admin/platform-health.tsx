'use client'

import { Card, CardContent, CardHeader } from '@/components/ui'
import { Activity, AlertCircle, Zap, TrendingUp, BarChart3 } from 'lucide-react'

export function PlatformHealthSection() {
  const apiMetrics = {
    latency: '142ms',
    errorRate: '0.03%',
    p95: '320ms',
    p99: '890ms'
  }

  const backgroundJobs = [
    { type: 'PDF Renders', queued: 45, running: 12, failed: 3, total: 230 },
    { type: 'Email Send', queued: 23, running: 8, failed: 1, total: 156 },
    { type: 'Image Processing', queued: 12, running: 4, failed: 0, total: 87 }
  ]

  const deliverability = {
    email: { success: 98.7, bounced: 1.2, blocked: 0.1 },
    sms: { success: 99.2, failed: 0.8 }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Service Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Service Status</h3>
          <Activity className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">API Latency</p>
                <p className="text-lg font-bold text-green-900">{apiMetrics.latency}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Error Rate</p>
                <p className="text-lg font-bold text-blue-900">{apiMetrics.errorRate}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">95th Percentile</p>
                <p className="text-lg font-bold text-purple-900">{apiMetrics.p95}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-yellow-600 font-medium">99th Percentile</p>
                <p className="text-lg font-bold text-yellow-900">{apiMetrics.p99}</p>
              </div>
            </div>
            <div className="h-20 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">API Response Time Chart</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Background Jobs</h3>
          <Zap className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backgroundJobs.map((job, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{job.type}</span>
                  <span className="text-xs text-gray-500">Total: {job.total}</span>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                    <span>Queued: {job.queued}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    <span>Running: {job.running}</span>
                  </div>
                  {job.failed > 0 && (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                      <span>Failed: {job.failed}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deliverability */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-lg font-semibold">Deliverability</h3>
          <BarChart3 className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">Email</span>
                <span className="text-lg font-bold text-green-900">{deliverability.email.success}%</span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <p>Bounced: {deliverability.email.bounced}%</p>
                <p>Blocked: {deliverability.email.blocked}%</p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">SMS</span>
                <span className="text-lg font-bold text-blue-900">{deliverability.sms.success}%</span>
              </div>
              <div className="text-xs text-blue-700">
                <p>Failed: {deliverability.sms.failed}%</p>
              </div>
            </div>

            <button className="w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md py-2">
              View Message Logs
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
