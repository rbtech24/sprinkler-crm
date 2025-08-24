'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  MapPin, 
  User, 
  Eye,
  Filter,
  Search,
  FileText,
  Wrench,
  ClipboardCheck,
  Download
} from 'lucide-react'

interface Inspection {
  id: number
  client_name: string
  site_name?: string
  site_address?: string
  property_address: string
  scheduled_date: string
  started_at?: string
  completed_at?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'needs_followup'
  inspection_type: string
  overall_condition?: string
  estimated_duration: number
  zone_count: number
  photo_count: number
  technician_name: string
  technician_email: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_repair_cost_cents?: number
}

interface InspectionsListProps {
  userRole: string
  className?: string
}

export function InspectionsList({ userRole, className }: InspectionsListProps) {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [technicianFilter, setTechnicianFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('30')
  
  // Get unique technicians for filter
  const technicians = Array.from(new Set(inspections.map(i => i.technician_name)))
    .filter(Boolean)
    .sort()

  useEffect(() => {
    fetchInspections()
  }, [dateFilter])

  useEffect(() => {
    filterInspections()
  }, [inspections, searchTerm, statusFilter, technicianFilter])

  const fetchInspections = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('auth_token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
      
      const params = new URLSearchParams()
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter)
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - days)
        params.append('date_from', fromDate.toISOString().split('T')[0])
      }
      
      const response = await fetch(`${apiUrl}/inspections?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setInspections(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch inspections:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterInspections = () => {
    let filtered = inspections

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(inspection => 
        inspection.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inspection.site_name && inspection.site_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inspection => inspection.status === statusFilter)
    }

    // Technician filter
    if (technicianFilter !== 'all') {
      filtered = filtered.filter(inspection => inspection.technician_name === technicianFilter)
    }

    setFilteredInspections(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</span>
      case 'in_progress':
        return <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"><Clock className="h-3 w-3 mr-1" />In Progress</span>
      case 'scheduled':
        return <span className="inline-flex items-center bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"><Calendar className="h-3 w-3 mr-1" />Scheduled</span>
      case 'needs_followup':
        return <span className="inline-flex items-center bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full"><AlertTriangle className="h-3 w-3 mr-1" />Follow-up</span>
      default:
        return <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">{status}</span>
    }
  }

  const getConditionBadge = (condition?: string) => {
    if (!condition) return null
    
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800', 
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${colors[condition as keyof typeof colors]}`}>
        {condition}
      </span>
    )
  }

  const viewInspectionDetails = (inspectionId: number) => {
    // Navigate to detailed inspection view
    window.open(`/inspections/${inspectionId}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <ClipboardCheck className="h-6 w-6 mr-2 text-blue-600" />
            Inspections
          </h2>
          <p className="text-gray-600">
            {userRole === 'technician' ? 'Your irrigation inspections' : 'All company inspections and reports'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4 mr-1" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search inspections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="needs_followup">Needs Follow-up</option>
          </select>

          {/* Technician Filter */}
          {userRole !== 'technician' && (
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Technicians</option>
              {technicians.map(tech => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>
          )}

          {/* Date Range Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Inspections List */}
      <div className="space-y-4">
        {filteredInspections.map((inspection) => (
          <div key={inspection.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {inspection.client_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {inspection.site_name ? `${inspection.site_name} • ` : ''}
                        {inspection.property_address}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(inspection.scheduled_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {inspection.technician_name}
                        </div>
                        <div className="flex items-center capitalize">
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          {inspection.inspection_type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(inspection.status)}
                  {inspection.overall_condition && getConditionBadge(inspection.overall_condition)}
                </div>
              </div>

              {/* Progress Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-1 text-blue-500" />
                  <span>{inspection.estimated_duration} min</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Wrench className="h-4 w-4 mr-1 text-green-500" />
                  <span>{inspection.zone_count} zones</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Camera className="h-4 w-4 mr-1 text-purple-500" />
                  <span>{inspection.photo_count} photos</span>
                </div>
                {inspection.estimated_repair_cost_cents && (
                  <div className="flex items-center text-gray-600">
                    <span className="text-orange-600 font-medium">
                      ${(inspection.estimated_repair_cost_cents / 100).toFixed(0)} repairs
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  ID: {inspection.id}
                  {inspection.completed_at && (
                    <> • Completed {new Date(inspection.completed_at).toLocaleDateString()}</>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => viewInspectionDetails(inspection.id)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                  
                  {inspection.status === 'completed' && (
                    <button className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredInspections.length === 0 && (
        <div className="text-center py-12">
          <ClipboardCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inspections Found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' || technicianFilter !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'No inspections have been scheduled yet.'
            }
          </p>
        </div>
      )}
    </div>
  )
}