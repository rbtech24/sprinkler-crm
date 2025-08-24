'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui'
import { Button, Input, Badge } from '@/components/ui'
import { useState } from 'react'
import { PlusCircle, Search, User, Mail, Phone, Shield, MoreVertical } from 'lucide-react'

interface UserAccount {
  id: number
  name: string
  email: string
  phone?: string
  role: 'owner' | 'admin' | 'manager' | 'tech' | 'dispatcher'
  status: 'active' | 'pending' | 'inactive'
  lastLogin?: string
  joinedAt: string
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')

  // Mock data for now
  const mockUsers: UserAccount[] = [
    {
      id: 1,
      name: "John Smith",
      email: "john@company.com",
      phone: "(555) 123-4567",
      role: 'owner',
      status: 'active',
      lastLogin: "2024-01-15 10:30 AM",
      joinedAt: "2023-12-01"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah@company.com",
      phone: "(555) 234-5678",
      role: 'admin',
      status: 'active',
      lastLogin: "2024-01-15 09:15 AM",
      joinedAt: "2023-12-15"
    },
    {
      id: 3,
      name: "Mike Rodriguez",
      email: "mike@company.com",
      phone: "(555) 345-6789",
      role: 'tech',
      status: 'active',
      lastLogin: "2024-01-14 04:45 PM",
      joinedAt: "2024-01-01"
    },
    {
      id: 4,
      name: "David Chen",
      email: "david@company.com",
      role: 'tech',
      status: 'pending',
      joinedAt: "2024-01-10"
    }
  ]

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    
    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'dispatcher': return 'bg-green-100 text-green-800'
      case 'tech': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const roleLabels = {
    owner: 'Company Owner',
    admin: 'Administrator', 
    manager: 'Manager',
    dispatcher: 'Dispatcher',
    tech: 'Technician'
  }

  return (
    <DashboardLayout title="Users & Permissions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users & Permissions</h1>
            <p className="text-gray-600">Manage user accounts and access levels</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-5 w-5 mr-2" />
            Invite User
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant={filterRole === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterRole('all')}
              size="sm"
            >
              All Roles
            </Button>
            <Button 
              variant={filterRole === 'admin' ? 'default' : 'outline'}
              onClick={() => setFilterRole('admin')}
              size="sm"
            >
              Admin
            </Button>
            <Button 
              variant={filterRole === 'tech' ? 'default' : 'outline'}
              onClick={() => setFilterRole('tech')}
              size="sm"
            >
              Technicians
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {mockUsers.filter(u => u.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {mockUsers.filter(u => u.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending Invites</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {mockUsers.filter(u => u.role === 'tech').length}
              </div>
              <div className="text-sm text-gray-600">Technicians</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {mockUsers.filter(u => ['owner', 'admin', 'manager'].includes(u.role)).length}
              </div>
              <div className="text-sm text-gray-600">Admin Users</div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getRoleColor(user.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin || 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.joinedAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No users match your search criteria.' : 'Invite your first user to get started.'}
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-5 w-5 mr-2" />
              Invite User
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}