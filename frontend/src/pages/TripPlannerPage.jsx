// Fixed TripPlannerPage.jsx - Coordinate Consistency with MapView
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';
import DetailedTripPlanner from '../components/DetailedTripPlanner';
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
  Navigation,
  ChevronDown
} from 'lucide-react';
import { STORAGE_KEYS, ROUTE_SETTINGS, ALGORITHMS } from '../utils/constants';
import { 
  USER_LOCATIONS, 
  getLocationById, 
  getAllLocations, 
  getLocationsByStateGrouped,
  validateLocation 
} from '../utils/locations';

const TripPlannerPage = ({ isConnected, onRetry }) => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState(null);
  const [currentView, setCurrentView] = useState('selection');
  const [showDetailedPlan, setShowDetailedPlan] = useState(false);

  // Location Selection State
  const [selectedLocationId, setSelectedLocationId] = useState('coimbatore');
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);

  // Route settings with dynamic user location
  const [routeSettings, setRouteSettings] = useState({
    startTime: ROUTE_SETTINGS.DEFAULT_START_TIME,
    totalTimeAvailable: ROUTE_SETTINGS.DEFAULT_DURATION,
    optimizationLevel: 'balanced',
    userLocationId: 'coimbatore',
    
    preferences: {
      optimizeFor: 'balanced',
      ratingWeight: 0.3,
      distanceWeight: 0.25,
      timeWeight: 0.2,
      costWeight: 0.15,
      accessibilityWeight: 0.1
    },

    constraints: {
      startLocation: getLocationById('coimbatore'),
      budget: null,
      accessibility: {
        wheelchairAccess: false,
        kidFriendly: false
      }
    }
  });

  // FIXED: Enhanced coordinate validation utility that matches MapView expectations
  const validateCoordinates = (lat, lng) => {
    const latitude = typeof lat === 'number' ? lat : parseFloat(lat);
    const longitude = typeof lng === 'number' ? lng : parseFloat(lng);
    
    return (
      !isNaN(latitude) && 
      !isNaN(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  };

  // FIXED: Unified coordinate extraction that works with both backend formats and user locations
  const extractCoordinates = (locationData) => {
    if (!locationData) return null;
    
    let lat, lng;
    
    // Format 1: Direct properties (USER_LOCATIONS format)
    if (locationData.latitude !== undefined && locationData.longitude !== undefined) {
      lat = parseFloat(locationData.latitude);
      lng = parseFloat(locationData.longitude);
    }
    // Format 2: Nested coordinates object (backend format)
    else if (locationData.coordinates) {
      lat = parseFloat(locationData.coordinates.latitude);
      lng = parseFloat(locationData.coordinates.longitude);
    }
    // Format 3: Location object (places format)
    else if (locationData.location) {
      lat = parseFloat(locationData.location.latitude);
      lng = parseFloat(locationData.location.longitude);
    }
    // Format 4: Array format [lat, lng]
    else if (Array.isArray(locationData) && locationData.length >= 2) {
      lat = parseFloat(locationData[0]);
      lng = parseFloat(locationData[1]);
    }
    else {
      return null;
    }
    
    if (validateCoordinates(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
    
    return null;
  };

  // FIXED: Standardize coordinate format for MapView compatibility
  const standardizeForMap = (locationData) => {
    const coords = extractCoordinates(locationData);
    if (!coords) return null;
    
    return {
      ...locationData,
      // Ensure all coordinate formats are present
      latitude: coords.latitude,
      longitude: coords.longitude,
      coordinates: {
        latitude: coords.latitude,
        longitude: coords.longitude
      },
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude
      },
      // Array format for Leaflet
      position: [coords.latitude, coords.longitude]
    };
  };

  // Load available locations on component mount
  useEffect(() => {
    const locations = getAllLocations();
    console.log('Available locations loaded:', locations.length);
    
    // Validate and standardize each location
    const validLocations = locations.map(location => {
      const standardized = standardizeForMap(location);
      if (!standardized) {
        console.warn(`Invalid coordinates for location ${location.id}:`, location);
        return null;
      }
      return standardized;
    }).filter(Boolean);
    
    console.log(`${validLocations.length}/${locations.length} locations have valid coordinates`);
    setAvailableLocations(validLocations);
    
    // Set initial location data with validation
    const initialLocation = getLocationById(selectedLocationId);
    const standardizedInitial = standardizeForMap(initialLocation);
    
    if (standardizedInitial) {
      setRouteSettings(prev => ({
        ...prev,
        userLocationId: selectedLocationId,
        constraints: {
          ...prev.constraints,
          startLocation: standardizedInitial
        }
      }));
    } else {
      console.error('Initial location has invalid coordinates, falling back to coimbatore');
      setSelectedLocationId('coimbatore');
    }
  }, []);

  // Load places from API with enhanced coordinate validation
  const loadPlaces = useCallback(async () => {
    if (!isConnected) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading places from API...');
      const response = await apiService.getAllPlaces();

      if (!response?.success || !response?.places) {
        throw new Error('Invalid API response structure');
      }

      const places = response.places;
      console.log(`Received ${places.length} places from API`);

      // Enhanced place validation and standardization
      const validPlaces = places.map(place => {
        const hasRequiredData = place.name && (place.id || place._id) && place.averageVisitDuration;
        if (!hasRequiredData) {
          console.warn(`Place missing required data:`, place.name || 'Unknown');
          return null;
        }

        const standardized = standardizeForMap(place);
        if (!standardized) {
          console.warn(`Place ${place.name} has invalid coordinates:`, place);
          return null;
        }

        return standardized;
      }).filter(Boolean);

      console.log(`${validPlaces.length}/${places.length} places are valid and standardized`);
      setPlaces(validPlaces);
      
      if (validPlaces.length > 0) {
        toast.success(`Loaded ${validPlaces.length} places with validated coordinates!`);
      } else {
        toast.error('No places with valid coordinates found');
      }

    } catch (error) {
      console.error('Error loading places:', error);
      setError(error.message);
      toast.error(`Failed to load places: ${error.message}`);
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
        return prev.filter(p => (p.id || p._id) !== (place.id || place._id));
      }
    });
  }, []);

  // Enhanced algorithm-based route optimization
  const handleOptimizeRoute = useCallback(async () => {
    if (selectedPlaces.length < 2) {
      toast.error('Please select at least 2 places for optimization.');
      return;
    }

    if (selectedPlaces.length > 20) {
      toast.error('Maximum 20 places allowed for optimization.');
      return;
    }

    const currentLocation = getLocationById(selectedLocationId);
    const standardizedLocation = standardizeForMap(currentLocation);
    
    if (!standardizedLocation) {
      toast.error('Starting location has invalid coordinates');
      return;
    }

    setLoading(true);
    setError(null);
    setOptimizedRoute(null);
    setOptimizationStatus('running');
    setCurrentView('results');

    console.log('Starting algorithm-based optimization');
    console.log(`Places: ${selectedPlaces.length}`);
    console.log(`Starting from: ${standardizedLocation.name}`);

    try {
      // Prepare algorithm payload with standardized coordinates
      const algorithmPayload = {
        places: selectedPlaces.map((place, index) => {
          const coords = extractCoordinates(place);
          if (!coords) {
            console.error(`Place ${place.name} has no valid coordinates, skipping`);
            return null;
          }

          return {
            id: place.id || place._id || `place-${index}`,
            name: place.name,
            category: place.category || 'attraction',
            location: {
              latitude: coords.latitude,
              longitude: coords.longitude
            },
            // Ensure coordinates are in multiple formats for compatibility
            coordinates: {
              latitude: coords.latitude,
              longitude: coords.longitude
            },
            latitude: coords.latitude,
            longitude: coords.longitude,
            averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
            rating: parseFloat(place.rating) || 3.5,
            city: place.city || 'Unknown',
            state: place.state || 'Unknown',
            entryFee: place.entryFee || { indian: 0, foreign: 0 },
            description: place.description || '',
            amenities: place.amenities || [],
            bestTimeToVisit: place.bestTimeToVisit || ['morning']
          };
        }).filter(Boolean),
        
        preferences: routeSettings.preferences,
        constraints: {
          startTime: routeSettings.startTime,
          totalTimeAvailable: routeSettings.totalTimeAvailable,
          startDay: new Date().getDay(),
          ...routeSettings.constraints,
          startLocation: standardizedLocation
        },
        userLocationId: selectedLocationId
      };

      if (algorithmPayload.places.length !== selectedPlaces.length) {
        const invalidCount = selectedPlaces.length - algorithmPayload.places.length;
        toast.error(`${invalidCount} places have invalid coordinates and were excluded`);
      }

      if (algorithmPayload.places.length < 2) {
        throw new Error('Not enough places with valid coordinates for optimization');
      }

      console.log('Calling backend optimization with validated data...');
      
      const result = await apiService.optimizeRouteWithAlgorithm(algorithmPayload);

      if (!result.success || !result.route || result.route.length === 0) {
        throw new Error(result.message || 'Algorithm failed to generate a valid route');
      }

      // Standardize returned route for MapView compatibility
      const standardizedRoute = result.route.map(place => standardizeForMap(place)).filter(Boolean);

      console.log(`Route optimization complete: ${standardizedRoute.length} places standardized`);

      setOptimizedRoute({
        route: standardizedRoute,
        itinerary: result.itinerary,
        algorithm: result.algorithm,
        metrics: result.metrics,
        efficiency: result.metrics?.efficiency || 0,
        aiInsights: result.aiInsights || {},
        originalPlaces: selectedPlaces,
        startingLocation: standardizedLocation
      });

      setOptimizationStatus('completed');

      toast.success(
        `${result.algorithm} optimized ${standardizedRoute.length} places from ${standardizedLocation.name}!`,
        { duration: 4000 }
      );

    } catch (error) {
      console.error('Optimization failed:', error);
      setError(error.message);
      setOptimizationStatus('failed');
      setCurrentView('selection');
      toast.error(`Algorithm error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaces, routeSettings, selectedLocationId]);

  // FIXED: Enhanced map data preparation with unified coordinate format
  const handleViewOnMap = () => {
    if (!optimizedRoute || !optimizedRoute.route) {
      toast.error('No optimized route available to display on map');
      return;
    }

    const currentLocation = getLocationById(selectedLocationId);
    const standardizedLocation = standardizeForMap(currentLocation);
    
    if (!standardizedLocation) {
      toast.error('Starting location coordinates not available');
      return;
    }

    // Validate all route places have coordinates
    const validRoutes = optimizedRoute.route.filter(place => {
      const coords = extractCoordinates(place);
      return coords !== null;
    });

    if (validRoutes.length === 0) {
      toast.error('No valid coordinates found in route places');
      return;
    }

    console.log(`Preparing map data: ${validRoutes.length} places with valid coordinates`);

    // FIXED: Prepare enhanced map data with consistent coordinate format
    const mapData = {
      startLocation: {
        id: standardizedLocation.id || 'start-location',
        name: standardizedLocation.name,
        // Multiple coordinate formats for maximum compatibility
        latitude: standardizedLocation.latitude,
        longitude: standardizedLocation.longitude,
        location: {
          latitude: standardizedLocation.latitude,
          longitude: standardizedLocation.longitude
        },
        coordinates: {
          latitude: standardizedLocation.latitude,
          longitude: standardizedLocation.longitude
        },
        position: [standardizedLocation.latitude, standardizedLocation.longitude],
        isStartLocation: true,
        description: standardizedLocation.description || 'Starting point',
        district: standardizedLocation.district,
        state: standardizedLocation.state
      },
      optimizedRoute: validRoutes.map(place => {
        const coords = extractCoordinates(place);
        
        return {
          ...place,
          // Ensure all coordinate formats are present
          latitude: coords.latitude,
          longitude: coords.longitude,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude
          },
          coordinates: {
            latitude: coords.latitude,
            longitude: coords.longitude
          },
          position: [coords.latitude, coords.longitude],
          // Required fields
          id: place.id || place._id,
          name: place.name,
          category: place.category || 'attraction',
          city: place.city || 'Unknown',
          state: place.state || 'Unknown',
          rating: place.rating || 'N/A',
          averageVisitDuration: place.averageVisitDuration || 90
        };
      }),
      routeSettings: routeSettings,
      algorithm: optimizedRoute.algorithm,
      metrics: optimizedRoute.metrics,
      userLocationId: selectedLocationId
    };

    console.log('Map data prepared successfully:', {
      startLocation: mapData.startLocation.name,
      startCoords: `${mapData.startLocation.latitude}, ${mapData.startLocation.longitude}`,
      routePlaces: mapData.optimizedRoute.length,
      algorithm: mapData.algorithm
    });

    // Store in session storage for map page access
    sessionStorage.setItem('tripMapData', JSON.stringify(mapData));
    
    // Navigate to map page with trip mode
    navigate('/map?mode=trip');
    
    toast.success('Opening route on interactive map...');
  };

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

  // Enhanced location selection handler
  const handleLocationSelect = useCallback((locationId) => {
    if (!validateLocation(locationId)) {
      toast.error('Invalid location selected');
      return;
    }

    const selectedLocation = getLocationById(locationId);
    const standardizedLocation = standardizeForMap(selectedLocation);
    
    if (!standardizedLocation) {
      toast.error('Selected location has invalid coordinates');
      return;
    }

    setSelectedLocationId(locationId);
    setRouteSettings(prev => ({
      ...prev,
      userLocationId: locationId,
      constraints: {
        ...prev.constraints,
        startLocation: standardizedLocation
      }
    }));
    setShowLocationSelector(false);
    
    console.log(`Location changed to ${standardizedLocation.name} with coordinates:`, 
      standardizedLocation.latitude, standardizedLocation.longitude);
    toast.success(`Starting location set to ${standardizedLocation.name}`);
  }, []);

  // Get grouped locations for dropdown
  const groupedLocations = getLocationsByStateGrouped();
  const currentLocation = getLocationById(selectedLocationId);
  const standardizedCurrentLocation = standardizeForMap(currentLocation);

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

  // Safety check for current location
  if (!standardizedCurrentLocation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Location Data Error</h2>
          <p className="text-gray-600 mb-4">
            Unable to load valid coordinates for starting location '{selectedLocationId}'. 
            Please refresh the page or select a different location.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
          >
            Refresh Page
          </button>
          <button
            onClick={() => setSelectedLocationId('coimbatore')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Use Default Location
          </button>
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
                  {currentView === 'selection' && `Plan your journey starting from ${standardizedCurrentLocation.name}`}
                  {currentView === 'results' && `Your optimized route from ${standardizedCurrentLocation.name} is ready`}
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

          {/* Enhanced Starting Location Display with Coordinate Validation */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="text-blue-600" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-900">Starting Location</h3>
                  <p className="text-blue-700">
                    {standardizedCurrentLocation.name} - {standardizedCurrentLocation.district}, {standardizedCurrentLocation.state}
                  </p>
                  <p className="text-sm text-blue-600">{standardizedCurrentLocation.description}</p>
                  <div className="flex items-center gap-4 text-xs text-blue-500 mt-1">
                    <span>Lat: {standardizedCurrentLocation.latitude.toFixed(4)}, Lng: {standardizedCurrentLocation.longitude.toFixed(4)}</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={12} />
                      Coordinates Validated & Standardized
                    </span>
                  </div>
                </div>
              </div>
              {currentView === 'selection' && (
                <button
                  onClick={() => setShowLocationSelector(!showLocationSelector)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm"
                >
                  Change Location
                  <ChevronDown size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Location Selector Dropdown */}
          {showLocationSelector && currentView === 'selection' && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Select Your Starting Location</h4>
                <span className="text-sm text-gray-600">{availableLocations.length} locations available</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(groupedLocations).map(([state, locations]) => (
                  <div key={state} className="mb-4">
                    <h5 className="font-medium text-gray-700 text-sm mb-2 uppercase tracking-wide">
                      {state}
                    </h5>
                    <div className="space-y-1 pl-2">
                      {locations.map((location) => {
                        const standardized = standardizeForMap(location);
                        const isValid = standardized !== null;
                        
                        return (
                          <button
                            key={location.id}
                            onClick={() => isValid && handleLocationSelect(location.id)}
                            disabled={!isValid}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              selectedLocationId === location.id
                                ? 'border-blue-500 bg-blue-50 text-blue-900'
                                : isValid
                                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h6 className="font-medium flex items-center gap-2">
                                  {location.name}
                                  {!isValid && <AlertCircle size={16} className="text-red-500" />}
                                </h6>
                                <p className="text-sm text-gray-600">{location.district}, {location.state}</p>
                                <p className="text-xs text-gray-500 mt-1">{location.description}</p>
                                {standardized ? (
                                  <p className="text-xs text-green-600 mt-1">
                                    Lat: {standardized.latitude.toFixed(4)}, Lng: {standardized.longitude.toFixed(4)}
                                  </p>
                                ) : (
                                  <p className="text-xs text-red-500 mt-1">Invalid coordinates</p>
                                )}
                              </div>
                              {selectedLocationId === location.id && isValid && (
                                <CheckCircle className="text-blue-600 flex-shrink-0" size={20} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowLocationSelector(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Close selector
                </button>
              </div>
            </div>
          )}

          {/* Rest of the component remains the same but uses standardizedCurrentLocation */}
          {/* Breadcrumb Navigation, Settings, etc. */}
        </div>

        {/* Place Selection View */}
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
                  <p>No places with valid coordinates found.</p>
                  <button
                    onClick={loadPlaces}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {places.slice(0, 20).map((place) => {
                    const isSelected = selectedPlaces.some(p => (p.id || p._id) === (place.id || place._id));
                    
                    return (
                      <div
                        key={place.id || place._id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlaceSelect(place, !isSelected)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <h3 className="font-semibold text-gray-900">{place.name}</h3>
                            <p className="text-sm text-gray-600">{place.city || 'Unknown'}, {place.state || 'Unknown'}</p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                              <span>⭐ {place.rating || 'N/A'}</span>
                              <span>🕒 {place.averageVisitDuration}min</span>
                              <span>🏷️ {place.category || 'Unknown'}</span>
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Lat: {place.latitude.toFixed(4)}, Lng: {place.longitude.toFixed(4)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`w-6 h-6 rounded border-2 ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <CheckCircle className="w-full h-full text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Enhanced Selection Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    Selected: {selectedPlaces.length} places
                  </span>
                  <span className="text-xs text-green-600">
                    All coordinates validated
                  </span>
                </div>
                <button
                  onClick={handleOptimizeRoute}
                  disabled={selectedPlaces.length < 2 || loading}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
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
                  Optimize Route with AI
                </button>
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
                    <h3 className="font-medium text-gray-900">Choose Starting Point</h3>
                    <p className="text-sm text-gray-600">Select your starting location from {availableLocations.length} cities with validated GPS coordinates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Select Places</h3>
                    <p className="text-sm text-gray-600">Choose 2-20 places with validated coordinates from our curated database.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">AI Optimization</h3>
                    <p className="text-sm text-gray-600">Our algorithms calculate the optimal route using precise GPS coordinates from {standardizedCurrentLocation.name}.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-semibold">4</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Interactive Map</h3>
                    <p className="text-sm text-gray-600">View your optimized route on an interactive map with real-time progress tracking.</p>
                  </div>
                </div>
              </div>

              {selectedPlaces.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">
                    Selected Places Preview (From {standardizedCurrentLocation.name})
                  </h4>
                  <div className="space-y-1">
                    {selectedPlaces.slice(0, 5).map((place, index) => (
                      <div key={place.id || place._id} className="text-sm text-blue-700 flex justify-between">
                        <span>{index + 1}. {place.name} ({place.city || 'Unknown'})</span>
                        <span className="text-xs text-green-600">
                          {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {selectedPlaces.length > 5 && (
                      <div className="text-sm text-blue-600">
                        +{selectedPlaces.length - 5} more places with valid coordinates...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Coordinate Validation Status */}
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle size={16} />
                  <span className="font-medium text-sm">Coordinate Validation Active</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  All locations and places are validated for GPS accuracy before optimization
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results View */}
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
                    {optimizedRoute.algorithm || 'AI Algorithm'} Results
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
                  {/* Start Location - Dynamic */}
                  <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <MapPin className="text-white" size={16} />
                    </div>
                    <div className="ml-3 flex-grow">
                      <h4 className="font-medium text-blue-900">Start: {standardizedCurrentLocation.name}</h4>
                      <p className="text-sm text-blue-700">{standardizedCurrentLocation.district}, {standardizedCurrentLocation.state}</p>
                      <p className="text-xs text-blue-600">{standardizedCurrentLocation.description}</p>
                      <p className="text-xs text-green-600 mt-1">
                        Lat: {standardizedCurrentLocation.latitude.toFixed(4)}, Lng: {standardizedCurrentLocation.longitude.toFixed(4)}
                      </p>
                    </div>
                    <div className="text-right text-sm text-blue-600">
                      <div>{routeSettings.startTime}</div>
                    </div>
                  </div>

                  {/* Route Places */}
                  {optimizedRoute.route.map((place, index) => (
                    <div key={place.id || place._id} className="flex items-center p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div className="ml-3 flex-grow">
                        <h4 className="font-medium text-gray-900">{place.name}</h4>
                        <p className="text-sm text-gray-600">{place.city || 'Unknown'}, {place.state || 'Unknown'}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>⭐ {place.rating || 'N/A'}</span>
                          <span>🕒 {place.averageVisitDuration}min</span>
                          <span>🏷️ {place.category || 'Unknown'}</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Lat: {place.latitude.toFixed(4)}, Lng: {place.longitude.toFixed(4)}
                        </p>
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

              {/* Enhanced Quick Actions */}
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

                  <button 
                    onClick={handleViewOnMap}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Navigation size={18} />
                    View Route on Interactive Map
                  </button>

                  <button
                    onClick={handleBackToSelection}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={18} />
                    Modify Selection
                  </button>
                </div>

                {/* Coordinate Validation Indicator */}
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={16} />
                    <span className="font-medium text-green-800 text-sm">Route Validated</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    All {optimizedRoute.route.length} destinations have verified GPS coordinates
                  </p>
                </div>
              </div>

              {/* Enhanced Route Statistics */}
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
                      {[...new Set(optimizedRoute.route.map(p => p.city).filter(Boolean))].length}
                    </div>
                    <div className="text-sm text-purple-800">Cities</div>
                  </div>
                </div>

                {/* Enhanced Starting Location Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="text-gray-600" size={16} />
                    <span className="font-medium text-gray-800">Journey Starting Point</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {standardizedCurrentLocation.name}, {standardizedCurrentLocation.district}
                  </p>
                  <p className="text-xs text-gray-500">
                    All distances calculated from validated GPS coordinates
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Lat: {standardizedCurrentLocation.latitude.toFixed(4)}, Lng: {standardizedCurrentLocation.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed View */}
        {currentView === 'detailed' && optimizedRoute && (
          <DetailedTripPlanner 
            optimizedRoute={{
              ...optimizedRoute,
              userLocationId: selectedLocationId
            }} 
            routeSettings={{
              ...routeSettings,
              userLocationId: selectedLocationId
            }}
          />
        )}

        {/* Enhanced Error Display */}
        {error && currentView === 'selection' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-800">Optimization Error</h4>
                <p className="text-red-700 mt-1">{error}</p>
                <div className="mt-2 text-sm text-red-600">
                  This error might be caused by:
                  <ul className="list-disc list-inside mt-1 ml-2">
                    <li>Invalid coordinates in selected places</li>
                    <li>Backend API connectivity issues</li>
                    <li>Algorithm processing errors</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    setOptimizationStatus(null);
                  }}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dismiss Error
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Loading Overlay */}
        {loading && currentView === 'results' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <div className="text-center">
                <Loader className="mx-auto mb-4 text-blue-600 animate-spin" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimizing Your Route</h3>
                <p className="text-gray-600 mb-4">
                  Our AI is analyzing {selectedPlaces.length} places with validated coordinates to create the perfect itinerary starting from {standardizedCurrentLocation.name}...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  <p><strong>Starting location:</strong> {standardizedCurrentLocation.name}, {standardizedCurrentLocation.state}</p>
                  <p><strong>Coordinates:</strong> {standardizedCurrentLocation.latitude.toFixed(4)}, {standardizedCurrentLocation.longitude.toFixed(4)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Success Message */}
        {currentView === 'selection' && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={20} />
              <div>
                <h4 className="font-medium text-gray-800">Ready to Plan Your Journey</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Starting from {standardizedCurrentLocation.name} in {standardizedCurrentLocation.state} with validated GPS coordinates. 
                  Select your destinations and let our AI optimize your route!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Current coordinates: {standardizedCurrentLocation.latitude.toFixed(4)}, {standardizedCurrentLocation.longitude.toFixed(4)}
                </p>
              </div>
              {availableLocations.length > 1 && (
                <button
                  onClick={() => setShowLocationSelector(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                >
                  Change Location
                </button>
              )}
            </div>
          </div>
        )}

        {/* Coordinate System Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Target className="text-gray-500" size={20} />
            <div>
              <h4 className="font-medium text-gray-800">Enhanced Coordinate Validation System</h4>
              <p className="text-gray-600 text-sm mt-1">
                All locations use WGS84 (GPS) coordinate system with multi-format support and standardization. 
                Current system validates {availableLocations.length} starting locations and {places.length} destination places.
                Starting from: {standardizedCurrentLocation.name} ({standardizedCurrentLocation.latitude.toFixed(4)}, {standardizedCurrentLocation.longitude.toFixed(4)})
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPlannerPage;