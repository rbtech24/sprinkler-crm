'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, MapPin, Calendar, User } from 'lucide-react';

interface Client {
  id: number;
  name: string;
  sites: Site[];
}

interface Site {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface Technician {
  id: number;
  full_name: string;
  role: string;
}

export default function CreateWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'repair',
    priority: 'medium',
    scheduled_start: '',
    estimated_duration: '',
    tech_id: '',
    notes: ''
  });

  // Fetch clients and technicians on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // Fetch clients with sites
        const clientsResponse = await fetch('/api/clients', { headers });
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.data || []);
        }

        // Fetch technicians
        const techResponse = await fetch('/api/users?role=tech', { headers });
        if (techResponse.ok) {
          const techData = await techResponse.json();
          setTechnicians(techData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.title || !formData.description || !selectedSite) {
        setError('Title, description, and site are required');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          site_id: parseInt(selectedSite),
          estimated_duration: formData.estimated_duration ? parseFloat(formData.estimated_duration) : null,
          tech_id: formData.tech_id ? parseInt(formData.tech_id) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create work order');
      }

      const workOrder = await response.json();
      router.push(`/work-orders/${workOrder.id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedClientData = clients.find(c => c.id.toString() === selectedClient);
  const availableSites = selectedClientData?.sites || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Work Order</h1>
          <p className="text-gray-600">Schedule new work or maintenance</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter work order title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the work to be performed"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="installation">Installation</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scheduling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scheduled_start">Scheduled Start</Label>
                  <Input
                    id="scheduled_start"
                    type="datetime-local"
                    value={formData.scheduled_start}
                    onChange={(e) => handleInputChange('scheduled_start', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_duration">Estimated Duration (hours)</Label>
                  <Input
                    id="estimated_duration"
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimated_duration}
                    onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                    placeholder="e.g., 2.5"
                  />
                </div>

                <div>
                  <Label htmlFor="tech_id">Assign Technician</Label>
                  <Select value={formData.tech_id} onValueChange={(value) => handleInputChange('tech_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.full_name} ({tech.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client">Client *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="site">Site *</Label>
                  <Select 
                    value={selectedSite} 
                    onValueChange={setSelectedSite}
                    disabled={!selectedClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSites.map(site => (
                        <SelectItem key={site.id} value={site.id.toString()}>
                          <div>
                            <div className="font-medium">{site.name}</div>
                            <div className="text-sm text-gray-500">
                              {site.address}, {site.city}, {site.state}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSite && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Selected Site:</p>
                    {availableSites.find(s => s.id.toString() === selectedSite) && (
                      <div className="text-sm text-gray-600 mt-1">
                        {availableSites.find(s => s.id.toString() === selectedSite)?.name}<br />
                        {availableSites.find(s => s.id.toString() === selectedSite)?.address}<br />
                        {availableSites.find(s => s.id.toString() === selectedSite)?.city}, {availableSites.find(s => s.id.toString() === selectedSite)?.state}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes or special instructions"
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
