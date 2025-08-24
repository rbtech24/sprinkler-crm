'use client';

import { useState, useEffect, useCallback } from 'react';

interface Communication {
  id: string;
  client_id: string;
  client_name: string;
  communication_type: 'email' | 'phone' | 'meeting' | 'text' | 'note';
  subject?: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'completed';
  scheduled_date?: string;
  completed_date?: string;
  follow_up_date?: string;
  tags: string[];
  created_at: string;
  user_name: string;
}

interface CommunicationTemplate {
  id: string;
  name: string;
  template_type: 'email' | 'text' | 'follow_up';
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
}

type TabType = 'communications' | 'templates' | 'scheduled';

const CommunicationsPage = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('communications');
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
    dateRange: '30'
  });

  const fetchCommunications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.dateRange !== 'all') params.append('days', filter.dateRange);

      const response = await fetch(`/api/communications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommunications(data);
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/communications/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, []);

  useEffect(() => {
    fetchCommunications();
    fetchTemplates();
  }, [fetchCommunications, fetchTemplates]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return '✉️';
      case 'phone': return '📞';
      case 'meeting': return '🤝';
      case 'text': return '💬';
      case 'note': return '📝';
      default: return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'sent': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Communications</h1>
        <p className="text-gray-600">Manage customer interactions and follow-ups</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'communications', label: 'All Communications', count: communications.length },
            { key: 'templates', label: 'Templates', count: templates.length },
            { key: 'scheduled', label: 'Scheduled', count: communications.filter(c => c.status === 'scheduled').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-900">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <select
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="meeting">Meeting</option>
            <option value="text">Text</option>
            <option value="note">Note</option>
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filter.dateRange}
            onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div className="space-x-3">
          {activeTab === 'communications' && (
            <button
              onClick={() => console.log('New communication modal would open')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              + New Communication
            </button>
          )}
          {activeTab === 'templates' && (
            <button
              onClick={() => console.log('New template modal would open')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              + New Template
            </button>
          )}
        </div>
      </div>

      {/* Communications List */}
      {activeTab === 'communications' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {communications.map((comm) => (
              <li key={comm.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getTypeIcon(comm.communication_type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {comm.client_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {comm.subject || comm.communication_type.charAt(0).toUpperCase() + comm.communication_type.slice(1)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        by {comm.user_name} • {new Date(comm.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comm.status)}`}>
                      {comm.status}
                    </span>
                    {comm.follow_up_date && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Follow-up: {new Date(comm.follow_up_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 line-clamp-2">{comm.content}</p>
                  {comm.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {comm.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {communications.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">💬</div>
              <p className="text-gray-500">No communications found</p>
              <button
                onClick={() => console.log('Add first communication')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Add your first communication
              </button>
            </div>
          )}
        </div>
      )}

      {/* Templates List */}
      {activeTab === 'templates' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {templates.map((template) => (
              <li key={template.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.template_type}</p>
                    {template.subject && (
                      <p className="text-xs text-gray-400 mt-1">Subject: {template.subject}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.is_active ? 'text-green-800 bg-green-100' : 'text-gray-800 bg-gray-100'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                  {template.variables.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Variables: {template.variables.join(', ')}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {templates.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📄</div>
              <p className="text-gray-500">No templates found</p>
              <button
                onClick={() => console.log('Create first template')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Create your first template
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Communications */}
      {activeTab === 'scheduled' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {communications.filter(c => c.status === 'scheduled').map((comm) => (
              <li key={comm.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getTypeIcon(comm.communication_type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{comm.client_name}</p>
                      <p className="text-sm text-gray-500">{comm.subject || comm.communication_type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Scheduled: {comm.scheduled_date && new Date(comm.scheduled_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Send Now
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CommunicationsPage;
