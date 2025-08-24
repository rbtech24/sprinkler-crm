'use client'

import Link from 'next/link'
import { 
  Droplets, 
  ArrowRight,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Headphones
} from 'lucide-react'
import { Button } from '@/components/ui'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-emerald-700">
                  SprinklerPro CRM
                </h1>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/#features" className="text-slate-600 hover:text-emerald-600 transition-colors">Features</Link>
              <span className="text-emerald-600 font-medium">Support</span>
              <Link 
                href="/auth/login" 
                className="text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link href="/auth/register">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-emerald-50">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Headphones className="w-4 h-4 mr-2" />
              Dedicated support for irrigation professionals
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
              Get the Help You Need
              <span className="block text-emerald-600">
                When You Need It
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Our support team understands the sprinkler repair industry. Get expert help with setup, 
              training, and troubleshooting from people who know your business.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Multiple Ways to Get Support
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Choose the support method that works best for your schedule and preferred communication style.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Live Chat</h3>
              <p className="text-slate-600 mb-6">
                Get instant help with quick questions. Our chat support is available during business hours 
                with typical response times under 2 minutes.
              </p>
              <div className="flex items-center justify-center text-emerald-600 font-semibold mb-4">
                <Clock className="w-4 h-4 mr-2" />
                Mon-Fri 7AM-7PM PST
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                Start Chat
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Phone Support</h3>
              <p className="text-slate-600 mb-6">
                Speak directly with our irrigation industry experts. Perfect for complex setup questions 
                or detailed troubleshooting sessions.
              </p>
              <div className="flex items-center justify-center text-blue-600 font-semibold mb-4">
                <Phone className="w-4 h-4 mr-2" />
                (888) 555-SPRINKLER
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                Call Now
                <Phone className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="bg-purple-50 rounded-2xl p-8 border border-purple-100 text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Email Support</h3>
              <p className="text-slate-600 mb-6">
                Send detailed questions with screenshots or attachments. Great for account setup, 
                billing questions, or feature requests.
              </p>
              <div className="flex items-center justify-center text-purple-600 font-semibold mb-4">
                <Clock className="w-4 h-4 mr-2" />
                24hr response time
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                Send Email
                <Mail className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Still Need Help?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Can't find what you're looking for? Our irrigation industry experts are standing by 
              to help you succeed with SprinklerPro CRM.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 text-lg font-semibold shadow-lg">
                Contact Support Team
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/auth/register">
                <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-8 py-4 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><span className="text-white">Help Center</span></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-400">
                © 2024 SprinklerPro CRM. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}