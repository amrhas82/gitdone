'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Edit3, Plus, Mail, Save, Trash2, Clock, Users, BarChart3 } from 'lucide-react';
// import { formatTimeLimit, getTimeLimitStatus } from '../../utils/timeFormat';

interface Event {
  id: string;
  name: string;
  owner_email: string;
  flow_type: string;
  status: string;
  created_at: string;
  completed_at?: string;
  steps: Array<{
    id: string;
    name: string;
    vendor_email: string;
    status: string;
    description: string;
    time_limit?: string;
    sequence?: number;
    created_at: string;
    completed_at?: string;
  }>;
  commits: Array<{
    commit_hash: string;
    step_id: string;
    vendor_email: string;
    timestamp: string;
    files: string[];
    comments: string;
  }>;
}

export default function ManagePage() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newStep, setNewStep] = useState({
    name: '',
    vendor_email: '',
    description: '',
    time_limit: '',
    sequence: 1
  });
  const [showAddStep, setShowAddStep] = useState(false);

  useEffect(() => {
    validateToken();
  }, [params.token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/manage/${params.token}`);
      const data = await response.json();
      
      if (data.valid) {
        setEvent(data.event_info);
      } else {
        setError(data.error || 'Invalid or expired link');
      }
    } catch (error) {
      setError('Error validating link');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!event) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/manage/${params.token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: event.name,
          flow_type: event.flow_type,
          steps: event.steps
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setEvent(result.event);
        setEditing(false);
        alert('Changes saved successfully!');
      } else {
        alert('Error saving changes: ' + result.error);
      }
    } catch (error) {
      alert('Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const addStep = async () => {
    if (!newStep.name.trim() || !newStep.vendor_email.trim()) {
      alert('Please fill in step name and vendor email');
      return;
    }

    try {
      const response = await fetch(`/api/manage/${params.token}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStep)
      });
      
      const result = await response.json();
      if (result.success) {
        setEvent(prev => prev ? { ...prev, steps: [...prev.steps, result.step] } : null);
        setNewStep({ name: '', vendor_email: '', description: '', time_limit: '', sequence: 1 });
        setShowAddStep(false);
        alert('Step added successfully!');
      } else {
        alert('Error adding step: ' + result.error);
      }
    } catch (error) {
      alert('Error adding step');
    }
  };

  const sendReminder = async (stepId: string) => {
    try {
      const response = await fetch('/api/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event?.id,
          step_id: stepId,
          vendor_email: event?.steps.find(s => s.id === stepId)?.vendor_email
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Reminder sent successfully!');
      } else {
        alert('Error sending reminder: ' + result.error);
      }
    } catch (error) {
      alert('Error sending reminder');
    }
  };

  const updateStep = (stepId: string, field: string, value: string) => {
    if (!event) return;
    
    setEvent({
      ...event,
      steps: event.steps.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      )
    });
  };

  const removeStep = (stepId: string) => {
    if (!event) return;
    
    if (confirm('Are you sure you want to remove this step?')) {
      setEvent({
        ...event,
        steps: event.steps.filter(step => step.id !== stepId)
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {event.flow_type === 'sequential' ? 'Sequential' : 
                   event.flow_type === 'non_sequential' ? 'Non-Sequential' : 'Hybrid'} Flow
                </span>
                <span className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Created: {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit Event
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Event Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Steps</p>
                  <p className="text-2xl font-bold text-blue-900">{event.steps.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {event.steps.filter(s => s.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {event.steps.filter(s => s.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Management */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Steps Management</h2>
            {editing && (
              <button
                onClick={() => setShowAddStep(!showAddStep)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </button>
            )}
          </div>

          {/* Add Step Form */}
          {showAddStep && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Step</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Step Name *</label>
                  <input
                    type="text"
                    value={newStep.name}
                    onChange={(e) => setNewStep({ ...newStep, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Venue Setup"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Email *</label>
                  <input
                    type="email"
                    value={newStep.vendor_email}
                    onChange={(e) => setNewStep({ ...newStep, vendor_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="vendor@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={newStep.description}
                    onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What needs to be done?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit</label>
                  <div className="space-y-2">
                    <select
                      value={newStep.time_limit}
                      onChange={(e) => setNewStep({ ...newStep, time_limit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No time limit</option>
                      <option value="30m">30 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="2h">2 hours</option>
                      <option value="4h">4 hours</option>
                      <option value="6h">6 hours</option>
                      <option value="12h">12 hours</option>
                      <option value="16h">16 hours</option>
                      <option value="24h">24 hours</option>
                      <option value="2d">2 days</option>
                      <option value="3d">3 days</option>
                      <option value="1w">1 week</option>
                    </select>
                    <input
                      type="text"
                      value={newStep.time_limit}
                      onChange={(e) => setNewStep({ ...newStep, time_limit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Or enter custom: 2024-12-25, Dec 25 2024 2:00 PM"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => setShowAddStep(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={addStep}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Step
                </button>
              </div>
            </div>
          )}

          {/* Steps List */}
          <div className="space-y-4">
            {event.steps.map((step, index) => (
              <div key={step.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step.sequence || (index + 1)}
                    </div>
                    {editing ? (
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                        className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      step.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {step.status}
                    </span>
                    {editing && (
                      <button
                        onClick={() => removeStep(step.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Email</label>
                    {editing ? (
                      <input
                        type="email"
                        value={step.vendor_email}
                        onChange={(e) => updateStep(step.id, 'vendor_email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600">{step.vendor_email}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    {editing ? (
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600">{step.description || 'No description'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit</label>
                    {editing ? (
                      <div className="space-y-2">
                        <select
                          value={step.time_limit || ''}
                          onChange={(e) => updateStep(step.id, 'time_limit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">No time limit</option>
                          <option value="30m">30 minutes</option>
                          <option value="1h">1 hour</option>
                          <option value="2h">2 hours</option>
                          <option value="4h">4 hours</option>
                          <option value="6h">6 hours</option>
                          <option value="12h">12 hours</option>
                          <option value="16h">16 hours</option>
                          <option value="24h">24 hours</option>
                          <option value="2d">2 days</option>
                          <option value="3d">3 days</option>
                          <option value="1w">1 week</option>
                        </select>
                        <input
                          type="text"
                          value={step.time_limit || ''}
                          onChange={(e) => updateStep(step.id, 'time_limit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Or enter custom"
                        />
                      </div>
                    ) : (
                      <div className="text-gray-600">
                        {step.time_limit ? (
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-blue-600">
                              {step.time_limit}
                            </span>
                          </div>
                        ) : (
                          'No time limit'
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
                    {step.status === 'pending' && (
                      <button
                        onClick={() => sendReminder(step.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center"
                      >
                        <Mail className="mr-1 h-3 w-3" />
                        Send Reminder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}