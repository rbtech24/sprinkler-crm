import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { FormGroup, FormRow } from './form-layout'

interface AddressFormData {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

interface AddressFormProps {
  initialData?: Partial<AddressFormData>
  onSubmit: (data: AddressFormData) => void
  loading?: boolean
  submitText?: string
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

export function AddressForm({ initialData, onSubmit, loading, submitText = 'Save Address' }: AddressFormProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    street: initialData?.street || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    country: initialData?.country || 'US',
  })

  const [errors, setErrors] = useState<Partial<AddressFormData>>({})

  const validateForm = () => {
    const newErrors: Partial<AddressFormData> = {}

    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required'
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    }
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required'
    }
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required'
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

  const updateField = (field: keyof AddressFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup>
        <Input
          label="Street Address"
          value={formData.street}
          onChange={(e) => updateField('street', e.target.value)}
          error={errors.street}
          placeholder="123 Main St"
        />
        
        <FormRow columns={3}>
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            error={errors.city}
            placeholder="New York"
          />
          
          <Select
            label="State"
            value={formData.state}
            onChange={(e) => updateField('state', e.target.value)}
            error={errors.state}
            placeholder="Select state"
          >
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </Select>
          
          <Input
            label="ZIP Code"
            value={formData.zipCode}
            onChange={(e) => updateField('zipCode', e.target.value)}
            error={errors.zipCode}
            placeholder="10001"
          />
        </FormRow>

        <Select
          label="Country"
          value={formData.country}
          onChange={(e) => updateField('country', e.target.value)}
          error={errors.country}
        >
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </Select>

        <Button type="submit" loading={loading} fullWidth>
          {submitText}
        </Button>
      </FormGroup>
    </form>
  )
}
