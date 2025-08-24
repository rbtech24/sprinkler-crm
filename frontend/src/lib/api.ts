import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'react-hot-toast'
import type { 
  User, 
  Client, 
  Site, 
  Inspection, 
  Estimate, 
  WorkOrder,
  DashboardStats,
  LoginRequest, 
  RegisterRequest,
  CreateClientRequest,
  UpdateClientRequest
} from '@/types/api'

// Additional type definitions for JSON fields
type AddressJson = Record<string, unknown>
type SchemaJson = Record<string, unknown>
type CalloutsJson = Record<string, unknown>
type MetadataJson = Record<string, unknown>
type ProgramSettingsJson = Record<string, unknown>
type SummaryJson = Record<string, unknown>

// Types
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ApiError {
  message: string
  errors?: Array<{
    field: string
    message: string
  }>
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token')
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for enhanced error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} (${response.status})`)
        }
        return response
      },
      (error) => {
        // Enhanced error logging
        const timestamp = new Date().toISOString()
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
        const url = error.config?.url || 'UNKNOWN'
        const status = error.response?.status || 'NO_RESPONSE'
        const message = error.response?.data?.error || error.message || 'Unknown error'
        const code = error.response?.data?.code || error.code || 'UNKNOWN_ERROR'

        console.error(`[${timestamp}] API Error:`, {
          method: method || 'UNKNOWN',
          url: url || 'UNKNOWN',
          status: status || 'NO_RESPONSE',
          message: message || 'Unknown error',
          code: code || 'UNKNOWN_ERROR',
          response: error.response?.data || null,
          fullError: error.message || 'No error message',
          config: error.config || null,
          request: error.request ? 'Request made' : 'No request',
          errorType: error.constructor.name
        })

        // Handle different types of errors with user-friendly messages
        if (error.response?.status === 401) {
          console.log('🔒 Unauthorized - clearing auth and redirecting to login')
          toast.error('Session expired. Please log in again.')
          
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
            // Use Next.js router if available, otherwise fallback to window.location
            window.location.href = '/auth/login'
          }
        } else if (error.response?.status === 403) {
          toast.error('Access denied. You do not have permission to perform this action.')
        } else if (error.response?.status === 404) {
          toast.error('Requested resource not found.')
        } else if (error.response?.status === 429) {
          toast.error('Too many requests. Please wait a moment and try again.')
        } else if (error.response?.status >= 500) {
          const serverMessage = error.response?.data?.message || 'Server error occurred'
          toast.error(`Server error: ${serverMessage}. Please try again later.`)
        } else if (error.response?.status >= 400) {
          // Client errors (400-499)
          const clientMessage = error.response?.data?.error || error.response?.data?.message || 'Request failed'
          toast.error(clientMessage)
        } else if (error.code === 'ECONNREFUSED') {
          toast.error('Unable to connect to server. Please check your connection.')
        } else if (error.code === 'NETWORK_ERROR') {
          toast.error('Network error. Please check your internet connection.')
        } else {
          // Generic fallback error
          toast.error('An unexpected error occurred. Please try again.')
        }

        return Promise.reject(error)
      }
    )
  }

  // Generic methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  // Auth methods
  async login(email: string, password: string) {
    console.log('🔐 Attempting login with:', {
      email,
      baseURL: this.client.defaults.baseURL,
      url: '/auth/login'
    })
    
    try {
      const response = await this.post<{
        token: string
        user: {
          id: string
          email: string
          name: string
          role: string
        }
        company: {
          id: string
          name: string
          plan: string
        }
      }>('/auth/login', { email, password })
      
      console.log('✅ Login successful:', response)
      return response
    } catch (error) {
      console.log('❌ Login failed:', error)
      throw error
    }
  }

  async register(data: {
    companyName: string
    adminEmail: string
    adminPassword: string
    adminName: string
    plan?: string
  }) {
    return this.post<{
      token: string
      user: {
        id: string
        email: string
        name: string
        role: string
      }
      company: {
        id: string
        name: string
        plan: string
      }
    }>('/auth/register', data)
  }

  async getSubscriptionStatus() {
    return this.get<{
      subscription: {
        plan: 'inspection_only' | 'full_crm'
        status: 'trial' | 'active' | 'expired' | 'cancelled'
        isLocked: boolean
        lockReason?: string | null
        nextBillingDate?: string | null
      }
      trial?: {
        isActive: boolean
        daysRemaining: number
        endDate: string
        startDate?: string | null
      }
      features: string[]
      planDisplayName: string
    }>('/auth/subscription')
  }

  // Company methods
  async getCompany() {
    return this.get<{
      id: string
      name: string
      email: string
      phone: string
      website: string
      address_json: AddressJson
      plan: string
      logo_url: string
    }>('/company')
  }

  async updateCompany(data: Partial<{
    name: string
    email: string
    phone: string
    website: string
    address: any
  }>) {
    return this.patch('/company', data)
  }

  async getCompanyStats() {
    return this.get<{
      stats: {
        active_users: number
        total_clients: number
        total_sites: number
        total_inspections: number
        inspections_last_30_days: number
        total_estimates: number
        approved_estimates: number
        total_approved_value: number
      }
      recent_activity: Array<{
        type: string
        id: string
        created_at: string
        site_name: string
        client_name: string
        tech_name?: string
      }>
    }>('/company/stats')
  }

  // Client methods
  async getClients(params?: {
    page?: number
    limit?: number
    search?: string
    type?: 'residential' | 'commercial'
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.get<ApiResponse<Array<{
      id: string
      name: string
      contact_type: string
      billing_email: string
      phone: string
      site_count: number
      last_inspection: string
    }>>>(`/clients${queryString}`)
  }

  async createClient(data: {
    name: string
    contact_type: 'residential' | 'commercial'
    billing_email?: string
    phone?: string
    notes?: string
  }) {
    return this.post('/clients', data)
  }

  async getClient(id: string) {
    return this.get<{
      id: string
      name: string
      contact_type: string
      billing_email: string
      phone: string
      notes: string
      site_count: number
      total_inspections: number
      sites: Array<{
        id: string
        nickname: string
        address_json: any
        inspection_count: number
        last_inspection: string
      }>
    }>(`/clients/${id}`)
  }

  async addSite(clientId: string, data: {
    nickname?: string
    address: any
    notes?: string
  }) {
    return this.post(`/clients/${clientId}/sites`, data)
  }

  // Inspection methods
  async getInspectionTemplates() {
    return this.get<Array<{
      id: string
      name: string
      code: string
      schema_json: any
      callouts_json: any
    }>>('/inspections/templates')
  }

  async getInspections(params?: {
    page?: number
    limit?: number
    tech_id?: string
    site_id?: string
    status?: string
    start_date?: string
    end_date?: string
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.get<ApiResponse<Array<{
      id: string
      started_at: string
      submitted_at: string
      site_name: string
      client_name: string
      tech_name: string
      template_name: string
      total_items: number
      critical_issues: number
    }>>>(`/inspections${queryString}`)
  }

  async createInspection(data: {
    site_id: string
    template_id: string
    tech_id?: string
  }) {
    return this.post('/inspections', data)
  }

  async getInspection(id: string) {
    return this.get<{
      id: string
      site_id: string
      tech_id: string
      started_at: string
      submitted_at: string
      notes: string
      site_name: string
      client_name: string
      tech_name: string
      template_name: string
      schema_json: any
      callouts_json: any
      items: Array<{
        id: string
        zone_number: number
        area_label: string
        callout_code: string
        severity: string
        notes: string
        photos: string[]
      }>
    }>(`/inspections/${id}`)
  }

  async addInspectionItem(inspectionId: string, data: {
    zone_number?: number
    area_label?: string
    device_type?: string
    head_type?: string
    callout_code?: string
    severity?: string
    notes?: string
    photos?: string[]
    metadata?: any
  }) {
    return this.post(`/inspections/${inspectionId}/items`, data)
  }

  async submitInspection(id: string, data: {
    program_settings?: any
    summary_json?: any
    notes?: string
  }) {
    return this.post(`/inspections/${id}/submit`, data)
  }

  // Estimate methods
  async createEstimateFromInspection(inspectionId: string) {
    return this.post(`/estimates/from-inspection/${inspectionId}`)
  }

  async getEstimates(params?: {
    page?: number
    limit?: number
    status?: string
    client_id?: string
    start_date?: string
    end_date?: string
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.get<ApiResponse<Array<{
      id: string
      status: string
      total_cents: number
      currency: string
      client_name: string
      site_name: string
      created_at: string
      line_item_count: number
    }>>>(`/estimates${queryString}`)
  }

  async getEstimate(id: string) {
    return this.get<{
      id: string
      status: string
      subtotal_cents: number
      tax_cents: number
      total_cents: number
      currency: string
      client_name: string
      site_name: string
      items: Array<{
        id: string
        description: string
        qty: number
        unit_price_cents: number
        line_total_cents: number
      }>
    }>(`/estimates/${id}`)
  }

  // Price book methods
  async getPriceBooks() {
    return this.get<Array<{
      id: string
      name: string
      description: string
      is_active: boolean
      item_count: number
    }>>('/price-books')
  }

  async getPriceBookItems(priceBookId: string, params?: {
    category?: string
    search?: string
    active_only?: boolean
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.get<Array<{
      id: string
      sku: string
      name: string
      category: string
      unit: string
      price_cents: number
      cost_cents: number
    }>>(`/price-books/${priceBookId}/items${queryString}`)
  }

  // User methods
  async getUsers(params?: {
    role?: string
    active_only?: boolean
  }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : ''
    return this.get<Array<{
      id: string
      email: string
      full_name: string
      role: string
      is_active: boolean
      last_login_at: string
    }>>(`/users${queryString}`)
  }

  async createUser(data: {
    email: string
    full_name: string
    role: string
    phone?: string
  }) {
    return this.post('/users', data)
  }
}

export const apiClient = new ApiClient()
export default apiClient
