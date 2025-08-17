import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Settings, 
  Zap, 
  Brain, 
  Clock, 
  MapPin, 
  Target,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { STORAGE_KEYS, ROUTE_SETTINGS, ALGORITHMS } from '../utils/constants';

const TripPlannerPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState(null);

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
      startLocation: null,
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
          entryFee: place.entryFee || { indian: 0, foreign: 0 }
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
        efficiency: result.metrics?.efficiency || 0
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
      toast.error(`Algorithm error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaces, routeSettings]);

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
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Brain className="text-blue-600" size={32} />
                AI-Powered Trip Planner
              </h1>
              <p className="text-gray-600 mt-2">
                Advanced algorithms optimize your route for the best travel experience
              </p>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings size={20} />
              Settings
            </button>
          </div>

          {/* Algorithm Status */}
          {optimizationStatus && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
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
          {showSettings && (
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
            </div>
          )}
        </div>

        {/* Main Content */}
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

          {/* Results */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Optimized Route</h2>
            
            {optimizedRoute ? (
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
                  </div>
                </div>

                {/* Route List */}
                <div className="space-y-2">
                  {optimizedRoute.route.map((place, index) => (
                    <div key={place.id} className="flex items-center p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div className="ml-3 flex-grow">
                        <h4 className="font-medium text-gray-900">{place.name}</h4>
                        <p className="text-sm text-gray-600">{place.city}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>⭐ {place.rating}</div>
                        <div>{place.averageVisitDuration}min</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="mx-auto mb-4" size={48} />
                <p>Select places and click "Optimize Route" to see AI-generated results</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-800">Optimization Error</h4>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlannerPage;