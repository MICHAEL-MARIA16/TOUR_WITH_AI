// Fixed MapViewPage.jsx - Complete Implementation with Enhanced Trip Data Handling
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  AlertCircle,
  ArrowLeft,
  Spline,
  Target
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

// Default coordinates for fallback (Bangalore, India)
const DEFAULT_COORDINATES = {
  lat: 12.9716,
  lng: 77.5946,
  zoom: 6
};

const MapViewPage = ({ isConnected, onRetry }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mapMode = searchParams.get('mode'); // 'trip' or null
  
  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize map state with safe default coordinates
  const [mapCenter, setMapCenter] = useState([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng]);
  const [mapZoom, setMapZoom] = useState(DEFAULT_COORDINATES.zoom);
  
  // Trip Mode State
  const [tripMode, setTripMode] = useState(mapMode === 'trip');
  const [tripData, setTripData] = useState(null);
  const [tripWaypoints, setTripWaypoints] = useState([]);
  
  // REAL-TIME AUTO-PROGRESS STATE
  const [tripInProgress, setTripInProgress] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState(new Set());
  const [tripStartTime, setTripStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(40);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [realTimeSchedule, setRealTimeSchedule] = useState([]);
  
  // Refs for intervals
  const progressIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Enhanced utility function to validate coordinates with multiple format support
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

  // Enhanced utility function to safely parse coordinates from multiple formats
  const safeParseCoordinates = (locationData) => {
    if (!locationData) {
      console.warn('🔍 No location data provided to parse');
      return null;
    }
    
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
    // Format 3: Location object (trip data format)
    else if (locationData.location) {
      lat = parseFloat(locationData.location.latitude);
      lng = parseFloat(locationData.location.longitude);
    }
    // Format 4: Direct lat/lng (alternative format)
    else if (locationData.lat !== undefined && locationData.lng !== undefined) {
      lat = parseFloat(locationData.lat);
      lng = parseFloat(locationData.lng);
    }
    // Format 5: Position array from standardized data
    else if (locationData.position && Array.isArray(locationData.position)) {
      lat = parseFloat(locationData.position[0]);
      lng = parseFloat(locationData.position[1]);
    }
    else {
      console.warn('🔍 Unknown coordinate format:', locationData);
      return null;
    }
    
    if (validateCoordinates(lat, lng)) {
      return [lat, lng];
    }
    
    console.warn(`🔍 Invalid coordinates parsed: lat=${lat}, lng=${lng} from:`, locationData);
    return null;
  };

  // FIXED: Enhanced trip data loading with better error handling and debugging
  useEffect(() => {
    console.log('🔍 MapViewPage useEffect triggered:', { mapMode, tripMode });
    
    if (mapMode === 'trip') {
      // Try multiple storage keys for compatibility
      const possibleKeys = ['tripMapData', 'optimizedRoute', 'tripData'];
      let savedTripData = null;
      let foundKey = null;
      
      // Check all possible keys
      for (const key of possibleKeys) {
        const data = sessionStorage.getItem(key);
        if (data) {
          savedTripData = data;
          foundKey = key;
          console.log(`✅ Found trip data in sessionStorage with key: ${key}`);
          break;
        }
      }
      
      // Also check localStorage as fallback
      if (!savedTripData) {
        for (const key of possibleKeys) {
          const data = localStorage.getItem(key);
          if (data) {
            savedTripData = data;
            foundKey = key;
            console.log(`✅ Found trip data in localStorage with key: ${key}`);
            break;
          }
        }
      }
      
      console.log('📦 Available storage keys:');
      console.log('SessionStorage keys:', Object.keys(sessionStorage));
      console.log('LocalStorage keys:', Object.keys(localStorage));
      
      if (savedTripData) {
        try {
          const parsedData = JSON.parse(savedTripData);
          console.log('🗺️ Parsed trip data for map:', parsedData);
          
          // Enhanced validation with better error messages
          if (!parsedData) {
            throw new Error('Parsed data is null or undefined');
          }
          
          // Check for different possible data structures
          let startLocation, optimizedRoute, routeData;
          
          // Structure 1: Direct format from TripPlannerPage
          if (parsedData.startLocation && parsedData.optimizedRoute) {
            startLocation = parsedData.startLocation;
            optimizedRoute = parsedData.optimizedRoute;
            routeData = parsedData;
          }
          // Structure 2: Nested in route property
          else if (parsedData.route && parsedData.route.startLocation && parsedData.route.optimizedRoute) {
            startLocation = parsedData.route.startLocation;
            optimizedRoute = parsedData.route.optimizedRoute;
            routeData = parsedData.route;
          }
          // Structure 3: Direct route array
          else if (Array.isArray(parsedData) && parsedData.length > 0) {
            // Assume first item is start location if it has isStartLocation flag
            const firstItem = parsedData[0];
            if (firstItem.isStartLocation || firstItem.type === 'start') {
              startLocation = firstItem;
              optimizedRoute = parsedData.slice(1);
              routeData = { startLocation, optimizedRoute, route: parsedData };
            } else {
              throw new Error('Array format detected but no clear start location found');
            }
          }
          // Structure 4: Check if it's already processed waypoints
          else if (parsedData.waypoints && Array.isArray(parsedData.waypoints)) {
            console.log('🔄 Found pre-processed waypoints, using directly');
            setTripWaypoints(parsedData.waypoints);
            setTripData(parsedData);
            setTripMode(true);
            setRealTimeSchedule(parsedData.waypoints);
            
            // Set map center to first waypoint
            if (parsedData.waypoints.length > 0 && parsedData.waypoints[0].position) {
              setMapCenter(parsedData.waypoints[0].position);
              setMapZoom(12);
            }
            
            // Clear storage after successful load
            if (foundKey.includes('session')) {
              sessionStorage.removeItem(foundKey);
            } else {
              localStorage.removeItem(foundKey);
            }
            
            setLoading(false);
            return;
          }
          else {
            throw new Error(`Invalid trip data structure. Expected startLocation and optimizedRoute, got keys: ${Object.keys(parsedData).join(', ')}`);
          }
          
          // Validate start location coordinates
          const startCoords = safeParseCoordinates(startLocation);
          if (!startCoords) {
            throw new Error(`Invalid start location coordinates: ${JSON.stringify(startLocation)}`);
          }
          
          // Validate that we have places to visit
          if (!optimizedRoute || !Array.isArray(optimizedRoute) || optimizedRoute.length === 0) {
            throw new Error(`Invalid or empty optimized route: ${JSON.stringify(optimizedRoute)}`);
          }
          
          console.log(`✅ Validated trip data: ${optimizedRoute.length} places, start: ${startLocation.name}`);
          
          setTripData(routeData);
          setTripMode(true);
          generateTripWaypoints(routeData);
          
          // Clear the storage after successful loading
          if (foundKey.includes('session')) {
            sessionStorage.removeItem(foundKey);
          } else {
            localStorage.removeItem(foundKey);
          }
          
        } catch (error) {
          console.error('❌ Failed to parse trip data:', error);
          console.error('❌ Raw data that failed:', savedTripData);
          toast.error(`Failed to load trip route: ${error.message}`);
          setTripMode(false);
          navigate('/map', { replace: true }); // Use replace to avoid back button issues
        }
      } else {
        console.warn('⚠️ No trip data found in storage');
        console.log('🔍 Available sessionStorage:', Object.keys(sessionStorage));
        console.log('🔍 Available localStorage:', Object.keys(localStorage));
        toast.error('No trip data found. Please create a trip first.');
        setTripMode(false);
        // Don't redirect immediately, let user see the error
        setTimeout(() => {
          navigate('/trip-planner', { replace: true });
        }, 3000);
      }
    }
    
    setLoading(false);
  }, [mapMode, navigate]);

  // Enhanced trip waypoint generation with robust coordinate parsing
  const generateTripWaypoints = (data) => {
    console.log('🛣️ Generating trip waypoints from:', data);
    
    if (!data || !data.optimizedRoute || !data.startLocation) {
      console.error('❌ Invalid trip data for waypoint generation:', data);
      toast.error('Trip data is incomplete');
      return;
    }

    const waypoints = [];
    let validPlaceCount = 0;
    
    // Validate and add start location with enhanced format support
    const startCoords = safeParseCoordinates(data.startLocation);
    if (!startCoords) {
      console.error('❌ Invalid start location coordinates:', data.startLocation);
      toast.error('Starting location has invalid coordinates. Cannot display on map.');
      return;
    }

    console.log(`📍 Start location validated: ${data.startLocation.name} at ${startCoords[0]}, ${startCoords[1]}`);

    // Add start location waypoint
    waypoints.push({
      id: data.startLocation.id || 'start-location',
      name: data.startLocation.name || 'Starting Point',
      position: startCoords,
      type: 'start',
      order: 0,
      isStartLocation: true,
      description: data.startLocation.description || 'Starting point',
      visitDuration: 10,
      scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      timestamp: Date.now() + 60 * 60 * 1000,
      status: 'pending'
    });

    // Add optimized route places with enhanced coordinate validation
    let currentTime = new Date(Date.now() + 60 * 60 * 1000 + 10 * 60000); // Start + 10 mins
    
    console.log(`🎯 Processing ${data.optimizedRoute.length} route places...`);
    
    data.optimizedRoute.forEach((place, index) => {
      console.log(`🔍 Processing place ${index + 1}:`, place.name, place);
      
      // Try multiple coordinate parsing approaches
      let placeCoords = safeParseCoordinates(place);
      
      if (!placeCoords) {
        console.warn(`⚠️ Skipping place ${place.name || 'Unknown'} - invalid coordinates:`, place);
        return;
      }

      validPlaceCount++;
      console.log(`✅ Place ${validPlaceCount}: ${place.name} at ${placeCoords[0]}, ${placeCoords[1]}`);
      
      // Add 45 minutes travel time between locations
      currentTime = new Date(currentTime.getTime() + 45 * 60000);
      
      const visitDuration = place.averageVisitDuration || 90;
      const arrivalTime = new Date(currentTime);
      const departureTime = new Date(currentTime.getTime() + visitDuration * 60000);

      waypoints.push({
        id: place.id || place._id || `place-${index}`,
        name: place.name || `Destination ${index + 1}`,
        position: placeCoords,
        type: 'destination',
        order: validPlaceCount,
        place: place,
        visitDuration: visitDuration,
        category: place.category || 'attraction',
        rating: place.rating || 'N/A',
        city: place.city || 'Unknown',
        state: place.state || 'Unknown',
        scheduledTime: arrivalTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        timestamp: arrivalTime.getTime(),
        departureTime: departureTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: 'pending'
      });

      currentTime = departureTime;
    });

    if (waypoints.length <= 1) {
      toast.error('No valid destinations found in route');
      console.error('❌ Generated waypoints:', waypoints);
      return;
    }

    console.log(`✅ Generated ${waypoints.length} valid trip waypoints (${validPlaceCount} destinations + start)`);

    setTripWaypoints(waypoints);
    setRealTimeSchedule(waypoints);
    
    // Set map center to start location
    setMapCenter(startCoords);
    setMapZoom(12);
    
    toast.success(`Trip route loaded: ${validPlaceCount} destinations from ${data.startLocation.name}!`);
    
    console.log('📊 Waypoint generation summary:');
    console.log(`  - Total waypoints: ${waypoints.length}`);
    console.log(`  - Valid destinations: ${validPlaceCount}/${data.optimizedRoute.length}`);
    console.log(`  - Start location: ${data.startLocation.name}`);
    console.log(`  - Map center: ${startCoords[0]}, ${startCoords[1]}`);
  };

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

  // Enhanced place loading with coordinate validation
  useEffect(() => {
    const loadPlaces = async () => {
      if (!isConnected || tripMode) {
        setLoading(false);
        return;
      }

      try {
        console.log('🗺️ Loading places for map view...');
        const response = await apiService.getAllPlaces();
        
        if (response?.success && response?.places) {
          // Enhanced place validation with coordinate checking
          const validPlaces = response.places.filter(place => {
            // Check multiple coordinate formats
            const coords = safeParseCoordinates(place);
            const hasValidData = place.name && (place.id || place._id);
            
            if (!coords && hasValidData) {
              console.warn(`⚠️ Place ${place.name} has no valid coordinates:`, place);
            }
            
            return coords !== null && hasValidData;
          });
          
          console.log(`✅ Loaded ${validPlaces.length} places with valid coordinates out of ${response.places.length} total`);
          setPlaces(validPlaces);
          setFilteredPlaces(validPlaces);
          
          // Set map bounds if places available
          if (validPlaces.length > 0) {
            const bounds = calculateBounds(validPlaces);
            setMapCenter([bounds.centerLat, bounds.centerLng]);
            setMapZoom(bounds.zoom);
          }
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        console.error('❌ Failed to load places for map:', error);
        toast.error('Failed to load places for map view');
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, [isConnected, tripMode]);

  // Enhanced bounds calculation with coordinate validation
  const calculateBounds = (places) => {
    if (places.length === 0) {
      return { 
        centerLat: DEFAULT_COORDINATES.lat, 
        centerLng: DEFAULT_COORDINATES.lng, 
        zoom: DEFAULT_COORDINATES.zoom 
      };
    }

    // Get valid coordinates from places
    const validCoords = places
      .map(place => safeParseCoordinates(place))
      .filter(coords => coords !== null);

    if (validCoords.length === 0) {
      console.warn('⚠️ No valid coordinates found for bounds calculation');
      return { 
        centerLat: DEFAULT_COORDINATES.lat, 
        centerLng: DEFAULT_COORDINATES.lng, 
        zoom: DEFAULT_COORDINATES.zoom 
      };
    }

    const latitudes = validCoords.map(coords => coords[0]);
    const longitudes = validCoords.map(coords => coords[1]);
    
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

  // Filter places based on selected criteria (regular mode only)
  useEffect(() => {
    if (tripMode) return;

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
        (place.city && place.city.toLowerCase().includes(search)) ||
        (place.state && place.state.toLowerCase().includes(search)) ||
        (place.description && place.description.toLowerCase().includes(search))
      );
    }

    setFilteredPlaces(filtered);

    // Update map center if filtered results are available
    if (filtered.length > 0) {
      const bounds = calculateBounds(filtered);
      setMapCenter([bounds.centerLat, bounds.centerLng]);
    }
  }, [selectedCategory, selectedState, searchTerm, places, tripMode]);

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

    const startLocationName = tripWaypoints[0]?.name || 'Starting location';
    toast.success(`Trip started from ${startLocationName}!`);
    
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

        toast.success(`Reached: ${currentWaypoint.name}`, { duration: 3000 });

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
    toast.success('TRIP COMPLETED! All destinations visited!', { 
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
      toast.success(`Trip Stats: ${tripWaypoints.length} locations visited in ${Math.floor(tripDuration/60)}m ${tripDuration%60}s`, {
        duration: 6000
      });
    }, 2000);
  };

  // Pause/Resume trip
  const togglePauseTrip = () => {
    setIsPaused(!isPaused);
    
    if (!isPaused) {
      stopCountdownTimer();
      toast('Trip paused');
    } else {
      startCountdownTimer();
      toast('Trip resumed');
      
      // Resume auto-progress if not completed
      if (!tripCompleted && currentWaypointIndex < tripWaypoints.length - 1) {
        setTimeout(() => {
          if (!isPaused) {
            progressToNextWaypoint();
          }
        }, 40000);
      }
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
    
    toast('Trip reset');
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
    } else if (tripInProgress || tripMode) {
      color = '#f59e0b'; // yellow for upcoming
      symbol = index.toString();
    } else {
      const config = CATEGORY_CONFIG[waypoint.category] || CATEGORY_CONFIG['temple'] || { color: '#6b7280', icon: '●' };
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

  // Create regular place icon with enhanced category support
  const createRegularIcon = (place) => {
    const config = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG['temple'] || { color: '#6b7280', icon: '●' };
    
    function safeBtoa(str) {
      return btoa(unescape(encodeURIComponent(str)));
    }

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${safeBtoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${config.color}" stroke="white" stroke-width="2"/>
          <text x="16" y="20" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" fill="white">
            ${config.icon}
          </text>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
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

  // Handle back to trip planner
  const handleBackToTripPlanner = () => {
    navigate('/trip-planner');
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
        
        {/* Header with Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Back Button for Trip Mode */}
              {tripMode && (
                <button
                  onClick={handleBackToTripPlanner}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                  title="Return to Trip Planner"
                >
                  <ArrowLeft size={20} />
                  <span className="font-medium">Back to Trip Planner</span>
                </button>
              )}

              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <MapIcon className="text-blue-600" size={32} />
                  {tripMode ? 'Trip Route Map' : 'Interactive Map'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {tripMode 
                    ? `${getCurrentDateTime().formatted} • Your optimized route with ${tripWaypoints.length} stops` 
                    : `Explore ${filteredPlaces.length} destinations across South India`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Trip Controls */}
              {tripMode && tripWaypoints.length > 0 && (
                <>
                  {!tripInProgress && !tripCompleted && (
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
                </>
              )}

              {/* Filters Button (only for regular mode) */}
              {!tripMode && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  <Filter size={20} />
                  Filters
                </button>
              )}
            </div>
          </div>

          {/* Trip Mode - Real-Time Status */}
          {tripMode && tripInProgress && (
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
                    {tripWaypoints.length > 0 ? Math.round((visitedPlaceIds.size / tripWaypoints.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trip Mode - Completion Celebration */}
          {tripMode && tripCompleted && (
            <div className="mb-4 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="text-center">
                <Trophy className="mx-auto text-yellow-500 mb-2" size={48} />
                <h2 className="text-2xl font-bold text-green-800 mb-2">TRIP COMPLETED!</h2>
                <p className="text-green-700 mb-4">
                  Successfully visited all {tripWaypoints.length} destinations on your optimized route!
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

          {/* Trip Mode - Route Info */}
          {tripMode && tripData && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Spline className="text-blue-600" size={20} />
                    {tripData.algorithm || 'AI-Optimized'} Route
                  </h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Starting from {tripData.startLocation?.name || 'Unknown Location'} • {tripWaypoints.length} destinations
                  </p>
                  {tripData.metrics && (
                    <div className="flex gap-4 text-xs text-blue-600 mt-2">
                      <span>Distance: {tripData.metrics.totalDistance?.toFixed(1) || 0} km</span>
                      <span>Duration: {Math.ceil((tripData.metrics.totalTime || 0) / 60)} hours</span>
                      <span>Efficiency: {tripData.metrics.efficiency || 0}%</span>
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-blue-600">
                  <div>Route optimized for your preferences</div>
                </div>
              </div>
            </div>
          )}

          {/* Regular Mode - Filters Panel */}
          {!tripMode && showFilters && (
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
                    Results
                  </label>
                  <div className="flex items-center p-2 bg-gray-50 rounded-md border">
                    <MapPin className="text-blue-600 mr-2" size={16} />
                    <span className="font-semibold text-gray-900">
                      {filteredPlaces.length} places
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info for Trip Mode (only in development) */}
        {process.env.NODE_ENV === 'development' && tripMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">🐛 Debug Info</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <div><strong>Trip Mode:</strong> {tripMode ? 'Yes' : 'No'}</div>
              <div><strong>Trip Data:</strong> {tripData ? 'Loaded' : 'Not Loaded'}</div>
              <div><strong>Waypoints:</strong> {tripWaypoints.length}</div>
              <div><strong>Map Mode Param:</strong> {mapMode}</div>
              <div><strong>Session Storage Keys:</strong> {Object.keys(sessionStorage).join(', ') || 'None'}</div>
              <div><strong>Local Storage Keys:</strong> {Object.keys(localStorage).join(', ') || 'None'}</div>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <LoadingSpinner message={tripMode ? "Loading your trip route..." : "Loading map data..."} size="large" />
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
                
                {/* Trip Mode - Show Trip Waypoints */}
                {tripMode && tripWaypoints.map((waypoint, index) => {
                  const isVisited = visitedPlaceIds.has(waypoint.id);
                  const isCurrent = index === currentWaypointIndex && tripInProgress && !tripCompleted;
                  
                  return (
                    <Marker
                      key={waypoint.id}
                      position={waypoint.position}
                      icon={createCustomIcon(waypoint, index)}
                    >
                      <Popup>
                        <div className="min-w-[280px]">
                          <h3 className="font-bold text-lg mb-2">{waypoint.name}</h3>
                          
                          <div className="space-y-2 text-sm">
                            <div>
                              <strong>Order:</strong> {waypoint.order === 0 ? 'Start Location' : `Stop #${waypoint.order}`}
                            </div>
                            
                            <div>
                              <strong>Coordinates:</strong> {waypoint.position[0].toFixed(4)}, {waypoint.position[1].toFixed(4)}
                            </div>
                            
                            {waypoint.type !== 'start' && waypoint.place && (
                              <>
                                <div>
                                  <strong>Location:</strong> {waypoint.place.city || 'Unknown'}, {waypoint.place.state || 'Unknown'}
                                </div>
                                <div>
                                  <strong>Category:</strong> {waypoint.category}
                                </div>
                                <div>
                                  <strong>Rating:</strong> {waypoint.rating || 'N/A'}
                                </div>
                                <div>
                                  <strong>Visit Duration:</strong> {waypoint.visitDuration} mins
                                </div>
                                {waypoint.place.entryFee && (
                                  <div>
                                    <strong>Entry Fee:</strong> ₹{waypoint.place.entryFee.indian || waypoint.place.entryFee.amount || 0}
                                  </div>
                                )}
                              </>
                            )}
                            
                            {waypoint.type === 'start' && (
                              <div>
                                <strong>Description:</strong> {waypoint.description}
                              </div>
                            )}
                            
                            <div>
                              <strong>Scheduled Time:</strong> {waypoint.scheduledTime}
                            </div>
                            
                            <div className="mt-3 p-2 rounded-lg">
                              {isCurrent && (
                                <div className="bg-red-100 text-red-800 font-semibold flex items-center gap-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  CURRENT LOCATION
                                </div>
                              )}
                              {isVisited && !isCurrent && (
                                <div className="bg-green-100 text-green-800 font-semibold">
                                  VISITED at {waypoint.visitedAt}
                                </div>
                              )}
                              {!isVisited && !isCurrent && tripInProgress && (
                                <div className="bg-yellow-100 text-yellow-800 font-semibold">
                                  UPCOMING
                                </div>
                              )}
                              {!tripInProgress && (
                                <div className="bg-blue-100 text-blue-800 font-semibold">
                                  PLANNED STOP
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Regular Mode - Show All Places */}
                {!tripMode && filteredPlaces.map((place, index) => {
                  const coords = safeParseCoordinates(place);
                  if (!coords) return null;
                  
                  return (
                    <Marker
                      key={place.id || place._id || index}
                      position={coords}
                      icon={createRegularIcon(place)}
                    >
                      <Popup>
                        <div className="min-w-[250px]">
                          <h3 className="font-bold text-lg mb-2">{place.name}</h3>
                          <div className="space-y-1 text-sm">
                            <div><strong>Location:</strong> {place.city || 'Unknown'}, {place.state || 'Unknown'}</div>
                            <div><strong>Category:</strong> {place.category || 'Unknown'}</div>
                            <div><strong>Rating:</strong> {place.rating || 'N/A'}</div>
                            <div><strong>Visit Duration:</strong> {place.averageVisitDuration || 90} mins</div>
                            <div><strong>Coordinates:</strong> {coords[0].toFixed(4)}, {coords[1].toFixed(4)}</div>
                            {place.entryFee && (
                              <div><strong>Entry Fee:</strong> ₹{place.entryFee.indian || place.entryFee.amount || 0}</div>
                            )}
                            {place.description && (
                              <div className="mt-2">
                                <strong>About:</strong> 
                                <p className="text-gray-600 text-xs mt-1">
                                  {place.description.length > 100 
                                    ? `${place.description.substring(0, 100)}...` 
                                    : place.description
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Trip Mode - Route Polyline */}
                {tripMode && tripWaypoints.length > 1 && (
                  <Polyline
                    positions={tripWaypoints.map(wp => wp.position)}
                    pathOptions={{
                      color: tripCompleted ? '#10b981' : tripInProgress ? '#3b82f6' : '#6b7280',
                      weight: tripCompleted ? 6 : tripInProgress ? 5 : 4,
                      opacity: 0.8,
                      dashArray: tripInProgress && !tripCompleted ? '10, 5' : undefined,
                    }}
                  />
                )}
              </MapContainer>

              {/* Map Overlay Info */}
              <div className="absolute top-4 right-4 space-y-2">
                {/* Mode Status */}
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border">
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        tripMode 
                          ? (tripCompleted ? 'bg-green-500' : 
                             tripInProgress ? 'bg-blue-500 animate-pulse' : 
                             'bg-yellow-500')
                          : 'bg-purple-500'
                      }`}></div>
                      <span className="font-semibold">
                        {tripMode 
                          ? (tripCompleted ? 'Trip Completed!' : 
                             tripInProgress ? 'Trip in Progress' : 
                             'Trip Route Ready')
                          : 'Explore Mode'
                        }
                      </span>
                    </div>
                    {tripMode && tripInProgress && !isPaused && (
                      <div className="text-xs text-blue-600">
                        Auto-update: {remainingTime}s
                      </div>
                    )}
                    {!tripMode && (
                      <div className="text-xs text-purple-600">
                        {filteredPlaces.length} destinations visible
                      </div>
                    )}
                  </div>
                </div>

                {/* Coordinate Status */}
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border">
                  <div className="text-sm text-gray-700">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Coordinates Validated</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {tripMode ? `${tripWaypoints.length} waypoints` : `${filteredPlaces.length} places`} • OpenStreetMap
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trip Mode - Timeline */}
        {tripMode && tripWaypoints.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="text-blue-600" size={20} />
                Trip Timeline & Progress
              </h3>
              <div className="text-sm text-gray-600">
                {tripData?.startLocation?.name || 'Unknown Start'} • Auto-progress: 40s intervals
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
                      waypoint.type === 'start' ? 'bg-blue-500' :
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
                          <>
                            {waypoint.description}
                            <div className="text-xs text-gray-500 mt-1">
                              📍 {waypoint.position[0].toFixed(4)}, {waypoint.position[1].toFixed(4)}
                            </div>
                          </>
                        ) : (
                          <>
                            {waypoint.place?.city || 'Unknown'}, {waypoint.place?.state || 'Unknown'} • {waypoint.visitDuration} min visit • ⭐ {waypoint.rating || 'N/A'}
                            <div className="text-xs text-gray-500 mt-1">
                              📍 {waypoint.position[0].toFixed(4)}, {waypoint.position[1].toFixed(4)}
                            </div>
                          </>
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
                            Planned Stop
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
                {tripMode ? 'Trip Route Legend' : 'Map Legend'}
              </h3>
            </div>
            
            {tripMode ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Trip Status Icons */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Trip Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">S</div>
                      <span>Start Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs animate-pulse">●</div>
                      <span>Current Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">✓</div>
                      <span>Visited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
                      <span>Upcoming</span>
                    </div>
                  </div>
                </div>

                {/* Route Info */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Route Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-blue-500"></div>
                      <span>Active Route</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-green-500"></div>
                      <span>Completed Route</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-gray-400 border-dashed border-2 border-gray-400"></div>
                      <span>Planned Route</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Category Icons */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Categories</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(CATEGORY_CONFIG).slice(0, 6).map(([key, config]) => (
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

                {/* Filter Status */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Current Filters</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>Category: {selectedCategory === 'all' ? 'All' : selectedCategory}</div>
                    <div>State: {selectedState === 'all' ? 'All' : selectedState}</div>
                    <div>Search: {searchTerm || 'None'}</div>
                    <div>Results: {filteredPlaces.length} places</div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                {tripMode ? (
                  <>
                    <div>
                      <strong>Auto-Progress:</strong> Every 40 seconds
                    </div>
                    <div>
                      <strong>Algorithm:</strong> {tripData?.algorithm || 'AI-Optimized'}
                    </div>
                    <div>
                      <strong>Coordinate System:</strong> WGS84 (GPS)
                    </div>
                    <div>
                      <strong>Valid Waypoints:</strong> {tripWaypoints.length}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <strong>Map Source:</strong> OpenStreetMap
                    </div>
                    <div>
                      <strong>Total Places:</strong> {places.length}
                    </div>
                    <div>
                      <strong>Coordinate System:</strong> WGS84 (GPS)
                    </div>
                    <div>
                      <strong>Validated Places:</strong> {filteredPlaces.length}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="text-purple-600" size={20} />
                {tripMode ? 'Trip Statistics' : 'Map Statistics'}
              </h3>
            </div>
            
            {tripMode ? (
              <>
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
                      {tripData?.metrics?.totalDistance?.toFixed(0) || 0}
                    </div>
                    <div className="text-sm text-orange-800">KM</div>
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

                  {/* Starting Location Info */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="text-blue-600" size={16} />
                      <span className="font-medium text-blue-800">Journey Starting Point</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {tripData?.startLocation?.name || 'Unknown Location'}
                    </p>
                    <p className="text-xs text-blue-600">
                      All distances calculated from this location
                    </p>
                    {tripWaypoints[0] && (
                      <p className="text-xs text-blue-500 mt-1">
                        📍 {tripWaypoints[0].position[0].toFixed(4)}, {tripWaypoints[0].position[1].toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{places.length}</div>
                    <div className="text-sm text-blue-800">Total Places</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{filteredPlaces.length}</div>
                    <div className="text-sm text-green-800">Visible</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {[...new Set(places.map(p => p.state).filter(Boolean))].length}
                    </div>
                    <div className="text-sm text-purple-800">States</div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {[...new Set(places.map(p => p.category).filter(Boolean))].length}
                    </div>
                    <div className="text-sm text-orange-800">Categories</div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Map Mode:</span>
                    <span className="font-semibold">Exploration</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-semibold">{getCurrentDateTime().time}</span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Coordinate Format:</span>
                    <span className="font-semibold">Latitude, Longitude</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Instructions for New Users */}
        {tripMode && !tripInProgress && !tripCompleted && tripWaypoints.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Navigation className="text-white" size={24} />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Start Your Optimized Journey!
                </h3>
                <p className="text-gray-700 mb-4">
                  Your trip is planned with {tripWaypoints.length} stops starting from {tripData?.startLocation?.name || 'your selected location'}. 
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
                    <span>Real-time coordinate validation</span>
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

        {/* Error Display for Trip Mode */}
        {tripMode && tripWaypoints.length === 0 && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-red-800">Trip Route Error</h4>
                <p className="text-red-700 mt-1">
                  Unable to load trip route. This could be due to:
                </p>
                <ul className="text-red-600 mt-2 text-sm list-disc list-inside">
                  <li>Invalid coordinates in your selected places</li>
                  <li>Missing starting location data</li>
                  <li>Corrupted trip data in session storage</li>
                  <li>Trip data not properly saved from Trip Planner</li>
                </ul>
                <div className="mt-3 space-x-3">
                  <button
                    onClick={() => navigate('/trip-planner')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Return to Trip Planner
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Trip Data Warning */}
        {tripMode && !tripData && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-amber-800">No Trip Data Found</h4>
                <p className="text-amber-700 mt-1">
                  We couldn't find any trip data to display. This usually happens when:
                </p>
                <ul className="text-amber-600 mt-2 text-sm list-disc list-inside">
                  <li>You navigated directly to this URL without creating a trip</li>
                  <li>Your session expired or data was cleared</li>
                  <li>There was an issue saving your trip data</li>
                </ul>
                <p className="text-amber-700 mt-2 text-sm">
                  Please create a new trip from the Trip Planner to see your route on the map.
                </p>
                <button
                  onClick={() => navigate('/trip-planner')}
                  className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Go to Trip Planner
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coordinate Validation Info */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <div>
              <h4 className="font-medium text-gray-800">Enhanced Coordinate Validation & Trip Data Handling</h4>
              <p className="text-gray-600 text-sm mt-1">
                {tripMode 
                  ? `All ${tripWaypoints.length} trip waypoints have been validated with GPS coordinates.`
                  : `All ${filteredPlaces.length} visible places have validated coordinates in WGS84 format.`
                } Multiple coordinate formats and storage methods are supported for maximum compatibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewPage;