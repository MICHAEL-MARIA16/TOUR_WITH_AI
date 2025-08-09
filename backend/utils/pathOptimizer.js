// backend/utils/pathOptimizer.js
const axios = require('axios');

class PathOptimizer {
  constructor() {
    this.distanceCache = new Map();
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.rateLimitDelay = 50; // Delay between API calls to avoid rate limits
    this.maxCacheSize = 10000;
  }

  // Enhanced Haversine distance calculation with better precision
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.max(distance, 0.1); // Minimum distance to avoid division by zero
  }

  toRad(deg) {
    return deg * (Math.PI/180);
  }

  // Enhanced Google Maps distance with better error handling and caching
  async getGoogleMapsDistance(origin, destination) {
    // Input validation
    if (!origin?.latitude || !origin?.longitude || !destination?.latitude || !destination?.longitude) {
      throw new Error('Invalid coordinates provided');
    }

    const cacheKey = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}-${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`;
    
    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey);
    }

    // Clean cache if it gets too large
    if (this.distanceCache.size > this.maxCacheSize) {
      const keys = Array.from(this.distanceCache.keys());
      const keysToDelete = keys.slice(0, this.maxCacheSize / 2);
      keysToDelete.forEach(key => this.distanceCache.delete(key));
    }

    try {
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

      if (!this.googleMapsApiKey) {
        return this.getFallbackDistance(origin, destination);
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: `${origin.latitude},${origin.longitude}`,
          destinations: `${destination.latitude},${destination.longitude}`,
          mode: 'driving',
          units: 'metric',
          avoid: 'tolls',
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: this.googleMapsApiKey
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const element = response.data.rows[0].elements[0];
        const result = {
          distance: Math.max(element.distance.value / 1000, 0.1), // Convert to km, minimum 0.1km
          duration: Math.max(element.duration.value / 60, 1), // Convert to minutes, minimum 1 minute
          durationInTraffic: element.duration_in_traffic ? element.duration_in_traffic.value / 60 : element.duration.value / 60,
          distanceText: element.distance.text,
          durationText: element.duration.text
        };
        
        this.distanceCache.set(cacheKey, result);
        return result;
      } else {
        return this.getFallbackDistance(origin, destination);
      }
    } catch (error) {
      console.warn(`Google Maps API error for ${cacheKey}:`, error.message);
      return this.getFallbackDistance(origin, destination);
    }
  }

  // Enhanced fallback distance calculation
  getFallbackDistance(origin, destination) {
    const distance = this.calculateHaversineDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );
    
    // More realistic travel time estimation based on distance and terrain
    let duration;
    if (distance < 5) {
      duration = distance * 2.5; // City driving: ~24 km/h average
    } else if (distance < 20) {
      duration = distance * 2.0; // Suburban: ~30 km/h average
    } else if (distance < 100) {
      duration = distance * 1.5; // Highway: ~40 km/h average
    } else {
      duration = distance * 1.2; // Long distance: ~50 km/h average
    }

    // Add buffer time for stops, traffic, etc.
    duration *= 1.3;

    const result = {
      distance,
      duration: Math.max(duration, 1),
      durationInTraffic: duration * 1.2,
      distanceText: `${distance.toFixed(1)} km`,
      durationText: `${Math.round(duration)} mins`,
      isFallback: true
    };

    this.distanceCache.set(
      `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}-${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`,
      result
    );

    return result;
  }

  // Enhanced opening hours checker with better time parsing
  isPlaceOpen(place, dayOfWeek, timeString) {
    try {
      if (!place?.openingHours) return true; // Assume open if no schedule

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek] || dayNames[new Date().getDay()];
      const schedule = place.openingHours[dayName];
      
      if (!schedule || schedule.closed === true) return false;
      if (schedule.allDay === true) return true;
      
      const currentTimeMinutes = this.timeToMinutes(timeString);
      
      // Handle multiple opening periods (e.g., lunch break)
      if (Array.isArray(schedule.periods)) {
        return schedule.periods.some(period => {
          const openTime = this.timeToMinutes(period.open);
          const closeTime = this.timeToMinutes(period.close);
          return this.isTimeInRange(currentTimeMinutes, openTime, closeTime);
        });
      }
      
      // Handle single period
      if (schedule.open && schedule.close) {
        const openTime = this.timeToMinutes(schedule.open);
        const closeTime = this.timeToMinutes(schedule.close);
        return this.isTimeInRange(currentTimeMinutes, openTime, closeTime);
      }
      
      return true; // Default to open if schedule format is unclear
    } catch (error) {
      console.warn('Error checking opening hours:', error);
      return true; // Default to open on error
    }
  }

  // Check if time is within range, handling overnight hours
  isTimeInRange(currentTime, openTime, closeTime) {
    if (closeTime > openTime) {
      // Same day (e.g., 09:00 - 17:00)
      return currentTime >= openTime && currentTime <= closeTime;
    } else {
      // Overnight (e.g., 22:00 - 02:00)
      return currentTime >= openTime || currentTime <= closeTime;
    }
  }

  // Enhanced time utilities with better validation
  timeToMinutes(timeStr) {
    try {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      
      const parts = timeStr.trim().split(':');
      if (parts.length !== 2) return 0;
      
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return 0;
      }
      
      return hours * 60 + minutes;
    } catch (error) {
      console.warn('Error parsing time:', timeStr, error);
      return 0;
    }
  }

  minutesToTime(totalMinutes) {
    const minutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Build optimized adjacency matrix with parallel processing
  async buildAdjacencyMatrix(places) {
    if (!places || places.length === 0) {
      throw new Error('Places array is required and cannot be empty');
    }

    const n = places.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    const distances = Array(n).fill().map(() => Array(n).fill(null));

    // Create batches to avoid overwhelming the API
    const batchSize = 5;
    const promises = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
          distances[i][j] = { distance: 0, duration: 0, durationInTraffic: 0 };
          continue;
        }

        // Add to batch with delay
        const promise = new Promise(async (resolve) => {
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 100))); // Random delay
          try {
            const travelInfo = await this.getGoogleMapsDistance(
              places[i].location,
              places[j].location
            );
            
            matrix[i][j] = travelInfo.durationInTraffic || travelInfo.duration;
            distances[i][j] = travelInfo;
            resolve();
          } catch (error) {
            console.warn(`Error getting distance between ${places[i].name} and ${places[j].name}:`, error);
            // Fallback to Haversine
            const fallback = this.getFallbackDistance(places[i].location, places[j].location);
            matrix[i][j] = fallback.duration;
            distances[i][j] = fallback;
            resolve();
          }
        });

        promises.push(promise);

        // Process in batches to avoid overwhelming the API
        if (promises.length >= batchSize) {
          await Promise.allSettled(promises.splice(0, batchSize));
          await new Promise(resolve => setTimeout(resolve, 200)); // Batch delay
        }
      }
    }

    // Process remaining promises
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    return { matrix, distances };
  }

  // POWERFUL GREEDY ALGORITHM - Enhanced with multiple optimization strategies
  async optimizeRoute(places, timeConstraints = {}) {
    try {
      const {
        startTime = '09:00',
        endTime = '18:00',
        totalTimeAvailable = 480,
        startDay = new Date().getDay(),
        priorityWeight = 0.3, // Weight for place priority/rating
        timeWeight = 0.4,     // Weight for travel time
        openingWeight = 0.3   // Weight for opening hours compatibility
      } = timeConstraints;

      // Input validation
      if (!places || !Array.isArray(places) || places.length === 0) {
        throw new Error('Valid places array is required');
      }

      // Single place handling
      if (places.length === 1) {
        return this.createSinglePlaceRoute(places[0], startTime, startDay);
      }

      console.log(`Optimizing route for ${places.length} places`);

      // Build adjacency matrix with enhanced distance calculations
      const { matrix, distances } = await this.buildAdjacencyMatrix(places);
      const n = places.length;

      // MULTI-START GREEDY APPROACH - Try starting from different places
      const startingCandidates = this.selectStartingCandidates(places, startTime, startDay);
      let bestRoute = null;
      let bestScore = -Infinity;

      for (const startIndex of startingCandidates) {
        const route = await this.greedyRouteFromStart(
          places, matrix, distances, startIndex, 
          { startTime, endTime, totalTimeAvailable, startDay, priorityWeight, timeWeight, openingWeight }
        );

        if (route && route.score > bestScore) {
          bestScore = route.score;
          bestRoute = route;
        }
      }

      // If no feasible route found, try with relaxed constraints
      if (!bestRoute || bestRoute.route.length === 0) {
        console.log('No feasible route found, trying with relaxed constraints');
        bestRoute = await this.greedyRouteFromStart(
          places, matrix, distances, 0,
          { 
            startTime, 
            endTime, 
            totalTimeAvailable: totalTimeAvailable * 1.5, // Increase time budget
            startDay, 
            priorityWeight, 
            timeWeight, 
            openingWeight,
            relaxed: true 
          }
        );
      }

      if (!bestRoute) {
        throw new Error('Unable to generate any route');
      }

      // Apply local optimization improvements
      const optimizedRoute = this.applyLocalOptimizations(bestRoute, matrix, distances, timeConstraints);

      return optimizedRoute;

    } catch (error) {
      console.error('Error in route optimization:', error);
      throw error;
    }
  }

  // Select best starting candidates based on opening hours and ratings
  selectStartingCandidates(places, startTime, startDay) {
    const candidates = places
      .map((place, index) => ({
        index,
        place,
        rating: place.rating || 0,
        isOpen: this.isPlaceOpen(place, startDay, startTime),
        priority: place.priority || 0,
        visitDuration: place.averageVisitDuration || 60
      }))
      .filter(candidate => candidate.isOpen) // Only consider open places
      .sort((a, b) => {
        // Sort by composite score: rating + priority - visit duration (prefer shorter visits for starting)
        const scoreA = a.rating + a.priority - (a.visitDuration / 60);
        const scoreB = b.rating + b.priority - (b.visitDuration / 60);
        return scoreB - scoreA;
      })
      .slice(0, Math.min(5, places.length)) // Try top 5 candidates
      .map(candidate => candidate.index);

    // If no open places, start with highest rated
    if (candidates.length === 0) {
      const fallback = places
        .map((place, index) => ({ index, rating: place.rating || 0 }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3)
        .map(item => item.index);
      
      return fallback.length > 0 ? fallback : [0];
    }

    return candidates;
  }

  // Enhanced greedy algorithm from a specific starting point
  async greedyRouteFromStart(places, matrix, distances, startIndex, constraints) {
    const {
      startTime,
      endTime,
      totalTimeAvailable,
      startDay,
      priorityWeight,
      timeWeight,
      openingWeight,
      relaxed = false
    } = constraints;

    const n = places.length;
    const visited = new Array(n).fill(false);
    const route = [];
    let currentIndex = startIndex;
    let currentTime = this.timeToMinutes(startTime);
    const endTimeMinutes = this.timeToMinutes(endTime);
    let totalTravelTime = 0;
    let totalDistance = 0;
    let totalScore = 0;

    // Add starting place
    visited[currentIndex] = true;
    route.push(currentIndex);
    const startPlace = places[currentIndex];
    
    // Check if starting place is actually open
    if (!this.isPlaceOpen(startPlace, startDay, startTime) && !relaxed) {
      // Find next available time
      const nextOpenTime = this.findNextOpenTime(startPlace, startDay, startTime);
      if (nextOpenTime && this.timeToMinutes(nextOpenTime) < endTimeMinutes) {
        currentTime = this.timeToMinutes(nextOpenTime);
      }
    }

    currentTime += startPlace.averageVisitDuration || 60;
    totalScore += (startPlace.rating || 0) + (startPlace.priority || 0);

    // Greedy selection with enhanced scoring
    while (route.length < n && currentTime < endTimeMinutes) {
      let nextIndex = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < n; i++) {
        if (visited[i]) continue;

        const candidate = places[i];
        const travelTime = matrix[currentIndex][i];
        const arrivalTime = currentTime + travelTime;
        const departureTime = arrivalTime + (candidate.averageVisitDuration || 60);
        
        // Hard constraints (unless relaxed mode)
        if (!relaxed) {
          // Check time constraints
          if (departureTime > endTimeMinutes) continue;
          if ((arrivalTime - this.timeToMinutes(startTime)) > totalTimeAvailable) continue;
          
          // Check if place will be open
          if (!this.isPlaceOpen(candidate, startDay, this.minutesToTime(arrivalTime))) {
            // Try to find next opening time
            const nextOpen = this.findNextOpenTime(candidate, startDay, this.minutesToTime(arrivalTime));
            if (!nextOpen || this.timeToMinutes(nextOpen) > endTimeMinutes) continue;
          }
        } else {
          // Soft constraints in relaxed mode
          if (departureTime > endTimeMinutes * 1.2) continue; // Allow 20% overtime
        }

        // Calculate composite score
        const placeScore = (candidate.rating || 0) + (candidate.priority || 0);
        const timeScore = Math.max(0, 100 - travelTime); // Prefer shorter travel times
        const openingScore = this.isPlaceOpen(candidate, startDay, this.minutesToTime(arrivalTime)) ? 100 : 0;
        
        const compositeScore = 
          (placeScore * priorityWeight) + 
          (timeScore * timeWeight) + 
          (openingScore * openingWeight);

        // Bonus for popular places and penalty for very long visits
        const popularityBonus = Math.min((candidate.rating || 0) * 10, 50);
        const durationPenalty = Math.max(0, ((candidate.averageVisitDuration || 60) - 120) * 0.1);
        
        const finalScore = compositeScore + popularityBonus - durationPenalty;

        if (finalScore > bestScore) {
          bestScore = finalScore;
          nextIndex = i;
        }
      }

      if (nextIndex === -1) break; // No more feasible places

      // Add selected place to route
      visited[nextIndex] = true;
      route.push(nextIndex);
      
      const travelTime = matrix[currentIndex][nextIndex];
      const travelDistance = distances[currentIndex][nextIndex]?.distance || 0;
      
      totalTravelTime += travelTime;
      totalDistance += travelDistance;
      totalScore += (places[nextIndex].rating || 0) + (places[nextIndex].priority || 0);
      
      currentTime += travelTime + (places[nextIndex].averageVisitDuration || 60);
      currentIndex = nextIndex;

      // Early termination if we're running out of time
      if (currentTime > endTimeMinutes * 0.9) break; // Stop at 90% of end time
    }

    // Build detailed itinerary
    const itinerary = await this.buildDetailedItinerary(route, places, distances, startTime, startDay);
    const totalTime = totalTravelTime + route.reduce((sum, i) => sum + (places[i].averageVisitDuration || 60), 0);

    return {
      route: route.map(i => places[i]),
      routeIndices: route,
      totalTime,
      totalDistance,
      totalTravelTime,
      totalScore,
      score: totalScore - (totalTravelTime * 0.1), // Penalize excessive travel time
      itinerary,
      feasible: route.length > 0,
      efficiency: (route.length / places.length) * 100
    };
  }

  // Find next opening time for a place
  findNextOpenTime(place, startDay, currentTime) {
    try {
      if (!place?.openingHours) return currentTime;

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Check next few days
      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const checkDay = (startDay + dayOffset) % 7;
        const dayName = dayNames[checkDay];
        const schedule = place.openingHours[dayName];
        
        if (!schedule || schedule.closed) continue;
        if (schedule.allDay) return currentTime;
        
        const openTime = schedule.open;
        if (dayOffset === 0 && this.timeToMinutes(openTime) > this.timeToMinutes(currentTime)) {
          return openTime;
        } else if (dayOffset > 0) {
          return openTime; // Next day opening
        }
      }
      
      return null;
    } catch (error) {
      return currentTime;
    }
  }

  // Apply local optimizations (2-opt, insertion heuristics)
  applyLocalOptimizations(route, matrix, distances, constraints) {
    if (!route || route.routeIndices.length < 3) return route;

    // 2-opt improvement
    let improved = true;
    let currentRoute = [...route.routeIndices];
    
    while (improved) {
      improved = false;
      
      for (let i = 1; i < currentRoute.length - 2; i++) {
        for (let j = i + 1; j < currentRoute.length; j++) {
          if (j - i === 1) continue; // Skip adjacent pairs
          
          const currentDistance = 
            matrix[currentRoute[i - 1]][currentRoute[i]] +
            matrix[currentRoute[j]][currentRoute[j + 1] || currentRoute[0]];
            
          const newDistance = 
            matrix[currentRoute[i - 1]][currentRoute[j]] +
            matrix[currentRoute[i]][currentRoute[j + 1] || currentRoute[0]];
          
          if (newDistance < currentDistance) {
            // Reverse the sub-route
            const newRoute = [
              ...currentRoute.slice(0, i),
              ...currentRoute.slice(i, j + 1).reverse(),
              ...currentRoute.slice(j + 1)
            ];
            
            currentRoute = newRoute;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    // Rebuild route with optimized order
    if (JSON.stringify(currentRoute) !== JSON.stringify(route.routeIndices)) {
      console.log('Applied local optimization improvements');
      route.routeIndices = currentRoute;
      route.route = currentRoute.map(i => route.route[route.routeIndices.indexOf(i)]);
    }

    return route;
  }

  // Create single place route
  createSinglePlaceRoute(place, startTime, startDay) {
    const visitDuration = place.averageVisitDuration || 60;
    return {
      route: [place],
      routeIndices: [0],
      totalTime: visitDuration,
      totalDistance: 0,
      totalTravelTime: 0,
      itinerary: [{
        place,
        arrivalTime: startTime,
        departureTime: this.minutesToTime(this.timeToMinutes(startTime) + visitDuration),
        visitDuration,
        travelTimeToNext: 0,
        travelDistanceToNext: 0,
        isOpen: this.isPlaceOpen(place, startDay, startTime)
      }],
      feasible: true,
      efficiency: 100
    };
  }

  // Enhanced itinerary builder with opening hours validation
  async buildDetailedItinerary(routeIndices, places, distances, startTime, startDay) {
    const itinerary = [];
    let currentTime = this.timeToMinutes(startTime);

    for (let i = 0; i < routeIndices.length; i++) {
      const placeIndex = routeIndices[i];
      const place = places[placeIndex];
      
      // Check and adjust arrival time if place is closed
      const arrivalTimeStr = this.minutesToTime(currentTime);
      let adjustedArrivalTime = currentTime;
      
      if (!this.isPlaceOpen(place, startDay, arrivalTimeStr)) {
        const nextOpenTime = this.findNextOpenTime(place, startDay, arrivalTimeStr);
        if (nextOpenTime && this.timeToMinutes(nextOpenTime) > currentTime) {
          adjustedArrivalTime = this.timeToMinutes(nextOpenTime);
          currentTime = adjustedArrivalTime;
        }
      }
      
      const visitDuration = place.averageVisitDuration || 60;
      const departureTime = currentTime + visitDuration;
      
      let travelTimeToNext = 0;
      let travelDistanceToNext = 0;
      
      if (i < routeIndices.length - 1) {
        const nextPlaceIndex = routeIndices[i + 1];
        travelTimeToNext = distances[placeIndex]?.[nextPlaceIndex]?.duration || 0;
        travelDistanceToNext = distances[placeIndex]?.[nextPlaceIndex]?.distance || 0;
      }

      itinerary.push({
        place,
        arrivalTime: this.minutesToTime(currentTime),
        departureTime: this.minutesToTime(departureTime),
        visitDuration,
        travelTimeToNext: Math.round(travelTimeToNext),
        travelDistanceToNext: Math.round(travelDistanceToNext * 100) / 100,
        isOpen: this.isPlaceOpen(place, startDay, this.minutesToTime(currentTime)),
        waitingTime: adjustedArrivalTime - (currentTime - (i === 0 ? 0 : visitDuration))
      });

      currentTime = departureTime + travelTimeToNext;
    }

    return itinerary;
  }

  // Clear cache and reset
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

module.exports = PathOptimizer;