'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Eye, Database, Mail, Phone, MapPin } from 'lucide-react'

export default function PrivacyPolicyPage() {
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
            <h1 className="text-lg font-semibold text-slate-900">Privacy Policy</h1>
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
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Policy Content */}
          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-emerald-600" />
                Information We Collect
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  SprinklerPro CRM collects information to provide and improve our irrigation management services. 
                  We collect information in the following ways:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Name, email address, company name, phone number</li>
                  <li><strong>Business Data:</strong> Client information, site addresses, inspection reports, photos</li>
                  <li><strong>Usage Information:</strong> How you use our service, features accessed, login times</li>
                  <li><strong>Device Information:</strong> IP address, browser type, mobile device information</li>
                  <li><strong>Location Data:</strong> GPS coordinates for inspection sites (with your permission)</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-emerald-600" />
                How We Use Your Information
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide, operate, and maintain our CRM service</li>
                  <li>Process your transactions and manage your account</li>
                  <li>Send you technical notices, updates, and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Analyze usage patterns to improve our service</li>
                  <li>Comply with legal obligations and enforce our terms</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Information Sharing</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties. 
                  We may share information only in these limited circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>With your consent:</strong> When you explicitly authorize sharing</li>
                  <li><strong>Service providers:</strong> Trusted partners who assist in operating our service</li>
                  <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business transfers:</strong> In connection with a merger, sale, or acquisition</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Data Security</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  We implement appropriate security measures to protect your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication requirements</li>
                  <li>Secure data centers and backup procedures</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Rights</h2>
              <div className="text-slate-700 space-y-4">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access and review your personal information</li>
                  <li>Request corrections to inaccurate data</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt-out of non-essential communications</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Cookies and Tracking</h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  We use cookies and similar technologies to enhance your experience, analyze usage, 
                  and provide personalized content. You can control cookie settings through your browser.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Children's Privacy</h2>
              <div className="text-slate-700">
                <p>
                  Our service is not intended for children under 13. We do not knowingly collect 
                  personal information from children under 13.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Changes to This Policy</h2>
              <div className="text-slate-700">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  significant changes by posting the new policy on this page and updating the 
                  "Last updated" date.
                </p>
              </div>
            </section>
          </div>

          {/* Contact Section */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact Us</h2>
            <div className="text-slate-700 space-y-3">
              <p>If you have questions about this Privacy Policy, please contact us:</p>
              <div className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>privacy@sprinklerprocrm.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>1-800-SPRINKLER</span>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 text-emerald-600 mt-0.5" />
                <div>
                  <p>SprinklerPro CRM</p>
                  <p>123 Business Ave</p>
                  <p>Phoenix, AZ 85001</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}