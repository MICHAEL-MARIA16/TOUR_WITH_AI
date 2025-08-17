import React from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Server,
  Brain
} from 'lucide-react';

const ConnectionStatus = ({ isConnected, onRetry, error = null }) => {
  if (isConnected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Wifi className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-green-800">
              AI Backend Connected
            </h3>
            <p className="text-green-600">
              All features are available and ready to use.
            </p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 text-sm font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-8">
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <WifiOff className="h-8 w-8 text-red-600" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-red-800 mb-2">
          Backend Connection Failed
        </h3>

        {/* Error Message */}
        <p className="text-red-600 mb-6">
          {error || 'Unable to connect to the AI backend server. Some features may not be available.'}
        </p>

        {/* Troubleshooting */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-red-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center justify-center">
            <Server className="mr-2 h-5 w-5" />
            Troubleshooting Steps
          </h4>
          <div className="text-left space-y-3 text-sm text-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <div>
                <strong>Check Backend Server:</strong> Make sure your backend server is running on port 5000
                <div className="text-gray-500 mt-1">
                  Run: <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code> in your backend directory
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <div>
                <strong>Verify Database:</strong> Ensure MongoDB is running and connected
                <div className="text-gray-500 mt-1">
                  Check your database connection in the backend logs
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">3</span>
              </div>
              <div>
                <strong>Check Network:</strong> Verify your internet connection
                <div className="text-gray-500 mt-1">
                  Backend URL: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:5000</code>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">4</span>
              </div>
              <div>
                <strong>Environment Variables:</strong> Check if all required environment variables are set
                <div className="text-gray-500 mt-1">
                  MONGODB_URI, GEMINI_API_KEY (optional), etc.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h4 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center justify-center">
            <Brain className="mr-2 h-5 w-5" />
            Feature Availability
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span>AI Trip Planning</span>
              <span className="text-red-600 font-medium">Offline</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span>AI Assistant Chat</span>
              <span className="text-red-600 font-medium">Offline</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span>Route Optimization</span>
              <span className="text-red-600 font-medium">Offline</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span>Interactive Maps</span>
              <span className="text-yellow-600 font-medium">Limited</span>
            </div>
          </div>
          <p className="text-yellow-700 text-sm mt-3">
            Maps will work with OpenStreetMap, but backend-dependent features are unavailable.
          </p>
        </div>

        {/* Retry Button */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={onRetry}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Retry Connection
          </button>
          
          <a
            href="http://localhost:5000/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Server className="mr-2 h-5 w-5" />
            Test Backend
          </a>
        </div>

        {/* Quick Setup Guide */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-2">Quick Setup (Backend)</h5>
          <div className="text-left text-sm text-gray-700 space-y-1">
            <div><code className="bg-gray-200 px-2 py-1 rounded text-xs">cd backend</code></div>
            <div><code className="bg-gray-200 px-2 py-1 rounded text-xs">npm install</code></div>
            <div><code className="bg-gray-200 px-2 py-1 rounded text-xs">npm run seed</code> (first time only)</div>
            <div><code className="bg-gray-200 px-2 py-1 rounded text-xs">npm run dev</code></div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-4 text-sm text-gray-600">
          <p>
            Need help? Check the console for detailed error messages or 
            <a href="#" className="text-blue-600 hover:text-blue-700 ml-1">view documentation</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;