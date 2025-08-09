// frontend/src/services/routeOptimizer.js
import { ROUTE_SETTINGS, VALIDATION } from '../utils/constants';

class EnhancedRouteOptimizer {
  constructor() {
    this.distanceCache = new Map();
    this.travelTimeCache = new Map();
    this.debugMode = false;
  }

  // Enhanced Haversine distance calculation with caching
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const cacheKey = `${lat1},${lon1},${lat2},${lon2}`;
    
    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey);
    }

    try {
      const R = 6371; // Earth's radius in kilometers
      const dLat = this.toRad(lat2 - lat1);
      const dLon = this.toRad(lon2 - lon1);
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      // Validate distance (should be reasonable)
      if (distance < 0 || distance > 20000) {
        throw new Error(`Invalid distance calculated: ${distance}km`);
      }
      
      this.distanceCache.set(cacheKey, distance);
      return distance;
    } catch (error) {
      console.error(`Error calculating distance between (${lat1},${lon1}) and (${lat2},${lon2}):`, error);
      return Infinity; // Return infinity to exclude this route
    }
  }

  toRad(deg) {
    if (typeof deg !== 'number' || !isFinite(deg)) {
      throw new Error(`Invalid degree value: ${deg}`);
    }
    return deg * (Math.PI/180);
  }

  // Enhanced travel time estimation with multiple factors
  estimateTravelTime(distanceKm, options = {}) {
    try {
      const {
        trafficFactor = 1.3,
        timeOfDay = 12,
        roadType = 'city',
        weatherFactor = 1.0
      } = options;

      if (distanceKm === Infinity || distanceKm < 0) {
        return Infinity;
      }

      // Dynamic speed based on distance and road type
      let baseSpeed;
      if (distanceKm > 100) {
        baseSpeed = roadType === 'highway' ? 80 : 70; // Highway/Interstate
      } else if (distanceKm > 50) {
        baseSpeed = roadType === 'highway' ? 70 : 60; // Major roads
      } else if (distanceKm > 10) {
        baseSpeed = 45; // Suburban/arterial roads
      } else {
        baseSpeed = 25; // City streets/local roads
      }

      // Time-of-day traffic adjustment
      let timeTrafficFactor = 1.0;
      if ((timeOfDay >= 7 && timeOfDay <= 10) || (timeOfDay >= 17 && timeOfDay <= 19)) {
        timeTrafficFactor = 1.6; // Rush hour
      } else if (timeOfDay >= 11 && timeOfDay <= 16) {
        timeTrafficFactor = 1.2; // Moderate traffic
      }

      const adjustedSpeed = baseSpeed / (trafficFactor * timeTrafficFactor * weatherFactor);
      const travelTimeMinutes = (distanceKm / adjustedSpeed) * 60;

      // Add buffer time for parking, walking, etc.
      const bufferTime = Math.min(15, distanceKm * 2); // Max 15 minutes buffer
      
      return Math.ceil(travelTimeMinutes + bufferTime);
    } catch (error) {
      console.error(`Error estimating travel time for ${distanceKm}km:`, error);
      return Infinity;
    }
  }

  // Advanced Greedy Algorithm with Multiple Optimization Strategies
  optimizeRouteLocally(places, settings = {}) {
    try {
      const {
        startTime = ROUTE_SETTINGS.DEFAULT_START_TIME,
        totalTimeAvailable = ROUTE_SETTINGS.DEFAULT_DURATION,
        startDay = new Date().getDay(),
        strategy = 'hybrid', // 'nearest', 'time_priority', 'rating_priority', 'hybrid'
        allowPartialRoute = true,
        prioritizeOpenPlaces = true
      } = settings;

      // Validation
      const validation = this.validateRouteInput(places, settings);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (!places || places.length === 0) {
        return this.createEmptyRoute();
      }

      if (places.length === 1) {
        return this.createSinglePlaceItinerary(places[0], startTime, startDay);
      }

      // Pre-filter places based on opening hours and feasibility
      const feasiblePlaces = this.filterFeasiblePlaces(places, startTime, startDay, totalTimeAvailable);
      
      if (feasiblePlaces.length === 0) {
        return this.createEmptyRoute('No places are open or feasible within the given time constraints');
      }

      // Build comprehensive distance and time matrices
      const matrices = this.buildComprehensiveMatrices(feasiblePlaces, startTime);
      
      // Apply the selected optimization strategy
      let optimizedRoute;
      switch (strategy) {
        case 'nearest':
          optimizedRoute = this.greedyNearestNeighbor(feasiblePlaces, matrices, settings);
          break;
        case 'time_priority':
          optimizedRoute = this.greedyTimePriority(feasiblePlaces, matrices, settings);
          break;
        case 'rating_priority':
          optimizedRoute = this.greedyRatingPriority(feasiblePlaces, matrices, settings);
          break;
        default:
          optimizedRoute = this.greedyHybridApproach(feasiblePlaces, matrices, settings);
      }

      // Apply local optimization improvements
      optimizedRoute = this.applyLocalOptimizations(optimizedRoute, matrices, settings);

      return optimizedRoute;

    } catch (error) {
      console.error('Error in route optimization:', error);
      return this.createErrorRoute(error.message);
    }
  }

  // Filter places based on feasibility
  filterFeasiblePlaces(places, startTime, startDay, totalTimeAvailable) {
    const startTimeMinutes = this.timeToMinutes(startTime);
    const endTimeMinutes = startTimeMinutes + totalTimeAvailable;
    
    return places.filter(place => {
      try {
        // Check if place has valid location
        if (!place.location || 
            typeof place.location.latitude !== 'number' || 
            typeof place.location.longitude !== 'number' ||
            !isFinite(place.location.latitude) ||
            !isFinite(place.location.longitude)) {
          console.warn(`Place ${place.name} has invalid location data`);
          return false;
        }

        // Check if place has reasonable visit duration
        if (!place.averageVisitDuration || 
            place.averageVisitDuration <= 0 || 
            place.averageVisitDuration > totalTimeAvailable * 0.8) {
          console.warn(`Place ${place.name} has invalid visit duration`);
          return false;
        }

        // Check if place can be visited within the time window
        const earliestArrival = startTimeMinutes + 30; // Minimum 30 min travel time
        const latestArrival = endTimeMinutes - place.averageVisitDuration;
        
        if (earliestArrival >= latestArrival) {
          return false;
        }

        // Check opening hours for multiple time slots
        let canVisit = false;
        for (let timeSlot = earliestArrival; timeSlot <= latestArrival; timeSlot += 60) {
          if (this.isPlaceOpenAt(place, startDay, this.minutesToTime(timeSlot))) {
            canVisit = true;
            break;
          }
        }

        return canVisit;
      } catch (error) {
        console.error(`Error filtering place ${place.name}:`, error);
        return false;
      }
    });
  }

  // Build comprehensive matrices for distance and time
  buildComprehensiveMatrices(places, startTime) {
    const n = places.length;
    const distanceMatrix = Array(n).fill().map(() => Array(n).fill(Infinity));
    const timeMatrix = Array(n).fill().map(() => Array(n).fill(Infinity));
    const timeOfDay = this.timeToMinutes(startTime) / 60;

    try {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const distance = this.calculateHaversineDistance(
              places[i].location.latitude,
              places[i].location.longitude,
              places[j].location.latitude,
              places[j].location.longitude
            );
            
            if (distance !== Infinity) {
              distanceMatrix[i][j] = distance;
              timeMatrix[i][j] = this.estimateTravelTime(distance, {
                timeOfDay: timeOfDay,
                trafficFactor: 1.3
              });
            }
          } else {
            distanceMatrix[i][j] = 0;
            timeMatrix[i][j] = 0;
          }
        }
      }

      return { distanceMatrix, timeMatrix };
    } catch (error) {
      console.error('Error building matrices:', error);
      throw new Error('Failed to build distance/time matrices');
    }
  }

  // Hybrid Greedy Approach (Most Powerful)
  greedyHybridApproach(places, matrices, settings) {
    const {
      startTime,
      totalTimeAvailable,
      startDay
    } = settings;

    const { distanceMatrix, timeMatrix } = matrices;
    const n = places.length;
    
    // Multi-criteria scoring system
    const calculatePlaceScore = (currentIdx, candidateIdx, currentTime, visitedSet) => {
      const place = places[candidateIdx];
      const travelTime = timeMatrix[currentIdx][candidateIdx];
      const arrivalTime = currentTime + travelTime;
      
      if (travelTime === Infinity) return -Infinity;
      if (visitedSet.has(candidateIdx)) return -Infinity;
      if (arrivalTime + place.averageVisitDuration > this.timeToMinutes(startTime) + totalTimeAvailable) {
        return -Infinity;
      }
      
      // Check opening hours
      if (!this.isPlaceOpenAt(place, startDay, this.minutesToTime(arrivalTime))) {
        return -Infinity;
      }

      // Multi-factor scoring
      const ratingScore = (place.rating || 3) / 5 * 100; // Normalize to 0-100
      const proximityScore = Math.max(0, 100 - travelTime); // Closer is better
      const timeEfficiencyScore = Math.max(0, 100 - (place.averageVisitDuration / 10)); // Shorter visits score higher
      const remainingTimeScore = Math.max(0, (totalTimeAvailable - (arrivalTime + place.averageVisitDuration - this.timeToMinutes(startTime))) / totalTimeAvailable * 100);
      
      // Weighted combination
      return (ratingScore * 0.3 + proximityScore * 0.25 + timeEfficiencyScore * 0.2 + remainingTimeScore * 0.25);
    };

    // Greedy selection with lookahead
    const visited = new Set();
    const route = [];
    let currentIdx = 0; // Start with first place
    let currentTime = this.timeToMinutes(startTime);
    
    // Add starting place
    visited.add(currentIdx);
    route.push(currentIdx);
    currentTime += places[currentIdx].averageVisitDuration;

    while (route.length < n && currentTime < this.timeToMinutes(startTime) + totalTimeAvailable) {
      let bestScore = -Infinity;
      let nextIdx = -1;
      
      // Evaluate all unvisited places
      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const score = calculatePlaceScore(currentIdx, i, currentTime, visited);
          
          // Look ahead to see if we can visit more places after this one
          if (score > bestScore) {
            bestScore = score;
            nextIdx = i;
          }
        }
      }
      
      if (nextIdx === -1 || bestScore === -Infinity) break;
      
      // Add to route
      visited.add(nextIdx);
      route.push(nextIdx);
      currentTime += timeMatrix[currentIdx][nextIdx] + places[nextIdx].averageVisitDuration;
      currentIdx = nextIdx;
    }

    return this.buildRouteResult(route, places, matrices, startTime, settings);
  }

  // Greedy Nearest Neighbor with time constraints
  greedyNearestNeighbor(places, matrices, settings) {
    const { timeMatrix } = matrices;
    const { startTime, totalTimeAvailable, startDay } = settings;
    const n = places.length;
    
    const visited = new Array(n).fill(false);
    const route = [];
    let currentIdx = 0;
    let currentTime = this.timeToMinutes(startTime);
    
    visited[currentIdx] = true;
    route.push(currentIdx);
    currentTime += places[currentIdx].averageVisitDuration;

    while (route.length < n) {
      let nearestIdx = -1;
      let minTime = Infinity;
      
      for (let i = 0; i < n; i++) {
        if (!visited[i]) {
          const travelTime = timeMatrix[currentIdx][i];
          const arrivalTime = currentTime + travelTime;
          const place = places[i];
          
          if (travelTime < minTime && 
              arrivalTime + place.averageVisitDuration <= this.timeToMinutes(startTime) + totalTimeAvailable &&
              this.isPlaceOpenAt(place, startDay, this.minutesToTime(arrivalTime))) {
            minTime = travelTime;
            nearestIdx = i;
          }
        }
      }
      
      if (nearestIdx === -1) break;
      
      visited[nearestIdx] = true;
      route.push(nearestIdx);
      currentTime += timeMatrix[currentIdx][nearestIdx] + places[nearestIdx].averageVisitDuration;
      currentIdx = nearestIdx;
    }

    return this.buildRouteResult(route, places, matrices, startTime, settings);
  }

  // Build final route result with comprehensive information
  buildRouteResult(route, places, matrices, startTime, settings) {
    try {
      const { distanceMatrix, timeMatrix } = matrices;
      const itinerary = [];
      let currentTime = this.timeToMinutes(startTime);
      let totalTravelTime = 0;
      let totalDistance = 0;

      for (let i = 0; i < route.length; i++) {
        const placeIdx = route[i];
        const place = places[placeIdx];
        
        const arrivalTime = this.minutesToTime(currentTime);
        const departureTime = this.minutesToTime(currentTime + place.averageVisitDuration);
        
        let travelTimeToNext = 0;
        let travelDistanceToNext = 0;
        
        if (i < route.length - 1) {
          const nextIdx = route[i + 1];
          travelTimeToNext = timeMatrix[placeIdx][nextIdx];
          travelDistanceToNext = distanceMatrix[placeIdx][nextIdx];
          totalTravelTime += travelTimeToNext;
          totalDistance += travelDistanceToNext;
        }

        itinerary.push({
          place: { ...place },
          arrivalTime,
          departureTime,
          visitDuration: place.averageVisitDuration,
          travelTimeToNext: Math.round(travelTimeToNext),
          travelDistanceToNext: Math.round(travelDistanceToNext * 100) / 100,
          isOpen: this.isPlaceOpenAt(place, settings.startDay, arrivalTime),
          order: i + 1
        });

        currentTime += place.averageVisitDuration + travelTimeToNext;
      }

      const totalTime = totalTravelTime + route.reduce((sum, i) => sum + places[i].averageVisitDuration, 0);
      const efficiency = route.length / places.length;

      return {
        route: route.map(i => ({ ...places[i] })),
        totalTime: Math.round(totalTime),
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTravelTime: Math.round(totalTravelTime),
        itinerary,
        feasible: true,
        efficiency: Math.round(efficiency * 100),
        placesVisited: route.length,
        placesSkipped: places.length - route.length,
        estimatedCost: this.calculateRouteCost(route.map(i => places[i])),
        warnings: this.generateRouteWarnings(itinerary, settings)
      };
    } catch (error) {
      console.error('Error building route result:', error);
      throw new Error('Failed to build route result');
    }
  }

  // Apply local optimizations (2-opt, time window adjustments)
  applyLocalOptimizations(routeResult, matrices, settings) {
    try {
      // 2-opt improvement for better route ordering
      const { route } = routeResult;
      if (route.length <= 3) return routeResult; // Too small for optimization

      const { timeMatrix } = matrices;
      let improved = true;
      let currentRoute = [...route];

      while (improved) {
        improved = false;
        
        for (let i = 1; i < currentRoute.length - 1; i++) {
          for (let j = i + 1; j < currentRoute.length; j++) {
            // Try swapping segments
            const newRoute = [...currentRoute];
            const segment = newRoute.splice(i, j - i + 1).reverse();
            newRoute.splice(i, 0, ...segment);
            
            // Check if this improves the route
            if (this.calculateRouteTotalTime(newRoute, timeMatrix) < 
                this.calculateRouteTotalTime(currentRoute, timeMatrix)) {
              currentRoute = newRoute;
              improved = true;
              break;
            }
          }
          if (improved) break;
        }
      }

      // Rebuild with optimized route if different
      if (JSON.stringify(currentRoute) !== JSON.stringify(route)) {
        const routeIndices = currentRoute.map((place, idx) => 
          route.findIndex(r => r.id === place.id)
        );
        return this.buildRouteResult(routeIndices, route, matrices, settings.startTime, settings);
      }

      return routeResult;
    } catch (error) {
      console.error('Error in local optimization:', error);
      return routeResult; // Return original if optimization fails
    }
  }

  // Calculate total time for a route
  calculateRouteTotalTime(route, timeMatrix) {
    let totalTime = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalTime += timeMatrix[i][i + 1] + route[i].averageVisitDuration;
    }
    if (route.length > 0) {
      totalTime += route[route.length - 1].averageVisitDuration;
    }
    return totalTime;
  }

  // Enhanced place opening hours check
  isPlaceOpenAt(place, day, time) {
    try {
      if (!place.openingHours) return true; // Assume open if no schedule

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[day] || dayNames[new Date().getDay()];
      const schedule = place.openingHours[dayName];
      
      if (!schedule) return true; // No schedule for this day
      if (schedule.closed === true) return false;
      
      if (!schedule.open || !schedule.close) return true; // Malformed schedule, assume open
      
      const openTime = this.timeToMinutes(schedule.open);
      const closeTime = this.timeToMinutes(schedule.close);
      const currentTimeMin = this.timeToMinutes(time);
      
      // Handle overnight schedules (e.g., 22:00 - 02:00)
      if (closeTime < openTime) {
        return currentTimeMin >= openTime || currentTimeMin <= closeTime;
      }
      
      // Add buffer time for visit duration
      const bufferTime = 30; // 30 minutes buffer before closing
      return currentTimeMin >= openTime && currentTimeMin <= (closeTime - bufferTime);
    } catch (error) {
      console.error(`Error checking opening hours for ${place.name}:`, error);
      return true; // Default to open if error occurs
    }
  }

  // Generate route warnings
  generateRouteWarnings(itinerary, settings) {
    const warnings = [];
    
    try {
      itinerary.forEach((item, index) => {
        // Check for very long travel times
        if (item.travelTimeToNext > 120) {
          warnings.push(`Long travel time (${Math.round(item.travelTimeToNext)}min) from ${item.place.name} to next destination`);
        }
        
        // Check for places that might be closed
        if (!item.isOpen) {
          warnings.push(`${item.place.name} might be closed at ${item.arrivalTime}`);
        }
        
        // Check for very short visit times
        if (item.visitDuration < 30) {
          warnings.push(`Very short visit time (${item.visitDuration}min) at ${item.place.name}`);
        }
        
        // Check for late arrivals
        const arrivalHour = parseInt(item.arrivalTime.split(':')[0]);
        if (arrivalHour >= 18) {
          warnings.push(`Late arrival (${item.arrivalTime}) at ${item.place.name} - consider starting earlier`);
        }
      });
    } catch (error) {
      console.error('Error generating warnings:', error);
    }
    
    return warnings;
  }

  // Calculate route cost
  calculateRouteCost(route) {
    try {
      return route.reduce((total, place) => {
        const fee = place.entryFee?.indian || place.entryFee?.amount || 0;
        return total + (typeof fee === 'number' ? fee : 0);
      }, 0);
    } catch (error) {
      console.error('Error calculating route cost:', error);
      return 0;
    }
  }

  // Create single place itinerary with enhanced validation
  createSinglePlaceItinerary(place, startTime, startDay) {
    try {
      const isOpen = this.isPlaceOpenAt(place, startDay, startTime);
      const warnings = [];
      
      if (!isOpen) {
        warnings.push(`${place.name} might be closed at ${startTime}`);
      }

      return {
        route: [{ ...place }],
        totalTime: place.averageVisitDuration || 60,
        totalDistance: 0,
        totalTravelTime: 0,
        itinerary: [{
          place: { ...place },
          arrivalTime: startTime,
          departureTime: this.minutesToTime(this.timeToMinutes(startTime) + (place.averageVisitDuration || 60)),
          visitDuration: place.averageVisitDuration || 60,
          travelTimeToNext: 0,
          travelDistanceToNext: 0,
          isOpen,
          order: 1
        }],
        feasible: true,
        efficiency: 100,
        placesVisited: 1,
        placesSkipped: 0,
        estimatedCost: this.calculateRouteCost([place]),
        warnings
      };
    } catch (error) {
      console.error('Error creating single place itinerary:', error);
      return this.createErrorRoute('Failed to create single place itinerary');
    }
  }

  // Create empty route
  createEmptyRoute(reason = 'No places provided') {
    return {
      route: [],
      totalTime: 0,
      totalDistance: 0,
      totalTravelTime: 0,
      itinerary: [],
      feasible: false,
      efficiency: 0,
      placesVisited: 0,
      placesSkipped: 0,
      estimatedCost: 0,
      warnings: [reason]
    };
  }

  // Create error route
  createErrorRoute(errorMessage) {
    return {
      route: [],
      totalTime: 0,
      totalDistance: 0,
      totalTravelTime: 0,
      itinerary: [],
      feasible: false,
      efficiency: 0,
      placesVisited: 0,
      placesSkipped: 0,
      estimatedCost: 0,
      warnings: [`Error: ${errorMessage}`],
      error: true
    };
  }

  // Enhanced validation
  validateRouteInput(places, settings) {
    const errors = [];

    try {
      // Validate places
      if (!places || !Array.isArray(places)) {
        errors.push('Places must be an array');
      } else if (places.length === 0) {
        errors.push('At least one place is required');
      } else if (places.length > (VALIDATION?.MAX_PLACES_FOR_ROUTE || 20)) {
        errors.push(`Maximum ${VALIDATION?.MAX_PLACES_FOR_ROUTE || 20} places allowed`);
      } else {
        // Validate individual places
        places.forEach((place, index) => {
          if (!place.location || 
              typeof place.location.latitude !== 'number' || 
              typeof place.location.longitude !== 'number') {
            errors.push(`Place ${index + 1} has invalid location data`);
          }
          
          if (!place.averageVisitDuration || 
              typeof place.averageVisitDuration !== 'number' ||
              place.averageVisitDuration <= 0) {
            errors.push(`Place ${index + 1} (${place.name || 'Unknown'}) has invalid visit duration`);
          }
        });
      }

      // Validate settings
      if (settings) {
        if (settings.totalTimeAvailable) {
          const minTime = VALIDATION?.MIN_TIME_AVAILABLE || 60;
          const maxTime = VALIDATION?.MAX_TIME_AVAILABLE || 1440;
          
          if (settings.totalTimeAvailable < minTime) {
            errors.push(`Minimum ${minTime} minutes required`);
          }
          if (settings.totalTimeAvailable > maxTime) {
            errors.push(`Maximum ${maxTime} minutes allowed`);
          }
        }

        if (settings.startTime && !this.isValidTimeFormat(settings.startTime)) {
          errors.push('Start time must be in HH:MM format');
        }

        if (settings.startDay !== undefined && 
            (settings.startDay < 0 || settings.startDay > 6)) {
          errors.push('Start day must be between 0 (Sunday) and 6 (Saturday)');
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
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

  // Time utility functions with error handling
  timeToMinutes(timeStr) {
    try {
      if (typeof timeStr !== 'string') {
        throw new Error(`Invalid time format: ${timeStr}`);
      }
      
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`Invalid time values: ${timeStr}`);
      }
      
      return hours * 60 + minutes;
    } catch (error) {
      console.error(`Error converting time to minutes: ${timeStr}`, error);
      return 0; // Default to midnight
    }
  }

  minutesToTime(minutes) {
    try {
      if (typeof minutes !== 'number' || !isFinite(minutes)) {
        throw new Error(`Invalid minutes value: ${minutes}`);
      }
      
      const hours = Math.floor(Math.abs(minutes) / 60) % 24;
      const mins = Math.abs(minutes) % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error(`Error converting minutes to time: ${minutes}`, error);
      return '00:00';
    }
  }

  // Clear all caches
  clearCache() {
    this.distanceCache.clear();
    this.travelTimeCache.clear();
  }

  // Get comprehensive cache statistics
  getCacheStats() {
    return {
      distanceCache: {
        size: this.distanceCache.size,
        memory: JSON.stringify([...this.distanceCache.entries()]).length
      },
      travelTimeCache: {
        size: this.travelTimeCache.size,
        memory: JSON.stringify([...this.travelTimeCache.entries()]).length
      }
    };
  }

  // Enable/disable debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

// Export singleton instance
export const routeOptimizer = new EnhancedRouteOptimizer();

// Enhanced utility functions
export const routeUtils = {
  formatDuration: (minutes) => {
    if (!minutes || minutes < 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  },

  formatDistance: (km) => {
    if (!km || km < 0) return '0m';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  },

  calculateRouteEfficiency: (selectedPlaces, optimizedRoute) => {
    if (!selectedPlaces || !optimizedRoute || !optimizedRoute.route) return 0;
    return Math.round((optimizedRoute.route.length / selectedPlaces.length) * 100);
  },

  estimateRouteCost: (route) => {
    if (!route || !route.length) return 0;
    return route.reduce((total, place) => {
      const fee = place.entryFee?.indian || place.entryFee?.amount || 0;
      return total + (typeof fee === 'number' ? fee : 0);
    }, 0);
  },

  getRouteCategories: (route) => {
    if (!route || !route.length) return [];
    const categories = new Set(route.map(place => place.category).filter(Boolean));
    return Array.from(categories);
  },

  isRouteKidFriendly: (route) => {
    if (!route || !route.length) return false;
    return route.every(place => place.kidFriendly !== false);
  },

  isRouteWheelchairAccessible: (route) => {
    if (!route || !route.length) return false;
    return route.every(place => place.wheelchairAccessible === true);
  },

  calculateRouteRating: (route) => {
    if (!route || !route.length) return 0;
    const totalRating = route.reduce((sum, place) => sum + (place.rating || 0), 0);
    return Math.round((totalRating / route.length) * 10) / 10;
  },

  getRouteDifficulty: (routeResult) => {
    if (!routeResult || !routeResult.totalTime) return 'Unknown';
    
    const { totalTime, totalDistance, placesVisited } = routeResult;
    
    if (totalTime <= 240 && totalDistance <= 20 && placesVisited <= 4) {
      return 'Easy';
    } else if (totalTime <= 480 && totalDistance <= 50 && placesVisited <= 8) {
      return 'Moderate';
    } else {
      return 'Challenging';
    }
  },

  validateRouteForExecution: (routeResult) => {
    const issues = [];
    
    if (!routeResult || !routeResult.itinerary) {
      issues.push('Invalid route data');
      return { valid: false, issues };
    }

    routeResult.itinerary.forEach((item, index) => {
      // Check for unreasonable travel times
      if (item.travelTimeToNext > 180) {
        issues.push(`Very long travel time (${Math.round(item.travelTimeToNext)}min) between stops ${index + 1} and ${index + 2}`);
      }
      
      // Check for places that are closed
      if (!item.isOpen) {
        issues.push(`${item.place.name} appears to be closed at arrival time ${item.arrivalTime}`);
      }
      
      // Check for overlapping time slots
      const nextItem = routeResult.itinerary[index + 1];
      if (nextItem) {
        const currentEnd = routeOptimizer.timeToMinutes(item.departureTime);
        const nextStart = routeOptimizer.timeToMinutes(nextItem.arrivalTime);
        
        if (currentEnd > nextStart) {
          issues.push(`Time overlap between ${item.place.name} and ${nextItem.place.name}`);
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  },

  optimizeForUserPreferences: (places, preferences = {}) => {
    const {
      maxTravelTime = 60,
      preferredCategories = [],
      avoidCategories = [],
      maxWalkingDistance = 2,
      budgetLimit = null,
      accessibilityRequired = false,
      kidFriendlyOnly = false
    } = preferences;

    let filteredPlaces = [...places];

    // Filter by categories
    if (preferredCategories.length > 0) {
      filteredPlaces = filteredPlaces.filter(place => 
        preferredCategories.includes(place.category)
      );
    }

    if (avoidCategories.length > 0) {
      filteredPlaces = filteredPlaces.filter(place => 
        !avoidCategories.includes(place.category)
      );
    }

    // Filter by accessibility
    if (accessibilityRequired) {
      filteredPlaces = filteredPlaces.filter(place => 
        place.wheelchairAccessible === true
      );
    }

    // Filter by kid-friendly requirement
    if (kidFriendlyOnly) {
      filteredPlaces = filteredPlaces.filter(place => 
        place.kidFriendly !== false
      );
    }

    // Filter by budget
    if (budgetLimit) {
      filteredPlaces = filteredPlaces.filter(place => {
        const fee = place.entryFee?.indian || place.entryFee?.amount || 0;
        return fee <= budgetLimit;
      });
    }

    // Sort by preference score
    filteredPlaces.sort((a, b) => {
      let scoreA = (a.rating || 0) * 20; // Base score from rating
      let scoreB = (b.rating || 0) * 20;

      // Bonus for preferred categories
      if (preferredCategories.includes(a.category)) scoreA += 10;
      if (preferredCategories.includes(b.category)) scoreB += 10;

      // Bonus for shorter visit duration (more places can be visited)
      scoreA += Math.max(0, (300 - (a.averageVisitDuration || 120)) / 10);
      scoreB += Math.max(0, (300 - (b.averageVisitDuration || 120)) / 10);

      return scoreB - scoreA;
    });

    return filteredPlaces;
  }
};

export default routeOptimizer;