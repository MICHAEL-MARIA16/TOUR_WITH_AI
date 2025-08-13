import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ConnectionStatus from './ConnectionStatus';
import LocationSelector from './LocationSelector';
import ItineraryDisplay from './ItineraryDisplay';
import OptimizedGraphVisualization from './OptimizedGraphVisualization';
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
import { STORAGE_KEYS, ROUTE_SETTINGS, PLACE_CATEGORIES } from '../utils/constants';

const TripPlannerPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visitedPlaces, setVisitedPlaces] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [optimizationStatus, setOptimizationStatus] = useState(null);

  // Enhanced route settings with algorithm preferences
  const [routeSettings, setRouteSettings] = useState({
    startTime: ROUTE_SETTINGS.DEFAULT_START_TIME,
    totalTimeAvailable: ROUTE_SETTINGS.DEFAULT_DURATION,
    optimizationLevel: 'balanced', // 'fast', 'balanced', 'optimal'
    
    // Algorithm-specific preferences
    preferences: {
      optimizeFor: 'balanced', // 'time', 'distance', 'rating', 'cost', 'balanced'
      ratingWeight: 0.3,
      distanceWeight: 0.25,
      timeWeight: 0.2,
      costWeight: 0.15,
      accessibilityWeight: 0.1,
      prioritizeHighRated: false,
      minimizeTravel: false,
      maximizeDiversity: true,
      allowPartialRoute: true
    },

    // Enhanced constraints
    constraints: {
      startLocation: null,
      endLocation: null,
      maxDistancePerLeg: 150,
      maxTotalDistance: 500,
      budget: null,
      accessibility: {
        wheelchairAccess: false,
        kidFriendly: false,
        elderlyFriendly: false
      }
    }
  });

  // Load places on connection
  const loadAllPlaces = useCallback(async (showToast = true) => {
    setLoading(true);
    setError(null);
    setApiError(null);

    try {
      console.log('🔄 Loading places from API...');
      const response = await apiService.getAllPlaces();

      if (!response?.success || !response?.places) {
        throw new Error('Invalid API response structure');
      }

      const places = response.places;
      console.log(`✅ Loaded ${places.length} places from API`);

      // Validate and normalize places for algorithm compatibility
      const validPlaces = places.filter(place => {
        const hasValidLocation = place.location && 
          typeof place.location.latitude === 'number' && 
          typeof place.location.longitude === 'number' &&
          !isNaN(place.location.latitude) && 
          !isNaN(place.location.longitude);

        const hasRequiredData = place.name && place.id && place.averageVisitDuration;

        if (!hasValidLocation || !hasRequiredData) {
          console.warn(`⚠️ Skipping place ${place.name}: missing algorithm-required data`);
          return false;
        }

        return true;
      });

      console.log(`📊 ${validPlaces.length}/${places.length} places are algorithm-compatible`);

      setPlaces(validPlaces);
      setRetryCount(0);

      if (showToast) {
        toast.success(`Loaded ${validPlaces.length} algorithm-ready places!`);
      }

    } catch (error) {
      console.error('💥 Error loading places:', error);
      setError(error.message);
      setApiError(error);
      setRetryCount(prev => prev + 1);

      if (showToast) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced localStorage handling
  useEffect(() => {
    try {
      const storedVisited = localStorage.getItem(STORAGE_KEYS.VISITED_PLACES);
      const storedSettings = localStorage.getItem(STORAGE_KEYS.ROUTE_SETTINGS);

      if (storedVisited) {
        const visitedArray = JSON.parse(storedVisited);
        if (Array.isArray(visitedArray)) {
          setVisitedPlaces(new Set(visitedArray));
        }
      }

      if (storedSettings) {
        const savedSettings = JSON.parse(storedSettings);
        setRouteSettings(prev => ({ ...prev, ...savedSettings }));
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      localStorage.removeItem(STORAGE_KEYS.VISITED_PLACES);
      localStorage.removeItem(STORAGE_KEYS.ROUTE_SETTINGS);
    }
  }, []);

  // Load places when connected
  useEffect(() => {
    if (isConnected) {
      loadAllPlaces();
    }
  }, [isConnected, loadAllPlaces]);

  // Place selection handler
  const handlePlaceSelect = useCallback((place, isSelected) => {
    setSelectedPlaces(prev => {
      let newSelection;
      if (isSelected) {
        newSelection = [...prev, place];
        console.log(`✅ Added ${place.name} to selection (${newSelection.length} total)`);
      } else {
        newSelection = prev.filter(p => p.id !== place.id);
        console.log(`❌ Removed ${place.name} from selection (${newSelection.length} total)`);
        if (newSelection.length < 2) {
          setOptimizedRoute(null);
          setOptimizationStatus(null);
        }
      }
      return newSelection;
    });
  }, []);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedPlaces([]);
    setOptimizedRoute(null);
    setOptimizationStatus(null);
    setVisitedPlaces(new Set());
    
    try {
      localStorage.removeItem(STORAGE_KEYS.VISITED_PLACES);
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
    
    toast('Selection cleared', { icon: '🗑️' });
  }, []);

  // Place visited handler
  const handlePlaceVisited = useCallback((placeId, isVisited) => {
    setVisitedPlaces(prev => {
      const newSet = new Set(prev);
      if (isVisited) {
        newSet.add(placeId);
        toast.success('Place marked as visited!', { icon: '✅' });
      } else {
        newSet.delete(placeId);
        toast('Place unmarked', { icon: '↩️' });
      }

      try {
        localStorage.setItem(STORAGE_KEYS.VISITED_PLACES, JSON.stringify(Array.from(newSet)));
      } catch (err) {
        console.error('Error saving visited places:', err);
      }

      return newSet;
    });
  }, []);

  // MAIN ALGORITHM-BASED OPTIMIZATION METHOD
  const handleOptimizeRoute = useCallback(async () => {
    if (selectedPlaces.length < 2) {
      toast.error('Please select at least 2 places for algorithmic optimization.');
      return;
    }

    if (selectedPlaces.length > 20) {
      toast.error('Maximum 20 places allowed for optimization algorithms.');
      return;
    }

    setLoading(true);
    setError(null);
    setOptimizedRoute(null);
    setOptimizationStatus('initializing');

    console.log('🤖 STARTING PURE ALGORITHM-BASED OPTIMIZATION');
    console.log(`📍 Places to optimize: ${selectedPlaces.length}`);
    console.log(`⚙️ Algorithm level: ${routeSettings.optimizationLevel}`);
    console.log(`🎯 Optimization target: ${routeSettings.preferences.optimizeFor}`);

    try {
      // Prepare algorithm-specific payload
      const algorithmPayload = {
        places: selectedPlaces.map(place => ({
          id: place.id,
          name: place.name,
          category: place.category || 'attraction',
          description: place.description || '',
          location: {
            latitude: parseFloat(place.location.latitude),
            longitude: parseFloat(place.location.longitude)
          },
          averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
          rating: parseFloat(place.rating) || 3.5,
          city: place.city || 'Unknown',
          state: place.state || 'Unknown',
          entryFee: place.entryFee || { indian: 0, foreign: 0 },
          kidFriendly: place.kidFriendly !== false,
          wheelchairAccessible: place.wheelchairAccessible === true,
          openingHours: place.openingHours || null,
          priority: 0
        })),

        preferences: {
          optimizationLevel: routeSettings.optimizationLevel,
          ...routeSettings.preferences
        },

        constraints: {
          startTime: routeSettings.startTime,
          totalTimeAvailable: routeSettings.totalTimeAvailable,
          startDay: new Date().getDay(),
          ...routeSettings.constraints
        }
      };

      setOptimizationStatus('running');
      console.log('🚀 Calling backend optimization algorithm...');

      // Call the PURE algorithm-based optimization
      const result = await apiService.optimizeRouteWithAlgorithm(algorithmPayload);

      console.log('✅ Algorithm optimization completed:', result);

      if (!result.success || !result.route || result.route.length === 0) {
        throw new Error('Algorithm failed to generate a valid route');
      }

      // Set the algorithm result directly - NO frontend modifications
      setOptimizedRoute({
        route: result.route,
        itinerary: result.itinerary,
        totalTime: result.optimizationDetails?.totalTime || 0,
        totalDistance: result.optimizationDetails?.totalDistance || 0,
        totalTravelTime: result.optimizationDetails?.totalTravelTime || 0,
        efficiency: result.optimizationDetails?.efficiency || 0,
        algorithm: result.algorithm,
        metrics: result.metrics,
        placesVisited: result.optimizationDetails?.placesVisited || 0,
        placesSkipped: result.optimizationDetails?.placesSkipped || 0
      });

      setOptimizationStatus('completed');

      // Show success message with algorithm details
      const algorithmName = result.algorithm || 'Unknown Algorithm';
      const placesOptimized = result.route.length;
      const efficiency = result.optimizationDetails?.efficiency || 0;

      toast.success(
        `🧠 ${algorithmName} optimized ${placesOptimized} places with ${efficiency}% efficiency!`,
        { duration: 4000 }
      );

      // Show warnings if any places were skipped
      if (result.optimizationDetails?.placesSkipped > 0) {
        toast(
          `⚠️ Algorithm skipped ${result.optimizationDetails.placesSkipped} places due to constraints`,
          { icon: '⚠️', duration: 3000 }
        );
      }

    } catch (error) {
      console.error('💥 Algorithm optimization failed:', error);
      setError(error.message);
      setOptimizationStatus('failed');

      // Enhanced error handling for algorithm-specific issues
      if (error.message.includes('timeout')) {
        toast.error('Algorithm timeout - try fewer places or "fast" mode', { duration: 5000 });
      } else if (error.message.includes('no feasible route')) {
        toast.error('No feasible route found - try relaxing constraints', { duration: 5000 });
      } else if (error.message.includes('invalid')) {
        toast.error('Invalid data - check place locations', { duration: 5000 });
      } else {
        toast.error(`Algorithm error: ${error.message}`, { duration: 5000 });
      }

      // Suggest fallback options
      setTimeout(() => {
        if (selectedPlaces.length > 10) {
          toast('💡 Try with fewer places (≤10) for better algorithm performance', { 
            icon: '💡', 
            duration: 4000 
          });
        } else if (routeSettings.optimizationLevel === 'optimal') {
          toast('💡 Try "balanced" or "fast" optimization level', { 
            icon: '💡', 
            duration: 4000 
          });
        }
      }, 1000);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaces, routeSettings]);

  // Route settings change handler
  const handleRouteSettingsChange = useCallback((newSettings) => {
    setRouteSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      try {
        localStorage.setItem(STORAGE_KEYS.ROUTE_SETTINGS, JSON.stringify(updated));
      } catch (err) {
        console.error('Error saving route settings:', err);
      }
      
      return updated;
    });
  }, []);

  // Enhanced retry functionality
  const handleRetry = useCallback(() => {
    setError(null);
    setApiError(null);
    setOptimizationStatus(null);
    loadAllPlaces(true);
  }, [loadAllPlaces]);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (apiError && retryCount < 3 && isConnected) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      console.log(`Auto-retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);

      const timer = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1}`);
        loadAllPlaces(false);
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [apiError, retryCount, isConnected, loadAllPlaces]);

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
        
        {/* Header with Algorithm Status */}
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
              Algorithm Settings
            </button>
          </div>

          {/* Algorithm Status Indicator */}
          {optimizationStatus && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-3">
                {optimizationStatus === 'running' && <Loader className="animate-spin text-blue-600" size={20} />}
                {optimizationStatus === 'completed' && <CheckCircle className="text-green-600" size={20} />}
                {optimizationStatus === 'failed' && <AlertCircle className="text-red-600" size={20} />}
                
                <span className="font-medium">
                  {optimizationStatus === 'initializing' && 'Preparing algorithm...'}
                  {optimizationStatus === 'running' && 'Algorithm optimizing route...'}
                  {optimizationStatus === 'completed' && `Algorithm completed successfully!`}
                  {optimizationStatus === 'failed' && 'Algorithm optimization failed'}
                </span>
              </div>
            </div>
          )}

          {/* Algorithm Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Target className="text-blue-600" size={20} />
                Algorithm Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Optimization Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimization Level
                  </label>
                  <select
                    value={routeSettings.optimizationLevel}
                    onChange={(e) => handleRouteSettingsChange({ optimizationLevel: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="fast">Fast (Greedy Algorithm)</option>
                    <option value="balanced">Balanced (Genetic/ACO)</option>
                    <option value="optimal">Optimal (Multi-Algorithm)</option>
                  </select>
                </div>

                {/* Optimization Target */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Optimize For
                  </label>
                  <select
                    value={routeSettings.preferences.optimizeFor}
                    onChange={(e) => handleRouteSettingsChange({ 
                      preferences: { ...routeSettings.preferences, optimizeFor: e.target.value }
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="balanced">Balanced Experience</option>
                    <option value="time">Minimize Travel Time</option>
                    <option value="distance">Minimize Distance</option>
                    <option value="rating">Maximize Ratings</option>
                    <option value="cost">Minimize Costs</option>
                  </select>
                </div>

                {/* Total Time Available */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Clock size={16} />
                    Time Available (hours)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={Math.round(routeSettings.totalTimeAvailable / 60)}
                    onChange={(e) => handleRouteSettingsChange({ 
                      totalTimeAvailable: parseInt(e.target.value) * 60 
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* Algorithm Preferences */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Algorithm Preferences
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={routeSettings.preferences.prioritizeHighRated}
                        onChange={(e) => handleRouteSettingsChange({
                          preferences: { ...routeSettings.preferences, prioritizeHighRated: e.target.checked }
                        })}
                      />
                      <span className="text-sm">Prioritize High-Rated</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={routeSettings.preferences.minimizeTravel}
                        onChange={(e) => handleRouteSettingsChange({
                          preferences: { ...routeSettings.preferences, minimizeTravel: e.target.checked }
                        })}
                      />
                      <span className="text-sm">Minimize Travel</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={routeSettings.preferences.maximizeDiversity}
                        onChange={(e) => handleRouteSettingsChange({
                          preferences: { ...routeSettings.preferences, maximizeDiversity: e.target.checked }
                        })}
                      />
                      <span className="text-sm">Maximize Diversity</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Place Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <LocationSelector 
                places={places}
                selectedPlaces={selectedPlaces}
                onPlaceSelect={handlePlaceSelect}
                onClearSelection={handleClearSelection}
                onOptimizeRoute={handleOptimizeRoute}
                isLoading={loading}
                error={error}
              />
            </div>
          </div>

          {/* Visualization and Itinerary */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Route Visualization */}
            <div className="bg-white rounded-lg shadow-sm border">
              <OptimizedGraphVisualization
                optimizedRoute={optimizedRoute}
                selectedPlaces={selectedPlaces}
                visitedPlaces={visitedPlaces}
                onPlaceVisited={handlePlaceVisited}
                isLoading={loading && selectedPlaces.length >= 2}
                onOptimizeRoute={handleOptimizeRoute}
                routeSettings={routeSettings}
                onRouteSettingsChange={handleRouteSettingsChange}
              />
            </div>

            {/* Itinerary Display */}
            {optimizedRoute && optimizedRoute.itinerary && (
              <div className="bg-white rounded-lg shadow-sm border">
                <ItineraryDisplay 
                  itinerary={optimizedRoute.itinerary}
                  optimizedRoute={optimizedRoute}
                  visitedPlaces={visitedPlaces}
                  onPlaceVisited={handlePlaceVisited}
                  routeSettings={routeSettings}
                />
              </div>
            )}
          </div>
        </div>

        {/* Algorithm Information Panel */}
        {optimizedRoute && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Brain className="text-blue-600" size={20} />
              Algorithm Optimization Results
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white rounded p-3 border">
                <div className="font-semibold text-blue-800">Algorithm Used</div>
                <div className="text-blue-600">{optimizedRoute.algorithm || 'Advanced Optimization'}</div>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <div className="font-semibold text-green-800">Efficiency</div>
                <div className="text-green-600">{optimizedRoute.efficiency || 0}%</div>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <div className="font-semibold text-purple-800">Places Optimized</div>
                <div className="text-purple-600">{optimizedRoute.placesVisited || 0}</div>
              </div>
              
              <div className="bg-white rounded p-3 border">
                <div className="font-semibold text-orange-800">Total Distance</div>
                <div className="text-orange-600">{optimizedRoute.totalDistance?.toFixed(1) || 0} km</div>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-blue-700">
              <strong>Note:</strong> This route was generated using advanced optimization algorithms that considered 
              travel time, distances, ratings, costs, and your preferences to create the most efficient path.
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-800">Algorithm Optimization Error</h4>
                <p className="text-red-700 mt-1">{error}</p>
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={handleRetry}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Try Again
                  </button>
                  {selectedPlaces.length > 10 && (
                    <button 
                      onClick={() => {
                        const reducedPlaces = selectedPlaces.slice(0, 8);
                        setSelectedPlaces(reducedPlaces);
                        toast('Reduced to 8 places for better algorithm performance', { icon: '💡' });
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Reduce Places
                    </button>
                  )}
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