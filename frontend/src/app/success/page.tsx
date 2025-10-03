'use client';
import { CheckCircle, Home, Calendar } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Step Completed!
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Thank you for completing your task. Your work has been recorded and the event organizer has been notified.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center"
            >
              <Home className="mr-2 h-5 w-5" />
              Create New Event
            </button>
            
            <p className="text-sm text-gray-500">
              You can close this page or create a new event to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}