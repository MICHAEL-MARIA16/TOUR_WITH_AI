import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { apiService } from './services/api';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import DashboardPage from './components/DashboardPage';
import TripPlannerPage from './components/TripPlannerPage';
import ChatBot from './components/ChatBot';
import { Toaster } from 'react-hot-toast';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);

  const checkConnection = async () => {
    try {
      const healthCheckResponse = await apiService.healthCheck();
      if (healthCheckResponse?.status === 'OK' || healthCheckResponse?.success === true) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
      
    } catch (error) {
      console.error('Backend connection failed:', error);
      setIsConnected(false);
    } finally {
      setConnectionChecked(true);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setConnectionChecked(false);
    checkConnection();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={setCurrentPage} isConnected={isConnected} />;
      case 'dashboard':
        return <DashboardPage onPageChange={setCurrentPage} isConnected={isConnected} onRetry={handleRetry} />;
      case 'planner':
        return <TripPlannerPage isConnected={isConnected} onRetry={handleRetry} />;
      case 'chat':
        return <ChatBot onClose={() => setCurrentPage('home')} />;
      default:
        return <HomePage onPageChange={setCurrentPage} isConnected={isConnected} />;
    }
  };

  if (!connectionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting to TourWithAI</h2>
          <p className="text-gray-600">Checking backend server connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="bottom-right" />
      <Navigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      {renderPage()}
    </div>
  );
};

export default App;