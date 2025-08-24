import { useState } from 'react'
import { Modal, Button, Input, LoadingSpinner } from '@/components/ui'
import { useCreateClient } from '@/hooks/useApi'
import { toast } from 'react-hot-toast'
import { User, Building, Mail, Phone, FileText, MapPin, CheckCircle } from 'lucide-react'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact_type: 'residential' as 'residential' | 'commercial',
    billing_email: '',
    phone: '',
    notes: '',
    primary_contact: {
      name: '',
      email: '',
      phone: '',
      title: ''
    },
    billing_address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    service_address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      same_as_billing: true
    }
  })

  const createClient = useCreateClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('Client name is required')
      return
    }

    try {
      await createClient.mutateAsync({
        name: formData.name,
        contact_type: formData.contact_type,
        billing_email: formData.billing_email || undefined,
        phone: formData.phone || undefined,
        notes: formData.notes || undefined
      })
      
      onClose()
      // Reset form
      setFormData({
        name: '',
        contact_type: 'residential',
        billing_email: '',
        phone: '',
        notes: '',
        primary_contact: {
          name: '',
          email: '',
          phone: '',
          title: ''
        },
        billing_address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'US'
        },
        service_address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
          same_as_billing: true
        }
      })
    } catch (error) {
      console.error('Failed to create client:', error)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Client" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="h-4 w-4 inline mr-2" />
              Client Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter client name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Client Type
            </label>
            <select
              value={formData.contact_type}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_type: e.target.value as 'residential' | 'commercial' }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email Address
            </label>
            <Input
              type="email"
              value={formData.billing_email}
              onChange={(e) => setFormData(prev => ({ ...prev, billing_email: e.target.value }))}
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-2" />
              Phone Number
            </label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        {/* Primary Contact (for Commercial) */}
        {formData.contact_type === 'commercial' && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <Input
                  value={formData.primary_contact.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    primary_contact: { ...prev.primary_contact, name: e.target.value }
                  }))}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input
                  value={formData.primary_contact.title}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    primary_contact: { ...prev.primary_contact, title: e.target.value }
                  }))}
                  placeholder="Property Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.primary_contact.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    primary_contact: { ...prev.primary_contact, email: e.target.value }
                  }))}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formData.primary_contact.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    primary_contact: { ...prev.primary_contact, phone: e.target.value }
                  }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        )}

        {/* Billing Address */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <Input
                value={formData.billing_address.street}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  billing_address: { ...prev.billing_address, street: e.target.value }
                }))}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <Input
                value={formData.billing_address.city}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  billing_address: { ...prev.billing_address, city: e.target.value }
                }))}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={formData.billing_address.state}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  billing_address: { ...prev.billing_address, state: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select State</option>
                <option value="CA">California</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="NY">New York</option>
                {/* Add more states as needed */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <Input
                value={formData.billing_address.zip}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  billing_address: { ...prev.billing_address, zip: e.target.value }
                }))}
                placeholder="12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={formData.billing_address.country}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  billing_address: { ...prev.billing_address, country: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Service Address */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <MapPin className="h-5 w-5 inline mr-2" />
            Service Address
          </h3>
          
          {/* Same as billing checkbox */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.service_address.same_as_billing}
                onChange={(e) => {
                  const isChecked = e.target.checked
                  setFormData(prev => ({
                    ...prev,
                    service_address: {
                      ...prev.service_address,
                      same_as_billing: isChecked,
                      ...(isChecked ? {
                        street: prev.billing_address.street,
                        city: prev.billing_address.city,
                        state: prev.billing_address.state,
                        zip: prev.billing_address.zip,
                        country: prev.billing_address.country
                      } : {})
                    }
                  }))
                }}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Same as billing address
              </span>
            </label>
          </div>
          
          {!formData.service_address.same_as_billing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <Input
                  value={formData.service_address.street}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    service_address: { ...prev.service_address, street: e.target.value }
                  }))}
                  placeholder="123 Service Location Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  value={formData.service_address.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    service_address: { ...prev.service_address, city: e.target.value }
                  }))}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  value={formData.service_address.state}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    service_address: { ...prev.service_address, state: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select State</option>
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                  <option value="NY">New York</option>
                  {/* Add more states as needed */}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <Input
                  value={formData.service_address.zip}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    service_address: { ...prev.service_address, zip: e.target.value }
                  }))}
                  placeholder="12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={formData.service_address.country}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    service_address: { ...prev.service_address, country: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes about this client..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createClient.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createClient.isPending}
          >
            {createClient.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Client'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
