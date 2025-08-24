import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { FormGroup, FormRow } from '@/components/forms/form-layout'

interface RegisterFormData {
  companyName: string
  adminName: string
  adminEmail: string
  adminPassword: string
  confirmPassword: string
  plan: string
}

export function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    companyName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    plan: 'starter',
  })
  const [errors, setErrors] = useState<Partial<RegisterFormData & { confirmPassword: string }>>({})
  
  const { register, isLoading } = useAuthStore()

  const validateForm = () => {
    const newErrors: Partial<RegisterFormData & { confirmPassword: string }> = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }
    
    if (!formData.adminName.trim()) {
      newErrors.adminName = 'Admin name is required'
    }
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Please enter a valid email address'
    }
    
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required'
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      await register({
        companyName: formData.companyName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminName: formData.adminName,
        plan: formData.plan,
      })
    }
  }

  const updateField = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear confirm password error if passwords now match
    if (field === 'adminPassword' || field === 'confirmPassword') {
      if (errors.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Input
                  label="Company Name"
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  error={errors.companyName}
                  placeholder="Acme Fire Safety"
                />

                <Input
                  label="Your Name"
                  value={formData.adminName}
                  onChange={(e) => updateField('adminName', e.target.value)}
                  error={errors.adminName}
                  placeholder="John Doe"
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => updateField('adminEmail', e.target.value)}
                  error={errors.adminEmail}
                  placeholder="john@acmefire.com"
                  autoComplete="email"
                />

                <FormRow>
                  <Input
                    label="Password"
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => updateField('adminPassword', e.target.value)}
                    error={errors.adminPassword}
                    placeholder="••••••••"
                    hint="At least 8 characters"
                    autoComplete="new-password"
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    error={errors.confirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </FormRow>

                <Select
                  label="Plan"
                  value={formData.plan}
                  onChange={(e) => updateField('plan', e.target.value)}
                >
                  <option value="starter">Starter - $29/month</option>
                  <option value="pro">Pro - $79/month</option>
                  <option value="enterprise">Enterprise - $199/month</option>
                </Select>

                <Button type="submit" loading={isLoading} fullWidth>
                  Create Account
                </Button>
              </FormGroup>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary-600 hover:text-primary-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
