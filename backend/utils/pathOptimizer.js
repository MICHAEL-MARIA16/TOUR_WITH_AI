// backend/utils/pathOptimizer.js
const axios = require('axios');

class PathOptimizer {
  constructor() {
    this.distanceCache = new Map();
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  // Calculate distance between two points using Haversine formula
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

  // Get driving time and distance using Google Maps Distance Matrix API
  async getGoogleMapsDistance(origin, destination) {
    const cacheKey = `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;
    
    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey);
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: `${origin.latitude},${origin.longitude}`,
          destinations: `${destination.latitude},${destination.longitude}`,
          mode: 'driving',
          units: 'metric',
          key: this.googleMapsApiKey
        }
      });

      if (response.data.rows[0].elements[0].status === 'OK') {
        const element = response.data.rows[0].elements[0];
        const result = {
          distance: element.distance.value / 1000, // Convert to km
          duration: element.duration.value / 60, // Convert to minutes
          distanceText: element.distance.text,
          durationText: element.duration.text
        };
        
        this.distanceCache.set(cacheKey, result);
        return result;
      } else {
        // Fallback to Haversine distance
        const distance = this.calculateHaversineDistance(
          origin.latitude, origin.longitude,
          destination.latitude, destination.longitude
        );
        const duration = distance * 1.5; // Rough estimation: 1.5 minutes per km
        
        const fallbackResult = {
          distance,
          duration,
          distanceText: `${distance.toFixed(1)} km`,
          durationText: `${Math.round(duration)} mins`
        };
        
        this.distanceCache.set(cacheKey, fallbackResult);
        return fallbackResult;
      }
    } catch (error) {
      console.error('Google Maps API error:', error.message);
      
      // Fallback calculation
      const distance = this.calculateHaversineDistance(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      );
      const duration = distance * 1.5;
      
      return {
        distance,
        duration,
        distanceText: `${distance.toFixed(1)} km`,
        durationText: `${Math.round(duration)} mins`
      };
    }
  }

  // Build adjacency matrix with travel times
  async buildAdjacencyMatrix(places) {
    const n = places.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    const distances = Array(n).fill().map(() => Array(n).fill(null));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
          distances[i][j] = { distance: 0, duration: 0 };
        } else {
          const travelInfo = await this.getGoogleMapsDistance(
            places[i].location,
            places[j].location
          );
          matrix[i][j] = travelInfo.duration;
          distances[i][j] = travelInfo;
        }
      }
    }

    return { matrix, distances };
  }

  // Check if a place is open at given time
  isPlaceOpen(place, day, time) {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
    const schedule = place.openingHours[dayName];
    
    if (!schedule || schedule.closed) return false;
    
    const [openHour, openMin] = schedule.open.split(':').map(Number);
    const [closeHour, closeMin] = schedule.close.split(':').map(Number);
    const [currentHour, currentMin] = time.split(':').map(Number);
    
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    const currentTimeMin = currentHour * 60 + currentMin;
    
    return currentTimeMin >= openTime && currentTimeMin <= closeTime;
  }

  // Convert time string to minutes since midnight
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes since midnight to time string
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Optimized TSP solver using nearest neighbor with time constraints
  async optimizeRoute(places, timeConstraints = {}) {
    const {
      startTime = '09:00',
      totalTimeAvailable = 480, // 8 hours in minutes
      startDay = new Date().getDay()
    } = timeConstraints;

    if (places.length <= 1) {
      return {
        route: places,
        totalTime: 0,
        totalDistance: 0,
        itinerary: places.map((place, idx) => ({
          place,
          arrivalTime: idx === 0 ? startTime : null,
          departureTime: null,
          visitDuration: place.averageVisitDuration,
          travelTimeToNext: 0
        }))
      };
    }

    const { matrix, distances } = await this.buildAdjacencyMatrix(places);
    const n = places.length;
    
    // Greedy nearest neighbor with time constraints
    const visited = new Array(n).fill(false);
    const route = [];
    let currentIndex = 0; // Start from first place
    let currentTime = this.timeToMinutes(startTime);
    let totalTravelTime = 0;
    let totalDistance = 0;

    visited[currentIndex] = true;
    route.push(currentIndex);

    while (route.length < n) {
      let nextIndex = -1;
      let minTime = Infinity;

      // Find nearest unvisited place that we can visit within time constraints
      for (let i = 0; i < n; i++) {
        if (!visited[i]) {
          const travelTime = matrix[currentIndex][i];
          const arrivalTime = currentTime + travelTime;
          const place = places[i];
          
          // Check if we can visit this place within our time budget
          const totalTimeNeeded = arrivalTime - this.timeToMinutes(startTime) + place.averageVisitDuration;
          
          if (totalTimeNeeded <= totalTimeAvailable && 
              travelTime < minTime &&
              this.isPlaceOpen(place, startDay, this.minutesToTime(arrivalTime))) {
            minTime = travelTime;
            nextIndex = i;
          }
        }
      }

      if (nextIndex === -1) break; // No more places can be visited within time constraints

      visited[nextIndex] = true;
      route.push(nextIndex);
      
      totalTravelTime += matrix[currentIndex][nextIndex];
      totalDistance += distances[currentIndex][nextIndex].distance;
      currentTime += matrix[currentIndex][nextIndex] + places[nextIndex].averageVisitDuration;
      currentIndex = nextIndex;
    }

    // Build detailed itinerary
    const itinerary = [];
    let time = this.timeToMinutes(startTime);

    for (let i = 0; i < route.length; i++) {
      const placeIndex = route[i];
      const place = places[placeIndex];
      
      const arrivalTime = this.minutesToTime(time);
      const departureTime = this.minutesToTime(time + place.averageVisitDuration);
      
      const travelTimeToNext = i < route.length - 1 ? 
        matrix[placeIndex][route[i + 1]] : 0;

      itinerary.push({
        place,
        arrivalTime,
        departureTime,
        visitDuration: place.averageVisitDuration,
        travelTimeToNext,
        travelDistanceToNext: i < route.length - 1 ? 
          distances[placeIndex][route[i + 1]].distance : 0
      });

      time += place.averageVisitDuration + travelTimeToNext;
    }

    return {
      route: route.map(i => places[i]),
      totalTime: totalTravelTime + route.reduce((sum, i) => sum + places[i].averageVisitDuration, 0),
      totalDistance,
      itinerary,
      feasible: route.length === places.length
    };
  }

  // Advanced TSP using Dynamic Programming (for small sets)
  async optimizeRouteDP(places, timeConstraints = {}) {
    if (places.length > 10) {
      // Fall back to greedy for larger sets
      return this.optimizeRoute(places, timeConstraints);
    }

    const { matrix } = await this.buildAdjacencyMatrix(places);
    const n = places.length;
    
    if (n <= 1) return this.optimizeRoute(places, timeConstraints);

    // DP state: dp[mask][i] = minimum cost to visit all places in mask ending at i
    const dp = Array(1 << n).fill().map(() => Array(n).fill(Infinity));
    const parent = Array(1 << n).fill().map(() => Array(n).fill(-1));

    // Initialize: starting from place 0
    dp[1][0] = 0;

    for (let mask = 1; mask < (1 << n); mask++) {
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u)) || dp[mask][u] === Infinity) continue;

        for (let v = 0; v < n; v++) {
          if (mask & (1 << v)) continue;

          const newMask = mask | (1 << v);
          const newCost = dp[mask][u] + matrix[u][v];

          if (newCost < dp[newMask][v]) {
            dp[newMask][v] = newCost;
            parent[newMask][v] = u;
          }
        }
      }
    }

    // Find the minimum cost ending point
    const finalMask = (1 << n) - 1;
    let minCost = Infinity;
    let lastPlace = -1;

    for (let i = 0; i < n; i++) {
      if (dp[finalMask][i] < minCost) {
        minCost = dp[finalMask][i];
        lastPlace = i;
      }
    }

    // Reconstruct path
    const path = [];
    let mask = finalMask;
    let current = lastPlace;

    while (current !== -1) {
      path.unshift(current);
      const prev = parent[mask][current];
      mask ^= (1 << current);
      current = prev;
    }

    return {
      route: path.map(i => places[i]),
      totalTime: minCost,
      totalDistance: await this.calculateTotalDistance(path, places),
      itinerary: await this.buildItinerary(path, places, timeConstraints)
    };
  }

  async calculateTotalDistance(path, places) {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const distance = await this.getGoogleMapsDistance(
        places[path[i]].location,
        places[path[i + 1]].location
      );
      totalDistance += distance.distance;
    }
    return totalDistance;
  }

  async buildItinerary(path, places, timeConstraints) {
    const { startTime = '09:00' } = timeConstraints;
    const itinerary = [];
    let currentTime = this.timeToMinutes(startTime);

    for (let i = 0; i < path.length; i++) {
      const place = places[path[i]];
      const arrivalTime = this.minutesToTime(currentTime);
      const departureTime = this.minutesToTime(currentTime + place.averageVisitDuration);
      
      let travelTimeToNext = 0;
      let travelDistanceToNext = 0;
      
      if (i < path.length - 1) {
        const travelInfo = await this.getGoogleMapsDistance(
          place.location,
          places[path[i + 1]].location
        );
        travelTimeToNext = travelInfo.duration;
        travelDistanceToNext = travelInfo.distance;
      }

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
}

module.exports = PathOptimizer;