'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Mail, Calendar, Users, BarChart3, RefreshCw } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  status: string;
  flow_type: string;
  created_at: string;
  completed_at?: string;
  progress: number;
  completed_steps: number;
  total_steps: number;
  steps: Array<{
    id: string;
    name: string;
    vendor_email: string;
    status: string;
    description: string;
    time_limit?: string;
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

export default function EventPage() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    fetchEvent();
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events?id=${params.id}`);
      const eventData = await response.json();
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (stepId: string) => {
    setSendingReminder(stepId);
    try {
      const response = await fetch('/api/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: params.id,
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
    } finally {
      setSendingReminder(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-600" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist.</p>
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
                  <Calendar className="mr-2 h-4 w-4" />
                  Created: {new Date(event.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {event.flow_type === 'sequential' ? 'Sequential' : 'Non-Sequential'} Flow
                </span>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Progress</h3>
              <span className="text-sm text-gray-600">
                {event.completed_steps} of {event.total_steps} steps completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${event.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{event.progress}% complete</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Steps</p>
                  <p className="text-2xl font-bold text-blue-900">{event.total_steps}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{event.completed_steps}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{event.total_steps - event.completed_steps}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Timeline</h2>
          
          <div className="space-y-6">
            {event.steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4 p-6 border border-gray-200 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(step.status)}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(step.status)}`}>
                        {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" />
                      {step.vendor_email}
                    </p>
                    {step.description && (
                      <p>{step.description}</p>
                    )}
                    {step.time_limit && (
                      <p className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        Time limit: {step.time_limit}
                      </p>
                    )}
                    {step.completed_at && (
                      <p className="text-green-600 font-medium">
                        Completed: {new Date(step.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  {step.status === 'pending' && (
                    <button
                      onClick={() => sendReminder(step.id)}
                      disabled={sendingReminder === step.id}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-400 flex items-center"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {sendingReminder === step.id ? 'Sending...' : 'Send Reminder'}
                    </button>
                  )}
                  
                  {step.status === 'completed' && (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {event.commits.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
            
            <div className="space-y-4">
              {event.commits.slice(-5).reverse().map((commit, index) => {
                const step = event.steps.find(s => s.id === commit.step_id);
                return (
                  <div key={commit.commit_hash} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{step?.name}</h4>
                      <p className="text-sm text-gray-600">
                        Completed by {commit.vendor_email} • {new Date(commit.timestamp).toLocaleString()}
                      </p>
                      {commit.comments && (
                        <p className="text-sm text-gray-700 mt-1">"{commit.comments}"</p>
                      )}
                      {commit.files.length > 0 && (
                        <p className="text-sm text-blue-600 mt-1">
                          {commit.files.length} file(s) uploaded
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}