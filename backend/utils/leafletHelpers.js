// backend/utils/leafletHelpers.js

/**
 * Leaflet.js Helper Utilities for TourWithAI
 * Provides server-side utilities for Leaflet map operations
 */

class LeafletHelpers {
  constructor() {
    // Define standard map configurations
    this.mapConfigs = {
      southIndia: {
        center: [12.9716, 77.5946], // Bangalore as center
        zoom: 7,
        bounds: [
          [8.0883, 68.1766],  // South-West corner
          [19.9975, 84.7750]  // North-East corner
        ]
      },
      india: {
        center: [20.5937, 78.9629],
        zoom: 5,
        bounds: [
          [6.5546, 68.1113],
          [35.6745, 97.4025]
        ]
      }
    };

    // Define marker icons configuration for different categories
    this.markerIcons = {
      temple: {
        iconUrl: '/icons/temple.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#8B0000' // Dark red
      },
      palace: {
        iconUrl: '/icons/palace.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#FFD700' // Gold
      },
      'hill-station': {
        iconUrl: '/icons/mountain.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#228B22' // Forest green
      },
      heritage: {
        iconUrl: '/icons/heritage.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#8B4513' // Saddle brown
      },
      beach: {
        iconUrl: '/icons/beach.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#4169E1' // Royal blue
      },
      wildlife: {
        iconUrl: '/icons/wildlife.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#32CD32' // Lime green
      },
      nature: {
        iconUrl: '/icons/nature.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#006400' // Dark green
      },
      fort: {
        iconUrl: '/icons/fort.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        color: '#708090' // Slate gray
      }
    };

    // Default marker for unknown categories
    this.defaultMarker = {
      iconUrl: '/icons/default.png',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
      color: '#FF0000' // Red
    };
  }

  /**
   * Get optimal map configuration for given places
   */
  getMapConfigForPlaces(places) {
    if (!places || places.length === 0) {
      return this.mapConfigs.southIndia;
    }

    const latitudes = places.map(p => p.location?.latitude || p.latitude).filter(Boolean);
    const longitudes = places.map(p => p.location?.longitude || p.longitude).filter(Boolean);

    if (latitudes.length === 0 || longitudes.length === 0) {
      return this.mapConfigs.southIndia;
    }

    const bounds = this.calculateBounds(latitudes, longitudes);
    const center = this.calculateCenter(bounds);
    const zoom = this.calculateOptimalZoom(bounds);

    return {
      center: [center.lat, center.lng],
      zoom,
      bounds: [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ]
    };
  }

