'use client'

import { useEffect, useState } from 'react'
import { ApiClient } from '@/lib/api'

interface AdminKPIData {
  activeCompanies: {
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
  }
  mrr: {
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
  }
  activeUsers: {
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
  }
  churnRate: {
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
  }
  weeklyGrowth: {
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
  }
  systemHealth: {
    value: string
    change: string
    trend: 'up' | 'down' | 'neutral'
  }
}

interface PlatformHealthData {
  database: {
    status: string
    totalRecords: number
    responseTime: string
    connections: string
  }
  api: {
    status: string
    requestsPerSecond: number
    errorRate: string
    uptime: string
  }
  storage: {
    status: string
    usage: string
    totalFiles: number
    recentUploads: number
  }
  system: {
    status: string
    cpuUsage: string
    memoryUsage: string
    diskUsage: string
  }
}

interface BillingAnalyticsData {
  overview: {
    totalMRR: number
    activeSeats: number
    seatUtilization: string
    activeCompanies: number
  }
  planUtilization: Array<{
    plan: string
    companies: number
    avgSeats: string
    totalUsers: number
    mrr: number
  }>
  recentSignups: Array<{
    company: string
    plan: string
    userCount: number
    signupDate: string
    estimatedMRR: number
  }>
  pastDueAccounts: Array<any>
  upcomingRenewals: Array<any>
}

interface ActivityFeedItem {
  id: string
  type: string
  message: string
  timestamp: string
  icon: string
  color: string
}

export function useAdminKPIs() {
  const [data, setData] = useState<AdminKPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await ApiClient.get('/admin/dashboard/kpis')
        setData(response)
      } catch (err) {
        setError('Failed to fetch admin KPIs')
        console.error('Admin KPIs fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  return { data, loading, error, refetch: () => {} }
}

export function usePlatformHealth() {
  const [data, setData] = useState<PlatformHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlatformHealth = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await ApiClient.get('/admin/dashboard/health')
        setData(response)
      } catch (err) {
        setError('Failed to fetch platform health')
        console.error('Platform health fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlatformHealth()
  }, [])

  return { data, loading, error }
}

export function useBillingAnalytics() {
  const [data, setData] = useState<BillingAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBillingAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await ApiClient.get('/admin/billing-analytics')
        setData(response)
      } catch (err) {
        setError('Failed to fetch billing analytics')
        console.error('Billing analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingAnalytics()
  }, [])

  return { data, loading, error }
}

export function useActivityFeed() {
  const [data, setData] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivityFeed = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await ApiClient.get('/admin/activity-feed')
        setData(response)
      } catch (err) {
        setError('Failed to fetch activity feed')
        console.error('Activity feed fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivityFeed()
  }, [])

  return { data, loading, error }
}