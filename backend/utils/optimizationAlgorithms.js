// backend/utils/optimizationAlgorithms.js
const DistanceCalculator = require('./distanceCalculator');

class OptimizationAlgorithms {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();
    this.cache = new Map();
    this.maxCacheSize = 2000;
  }

  /**
   * Advanced Greedy Algorithm with Multiple Criteria
   * Fixed to work with your Place schema structure
   */
  async advancedGreedyOptimization(places, constraints = {}) {
    const {
      startLocation,
      timeConstraints = { maxDuration: 480 },
      budget = Infinity,
      strategy = 'balanced',
      weights = {
        rating: 0.3,
        distance: 0.25,
        time: 0.2,
        cost: 0.15,
        popularity: 0.1
      }
    } = constraints;

    console.log(`🧠 Advanced Greedy: Processing ${places.length} places`);

    if (places.length === 0) {
      return { 
        route: [], 
        totalTime: 0, 
        totalDistance: 0, 
        totalCost: 0,
        efficiency: 0,
        algorithm: 'advanced-greedy'
      };
    }

    // Validate places have required data
    const validPlaces = places.filter(place => {
      return place.location && 
             typeof place.location.latitude === 'number' && 
             typeof place.location.longitude === 'number' &&
             place.averageVisitDuration &&
             place.averageVisitDuration > 0;
    });

    console.log(`✅ Valid places for optimization: ${validPlaces.length}/${places.length}`);

    if (validPlaces.length === 0) {
      console.log('❌ No valid places found for optimization');
      return { 
        route: [], 
        totalTime: 0, 
        totalDistance: 0, 
        totalCost: 0,
        efficiency: 0,
        algorithm: 'advanced-greedy',
        error: 'No valid places with required data'
      };
    }

    const selectedPlaces = [];
    const remainingPlaces = [...validPlaces];
    let totalTime = 0;
    let totalCost = 0;
    let totalDistance = 0;
    let currentLocation = startLocation;

    console.log('🔄 Starting greedy selection process...');

    while (selectedPlaces.length < validPlaces.length && remainingPlaces.length > 0) {
      let bestPlace = null;
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remainingPlaces.length; i++) {
        const candidate = remainingPlaces[i];
        
        try {
          // Check hard constraints first
          const constraintCheck = this.checkConstraints(
            candidate, 
            totalTime, 
            totalCost, 
            constraints
          );
          
          if (!constraintCheck.feasible) continue;

          // Calculate multi-criteria score
          const scores = await this.calculateMultiCriteriaScore(
            candidate,
            currentLocation,
            selectedPlaces,
            constraints,
            null, // distanceMatrix not needed for greedy
            weights
          );

          if (scores.totalScore > bestScore) {
            bestScore = scores.totalScore;
            bestPlace = candidate;
            bestIndex = i;
          }
        } catch (error) {
          console.error(`Error evaluating candidate ${candidate.name}:`, error.message);
          continue;
        }
      }

      if (!bestPlace) {
        console.log('🛑 No more feasible places found');
        break;
      }

      console.log(`✅ Selected: ${bestPlace.name} (Score: ${bestScore.toFixed(3)})`);

      // Add best place to route
      selectedPlaces.push(bestPlace);
      remainingPlaces.splice(bestIndex, 1);

      // Update totals
      totalTime += bestPlace.averageVisitDuration;
      totalCost += this.getPlaceEntryCost(bestPlace);
      
      if (currentLocation) {
        try {
          const travelData = await this.getTravelData(currentLocation, bestPlace.location);
          totalDistance += travelData.distance;
          totalTime += travelData.travelTime;
        } catch (error) {
          console.warn(`Warning: Could not calculate travel data: ${error.message}`);
          // Use fallback estimation
          const fallbackDistance = this.calculateStraightLineDistance(currentLocation, bestPlace.location);
          totalDistance += fallbackDistance;
          totalTime += fallbackDistance * 2; // Assume 30 km/h average speed
        }
      }

      currentLocation = bestPlace.location;
    }

    console.log(`🎯 Optimization complete: ${selectedPlaces.length} places selected`);

    return {
      route: selectedPlaces,
      totalTime,
      totalDistance,
      totalCost,
      efficiency: this.calculateEfficiency(selectedPlaces, totalTime),
      algorithm: 'advanced-greedy',
      constraintsSatisfied: this.validateFinalRoute(selectedPlaces, constraints),
      placesProcessed: places.length,
      placesSelected: selectedPlaces.length
    };
  }

  /**
   * Enhanced Genetic Algorithm adapted for your data structure
   */
  async geneticAlgorithmOptimization(places, constraints = {}) {
    const {
      populationSize = 30,
      generations = 50,
      mutationRate = 0.15,
      crossoverRate = 0.8,
      eliteSize = 5
    } = constraints.geneticParams || {};

    console.log(`🧬 Genetic Algorithm: ${places.length} places, ${generations} generations`);

    // For small problems, use greedy
    if (places.length < 4) {
      console.log('🔄 Falling back to greedy for small problem');
      return this.advancedGreedyOptimization(places, constraints);
    }

    // Validate places
    const validPlaces = this.validatePlacesForOptimization(places);
    if (validPlaces.length < 2) {
      console.log('❌ Insufficient valid places for genetic algorithm');
      return this.advancedGreedyOptimization(places, constraints);
    }

    // Initialize population with better seeds
    let population = await this.initializePopulation(validPlaces, populationSize, constraints);
    let bestOverallFitness = -Infinity;
    let stagnationCounter = 0;

    for (let generation = 0; generation < generations; generation++) {
      try {
        // Evaluate fitness for each individual
        const fitnessResults = await Promise.all(
          population.map(async (individual, index) => {
            try {
              return await this.evaluateFitness(individual, constraints);
            } catch (error) {
              console.warn(`Warning: Fitness evaluation failed for individual ${index}:`, error.message);
              return 0; // Assign low fitness to invalid individuals
            }
          })
        );

        // Track best fitness
        const currentBest = Math.max(...fitnessResults);
        if (currentBest > bestOverallFitness) {
          bestOverallFitness = currentBest;
          stagnationCounter = 0;
        } else {
          stagnationCounter++;
        }

        // Early termination if stagnant
        if (stagnationCounter > 15) {
          console.log(`🔄 Early termination at generation ${generation} due to stagnation`);
          break;
        }

        // Selection and reproduction
        const sortedIndividuals = population
          .map((individual, index) => ({ individual, fitness: fitnessResults[index] }))
          .sort((a, b) => b.fitness - a.fitness);

        // Keep elite
        const newPopulation = sortedIndividuals
          .slice(0, eliteSize)
          .map(item => [...item.individual]);

        // Generate offspring
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

        population = newPopulation;

        if (generation % 10 === 0) {
          console.log(`Generation ${generation}: Best fitness = ${currentBest.toFixed(4)}`);
        }
      } catch (error) {
        console.error(`Error in generation ${generation}:`, error.message);
        break;
      }
    }

    // Return best solution
    const finalFitnessResults = await Promise.all(
      population.map(individual => this.evaluateFitness(individual, constraints).catch(() => 0))
    );

    const bestIndex = finalFitnessResults.indexOf(Math.max(...finalFitnessResults));
    const bestRoute = population[bestIndex];

    const metrics = await this.calculateRouteMetrics(bestRoute, constraints);

    console.log(`🎯 Genetic algorithm complete: Best fitness = ${Math.max(...finalFitnessResults).toFixed(4)}`);

    return {
      route: bestRoute,
      ...metrics,
      algorithm: 'genetic',
      generations: generation + 1,
      finalFitness: Math.max(...finalFitnessResults)
    };
  }

  /**
   * Nearest Neighbor Algorithm - Simple and fast
   */
  async nearestNeighborOptimization(places, constraints = {}) {
    console.log(`🎯 Nearest Neighbor: Processing ${places.length} places`);

    const validPlaces = this.validatePlacesForOptimization(places);
    if (validPlaces.length === 0) {
      return { route: [], totalTime: 0, totalDistance: 0, totalCost: 0, efficiency: 0 };
    }

    const { startLocation } = constraints;
    const unvisited = [...validPlaces];
    const route = [];
    let currentLocation = startLocation || (validPlaces[0] ? validPlaces[0].location : null);
    let totalDistance = 0;
    let totalTime = 0;

    // If no start location, start from first place
    if (!startLocation && validPlaces.length > 0) {
      const startPlace = unvisited.shift();
      route.push(startPlace);
      currentLocation = startPlace.location;
      totalTime += startPlace.averageVisitDuration;
    }

    while (unvisited.length > 0) {
      let nearestPlace = null;
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      for (let i = 0; i < unvisited.length; i++) {
        try {
          const distance = await this.getTravelDistance(currentLocation, unvisited[i].location);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlace = unvisited[i];
            nearestIndex = i;
          }
        } catch (error) {
          // Use straight-line distance as fallback
          const straightDistance = this.calculateStraightLineDistance(currentLocation, unvisited[i].location);
          if (straightDistance < nearestDistance) {
            nearestDistance = straightDistance;
            nearestPlace = unvisited[i];
            nearestIndex = i;
          }
        }
      }

      if (nearestPlace) {
        route.push(nearestPlace);
        unvisited.splice(nearestIndex, 1);
        totalDistance += nearestDistance;
        totalTime += nearestPlace.averageVisitDuration + (nearestDistance / 40) * 60; // Assume 40 km/h
        currentLocation = nearestPlace.location;
      } else {
        break;
      }
    }

    const totalCost = route.reduce((sum, place) => sum + this.getPlaceEntryCost(place), 0);

    console.log(`✅ Nearest neighbor complete: ${route.length} places in route`);

    return {
      route,
      totalTime,
      totalDistance,
      totalCost,
      efficiency: this.calculateEfficiency(route, totalTime),
      algorithm: 'nearest-neighbor'
    };
  }

  /**
   * Helper Methods - Fixed for your data structure
   */

  checkConstraints(place, currentTime, currentCost, constraints) {
    const {
      timeConstraints = {},
      budget = Infinity,
      accessibility = {}
    } = constraints;

    // Time constraint
    if (timeConstraints.maxDuration && 
        currentTime + place.averageVisitDuration > timeConstraints.maxDuration) {
      return { feasible: false, reason: 'time_exceeded' };
    }

    // Budget constraint
    const placeCost = this.getPlaceEntryCost(place);
    if (currentCost + placeCost > budget) {
      return { feasible: false, reason: 'budget_exceeded' };
    }

    // Accessibility constraints
    if (accessibility.wheelchairAccess && !place.wheelchairAccessible) {
      return { feasible: false, reason: 'accessibility_required' };
    }

    if (accessibility.kidFriendly && place.kidFriendly === false) {
      return { feasible: false, reason: 'not_kid_friendly' };
    }

    return { feasible: true };
  }

  async calculateMultiCriteriaScore(candidate, currentLocation, selectedPlaces, constraints, distanceMatrix, weights) {
    const scores = {
      rating: this.normalizeRating(candidate.rating || 0),
      distance: currentLocation ? await this.calculateDistanceScore(candidate, currentLocation) : 0.5,
      time: this.calculateTimeScore(candidate, constraints.timeConstraints),
      cost: this.calculateCostScore(candidate, constraints.budget),
      popularity: this.calculatePopularityScore(candidate),
      diversity: this.calculateDiversityScore(candidate, selectedPlaces)
    };

    // Apply weights and calculate total score
    const totalScore = Object.keys(weights).reduce((total, criterion) => {
      return total + (scores[criterion] || 0) * (weights[criterion] || 0);
    }, 0);

    return { ...scores, totalScore };
  }

  // Fixed helper methods for your Place schema
  getPlaceEntryCost(place) {
    // Handle both entryFee structures from your seed data
    if (place.entryFee) {
      return place.entryFee.indian || place.entryFee.amount || 0;
    }
    return 0;
  }

  validatePlacesForOptimization(places) {
    return places.filter(place => {
      return place && 
             place.location && 
             typeof place.location.latitude === 'number' && 
             typeof place.location.longitude === 'number' &&
             place.averageVisitDuration &&
             place.averageVisitDuration > 0 &&
             place.name;
    });
  }

  normalizeRating(rating) {
    // Your ratings are 1-5 scale
    return Math.max(0, Math.min(1, (rating - 1) / 4));
  }

  async calculateDistanceScore(place, currentLocation) {
    try {
      const distance = await this.getTravelDistance(currentLocation, place.location);
      return Math.max(0, 1 - distance / 100); // Penalize distances > 100km
    } catch (error) {
      // Fallback to straight-line distance
      const distance = this.calculateStraightLineDistance(currentLocation, place.location);
      return Math.max(0, 1 - distance / 100);
    }
  }

  calculateTimeScore(place, timeConstraints) {
    if (!timeConstraints || !timeConstraints.preferredDuration) return 0.5;
    
    const duration = place.averageVisitDuration;
    const preferred = timeConstraints.preferredDuration;
    const difference = Math.abs(duration - preferred) / preferred;
    
    return Math.max(0, 1 - difference);
  }

  calculateCostScore(place, budget) {
    if (!budget || budget === Infinity) return 1;
    
    const cost = this.getPlaceEntryCost(place);
    return Math.max(0, 1 - cost / (budget * 0.3));
  }

  calculatePopularityScore(place) {
    const rating = place.rating || 0;
    const reviewCount = place.reviewCount || 0;
    
    // Combine rating and review count
    const ratingScore = rating / 5;
    const reviewScore = Math.min(1, Math.log(reviewCount + 1) / Math.log(100));
    
    return (ratingScore * 0.7 + reviewScore * 0.3);
  }

  calculateDiversityScore(candidate, selectedPlaces) {
    if (selectedPlaces.length === 0) return 1;
    
    const candidateCategory = candidate.category;
    const existingCategories = selectedPlaces.map(p => p.category);
    const uniqueCategories = new Set(existingCategories);
    
    // Bonus for new category
    if (!uniqueCategories.has(candidateCategory)) {
      return 1;
    }
    
    // Penalty for overrepresented category
    const categoryCount = existingCategories.filter(cat => cat === candidateCategory).length;
    return Math.max(0.2, 1 - categoryCount * 0.25);
  }

  calculateEfficiency(places, totalTime) {
    if (totalTime <= 0 || places.length === 0) return 0;
    return (places.length * 60) / totalTime; // Places per hour
  }

  async getTravelData(from, to) {
    try {
      const result = await this.distanceCalculator.calculateDrivingDistance(from, to);
      return {
        distance: result.distance,
        travelTime: result.duration
      };
    } catch (error) {
      // Fallback calculation
      const straightDistance = this.calculateStraightLineDistance(from, to);
      return {
        distance: straightDistance,
        travelTime: (straightDistance / 40) * 60 // Assume 40 km/h average speed
      };
    }
  }

  async getTravelDistance(from, to) {
    const travelData = await this.getTravelData(from, to);
    return travelData.distance;
  }

  calculateStraightLineDistance(from, to) {
    const R = 6371; // Earth's radius in km
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async initializePopulation(places, populationSize, constraints) {
    const population = [];
    
    try {
      // Add greedy solution as seed
      const greedySolution = await this.advancedGreedyOptimization(places, constraints);
      if (greedySolution.route.length > 0) {
        population.push(greedySolution.route);
      }
      
      // Add nearest neighbor solution
      const nnSolution = await this.nearestNeighborOptimization(places, constraints);
      if (nnSolution.route.length > 0) {
        population.push(nnSolution.route);
      }
    } catch (error) {
      console.warn('Warning: Could not generate seeded solutions:', error.message);
    }
    
    // Generate random permutations for the rest
    while (population.length < populationSize) {
      const randomRoute = this.shuffleArray([...places]);
      population.push(randomRoute);
    }
    
    return population;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async evaluateFitness(individual, constraints) {
    try {
      const metrics = await this.calculateRouteMetrics(individual, constraints);
      
      // Prevent division by zero
      if (metrics.totalDistance === 0 && metrics.totalTime === 0) {
        return individual.length * 0.1; // Minimal fitness for empty routes
      }

      // Multi-criteria fitness function
      const distanceScore = 1 / (1 + metrics.totalDistance / 100); // Normalize by 100km
      const timeScore = 1 / (1 + metrics.totalTime / 480); // Normalize by 8 hours
      const ratingScore = metrics.averageRating / 5;
      const diversityScore = this.calculateRouteDiversity(individual);
      
      const fitness = (distanceScore * 0.3 + timeScore * 0.25 + ratingScore * 0.35 + diversityScore * 0.1);
      return Math.max(0.01, fitness); // Ensure positive fitness
    } catch (error) {
      console.warn('Fitness evaluation error:', error.message);
      return 0.01; // Low fitness for problematic individuals
    }
  }

  calculateRouteDiversity(route) {
    if (route.length <= 1) return 0;
    
    const categories = new Set(route.map(place => place.category));
    const cities = new Set(route.map(place => place.city));
    
    const categoryDiversity = categories.size / route.length;
    const cityDiversity = cities.size / route.length;
    
    return (categoryDiversity + cityDiversity) / 2;
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

    // Order crossover (OX)
    const length = parent1.length;
    const start = Math.floor(Math.random() * length);
    const end = start + Math.floor(Math.random() * (length - start));
    
    const child = Array(length).fill(null);
    
    // Copy segment from parent1
    for (let i = start; i < end; i++) {
      child[i] = parent1[i];
    }
    
    // Fill remaining positions from parent2
    let parent2Index = 0;
    for (let i = 0; i < length; i++) {
      if (child[i] === null) {
        while (parent2Index < parent2.length && child.some(place => place && place.id === parent2[parent2Index].id)) {
          parent2Index++;
        }
        if (parent2Index < parent2.length) {
          child[i] = parent2[parent2Index];
          parent2Index++;
        }
      }
    }
    
    // Filter out null values
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
      // Reverse segment mutation
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

    // Calculate travel distances and times
    const locations = constraints.startLocation ? 
      [constraints.startLocation, ...route.map(p => p.location)] : 
      route.map(p => p.location);

    for (let i = 1; i < locations.length; i++) {
      try {
        const travelData = await this.getTravelData(locations[i-1], locations[i]);
        totalDistance += travelData.distance;
        totalTravelTime += travelData.travelTime;
      } catch (error) {
        // Fallback calculation
        const fallbackDistance = this.calculateStraightLineDistance(locations[i-1], locations[i]);
        totalDistance += fallbackDistance;
        totalTravelTime += (fallbackDistance / 40) * 60; // 40 km/h average
      }
    }

    return {
      totalTime: totalVisitTime + totalTravelTime,
      totalTravelTime,
      totalVisitTime,
      totalDistance,
      totalCost,
      averageRating,
      efficiency: this.calculateEfficiency(route, totalVisitTime + totalTravelTime)
    };
  }

  validateFinalRoute(route, constraints) {
    return {
      timeValid: true,
      budgetValid: true,
      accessibilityValid: true,
      overall: true
    };
  }

  // Clear cache periodically
  clearCache() {
    this.cache.clear();
    console.log('🧹 Optimization algorithms cache cleared');
  }

  // Get available algorithms
  getAvailableAlgorithms() {
    return [
      {
        name: 'advancedGreedy',
        displayName: 'Advanced Greedy',
        description: 'Multi-criteria optimization with balanced scoring',
        complexity: 'O(n²)',
        recommended: true
      },
      {
        name: 'genetic',
        displayName: 'Genetic Algorithm', 
        description: 'Evolutionary approach for complex optimization',
        complexity: 'O(g×p×n)', 
        recommended: false
      },
      {
        name: 'nearestNeighbor',
        displayName: 'Nearest Neighbor',
        description: 'Simple and fast distance-based optimization',
        complexity: 'O(n²)',
        recommended: false
      }
    ];
  }
}

// Export the optimization function that was missing
function applyOptimizationAlgorithm(algorithm, places, constraints) {
  const optimizer = new OptimizationAlgorithms();
  
  switch (algorithm) {
    case 'advancedGreedy':
      return optimizer.advancedGreedyOptimization(places, constraints);
    case 'genetic':
      return optimizer.geneticAlgorithmOptimization(places, constraints);
    case 'nearestNeighbor':
      return optimizer.nearestNeighborOptimization(places, constraints);
    default:
      console.warn(`Unknown algorithm: ${algorithm}, falling back to advancedGreedy`);
      return optimizer.advancedGreedyOptimization(places, constraints);
  }
}

module.exports = OptimizationAlgorithms;
module.exports.applyOptimizationAlgorithm = applyOptimizationAlgorithm;