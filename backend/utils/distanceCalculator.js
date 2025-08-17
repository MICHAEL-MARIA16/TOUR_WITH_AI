// backend/utils/distanceCalculator.js

class DistanceCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * Calculate straight-line distance between two coordinates using Haversine formula
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
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
   * Calculate driving distance and time (simulated - uses straight-line with multiplier)
   */
  async calculateDrivingDistance(from, to) {
    try {
      const straightDistance = this.calculateDistance(
        from.latitude, from.longitude,
        from.latitude, from.longitude
      );

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
        method: 'estimated'
      };
    } catch (error) {
      console.error('Driving distance calculation failed:', error);
      
      // Fallback to straight-line distance
      const fallbackDistance = this.calculateDistance(
        from.latitude, from.longitude,
        to.latitude, to.longitude
      );
      
      return {
        distance: fallbackDistance,
        duration: Math.round((fallbackDistance / 30) * 60), // 30 km/h fallback speed
        estimatedSpeed: 30,
        method: 'fallback'
      };
    }
  }

  /**
   * Calculate distance matrix between multiple points
   */
  calculateDistanceMatrix(locations) {
    const matrix = [];
    
    for (let i = 0; i < locations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < locations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = this.calculateDistance(
            locations[i].latitude, locations[i].longitude,
            locations[j].latitude, locations[j].longitude
          );
        }
      }
    }
    
    return matrix;
  }

  /**
   * Find nearest location from a given point
   */
  findNearest(fromLocation, toLocations) {
    let nearest = null;
    let minDistance = Infinity;
    let nearestIndex = -1;

    toLocations.forEach((location, index) => {
      const distance = this.calculateDistance(
        fromLocation.latitude, fromLocation.longitude,
        location.latitude, location.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
        nearestIndex = index;
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
      .map(location => ({
        location,
        distance: this.calculateDistance(
          referencePoint.latitude, referencePoint.longitude,
          location.latitude, location.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .map(item => ({
        ...item.location,
        distanceFromReference: item.distance
      }));
  }

  /**
   * Check if a point is within a certain radius
   */
  isWithinRadius(centerPoint, testPoint, radiusKm) {
    const distance = this.calculateDistance(
      centerPoint.latitude, centerPoint.longitude,
      testPoint.latitude, testPoint.longitude
    );
    
    return distance <= radiusKm;
  }

  /**
   * Get bounding box for a set of coordinates
   */
  getBoundingBox(locations, paddingKm = 5) {
    if (locations.length === 0) {
      return null;
    }

    let minLat = locations[0].latitude;
    let maxLat = locations[0].latitude;
    let minLng = locations[0].longitude;
    let maxLng = locations[0].longitude;

    locations.forEach(location => {
      minLat = Math.min(minLat, location.latitude);
      maxLat = Math.max(maxLat, location.latitude);
      minLng = Math.min(minLng, location.longitude);
      maxLng = Math.max(maxLng, location.longitude);
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
   * Calculate total route distance
   */
  calculateRouteDistance(locations) {
    if (locations.length < 2) return 0;

    let totalDistance = 0;
    
    for (let i = 1; i < locations.length; i++) {
      totalDistance += this.calculateDistance(
        locations[i-1].latitude, locations[i-1].longitude,
        locations[i].latitude, locations[i].longitude
      );
    }

    return totalDistance;
  }

  /**
   * Estimate travel time between locations
   */
  estimateTravelTime(fromLocation, toLocation, transportMode = 'car') {
    const distance = this.calculateDistance(
      fromLocation.latitude, fromLocation.longitude,
      toLocation.latitude, toLocation.longitude
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
      hitRate: 'Not tracked' // Could implement hit rate tracking if needed
    };
  }
}

module.exports = DistanceCalculator;