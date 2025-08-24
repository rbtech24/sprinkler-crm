import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Plus, Trash2, MapPin, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button, Input, Textarea, Select, Card, CardContent, FileUpload, Badge } from '@/components/ui'
import { clsx } from 'clsx'

// Form validation schema
const inspectionFormSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  template_id: z.string().min(1, 'Template is required'),
  notes: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    description: z.string().min(1, 'Description is required'),
    status: z.enum(['pass', 'fail', 'needs_attention']),
    notes: z.string().optional(),
    photos: z.array(z.any()).optional(),
    location: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
  }))
})

type InspectionFormData = z.infer<typeof inspectionFormSchema>

interface Template {
  id: string
  name: string
  categories: string[]
}

interface InspectionItem {
  id?: string
  category: string
  description: string
  status: 'pass' | 'fail' | 'needs_attention'
  notes?: string
  photos?: File[]
  location?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

interface Inspection {
  id?: string
  site_id: string
  template_id: string
  notes?: string
  items: InspectionItem[]
}

interface InspectionFormProps {
  inspection?: Inspection
  sites: Array<{ id: string; name: string; address: string }>
  templates: Template[]
  onSubmit: (data: InspectionFormData) => Promise<void>
  onSave?: (data: InspectionFormData) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function InspectionForm({
  inspection,
  sites,
  templates,
  onSubmit,
  onSave,
  isLoading = false,
  className
}: InspectionFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty }
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      site_id: inspection?.site_id || '',
      template_id: inspection?.template_id || '',
      notes: inspection?.notes || '',
      items: inspection?.items || []
    }
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items'
  })

  const watchedTemplateId = watch('template_id')

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Could not get location:', error)
        }
      )
    }
  }, [])

  // Update template when selection changes
  useEffect(() => {
    if (watchedTemplateId) {
      const template = templates.find(t => t.id === watchedTemplateId)
      setSelectedTemplate(template || null)
      
      // If no existing items and template has categories, create default items
      if (template && fields.length === 0) {
        template.categories.forEach(category => {
          append({
            category,
            description: '',
            status: 'pass',
            notes: '',
            photos: [],
            location: '',
            priority: 'medium'
          })
        })
      }
    }
  }, [watchedTemplateId, templates, fields.length, append])

  const addItem = () => {
    append({
      category: selectedTemplate?.categories[0] || 'General',
      description: '',
      status: 'pass',
      notes: '',
      photos: [],
      location: '',
      priority: 'medium'
    })
  }

  const handlePhotoUpload = (index: number, files: File[]) => {
    const currentItem = fields[index]
    update(index, {
      ...currentItem,
      photos: files
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Pass</Badge>
      case 'fail':
        return <Badge variant="danger" className="flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Fail</Badge>
      case 'needs_attention':
        return <Badge variant="warning" className="flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Needs Attention</Badge>
      default:
        return null
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="danger">Critical</Badge>
      case 'high':
        return <Badge variant="warning">High</Badge>
      case 'medium':
        return <Badge variant="info">Medium</Badge>
      case 'low':
        return <Badge variant="secondary">Low</Badge>
      default:
        return null
    }
  }

  const handleFormSubmit = async (data: InspectionFormData) => {
    // Add geolocation to items if available
    if (geolocation) {
      data.items = data.items.map(item => ({
        ...item,
        location: item.location || `${geolocation.latitude},${geolocation.longitude}`
      }))
    }
    
    await onSubmit(data)
  }

  const handleSave = async () => {
    if (onSave && isDirty) {
      const data = watch()
      await onSave(data)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={clsx("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {inspection ? 'Edit Inspection' : 'New Inspection'}
        </h2>
        <div className="flex space-x-3">
          {geolocation && (
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              Location captured
            </div>
          )}
          {onSave && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={!isDirty || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site *
              </label>
              <Select {...register('site_id')}>
                <option value="">Select a site</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.name} - {site.address}
                  </option>
                ))}
              </Select>
              {errors.site_id && (
                <p className="mt-1 text-sm text-red-600">{errors.site_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template *
              </label>
              <Select {...register('template_id')}>
                <option value="">Select a template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
              {errors.template_id && (
                <p className="mt-1 text-sm text-red-600">{errors.template_id.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General Notes
            </label>
            <Textarea
              {...register('notes')}
              placeholder="Add any general notes about this inspection..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inspection Items */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Inspection Items</h3>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              disabled={!selectedTemplate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Select a template to start adding inspection items
            </div>
          ) : (
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex space-x-2">
                      {getStatusBadge(watch(`items.${index}.status`))}
                      {getPriorityBadge(watch(`items.${index}.priority`))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <Select {...register(`items.${index}.category`)}>
                        {selectedTemplate?.categories.map((category: string) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </Select>
                      {errors.items?.[index]?.category && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.items[index]?.category?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status *
                      </label>
                      <Select {...register(`items.${index}.status`)}>
                        <option value="pass">Pass</option>
                        <option value="fail">Fail</option>
                        <option value="needs_attention">Needs Attention</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <Select {...register(`items.${index}.priority`)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <Input
                        {...register(`items.${index}.location`)}
                        placeholder="e.g., Zone A, Building 1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <Textarea
                      {...register(`items.${index}.description`)}
                      placeholder="Describe what was inspected..."
                      rows={2}
                    />
                    {errors.items?.[index]?.description && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <Textarea
                      {...register(`items.${index}.notes`)}
                      placeholder="Add any additional notes..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <FileUpload
                      label="Photos"
                      description="Upload photos for this inspection item"
                      value={watch(`items.${index}.photos`) || []}
                      onChange={(files) => handlePhotoUpload(index, files)}
                      accept="image/*"
                      maxSize={5}
                      maxFiles={5}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button
          type="submit"
          disabled={isLoading || fields.length === 0}
          className="min-w-32"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Inspection
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
