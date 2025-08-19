// backend/utils/distanceCalculator.js - FIXED VERSION

class DistanceCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * Calculate straight-line distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    // Validate inputs
    if (typeof lat1 !== 'number' || typeof lng1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lng2 !== 'number') {
      console.warn('Invalid coordinates in calculateDistance:', { lat1, lng1, lat2, lng2 });
      return 25; // Default distance fallback
    }

    // Create cache key
    const key = `${lat1.toFixed(6)},${lng1.toFixed(6)}-${lat2.toFixed(6)},${lng2.toFixed(6)}`;
    
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    // Cache the result
    this.cacheResult(key, distance);
    
    return distance;
  }

  /**
   * FIXED: Calculate driving distance and time with consistent coordinate handling
   */
  async calculateDrivingDistance(from, to) {
    try {
      // FIXED: Handle both coordinate formats consistently
      const fromLat = from.lat || from.latitude;
      const fromLng = from.lng || from.longitude;
      const toLat = to.lat || to.latitude;
      const toLng = to.lng || to.longitude;

      // Validate coordinates exist and are numbers
      if (typeof fromLat !== 'number' || typeof fromLng !== 'number' ||
          typeof toLat !== 'number' || typeof toLng !== 'number') {
        throw new Error(`Invalid coordinates provided. From: {lat: ${fromLat}, lng: ${fromLng}}, To: {lat: ${toLat}, lng: ${toLng}}`);
      }

      // Validate coordinate ranges
      if (Math.abs(fromLat) > 90 || Math.abs(toLat) > 90 ||
          Math.abs(fromLng) > 180 || Math.abs(toLng) > 180) {
        throw new Error('Coordinates out of valid range');
      }

      const straightDistance = this.calculateDistance(fromLat, fromLng, toLat, toLng);

      // Simulate driving distance (typically 1.3-1.5x straight-line distance)
      const drivingDistance = straightDistance * 1.4;
      
      // Estimate driving time based on distance and terrain
      let estimatedSpeed = 40; // km/h average speed
      
      if (straightDistance < 20) {
        estimatedSpeed = 25; // City traffic
      } else if (straightDistance > 100) {
        estimatedSpeed = 60; // Highway
      }

      const drivingTime = (drivingDistance / estimatedSpeed) * 60; // Convert to minutes

      return {
        distance: Math.round(drivingDistance * 100) / 100, // Round to 2 decimal places
        duration: Math.round(drivingTime),
        estimatedSpeed,
        method: 'estimated',
        coordinates: {
          from: { lat: fromLat, lng: fromLng },
          to: { lat: toLat, lng: toLng }
        }
      };

    } catch (error) {
      console.error('Driving distance calculation failed:', error);
      
      return {
        distance: 25, // Safe fallback
        duration: 60, // Safe fallback
        estimatedSpeed: 25,
        method: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * Find nearest location from a given point
   */
  findNearest(fromLocation, toLocations) {
    let nearest = null;
    let minDistance = Infinity;
    let nearestIndex = -1;

    toLocations.forEach((location, index) => {
      try {
        const distance = this.calculateDistance(
          fromLocation.latitude || fromLocation.lat,
          fromLocation.longitude || fromLocation.lng,
          location.latitude || location.lat,
          location.longitude || location.lng
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearest = location;
          nearestIndex = index;
        }
      } catch (error) {
        console.warn(`Error calculating distance to location ${index}:`, error);
      }
    });

    return {
      location: nearest,
      distance: minDistance,
      index: nearestIndex
    };
  }

  /**
   * Sort locations by distance from a reference point
   */
  sortByDistance(referencePoint, locations) {
    return locations
      .map(location => {
        try {
          const distance = this.calculateDistance(
            referencePoint.latitude || referencePoint.lat,
            referencePoint.longitude || referencePoint.lng,
            location.latitude || location.lat,
            location.longitude || location.lng
          );
          return { location, distance };
        } catch (error) {
          console.warn('Error calculating distance for sorting:', error);
          return { location, distance: Infinity };
        }
      })
      .sort((a, b) => a.distance - b.distance)
      .map(item => ({
        ...item.location,
        distanceFromReference: item.distance
      }));
  }

  /**
   * Calculate total route distance
   */
  calculateRouteDistance(locations) {
    if (locations.length < 2) return 0;

    let totalDistance = 0;
    
    for (let i = 1; i < locations.length; i++) {
      try {
        totalDistance += this.calculateDistance(
          locations[i-1].latitude || locations[i-1].lat,
          locations[i-1].longitude || locations[i-1].lng,
          locations[i].latitude || locations[i].lat,
          locations[i].longitude || locations[i].lng
        );
      } catch (error) {
        console.warn(`Error calculating segment ${i-1} to ${i}:`, error);
        totalDistance += 25; // Add fallback distance
      }
    }

    return totalDistance;
  }

  /**
   * Estimate travel time between locations
   */
  estimateTravelTime(fromLocation, toLocation, transportMode = 'car') {
    try {
      const distance = this.calculateDistance(
        fromLocation.latitude || fromLocation.lat,
        fromLocation.longitude || fromLocation.lng,
        toLocation.latitude || toLocation.lat,
        toLocation.longitude || toLocation.lng
      );

      let speed; // km/h
      switch (transportMode) {
        case 'walking':
          speed = 5;
          break;
        case 'bicycle':
          speed = 15;
          break;
        case 'car':
          speed = distance < 20 ? 25 : distance > 100 ? 60 : 40;
          break;
        case 'bus':
          speed = distance < 20 ? 20 : distance > 50 ? 45 : 30;
          break;
        default:
          speed = 40;
      }

      const timeInHours = distance / speed;
      const timeInMinutes = timeInHours * 60;

      return {
        distance,
        timeInMinutes: Math.round(timeInMinutes),
        estimatedSpeed: speed,
        transportMode
      };
    } catch (error) {
      console.error('Travel time estimation failed:', error);
      return {
        distance: 25,
        timeInMinutes: 60,
        estimatedSpeed: 25,
        transportMode,
        error: error.message
      };
    }
  }

  /**
   * Check if a point is within a certain radius
   */
  isWithinRadius(centerPoint, testPoint, radiusKm) {
    try {
      const distance = this.calculateDistance(
        centerPoint.latitude || centerPoint.lat,
        centerPoint.longitude || centerPoint.lng,
        testPoint.latitude || testPoint.lat,
        testPoint.longitude || testPoint.lng
      );
      
      return distance <= radiusKm;
    } catch (error) {
      console.warn('Error checking radius:', error);
      return false;
    }
  }

  /**
   * Get bounding box for a set of coordinates
   */
  getBoundingBox(locations, paddingKm = 5) {
    if (locations.length === 0) {
      return null;
    }

    let minLat = locations[0].latitude || locations[0].lat;
    let maxLat = locations[0].latitude || locations[0].lat;
    let minLng = locations[0].longitude || locations[0].lng;
    let maxLng = locations[0].longitude || locations[0].lng;

    locations.forEach(location => {
      const lat = location.latitude || location.lat;
      const lng = location.longitude || location.lng;
      
      if (typeof lat === 'number' && typeof lng === 'number') {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });

    // Add padding
    const latPadding = paddingKm / 111; // Roughly 111 km per degree latitude
    const lngPadding = paddingKm / (111 * Math.cos(this.toRadians((minLat + maxLat) / 2)));

    return {
      southwest: {
        latitude: minLat - latPadding,
        longitude: minLng - lngPadding
      },
      northeast: {
        latitude: maxLat + latPadding,
        longitude: maxLng + lngPadding
      },
      center: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2
      }
    };
  }

  /**
   * Helper method to convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Cache management
   */
  cacheResult(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Distance calculator cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 'Not tracked'
    };
  }

  /**
   * Validate coordinate object format
   */
  validateCoordinates(coordinates) {
    if (!coordinates) return false;
    
    const lat = coordinates.lat || coordinates.latitude;
    const lng = coordinates.lng || coordinates.longitude;
    
    return typeof lat === 'number' && typeof lng === 'number' &&
           Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  /**
   * Normalize coordinate format to consistent structure
   */
  normalizeCoordinates(coordinates) {
    if (!coordinates) return null;
    
    return {
      latitude: coordinates.lat || coordinates.latitude,
      longitude: coordinates.lng || coordinates.longitude
    };
  }
}

module.exports = DistanceCalculator;