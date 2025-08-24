import { useState } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import { FormGroup, FormRow } from './form-layout'

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  company?: string
  jobTitle?: string
  notes?: string
}

interface ContactFormProps {
  initialData?: Partial<ContactFormData>
  onSubmit: (data: ContactFormData) => void
  loading?: boolean
  submitText?: string
  showCompanyFields?: boolean
}

export function ContactForm({ 
  initialData, 
  onSubmit, 
  loading, 
  submitText = 'Save Contact',
  showCompanyFields = true 
}: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    jobTitle: initialData?.jobTitle || '',
    notes: initialData?.notes || '',
  })

  const [errors, setErrors] = useState<Partial<ContactFormData>>({})

  const validateForm = () => {
    const newErrors: Partial<ContactFormData> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const updateField = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length >= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
    } else if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    }
    return cleaned
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    updateField('phone', formatted)
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup>
        <FormRow>
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            error={errors.firstName}
            placeholder="John"
          />
          
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            error={errors.lastName}
            placeholder="Doe"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={errors.email}
            placeholder="john.doe@example.com"
          />
          
          <Input
            label="Phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            error={errors.phone}
            placeholder="(555) 123-4567"
          />
        </FormRow>

        {showCompanyFields && (
          <FormRow>
            <Input
              label="Company"
              value={formData.company}
              onChange={(e) => updateField('company', e.target.value)}
              placeholder="ABC Corporation"
            />
            
            <Input
              label="Job Title"
              value={formData.jobTitle}
              onChange={(e) => updateField('jobTitle', e.target.value)}
              placeholder="Facilities Manager"
            />
          </FormRow>
        )}

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Additional notes about this contact..."
          rows={3}
        />

        <Button type="submit" loading={loading} fullWidth>
          {submitText}
        </Button>
      </FormGroup>
    </form>
  )
}
