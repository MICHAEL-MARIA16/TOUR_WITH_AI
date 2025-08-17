import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import { 
  Map as MapIcon, 
  Navigation, 
  Filter, 
  Search,
  MapPin,
  Layers
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

const COIMBATORE_TIDAL_PARK = {
  id: 'static-coimbatore-tidal-park', // unique id for your static location
  name: 'Coimbatore Tidal Park',
  location: {
    latitude: 11.0142,  // example latitude - replace with exact coordinates
    longitude: 76.9642  // example longitude - replace with exact coordinates
  },
  category: 'user-location', // for custom icon or styling
  averageVisitDuration: 0, // no visit duration needed for start location
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
  const [routeWaypoints, setRouteWaypoints] = useState([]);   // full optimized route including start
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);  // which place is "visited" now
  const [visitedPlaceIds, setVisitedPlaceIds] = useState(new Set());

  // Create custom icons for different categories
  const createCustomIcon = (category, isSelected = false) => {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['temple'];
    const color = isSelected ? '#ef4444' : config.color;
    
    function safeBtoa(str) {
      return btoa(unescape(encodeURIComponent(str)));
    }

    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${safeBtoa(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="3"/>
          <text x="16" y="21" font-family="Arial" font-size="16" text-anchor="middle" fill="white">
            ${config.icon}
          </text>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Load places from API
  useEffect(() => {
    const loadPlaces = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }

      try {
        console.log('🗺️ Loading places for map view...');
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
            // Calculate bounds for all places
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

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }

    // Filter by state
    if (selectedState !== 'all') {
      filtered = filtered.filter(place => 
        place.state && place.state.toLowerCase().includes(selectedState.toLowerCase())
      );
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(search) ||
        place.city.toLowerCase().includes(search) ||
        place.state.toLowerCase().includes(search) ||
        place.description.toLowerCase().includes(search)
      );
    }

    setFilteredPlaces(filtered);

    // Update map center if filtered results are available
    if (filtered.length > 0) {
      const bounds = calculateBounds(filtered);
      setMapCenter([bounds.centerLat, bounds.centerLng]);
    }
  }, [selectedCategory, selectedState, searchTerm, places]);

  // Fetch optimized route always starting from Coimbatore Tidal Park
  const fetchOptimizedRoute = async (selectedPlaceIds) => {
    try {
      if (!selectedPlaceIds.length) return;

      const startLocation = {
        latitude: COIMBATORE_TIDAL_PARK.location.latitude,
        longitude: COIMBATORE_TIDAL_PARK.location.longitude,
      };

      const response = await apiService.getOptimizedRoute({
        placeIds: selectedPlaceIds,
        startLocation,
      });

      if (response.success && response.data) {
        const waypointsWithStart = [
          {
            id: COIMBATORE_TIDAL_PARK.id,
            name: COIMBATORE_TIDAL_PARK.name,
            position: [startLocation.latitude, startLocation.longitude],
            order: 0,
            visitDuration: 0,
          },
          ...response.data.waypoints.map(wp => ({
            ...wp,
            position: wp.position,
          })),
        ];

        setRouteWaypoints(waypointsWithStart);
        setCurrentWaypointIndex(0);
        setVisitedPlaceIds(new Set());

        if (waypointsWithStart.length > 0) {
          setMapCenter(waypointsWithStart[0].position);
          setMapZoom(13);
        }
      } else {
        toast.error('Failed to fetch optimized route');
      }
    } catch (error) {
      toast.error('Error fetching optimized route');
      console.error(error);
    }
  };

  // Trigger optimized route fetching based on filtered places
  useEffect(() => {
    const filteredPlaceIds = filteredPlaces.map(p => p._id || p.id).filter(Boolean);
    fetchOptimizedRoute(filteredPlaceIds);
  }, [filteredPlaces]);

  // Auto-progress the current place every 40 seconds and mark visited
  useEffect(() => {
    if (!routeWaypoints.length) return;

    const interval = setInterval(() => {
      setCurrentWaypointIndex(prevIndex => {
        setVisitedPlaceIds(prevVisited => {
          const newVisited = new Set(prevVisited);
          newVisited.add(routeWaypoints[prevIndex].id);
          return newVisited;
        });

        const nextIndex = (prevIndex + 1) < routeWaypoints.length ? (prevIndex + 1) : 0;
        setMapCenter(routeWaypoints[nextIndex].position);

        return nextIndex;
      });
    }, 40000);  // 40 seconds interval

    return () => clearInterval(interval);
  }, [routeWaypoints]);

  // Get unique states from places
  const getUniqueStates = () => {
    const states = [...new Set(places.map(place => place.state))].filter(Boolean);
    return states.sort();
  };

  // Get unique categories from places
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MapIcon className="text-blue-600" size={32} />
                Interactive Map Explorer
              </h1>
              <p className="text-gray-600 mt-2">
                Explore South Indian destinations on an interactive OpenStreetMap
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
            >
              <Filter size={20} />
              Filters
            </button>
          </div>

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

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <LoadingSpinner message="Loading map data..." size="large" />
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
                
                {/* Static Start Location Marker: Coimbatore Tidal Park */}
                <Marker
                  key={COIMBATORE_TIDAL_PARK.id}
                  position={[COIMBATORE_TIDAL_PARK.location.latitude, COIMBATORE_TIDAL_PARK.location.longitude]}
                  icon={new Icon({
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Example green marker icon, replace as needed
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                  })}
                >
                  <Popup>{COIMBATORE_TIDAL_PARK.name} (Start Location)</Popup>
                </Marker>

                {/* Route Waypoints Markers with visited and current styling */}
                {routeWaypoints.map((wp, index) => {
                  if (wp.id === COIMBATORE_TIDAL_PARK.id) return null; // skip startpoint already shown above

                  const isVisited = visitedPlaceIds.has(wp.id);
                  const isCurrent = index === currentWaypointIndex;

                  let iconColor = '#3b82f6'; // blue
                  if (isCurrent) iconColor = '#ef4444'; // red
                  else if (isVisited) iconColor = '#6b7280'; // gray

                  const icon = new Icon({
                    iconUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(`
                      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="12" fill="${iconColor}" stroke="white" stroke-width="3" />
                        <text x="16" y="21" font-family="Arial" font-size="16" text-anchor="middle" fill="white">${index}</text>
                      </svg>
                    `)))}`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                  });

                  return (
                    <Marker key={wp.id} position={wp.position} icon={icon}>
                      <Popup>
                        <div>
                          <h3 className="font-bold">{wp.name}</h3>
                          <div>Visit order: {wp.order}</div>
                          <div>Duration: {wp.visitDuration} min</div>
                          {isCurrent && <div className="text-red-600 font-semibold">Current location</div>}
                          {isVisited && !isCurrent && <div className="text-gray-600 font-semibold">Visited</div>}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Polyline for Route */}
                {routeWaypoints.length > 1 && (
                  <Polyline
                    positions={routeWaypoints.map(wp => wp.position)}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: 4,
                      opacity: 0.8,
                      dashArray: '10, 5',
                    }}
                  />
                )}
              </MapContainer>

              {/* Map Overlay Info */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border">
                <div className="text-sm text-gray-700">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>OpenStreetMap</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Free • No API Keys Required
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map Legend */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="text-blue-600" size={20} />
              Map Legend
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: config.color }}
                >
                  {config.icon}
                </div>
                <span className="text-sm text-gray-700">{config.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <strong>Total Places:</strong> {places.length}
              </div>
              <div>
                <strong>Showing:</strong> {filteredPlaces.length}
              </div>
              <div>
                <strong>Map Technology:</strong> Leaflet.js + OpenStreetMap
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewPage;
