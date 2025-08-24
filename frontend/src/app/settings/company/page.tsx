'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui'
import { Button, Input, Label } from '@/components/ui'
import { useState } from 'react'
import { Building2, MapPin, Phone, Mail, Globe, Upload } from 'lucide-react'

export default function CompanySettingsPage() {
  const [companyData, setCompanyData] = useState({
    name: 'SprinklerPro Services',
    email: 'info@sprinklerpro.com',
    phone: '(555) 123-4567',
    website: 'www.sprinklerpro.com',
    address: '123 Business Ave',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    country: 'USA',
    taxId: '12-3456789',
    licenseNumber: 'IRR-2024-001'
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0])
    }
  }

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving company settings:', companyData)
  }

  return (
    <DashboardLayout title="Company Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
            <p className="text-gray-600">Manage your company information and branding</p>
          </div>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Logo */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                    {logoFile ? (
                      <img 
                        src={URL.createObjectURL(logoFile)} 
                        alt="Company Logo" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <Building2 className="h-16 w-16 text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Company Logo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload your company logo (PNG, JPG up to 5MB)
                  </p>
                  <label htmlFor="logo-upload">
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium text-gray-900 mb-6">Company Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={companyData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={companyData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={companyData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <div className="relative mt-1">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="website"
                        value={companyData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Address Information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-6 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Business Address
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={companyData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={companyData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={companyData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={companyData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={companyData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-900 mb-6">Business Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="taxId">Tax ID / EIN</Label>
                <Input
                  id="taxId"
                  value={companyData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={companyData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}