'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input, Badge } from '@/components/ui'
import { PlusCircle, Search, FileText, DollarSign, Package } from 'lucide-react'

interface PriceBook {
  id: number
  name: string
  description: string
  items_count: number
  is_active: boolean
  last_updated: string
  created_at: string
}

interface PriceBookItem {
  id: number
  name: string
  category: string
  unit_price: number
  unit: string
}

export default function PriceBooksPage() {
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Mock data for now
  const mockPriceBooks: PriceBook[] = [
    {
      id: 1,
      name: "Standard Pricing 2024",
      description: "Current pricing for residential services and parts",
      items_count: 156,
      is_active: true,
      last_updated: "2024-01-15",
      created_at: "2024-01-01"
    },
    {
      id: 2,
      name: "Commercial Rates",
      description: "Specialized pricing for commercial irrigation systems",
      items_count: 89,
      is_active: true,
      last_updated: "2024-01-10",
      created_at: "2023-12-15"
    },
    {
      id: 3,
      name: "Winter Services",
      description: "Seasonal pricing for winterization and spring startup",
      items_count: 24,
      is_active: false,
      last_updated: "2023-11-20",
      created_at: "2023-10-01"
    }
  ]

  const filteredPriceBooks = mockPriceBooks.filter(book => 
    book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout title="Price Books">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Books</h1>
            <p className="text-gray-600">Manage pricing for services and parts</p>
          </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Package className="h-5 w-5 mr-2" />
            Import Items
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            New Price Book
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search price books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Price Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPriceBooks.map((book) => (
          <Card key={book.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{book.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{book.description}</p>
                  </div>
                </div>
                <Badge variant={book.is_active ? "default" : "secondary"}>
                  {book.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {book.items_count} pricing items
                  </span>
                </div>

                <div className="text-sm text-gray-500">
                  Last updated: {book.last_updated}
                </div>

                <div className="text-sm text-gray-500">
                  Created: {book.created_at}
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Items
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPriceBooks.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No price books found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No price books match your search criteria.' : 'Create your first price book to manage pricing.'}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            New Price Book
          </Button>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}