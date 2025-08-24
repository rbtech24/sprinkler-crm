import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LoadingSpinner } from '@/components/ui'
import { InspectionForm } from '@/components/inspections'
import { useApi } from '@/hooks/useApi'
import { ArrowLeft } from 'lucide-react'

interface Site {
  id: string
  name: string
  address: string
}

interface Template {
  id: string
  name: string
  categories: string[]
}

interface Client {
  sites?: Array<{
    id: string
    name: string
    address: string
    city: string
    state: string
    zip_code: string
  }>
}

interface InspectionFormData {
  site_id: string
  template_id: string
  notes?: string
  items: Array<{
    category: string
    description: string
    status: 'pass' | 'fail' | 'needs_attention'
    notes?: string
    location?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    photos?: File[]
  }>
}

export default function NewInspectionPage() {
  const router = useRouter()
  const { api } = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load sites and templates
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Load sites (from clients endpoint)
        const sitesResponse = await api.get<Client[]>('/api/clients')
        const sitesData = sitesResponse.flatMap((client: Client) => 
          (client.sites || []).map((site) => ({
            id: site.id,
            name: site.name,
            address: `${site.address}, ${site.city}, ${site.state} ${site.zip_code}`
          }))
        )
        setSites(sitesData)

        // Load inspection templates (mock data for now)
        const mockTemplates: Template[] = [
          {
            id: '1',
            name: 'Standard Fire Sprinkler Inspection',
            categories: [
              'Water Supply',
              'Sprinkler Heads',
              'Piping Systems',
              'Valves',
              'Alarms',
              'Fire Pumps',
              'Control Panels'
            ]
          },
          {
            id: '2',
            name: 'Quarterly Inspection',
            categories: [
              'Visual Inspection',
              'Pressure Testing',
              'Alarm Testing',
              'Documentation'
            ]
          },
          {
            id: '3',
            name: 'Annual Inspection',
            categories: [
              'Comprehensive System Check',
              'Water Supply Testing',
              'Sprinkler Head Inspection',
              'Valve Operations',
              'Alarm System Testing',
              'Fire Pump Testing',
              'Underground Piping',
              'Backflow Prevention',
              'Documentation Review'
            ]
          }
        ]
        setTemplates(mockTemplates)
        
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load inspection data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [api])

  const handleSubmit = async (data: InspectionFormData) => {
    try {
      setIsLoading(true)
      
      // Create inspection
      const inspectionResponse = await api.post<{id: string}>('/api/inspections', {
        site_id: data.site_id,
        template_id: data.template_id,
        notes: data.notes,
        started_at: new Date().toISOString()
      })

      const inspectionId = inspectionResponse.id

      // Add inspection items
      for (const item of data.items) {
        await api.post(`/api/inspections/${inspectionId}/items`, {
          category: item.category,
          description: item.description,
          status: item.status,
          notes: item.notes,
          location: item.location,
          priority: item.priority
        })

        // Upload photos if any
        if (item.photos && item.photos.length > 0) {
          const formData = new FormData()
          item.photos.forEach((photo: File) => {
            formData.append('files', photo)
          })

          await api.post(`/api/files/inspection/${inspectionId}/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
        }
      }

      // Submit inspection
      await api.put(`/api/inspections/${inspectionId}`, {
        submitted_at: new Date().toISOString()
      })

      // Redirect to inspections list
      router.push('/inspections')
      
    } catch (error) {
      console.error('Error creating inspection:', error)
      setError('Failed to create inspection. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (data: InspectionFormData) => {
    try {
      // Save as draft - similar to submit but without submitted_at
      console.log('Saving draft:', data)
      // Implementation for saving drafts
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }

  if (isLoading && sites.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <InspectionForm
        sites={sites}
        templates={templates}
        onSubmit={handleSubmit}
        onSave={handleSave}
        isLoading={isLoading}
        className="max-w-4xl mx-auto"
      />
    </div>
  )
}