  /**
   * Calculate bounds from coordinates
   */
  calculateBounds(latitudes, longitudes) {
    return {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes)
    };
  }

  /**
   * Calculate center point
   */
  calculateCenter(bounds) {
    return {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2
    };
  }

  /**
   * Calculate optimal zoom level based on bounds
   */
  calculateOptimalZoom(bounds) {
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);

    // Zoom levels based on geographic span
    if (maxDiff > 20) return 5;      // Country level
    if (maxDiff > 10) return 6;      // Multi-state level
    if (maxDiff > 5) return 7;       // State level
    if (maxDiff > 2) return 8;       // Region level
    if (maxDiff > 1) return 9;       // Large city level
    if (maxDiff > 0.5) return 10;    // City level
    if (maxDiff > 0.1) return 11;    // District level
    if (maxDiff > 0.05) return 12;   // Neighborhood level
    return 13;                       // Street level
  }

  /**
   * Format place data for Leaflet markers
   */
  formatPlacesForMarkers(places) {
    return places.map(place => {
      const markerConfig = this.getMarkerConfig(place.category);
      
      return {
        id: place._id || place.id,
        position: [
          place.location?.latitude || place.latitude,
          place.location?.longitude || place.longitude
        ],
        icon: markerConfig,
        popup: this.generatePopupContent(place),
        tooltip: place.name,
        category: place.category,
        rating: place.rating,
        data: {
          name: place.name,
          description: place.description,
          city: place.city,
          state: place.state,
          category: place.category,
          rating: place.rating,
          entryFee: place.entryFee,
          averageVisitDuration: place.averageVisitDuration
        }
      };
    });
  }

  /**
   * Get marker configuration for category
   */
  getMarkerConfig(category) {
    return this.markerIcons[category?.toLowerCase()] || this.defaultMarker;
  }

  /**
   * Generate HTML content for marker popups
   */
  generatePopupContent(place) {
    const rating = '★'.repeat(Math.floor(place.rating || 0)) + 
                  '☆'.repeat(5 - Math.floor(place.rating || 0));
    
    const entryFeeText = place.entryFee?.indian === 0 
      ? 'Free Entry' 
      : `₹${place.entryFee?.indian || 'N/A'}`;

    const duration = place.averageVisitDuration 
      ? `${Math.round(place.averageVisitDuration / 60)} hours`
      : 'N/A';

    return `
      <div class="place-popup">
        <h3 class="place-name">${place.name}</h3>
        <div class="place-rating">${rating} (${place.rating || 'N/A'})</div>
        <div class="place-location">${place.city}, ${place.state}</div>
        <div class="place-category">${this.formatCategory(place.category)}</div>
        <div class="place-fee">Entry: ${entryFeeText}</div>
        <div class="place-duration">Visit Duration: ${duration}</div>
        <p class="place-description">${this.truncateText(place.description, 100)}</p>
        <div class="place-actions">
          <button onclick="addToTrip('${place._id || place.id}')" class="btn-add-trip">Add to Trip</button>
          <button onclick="showDetails('${place._id || place.id}')" class="btn-details">Details</button>
        </div>
      </div>
    `;
  }

  /**
   * Format category name for display
   */
  formatCategory(category) {
    if (!category) return 'Unknown';
    
    const categoryMap = {
      'hill-station': 'Hill Station',
      'wildlife': 'Wildlife Sanctuary',
      'temple': 'Temple',
      'palace': 'Palace',
      'heritage': 'Heritage Site',
      'beach': 'Beach',
      'nature': 'Nature Spot',
      'fort': 'Fort'
    };

    return categoryMap[category.toLowerCase()] || 
           category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Truncate text for popups
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Generate route polyline configuration
   */
  generateRoutePolyline(coordinates, options = {}) {
    return {
      coordinates,
      options: {
        color: options.color || '#3388ff',
        weight: options.weight || 5,
        opacity: options.opacity || 0.7,
        smoothFactor: options.smoothFactor || 1.0,
        ...options
      }
    };
  }

  /**
   * Generate cluster marker configuration
   */
  generateClusterConfig(places, options = {}) {
    return {
      showCoverageOnHover: options.showCoverageOnHover !== false,
      zoomToBoundsOnClick: options.zoomToBoundsOnClick !== false,
      maxClusterRadius: options.maxClusterRadius || 80,
      disableClusteringAtZoom: options.disableClusteringAtZoom || 15,
      iconCreateFunction: this.createClusterIcon,
      ...options
    };
  }

  /**
   * Create custom cluster icon
   */
  createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    let size = 'small';
    
    if (count >= 100) size = 'large';
    else if (count >= 10) size = 'medium';

    return {
      html: `<div><span>${count}</span></div>`,
      className: `marker-cluster marker-cluster-${size}`,
      iconSize: [40, 40]
    };
  }

  /**
   * Generate heatmap configuration
   */
  generateHeatmapConfig(data, options = {}) {
    return {
      data,
      options: {
        radius: options.radius || 25,
        blur: options.blur || 15,
        maxZoom: options.maxZoom || 17,
        max: options.max || 1.0,
        minOpacity: options.minOpacity || 0.4,
        gradient: options.gradient || {
          0.4: 'blue',
          0.6: 'cyan', 
          0.7: 'lime',
          0.8: 'yellow',
          1.0: 'red'
        },
        ...options
      }
    };
  }

  /**
   * Calculate distance between two points (for client-side use)
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if point is within bounds
   */
  isPointInBounds(point, bounds) {
    return point.lat >= bounds.south && 
           point.lat <= bounds.north &&
           point.lng >= bounds.west && 
           point.lng <= bounds.east;
  }

  /**
   * Generate tile layer configurations for OpenStreetMap
   */
  getTileLayerConfigs() {
    return {
      openStreetMap: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        tileSize: 256
      },
      openStreetMapFrance: {
        url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20
      },
      openTopoMap: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        maxZoom: 17
      },
      cartoDB: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd'
      },
      stamen: {
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png',
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        subdomains: 'abcd'
      }
    };
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat, lng) {
    return typeof lat === 'number' && 
           typeof lng === 'number' &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180 &&
           !isNaN(lat) && !isNaN(lng);
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(lat, lng, precision = 6) {
    if (!this.validateCoordinates(lat, lng)) {
      return 'Invalid coordinates';
    }

    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    
    return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lng).toFixed(precision)}°${lngDir}`;
  }

  /**
   * Get responsive map options based on screen size
   */
  getResponsiveMapOptions(screenWidth) {
    const isMobile = screenWidth < 768;
    const isTablet = screenWidth >= 768 && screenWidth < 1024;

    return {
      zoomControl: !isMobile,
      attributionControl: !isMobile,
      scrollWheelZoom: !isMobile,
      doubleClickZoom: true,
      touchZoom: isMobile,
      tap: isMobile,
      zoomSnap: isMobile ? 0.5 : 1,
      zoomDelta: isMobile ? 0.5 : 1,
      maxBounds: isMobile ? this.mapConfigs.southIndia.bounds : null,
      minZoom: isMobile ? 6 : 5,
      maxZoom: isMobile ? 16 : 18
    };
  }
}

module.exports = new LeafletHelpers();