'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { 
  Eye, 
  EyeOff, 
  Droplets, 
  Shield, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

export function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState<Partial<LoginFormData>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const validateForm = () => {
    const newErrors: Partial<LoginFormData> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    
    if (validateForm()) {
      try {
        const success = await login(formData.email, formData.password)
        if (success) {
          // Add a small delay to ensure state is properly set before redirect
          setTimeout(() => {
            router.push('/dashboard')
          }, 100)
        }
      } catch (error: any) {
        setLoginError(error.message || 'Login failed. Please check your credentials.')
      }
    }
  }

  const updateField = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    if (loginError) {
      setLoginError('')
    }
  }

  const fillDemoCredentials = () => {
    setFormData(prev => ({
      ...prev,
      email: 'owner@demo.com',
      password: 'password'
    }))
    setErrors({})
    setLoginError('')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4">
                <Droplets className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Irrigation Pro</h1>
                <p className="text-blue-100">Professional Irrigation Management</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Streamline Your Sprinkler Repair Business
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Manage inspections, work orders, estimates, and client relationships 
              all in one powerful platform designed for irrigation professionals.
            </p>
            
            <div className="grid grid-cols-1 gap-4 mt-8">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                <span className="text-blue-100">Digital inspection reports with photo documentation</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                <span className="text-blue-100">Automated estimate generation and client communication</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                <span className="text-blue-100">Technician scheduling and route optimization</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0" />
                <span className="text-blue-100">Real-time dashboard analytics and reporting</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white opacity-5"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-white opacity-10 transform translate-x-32 translate-y-32"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-white opacity-5"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Irrigation Pro</h1>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access your irrigation management dashboard
            </p>
          </div>

          {/* Demo Credentials Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">Demo Access</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Try the platform with demo credentials
                </p>
                <button 
                  onClick={fillDemoCredentials}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-500 underline"
                >
                  Use Demo Credentials
                </button>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              {loginError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Login Failed</h3>
                    <p className="text-sm text-red-700 mt-1">{loginError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="you@company.com"
                    className={`w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    autoComplete="email"
                    autoFocus
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => updateField('rememberMe', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  loading={isLoading} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Need an account?{' '}
                  <Link 
                    href="/auth/register" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Start your free trial
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}