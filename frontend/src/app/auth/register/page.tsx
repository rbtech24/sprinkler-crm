'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Select } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { 
  Droplets, 
  CheckCircle, 
  Star,
  Clock,
  DollarSign,
  Shield,
  Smartphone,
  Users,
  FileText,
  Camera,
  ArrowRight
} from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyType: 'inspection_only' as 'inspection_only' | 'full_crm'
  })
  const router = useRouter()
  const { register, isLoading } = useAuthStore()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.companyName) {
      toast.error('Please fill in all fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      await register({
        companyName: formData.companyName,
        adminEmail: formData.email,
        adminPassword: formData.password,
        adminName: formData.name,
        plan: formData.companyType
      })
      toast.success('Account created successfully!')
      router.push('/dashboard')
    } catch {
      // Error is already handled by the auth store with toast
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-emerald-700">
                SprinklerPro CRM
              </h1>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/#features" className="text-slate-600 hover:text-emerald-600 transition-colors">Features</Link>
              <Link href="/support" className="text-slate-600 hover:text-emerald-600 transition-colors">Support</Link>
              <Link 
                href="/auth/login" 
                className="text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Sales Section */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Shield className="w-4 h-4 mr-2" />
                  14-Day Free Trial • No Credit Card Required
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  Start Your Digital Transformation Today
                </h2>
                <p className="text-lg text-slate-600 mb-6">
                  Join hundreds of sprinkler repair contractors who&apos;ve increased their revenue by 47% with professional digital inspections.
                </p>
              </div>

              {/* Key Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-4 mt-0.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Mobile Inspections</h3>
                    <p className="text-slate-600 text-sm">Complete zone-by-zone inspections on your phone with photo documentation</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-0.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Instant Estimates</h3>
                    <p className="text-slate-600 text-sm">Convert findings into professional PDF estimates with smart pricing</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-4 mt-0.5">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Higher Revenue</h3>
                    <p className="text-slate-600 text-sm">3.2x more estimates sent, 47% higher closing rates on average</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-4 mt-0.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Time Savings</h3>
                    <p className="text-slate-600 text-sm">Save 8+ hours per week on paperwork and administrative tasks</p>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">MR</div>
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">SJ</div>
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">TC</div>
                    </div>
                    <span className="ml-3 text-sm text-slate-600">300+ contractors</span>
                  </div>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                    <span className="ml-2 text-sm text-slate-600">4.9/5</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic">
                  &quot;Best decision we&apos;ve made for our irrigation business. Customers love the professional reports.&quot;
                </p>
                <p className="text-xs text-slate-500 mt-1">- Mike Rodriguez, Desert Springs Irrigation</p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <div>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Create Your Account</h3>
                <p className="text-slate-600">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                    Sign in here
                  </Link>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="john@yourcompany.com"
                    required
                  />
                </div>

                <Input
                  label="Company Name"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Your Irrigation Company"
                  required
                />

                <Select
                  label="Choose Your Plan"
                  value={formData.companyType}
                  onChange={(e) => handleChange('companyType', e.target.value)}
                  required
                >
                  <option value="inspection_only">Inspection Pro - Perfect for starting digitally</option>
                  <option value="full_crm">Business Pro - Complete CRM & management suite</option>
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min 8 characters"
                    hint="Use a strong password with mixed case, numbers, and symbols"
                    required
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Confirm password"
                    required
                  />
                </div>

                {/* Plan Details */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">What&apos;s Included:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Digital mobile inspections</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Professional PDF reports</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Photo documentation</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                      <span className="text-slate-700">Smart estimate generation</span>
                    </div>
                    {formData.companyType === 'full_crm' && (
                      <>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-slate-700">Customer management</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-slate-700">Work order tracking</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-slate-700">Team scheduling</span>
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-slate-700">Business analytics</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded mt-1"
                  />
                  <label htmlFor="terms" className="ml-3 text-sm text-slate-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-emerald-600 hover:text-emerald-500 font-medium">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-emerald-600 hover:text-emerald-500 font-medium">
                      Privacy Policy
                    </Link>. You can cancel anytime during your free trial.
                  </label>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={isLoading}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-semibold"
                >
                  {isLoading ? 'Creating Your Account...' : 'Start Your Free Trial'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="text-center text-xs text-slate-500">
                  Free trial includes full access • No credit card required • Cancel anytime
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">SprinklerPro CRM</h3>
              </div>
              <p className="text-slate-400 mb-6">
                The only CRM built specifically for sprinkler repair and irrigation maintenance contractors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#workflow" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/support" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8">
            <p className="text-slate-400 text-center">
              © 2024 SprinklerPro CRM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}