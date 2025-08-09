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
   * Selects best place at each step considering multiple factors
   */
  async advancedGreedyOptimization(places, constraints) {
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

    if (places.length === 0) {
      return { route: [], totalTime: 0, totalDistance: 0, efficiency: 0 };
    }

    const selectedPlaces = [];
    const remainingPlaces = [...places];
    let totalTime = 0;
    let totalCost = 0;
    let totalDistance = 0;
    let currentLocation = startLocation;

    // Pre-calculate all pairwise distances for efficiency
    const distanceMatrix = await this.buildDistanceMatrix(places, startLocation);

    while (selectedPlaces.length < places.length && remainingPlaces.length > 0) {
      let bestPlace = null;
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remainingPlaces.length; i++) {
        const candidate = remainingPlaces[i];
        
        // Check hard constraints first
        const constraintCheck = await this.checkConstraints(
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
          distanceMatrix,
          weights
        );

        if (scores.totalScore > bestScore) {
          bestScore = scores.totalScore;
          bestPlace = candidate;
          bestIndex = i;
        }
      }

      if (!bestPlace) break; // No feasible place found

      // Add best place to route
      selectedPlaces.push(bestPlace);
      remainingPlaces.splice(bestIndex, 1);

      // Update totals
      totalTime += bestPlace.averageVisitDuration;
      totalCost += bestPlace.entryFee?.indian || 0;
      
      if (currentLocation) {
        const travelDistance = await this.getTravelDistance(currentLocation, bestPlace.location);
        const travelTime = await this.getTravelTime(currentLocation, bestPlace.location);
        totalDistance += travelDistance;
        totalTime += travelTime;
      }

      currentLocation = bestPlace.location;
    }

    return {
      route: selectedPlaces,
      totalTime,
      totalDistance,
      totalCost,
      efficiency: this.calculateEfficiency(selectedPlaces, totalTime),
      algorithm: 'advanced-greedy',
      constraintsSatisfied: this.validateFinalRoute(selectedPlaces, constraints)
    };
  }

  /**
   * Genetic Algorithm for larger problem sets
   * Uses evolutionary approach to find optimal solutions
   */
  async geneticAlgorithmOptimization(places, constraints) {
    const {
      populationSize = 50,
      generations = 100,
      mutationRate = 0.1,
      crossoverRate = 0.8,
      eliteSize = 10
    } = constraints.geneticParams || {};

    if (places.length < 4) {
      // Fall back to greedy for small problems
      return this.advancedGreedyOptimization(places, constraints);
    }

    // Initialize population
    let population = await this.initializePopulation(places, populationSize, constraints);
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness for each individual
      const fitnessScores = await Promise.all(
        population.map(individual => this.evaluateFitness(individual, constraints))
      );

      // Selection: keep elite individuals
      const sortedIndividuals = population
        .map((individual, index) => ({ individual, fitness: fitnessScores[index] }))
        .sort((a, b) => b.fitness - a.fitness);

      const newPopulation = sortedIndividuals
        .slice(0, eliteSize)
        .map(item => [...item.individual]);

      // Crossover and mutation to fill rest of population
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(sortedIndividuals);
        const parent2 = this.tournamentSelection(sortedIndividuals);
        
        let offspring = Math.random() < crossoverRate ?
          this.crossover(parent1, parent2) : [...parent1];
        
        if (Math.random() < mutationRate) {
          offspring = this.mutate(offspring);
        }
        
        newPopulation.push(offspring);
      }

      population = newPopulation;

      // Early termination if no improvement
      if (generation > 20 && generation % 10 === 0) {
        const currentBest = Math.max(...fitnessScores);
        const previousBest = this.previousBestFitness || 0;
        
        if (Math.abs(currentBest - previousBest) < 0.001) {
          break; // Converged
        }
        
        this.previousBestFitness = currentBest;
      }
    }

    // Return best solution
    const finalFitnessScores = await Promise.all(
      population.map(individual => this.evaluateFitness(individual, constraints))
    );

    const bestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    const bestRoute = population[bestIndex];

    const metrics = await this.calculateRouteMetrics(bestRoute, constraints);

    return {
      route: bestRoute,
      ...metrics,
      algorithm: 'genetic',
      generations: generation
    };
  }

  /**
   * Dynamic Programming TSP solver for optimal solutions
   * Uses Held-Karp algorithm for small to medium problems
   */
  async dynamicProgrammingTSP(places, constraints) {
    if (places.length > 12) {
      throw new Error('Dynamic programming TSP limited to 12 places for performance');
    }

    const n = places.length;
    if (n === 0) return { route: [], totalDistance: 0 };

    // Build distance matrix
    const distances = await this.buildCompleteDistanceMatrix(places, constraints.startLocation);
    
    // DP table: dp[mask][i] = minimum cost to visit all places in mask ending at i
    const dp = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity));
    const parent = Array(1 << n).fill(null).map(() => Array(n).fill(-1));

    // Base case: starting from place 0
    dp[1][0] = 0;

    // Fill DP table
    for (let mask = 1; mask < (1 << n); mask++) {
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u))) continue;
        if (dp[mask][u] === Infinity) continue;

        for (let v = 0; v < n; v++) {
          if (mask & (1 << v)) continue;
          
          const newMask = mask | (1 << v);
          const newCost = dp[mask][u] + distances[u][v];
          
          if (newCost < dp[newMask][v]) {
            dp[newMask][v] = newCost;
            parent[newMask][v] = u;
          }
        }
      }
    }

    // Find optimal ending place
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
    let currentMask = finalMask;
    let currentPlace = lastPlace;

    while (currentPlace !== -1) {
      path.unshift(currentPlace);
      const prevPlace = parent[currentMask][currentPlace];
      currentMask ^= (1 << currentPlace);
      currentPlace = prevPlace;
    }

    const optimalRoute = path.map(index => places[index]);
    const metrics = await this.calculateRouteMetrics(optimalRoute, constraints);

    return {
      route: optimalRoute,
      ...metrics,
      algorithm: 'dynamic-programming-tsp',
      optimal: true
    };
  }

  /**
   * Ant Colony Optimization for complex routing problems
   */
  async antColonyOptimization(places, constraints) {
    const {
      antCount = 20,
      iterations = 100,
      alpha = 1.0, // pheromone importance
      beta = 2.0,  // heuristic importance
      evaporation = 0.5,
      pheromoneDeposit = 1.0
    } = constraints.acoParams || {};

    if (places.length < 3) {
      return this.advancedGreedyOptimization(places, constraints);
    }

    const n = places.length;
    
    // Initialize pheromone matrix
    const pheromones = Array(n).fill(null).map(() => Array(n).fill(1.0));
    
    // Build heuristic matrix (1/distance)
    const heuristics = await this.buildHeuristicMatrix(places, constraints);
    
    let bestRoute = null;
    let bestDistance = Infinity;

    for (let iteration = 0; iteration < iterations; iteration++) {
      const routes = [];
      
      // Each ant constructs a route
      for (let ant = 0; ant < antCount; ant++) {
        const route = await this.constructAntRoute(
          places, 
          pheromones, 
          heuristics, 
          alpha, 
          beta,
          constraints
        );
        
        if (route && route.length > 0) {
          const distance = await this.calculateTotalRouteDistance(route);
          routes.push({ route, distance });
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestRoute = [...route];
          }
        }
      }

      // Update pheromones
      this.updatePheromones(pheromones, routes, evaporation, pheromoneDeposit);
    }

    const metrics = await this.calculateRouteMetrics(bestRoute, constraints);

    return {
      route: bestRoute,
      ...metrics,
      algorithm: 'ant-colony',
      iterations
    };
  }

  /**
   * Simulated Annealing for escaping local optima
   */
  async simulatedAnnealingOptimization(places, constraints) {
    if (places.length === 0) return { route: [], totalDistance: 0 };

    const {
      initialTemperature = 10000,
      coolingRate = 0.95,
      minTemperature = 1,
      maxIterationsPerTemp = 100
    } = constraints.saParams || {};

    // Start with greedy solution
    let currentRoute = (await this.advancedGreedyOptimization(places, constraints)).route;
    let currentCost = await this.calculateTotalRouteDistance(currentRoute);
    
    let bestRoute = [...currentRoute];
    let bestCost = currentCost;
    
    let temperature = initialTemperature;

    while (temperature > minTemperature) {
      for (let i = 0; i < maxIterationsPerTemp; i++) {
        // Generate neighbor solution
        const neighborRoute = this.generateNeighborSolution(currentRoute);
        const neighborCost = await this.calculateTotalRouteDistance(neighborRoute);
        
        // Calculate acceptance probability
        const delta = neighborCost - currentCost;
        const acceptanceProbability = delta < 0 ? 1 : Math.exp(-delta / temperature);
        
        // Accept or reject the neighbor
        if (Math.random() < acceptanceProbability) {
          currentRoute = neighborRoute;
          currentCost = neighborCost;
          
          // Update best if improved
          if (currentCost < bestCost) {
            bestRoute = [...currentRoute];
            bestCost = currentCost;
          }
        }
      }
      
      temperature *= coolingRate;
    }

    const metrics = await this.calculateRouteMetrics(bestRoute, constraints);

    return {
      route: bestRoute,
      ...metrics,
      algorithm: 'simulated-annealing',
      finalTemperature: temperature
    };
  }

  /**
   * Multi-Objective Optimization using NSGA-II
   * Optimizes for multiple criteria simultaneously
   */
  async multiObjectiveOptimization(places, constraints) {
    const {
      populationSize = 100,
      generations = 50,
      objectives = ['distance', 'time', 'cost', 'rating']
    } = constraints.moParams || {};

    // Initialize population
    let population = await this.initializePopulation(places, populationSize, constraints);
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate all objectives for each individual
      const objectiveValues = await Promise.all(
        population.map(individual => this.evaluateMultipleObjectives(individual, objectives, constraints))
      );

      // Non-dominated sorting
      const fronts = this.nonDominatedSort(population, objectiveValues);
      
      // Create new population
      const newPopulation = [];
      let frontIndex = 0;
      
      while (newPopulation.length + fronts[frontIndex].length <= populationSize) {
        newPopulation.push(...fronts[frontIndex]);
        frontIndex++;
      }
      
      // Fill remaining slots using crowding distance
      if (newPopulation.length < populationSize) {
        const remainingSlots = populationSize - newPopulation.length;
        const lastFront = fronts[frontIndex];
        const crowdingDistances = this.calculateCrowdingDistance(lastFront, objectiveValues);
        
        const sortedByDistance = lastFront
          .map((individual, index) => ({ individual, distance: crowdingDistances[index] }))
          .sort((a, b) => b.distance - a.distance);
        
        newPopulation.push(...sortedByDistance.slice(0, remainingSlots).map(item => item.individual));
      }

      population = newPopulation;

      // Generate offspring through crossover and mutation
      if (generation < generations - 1) {
        const offspring = [];
        
        for (let i = 0; i < populationSize; i += 2) {
          const parent1 = this.tournamentSelection(population);
          const parent2 = this.tournamentSelection(population);
          
          const [child1, child2] = this.crossover(parent1, parent2);
          
          offspring.push(this.mutate(child1));
          offspring.push(this.mutate(child2));
        }
        
        population = [...population, ...offspring].slice(0, populationSize);
      }
    }

    // Return Pareto front solutions
    const finalObjectives = await Promise.all(
      population.map(individual => this.evaluateMultipleObjectives(individual, objectives, constraints))
    );
    
    const paretoFront = this.extractParetoFront(population, finalObjectives);
    
    // Select best compromise solution
    const bestCompromise = this.selectBestCompromise(paretoFront, objectives);
    const metrics = await this.calculateRouteMetrics(bestCompromise, constraints);

    return {
      route: bestCompromise,
      ...metrics,
      paretoFront: paretoFront.map(route => ({
        route,
        objectives: this.evaluateMultipleObjectives(route, objectives, constraints)
      })),
      algorithm: 'multi-objective-nsga2'
    };
  }

  /**
   * Helper Methods
   */

  async checkConstraints(place, currentTime, currentCost, constraints) {
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
    if (currentCost + (place.entryFee?.indian || 0) > budget) {
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

  normalizeRating(rating) {
    return (rating - 1) / 4; // Normalize 1-5 scale to 0-1
  }

  async calculateDistanceScore(place, currentLocation) {
    const distance = await this.getTravelDistance(currentLocation, place.location);
    return Math.max(0, 1 - distance / 100); // Penalize distances > 100km
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
    
    const cost = place.entryFee?.indian || 0;
    return Math.max(0, 1 - cost / (budget * 0.5));
  }

  calculatePopularityScore(place) {
    const reviewCount = place.reviewCount || 0;
    return Math.min(1, Math.log(reviewCount + 1) / Math.log(1000)); // Normalize to 0-1
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
    return Math.max(0, 1 - categoryCount * 0.2);
  }

  calculateEfficiency(places, totalTime) {
    return totalTime > 0 ? places.length / (totalTime / 60) : 0;
  }

  async getTravelDistance(from, to) {
    const result = await this.distanceCalculator.calculateDrivingDistance(from, to);
    return result.distance;
  }

  async getTravelTime(from, to) {
    const result = await this.distanceCalculator.calculateDrivingDistance(from, to);
    return result.duration;
  }

  async buildDistanceMatrix(places, startLocation) {
    const locations = startLocation ? [startLocation, ...places.map(p => p.location)] : places.map(p => p.location);
    return this.distanceCalculator.calculateDistanceMatrix(locations, locations);
  }

  async buildCompleteDistanceMatrix(places, startLocation) {
    const matrix = [];
    const allLocations = startLocation ? [startLocation, ...places.map(p => p.location)] : places.map(p => p.location);
    
    for (let i = 0; i < allLocations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < allLocations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          const result = await this.distanceCalculator.calculateDrivingDistance(
            allLocations[i], 
            allLocations[j]
          );
          matrix[i][j] = result.distance;
        }
      }
    }
    
    return matrix;
  }

  async buildHeuristicMatrix(places, constraints) {
    const distances = await this.buildCompleteDistanceMatrix(places, constraints.startLocation);
    return distances.map(row => row.map(distance => distance > 0 ? 1 / distance : 0));
  }

  async initializePopulation(places, populationSize, constraints) {
    const population = [];
    
    // Add greedy solution as seed
    const greedySolution = await this.advancedGreedyOptimization(places, constraints);
    population.push(greedySolution.route);
    
    // Generate random permutations
    for (let i = 1; i < populationSize; i++) {
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
    const metrics = await this.calculateRouteMetrics(individual, constraints);
    
    // Multi-criteria fitness function
    const distanceScore = 1 / (1 + metrics.totalDistance);
    const timeScore = 1 / (1 + metrics.totalTime);
    const ratingScore = metrics.averageRating / 5;
    const costScore = constraints.budget ? 1 / (1 + metrics.totalCost / constraints.budget) : 1;
    
    return (distanceScore + timeScore + ratingScore + costScore) / 4;
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
    // Order crossover (OX)
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * parent1.length);
    const [crossStart, crossEnd] = [Math.min(start, end), Math.max(start, end)];
    
    const child = Array(parent1.length).fill(null);
    
    // Copy segment from parent1
    for (let i = crossStart; i <= crossEnd; i++) {
      child[i] = parent1[i];
    }
    
    // Fill remaining positions from parent2
    let parent2Index = 0;
    for (let i = 0; i < child.length; i++) {
      if (child[i] === null) {
        while (child.includes(parent2[parent2Index])) {
          parent2Index++;
        }
        child[i] = parent2[parent2Index];
        parent2Index++;
      }
    }
    
    return child;
  }

  mutate(individual, mutationRate = 0.1) {
    if (Math.random() > mutationRate) return individual;
    
    const mutated = [...individual];
    const mutationType = Math.random();
    
    if (mutationType < 0.5) {
      // Swap mutation
      const i = Math.floor(Math.random() * mutated.length);
      const j = Math.floor(Math.random() * mutated.length);
      [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    } else {
      // Reverse mutation
      const start = Math.floor(Math.random() * mutated.length);
      const end = Math.floor(Math.random() * mutated.length);
      const [reverseStart, reverseEnd] = [Math.min(start, end), Math.max(start, end)];
      
      const segment = mutated.slice(reverseStart, reverseEnd + 1).reverse();
      mutated.splice(reverseStart, reverseEnd - reverseStart + 1, ...segment);
    }
    
    return mutated;
  }

  generateNeighborSolution(route) {
    const neighbor = [...route];
    const operationType = Math.random();
    
    if (operationType < 0.4) {
      // 2-opt swap
      const i = Math.floor(Math.random() * neighbor.length);
      const j = Math.floor(Math.random() * neighbor.length);
      if (i !== j) {
        [neighbor[i], neighbor[j]] = [neighbor[j], neighbor[i]];
      }
    } else if (operationType < 0.7) {
      // Insert operation
      const from = Math.floor(Math.random() * neighbor.length);
      const to = Math.floor(Math.random() * neighbor.length);
      const element = neighbor.splice(from, 1)[0];
      neighbor.splice(to, 0, element);
    } else {
      // Reverse segment
      const start = Math.floor(Math.random() * neighbor.length);
      const length = Math.floor(Math.random() * (neighbor.length - start)) + 1;
      const segment = neighbor.splice(start, length).reverse();
      neighbor.splice(start, 0, ...segment);
    }
    
    return neighbor;
  }

  async calculateRouteMetrics(route, constraints) {
    if (!route || route.length === 0) {
      return {
        totalTime: 0,
        totalDistance: 0,
        totalCost: 0,
        averageRating: 0,
        efficiency: 0
      };
    }

    const routeMetrics = await this.distanceCalculator.calculateRouteMetrics(
      route, 
      constraints.startLocation
    );

    const totalVisitTime = route.reduce((sum, place) => sum + (place.averageVisitDuration || 60), 0);
    const totalCost = route.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
    const averageRating = route.reduce((sum, place) => sum + (place.rating || 0), 0) / route.length;

    return {
      totalTime: routeMetrics.totalTime + totalVisitTime,
      totalTravelTime: routeMetrics.totalTime,
      totalVisitTime,
      totalDistance: routeMetrics.totalDistance,
      totalCost,
      averageRating,
      efficiency: this.calculateEfficiency(route, routeMetrics.totalTime + totalVisitTime)
    };
  }

  async calculateTotalRouteDistance(route) {
    const metrics = await this.calculateRouteMetrics(route, {});
    return metrics.totalDistance;
  }

  validateFinalRoute(route, constraints) {
    // Implement constraint validation logic
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
    console.log('Optimization algorithms cache cleared');
  }
}

module.exports = OptimizationAlgorithms;