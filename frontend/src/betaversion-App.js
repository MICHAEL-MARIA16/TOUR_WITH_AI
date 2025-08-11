// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import MapView from './components/MapView';
import LocationSelector from './components/LocationSelector';
import ItineraryDisplay from './components/ItineraryDisplay';
import ChatBot from './components/ChatBot';
import { apiService } from './services/api';
import './styles/App.css';

function App() {
  // Application state
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [visitedPlaces, setVisitedPlaces] = useState(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [showChat, setShowChat] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('places'); // 'places', 'route', 'itinerary'
  
  // Route optimization settings
  const [routeSettings, setRouteSettings] = useState({
    startTime: '09:00',
    totalTimeAvailable: 480, // 8 hours in minutes
    optimizationLevel: 'fast'
  });

  // Load places on component mount
  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async (currentFilters = filters) => {
  try {
    console.log('Applying filters:', currentFilters); // Debug line

    const queryFilters = {};
    if (currentFilters.category && currentFilters.category !== 'all') {
      queryFilters.category = currentFilters.category;
    }
    if (currentFilters.budget) {
      queryFilters.budget = currentFilters.budget;
    }
    if (currentFilters.duration) {
      queryFilters.duration = currentFilters.duration;
    }

    const response = await apiService.getAllPlaces(queryFilters);

    if (response.success) {
      setPlaces(response.data.places);
    }
  } catch (error) {
    console.error('Error loading places:', error);
  }
};


  const handlePlaceSelection = (place, isSelected) => {
    if (isSelected) {
      setSelectedPlaces(prev => [...prev, place]);
    } else {
      setSelectedPlaces(prev => prev.filter(p => p.id !== place.id));
      // Clear route if this place was part of it
      if (optimizedRoute && optimizedRoute.some(p => p.id === place.id)) {
        setOptimizedRoute(null);
        setItinerary([]);
      }
    }
  };

  const handlePlaceVisited = (placeId, isVisited) => {
    setVisitedPlaces(prev => {
      const newVisited = new Set(prev);
      if (isVisited) {
        newVisited.add(placeId);
      } else {
        newVisited.delete(placeId);
      }
      return newVisited;
    });
  };

  const handleRouteOptimization = async () => {
    if (selectedPlaces.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      const placeIds = selectedPlaces.map(p => p.id);
      
      const response = await apiService.optimizeRoute({
        placeIds,
        ...routeSettings
      });

      if (response.success) {
        setOptimizedRoute(response.data.optimizedRoute);
        setItinerary(response.data.itinerary);
        setSidebarTab('itinerary');
      }
    } catch (err) {
      setError('Failed to optimize route. Please try again.');
      console.error('Route optimization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedPlaces([]);
    setOptimizedRoute(null);
    setItinerary([]);
    setVisitedPlaces(new Set());
    setSidebarTab('places');
  };

  const handleRouteSettingsChange = (newSettings) => {
    setRouteSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Main application component
  return (
    <Router>
      <div className="app">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
        
        <Routes>
          <Route path="/" element={
            <Layout>
              {/* Main Dashboard */}
              <div className="main-container">
                {/* Sidebar */}
                <div className="sidebar">
                  <div className="sidebar-tabs">
                    <button 
                      className={`tab-button ${sidebarTab === 'places' ? 'active' : ''}`}
                      onClick={() => setSidebarTab('places')}
                    >
                      Select Places ({places.length})
                    </button>
                    <button 
                      className={`tab-button ${sidebarTab === 'route' ? 'active' : ''}`}
                      onClick={() => setSidebarTab('route')}
                      disabled={selectedPlaces.length === 0}
                    >
                      Route Settings
                    </button>
                    <button 
                      className={`tab-button ${sidebarTab === 'itinerary' ? 'active' : ''}`}
                      onClick={() => setSidebarTab('itinerary')}
                      disabled={!optimizedRoute}
                    >
                      Itinerary
                    </button>
                  </div>

                  <div className="sidebar-content">
                    {sidebarTab === 'places' && (
                      <LocationSelector
                        places={places}
                        selectedPlaces={selectedPlaces}
                        onPlaceSelect={handlePlaceSelection}
                        onOptimizeRoute={handleRouteOptimization}
                        onClearSelection={handleClearSelection}
                        isLoading={isLoading}
                        error={error}
                      />
                    )}

                    {sidebarTab === 'route' && (
                      <div className="route-settings">
                        <h3>Route Optimization Settings</h3>
                        
                        <div className="setting-group">
                          <label>Start Time:</label>
                          <input
                            type="time"
                            value={routeSettings.startTime}
                            onChange={(e) => handleRouteSettingsChange({ startTime: e.target.value })}
                          />
                        </div>

                        <div className="setting-group">
                          <label>Available Time:</label>
                          <select
                            value={routeSettings.totalTimeAvailable}
                            onChange={(e) => handleRouteSettingsChange({ totalTimeAvailable: parseInt(e.target.value) })}
                          >
                            <option value={240}>4 hours</option>
                            <option value={360}>6 hours</option>
                            <option value={480}>8 hours</option>
                            <option value={600}>10 hours</option>
                            <option value={720}>12 hours</option>
                            <option value={1440}>Full day (24h)</option>
                            <option value={2880}>2 days</option>
                          </select>
                        </div>

                        <div className="setting-group">
                          <label>Optimization Level:</label>
                          <select
                            value={routeSettings.optimizationLevel}
                            onChange={(e) => handleRouteSettingsChange({ optimizationLevel: e.target.value })}
                          >
                            <option value="fast">Fast (Greedy)</option>
                            <option value="optimal">Optimal (DP - slower)</option>
                          </select>
                        </div>

                        <div className="selected-places-summary">
                          <h4>Selected Places ({selectedPlaces.length}):</h4>
                          <ul>
                            {selectedPlaces.map(place => (
                              <li key={place.id}>{place.name}</li>
                            ))}
                          </ul>
                        </div>

                        <button 
                          className="optimize-button primary"
                          onClick={handleRouteOptimization}
                          disabled={selectedPlaces.length === 0 || isLoading}
                        >
                          {isLoading ? 'Optimizing...' : 'Optimize Route'}
                        </button>
                      </div>
                    )}

                    {sidebarTab === 'itinerary' && (
                      <ItineraryDisplay
                        itinerary={itinerary}
                        optimizedRoute={optimizedRoute}
                        visitedPlaces={visitedPlaces}
                        onPlaceVisited={handlePlaceVisited}
                        routeSettings={routeSettings}
                      />
                    )}
                  </div>
                </div>

                {/* Map Container */}
                <div className="map-container">
                  <MapView
                    places={places}
                    selectedPlaces={selectedPlaces}
                    optimizedRoute={optimizedRoute}
                    visitedPlaces={visitedPlaces}
                    onPlaceSelect={handlePlaceSelection}
                    onPlaceVisited={handlePlaceVisited}
                  />
                </div>

                {/* Chat Button */}
                <button 
                  className="chat-toggle-button"
                  onClick={() => setShowChat(!showChat)}
                  title="Chat with AI Assistant"
                >
                  💬
                </button>

                {/* Chat Sidebar */}
                {showChat && (
                  <div className="chat-sidebar">
                    <ChatBot
                      selectedPlaces={selectedPlaces}
                      optimizedRoute={optimizedRoute}
                      onClose={() => setShowChat(false)}
                    />
                  </div>
                )}
              </div>
            </Layout>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;