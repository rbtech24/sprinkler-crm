import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '../lib/api'

// Error type definitions
interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
  message?: string
}

// General API hook for direct access
export function useApi() {
  return {
    api: apiClient
  }
}

// Auth hooks
export function useAuth() {
  const queryClient = useQueryClient()

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('company', JSON.stringify(data.company))
      queryClient.invalidateQueries()
      toast.success('Login successful!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || 'Login failed')
    },
  })

  const register = useMutation({
    mutationFn: (data: {
      companyName: string
      adminEmail: string
      adminPassword: string
      adminName: string
      plan?: string
    }) => apiClient.register(data),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('company', JSON.stringify(data.company))
      queryClient.invalidateQueries()
      toast.success('Registration successful!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || 'Registration failed')
    },
  })

  return { login, register }
}

// Dashboard hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get('/dashboard/stats'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useTodaysSchedule() {
  return useQuery({
    queryKey: ['dashboard', 'schedule', 'today'],
    queryFn: () => apiClient.get('/dashboard/schedule/today'),
    refetchInterval: 60 * 1000, // Refresh every minute
  })
}

export function useRecentInspections() {
  return useQuery({
    queryKey: ['dashboard', 'inspections', 'recent'],
    queryFn: () => apiClient.get('/dashboard/inspections/recent'),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function usePipelineData() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: () => apiClient.get('/dashboard/pipeline'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Client hooks
export function useClients(params?: {
  page?: number
  limit?: number
  search?: string
  type?: 'residential' | 'commercial'
}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => apiClient.getClients(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => apiClient.getClient(id),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      contact_type: 'residential' | 'commercial'
      billing_email?: string
      phone?: string
      notes?: string
    }) => apiClient.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client created successfully!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || 'Failed to create client')
    },
  })
}

// Inspection hooks
export function useInspections(params?: {
  page?: number
  limit?: number
  tech_id?: string
  site_id?: string
  status?: string
  start_date?: string
  end_date?: string
}) {
  return useQuery({
    queryKey: ['inspections', params],
    queryFn: () => apiClient.getInspections(params),
    staleTime: 2 * 60 * 1000,
  })
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: ['inspection', id],
    queryFn: () => apiClient.getInspection(id),
    enabled: !!id,
  })
}

export function useInspectionTemplates() {
  return useQuery({
    queryKey: ['inspection-templates'],
    queryFn: () => apiClient.getInspectionTemplates(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCreateInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      site_id: string
      template_id: string
      tech_id?: string
    }) => apiClient.createInspection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      toast.success('Inspection created successfully!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || 'Failed to create inspection')
    },
  })
}

// Estimate hooks
export function useEstimates(params?: {
  page?: number
  limit?: number
  status?: string
  client_id?: string
  start_date?: string
  end_date?: string
}) {
  return useQuery({
    queryKey: ['estimates', params],
    queryFn: () => apiClient.getEstimates(params),
    staleTime: 2 * 60 * 1000,
  })
}

export function useEstimate(id: string) {
  return useQuery({
    queryKey: ['estimate', id],
    queryFn: () => apiClient.getEstimate(id),
    enabled: !!id,
  })
}

export function useCreateEstimateFromInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (inspectionId: string) => 
      apiClient.createEstimateFromInspection(inspectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] })
      toast.success('Estimate created successfully!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || 'Failed to create estimate')
    },
  })
}

// Price book hooks
export function usePriceBooks() {
  return useQuery({
    queryKey: ['price-books'],
    queryFn: () => apiClient.getPriceBooks(),
    staleTime: 10 * 60 * 1000,
  })
}

export function usePriceBookItems(priceBookId: string, params?: {
  category?: string
  search?: string
  active_only?: boolean
}) {
  return useQuery({
    queryKey: ['price-book-items', priceBookId, params],
    queryFn: () => apiClient.getPriceBookItems(priceBookId, params),
    enabled: !!priceBookId,
    staleTime: 5 * 60 * 1000,
  })
}

// User hooks
export function useUsers(params?: {
  role?: string
  active_only?: boolean
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => apiClient.getUsers(params),
    staleTime: 5 * 60 * 1000,
  })
}
