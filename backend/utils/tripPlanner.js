// backend/utils/tripPlanner.js
const DistanceCalculator = require('./distanceCalculator');
const Place = require('../models/Place');

class TripPlanner {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();
    this.cache = new Map();
    this.maxCacheSize = 1000;
    this.optimizationStrategies = {
      'distance': this.distanceBasedOptimization.bind(this),
      'rating': this.ratingBasedOptimization.bind(this),
      'time': this.timeBasedOptimization.bind(this),
      'balanced': this.balancedOptimization.bind(this),
      'greedy': this.greedyOptimization.bind(this)
    };
  }

  /**
   * Main trip planning function using greedy algorithm
   * @param {Object} preferences - User preferences and constraints
   * @param {Array} availablePlaces - Array of places to choose from
   * @returns {Object} Optimized trip plan
   */
  async planTrip(preferences, availablePlaces = null) {
    try {
      const {
        startLocation,
        budget = Infinity,
        timeConstraints,
        interests = [],
        accessibility = {},
        groupSize = 1,
        strategy = 'balanced',
        maxPlaces = 10
      } = preferences;

      // Step 1: Get candidate places
      const candidates = availablePlaces || await this.getCandidatePlaces(preferences);
      
      if (candidates.length === 0) {
        throw new Error('No suitable places found for your preferences');
      }

      console.log(`Found ${candidates.length} candidate places for trip planning`);

      // Step 2: Score and rank places
      const scoredPlaces = await this.scoreAndRankPlaces(candidates, preferences);
      
      // Step 3: Apply greedy optimization strategy
      const optimizationStrategy = this.optimizationStrategies[strategy] || this.optimizationStrategies['balanced'];
      const optimizedTrip = await optimizationStrategy(scoredPlaces, preferences);

      // Step 4: Post-process and validate
      const finalTrip = await this.postProcessTrip(optimizedTrip, preferences);
      
      // Step 5: Generate itinerary
      const itinerary = await this.generateDetailedItinerary(finalTrip, preferences);

      return {
        success: true,
        trip: finalTrip,
        itinerary,
        metadata: {
          totalPlacesConsidered: candidates.length,
          strategy: strategy,
          optimizationTime: Date.now() - (preferences.startTime || Date.now()),
          constraints: this.getConstraintsSummary(preferences)
        }
      };

    } catch (error) {
      console.error('Trip planning error:', error);
      return {
        success: false,
        error: error.message,
        fallback: await this.generateFallbackTrip(preferences)
      };
    }
  }

  /**
   * Get candidate places based on user preferences
   */
  async getCandidatePlaces(preferences) {
    const {
      location,
      interests,
      budget,
      accessibility,
      radius = 100,
      minRating = 3.0
    } = preferences;

    let query = { rating: { $gte: minRating } };

    // Filter by interests (categories)
    if (interests && interests.length > 0) {
      query.category = { $in: interests };
    }

    // Filter by budget
    if (budget !== Infinity) {
      query['entryFee.indian'] = { $lte: budget * 0.3 }; // Max 30% of budget per place
    }

    // Filter by accessibility requirements
    if (accessibility.wheelchairAccess) {
      query.wheelchairAccessible = true;
    }
    
    if (accessibility.kidFriendly) {
      query.kidFriendly = true;
    }

    let places = await Place.find(query).lean();

    // Filter by location if provided
    if (location && location.latitude && location.longitude) {
      places = places.filter(place => {
        const distance = this.distanceCalculator.calculateDistance(
          location.latitude, location.longitude,
          place.location.latitude, place.location.longitude
        );
        return distance <= radius;
      });
    }

    return places;
  }

  /**
   * Score and rank places based on multiple criteria
   */
  async scoreAndRankPlaces(places, preferences) {
    const {
      interests = [],
      budget = Infinity,
      timeConstraints = {},
      startLocation,
      priorityWeights = {
        rating: 0.3,
        distance: 0.2,
        cost: 0.2,
        time: 0.15,
        interest: 0.15
      }
    } = preferences;

    const scoredPlaces = await Promise.all(places.map(async (place) => {
      const scores = {
        rating: this.calculateRatingScore(place),
        distance: startLocation ? await this.calculateDistanceScore(place, startLocation) : 0.5,
        cost: this.calculateCostScore(place, budget),
        time: this.calculateTimeScore(place, timeConstraints),
        interest: this.calculateInterestScore(place, interests)
      };

      // Calculate weighted final score
      const finalScore = Object.keys(scores).reduce((total, criterion) => {
        return total + (scores[criterion] * (priorityWeights[criterion] || 0));
      }, 0);

      return {
        ...place,
        scores,
        finalScore,
        efficiency: finalScore / Math.max(place.averageVisitDuration, 60) // Score per minute
      };
    }));

    // Sort by final score (descending)
    return scoredPlaces.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Greedy optimization - select best places considering travel efficiency
   */
  async greedyOptimization(scoredPlaces, preferences) {
    const {
      timeConstraints = { maxDuration: 8 * 60 }, // 8 hours default
      budget = Infinity,
      maxPlaces = 10,
      startLocation
    } = preferences;

    const selectedPlaces = [];
    const remainingPlaces = [...scoredPlaces];
    let totalTime = 0;
    let totalCost = 0;
    let currentLocation = startLocation;

    while (selectedPlaces.length < maxPlaces && remainingPlaces.length > 0) {
      let bestPlace = null;
      let bestScore = -Infinity;
      let bestIndex = -1;

      // Find the best next place considering current context
      for (let i = 0; i < remainingPlaces.length; i++) {
        const place = remainingPlaces[i];
        
        // Check constraints
        if (totalCost + place.entryFee.indian > budget) continue;
        if (totalTime + place.averageVisitDuration > timeConstraints.maxDuration) continue;

        // Calculate contextual score
        let contextualScore = place.finalScore;

        // Add travel efficiency bonus if we have a current location
        if (currentLocation) {
          const travelTime = await this.estimateTravelTime(currentLocation, place.location);
          const totalTimeWithTravel = totalTime + place.averageVisitDuration + travelTime;
          
          if (totalTimeWithTravel > timeConstraints.maxDuration) continue;

          // Penalize long travel times
          contextualScore *= (1 - Math.min(travelTime / 120, 0.5)); // Max 50% penalty for 2+ hour travel
        }

        // Bonus for high efficiency places
        contextualScore *= (1 + place.efficiency * 0.1);

        if (contextualScore > bestScore) {
          bestScore = contextualScore;
          bestPlace = place;
          bestIndex = i;
        }
      }

      // If no valid place found, break
      if (!bestPlace) break;

      // Add the best place to selection
      selectedPlaces.push(bestPlace);
      remainingPlaces.splice(bestIndex, 1);
      
      // Update totals
      totalTime += bestPlace.averageVisitDuration;
      totalCost += bestPlace.entryFee.indian;
      
      if (currentLocation) {
        const travelTime = await this.estimateTravelTime(currentLocation, bestPlace.location);
        totalTime += travelTime;
      }
      
      currentLocation = bestPlace.location;
    }

    return {
      places: selectedPlaces,
      totalTime,
      totalCost,
      efficiency: selectedPlaces.length / Math.max(totalTime / 60, 1), // Places per hour
      constraintsSatisfied: true
    };
  }

  /**
   * Balanced optimization - considers multiple factors equally
   */
  async balancedOptimization(scoredPlaces, preferences) {
    const greedyResult = await this.greedyOptimization(scoredPlaces, preferences);
    
    // Apply local optimization to improve the result
    const optimizedResult = await this.localOptimization(greedyResult, preferences);
    
    return optimizedResult;
  }

  /**
   * Distance-based optimization - minimize total travel distance
   */
  async distanceBasedOptimization(scoredPlaces, preferences) {
    const { startLocation, maxPlaces = 10 } = preferences;
    
    if (!startLocation) {
      return this.greedyOptimization(scoredPlaces, preferences);
    }

    const selectedPlaces = [];
    const remainingPlaces = [...scoredPlaces.slice(0, Math.min(50, scoredPlaces.length))]; // Limit for performance
    let currentLocation = startLocation;

    while (selectedPlaces.length < maxPlaces && remainingPlaces.length > 0) {
      let nearestPlace = null;
      let shortestDistance = Infinity;
      let nearestIndex = -1;

      // Find nearest place with good enough score
      for (let i = 0; i < remainingPlaces.length; i++) {
        const place = remainingPlaces[i];
        const distance = this.distanceCalculator.calculateDistance(
          currentLocation.latitude, currentLocation.longitude,
          place.location.latitude, place.location.longitude
        );

        // Only consider places with decent scores
        if (place.finalScore >= 0.3 && distance < shortestDistance) {
          shortestDistance = distance;
          nearestPlace = place;
          nearestIndex = i;
        }
      }

      if (!nearestPlace) break;

      selectedPlaces.push(nearestPlace);
      remainingPlaces.splice(nearestIndex, 1);
      currentLocation = nearestPlace.location;
    }

    return {
      places: selectedPlaces,
      totalDistance: this.calculateTotalDistance(selectedPlaces, startLocation),
      optimizationStrategy: 'distance'
    };
  }

  /**
   * Rating-based optimization - prioritize highest-rated places
   */
  async ratingBasedOptimization(scoredPlaces, preferences) {
    const { maxPlaces = 10, budget = Infinity } = preferences;
    
    // Sort by rating first, then by final score
    const ratingOptimized = scoredPlaces
      .sort((a, b) => (b.rating - a.rating) || (b.finalScore - a.finalScore))
      .slice(0, maxPlaces);

    let totalCost = 0;
    const selectedPlaces = [];

    for (const place of ratingOptimized) {
      if (totalCost + place.entryFee.indian <= budget) {
        selectedPlaces.push(place);
        totalCost += place.entryFee.indian;
      }
    }

    return {
      places: selectedPlaces,
      totalCost,
      averageRating: selectedPlaces.reduce((sum, p) => sum + p.rating, 0) / selectedPlaces.length,
      optimizationStrategy: 'rating'
    };
  }

  /**
   * Time-based optimization - maximize places within time constraints
   */
  async timeBasedOptimization(scoredPlaces, preferences) {
    const { timeConstraints = { maxDuration: 8 * 60 } } = preferences;
    
    // Sort by efficiency (score per time)
    const timeOptimized = scoredPlaces
      .sort((a, b) => b.efficiency - a.efficiency);

    const selectedPlaces = [];
    let totalTime = 0;

    for (const place of timeOptimized) {
      if (totalTime + place.averageVisitDuration <= timeConstraints.maxDuration) {
        selectedPlaces.push(place);
        totalTime += place.averageVisitDuration;
      }
    }

    return {
      places: selectedPlaces,
      totalTime,
      efficiency: selectedPlaces.length / Math.max(totalTime / 60, 1),
      optimizationStrategy: 'time'
    };
  }

  /**
   * Local optimization to improve greedy solution
   */
  async localOptimization(solution, preferences) {
    // Try 2-opt improvements
    let improved = true;
    let currentSolution = { ...solution };

    while (improved) {
      improved = false;
      const places = currentSolution.places;

      for (let i = 0; i < places.length - 1; i++) {
        for (let j = i + 2; j < places.length; j++) {
          // Try swapping segments
          const newOrder = [
            ...places.slice(0, i),
            ...places.slice(i, j + 1).reverse(),
            ...places.slice(j + 1)
          ];

          const newDistance = await this.calculateTotalDistance(newOrder, preferences.startLocation);
          const currentDistance = await this.calculateTotalDistance(places, preferences.startLocation);

          if (newDistance < currentDistance) {
            currentSolution.places = newOrder;
            improved = true;
          }
        }
      }
    }

    return currentSolution;
  }

  /**
   * Generate detailed itinerary with timing and logistics
   */
  async generateDetailedItinerary(trip, preferences) {
    const {
      startTime = '09:00',
      startLocation,
      timeConstraints = {}
    } = preferences;

    const itinerary = [];
    let currentTime = this.parseTime(startTime);
    let currentLocation = startLocation;

    for (let i = 0; i < trip.places.length; i++) {
      const place = trip.places[i];
      
      // Calculate travel time if not the first place
      let travelTime = 0;
      if (currentLocation) {
        travelTime = await this.estimateTravelTime(currentLocation, place.location);
      }

      const arrivalTime = currentTime + travelTime;
      const departureTime = arrivalTime + place.averageVisitDuration;

      itinerary.push({
        order: i + 1,
        place: {
          id: place.id,
          name: place.name,
          category: place.category,
          rating: place.rating,
          location: place.location
        },
        timing: {
          arrivalTime: this.formatTime(arrivalTime),
          departureTime: this.formatTime(departureTime),
          visitDuration: place.averageVisitDuration,
          travelTimeToHere: travelTime
        },
        logistics: {
          entryFee: place.entryFee.indian,
          bestTimeToVisit: place.bestTimeToVisit,
          amenities: place.amenities
        },
        recommendations: await this.getPlaceRecommendations(place, preferences)
      });

      currentTime = departureTime;
      currentLocation = place.location;
    }

    return {
      schedule: itinerary,
      summary: {
        totalDuration: this.formatTime(currentTime - this.parseTime(startTime)),
        totalCost: trip.totalCost,
        placesCount: trip.places.length,
        estimatedEndTime: this.formatTime(currentTime)
      }
    };
  }

  /**
   * Calculate various scoring metrics
   */
  calculateRatingScore(place) {
    // Normalize rating to 0-1 scale
    return (place.rating - 1) / 4; // Assuming 1-5 rating scale
  }

  async calculateDistanceScore(place, startLocation) {
    const distance = this.distanceCalculator.calculateDistance(
      startLocation.latitude, startLocation.longitude,
      place.location.latitude, place.location.longitude
    );
    
    // Closer places get higher scores (inverse relationship)
    return Math.max(0, 1 - distance / 100); // Assuming 100km as max reasonable distance
  }

  calculateCostScore(place, budget) {
    if (budget === Infinity) return 1;
    
    const cost = place.entryFee.indian;
    const maxReasonableCost = budget * 0.5; // Max 50% of budget for one place
    
    return Math.max(0, 1 - cost / maxReasonableCost);
  }

  calculateTimeScore(place, timeConstraints) {
    if (!timeConstraints.preferredDuration) return 0.5;
    
    const duration = place.averageVisitDuration;
    const preferred = timeConstraints.preferredDuration;
    
    // Score higher if duration is close to preferred
    const difference = Math.abs(duration - preferred);
    return Math.max(0, 1 - difference / preferred);
  }

  calculateInterestScore(place, interests) {
    if (!interests || interests.length === 0) return 0.5;
    
    const categoryMatch = interests.includes(place.category) ? 1 : 0;
    const tagMatches = place.tags ? place.tags.filter(tag => interests.includes(tag)).length : 0;
    
    return Math.min(1, categoryMatch * 0.7 + tagMatches * 0.1);
  }

  /**
   * Utility functions
   */
  async estimateTravelTime(from, to) {
    const cacheKey = `${from.latitude},${from.longitude}-${to.latitude},${to.longitude}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const distance = this.distanceCalculator.calculateDistance(
      from.latitude, from.longitude,
      to.latitude, to.longitude
    );
    
    // Estimate travel time based on distance and average speed
    const averageSpeed = 50; // km/h average including traffic
    const travelTime = (distance / averageSpeed) * 60; // Convert to minutes
    
    // Cache the result
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, travelTime);
    
    return travelTime;
  }

  async calculateTotalDistance(places, startLocation = null) {
    if (places.length === 0) return 0;
    
    let totalDistance = 0;
    let currentLocation = startLocation || places[0].location;
    
    for (const place of places) {
      if (currentLocation !== place.location) {
        totalDistance += this.distanceCalculator.calculateDistance(
          currentLocation.latitude, currentLocation.longitude,
          place.location.latitude, place.location.longitude
        );
      }
      currentLocation = place.location;
    }
    
    return totalDistance;
  }

  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  async getPlaceRecommendations(place, preferences) {
    return {
      suggestedDuration: place.averageVisitDuration,
      bestTimeToVisit: place.bestTimeToVisit,
      tips: this.generatePlaceTips(place, preferences),
      nearbyAttractions: await this.findNearbyAttractions(place)
    };
  }

  generatePlaceTips(place, preferences) {
    const tips = [];
    
    if (place.category === 'temple') {
      tips.push('Dress modestly and follow photography restrictions');
      tips.push('Visit during aarti times for best experience');
    }
    
    if (place.wheelchairAccessible && preferences.accessibility?.wheelchairAccess) {
      tips.push('Wheelchair accessible facilities available');
    }
    
    if (place.kidFriendly && preferences.groupSize > 2) {
      tips.push('Family-friendly activities available');
    }
    
    return tips;
  }

  async findNearbyAttractions(place, radius = 5) {
    try {
      const nearby = await Place.find({
        _id: { $ne: place._id },
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [place.location.longitude, place.location.latitude]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        }
      }).limit(3).lean();
      
      return nearby.map(p => ({ name: p.name, category: p.category, distance: `${radius}km` }));
    } catch (error) {
      return [];
    }
  }

  async postProcessTrip(trip, preferences) {
    // Add metadata and final optimizations
    return {
      ...trip,
      metadata: {
        optimizationComplete: true,
        satisfiesConstraints: this.validateConstraints(trip, preferences),
        recommendations: await this.generateTripRecommendations(trip, preferences)
      }
    };
  }

  validateConstraints(trip, preferences) {
    const { timeConstraints = {}, budget = Infinity } = preferences;
    
    const withinTime = !timeConstraints.maxDuration || trip.totalTime <= timeConstraints.maxDuration;
    const withinBudget = trip.totalCost <= budget;
    
    return {
      time: withinTime,
      budget: withinBudget,
      overall: withinTime && withinBudget
    };
  }

  async generateTripRecommendations(trip, preferences) {
    return {
      packingList: this.generatePackingList(trip.places),
      foodRecommendations: this.generateFoodRecommendations(trip.places),
      transportationTips: await this.generateTransportationTips(trip.places),
      budgetBreakdown: this.generateBudgetBreakdown(trip)
    };
  }

  generatePackingList(places) {
    const items = ['Comfortable walking shoes', 'Water bottle', 'Camera'];
    
    if (places.some(p => p.category === 'temple')) {
      items.push('Modest clothing for temples');
    }
    
    if (places.some(p => p.category === 'beach')) {
      items.push('Sunscreen', 'Hat', 'Swimwear');
    }
    
    return items;
  }

  generateFoodRecommendations(places) {
    const recommendations = [];
    const cities = [...new Set(places.map(p => p.city))];
    
    cities.forEach(city => {
      recommendations.push(`Try local specialties in ${city}`);
    });
    
    return recommendations;
  }

  async generateTransportationTips(places) {
    const tips = [];
    const totalDistance = await this.calculateTotalDistance(places);
    
    if (totalDistance > 100) {
      tips.push('Consider renting a car for this long-distance trip');
    } else {
      tips.push('Public transportation or taxi services recommended');
    }
    
    return tips;
  }

  generateBudgetBreakdown(trip) {
    return {
      entryFees: trip.totalCost,
      estimatedFood: trip.places.length * 200, // ₹200 per meal per place
      estimatedTransport: Math.ceil(trip.totalDistance || 0) * 10, // ₹10 per km
      total: trip.totalCost + (trip.places.length * 200) + (Math.ceil(trip.totalDistance || 0) * 10)
    };
  }

  async generateFallbackTrip(preferences) {
    try {
      // Simple fallback: get top-rated places in popular cities
      const fallbackPlaces = await Place.find({ rating: { $gte: 4.0 } })
        .sort({ rating: -1 })
        .limit(5)
        .lean();
        
      return {
        places: fallbackPlaces,
        note: 'Fallback trip generated due to optimization failure'
      };
    } catch (error) {
      return null;
    }
  }

  getConstraintsSummary(preferences) {
    return {
      timeLimit: preferences.timeConstraints?.maxDuration || 'No limit',
      budgetLimit: preferences.budget === Infinity ? 'No limit' : `₹${preferences.budget}`,
      interests: preferences.interests || ['All'],
      accessibility: Object.keys(preferences.accessibility || {}).length > 0 ? 'Special requirements' : 'Standard'
    };
  }

  // Cleanup method for cache management
  clearCache() {
    this.cache.clear();
  }
}

module.exports = TripPlanner;