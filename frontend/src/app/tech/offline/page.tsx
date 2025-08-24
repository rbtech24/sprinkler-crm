'use client'

import { Card } from '@/components/ui'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

export default function TechOfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Offline</h1>
          <p className="text-gray-600">
            No internet connection detected. Some features may be limited while offline.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">Offline Features Available:</h3>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• View cached work orders</li>
              <li>• Access saved inspection templates</li>
              <li>• Take photos for later sync</li>
              <li>• Create offline notes</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              Data will sync automatically when connection is restored.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}