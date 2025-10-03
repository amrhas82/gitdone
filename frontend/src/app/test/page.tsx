'use client';
import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<string>('');

  const testAPI = async () => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Event',
          owner_email: 'test@example.com',
          flow_type: 'sequential',
          steps: [
            {
              name: 'Test Step',
              vendor_email: 'vendor@example.com',
              description: 'Test description'
            }
          ]
        })
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Test Page</h1>
        
        <button
          onClick={testAPI}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mb-4"
        >
          Test Create Event API
        </button>
        
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}