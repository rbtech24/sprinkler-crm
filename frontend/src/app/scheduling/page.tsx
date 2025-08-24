'use client'

import { useState, useEffect, useCallback } from 'react';

interface WorkOrder {
  id: string;
  title: string;
  client_name: string;
  site_address: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  estimated_hours: number;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_to?: string;
  assigned_tech_name?: string;
  required_skills: string[];
}

interface Technician {
  id: string;
  name: string;
  email: string;
  skills: Array<{
    skill_type: string;
    proficiency_level: string;
    years_experience: number;
  }>;
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
  current_workload: number;
}

interface AutoAssignSuggestion {
  technician_id: string;
  technician_name: string;
  skill_match_score: number;
  availability_score: number;
  workload_score: number;
  overall_score: number;
  reason: string;
}

const SchedulingPage = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'unscheduled' | 'technicians' | 'analytics'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string | null>(null);
  const [autoAssignSuggestions, setAutoAssignSuggestions] = useState<AutoAssignSuggestion[]>([]);
  const [showAutoAssign, setShowAutoAssign] = useState(false);

  const fetchWorkOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/scheduling/work-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    }
  }, []);

  const fetchTechnicians = useCallback(async () => {
    try {
      const response = await fetch('/api/scheduling/technicians', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      }
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAutoAssignSuggestions = async (workOrderId: string) => {
    try {
      const response = await fetch(`/api/scheduling/auto-assign/${workOrderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAutoAssignSuggestions(data);
        setShowAutoAssign(true);
      }
    } catch (error) {
      console.error('Failed to get auto-assign suggestions:', error);
    }
  };

  const assignWorkOrder = async (workOrderId: string, technicianId: string, date: string, time: string) => {
    try {
      const response = await fetch(`/api/scheduling/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          work_order_id: workOrderId,
          technician_id: technicianId,
          scheduled_date: date,
          scheduled_time: time
        })
      });
      
      if (response.ok) {
        fetchWorkOrders(); // Refresh the list
        setShowAutoAssign(false);
        setSelectedWorkOrder(null);
      }
    } catch (error) {
      console.error('Failed to assign work order:', error);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchTechnicians();
  }, [fetchWorkOrders, fetchTechnicians]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'scheduled': return 'text-purple-600 bg-purple-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const unscheduledWorkOrders = workOrders.filter(wo => wo.status === 'pending');
  const scheduledWorkOrders = workOrders.filter(wo => wo.status === 'scheduled' && wo.scheduled_date === selectedDate);

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Advanced Scheduling</h1>
        <p className="text-gray-600">Intelligent work order assignment and scheduling</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'calendar', label: 'Calendar View', count: scheduledWorkOrders.length },
            { key: 'unscheduled', label: 'Unscheduled', count: unscheduledWorkOrders.length },
            { key: 'technicians', label: 'Technicians', count: technicians.length },
            { key: 'analytics', label: 'Analytics', count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-900">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                id="date-select"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              {scheduledWorkOrders.length} work orders scheduled for {new Date(selectedDate).toLocaleDateString()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Time Slots */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Schedule for {new Date(selectedDate).toLocaleDateString()}
                  </h3>
                  
                  <div className="space-y-3">
                    {Array.from({ length: 10 }, (_, i) => {
                      const hour = i + 8; // Start at 8 AM
                      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
                      const workOrdersAtTime = scheduledWorkOrders.filter(wo => 
                        wo.scheduled_time?.startsWith(timeSlot)
                      );

                      return (
                        <div key={timeSlot} className="flex items-start space-x-4 p-3 border rounded-lg hover:bg-gray-50">
                          <div className="w-16 text-sm font-medium text-gray-500">
                            {timeSlot}
                          </div>
                          <div className="flex-1">
                            {workOrdersAtTime.length > 0 ? (
                              <div className="space-y-2">
                                {workOrdersAtTime.map(wo => (
                                  <div key={wo.id} className="flex items-center justify-between p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{wo.title}</p>
                                      <p className="text-xs text-gray-500">{wo.client_name} • {wo.assigned_tech_name}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(wo.priority)}`}>
                                      {wo.priority}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">Available</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Technician Availability */}
            <div>
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Technician Availability
                  </h3>
                  
                  <div className="space-y-3">
                    {technicians.map(tech => (
                      <div key={tech.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tech.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-xs text-gray-500">Available</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Workload</p>
                          <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(tech.current_workload, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unscheduled Work Orders */}
      {activeTab === 'unscheduled' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Unscheduled Work Orders ({unscheduledWorkOrders.length})
            </h3>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              Auto-Assign All
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {unscheduledWorkOrders.map((workOrder) => (
                <li key={workOrder.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(workOrder.priority)}`}>
                          {workOrder.priority}
                        </span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{workOrder.title}</p>
                        <p className="text-sm text-gray-500">{workOrder.client_name} • {workOrder.site_address}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">Required skills:</span>
                          {workOrder.required_skills.map((skill, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        {workOrder.estimated_hours}h estimated
                      </span>
                      <button
                        onClick={() => {
                          setSelectedWorkOrder(workOrder.id);
                          getAutoAssignSuggestions(workOrder.id);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Auto-Assign
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
            {unscheduledWorkOrders.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">✅</div>
                <p className="text-gray-500">All work orders are scheduled!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technicians Tab */}
      {activeTab === 'technicians' && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Technician Management</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicians.map((tech) => (
              <div key={tech.id} className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {tech.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">{tech.name}</h3>
                      <p className="text-sm text-gray-500">{tech.email}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
                    <div className="space-y-1">
                      {tech.skills.map((skill, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{skill.skill_type}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            skill.proficiency_level === 'expert' ? 'bg-green-100 text-green-800' :
                            skill.proficiency_level === 'advanced' ? 'bg-blue-100 text-blue-800' :
                            skill.proficiency_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {skill.proficiency_level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Workload</h4>
                      <span className="text-sm text-gray-500">{tech.current_workload}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          tech.current_workload > 80 ? 'bg-red-500' :
                          tech.current_workload > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(tech.current_workload, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Scheduling Analytics</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">📋</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Work Orders
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {workOrders.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">⏱️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Unscheduled
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {unscheduledWorkOrders.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">👷</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Available Techs
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {technicians.filter(t => t.current_workload < 80).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">⚡</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Avg Efficiency
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        87%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Assign Modal */}
      {showAutoAssign && selectedWorkOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Auto-Assign Suggestions
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {autoAssignSuggestions.map((suggestion) => (
                  <div key={suggestion.technician_id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {suggestion.technician_name}
                      </h4>
                      <span className="text-sm font-bold text-green-600">
                        {(suggestion.overall_score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                      <div>Skills: {(suggestion.skill_match_score * 100).toFixed(0)}%</div>
                      <div>Available: {(suggestion.availability_score * 100).toFixed(0)}%</div>
                      <div>Workload: {(suggestion.workload_score * 100).toFixed(0)}%</div>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-3">{suggestion.reason}</p>
                    
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        className="flex-1 text-xs rounded border-gray-300"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <input
                        type="time"
                        className="flex-1 text-xs rounded border-gray-300"
                        defaultValue="09:00"
                      />
                      <button 
                        onClick={() => assignWorkOrder(selectedWorkOrder, suggestion.technician_id, selectedDate, '09:00')}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAutoAssign(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingPage;
