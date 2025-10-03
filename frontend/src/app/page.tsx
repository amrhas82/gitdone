'use client';
import { useState } from 'react';
import { Plus, Trash2, Calendar, Users, Clock } from 'lucide-react';

interface Step {
  name: string;
  vendor_email: string;
  description: string;
  time_limit?: string;
}

export default function Home() {
  const [eventName, setEventName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [flowType, setFlowType] = useState<'sequential' | 'non_sequential'>('sequential');
  const [steps, setSteps] = useState<Step[]>([
    { name: '', vendor_email: '', description: '', time_limit: '' }
  ]);
  const [loading, setLoading] = useState(false);

  const addStep = () => {
    setSteps([...steps, { name: '', vendor_email: '', description: '', time_limit: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const createEvent = async () => {
    if (!eventName.trim() || !ownerEmail.trim()) {
      alert('Please fill in event name and your email');
      return;
    }

    const validSteps = steps.filter(step => 
      step.name.trim() && step.vendor_email.trim()
    );

    if (validSteps.length === 0) {
      alert('Please add at least one step with name and vendor email');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Creating event with data:', {
        name: eventName.trim(),
        owner_email: ownerEmail.trim(),
        flow_type: flowType,
        steps: validSteps.map(step => ({
          name: step.name.trim(),
          vendor_email: step.vendor_email.trim(),
          description: step.description.trim(),
          time_limit: step.time_limit?.trim() || null
        }))
      });

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventName.trim(),
          owner_email: ownerEmail.trim(),
          flow_type: flowType,
          steps: validSteps.map(step => ({
            name: step.name.trim(),
            vendor_email: step.vendor_email.trim(),
            description: step.description.trim(),
            time_limit: step.time_limit?.trim() || null
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Send magic links to all vendors using the actual step IDs from the response
        await sendMagicLinks(result.eventId, result.event.steps);
        
        alert(`Event created successfully! Event ID: ${result.eventId}`);
        // Redirect to event page
        window.location.href = `/event/${result.eventId}`;
      } else {
        alert('Error creating event: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLinks = async (eventId: string, steps: any[]) => {
    try {
      const promises = steps.map(step => 
        fetch('/api/magic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            step_id: step.id, // Use the actual step ID from the backend response
            vendor_email: step.vendor_email
          })
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending magic links:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create New Event
          </h1>
          <p className="text-lg text-gray-600">
            Set up a workflow with multiple steps and vendors
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          {/* Event Basic Info */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <Calendar className="mr-3 h-6 w-6 text-blue-600" />
              Event Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Sarah's Wedding, Kitchen Renovation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email *
                </label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="planner@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flow Type
              </label>
              <select
                value={flowType}
                onChange={(e) => setFlowType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sequential">Sequential (A → B → C)</option>
                <option value="non_sequential">Non-Sequential (A, B, C in any order)</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                {flowType === 'sequential' 
                  ? 'Steps must be completed in order' 
                  : 'Steps can be completed independently'
                }
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Users className="mr-3 h-6 w-6 text-green-600" />
                Steps & Vendors
              </h2>
              <button
                type="button"
                onClick={addStep}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </button>
            </div>
            
            {steps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Step {index + 1}
                  </h3>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700 flex items-center"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Step Name *
                    </label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Venue Setup, Catering Ready"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor Email *
                    </label>
                    <input
                      type="email"
                      value={step.vendor_email}
                      onChange={(e) => updateStep(index, 'vendor_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="vendor@email.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What needs to be done?"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Time Limit (Optional)
                  </label>
                  <input
                    type="text"
                    value={step.time_limit || ''}
                    onChange={(e) => updateStep(index, 'time_limit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 24 hours, 3 days, 1 week"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={createEvent}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Creating Event...' : 'Create Event & Send Invitations'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}