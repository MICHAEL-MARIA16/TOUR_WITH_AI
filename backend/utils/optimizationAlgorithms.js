// backend/utils/optimizationAlgorithms.js - COMPLETE WORKING VERSION
const DistanceCalculator = require('./distanceCalculator');

// Mock locations if config is not available
const USER_LOCATIONS = {
  coimbatore: {
    name: 'Coimbatore',
    coordinates: { latitude: 11.0168, longitude: 76.9558 }
  },
  chennai: {
    name: 'Chennai',
    coordinates: { latitude: 13.0827, longitude: 80.2707 }
  },
  bangalore: {
    name: 'Bangalore',
    coordinates: { latitude: 12.9716, longitude: 77.5946 }
  }
};

function getLocationById(locationId) {
  return USER_LOCATIONS[locationId] || USER_LOCATIONS.coimbatore;
}

class OptimizationAlgorithms {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();
    this.cache = new Map();
    this.maxCacheSize = 2000;
  }

  /**
   * FIXED: Advanced Greedy Algorithm with Complete Timing Intelligence
   */
  async advancedGreedyOptimization(places, constraints = {}) {
    const {
      startLocationId = 'coimbatore',
      startTime = '09:00',
      endTime = '18:00',
      userPreferredTimes = ['morning', 'afternoon'],
      currentDay = new Date().getDay(),
      currentDate = new Date(),
      timeConstraints = { 
        maxDuration: 480,
        minPlaceTime: 30,
        maxWaitTime: 60,
        bufferTime: 30
      },
      budget = Infinity,
      userPreferences = {
        prioritizeTimings: true,
        avoidRush: true,
        preferMorning: false,
        preferEvening: false,
        maxTravelTimePercent: 40
      },
      weights = {
        rating: 0.25,
        distance: 0.20,
        timing: 0.25,
        cost: 0.10,
        userPreference: 0.15,
        crowdLevel: 0.05
      }
    } = constraints;

    console.log(`🧠 Advanced Greedy Algorithm: Processing ${places.length} places from ${startLocationId}`);

    const userLocation = getLocationById(startLocationId);
    const startLocation = userLocation.coordinates;
    
    console.log(`📍 Starting from: ${userLocation.name}`);
    console.log(`⏰ Time window: ${startTime} - ${endTime}`);
    console.log(`📅 Day: ${this.getDayName(currentDay)}`);

    if (places.length === 0) {
      return this.createEmptyResult('advanced-greedy', userLocation);
    }

    // PHASE 1: Validate places with timing intelligence
    const validPlaces = await this.validatePlacesWithAdvancedTiming(
      places, 
      currentDay, 
      startTime, 
      endTime,
      timeConstraints, 
      currentDate,
      userPreferredTimes
    );
    
    console.log(`✅ Timing-validated places: ${validPlaces.length}/${places.length}`);

    if (validPlaces.length === 0) {
      return this.createEmptyResult('advanced-greedy', userLocation, {
        error: 'No places available during specified time window',
        validPlaces: 0,
        totalPlaces: places.length,
        issues: ['All places closed', 'Time constraints too restrictive']
      });
    }

    // PHASE 2: Intelligent route building
    const result = await this.buildOptimalRoute(
      validPlaces,
      startLocation,
      startTime,
      endTime,
      constraints,
      weights,
      userPreferredTimes,
      userPreferences,
      currentDay,
      currentDate
    );

    return {
      ...result,
      algorithm: 'advanced-greedy',
      startLocation: userLocation
    };
  }

  /**
   * FIXED: Enhanced Genetic Algorithm
   */
  async geneticAlgorithmOptimization(places, constraints = {}) {
    const {
      populationSize = 50,
      generations = 100,
      mutationRate = 0.2,
      crossoverRate = 0.8,
      eliteSize = 10,
      startLocationId = 'coimbatore'
    } = constraints;

    console.log(`🧬 Genetic Algorithm: ${places.length} places, ${generations} generations`);

    // Use greedy for small problems
    if (places.length < 4) {
      console.log('🔄 Using greedy for small problem');
      return this.advancedGreedyOptimization(places, constraints);
    }

    try {
      const userLocation = getLocationById(startLocationId);
      const validPlaces = await this.validatePlacesForGenetic(places, constraints);

      if (validPlaces.length < 2) {
        console.log('❌ Insufficient valid places for genetic algorithm');
        return this.advancedGreedyOptimization(places, constraints);
      }

      // Initialize population
      let population = await this.initializePopulation(validPlaces, populationSize, constraints);
      let bestOverallFitness = -Infinity;
      let stagnationCounter = 0;
      let bestSolution = null;

      for (let generation = 0; generation < generations; generation++) {
        try {
          // Evaluate fitness
          const fitnessResults = await this.evaluatePopulationFitness(population, constraints);

          // Track best solution
          const currentBest = Math.max(...fitnessResults);
          const bestIndex = fitnessResults.indexOf(currentBest);
          
          if (currentBest > bestOverallFitness) {
            bestOverallFitness = currentBest;
            bestSolution = [...population[bestIndex]];
            stagnationCounter = 0;
          } else {
            stagnationCounter++;
          }

          // Early termination
          if (stagnationCounter > 20) {
            console.log(`🔄 Early termination at generation ${generation}`);
            break;
          }

          // Create new generation
          population = await this.createNewGeneration(
            population, 
            fitnessResults, 
            populationSize, 
            eliteSize, 
            crossoverRate, 
            mutationRate,
            constraints
          );

          if (generation % 20 === 0) {
            console.log(`Generation ${generation}: Best fitness = ${currentBest.toFixed(4)}`);
          }
        } catch (error) {
          console.error(`Error in generation ${generation}:`, error.message);
          break;
        }
      }

      // Calculate final metrics
      const finalRoute = bestSolution || population[0] || [];
      const metrics = await this.calculateRouteMetrics(finalRoute, constraints);

      console.log(`🎯 Genetic algorithm complete: Best fitness = ${bestOverallFitness.toFixed(4)}`);

      return {
        route: finalRoute,
        ...metrics,
        algorithm: 'genetic',
        startLocation: userLocation,
        generations: generation + 1,
        finalFitness: bestOverallFitness
      };

    } catch (error) {
      console.error('Genetic algorithm failed:', error);
      return this.advancedGreedyOptimization(places, constraints);
    }
  }

  /**
   * FIXED: Nearest Neighbor Algorithm
   */
  async nearestNeighborOptimization(places, constraints = {}) {
    const { startLocationId = 'coimbatore', budget = Infinity } = constraints;
    
    console.log(`🔍 Nearest Neighbor Algorithm: ${places.length} places`);

    const userLocation = getLocationById(startLocationId);
    const startLocation = userLocation.coordinates;

    if (places.length === 0) {
      return this.createEmptyResult('nearest-neighbor', userLocation);
    }

    const route = [];
    const remaining = [...places];
    let currentLocation = startLocation;
    let totalDistance = 0;
    let totalTime = 0;
    let totalCost = 0;

    while (remaining.length > 0) {
      let nearestPlace = null;
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      // Find nearest unvisited place
      for (let i = 0; i < remaining.length; i++) {
        const place = remaining[i];
        const placeCost = this.getPlaceEntryCost(place);

        // Check budget constraint
        if (totalCost + placeCost > budget) continue;

        try {
          const distance = await this.calculateDistance(currentLocation, place.location);
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlace = place;
            nearestIndex = i;
          }
        } catch (error) {
          console.warn(`Distance calculation failed for ${place.name}:`, error.message);
        }
      }

      if (nearestPlace) {
        route.push(nearestPlace);
        remaining.splice(nearestIndex, 1);
        currentLocation = nearestPlace.location;
        totalDistance += nearestDistance;
        totalTime += (nearestPlace.averageVisitDuration || 90);
        totalCost += this.getPlaceEntryCost(nearestPlace);
      } else {
        break; // No more feasible places
      }
    }

    // Add travel time estimate
    const travelTimeEstimate = Math.round(totalDistance * 1.5); // ~1.5 min per km
    const totalTimeWithTravel = totalTime + travelTimeEstimate;

    console.log(`🎯 Nearest neighbor complete: ${route.length} places selected`);

    return {
      route,
      totalTime: totalTimeWithTravel,
      totalTravelTime: travelTimeEstimate,
      totalVisitTime: totalTime,
      totalDistance,
      totalCost,
      efficiency: this.calculateBasicEfficiency(route, totalTimeWithTravel),
      algorithm: 'nearest-neighbor',
      startLocation: userLocation
    };
  }

  /**
   * FIXED: Dynamic Programming Algorithm (for small problems)
   */
  async dynamicProgrammingOptimization(places, constraints = {}) {
    const { startLocationId = 'coimbatore', budget = Infinity } = constraints;
    
    console.log(`💎 Dynamic Programming Algorithm: ${places.length} places`);

    // DP is only feasible for small problems
    if (places.length > 12) {
      console.log('🔄 Too many places for DP, using genetic algorithm');
      return this.geneticAlgorithmOptimization(places, constraints);
    }

    const userLocation = getLocationById(startLocationId);
    
    if (places.length === 0) {
      return this.createEmptyResult('dynamic-programming', userLocation);
    }

    try {
      const result = await this.solveTSPWithDP(places, userLocation.coordinates, budget);
      
      console.log(`🎯 Dynamic programming complete: ${result.route.length} places`);

      return {
        ...result,
        algorithm: 'dynamic-programming',
        startLocation: userLocation
      };
    } catch (error) {
      console.error('Dynamic programming failed:', error);
      return this.nearestNeighborOptimization(places, constraints);
    }
  }

  // ==================== HELPER METHODS ====================

  createEmptyResult(algorithm, startLocation, additional = {}) {
    return {
      route: [],
      totalTime: 0,
      totalDistance: 0,
      totalCost: 0,
      totalTravelTime: 0,
      totalVisitTime: 0,
      efficiency: 0,
      algorithm,
      startLocation,
      ...additional
    };
  }

  /**
   * Build optimal route using intelligent greedy selection
   */
  async buildOptimalRoute(validPlaces, startLocation, startTime, endTime, constraints, weights, userPreferredTimes, userPreferences, currentDay, currentDate) {
    const selectedPlaces = [];
    const remainingPlaces = [...validPlaces];
    let totalTime = 0;
    let totalCost = 0;
    let totalDistance = 0;
    let totalTravelTime = 0;
    let currentLocation = startLocation;
    let currentTime = this.parseTime(startTime);
    const tripEndTime = this.parseTime(endTime);

    const timingStats = {
      placesWithOptimalTiming: 0,
      placesWithWaitTime: 0,
      totalWaitTime: 0,
      averageTimingScore: 0,
      rushHourEncounters: 0
    };

    while (remainingPlaces.length > 0 && currentTime < tripEndTime) {
      const bestCandidate = await this.findBestCandidate(
        remainingPlaces,
        currentLocation,
        currentTime,
        tripEndTime,
        selectedPlaces,
        constraints,
        weights,
        userPreferredTimes,
        userPreferences,
        currentDay,
        currentDate,
        totalCost,
        totalTravelTime,
        totalTime,
        startTime
      );

      if (!bestCandidate) {
        console.log('🛑 No more feasible places found');
        break;
      }

      const { candidate, index, timingInfo } = bestCandidate;

      // Update timing statistics
      if (timingInfo.timingCheck?.isOptimalTime) timingStats.placesWithOptimalTiming++;
      if (timingInfo.waitTime > 0) {
        timingStats.placesWithWaitTime++;
        timingStats.totalWaitTime += timingInfo.waitTime;
      }
      if (timingInfo.timingCheck?.isRushHour) timingStats.rushHourEncounters++;

      console.log(`✅ Selected: ${candidate.name}`);
      console.log(`   ⏰ Arrival: ${this.formatTime(timingInfo.arrivalTime)}, Departure: ${this.formatTime(timingInfo.departureTime)}`);

      // Add to route
      selectedPlaces.push({
        ...candidate,
        arrivalTime: this.formatTime(timingInfo.arrivalTime),
        departureTime: this.formatTime(timingInfo.departureTime),
        travelTimeFromPrevious: timingInfo.travelData.travelTime,
        travelDistanceFromPrevious: timingInfo.travelData.distance,
        waitTime: timingInfo.waitTime,
        order: selectedPlaces.length + 1
      });

      // Update state
      remainingPlaces.splice(index, 1);
      totalTime = timingInfo.departureTime - this.parseTime(startTime);
      totalTravelTime += timingInfo.travelData.travelTime;
      totalCost += this.getPlaceEntryCost(candidate);
      totalDistance += timingInfo.travelData.distance;
      currentLocation = candidate.location;
      currentTime = timingInfo.departureTime;
    }

    timingStats.averageTimingScore = selectedPlaces.reduce((sum, p) => 
      sum + (p.timingInfo?.timingScore || 0.5), 0
    ) / Math.max(selectedPlaces.length, 1);

    return {
      route: selectedPlaces,
      totalTime,
      totalDistance,
      totalCost,
      totalTravelTime,
      efficiency: this.calculateTimingAwareEfficiency(selectedPlaces, totalTime, timingStats),
      placesSelected: selectedPlaces.length,
      timingAnalysis: {
        ...timingStats,
        travelTimePercentage: Math.round((totalTravelTime / Math.max(totalTime, 1)) * 100),
        validPlaces: validPlaces.length,
        totalPlaces: validPlaces.length,
        timeUtilization: Math.round((totalTime / Math.max(this.parseTime(endTime) - this.parseTime(startTime), 1)) * 100)
      }
    };
  }

  /**
   * Find the best candidate place using multi-criteria scoring
   */
  async findBestCandidate(remainingPlaces, currentLocation, currentTime, tripEndTime, selectedPlaces, constraints, weights, userPreferredTimes, userPreferences, currentDay, currentDate, totalCost, totalTravelTime, totalTime, startTime) {
    let bestCandidate = null;
    let bestScore = -Infinity;
    let bestIndex = -1;

    for (let i = 0; i < remainingPlaces.length; i++) {
      const candidate = remainingPlaces[i];

      try {
        // Get travel data
        const travelData = await this.getTravelData(currentLocation, candidate.location);
        const arrivalTime = currentTime + travelData.travelTime;
        
        // Check timing constraints
        const timingCheck = await this.checkAdvancedPlaceTimingConstraints(
          candidate, 
          arrivalTime, 
          currentDay,
          currentDate,
          userPreferredTimes,
          userPreferences
        );
        
        if (!timingCheck.canVisit) continue;

        const adjustedArrivalTime = timingCheck.earliestEntry;
        const visitEndTime = adjustedArrivalTime + candidate.averageVisitDuration;
        
        // Check if we can complete visit within trip window
        if (visitEndTime > tripEndTime - (constraints.timeConstraints?.bufferTime || 30)) continue;

        // Check other constraints
        const constraintCheck = this.checkEnhancedConstraints(
          candidate, 
          visitEndTime - this.parseTime(startTime), 
          totalCost, 
          constraints,
          totalTravelTime,
          totalTime
        );
        
        if (!constraintCheck.feasible) continue;

        // Calculate score
        const score = await this.calculateMultiCriteriaScore(
          candidate, 
          currentLocation, 
          selectedPlaces, 
          constraints, 
          adjustedArrivalTime,
          weights,
          timingCheck
        );

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
          bestIndex = i;
          bestCandidate.timingInfo = {
            travelData,
            arrivalTime: adjustedArrivalTime,
            departureTime: visitEndTime,
            waitTime: Math.max(0, adjustedArrivalTime - arrivalTime),
            timingCheck
          };
        }
      } catch (error) {
        console.warn(`Error evaluating candidate ${candidate.name}:`, error.message);
      }
    }

    return bestCandidate ? {
      candidate: bestCandidate,
      index: bestIndex,
      timingInfo: bestCandidate.timingInfo
    } : null;
  }

  /**
   * Validate places with advanced timing logic
   */
  async validatePlacesWithAdvancedTiming(places, currentDay, startTime, endTime, timeConstraints, currentDate, userPreferredTimes) {
    const startTimeMinutes = this.parseTime(startTime);
    const endTimeMinutes = this.parseTime(endTime);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[currentDay];
    const currentSeason = this.getCurrentSeason(currentDate.getMonth());

    const validPlaces = [];

    for (const place of places) {
      if (!place.location?.latitude || !place.location?.longitude || !place.averageVisitDuration) {
        continue;
      }

      const timingValidation = await this.validatePlaceTimings(
        place, 
        dayName, 
        startTimeMinutes, 
        endTimeMinutes, 
        timeConstraints,
        currentSeason,
        userPreferredTimes
      );

      if (timingValidation.isValid) {
        validPlaces.push({
          ...place,
          timing: timingValidation.timing,
          seasonality: timingValidation.seasonality,
          userPreferenceAlignment: timingValidation.userPreferenceAlignment
        });
      } else {
        console.log(`🔒 ${place.name}: ${timingValidation.reason}`);
      }
    }

    return validPlaces;
  }

  /**
   * Validate individual place timings
   */
  async validatePlaceTimings(place, dayName, startTime, endTime, timeConstraints, currentSeason, userPreferredTimes) {
    // Handle places without opening hours (always open)
    if (!place.openingHours) {
      return {
        isValid: true,
        timing: { 
          openTime: 0, 
          closeTime: 1440, 
          bestTimeToVisit: place.bestTimeToVisit || ['morning', 'afternoon'],
          alwaysOpen: true
        },
        seasonality: { season: currentSeason, suitability: 'good' },
        userPreferenceAlignment: this.calculateUserPreferenceAlignment(place.bestTimeToVisit || ['morning'], userPreferredTimes),
        reason: 'Always open'
      };
    }

    const dayHours = place.openingHours[dayName];
    if (!dayHours?.open || !dayHours?.close) {
      return { isValid: false, reason: `Closed on ${dayName}` };
    }

    const openTime = this.parseTime(dayHours.open);
    const closeTime = this.parseTime(dayHours.close);
    const actualCloseTime = closeTime < openTime ? closeTime + 1440 : closeTime;

    // Check if place can fit in the time window
    const minimumVisitTime = Math.max(openTime, startTime);
    const maximumStartTime = Math.min(actualCloseTime - place.averageVisitDuration, endTime - place.averageVisitDuration);

    if (maximumStartTime < minimumVisitTime) {
      return { 
        isValid: false, 
        reason: `Cannot fit ${place.averageVisitDuration}min visit between ${this.formatTime(minimumVisitTime)} - ${this.formatTime(maximumStartTime)}` 
      };
    }

    const bestTimeToVisit = place.bestTimeToVisit || ['morning'];
    const seasonalSuitability = this.getSeasonalSuitability(place, currentSeason);
    const userAlignment = this.calculateUserPreferenceAlignment(bestTimeToVisit, userPreferredTimes);

    return {
      isValid: true,
      timing: {
        openTime,
        closeTime: actualCloseTime,
        bestTimeToVisit
      },
      seasonality: {
        season: currentSeason,
        suitability: seasonalSuitability
      },
      userPreferenceAlignment: userAlignment,
      reason: 'Valid with timing constraints'
    };
  }

  /**
   * Check advanced place timing constraints
   */
  async checkAdvancedPlaceTimingConstraints(place, arrivalTime, currentDay, currentDate, userPreferredTimes, userPreferences) {
    if (!place.timing) {
      return { 
        canVisit: true, 
        earliestEntry: arrivalTime, 
        timingScore: 1.0,
        isOptimalTime: true,
        userPreferenceScore: 1.0,
        isRushHour: false
      };
    }

    const { openTime, closeTime, bestTimeToVisit } = place.timing;
    const visitDuration = place.averageVisitDuration;

    // Check basic availability
    if (arrivalTime < openTime) {
      const waitTime = openTime - arrivalTime;
      if (waitTime > 60) return { canVisit: false };

      return {
        canVisit: true,
        earliestEntry: openTime,
        timingScore: Math.max(0.7, 1 - (waitTime / 120)),
        isOptimalTime: this.isOptimalTimeForPlace(openTime, bestTimeToVisit),
        userPreferenceScore: this.calculateUserPreferenceScore(openTime, userPreferredTimes),
        isRushHour: this.isRushHour(openTime)
      };
    }

    if (arrivalTime + visitDuration > closeTime) {
      return { canVisit: false };
    }

    const timingScore = this.calculateAdvancedTimingScore(arrivalTime, bestTimeToVisit, userPreferences);
    const isOptimalTime = this.isOptimalTimeForPlace(arrivalTime, bestTimeToVisit);
    const userPreferenceScore = this.calculateUserPreferenceScore(arrivalTime, userPreferredTimes);
    const isRushHour = this.isRushHour(arrivalTime);

    return {
      canVisit: true,
      earliestEntry: arrivalTime,
      timingScore,
      isOptimalTime,
      userPreferenceScore,
      isRushHour
    };
  }

  /**
   * Calculate multi-criteria score for place selection
   */
  async calculateMultiCriteriaScore(candidate, currentLocation, selectedPlaces, constraints, arrivalTime, weights, timingCheck) {
    const travelData = await this.getTravelData(currentLocation, candidate.location);
    
    const scores = {
      rating: (candidate.rating || 3.0) / 5.0,
      distance: 1 - Math.min(1, travelData.distance / 100),
      cost: 1 - Math.min(1, this.getPlaceEntryCost(candidate) / 500),
      timing: timingCheck.timingScore || 0.5,
      userPreference: timingCheck.userPreferenceScore || 0.5,
      diversity: this.calculateDiversityScore(candidate, selectedPlaces)
    };

    let totalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key] || 0) * weight;
    }, 0);

    // Apply bonuses
    if (timingCheck.isOptimalTime) totalScore *= 1.15;
    if (timingCheck.userPreferenceScore > 0.8) totalScore *= 1.1;
    if (timingCheck.isRushHour && constraints.userPreferences?.avoidRush) totalScore *= 0.9;
    if (this.isNewCategory(candidate, selectedPlaces)) totalScore *= 1.05;

    return totalScore;
  }

  /**
   * Enhanced constraint checking
   */
  checkEnhancedConstraints(place, totalTime, currentCost, constraints, totalTravelTime, currentTotalTime) {
    const { timeConstraints = {}, budget = Infinity, accessibility = {}, userPreferences = {} } = constraints;
    
    if (timeConstraints.maxDuration && totalTime > timeConstraints.maxDuration) {
      return { feasible: false, reason: 'time_exceeded' };
    }
    
    if (userPreferences.maxTravelTimePercent && currentTotalTime > 0) {
      const travelPercentage = (totalTravelTime / currentTotalTime) * 100;
      if (travelPercentage > userPreferences.maxTravelTimePercent) {
        return { feasible: false, reason: 'travel_time_exceeded' };
      }
    }
    
    const placeCost = this.getPlaceEntryCost(place);
    if (currentCost + placeCost > budget) {
      return { feasible: false, reason: 'budget_exceeded' };
    }
    
    if (accessibility.wheelchairAccess && !place.wheelchairAccessible) {
      return { feasible: false, reason: 'accessibility_required' };
    }
    
    if (accessibility.kidFriendly && place.kidFriendly === false) {
      return { feasible: false, reason: 'not_kid_friendly' };
    }
    
    return { feasible: true };
  }

  // ==================== GENETIC ALGORITHM HELPERS ====================

  async validatePlacesForGenetic(places, constraints) {
    return places.filter(place => 
      place.location?.latitude && 
      place.location?.longitude && 
      place.averageVisitDuration
    );
  }

  async initializePopulation(places, populationSize, constraints) {
    const population = [];
    
    try {
      // Seed with greedy solution
      const greedySolution = await this.advancedGreedyOptimization(places, constraints);
      if (greedySolution.route.length > 0) {
        population.push(greedySolution.route);
      }
    } catch (error) {
      console.warn('Could not generate greedy seed:', error.message);
    }
    
    // Fill with random solutions
    while (population.length < populationSize) {
      const randomRoute = this.shuffleArray([...places]).slice(0, Math.min(15, places.length));
      population.push(randomRoute);
    }
    
    return population;
  }

  async evaluatePopulationFitness(population, constraints) {
    return Promise.all(population.map(async (individual, index) => {
      try {
        return await this.evaluateIndividualFitness(individual, constraints);
      } catch (error) {
        console.warn(`Fitness evaluation failed for individual ${index}:`, error.message);
        return 0.01;
      }
    }));
  }

  async evaluateIndividualFitness(individual, constraints) {
    const metrics = await this.calculateRouteMetrics(individual, constraints);
    
    if (metrics.totalDistance === 0 && metrics.totalTime === 0) {
      return individual.length * 0.1;
    }

    const distanceScore = 1 / (1 + metrics.totalDistance / 100);
    const timeScore = 1 / (1 + metrics.totalTime / 480);
    const ratingScore = (metrics.averageRating || 0) / 5;
    
    const fitness = (distanceScore * 0.3 + timeScore * 0.3 + ratingScore * 0.4);
    return Math.max(0.01, fitness);
  }

  async createNewGeneration(population, fitnessResults, populationSize, eliteSize, crossoverRate, mutationRate, constraints) {
    const sortedIndividuals = population
      .map((individual, index) => ({ individual, fitness: fitnessResults[index] }))
      .sort((a, b) => b.fitness - a.fitness);

    const newPopulation = sortedIndividuals
      .slice(0, eliteSize)
      .map(item => [...item.individual]);

    while (newPopulation.length < populationSize) {
      const parent1 = this.tournamentSelection(sortedIndividuals);
      const parent2 = this.tournamentSelection(sortedIndividuals);
      
      let offspring;
      if (Math.random() < crossoverRate) {
        offspring = this.crossover(parent1, parent2);
      } else {
        offspring = [...parent1];
      }
      
      if (Math.random() < mutationRate) {
        offspring = this.mutate(offspring);
      }
      
      newPopulation.push(offspring);
    }

    return newPopulation;
  }

  tournamentSelection(individuals, tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * individuals.length);
      tournament.push(individuals[randomIndex]);
    }
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0].individual;
  }

  crossover(parent1, parent2) {
    if (!parent1 || !parent2 || parent1.length === 0 || parent2.length === 0) {
      return parent1.length > 0 ? [...parent1] : [...parent2];
    }

    const length = Math.min(parent1.length, parent2.length);
    const start = Math.floor(Math.random() * length);
    const end = start + Math.floor(Math.random() * (length - start));
    
    const child = Array(length).fill(null);
    
    // Copy segment from parent1
    for (let i = start; i < end && i < parent1.length; i++) {
      child[i] = parent1[i];
    }
    
    // Fill remaining from parent2
    let parent2Index = 0;
    for (let i = 0; i < length; i++) {
      if (child[i] === null) {
        while (parent2Index < parent2.length && 
               child.some(place => place && place.id === parent2[parent2Index].id)) {
          parent2Index++;
        }
        if (parent2Index < parent2.length) {
          child[i] = parent2[parent2Index];
          parent2Index++;
        }
      }
    }
    
    return child.filter(place => place !== null);
  }

  mutate(individual, mutationRate = 0.15) {
    if (Math.random() > mutationRate || individual.length < 2) return individual;
    
    const mutated = [...individual];
    const mutationType = Math.random();
    
    if (mutationType < 0.5 && mutated.length >= 2) {
      // Swap mutation
      const i = Math.floor(Math.random() * mutated.length);
      const j = Math.floor(Math.random() * mutated.length);
      [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    } else if (mutated.length >= 3) {
      // Reverse segment
      const start = Math.floor(Math.random() * mutated.length);
      const end = Math.floor(Math.random() * mutated.length);
      const [reverseStart, reverseEnd] = [Math.min(start, end), Math.max(start, end)];
      
      if (reverseEnd > reverseStart) {
        const segment = mutated.slice(reverseStart, reverseEnd + 1).reverse();
        mutated.splice(reverseStart, reverseEnd - reverseStart + 1, ...segment);
      }
    }
    
    return mutated;
  }

  // ==================== DYNAMIC PROGRAMMING ====================

  async solveTSPWithDP(places, startLocation, budget) {
    const n = places.length;
    const dp = new Map();
    const parent = new Map();
    
    // Create distance matrix
    const distances = Array(n + 1).fill().map(() => Array(n + 1).fill(0));
    const costs = Array(n + 1).fill(0);
    
    // Calculate distances
    for (let i = 0; i < n; i++) {
      costs[i + 1] = this.getPlaceEntryCost(places[i]);
      const distance = await this.calculateDistance(startLocation, places[i].location);
      distances[0][i + 1] = distance;
      distances[i + 1][0] = distance;
      
      for (let j = i + 1; j < n; j++) {
        const dist = await this.calculateDistance(places[i].location, places[j].location);
        distances[i + 1][j + 1] = dist;
        distances[j + 1][i + 1] = dist;
      }
    }
    
    // DP function
    const solve = (mask, pos) => {
      const key = `${mask}-${pos}`;
      if (dp.has(key)) return dp.get(key);
      
      if (mask === (1 << n) - 1) {
        return distances[pos][0];
      }
      
      let result = Infinity;
      let bestNext = -1;
      
      for (let city = 0; city < n; city++) {
        if (mask & (1 << city)) continue;
        
        const newMask = mask | (1 << city);
        const cost = distances[pos][city + 1] + solve(newMask, city + 1);
        
        if (cost < result) {
          result = cost;
          bestNext = city;
        }
      }
      
      dp.set(key, result);
      if (bestNext !== -1) {
        parent.set(key, bestNext);
      }
      
      return result;
    };
    
    const totalDistance = solve(0, 0);
    
    // Reconstruct path
    const route = [];
    let mask = 0;
    let pos = 0;
    
    while (route.length < n) {
      const key = `${mask}-${pos}`;
      const nextCity = parent.get(key);
      if (nextCity === undefined) break;
      
      route.push(places[nextCity]);
      mask |= (1 << nextCity);
      pos = nextCity + 1;
    }
    
    const totalTime = route.reduce((sum, place) => sum + place.averageVisitDuration, 0) + totalDistance * 1.5;
    const totalCost = route.reduce((sum, place) => sum + this.getPlaceEntryCost(place), 0);
    
    return {
      route,
      totalDistance,
      totalTime,
      totalCost,
      efficiency: this.calculateBasicEfficiency(route, totalTime)
    };
  }

  // ==================== HELPER METHODS ====================

  async calculateRouteMetrics(route, constraints = {}) {
    if (!route || route.length === 0) {
      return {
        totalTime: 0,
        totalTravelTime: 0,
        totalVisitTime: 0,
        totalDistance: 0,
        totalCost: 0,
        averageRating: 0,
        efficiency: 0
      };
    }

    const totalVisitTime = route.reduce((sum, place) => sum + (place.averageVisitDuration || 60), 0);
    const totalCost = route.reduce((sum, place) => sum + this.getPlaceEntryCost(place), 0);
    const averageRating = route.reduce((sum, place) => sum + (place.rating || 0), 0) / route.length;

    let totalDistance = 0;
    let totalTravelTime = 0;

    // Calculate travel metrics
    const startLocationId = constraints.startLocationId || 'coimbatore';
    const startLocation = getLocationById(startLocationId).coordinates;
    const locations = [startLocation, ...route.map(p => p.location)];

    for (let i = 1; i < locations.length; i++) {
      try {
        const travelData = await this.getTravelData(locations[i-1], locations[i]);
        totalDistance += travelData.distance;
        totalTravelTime += travelData.travelTime;
      } catch (error) {
        const fallbackDistance = this.calculateStraightLineDistance(locations[i-1], locations[i]);
        totalDistance += fallbackDistance;
        totalTravelTime += (fallbackDistance / 40) * 60;
      }
    }

    return {
      totalTime: totalVisitTime + totalTravelTime,
      totalTravelTime,
      totalVisitTime,
      totalDistance,
      totalCost,
      averageRating,
      efficiency: this.calculateBasicEfficiency(route, totalVisitTime + totalTravelTime)
    };
  }

  calculateBasicEfficiency(route, totalTime) {
    if (totalTime <= 0 || route.length === 0) return 0;
    return (route.length * 60) / totalTime * 100;
  }

  calculateTimingAwareEfficiency(places, totalTime, timingStats) {
    if (totalTime <= 0 || places.length === 0) return 0;
    
    const baseEfficiency = (places.length * 60) / totalTime;
    
    // Timing bonuses
    const timingBonus = timingStats.averageTimingScore * 20;
    const optimalTimingBonus = (timingStats.placesWithOptimalTiming / places.length) * 15;
    const waitTimePenalty = (timingStats.totalWaitTime / totalTime) * -10;
    
    return Math.max(0, baseEfficiency + timingBonus + optimalTimingBonus + waitTimePenalty);
  }

  getCurrentSeason(month) {
    if (month >= 2 && month <= 5) return 'summer';
    if (month >= 6 && month <= 9) return 'monsoon';
    if (month >= 10 && month <= 1) return 'winter';
    return 'spring';
  }

  calculateUserPreferenceAlignment(placeBestTimes, userPreferredTimes) {
    if (!placeBestTimes || !userPreferredTimes) return 0.5;
    
    const intersection = placeBestTimes.filter(time => userPreferredTimes.includes(time));
    return intersection.length / Math.max(placeBestTimes.length, userPreferredTimes.length, 1);
  }

  getSeasonalSuitability(place, season) {
    const seasonalSuitability = {
      'beach': {
        'summer': 'poor', 'monsoon': 'poor', 'winter': 'excellent', 'spring': 'good'
      },
      'hill-station': {
        'summer': 'excellent', 'monsoon': 'good', 'winter': 'good', 'spring': 'excellent'
      },
      'temple': {
        'summer': 'fair', 'monsoon': 'good', 'winter': 'excellent', 'spring': 'good'
      },
      'museum': {
        'summer': 'good', 'monsoon': 'excellent', 'winter': 'good', 'spring': 'good'
      },
      'nature': {
        'summer': 'fair', 'monsoon': 'good', 'winter': 'excellent', 'spring': 'excellent'
      }
    };

    return seasonalSuitability[place.category]?.[season] || 'good';
  }

  isOptimalTimeForPlace(arrivalTime, bestTimeToVisit) {
    const hour = Math.floor(arrivalTime / 60) % 24;
    
    return bestTimeToVisit.some(timeSlot => {
      switch (timeSlot) {
        case 'morning': return hour >= 6 && hour < 12;
        case 'afternoon': return hour >= 12 && hour < 17;
        case 'evening': return hour >= 17 && hour < 21;
        case 'night': return hour >= 21 || hour < 6;
        default: return true;
      }
    });
  }

  calculateUserPreferenceScore(arrivalTime, userPreferredTimes) {
    const hour = Math.floor(arrivalTime / 60) % 24;
    
    let score = 0;
    userPreferredTimes.forEach(pref => {
      switch (pref) {
        case 'morning': 
          if (hour >= 6 && hour < 12) score += 1;
          break;
        case 'afternoon':
          if (hour >= 12 && hour < 17) score += 1;
          break;
        case 'evening':
          if (hour >= 17 && hour < 21) score += 1;
          break;
        case 'night':
          if (hour >= 21 || hour < 6) score += 1;
          break;
      }
    });
    
    return Math.min(1, score / userPreferredTimes.length);
  }

  isRushHour(arrivalTime) {
    const hour = Math.floor(arrivalTime / 60) % 24;
    return (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
  }

  calculateAdvancedTimingScore(arrivalTime, bestTimeToVisit, userPreferences) {
    let score = 0.5; // Base score
    
    // Optimal time bonus
    if (this.isOptimalTimeForPlace(arrivalTime, bestTimeToVisit)) {
      score += 0.3;
    }
    
    // Rush hour penalty if user wants to avoid
    if (this.isRushHour(arrivalTime) && userPreferences?.avoidRush) {
      score -= 0.15;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  calculateDiversityScore(candidate, selectedPlaces) {
    if (selectedPlaces.length === 0) return 1;
    const candidateCategory = candidate.category;
    const existingCategories = selectedPlaces.map(p => p.category);
    const uniqueCategories = new Set(existingCategories);
    
    if (!uniqueCategories.has(candidateCategory)) return 1.2;
    const categoryCount = existingCategories.filter(cat => cat === candidateCategory).length;
    return Math.max(0.3, 1 - categoryCount * 0.2);
  }

  isNewCategory(candidate, selectedPlaces) {
    const existingCategories = selectedPlaces.map(p => p.category);
    return !existingCategories.includes(candidate.category);
  }

  getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  }

  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = Math.round(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  getPlaceEntryCost(place) {
    return place.entryFee?.indian || place.entryFee?.amount || 0;
  }

  async getTravelData(from, to) {
    try {
      const result = await this.distanceCalculator.calculateDrivingDistance(from, to);
      return { distance: result.distance, travelTime: result.duration };
    } catch (error) {
      const straightDistance = this.calculateStraightLineDistance(from, to);
      return { distance: straightDistance, travelTime: (straightDistance / 40) * 60 };
    }
  }

  async calculateDistance(from, to) {
    try {
      const result = await this.distanceCalculator.calculateDrivingDistance(from, to);
      return result.distance;
    } catch (error) {
      return this.calculateStraightLineDistance(from, to);
    }
  }

  calculateStraightLineDistance(from, to) {
    const R = 6371; // Earth's radius in km
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = OptimizationAlgorithms;
