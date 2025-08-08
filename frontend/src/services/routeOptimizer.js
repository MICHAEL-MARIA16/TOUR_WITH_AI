// frontend/src/services/routeOptimizer.js
import { ROUTE_SETTINGS, VALIDATION } from '../utils/constants';

class RouteOptimizer {
  constructor() {
    this.distanceCache = new Map();
  }

  // Calculate Haversine distance between two points
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI/180);
  }

  // Estimate travel time based on distance (fallback when no API available)
  estimateTravelTime(distanceKm, trafficFactor = 1.2) {
    // Base speed: 40 km/h for city travel, 60 km/h for highways
    const averageSpeed = distanceKm > 50 ? 60 : 40;
    return (distanceKm / averageSpeed * 60) * trafficFactor; // Convert to minutes
  }

  // Client-side route optimization using nearest neighbor algorithm
  optimizeRouteLocally(places, settings = {}) {
    const {
      startTime = ROUTE_SETTINGS.DEFAULT_START_TIME,
      totalTimeAvailable = ROUTE_SETTINGS.DEFAULT_DURATION,
      startDay = new Date().getDay()
    } = settings;

    if (!places || places.length === 0) {
      return {
        route: [],
        totalTime: 0,
        totalDistance: 0,
        itinerary: [],
        feasible: true
      };
    }

    if (places.length === 1) {
      return this.createSinglePlaceItinerary(places[0], startTime);
    }

    // Build distance matrix
    const matrix = this.buildDistanceMatrix(places);
    
    // Apply nearest neighbor algorithm with time constraints
    const optimizedRoute = this.nearestNeighborTSP(places, matrix, {
      startTime,
      totalTimeAvailable,
      startDay
    });

    return optimizedRoute;
  }

  // Build distance matrix for all places
  buildDistanceMatrix(places) {
    const n = places.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const distance = this.calculateHaversineDistance(
            places[i].location.latitude,
            places[i].location.longitude,
            places[j].location.latitude,
            places[j].location.longitude
          );
          
          // Convert distance to travel time (minutes)
          const travelTime = this.estimateTravelTime(distance);
          matrix[i][j] = travelTime;
        }
      }
    }

    return matrix;
  }

  // Nearest neighbor TSP algorithm with time constraints
  nearestNeighborTSP(places, matrix, constraints) {
    const {
      startTime,
      totalTimeAvailable,
      startDay
    } = constraints;

    const n = places.length;
    const visited = new Array(n).fill(false);
    const route = [];
    let currentIndex = 0; // Start from first place
    let currentTime = this.timeToMinutes(startTime);
    let totalTravelTime = 0;
    let totalDistance = 0;

    // Add first place
    visited[currentIndex] = true;
    route.push(currentIndex);

    while (route.length < n) {
      let nextIndex = -1;
      let minTime = Infinity;

      // Find nearest unvisited place that fits time constraints
      for (let i = 0; i < n; i++) {
        if (!visited[i]) {
          const travelTime = matrix[currentIndex][i];
          const arrivalTime = currentTime + travelTime;
          const place = places[i];
          
          // Check if we can visit this place within time budget
          const totalTimeNeeded = arrivalTime - this.timeToMinutes(startTime) + place.averageVisitDuration;
          
          if (totalTimeNeeded <= totalTimeAvailable && 
              travelTime < minTime &&
              this.isPlaceOpenAt(place, startDay, this.minutesToTime(arrivalTime))) {
            minTime = travelTime;
            nextIndex = i;
          }
        }
      }

      if (nextIndex === -1) break; // No more places can be visited

      visited[nextIndex] = true;
      route.push(nextIndex);
      
      totalTravelTime += matrix[currentIndex][nextIndex];
      totalDistance += this.calculateHaversineDistance(
        places[currentIndex].location.latitude,
        places[currentIndex].location.longitude,
        places[nextIndex].location.latitude,
        places[nextIndex].location.longitude
      );
      
      currentTime += matrix[currentIndex][nextIndex] + places[nextIndex].averageVisitDuration;
      currentIndex = nextIndex;
    }

    // Build detailed itinerary
    const itinerary = this.buildDetailedItinerary(route, places, matrix, startTime);
    const totalTime = totalTravelTime + route.reduce((sum, i) => sum + places[i].averageVisitDuration, 0);

    return {
      route: route.map(i => places[i]),
      totalTime,
      totalDistance,
      itinerary,
      feasible: route.length === places.length
    };
  }

  // Build detailed itinerary with timing information
  buildDetailedItinerary(route, places, matrix, startTime) {
    const itinerary = [];
    let currentTime = this.timeToMinutes(startTime);

    for (let i = 0; i < route.length; i++) {
      const placeIndex = route[i];
      const place = places[placeIndex];
      
      const arrivalTime = this.minutesToTime(currentTime);
      const departureTime = this.minutesToTime(currentTime + place.averageVisitDuration);
      
      const travelTimeToNext = i < route.length - 1 ? 
        matrix[placeIndex][route[i + 1]] : 0;
      
      const travelDistanceToNext = i < route.length - 1 ? 
        this.calculateHaversineDistance(
          place.location.latitude,
          place.location.longitude,
          places[route[i + 1]].location.latitude,
          places[route[i + 1]].location.longitude
        ) : 0;

      itinerary.push({
        place,
        arrivalTime,
        departureTime,
        visitDuration: place.averageVisitDuration,
        travelTimeToNext,
        travelDistanceToNext
      });

      currentTime += place.averageVisitDuration + travelTimeToNext;
    }

    return itinerary;
  }

  // Create itinerary for single place
  createSinglePlaceItinerary(place, startTime) {
    return {
      route: [place],
      totalTime: place.averageVisitDuration,
      totalDistance: 0,
      itinerary: [{
        place,
        arrivalTime: startTime,
        departureTime: this.minutesToTime(this.timeToMinutes(startTime) + place.averageVisitDuration),
        visitDuration: place.averageVisitDuration,
        travelTimeToNext: 0,
        travelDistanceToNext: 0
      }],
      feasible: true
    };
  }

  // Check if place is open at given time
  isPlaceOpenAt(place, day, time) {
    if (!place.openingHours) return true; // Assume open if no schedule

    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
    const schedule = place.openingHours[dayName];
    
    if (!schedule || schedule.closed) return false;
    
    const openTime = this.timeToMinutes(schedule.open);
    const closeTime = this.timeToMinutes(schedule.close);
    const currentTimeMin = this.timeToMinutes(time);
    
    return currentTimeMin >= openTime && currentTimeMin <= closeTime;
  }

  // Time utility functions
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Validate route optimization input
  validateRouteInput(places, settings) {
    const errors = [];

    // Validate places
    if (!places || !Array.isArray(places)) {
      errors.push('Places must be an array');
    } else if (places.length === 0) {
      errors.push('At least one place is required');
    } else if (places.length > VALIDATION.MAX_PLACES_FOR_ROUTE) {
      errors.push(`Maximum ${VALIDATION.MAX_PLACES_FOR_ROUTE} places allowed`);
    }

    // Validate settings
    if (settings) {
      if (settings.totalTimeAvailable) {
        if (settings.totalTimeAvailable < VALIDATION.MIN_TIME_AVAILABLE) {
          errors.push(`Minimum ${VALIDATION.MIN_TIME_AVAILABLE} minutes required`);
        }
        if (settings.totalTimeAvailable > VALIDATION.MAX_TIME_AVAILABLE) {
          errors.push(`Maximum ${VALIDATION.MAX_TIME_AVAILABLE} minutes allowed`);
        }
      }

      if (settings.startTime && !this.isValidTimeFormat(settings.startTime)) {
        errors.push('Start time must be in HH:MM format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate time format
  isValidTimeFormat(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Get route suggestions based on preferences
  getRouteSuggestions(places, preferences = {}) {
    const {
      timeAvailable = 480,
      interests = [],
      maxPlaces = 8
    } = preferences;

    let filteredPlaces = [...places];

    // Filter by interests if provided
    if (interests.length > 0) {
      filteredPlaces = filteredPlaces.filter(place => 
        interests.includes(place.category)
      );
    }

    // Sort by rating and visit duration
    filteredPlaces.sort((a, b) => {
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return a.averageVisitDuration - b.averageVisitDuration;
    });

    const suggestions = [];

    // Quick tour (high rating, short duration)
    const quickPlaces = filteredPlaces
      .filter(p => p.averageVisitDuration <= 120)
      .slice(0, Math.min(6, maxPlaces));
    
    if (quickPlaces.length > 0) {
      const quickRoute = this.optimizeRouteLocally(quickPlaces, {
        totalTimeAvailable: timeAvailable * 0.8
      });
      
      suggestions.push({
        type: 'Quick Highlights',
        description: 'Visit top-rated places with shorter durations',
        places: quickPlaces,
        estimatedTime: quickRoute.totalTime,
        difficulty: 'Easy'
      });
    }

    // Balanced tour
    const balancedPlaces = filteredPlaces.slice(0, Math.min(8, maxPlaces));
    if (balancedPlaces.length > 0) {
      const balancedRoute = this.optimizeRouteLocally(balancedPlaces, {
        totalTimeAvailable: timeAvailable
      });
      
      suggestions.push({
        type: 'Balanced Experience',
        description: 'Mix of popular attractions with optimal timing',
        places: balancedPlaces,
        estimatedTime: balancedRoute.totalTime,
        difficulty: 'Moderate'
      });
    }

    // Comprehensive tour (if time allows)
    if (timeAvailable > 600) {
      const comprehensivePlaces = filteredPlaces.slice(0, Math.min(12, maxPlaces));
      const comprehensiveRoute = this.optimizeRouteLocally(comprehensivePlaces, {
        totalTimeAvailable: timeAvailable
      });
      
      suggestions.push({
        type: 'Comprehensive Tour',
        description: 'Maximum places for extended trips',
        places: comprehensivePlaces,
        estimatedTime: comprehensiveRoute.totalTime,
        difficulty: 'Challenging'
      });
    }

    return suggestions;
  }

  // Clear distance cache
  clearCache() {
    this.distanceCache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.distanceCache.size,
      memory: JSON.stringify([...this.distanceCache.entries()]).length
    };
  }
}

// Export singleton instance
export const routeOptimizer = new RouteOptimizer();

// Export utility functions
export const routeUtils = {
  formatDuration: (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  },

  formatDistance: (km) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  },

  calculateRouteEfficiency: (selectedPlaces, optimizedRoute) => {
    if (!selectedPlaces || !optimizedRoute) return 0;
    return Math.round((optimizedRoute.length / selectedPlaces.length) * 100);
  },

  estimateRouteCost: (route) => {
    if (!route || !route.length) return 0;
    return route.reduce((total, place) => {
      return total + (place.entryFee?.indian || 0);
    }, 0);
  },

  getRouteCategories: (route) => {
    if (!route || !route.length) return [];
    const categories = new Set(route.map(place => place.category));
    return Array.from(categories);
  },

  isRouteKidFriendly: (route) => {
    if (!route || !route.length) return false;
    return route.every(place => place.kidFriendly !== false);
  },

  isRouteWheelchairAccessible: (route) => {
    if (!route || !route.length) return false;
    return route.every(place => place.wheelchairAccessible === true);
  }
};

export default routeOptimizer;