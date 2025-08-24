import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api'
import { toast } from 'react-hot-toast'

export interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'dispatcher' | 'tech' | 'technician' | 'field_technician' | 'viewer' | 'system_admin' | 'company_owner' | 'manager'
}

export interface Company {
  id: string
  name: string
  plan: 'inspection_only' | 'full_crm'
  email?: string
  phone?: string
  website?: string
  logo_url?: string
}

export interface SubscriptionInfo {
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
}

interface AuthState {
  user: User | null
  company: Company | null
  subscription: SubscriptionInfo | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  hasHydrated: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (data: {
    companyName: string
    adminEmail: string
    adminPassword: string
    adminName: string
    plan?: string
  }) => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  loadSubscriptionInfo: () => Promise<void>
  hasFeature: (feature: string) => boolean
  setUser: (user: User | null) => void
  setCompany: (company: Company | null) => void
  setSubscription: (subscription: SubscriptionInfo | null) => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      subscription: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        
        try {
          const response = await apiClient.login(email, password)
          
          // Store token in localStorage
          localStorage.setItem('auth_token', response.token)
          
          set({
            user: {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.user.role as User['role'],
            },
            company: {
              id: response.company.id,
              name: response.company.name,
              plan: response.company.plan as Company['plan'],
            },
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          // Load subscription info after successful login
          get().loadSubscriptionInfo()
          
          toast.success('Login successful')
          return true
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.error || 'Login failed'
          toast.error(message)
          return false
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        
        try {
          const response = await apiClient.register(data)
          
          // Store token in localStorage
          localStorage.setItem('auth_token', response.token)
          
          set({
            user: {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.user.role as User['role'],
            },
            company: {
              id: response.company.id,
              name: response.company.name,
              plan: response.company.plan as Company['plan'],
            },
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          // Load subscription info after successful registration
          get().loadSubscriptionInfo()
          
          toast.success('Registration successful')
          return true
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.error || 'Registration failed'
          toast.error(message)
          return false
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        set({
          user: null,
          company: null,
          subscription: null,
          token: null,
          isAuthenticated: false,
        })
        toast.success('Logged out successfully')
      },

      refreshUser: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        try {
          // In a real app, you'd have a /me endpoint
          // For now, we'll just validate the token is still valid
          await apiClient.getCompany()
        } catch (error) {
          // Token is invalid, logout
          get().logout()
        }
      },

      loadSubscriptionInfo: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        try {
          const response = await apiClient.getSubscriptionStatus()
          set({ subscription: response })
        } catch (error) {
          console.error('Failed to load subscription info:', error)
          set({ subscription: null })
        }
      },

      hasFeature: (feature: string) => {
        const { subscription } = get()
        return subscription?.features?.includes(feature) || false
      },

      setUser: (user: User | null) => set({ user }),
      setCompany: (company: Company | null) => set({ company }),
      setSubscription: (subscription: SubscriptionInfo | null) => set({ subscription }),
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        subscription: state.subscription,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
