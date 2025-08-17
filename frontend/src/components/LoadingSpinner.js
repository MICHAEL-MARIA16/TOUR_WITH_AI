import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = '', 
  className = '',
  color = 'blue' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader 
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      />
      {message && (
        <p className={`mt-3 text-sm ${colorClasses[color]} animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;