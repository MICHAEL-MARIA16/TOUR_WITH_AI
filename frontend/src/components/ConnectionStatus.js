import React from 'react';
import { AlertCircle } from 'lucide-react';

const ConnectionStatus = ({ isConnected, onRetry }) => {
  if (isConnected) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <AlertCircle className="text-yellow-600" size={20} />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800">Backend Server Not Connected</h3>
          <p className="text-yellow-700 text-sm mt-1">
            Make sure your backend server is running on <strong>http://localhost:5000</strong>
          </p>
        </div>
        <button
          onClick={onRetry}
          className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatus;