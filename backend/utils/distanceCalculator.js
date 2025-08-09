// backend/utils/distanceCalculator.js
const axios = require('axios');

class DistanceCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 5000;
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.rateLimitDelay = 100; // ms between API calls
    this.lastApiCall = 0;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Validate input coordinates
    if (!this.isValidCoordinate(lat1, lon1) || !this.isValidCoordinate(lat2, lon2)) {
      throw new Error('Invalid coordinates provided');
    }

    // Return 0 if same point
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate driving distance and time using Google Maps API
   * @param {Object} origin - {latitude, longitude}
   * @param {Object} destination - {latitude, longitude}
   * @param {Object} options - Additional options for API call
   * @returns {Object} Distance and duration information
   */
  async calculateDrivingDistance(origin, destination, options = {}) {
    const cacheKey = this.generateCacheKey(origin, destination, options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Fallback to Haversine if no API key
      if (!this.googleMapsApiKey) {
        const distance = this.calculateDistance(
          origin.latitude, origin.longitude,
          destination.latitude, destination.longitude
        );
        const result = this.createFallbackResult(distance);
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Rate limiting
      await this.enforceRateLimit();

      const response = await this.callGoogleMapsAPI(origin, destination, options);
      const result = this.parseGoogleMapsResponse(response);
      
      this.cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      console.warn('Google Maps API error:', error.message);
      
      // Fallback to Haversine calculation
      const distance = this.calculateDistance(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      );
      const result = this.createFallbackResult(distance);
      this.cacheResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Calculate distances for multiple destinations (matrix)
   * @param {Array} origins - Array of {latitude, longitude} objects
   * @param {Array} destinations - Array of {latitude, longitude} objects
   * @returns {Array} 2D array of distance information
   */
  async calculateDistanceMatrix(origins, destinations) {
    if (!origins.length || !destinations.length) {
      throw new Error('Origins and destinations arrays cannot be empty');
    }

    const matrix = [];
    
    // Use Google Distance Matrix API if available and efficient
    if (this.googleMapsApiKey && origins.length * destinations.length <= 25) {
      try {
        const result = await this.callGoogleDistanceMatrixAPI(origins, destinations);
        return result;
      } catch (error) {
        console.warn('Distance Matrix API failed, falling back to individual calculations');
      }
    }

            // Fallback to individual calculations
    for (let i = 0; i < origins.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < destinations.length; j++) {
        if (i === j && origins === destinations) {
          // Same point
          matrix[i][j] = {
            distance: 0,
            duration: 0,
            distanceText: '0 km',
            durationText: '0 mins',
            isFallback: true
          };
        } else {
          const result = await this.calculateDrivingDistance(origins[i], destinations[j]);
          matrix[i][j] = result;
        }
      }
    }

    return matrix;
  }

  /**
   * Find optimal route order using nearest neighbor algorithm
   * @param {Array} places - Array of place objects with location
   * @param {Object} startLocation - Starting location
   * @returns {Array} Optimized order of places
   */
  async findOptimalRoute(places, startLocation = null) {
    if (places.length <= 1) return places;

    const unvisited = [...places];
    const route = [];
    let currentLocation = startLocation || places[0].location;

    // Remove starting place from unvisited if it's in the array
    if (!startLocation) {
      route.push(unvisited.shift());
    }

    while (unvisited.length > 0) {
      let nearestPlace = null;
      let shortestDistance = Infinity;
      let nearestIndex = -1;

      // Find nearest unvisited place
      for (let i = 0; i < unvisited.length; i++) {
        const place = unvisited[i];
        const distance = this.calculateDistance(
          currentLocation.latitude, currentLocation.longitude,
          place.location.latitude, place.location.longitude
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestPlace = place;
          nearestIndex = i;
        }
      }

      if (nearestPlace) {
        route.push(nearestPlace);
        unvisited.splice(nearestIndex, 1);
        currentLocation = nearestPlace.location;
      } else {
        break;
      }
    }

    return route;
  }

  /**
   * Calculate total route distance and time
   * @param {Array} places - Ordered array of places
   * @param {Object} startLocation - Starting location
   * @returns {Object} Total distance and time information
   */
  async calculateRouteMetrics(places, startLocation = null) {
    if (places.length === 0) {
      return { totalDistance: 0, totalTime: 0, segments: [] };
    }

    let totalDistance = 0;
    let totalTime = 0;
    const segments = [];
    let currentLocation = startLocation || places[0].location;

    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      
      if (currentLocation !== place.location) {
        const segment = await this.calculateDrivingDistance(currentLocation, place.location);
        segments.push({
          from: currentLocation,
          to: place.location,
          ...segment
        });
        
        totalDistance += segment.distance;
        totalTime += segment.duration;
      }
      
      currentLocation = place.location;
    }

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime),
      totalDistanceText: `${totalDistance.toFixed(1)} km`,
      totalTimeText: this.formatDuration(totalTime),
      segments
    };
  }

  /**
   * Group places by proximity for efficient routing
   * @param {Array} places - Array of places
   * @param {number} maxDistance - Maximum distance for grouping (km)
   * @returns {Array} Array of place clusters
   */
  clusterPlacesByProximity(places, maxDistance = 25) {
    if (places.length === 0) return [];

    const clusters = [];
    const processed = new Set();

    places.forEach((place, index) => {
      if (processed.has(index)) return;

      const cluster = [place];
      processed.add(index);

      // Find nearby places
      places.forEach((otherPlace, otherIndex) => {
        if (processed.has(otherIndex) || index === otherIndex) return;

        const distance = this.calculateDistance(
          place.location.latitude, place.location.longitude,
          otherPlace.location.latitude, otherPlace.location.longitude
        );

        if (distance <= maxDistance) {
          cluster.push(otherPlace);
          processed.add(otherIndex);
        }
      });

      clusters.push({
        center: this.calculateClusterCenter(cluster),
        places: cluster,
        radius: this.calculateClusterRadius(cluster)
      });
    });

    return clusters.sort((a, b) => b.places.length - a.places.length);
  }

  /**
   * Private helper methods
   */
  
  isValidCoordinate(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
           lat >= -90 && lat <= 90 &&
           lon >= -180 && lon <= 180 &&
           !isNaN(lat) && !isNaN(lon);
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  generateCacheKey(origin, destination, options = {}) {
    const originKey = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`;
    const destKey = `${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`;
    const optionsKey = JSON.stringify(options);
    return `${originKey}-${destKey}-${optionsKey}`;
  }

  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    
    if (timeSinceLastCall < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastCall)
      );
    }
    
    this.lastApiCall = Date.now();
  }

  async callGoogleMapsAPI(origin, destination, options = {}) {
    const params = {
      origins: `${origin.latitude},${origin.longitude}`,
      destinations: `${destination.latitude},${destination.longitude}`,
      key: this.googleMapsApiKey,
      mode: options.mode || 'driving',
      avoid: options.avoid || '',
      departure_time: options.departureTime || 'now',
      traffic_model: options.trafficModel || 'best_guess',
      units: 'metric'
    };

    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const response = await axios.get(url, { 
      params,
      timeout: 10000 // 10 second timeout
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return response.data;
  }

  async callGoogleDistanceMatrixAPI(origins, destinations) {
    const originString = origins.map(o => `${o.latitude},${o.longitude}`).join('|');
    const destString = destinations.map(d => `${d.latitude},${d.longitude}`).join('|');

    const params = {
      origins: originString,
      destinations: destString,
      key: this.googleMapsApiKey,
      mode: 'driving',
      units: 'metric',
      departure_time: 'now',
      traffic_model: 'best_guess'
    };

    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const response = await axios.get(url, { 
      params,
      timeout: 30000 // 30 second timeout for matrix
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${response.data.status}`);
    }

    return this.parseMatrixResponse(response.data, origins, destinations);
  }

  parseGoogleMapsResponse(response) {
    const element = response.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error(`Route not found: ${element.status}`);
    }

    return {
      distance: element.distance.value / 1000, // Convert to km
      duration: element.duration.value / 60, // Convert to minutes
      durationInTraffic: element.duration_in_traffic ? 
        element.duration_in_traffic.value / 60 : element.duration.value / 60,
      distanceText: element.distance.text,
      durationText: element.duration.text,
      durationInTrafficText: element.duration_in_traffic?.text || element.duration.text,
      isFallback: false
    };
  }

  parseMatrixResponse(response, origins, destinations) {
    const matrix = [];
    
    for (let i = 0; i < origins.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < destinations.length; j++) {
        const element = response.rows[i].elements[j];
        
        if (element.status === 'OK') {
          matrix[i][j] = {
            distance: element.distance.value / 1000,
            duration: element.duration.value / 60,
            durationInTraffic: element.duration_in_traffic ? 
              element.duration_in_traffic.value / 60 : element.duration.value / 60,
            distanceText: element.distance.text,
            durationText: element.duration.text,
            durationInTrafficText: element.duration_in_traffic?.text || element.duration.text,
            isFallback: false
          };
        } else {
          // Fallback to Haversine
          const distance = this.calculateDistance(
            origins[i].latitude, origins[i].longitude,
            destinations[j].latitude, destinations[j].longitude
          );
          matrix[i][j] = this.createFallbackResult(distance);
        }
      }
    }
    
    return matrix;
  }

  createFallbackResult(distance) {
    const estimatedDuration = (distance / 50) * 60; // Assume 50 km/h average speed
    
    return {
      distance: distance,
      duration: estimatedDuration,
      durationInTraffic: estimatedDuration * 1.2, // Add 20% for traffic
      distanceText: `${distance.toFixed(1)} km`,
      durationText: this.formatDuration(estimatedDuration),
      durationInTrafficText: this.formatDuration(estimatedDuration * 1.2),
      isFallback: true
    };
  }

  cacheResult(key, result) {
    // Manage cache size
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, result);
  }

  formatDuration(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)} mins`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  calculateClusterCenter(places) {
    const sumLat = places.reduce((sum, place) => sum + place.location.latitude, 0);
    const sumLng = places.reduce((sum, place) => sum + place.location.longitude, 0);
    
    return {
      latitude: sumLat / places.length,
      longitude: sumLng / places.length
    };
  }

  calculateClusterRadius(places) {
    if (places.length <= 1) return 0;
    
    const center = this.calculateClusterCenter(places);
    let maxDistance = 0;
    
    places.forEach(place => {
      const distance = this.calculateDistance(
        center.latitude, center.longitude,
        place.location.latitude, place.location.longitude
      );
      maxDistance = Math.max(maxDistance, distance);
    });
    
    return maxDistance;
  }

  /**
   * Estimate travel cost based on distance and transport mode
   * @param {number} distance - Distance in km
   * @param {string} mode - Transport mode ('driving', 'taxi', 'bus')
   * @returns {Object} Cost estimation
   */
  estimateTravelCost(distance, mode = 'driving') {
    const rates = {
      driving: { perKm: 8, base: 0 }, // Petrol cost
      taxi: { perKm: 15, base: 50 }, // Taxi rates
      bus: { perKm: 2, base: 20 }, // Bus fare
      train: { perKm: 1.5, base: 15 } // Train fare
    };

    const rate = rates[mode] || rates.driving;
    const cost = rate.base + (distance * rate.perKm);

    return {
      mode,
      distance: `${distance.toFixed(1)} km`,
      estimatedCost: Math.round(cost),
      costBreakdown: {
        baseFare: rate.base,
        distanceFare: Math.round(distance * rate.perKm),
        total: Math.round(cost)
      }
    };
  }

  /**
   * Get distance statistics for a set of places
   * @param {Array} places - Array of places
   * @returns {Object} Distance statistics
   */
  async getDistanceStatistics(places) {
    if (places.length < 2) {
      return { 
        totalPlaces: places.length,
        message: 'Need at least 2 places for statistics' 
      };
    }

    const distances = [];
    
    // Calculate all pairwise distances
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const distance = this.calculateDistance(
          places[i].location.latitude, places[i].location.longitude,
          places[j].location.latitude, places[j].location.longitude
        );
        distances.push(distance);
      }
    }

    distances.sort((a, b) => a - b);

    return {
      totalPlaces: places.length,
      totalDistancePairs: distances.length,
      minDistance: distances[0],
      maxDistance: distances[distances.length - 1],
      averageDistance: distances.reduce((sum, d) => sum + d, 0) / distances.length,
      medianDistance: distances[Math.floor(distances.length / 2)],
      standardDeviation: this.calculateStandardDeviation(distances),
      clusters: this.clusterPlacesByProximity(places).length
    };
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Clear cache and reset calculator
   */
  reset() {
    this.cache.clear();
    this.lastApiCall = 0;
    console.log('Distance calculator cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      lastApiCall: new Date(this.lastApiCall).toISOString()
    };
  }
}

module.exports = DistanceCalculator;