import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { apiService } from './services/api';

// Components
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TripPlannerPage from './pages/TripPlannerPage';
import AIAssistantPage from './pages/AIAssistantPage';
import MapViewPage from './pages/MapViewPage';
import PlacesPage from './pages/PlacesPage';
import LoadingSpinner from './components/LoadingSpinner';

// Styles
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  // Check backend connection
  const checkConnection = async () => {
    setIsLoading(true);
    setConnectionError(null);
    
    try {
      console.log('🔄 Checking backend connection...');
      const response = await apiService.checkHealth();
      
      if (response.success) {
        setIsConnected(true);
        console.log('✅ Backend connected successfully');
        console.log(`📍 Places in database: ${response.placesInDatabase}`);
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      setIsConnected(false);
      setConnectionError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, []);

  // Show loading screen while checking connection
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            Connecting to AI Backend...
          </h2>
          <p className="mt-2 text-gray-500">
            Setting up your intelligent travel assistant
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        {/* Navigation */}
        <Navbar isConnected={isConnected} />

        {/* Main Content */}
        <main className="pb-6">
          <Routes>
            {/* Home Page */}
            <Route 
              path="/" 
              element={
                <HomePage 
                  isConnected={isConnected} 
                  onRetry={checkConnection}
                />
              } 
            />

            {/* Trip Planner - Main Feature */}
            <Route 
              path="/trip-planner" 
              element={
                <TripPlannerPage 
                  isConnected={isConnected} 
                  onRetry={checkConnection}
                />
              } 
            />

            {/* AI Assistant */}
            <Route 
              path="/ai-assistant" 
              element={
                <AIAssistantPage 
                  isConnected={isConnected} 
                  onRetry={checkConnection}
                />
              } 
            />

            {/* Map View */}
            <Route 
              path="/map" 
              element={
                <MapViewPage 
                  isConnected={isConnected} 
                  onRetry={checkConnection}
                />
              } 
            />

            {/* Places Explorer */}
            <Route 
              path="/places" 
              element={
                <PlacesPage 
                  isConnected={isConnected} 
                  onRetry={checkConnection}
                />
              } 
            />

            {/* 404 Not Found */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900">404</h1>
                    <p className="mt-2 text-gray-600">Page not found</p>
                    <a 
                      href="/" 
                      className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              } 
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tour With AI
              </h3>
              <p className="text-gray-600 mb-4">
                Discover South India with AI Intelligence
              </p>
              
              {/* Connection Status */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'AI Backend Connected' : 'Backend Disconnected'}
                </span>
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>Powered by Advanced AI Algorithms & OpenStreetMap</p>
                <p className="mt-1">© 2024 Tour With AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;