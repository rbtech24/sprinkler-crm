// Base types for the API responses and data structures

export interface User {
  id: string | number
  name: string
  email: string
  role: 'owner' | 'admin' | 'tech' | 'viewer' | 'dispatcher' | 'system_admin' | 'company_owner' | 'technician'
  companyId?: string
  company_id?: number
  company?: Company
  permissions?: string[]
  createdAt: string
  updatedAt: string
  email_verified?: boolean
}

export interface Company {
  id: string
  name: string
  type: 'inspection_only' | 'full_crm'
  address?: string
  phone?: string
  email?: string
  website?: string
  logo?: string
  settings: {
    branding?: {
      primaryColor?: string
      logo?: string
    }
    features?: {
      inspections: boolean
      estimates: boolean
      workOrders: boolean
      scheduling: boolean
      invoicing: boolean
    }
  }
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string | number
  companyId?: string
  company_id?: number
  name: string
  contact_type?: 'residential' | 'commercial'
  type?: 'residential' | 'commercial'
  billing_email?: string
  company?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  tags?: string[]
  sites?: Site[]
  site_count?: number
  lastInspection?: string
  last_inspection?: string
  totalInspections?: number
  customFields?: Record<string, string | number | boolean | string[]>
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
}

export interface Site {
  id: string
  companyId: string
  clientId: string
  name: string
  address: string
  city?: string
  state?: string
  zip_code?: string
  latitude?: number | string
  longitude?: number | string
  propertyType: 'residential' | 'commercial' | 'municipal' | 'hoa'
  squareFootage?: number
  lotSize?: number
  zones?: number
  gpsCoordinates?: {
    lat: number
    lng: number
  }
  notes?: string
  photos?: string[]
  customFields?: Record<string, string | number | boolean | string[]>
  client?: Client
  inspections?: Inspection[]
  createdAt: string
  updatedAt: string
}

export interface InspectionTemplate {
  id: string
  companyId: string
  name: string
  description?: string
  type: 'repair_focused' | 'conservation_focused' | 'custom'
  isDefault: boolean
  schema: {
    sections: InspectionSection[]
  }
  createdAt: string
  updatedAt: string
}

export interface InspectionSection {
  id: string
  title: string
  description?: string
  order: number
  fields: InspectionField[]
}

export interface InspectionField {
  id: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date' | 'photo' | 'rating'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface Inspection {
  id: string
  companyId: string
  siteId: string
  templateId: string
  technicianId: string
  status: 'draft' | 'in_progress' | 'completed' | 'reviewed'
  scheduledDate?: string
  completedDate?: string
  data: Record<string, string | number | boolean | string[]>
  callouts: InspectionCallout[]
  photos: string[]
  notes?: string
  weatherConditions?: string
  site?: Site
  template?: InspectionTemplate
  technician?: User
  createdAt: string
  updatedAt: string
}

export interface InspectionCallout {
  id: string
  inspectionId: string
  zone?: string
  location: string
  issue: string
  severity: 'low' | 'medium' | 'high'
  description?: string
  photos?: string[]
  estimatedCost?: number
  priceBookItemId?: string
  quantity?: number
  resolved: boolean
  createdAt: string
}

export interface PriceBook {
  id: string
  companyId: string
  name: string
  description?: string
  isDefault: boolean
  categories: PriceBookCategory[]
  createdAt: string
  updatedAt: string
}

export interface PriceBookCategory {
  id: string
  priceBookId: string
  name: string
  description?: string
  items: PriceBookItem[]
  order: number
}

export interface PriceBookItem {
  id: string
  categoryId: string
  sku?: string
  name: string
  description?: string
  unit: string
  cost: number
  price: number
  laborHours?: number
  laborRate?: number
  markup?: number
  tags?: string[]
  active: boolean
}

export interface Estimate {
  id: string
  companyId: string
  clientId: string
  siteId?: string
  inspectionId?: string
  number: string
  title: string
  description?: string
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired'
  validUntil?: string
  items: EstimateItem[]
  subtotal: number
  taxRate?: number
  taxAmount?: number
  discountAmount?: number
  total: number
  notes?: string
  terms?: string
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  client?: Client
  site?: Site
  createdAt: string
  updatedAt: string
}

export interface EstimateItem {
  id: string
  estimateId: string
  priceBookItemId?: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
  laborHours?: number
  laborRate?: number
  total: number
  order: number
}

export interface WorkOrder {
  id: string
  companyId: string
  estimateId?: string
  clientId: string
  siteId: string
  technicianId?: string
  number: string
  title: string
  description?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduledDate?: string
  startedAt?: string
  completedAt?: string
  items: WorkOrderItem[]
  photos?: string[]
  notes?: string
  clientSignature?: string
  technicianNotes?: string
  client?: Client
  site?: Site
  technician?: User
  createdAt: string
  updatedAt: string
}

export interface WorkOrderItem {
  id: string
  workOrderId: string
  name: string
  description?: string
  quantity: number
  quantityUsed?: number
  unit: string
  completed: boolean
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  companyName: string
  companyType: 'inspection_only' | 'full_crm'
}

export interface ClientForm {
  name: string
  type: 'residential' | 'commercial'
  company?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  tags?: string[]
  customFields?: Record<string, string | number | boolean | string[]>
}

export interface SiteForm {
  name: string
  address: string
  propertyType: 'residential' | 'commercial' | 'municipal' | 'hoa'
  squareFootage?: number
  lotSize?: number
  zones?: number
  notes?: string
  customFields?: Record<string, string | number | boolean | string[]>
}

// Filter and search types
export interface ClientFilters {
  search?: string
  type?: 'residential' | 'commercial'
  tags?: string[]
  hasInspections?: boolean
}

export interface InspectionFilters {
  search?: string
  status?: 'draft' | 'in_progress' | 'completed' | 'reviewed'
  technicianId?: string
  dateRange?: {
    start: string
    end: string
  }
  siteId?: string
  clientId?: string
}

export interface EstimateFilters {
  search?: string
  status?: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired'
  clientId?: string
  dateRange?: {
    start: string
    end: string
  }
  amountRange?: {
    min: number
    max: number
  }
}

// Dashboard stats type (matching API response format)
export interface DashboardStats {
  total_clients: number
  totalClients?: number
  total_sites: number
  totalSites?: number
  inspections_last_30_days: number
  totalInspections?: number
  completedInspections?: number
  pendingInspections?: number
  total_estimates: number
  totalEstimates?: number
  total_approved_value: number
  approvedEstimates?: number
  pending_estimates: number
  pendingEstimates?: number
  approval_rate: number
  approvalRate?: number
  total_work_orders: number
  totalWorkOrders?: number
  completedWorkOrders?: number
  in_progress_work_orders: number
  inProgressWorkOrders?: number
  scheduled_work_orders: number
  scheduledWorkOrders?: number
  total_revenue_cents: number
  totalRevenue?: number
  approvedValue?: number
  pendingValue?: number
  avg_job_value: number
  avgJobValue?: number
  recentInspections?: Inspection[]
}

// Auth request types
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  companyName: string
}

export interface CreateClientRequest {
  name: string
  type: 'residential' | 'commercial'
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export interface UpdateClientRequest {
  name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}
