import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { 
  Maximize2, 
  Minimize2, 
  Navigation, 
  MapPin, 
  Layers,
  Locate,
  Info
} from 'lucide-react';
import { CONSTANTS, MAP_CONFIG, PLACE_CATEGORIES } from '../utils/constants';
import toast from 'react-hot-toast';

const MapView = ({
  places,
  selectedPlaces,
  optimizedRoute,
  visitedPlaces,
  onPlaceSelect,
  onPlaceVisited
}) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef(new Map());
  const routePolylineRef = useRef(null);
  const infoWindowRef = useRef(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState('default');
  const [userLocation, setUserLocation] = useState(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!CONSTANTS.Maps_API_KEY) {
          throw new Error('Google Maps API key is not configured');
        }

        const loader = new Loader({
          apiKey: CONSTANTS.Maps_API_KEY,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        await loader.load();
        
        // Initialize map
        const map = new window.google.maps.Map(mapRef.current, {
          center: CONSTANTS.DEFAULT_MAP_CENTER,
          zoom: CONSTANTS.DEFAULT_MAP_ZOOM,
          styles: MAP_CONFIG.STYLES[mapStyle],
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: false, // We'll use custom fullscreen
          zoomControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google.maps.ControlPosition.TOP_RIGHT,
          },
          gestureHandling: 'greedy'
        });

        googleMapRef.current = map;
        
        // Initialize info window
        infoWindowRef.current = new window.google.maps.InfoWindow({
          maxWidth: 300
        });

        // Add traffic layer
        const trafficLayer = new window.google.maps.TrafficLayer();
        if (showTraffic) {
          trafficLayer.setMap(map);
        }

        setIsMapLoaded(true);
        setMapError(null);

      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        setMapError(error.message);
        toast.error('Failed to load Google Maps');
      }
    };

    if (mapRef.current && !isMapLoaded) {
      initMap();
    }
  }, [mapStyle, showTraffic, isMapLoaded]);

  // Update markers when places change
  useEffect(() => {
    if (!isMapLoaded || !googleMapRef.current) return;

    updateMarkers();
  }, [places, selectedPlaces, visitedPlaces, isMapLoaded]);

  // Update route when optimized route changes
  useEffect(() => {
    if (!isMapLoaded || !googleMapRef.current) return;

    updateRoute();
  }, [optimizedRoute, isMapLoaded]);

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          
          if (googleMapRef.current) {
            // Add user location marker
            new window.google.maps.Marker({
              position: location,
              map: googleMapRef.current,
              title: 'Your Location',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg fill="#4285f4" width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(24, 24),
                anchor: new window.google.maps.Point(12, 12)
              },
              zIndex: 1000
            });
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isMapLoaded]);

  const updateMarkers = useCallback(() => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();

    // Add markers for all places
    places.forEach((place, index) => {
      const isSelected = selectedPlaces.some(p => p.id === place.id);
      const isVisited = visitedPlaces.has(place.id);
      const routeIndex = optimizedRoute?.findIndex(p => p.id === place.id);
      const category = PLACE_CATEGORIES[place.category];

      // Determine marker color and icon
      let markerColor = MAP_CONFIG.MARKER_COLORS.unselected;
      let markerLabel = '';
      
      if (isVisited) {
        markerColor = MAP_CONFIG.MARKER_COLORS.visited;
        markerLabel = '✓';
      } else if (routeIndex >= 0) {
        markerColor = MAP_CONFIG.MARKER_COLORS.route;
        markerLabel = (routeIndex + 1).toString();
      } else if (isSelected) {
        markerColor = MAP_CONFIG.MARKER_COLORS.selected;
      }

      // Create custom marker icon
      const markerIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.2 0 0 7.2 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.2 24.8 0 16 0Z" fill="${markerColor}"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <text x="16" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${markerColor}">
              ${markerLabel || category?.icon || '📍'}
            </text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(32, 40),
        anchor: new window.google.maps.Point(16, 40)
      };

      // Create marker
      const marker = new window.google.maps.Marker({
        position: { lat: place.location.latitude, lng: place.location.longitude },
        map: googleMapRef.current,
        title: place.name,
        icon: markerIcon,
        animation: isSelected || routeIndex >= 0 ? window.google.maps.Animation.BOUNCE : null,
        zIndex: isVisited ? 999 : (isSelected ? 998 : (routeIndex >= 0 ? 997 : 1))
      });

      // Add click listener
      marker.addListener('click', () => {
        showPlaceInfo(place, marker);
      });

      // Store marker reference
      markersRef.current.set(place.id, marker);
    });

    // Fit bounds if there are selected places
    if (selectedPlaces.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      selectedPlaces.forEach(place => {
        bounds.extend({
          lat: place.location.latitude,
          lng: place.location.longitude
        });
      });
      
      // Add some padding
      googleMapRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 400 // Account for sidebar
      });
    }
  }, [places, selectedPlaces, visitedPlaces, optimizedRoute]);

  const updateRoute = useCallback(() => {
    if (!googleMapRef.current) return;

    // Clear existing route
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    // Draw new route if optimized route exists
    if (optimizedRoute && optimizedRoute.length > 1) {
      const routePath = optimizedRoute.map(place => ({
        lat: place.location.latitude,
        lng: place.location.longitude
      }));

      routePolylineRef.current = new window.google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: MAP_CONFIG.MARKER_COLORS.route,
        strokeOpacity: 1.0,
        strokeWeight: 3,
        icons: [{
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: MAP_CONFIG.MARKER_COLORS.route,
            fillColor: MAP_CONFIG.MARKER_COLORS.route,
            fillOpacity: 1
          },
          repeat: '100px'
        }]
      });

      routePolylineRef.current.setMap(googleMapRef.current);
    }
  }, [optimizedRoute]);

  const showPlaceInfo = (place, marker) => {
    const isSelected = selectedPlaces.some(p => p.id === place.id);
    const isVisited = visitedPlaces.has(place.id);
    const category = PLACE_CATEGORIES[place.category];

    const content = `
      <div class="map-info-window">
        <div class="info-header">
          <div class="info-category" style="color: ${category?.color}">
            ${category?.icon} ${category?.label}
          </div>
          <h3>${place.name}</h3>
          <p class="info-location">${place.city}, ${place.state}</p>
        </div>
        
        <div class="info-details">
          ${place.rating ? `
            <div class="info-rating">
              ⭐ ${place.rating}/5
            </div>
          ` : ''}
          
          <div class="info-meta">
            <div class="meta-item">
              🕐 ${Math.round(place.averageVisitDuration / 60)}h ${place.averageVisitDuration % 60}m
            </div>
            <div class="meta-item">
              💰 ${place.entryFee?.indian === 0 ? 'Free' : `₹${place.entryFee?.indian}`}
            </div>
          </div>
          
          <p class="info-description">${place.description.substring(0, 150)}...</p>
          
          ${place.amenities && place.amenities.length > 0 ? `
            <div class="info-amenities">
              ${place.amenities.slice(0, 3).map(amenity => `<span class="amenity">${amenity}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="info-actions">
          <button 
            class="info-btn ${isSelected ? 'selected' : ''}" 
            onclick="window.togglePlaceSelection('${place.id}')"
          >
            ${isSelected ? 'Remove from Selection' : 'Add to Selection'}
          </button>
          
          ${isSelected ? `
            <button 
              class="info-btn ${isVisited ? 'visited' : ''}" 
              onclick="window.togglePlaceVisited('${place.id}')"
            >
              ${isVisited ? 'Mark as Not Visited' : 'Mark as Visited'}
            </button>
          ` : ''}
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(googleMapRef.current, marker);
  };

  // Global functions for info window buttons
  useEffect(() => {
    window.togglePlaceSelection = (placeId) => {
      const place = places.find(p => p.id === placeId);
      if (place) {
        const isSelected = selectedPlaces.some(p => p.id === placeId);
        onPlaceSelect(place, !isSelected);
        infoWindowRef.current.close();
      }
    };

    window.togglePlaceVisited = (placeId) => {
      const isVisited = visitedPlaces.has(placeId);
      onPlaceVisited(placeId, !isVisited);
      infoWindowRef.current.close();
    };

    return () => {
      delete window.togglePlaceSelection;
      delete window.togglePlaceVisited;
    };
  }, [places, selectedPlaces, visitedPlaces, onPlaceSelect, onPlaceVisited]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const centerOnUserLocation = () => {
    if (userLocation && googleMapRef.current) {
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(12);
    } else {
      toast.error('Location not available');
    }
  };

  const centerOnPlaces = () => {
    if (!googleMapRef.current) return;

    if (selectedPlaces.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      selectedPlaces.forEach(place => {
        bounds.extend({
          lat: place.location.latitude,
          lng: place.location.longitude
        });
      });
      googleMapRef.current.fitBounds(bounds);
    } else {
      googleMapRef.current.setCenter(CONSTANTS.DEFAULT_MAP_CENTER);
      googleMapRef.current.setZoom(CONSTANTS.DEFAULT_MAP_ZOOM);
    }
  };

  const toggleTraffic = () => {
    setShowTraffic(!showTraffic);
    // Traffic layer toggle will be handled in the map initialization effect
  };

  if (mapError) {
    return (
      <div className="map-error">
        <div className="error-content">
          <MapPin className="error-icon" />
          <h3>Map Loading Error</h3>
          <p>{mapError}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-view ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Map Controls */}
      <div className="map-controls">
        <div className="control-group">
          <button
            onClick={toggleFullscreen}
            className="map-control-btn"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button
            onClick={centerOnUserLocation}
            className="map-control-btn"
            title="Center on My Location"
            disabled={!userLocation}
          >
            <Locate size={18} />
          </button>

          <button
            onClick={centerOnPlaces}
            className="map-control-btn"
            title="Fit Selected Places"
          >
            <Navigation size={18} />
          </button>
        </div>

        <div className="control-group">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="map-style-select"
            title="Map Style"
          >
            <option value="default">Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>

          <button
            onClick={toggleTraffic}
            className={`map-control-btn ${showTraffic ? 'active' : ''}`}
            title="Toggle Traffic Layer"
          >
            <Layers size={18} />
          </button>
        </div>
      </div>

      {/* Map Legend */}
      {(selectedPlaces.length > 0 || optimizedRoute) && (
        <div className="map-legend">
          <h4>Legend</h4>
          <div className="legend-items">
            {optimizedRoute && (
              <div className="legend-item">
                <div className="legend-marker route-marker">1</div>
                <span>Route Order</span>
              </div>
            )}
            <div className="legend-item">
              <div className="legend-marker selected-marker"></div>
              <span>Selected</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker visited-marker">✓</div>
              <span>Visited</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker unselected-marker"></div>
              <span>Available</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="google-map-container">
        {!isMapLoaded && (
          <div className="map-loading">
            <div className="loading-spinner"></div>
            <p>Loading Google Maps...</p>
          </div>
        )}
        
        <div
          ref={mapRef}
          className="google-map"
          style={{ 
            width: '100%', 
            height: '100%',
            visibility: isMapLoaded ? 'visible' : 'hidden'
          }}
        />
      </div>

      {/* Map Stats */}
      {selectedPlaces.length > 0 && (
        <div className="map-stats">
          <div className="stat-item">
            <MapPin className="stat-icon" />
            <span>{selectedPlaces.length} selected</span>
          </div>
          
          {optimizedRoute && optimizedRoute.length > 0 && (
            <div className="stat-item">
              <Navigation className="stat-icon" />
              <span>Route optimized</span>
            </div>
          )}
          
          {visitedPlaces.size > 0 && (
            <div className="stat-item">
              <Info className="stat-icon" />
              <span>{visitedPlaces.size} visited</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;