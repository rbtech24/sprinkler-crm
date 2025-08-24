'use client'

import Link from 'next/link'
import { 
  Droplets, 
  Shield, 
  CheckCircle, 
  Star, 
  Users, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  Award,
  Zap,
  BarChart3,
  MapPin,
  Calendar,
  FileText,
  Camera,
  Wrench,
  DollarSign,
  Smartphone,
  Gauge
} from 'lucide-react'
import { Button } from '@/components/ui'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-emerald-100 sticky top-0 z-50">
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
              <a href="#workflow" className="text-slate-600 hover:text-emerald-600 transition-colors">How It Works</a>
              <a href="#features" className="text-slate-600 hover:text-emerald-600 transition-colors">Features</a>
              <a href="#results" className="text-slate-600 hover:text-emerald-600 transition-colors">Results</a>
              <Link href="/support" className="text-slate-600 hover:text-emerald-600 transition-colors">Support</Link>
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

      {/* Hero Section - Industry Specific */}
      <section className="relative overflow-hidden bg-emerald-50">
        <div className="absolute inset-0 bg-[url('/api/placeholder/1200/800')] bg-cover bg-center opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Gauge className="w-4 h-4 mr-2" />
                Built by irrigation professionals, for irrigation professionals
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Stop Losing Money on
                <span className="block text-emerald-600">
                  Paperwork & Callbacks
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 max-w-2xl">
                The only CRM designed specifically for sprinkler repair contractors. Track every zone, 
                document every issue, and turn inspections into profitable work orders instantly.
              </p>
              
              {/* Pain Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center text-slate-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  <span>Handwritten inspection reports getting lost?</span>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  <span>Customers questioning repair estimates?</span>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  <span>Technicians forgetting follow-up appointments?</span>
                </div>
                <div className="flex items-center text-slate-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                  <span>Spending hours on administrative tasks?</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/register">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 text-lg font-semibold shadow-lg">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <div className="mt-6 flex items-center space-x-6 text-slate-500 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
                  <span>No contracts</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            {/* Interactive Demo Card */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-500 p-4">
                    <div className="flex items-center justify-between text-white">
                      <span className="font-semibold">Inspection in Progress</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                        <span className="text-sm">Live</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <MapPin className="w-5 h-5 text-emerald-600 mr-2" />
                      <span className="font-medium text-slate-900">Smith Residence - Zone 4</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                        <span className="text-red-700 font-medium">Broken sprinkler head</span>
                        <Camera className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <span className="text-yellow-700 font-medium">Low water pressure</span>
                        <Gauge className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <span className="text-emerald-700 font-medium">Zone 1-3: Perfect</span>
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Estimated Repair Cost:</span>
                        <span className="font-bold text-2xl text-emerald-600">$185</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section - Industry Specific */}
      <section id="workflow" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              From Inspection to Payment in 3 Simple Steps
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Designed specifically for the sprinkler repair workflow - no generic CRM confusion.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-emerald-50 rounded-2xl p-8 h-full border border-emerald-100">
                <div className="w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                  <Smartphone className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Digital Inspections</h3>
                <p className="text-slate-600 mb-6">
                  Walk through each irrigation zone with guided checklists. Take photos, record issues, 
                  and document system condition - all on your phone or tablet.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Zone-by-zone inspection workflow</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Photo documentation with GPS tagging</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Offline mode for spotty cell coverage</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="relative">
              <div className="bg-blue-50 rounded-2xl p-8 h-full border border-blue-100">
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Instant Estimates</h3>
                <p className="text-slate-600 mb-6">
                  Convert inspection findings into professional estimates automatically. 
                  Pre-loaded with common sprinkler repair costs and parts.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Smart pricing based on your rates</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Professional PDF reports with photos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Email & text delivery to customers</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="relative">
              <div className="bg-purple-50 rounded-2xl p-8 h-full border border-purple-100">
                <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                  <Wrench className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Work Orders & Payment</h3>
                <p className="text-slate-600 mb-6">
                  Approved estimates become work orders automatically. Track progress, 
                  manage parts, and collect payment - all in one place.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Technician scheduling & dispatch</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Before/after photo tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">Digital signatures & payment processing</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section - Real Industry Metrics */}
      <section id="results" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Real Results from Sprinkler Repair Contractors
            </h2>
            <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
              Stop guessing about ROI. Here&apos;s what happens when you digitize your workflow.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-emerald-400 mb-2">3.2x</div>
              <div className="text-white font-semibold mb-2">More Estimates Sent</div>
              <div className="text-emerald-100 text-sm">
                Turn every inspection into a revenue opportunity
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-blue-400 mb-2">47%</div>
              <div className="text-white font-semibold mb-2">Higher Closing Rate</div>
              <div className="text-blue-100 text-sm">
                Professional reports build customer trust
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-purple-400 mb-2">8hrs</div>
              <div className="text-white font-semibold mb-2">Saved Per Week</div>
              <div className="text-purple-100 text-sm">
                Less paperwork, more billable hours
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-4xl lg:text-5xl font-bold text-yellow-400 mb-2">92%</div>
              <div className="text-white font-semibold mb-2">Customer Satisfaction</div>
              <div className="text-yellow-100 text-sm">
                Transparent process, happy customers
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry-Specific Features */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Built for Irrigation Professionals
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Every feature designed around the unique challenges of sprinkler repair and maintenance.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Zone Mapping & GPS</h3>
              </div>
              <p className="text-slate-600 mb-6 text-lg">
                Never lose track of problem areas again. Map each irrigation zone with GPS coordinates, 
                document specific sprinkler head locations, and build a digital property history.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" />
                  <span className="text-slate-700">GPS-tagged issue documentation</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" />
                  <span className="text-slate-700">Visual zone mapping with photos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" />
                  <span className="text-slate-700">Historical maintenance records per zone</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                  <span className="font-medium text-emerald-800">Zone 1 - Front Lawn</span>
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-yellow-800">Zone 2 - Side Garden</span>
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <span className="font-medium text-red-800">Zone 3 - Back Yard</span>
                  <span className="text-red-600 text-sm">2 Issues Found</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Smart Pricing Engine</h3>
              </div>
              <p className="text-slate-600 mb-6 text-lg">
                Pre-loaded with common sprinkler repair costs, part prices, and labor rates. 
                Automatically calculate estimates based on your inspection findings and local market rates.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                  <span className="text-slate-700">Customizable pricing templates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                  <span className="text-slate-700">Material cost database with updates</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                  <span className="text-slate-700">Profit margin tracking and optimization</span>
                </li>
              </ul>
            </div>
            <div className="lg:order-1">
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Sprinkler Head Replacement (4x)</span>
                    <span className="font-semibold">$120</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Valve Repair - Zone 3</span>
                    <span className="font-semibold">$85</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Labor (2 hours)</span>
                    <span className="font-semibold">$180</span>
                  </div>
                  <hr className="border-slate-200" />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Estimate</span>
                    <span className="text-emerald-600">$385</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Industry Specific */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Trusted by Sprinkler Repair Professionals
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg">
                &quot;Finally dropped our paper clipboards for good. SprinklerPro has doubled our estimate 
                conversion rate and our customers love the detailed photo reports.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-emerald-600 font-semibold">MR</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Mike Rodriguez</div>
                  <div className="text-slate-600">Desert Springs Irrigation, Phoenix</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg">
                &quot;The zone mapping feature is a game-changer. We can track problem areas across 
                multiple visits and show customers exactly what needs attention.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-semibold">SJ</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Sarah Johnson</div>
                  <div className="text-slate-600">GreenScape Irrigation, Austin</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
              <div className="flex items-center mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg">
                &quot;Best investment we&apos;ve made in years. Saves us 10+ hours per week on paperwork 
                and our techs actually enjoy using it in the field.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-purple-600 font-semibold">TC</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Tom Chen</div>
                  <div className="text-slate-600">Precision Sprinklers, San Diego</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Ditch the Clipboard Forever?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
              Join hundreds of sprinkler repair contractors who&apos;ve already transformed their business. 
              Start your free trial today - no credit card required.
            </p>
            <div className="flex justify-center">
              <Link href="/auth/register">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 text-lg font-semibold shadow-lg">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-white/80 mt-6 text-sm">
              14-day free trial • No contracts • Cancel anytime • Dedicated support
            </p>
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
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#results" className="hover:text-white transition-colors">Results</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/support" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Training Videos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Phone Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Industry Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-400">
                © 2024 SprinklerPro CRM. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}