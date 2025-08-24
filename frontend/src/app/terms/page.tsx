'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, AlertTriangle, DollarSign, Shield, Users, Clock } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center text-emerald-600 hover:text-emerald-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">Terms of Service</h1>
            <div className="w-20"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
            <p className="text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Terms Content */}
          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Agreement to Terms</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  By accessing and using SprinklerPro CRM ("Service"), you accept and agree to be bound by 
                  the terms and provision of this agreement. These Terms of Service ("Terms") govern your 
                  use of our irrigation management software and related services.
                </p>
                <p>
                  If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-emerald-600" />
                Service Description
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  SprinklerPro CRM provides customer relationship management software specifically 
                  designed for irrigation and sprinkler repair contractors, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Digital inspection forms and reporting tools</li>
                  <li>Client and site management systems</li>
                  <li>Estimate and work order creation</li>
                  <li>Scheduling and dispatch functionality</li>
                  <li>Mobile applications for field technicians</li>
                  <li>Data storage and backup services</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                Subscription Plans & Billing
              </h2>
              <div className="text-slate-700 space-y-4">
                <h3 className="font-semibold text-slate-900">Free Trial</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>14-day free trial available for new accounts</li>
                  <li>Full access to chosen plan features during trial</li>
                  <li>No credit card required to start trial</li>
                  <li>Trial automatically expires unless upgraded to paid plan</li>
                </ul>

                <h3 className="font-semibold text-slate-900 mt-6">Paid Subscriptions</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Inspection Only Plan:</strong> Basic inspection and reporting features</li>
                  <li><strong>Full CRM Plan:</strong> Complete business management suite</li>
                  <li>Monthly or annual billing options available</li>
                  <li>Automatic renewal unless cancelled</li>
                  <li>Prorated refunds for annual plans if cancelled within 30 days</li>
                </ul>

                <h3 className="font-semibold text-slate-900 mt-6">Payment Terms</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Payment due in advance for subscription periods</li>
                  <li>Late payments may result in service suspension</li>
                  <li>You're responsible for all taxes and fees</li>
                  <li>Price changes require 30 days notice</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                User Responsibilities
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Keep your account credentials secure</li>
                  <li>Use the service only for lawful business purposes</li>
                  <li>Not share your account with unauthorized users</li>
                  <li>Not attempt to reverse engineer or hack the service</li>
                  <li>Respect intellectual property rights</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Ownership & Privacy</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  <strong>Your Data:</strong> You retain ownership of all data you input into our system, 
                  including client information, inspection reports, and business records.
                </p>
                <p>
                  <strong>Data Export:</strong> You can export your data at any time in standard formats.
                </p>
                <p>
                  <strong>Data Retention:</strong> We retain your data for 90 days after account cancellation 
                  to allow for reactivation. After 90 days, data is permanently deleted.
                </p>
                <p>
                  <strong>Privacy:</strong> Your data privacy is governed by our Privacy Policy.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-emerald-600" />
                Service Availability
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. 
                  Planned maintenance will be announced in advance when possible.
                </p>
                <p>
                  We are not liable for business losses due to service interruptions, but we will 
                  make reasonable efforts to restore service quickly.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Account Termination</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  <strong>By You:</strong> You may cancel your subscription at any time through your 
                  account settings. Cancellation takes effect at the end of your current billing period.
                </p>
                <p>
                  <strong>By Us:</strong> We may suspend or terminate accounts that violate these terms, 
                  engage in fraudulent activity, or pose security risks.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                Limitations of Liability
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  The service is provided "as is" without warranties of any kind. We disclaim all 
                  warranties, express or implied, including merchantability and fitness for a particular purpose.
                </p>
                <p>
                  Our liability is limited to the amount you paid for the service in the 12 months 
                  preceding any claim. We are not liable for indirect, incidental, or consequential damages.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Intellectual Property</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  SprinklerPro CRM and its original content, features, and functionality are owned by us 
                  and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  You may not copy, modify, distribute, sell, or lease any part of our service or software.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Modifications to Terms</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  We reserve the right to modify these terms at any time. Changes will be effective 
                  immediately upon posting. Your continued use constitutes acceptance of the new terms.
                </p>
                <p>
                  For significant changes, we will provide 30 days notice via email or in-app notification.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Governing Law</h2>
              <div className="text-slate-700">
                <p>
                  These terms are governed by the laws of Arizona, USA. Any disputes will be resolved 
                  in the courts of Phoenix, Arizona.
                </p>
              </div>
            </section>
          </div>

          {/* Contact Section */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Information</h2>
            <div className="text-slate-700 space-y-2">
              <p>Questions about these Terms of Service? Contact us:</p>
              <p><strong>Email:</strong> legal@sprinklerprocrm.com</p>
              <p><strong>Phone:</strong> 1-800-SPRINKLER</p>
              <p><strong>Address:</strong> SprinklerPro CRM, 123 Business Ave, Phoenix, AZ 85001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}