// Updated MapViewPage.jsx with REAL-TIME auto-progress and trip completion
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import { 
  Map as MapIcon, 
  Navigation, 
  Filter, 
  Search,
  MapPin,
  Layers,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle,
  Trophy,
  Timer,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';
import { CATEGORY_CONFIG, MAP_CONFIG } from '../utils/constants';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

// Fix for default markers in react-leaflet
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// FIXED COORDINATES FOR COIMBATORE TIDAL PARK
const COIMBATORE_TIDAL_PARK = {
  id: 'tidal-park-coimbatore-start',
  name: 'Coimbatore Tidal Park',
  location: {
    latitude: 11.0638,  // Fixed coordinates
    longitude: 77.0596
  },
  category: 'start-location',
  averageVisitDuration: 10,
  isStartLocation: true
};

const MapViewPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(MAP_CONFIG.DEFAULT_ZOOM);
  const [showFilters, setShowFilters] = useState(false);
  
  // REAL-TIME AUTO-PROGRESS STATE
  const [tripInProgress, setTripInProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState(new Set());
  const [tripWaypoints, setTripWaypoints] = useState([]);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(40);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [realTimeSchedule, setRealTimeSchedule] = useState([]);
  
  // Refs for intervals
  const progressIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Get current date/time context
  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].substring(0, 5),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      timestamp: now.getTime(),
      timezone: 'Asia/Kolkata',
      formatted: now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };
  };

  // Load places from API
  useEffect(() => {
    const loadPlaces = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }

      try {
        console.log('🗺️ Loading places for REAL-TIME map view...');
        const response = await apiService.getAllPlaces();
        
        if (response?.success && response?.places) {
          const validPlaces = response.places.filter(place => 
            place.location && 
            place.location.latitude && 
            place.location.longitude &&
            !isNaN(place.location.latitude) && 
            !isNaN(place.location.longitude)
          );
          
          console.log(`✅ Loaded ${validPlaces.length} places with valid coordinates`);
          setPlaces(validPlaces);
          setFilteredPlaces(validPlaces);
          
          if (validPlaces.length > 0) {
            const bounds = calculateBounds(validPlaces);
            setMapCenter([bounds.centerLat, bounds.centerLng]);
            setMapZoom(bounds.zoom);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load places for map:', error);
        toast.error('Failed to load places for map view');
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, [isConnected]);

  // Calculate optimal map bounds
  const calculateBounds = (places) => {
    if (places.length === 0) {
      return { centerLat: 12.9716, centerLng: 77.5946, zoom: 7 };
    }

    const latitudes = places.map(p => p.location.latitude);
    const longitudes = places.map(p => p.location.longitude);
    
    // Include Tidal Park in bounds calculation
    latitudes.push(COIMBATORE_TIDAL_PARK.location.latitude);
    longitudes.push(COIMBATORE_TIDAL_PARK.location.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom;
    if (maxDiff > 15) zoom = 5;
    else if (maxDiff > 10) zoom = 6;
    else if (maxDiff > 5) zoom = 7;
    else if (maxDiff > 2) zoom = 8;
    else if (maxDiff > 1) zoom = 9;
    else zoom = 10;

    return { centerLat, centerLng, zoom };
  };

  // Filter places based on selected criteria
  useEffect(() => {
    let filtered = places;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }

    if (selectedState !== 'all') {
      filtered = filtered.filter(place => 
        place.state && place.state.toLowerCase().includes(selectedState.toLowerCase())
      );
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(search) ||
        place.city.toLowerCase().includes(search) ||
        place.state.toLowerCase().includes(search) ||
        (place.description && place.description.toLowerCase().includes(search))
      );
    }

    setFilteredPlaces(filtered);

    // Update map center if filtered results are available
    if (filtered.length > 0) {
      const bounds = calculateBounds(filtered);
      setMapCenter([bounds.centerLat, bounds.centerLng]);
    }

    // If trip is not in progress, generate route for filtered places
    if (!tripInProgress && filtered.length > 0) {
      generateRealTimeRoute(filtered); // Limit to 10 places for demo
    }
  }, [selectedCategory, selectedState, searchTerm, places, tripInProgress]);

  // Generate real-time route starting from Tidal Park
  const generateRealTimeRoute = async (selectedPlaces) => {
    try {
      if (!selectedPlaces || selectedPlaces.length === 0) return;

      const currentDateTime = getCurrentDateTime();
      
      console.log('🚀 Generating REAL-TIME route starting from Tidal Park...');
      console.log(`📅 Current: ${currentDateTime.formatted}`);

      // Calculate timeline starting from current time + 1 hour
      const startTime = new Date(currentDateTime.timestamp + 60 * 60 * 1000); // 1 hour from now
      let currentTime = new Date(startTime);

      const waypoints = [];
      
      // Always start from Tidal Park
      waypoints.push({
        id: COIMBATORE_TIDAL_PARK.id,
        name: COIMBATORE_TIDAL_PARK.name,
        position: [COIMBATORE_TIDAL_PARK.location.latitude, COIMBATORE_TIDAL_PARK.location.longitude],
        scheduledTime: currentTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        timestamp: currentTime.getTime(),
        type: 'start',
        order: 0,
        visitDuration: 10,
        status: 'pending'
      });

      currentTime = new Date(currentTime.getTime() + 10 * 60000); // Add 10 minutes

      // Add selected places with travel time
      selectedPlaces.forEach((place, index) => {
        // Add 45 minutes travel time
        currentTime = new Date(currentTime.getTime() + 45 * 60000);
        
        const visitDuration = place.averageVisitDuration || 90;
        const arrivalTime = new Date(currentTime);
        const departureTime = new Date(currentTime.getTime() + visitDuration * 60000);

        waypoints.push({
          id: place.id || place._id,
          name: place.name,
          position: [place.location.latitude, place.location.longitude],
          scheduledTime: arrivalTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          timestamp: arrivalTime.getTime(),
          departureTime: departureTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          type: 'destination',
          order: index + 1,
          visitDuration: visitDuration,
          place: place,
          status: 'pending',
          category: place.category
        });

        currentTime = departureTime;
      });

      setTripWaypoints(waypoints);
      setRealTimeSchedule(waypoints);
      
      // Set map center to Tidal Park
      setMapCenter([COIMBATORE_TIDAL_PARK.location.latitude, COIMBATORE_TIDAL_PARK.location.longitude]);
      setMapZoom(13);
      
      console.log(`✅ Generated route with ${waypoints.length} waypoints starting from Tidal Park`);
      
    } catch (error) {
      console.error('❌ Error generating real-time route:', error);
      toast.error('Failed to generate route');
    }
  };

  // Start real-time trip progress
  const startTripProgress = () => {
    if (tripWaypoints.length === 0) {
      toast.error('No route available to start trip');
      return;
    }

    setTripInProgress(true);
    setTripStartTime(new Date());
    setCurrentWaypointIndex(0);
    setVisitedPlaceIds(new Set());
    setTripCompleted(false);
    setIsPaused(false);
    setRemainingTime(40);

    toast.success('🚀 Trip started from Coimbatore Tidal Park!');
    
    // Start countdown timer
    startCountdownTimer();
    
    // Auto-progress after 5 seconds for start location
    setTimeout(() => {
      if (!isPaused) {
        progressToNextWaypoint();
      }
    }, 5000);
  };

  // Start countdown timer
  const startCountdownTimer = () => {
    setRemainingTime(40);
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          return 40; // Reset for next checkpoint
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop countdown timer
  const stopCountdownTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Progress to next waypoint
  const progressToNextWaypoint = useCallback(() => {
    setCurrentWaypointIndex(prevIndex => {
      const currentWaypoint = tripWaypoints[prevIndex];
      
      if (currentWaypoint) {
        // Mark current place as visited
        setVisitedPlaceIds(prev => new Set([...prev, currentWaypoint.id]));
        
        // Update map center to current location
        setMapCenter(currentWaypoint.position);
        
        // Update waypoint status
        setTripWaypoints(prev => prev.map(wp => 
          wp.id === currentWaypoint.id 
            ? { ...wp, status: 'visited', visitedAt: new Date().toLocaleString('en-IN') }
            : wp
        ));

        toast.success(`✅ Reached: ${currentWaypoint.name}`, { duration: 3000 });

        const nextIndex = prevIndex + 1;
        
        // Check if trip is completed
        if (nextIndex >= tripWaypoints.length) {
          completeTripSuccess();
          return prevIndex;
        }
        
        // Schedule next movement
        if (!isPaused) {
          setTimeout(() => {
            progressToNextWaypoint();
          }, 40000); // 40 seconds
        }
        
        return nextIndex;
      }
      
      return prevIndex;
    });
  }, [tripWaypoints, isPaused]);

  // Complete trip with celebration
  const completeTripSuccess = () => {
    setTripCompleted(true);
    setTripInProgress(false);
    stopCountdownTimer();
    
    const tripDuration = tripStartTime ? Math.round((Date.now() - tripStartTime.getTime()) / 1000) : 0;
    
    // Celebration toast
    toast.success('🎉 TRIP COMPLETED! All destinations visited!', { 
      duration: 8000,
      style: {
        background: 'linear-gradient(90deg, #4ade80, #3b82f6)',
        color: 'white',
        fontSize: '16px',
        fontWeight: 'bold'
      }
    });
    
    // Show completion stats
    setTimeout(() => {
      toast.success(`📊 Trip Stats: ${tripWaypoints.length} locations visited in ${Math.floor(tripDuration/60)}m ${tripDuration%60}s`, {
        duration: 6000
      });
    }, 2000);
  };

  // Pause/Resume trip
  const togglePauseTrip = () => {
    setIsPaused(!isPaused);
    
    if (!isPaused) {
      stopCountdownTimer();
      toast('⏸️ Trip paused', { icon: '⏸️' });
    } else {
      startCountdownTimer();
      toast('▶️ Trip resumed', { icon: '▶️' });
    }
  };

  // Reset trip
  const resetTrip = () => {
    setTripInProgress(false);
    setTripCompleted(false);
    setCurrentWaypointIndex(0);
    setVisitedPlaceIds(new Set());
    setIsPaused(false);
    setRemainingTime(40);
    setTripStartTime(null);
    stopCountdownTimer();
    
    // Reset waypoint statuses
    setTripWaypoints(prev => prev.map(wp => ({ ...wp, status: 'pending', visitedAt: null })));
    
    toast('🔄 Trip reset', { icon: '🔄' });
  };

  // Create custom icons for different states
  const createCustomIcon = (waypoint, index) => {
    const isVisited = visitedPlaceIds.has(waypoint.id);
    const isCurrent = index === currentWaypointIndex && tripInProgress && !tripCompleted;
    const isStart = waypoint.type === 'start';
    
    let color = '#6b7280'; // gray (default)
    let symbol = index.toString();
    
    if (isStart) {
      color = '#10b981'; // green for start
      symbol = 'S';
    } else if (isCurrent) {
      color = '#ef4444'; // red for current
      symbol = '●';
    } else if (isVisited) {
      color = '#8b5cf6'; // purple for visited
      symbol = '✓';
    } else if (tripInProgress) {
      color = '#f59e0b'; // yellow for upcoming
      symbol = index.toString();
    } else {
      const config = CATEGORY_CONFIG[waypoint.category] || CATEGORY_CONFIG['temple'];
      color = config.color;
      symbol = config.icon;
    }
    
    function safeBtoa(str) {
      return btoa(unescape(encodeURIComponent(str)));
    }

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${safeBtoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="16" fill="${color}" stroke="white" stroke-width="3"/>
          <text x="20" y="26" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="white">
            ${symbol}
          </text>
          ${isCurrent ? '<circle cx="20" cy="20" r="18" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.8"><animate attributeName="r" values="18;22;18" dur="1s" repeatCount="indefinite"/></circle>' : ''}
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  // Get unique states and categories
  const getUniqueStates = () => {
    const states = [...new Set(places.map(place => place.state))].filter(Boolean);
    return states.sort();
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(places.map(place => place.category))].filter(Boolean);
    return categories.sort();
  };

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
        
        {/* Header with Real-Time Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MapIcon className="text-blue-600" size={32} />
                Real-Time Trip Map
              </h1>
              <p className="text-gray-600 mt-2">
                {getCurrentDateTime().formatted} • Auto-progress every 40 seconds from Tidal Park
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Trip Controls */}
              {!tripInProgress && !tripCompleted && tripWaypoints.length > 0 && (
                <button
                  onClick={startTripProgress}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play size={20} />
                  Start Trip
                </button>
              )}
              
              {tripInProgress && !tripCompleted && (
                <>
                  <button
                    onClick={togglePauseTrip}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isPaused 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    {isPaused ? <Play size={20} /> : <Pause size={20} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  
                  <button
                    onClick={resetTrip}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Square size={20} />
                    Reset
                  </button>
                </>
              )}
              
              {tripCompleted && (
                <button
                  onClick={resetTrip}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Trophy size={20} />
                  New Trip
                </button>
              )}

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
              >
                <Filter size={20} />
                Filters
              </button>
            </div>
          </div>

          {/* Real-Time Trip Status */}
          {tripInProgress && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
                  <span className="font-semibold text-gray-800">
                    Trip in Progress - {currentWaypointIndex + 1}/{tripWaypoints.length} destinations
                  </span>
                </div>
                
                {!isPaused && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Timer size={16} />
                    <span>Next move in: {remainingTime}s</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Location:</span>
                  <div className="font-semibold text-blue-700">
                    {tripWaypoints[currentWaypointIndex]?.name || 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Visited:</span>
                  <div className="font-semibold text-green-700">
                    {visitedPlaceIds.size}/{tripWaypoints.length}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Started:</span>
                  <div className="font-semibold text-purple-700">
                    {tripStartTime?.toLocaleTimeString() || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Progress:</span>
                  <div className="font-semibold text-orange-700">
                    {Math.round((visitedPlaceIds.size / tripWaypoints.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trip Completion Celebration */}
          {tripCompleted && (
            <div className="mb-4 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="text-center">
                <Trophy className="mx-auto text-yellow-500 mb-2" size={48} />
                <h2 className="text-2xl font-bold text-green-800 mb-2">🎉 TRIP COMPLETED! 🎉</h2>
                <p className="text-green-700 mb-4">
                  Successfully visited all {tripWaypoints.length} destinations starting from Coimbatore Tidal Park!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg">
                    <div className="font-semibold text-green-800">Total Destinations</div>
                    <div className="text-2xl font-bold text-green-600">{tripWaypoints.length}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="font-semibold text-blue-800">Trip Duration</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {tripStartTime ? Math.floor((Date.now() - tripStartTime.getTime()) / 60000) : 0}m
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <div className="font-semibold text-purple-800">Success Rate</div>
                    <div className="text-2xl font-bold text-purple-600">100%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Places
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or city..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {getUniqueCategories().map(category => {
                      const config = CATEGORY_CONFIG[category];
                      return (
                        <option key={category} value={category}>
                          {config ? `${config.icon} ${config.name}` : category}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* State Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All States</option>
                    {getUniqueStates().map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* Results Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trip Route
                  </label>
                  <div className="flex items-center p-2 bg-gray-50 rounded-md border">
                    <Navigation className="text-blue-600 mr-2" size={16} />
                    <span className="font-semibold text-gray-900">
                      {tripWaypoints.length} stops
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <LoadingSpinner message="Loading real-time map data..." size="large" />
            </div>
          ) : (
            <div className="relative">
              {/* Map */}
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '600px', width: '100%' }}
                className="leaflet-container"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Trip Waypoints with Real-Time Status */}
                {tripWaypoints.map((waypoint, index) => {
                  const isVisited = visitedPlaceIds.has(waypoint.id);
                  const isCurrent = index === currentWaypointIndex && tripInProgress && !tripCompleted;
                  
                  return (
                    <Marker
                      key={waypoint.id}
                      position={waypoint.position}
                      icon={createCustomIcon(waypoint, index)}
                    >
                      <Popup>
                        <div className="min-w-[250px]">
                          <h3 className="font-bold text-lg mb-2">{waypoint.name}</h3>
                          
                          <div className="space-y-2 text-sm">
                            <div>
                              <strong>Order:</strong> {waypoint.order === 0 ? 'Start' : `#${waypoint.order}`}
                            </div>
                            
                            {waypoint.type !== 'start' && (
                              <>
                                <div>
                                  <strong>Category:</strong> {waypoint.category}
                                </div>
                                <div>
                                  <strong>Visit Duration:</strong> {waypoint.visitDuration} mins
                                </div>
                              </>
                            )}
                            
                            <div>
                              <strong>Scheduled:</strong> {waypoint.scheduledTime}
                            </div>
                            
                            <div className="mt-3 p-2 rounded-lg">
                              {isCurrent && (
                                <div className="bg-red-100 text-red-800 font-semibold">
                                  🔴 CURRENT LOCATION
                                </div>
                              )}
                              {isVisited && !isCurrent && (
                                <div className="bg-green-100 text-green-800 font-semibold">
                                  ✅ VISITED at {waypoint.visitedAt}
                                </div>
                              )}
                              {!isVisited && !isCurrent && tripInProgress && (
                                <div className="bg-yellow-100 text-yellow-800 font-semibold">
                                  ⏳ UPCOMING
                                </div>
                              )}
                              {!tripInProgress && (
                                <div className="bg-blue-100 text-blue-800 font-semibold">
                                  📍 PLANNED
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Route Polyline */}
                {tripWaypoints.length > 1 && (
                  <Polyline
                    positions={tripWaypoints.map(wp => wp.position)}
                    pathOptions={{
                      color: tripCompleted ? '#10b981' : tripInProgress ? '#3b82f6' : '#6b7280',
                      weight: tripCompleted ? 6 : 4,
                      opacity: 0.8,
                      dashArray: tripInProgress ? '10, 5' : undefined,
                    }}
                  />
                )}
              </MapContainer>

              {/* Map Overlay Info */}
              <div className="absolute top-4 right-4 space-y-2">
                {/* Real-Time Status */}
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border">
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        tripCompleted ? 'bg-green-500' : 
                        tripInProgress ? 'bg-blue-500 animate-pulse' : 
                        'bg-gray-400'
                      }`}></div>
                      <span className="font-semibold">
                        {tripCompleted ? 'Trip Completed!' : 
                         tripInProgress ? 'Trip in Progress' : 
                         'Ready to Start'}
                      </span>
                    </div>
                    {tripInProgress && !isPaused && (
                      <div className="text-xs text-blue-600">
                        Auto-update: {remainingTime}s
                      </div>
                    )}
                  </div>
                </div>

                {/* Map Technology Info */}
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border">
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>OpenStreetMap</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Real-Time • Free • No API Keys
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trip Timeline */}
        {tripWaypoints.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="text-blue-600" size={20} />
                Real-Time Trip Timeline
              </h3>
              <div className="text-sm text-gray-600">
                Started from Coimbatore Tidal Park • Auto-progress: 40s intervals
              </div>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {tripWaypoints.map((waypoint, index) => {
                const isVisited = visitedPlaceIds.has(waypoint.id);
                const isCurrent = index === currentWaypointIndex && tripInProgress && !tripCompleted;
                const isUpcoming = index > currentWaypointIndex && tripInProgress;
                
                return (
                  <div
                    key={waypoint.id}
                    className={`flex items-center p-3 rounded-lg border transition-all ${
                      isCurrent ? 'border-red-300 bg-red-50 shadow-lg' :
                      isVisited ? 'border-green-300 bg-green-50' :
                      isUpcoming ? 'border-yellow-300 bg-yellow-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      isCurrent ? 'bg-red-500 animate-pulse' :
                      isVisited ? 'bg-green-500' :
                      isUpcoming ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}>
                      {waypoint.type === 'start' ? 'S' :
                       isCurrent ? '●' :
                       isVisited ? '✓' :
                       waypoint.order}
                    </div>

                    {/* Location Info */}
                    <div className="ml-4 flex-grow">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold ${
                          isCurrent ? 'text-red-800' :
                          isVisited ? 'text-green-800' :
                          'text-gray-800'
                        }`}>
                          {waypoint.name}
                        </h4>
                        
                        <div className="text-sm text-gray-600">
                          {waypoint.scheduledTime}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mt-1">
                        {waypoint.type === 'start' ? (
                          'Starting point of your journey'
                        ) : (
                          `${waypoint.place?.city}, ${waypoint.place?.state} • ${waypoint.visitDuration} min visit`
                        )}
                      </div>

                      {/* Real-time status */}
                      <div className="mt-2">
                        {isCurrent && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Current Location
                            {!isPaused && <span>• Next in {remainingTime}s</span>}
                          </div>
                        )}
                        {isVisited && !isCurrent && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle size={12} />
                            Visited {waypoint.visitedAt}
                          </div>
                        )}
                        {isUpcoming && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <Clock size={12} />
                            Upcoming
                          </div>
                        )}
                        {!tripInProgress && (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <MapPin size={12} />
                            Planned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Map Legend & Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Map Legend */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="text-blue-600" size={20} />
                Real-Time Map Legend
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Status Icons */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Trip Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">S</div>
                    <span>Start (Tidal Park)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs animate-pulse">●</div>
                    <span>Current Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">✓</div>
                    <span>Visited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
                    <span>Upcoming</span>
                  </div>
                </div>
              </div>

              {/* Category Icons */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Categories</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(CATEGORY_CONFIG).slice(0, 4).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.icon}
                      </div>
                      <span>{config.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Auto-Progress:</strong> Every 40 seconds
                </div>
                <div>
                  <strong>Start Point:</strong> Coimbatore Tidal Park
                </div>
              </div>
            </div>
          </div>

          {/* Trip Statistics */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="text-yellow-600" size={20} />
                Trip Statistics
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{tripWaypoints.length}</div>
                <div className="text-sm text-blue-800">Total Stops</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{visitedPlaceIds.size}</div>
                <div className="text-sm text-green-800">Visited</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {tripWaypoints.length > 0 ? Math.round((visitedPlaceIds.size / tripWaypoints.length) * 100) : 0}%
                </div>
                <div className="text-sm text-purple-800">Progress</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {[...new Set(tripWaypoints.filter(wp => wp.place).map(wp => wp.place.city))].length}
                </div>
                <div className="text-sm text-orange-800">Cities</div>
              </div>
            </div>

            {/* Real-time Information */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Current Date/Time:</span>
                <span className="font-semibold">{getCurrentDateTime().formatted}</span>
              </div>
              
              {tripStartTime && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600">Trip Started:</span>
                  <span className="font-semibold">{tripStartTime.toLocaleTimeString()}</span>
                </div>
              )}
              
              {tripCompleted && tripStartTime && (
                <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-green-700">Trip Duration:</span>
                  <span className="font-semibold text-green-800">
                    {Math.floor((Date.now() - tripStartTime.getTime()) / 60000)} minutes
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions for New Users */}
        {!tripInProgress && !tripCompleted && tripWaypoints.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <MapIcon className="text-white" size={24} />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Start Your Real-Time Journey!
                </h3>
                <p className="text-gray-700 mb-4">
                  Your trip is planned with {tripWaypoints.length} stops starting from Coimbatore Tidal Park. 
                  The map will automatically move to each location every 40 seconds, showing real-time progress 
                  until all destinations are marked as visited.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Auto-progress every 40 seconds</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Real-time date/time based planning</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Trip completion celebration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapViewPage;