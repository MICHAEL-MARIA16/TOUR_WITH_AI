// Updated TripPlannerPage.jsx with DetailedTripPlanner integration
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';
import DetailedTripPlanner from '../components/DetailedTripPlanner'; // Import the new component
import { 
  Settings, 
  Zap, 
  Brain, 
  Clock, 
  MapPin, 
  Target,
  AlertCircle,
  CheckCircle,
  Loader,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Navigation
} from 'lucide-react';
import { STORAGE_KEYS, ROUTE_SETTINGS, ALGORITHMS } from '../utils/constants';

import RealTimeTripTracker from '../components/RealTimeTripTracker';

const TripPlannerPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState(null);
  const [currentView, setCurrentView] = useState('selection'); // 'selection', 'results', 'detailed'
  const [showDetailedPlan, setShowDetailedPlan] = useState(false);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Route settings with algorithm preferences
  const [routeSettings, setRouteSettings] = useState({
    startTime: ROUTE_SETTINGS.DEFAULT_START_TIME,
    totalTimeAvailable: ROUTE_SETTINGS.DEFAULT_DURATION,
    optimizationLevel: 'balanced',
    
    preferences: {
      optimizeFor: 'balanced',
      ratingWeight: 0.3,
      distanceWeight: 0.25,
      timeWeight: 0.2,
      costWeight: 0.15,
      accessibilityWeight: 0.1
    },

    constraints: {
      startLocation: {
        name: 'Coimbatore Tidal Park',
        latitude: 11.0638,
        longitude: 77.0596
      },
      budget: null,
      accessibility: {
        wheelchairAccess: false,
        kidFriendly: false
      }
    }
  });

  // Load places from API
  const loadPlaces = useCallback(async () => {
    if (!isConnected) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading places from API...');
      const response = await apiService.getAllPlaces();

      if (!response?.success || !response?.places) {
        throw new Error('Invalid API response structure');
      }

      const places = response.places;
      console.log(`✅ Loaded ${places.length} places`);

      // Validate places for algorithm compatibility
      const validPlaces = places.filter(place => {
        const hasValidLocation = place.location && 
          typeof place.location.latitude === 'number' && 
          typeof place.location.longitude === 'number';
        const hasRequiredData = place.name && place.id && place.averageVisitDuration;
        return hasValidLocation && hasRequiredData;
      });

      console.log(`📊 ${validPlaces.length}/${places.length} places are algorithm-ready`);
      setPlaces(validPlaces);
      toast.success(`Loaded ${validPlaces.length} places!`);

    } catch (error) {
      console.error('💥 Error loading places:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  // Load places on mount
  useEffect(() => {
    if (isConnected) {
      loadPlaces();
    }
  }, [isConnected, loadPlaces]);

  // Handle place selection
  const handlePlaceSelect = useCallback((place, isSelected) => {
    setSelectedPlaces(prev => {
      if (isSelected) {
        return [...prev, place];
      } else {
        return prev.filter(p => p.id !== place.id);
      }
    });
  }, []);

  // Algorithm-based route optimization
  const handleOptimizeRoute = useCallback(async () => {
    if (selectedPlaces.length < 2) {
      toast.error('Please select at least 2 places for optimization.');
      return;
    }

    if (selectedPlaces.length > 20) {
      toast.error('Maximum 20 places allowed for optimization.');
      return;
    }

    setLoading(true);
    setError(null);
    setOptimizedRoute(null);
    setOptimizationStatus('running');
    setCurrentView('results');

    console.log('🤖 Starting algorithm-based optimization');
    console.log(`📍 Places: ${selectedPlaces.length}`);
    console.log(`⚙️ Level: ${routeSettings.optimizationLevel}`);

    try {
      // Prepare algorithm payload
      const algorithmPayload = {
        places: selectedPlaces.map(place => ({
          id: place.id,
          name: place.name,
          category: place.category || 'attraction',
          location: {
            latitude: parseFloat(place.location.latitude),
            longitude: parseFloat(place.location.longitude)
          },
          averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
          rating: parseFloat(place.rating) || 3.5,
          city: place.city || 'Unknown',
          state: place.state || 'Unknown',
          entryFee: place.entryFee || { indian: 0, foreign: 0 },
          description: place.description || '',
          amenities: place.amenities || [],
          bestTimeToVisit: place.bestTimeToVisit || ['morning']
        })),
        preferences: routeSettings.preferences,
        constraints: {
          startTime: routeSettings.startTime,
          totalTimeAvailable: routeSettings.totalTimeAvailable,
          startDay: new Date().getDay(),
          ...routeSettings.constraints
        }
      };

      console.log('🚀 Calling backend optimization...');
      const result = await apiService.optimizeRouteWithAlgorithm(algorithmPayload);

      if (!result.success || !result.route || result.route.length === 0) {
        throw new Error('Algorithm failed to generate a valid route');
      }

      setOptimizedRoute({
        route: result.route,
        itinerary: result.itinerary,
        algorithm: result.algorithm,
        metrics: result.metrics,
        efficiency: result.metrics?.efficiency || 0,
        aiInsights: result.aiInsights || {},
        originalPlaces: selectedPlaces
      });

      setOptimizationStatus('completed');

      toast.success(
        `🧠 ${result.algorithm} optimized ${result.route.length} places!`,
        { duration: 4000 }
      );

    } catch (error) {
      console.error('💥 Optimization failed:', error);
      setError(error.message);
      setOptimizationStatus('failed');
      setCurrentView('selection');
      toast.error(`Algorithm error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaces, routeSettings]);

  // Handle view detailed plan
  const handleViewDetailedPlan = () => {
    setCurrentView('detailed');
    setShowDetailedPlan(true);
  };

  // Handle back navigation
  const handleBackToResults = () => {
    setCurrentView('results');
    setShowDetailedPlan(false);
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
    setOptimizedRoute(null);
    setOptimizationStatus(null);
    setShowDetailedPlan(false);
  };

  // Connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <ConnectionStatus isConnected={isConnected} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header with Navigation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              {currentView !== 'selection' && (
                <button
                  onClick={currentView === 'detailed' ? handleBackToResults : handleBackToSelection}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                  Back
                </button>
              )}

              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Brain className="text-blue-600" size={32} />
                  AI-Powered Trip Planner
                </h1>
                <p className="text-gray-600 mt-2">
                  {currentView === 'selection' && 'Advanced algorithms optimize your route for the best travel experience'}
                  {currentView === 'results' && 'Your optimized route is ready'}
                  {currentView === 'detailed' && 'Comprehensive AI-generated trip plan'}
                </p>
              </div>
            </div>

            {/* View Toggle & Settings */}
            <div className="flex items-center gap-3">
              {optimizedRoute && currentView === 'results' && (
                <button
                  onClick={showDetailedPlan ? () => setShowDetailedPlan(false) : handleViewDetailedPlan}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {showDetailedPlan ? <EyeOff size={18} /> : <Eye size={18} />}
                  {showDetailedPlan ? 'Hide' : 'View'} Detailed Plan
                </button>
              )}

              {currentView === 'selection' && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Settings size={20} />
                  Settings
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button 
              onClick={() => setCurrentView('selection')}
              className={`px-3 py-1 rounded ${currentView === 'selection' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              Place Selection
            </button>
            <ChevronRight size={16} className="text-gray-400" />
            <button 
              onClick={() => optimizedRoute && setCurrentView('results')}
              className={`px-3 py-1 rounded ${currentView === 'results' ? 'bg-blue-100 text-blue-700' : optimizedRoute ? 'hover:bg-gray-100' : 'text-gray-400'}`}
              disabled={!optimizedRoute}
            >
              Optimization Results
            </button>
            <ChevronRight size={16} className="text-gray-400" />
            <button 
              onClick={() => optimizedRoute && setCurrentView('detailed')}
              className={`px-3 py-1 rounded ${currentView === 'detailed' ? 'bg-blue-100 text-blue-700' : optimizedRoute ? 'hover:bg-gray-100' : 'text-gray-400'}`}
              disabled={!optimizedRoute}
            >
              Detailed Plan
            </button>
          </div>
          {currentView === 'results' && optimizedRoute && showLiveTracking && (
            <div className="mt-6">
              <RealTimeTripTracker 
                optimizedRoute={optimizedRoute}
                onLocationUpdate={setUserLocation}
              />
            </div>
          )}


          {/* Algorithm Status */}
          {optimizationStatus && currentView !== 'detailed' && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-3">
                {optimizationStatus === 'running' && <Loader className="animate-spin text-blue-600" size={20} />}
                {optimizationStatus === 'completed' && <CheckCircle className="text-green-600" size={20} />}
                {optimizationStatus === 'failed' && <AlertCircle className="text-red-600" size={20} />}
                
                <span className="font-medium">
                  {optimizationStatus === 'running' && 'Algorithm optimizing route...'}
                  {optimizationStatus === 'completed' && 'Optimization completed!'}
                  {optimizationStatus === 'failed' && 'Optimization failed'}
                </span>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && currentView === 'selection' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3">Algorithm Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimization Level
                  </label>
                  <select
                    value={routeSettings.optimizationLevel}
                    onChange={(e) => setRouteSettings(prev => ({
                      ...prev,
                      optimizationLevel: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {Object.values(ALGORITHMS).map(alg => (
                      <option key={alg.id} value={alg.id}>
                        {alg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Available (hours)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={Math.round(routeSettings.totalTimeAvailable / 60)}
                    onChange={(e) => setRouteSettings(prev => ({
                      ...prev,
                      totalTimeAvailable: parseInt(e.target.value) * 60
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={routeSettings.startTime}
                    onChange={(e) => setRouteSettings(prev => ({
                      ...prev,
                      startTime: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Start Location Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="text-blue-600" size={16} />
                  <span className="font-medium text-blue-800">Fixed Start Location</span>
                </div>
                <p className="text-sm text-blue-700">
                  All routes will begin from Coimbatore Tidal Park as per your requirements
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Content Based on Current View */}
        {currentView === 'selection' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Place Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Select Places to Visit</h2>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner message="Loading places..." />
                </div>
              ) : places.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="mx-auto mb-4" size={48} />
                  <p>No places available. Please check your backend connection.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {places.slice(0, 20).map((place) => (
                    <div
                      key={place.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedPlaces.some(p => p.id === place.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePlaceSelect(
                        place, 
                        !selectedPlaces.some(p => p.id === place.id)
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{place.name}</h3>
                          <p className="text-sm text-gray-600">{place.city}, {place.state}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>⭐ {place.rating}</span>
                            <span>🕒 {place.averageVisitDuration}min</span>
                            <span>🏷️ {place.category}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`w-6 h-6 rounded border-2 ${
                            selectedPlaces.some(p => p.id === place.id)
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedPlaces.some(p => p.id === place.id) && (
                              <CheckCircle className="w-full h-full text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selection Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Selected: {selectedPlaces.length} places
                  </span>
                  <button
                    onClick={handleOptimizeRoute}
                    disabled={selectedPlaces.length < 2 || loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedPlaces.length >= 2 && !loading
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {loading ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      <Zap size={16} />
                    )}
                    Optimize Route
                  </button>
                </div>
              </div>
            </div>

            {/* Preview/Instructions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">How It Works</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Select Places</h3>
                    <p className="text-sm text-gray-600">Choose 2-20 places you want to visit from our curated list.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">AI Optimization</h3>
                    <p className="text-sm text-gray-600">Our algorithms find the best route starting from Coimbatore Tidal Park.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Detailed Plan</h3>
                    <p className="text-sm text-gray-600">Get a comprehensive itinerary with timing, tips, and cultural insights.</p>
                  </div>
                </div>
              </div>

              {selectedPlaces.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Selected Places Preview</h4>
                  <div className="space-y-1">
                    {selectedPlaces.slice(0, 5).map((place, index) => (
                      <div key={place.id} className="text-sm text-blue-700">
                        {index + 1}. {place.name} ({place.city})
                      </div>
                    ))}
                    {selectedPlaces.length > 5 && (
                      <div className="text-sm text-blue-600">
                        +{selectedPlaces.length - 5} more places...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'results' && optimizedRoute && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Optimized Route Results */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Optimized Route</h2>
                <button
                  onClick={handleViewDetailedPlan}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Brain size={16} />
                  View Detailed Plan
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Route Summary */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">
                    🧠 {optimizedRoute.algorithm || 'AI Algorithm'} Results
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Places Optimized:</span>
                      <span className="font-semibold ml-2">{optimizedRoute.route.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Efficiency:</span>
                      <span className="font-semibold ml-2">{optimizedRoute.efficiency || 0}%</span>
                    </div>
                    {optimizedRoute.metrics && (
                      <>
                        <div>
                          <span className="text-gray-600">Total Distance:</span>
                          <span className="font-semibold ml-2">{optimizedRoute.metrics.totalDistance?.toFixed(1) || 0} km</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Time:</span>
                          <span className="font-semibold ml-2">{Math.ceil((optimizedRoute.metrics.totalTime || 0) / 60)} hours</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Route List */}
                <div className="space-y-2">
                  {/* Start Location */}
                  <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <MapPin className="text-white" size={16} />
                    </div>
                    <div className="ml-3 flex-grow">
                      <h4 className="font-medium text-blue-900">Start: Coimbatore Tidal Park</h4>
                      <p className="text-sm text-blue-700">Your journey begins here</p>
                    </div>
                    <div className="text-right text-sm text-blue-600">
                      <div>{routeSettings.startTime}</div>
                    </div>
                  </div>

                  {/* Route Places */}
                  {optimizedRoute.route.map((place, index) => (
                    <div key={place.id} className="flex items-center p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div className="ml-3 flex-grow">
                        <h4 className="font-medium text-gray-900">{place.name}</h4>
                        <p className="text-sm text-gray-600">{place.city}, {place.state}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>⭐ {place.rating}</span>
                          <span>🕒 {place.averageVisitDuration}min</span>
                          <span>🏷️ {place.category}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {place.entryFee && (
                          <div>₹{place.entryFee.indian || place.entryFee.amount || 0}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights & Actions */}
            <div className="space-y-6">
              
              {/* AI Insights */}
              {optimizedRoute.aiInsights && Object.keys(optimizedRoute.aiInsights).length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="text-purple-600" size={20} />
                    AI Insights
                  </h3>
                  
                  {optimizedRoute.aiInsights.tripOverview && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-1">Trip Overview</h4>
                      <p className="text-sm text-purple-700">{optimizedRoute.aiInsights.tripOverview}</p>
                    </div>
                  )}

                  {optimizedRoute.aiInsights.recommendations && optimizedRoute.aiInsights.recommendations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {optimizedRoute.aiInsights.recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-500" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {optimizedRoute.aiInsights.budgetEstimate && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-1">Budget Estimate</h4>
                      <p className="text-lg font-bold text-green-900">
                        ₹{optimizedRoute.aiInsights.budgetEstimate.total || 'N/A'}
                      </p>
                      <p className="text-xs text-green-700">Including entry fees, transport & meals</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={handleViewDetailedPlan}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    <Brain size={18} />
                    Generate Detailed AI Plan
                  </button>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                    <MapPin size={18} />
                    View on Map
                  </button>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <CheckCircle size={18} />
                    Save Route
                  </button>

                  <button
                    onClick={() => setShowLiveTracking(!showLiveTracking)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all"
                  >
                    <Navigation size={18} />
                    {showLiveTracking ? 'Hide' : 'Start'} Live Tracking
                  </button>

                  <button
                    onClick={handleBackToSelection}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={18} />
                    Modify Selection
                  </button>
                </div>
              </div>

              {/* Route Statistics */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Route Statistics</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{optimizedRoute.route.length}</div>
                    <div className="text-sm text-blue-800">Places</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.ceil((optimizedRoute.metrics?.totalTime || 0) / 60)}h
                    </div>
                    <div className="text-sm text-green-800">Duration</div>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {optimizedRoute.metrics?.totalDistance?.toFixed(0) || 0}
                    </div>
                    <div className="text-sm text-orange-800">KM</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {[...new Set(optimizedRoute.route.map(p => p.city))].length}
                    </div>
                    <div className="text-sm text-purple-800">Cities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'detailed' && optimizedRoute && (
          <DetailedTripPlanner 
            optimizedRoute={optimizedRoute} 
            routeSettings={routeSettings}
          />
        )}

        {/* Error Display */}
        {error && currentView === 'selection' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-800">Optimization Error</h4>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setOptimizationStatus(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && currentView === 'results' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <div className="text-center">
                <Loader className="mx-auto mb-4 text-blue-600 animate-spin" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimizing Your Route</h3>
                <p className="text-gray-600 mb-4">
                  Our AI is analyzing {selectedPlaces.length} places to create the perfect itinerary...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlannerPage;