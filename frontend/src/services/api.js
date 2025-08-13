// frontend/src/services/api.js - ENHANCED FOR PURE ALGORITHM OPTIMIZATION

class APIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    this.timeout = 45000; // Increased timeout for complex optimizations
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: this.timeout,
    };

    const config = { ...defaultOptions, ...options };

    try {
      console.log(`🌐 API Request: ${config.method} ${url}`);
      if (config.body) {
        console.log('📤 Request Body:', JSON.parse(config.body));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`📥 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Response Data:', data);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - optimization is taking too long. Try with fewer places.');
      }
      console.error(`❌ API Error for ${url}:`, error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      return await this.makeRequest('/api/health');
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'ERROR', message: error.message };
    }
  }

  async getAllPlaces() {
    try {
      return await this.makeRequest('/api/places');
    } catch (error) {
      console.error('Failed to fetch places:', error);
      throw error;
    }
  }

  /**
   * MAIN OPTIMIZATION METHOD - Uses ONLY backend algorithms
   * This method ensures NO frontend fallbacks are used
   */
  async optimizeRouteWithAlgorithm(optimizationData) {
    try {
      console.log('🎯 ALGORITHM-BASED OPTIMIZATION STARTING...');
      console.log('📋 Optimization request:', optimizationData);

      // Validate input data thoroughly
      if (!optimizationData.places || !Array.isArray(optimizationData.places)) {
        throw new Error('Invalid places data provided');
      }

      if (optimizationData.places.length < 2) {
        throw new Error('At least 2 places are required for algorithmic optimization');
      }

      if (optimizationData.places.length > 20) {
        throw new Error('Maximum 20 places allowed for optimization algorithms');
      }

      // Ensure all places have required fields for algorithms
      const invalidPlaces = optimizationData.places.filter(place => 
        !place.id || 
        !place.name || 
        !place.location ||
        typeof place.location.latitude !== 'number' ||
        typeof place.location.longitude !== 'number' ||
        isNaN(place.location.latitude) ||
        isNaN(place.location.longitude) ||
        !place.averageVisitDuration
      );

      if (invalidPlaces.length > 0) {
        console.error('Invalid places found:', invalidPlaces);
        throw new Error(`${invalidPlaces.length} places have missing required data for optimization`);
      }

      // Prepare data specifically for algorithm processing
      const algorithmPayload = {
        // Core places data - cleaned and standardized
        places: optimizationData.places.map(place => ({
          id: place.id,
          name: place.name,
          category: place.category || 'attraction',
          description: place.description || '',
          location: {
            latitude: parseFloat(place.location.latitude),
            longitude: parseFloat(place.location.longitude)
          },
          averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
          rating: parseFloat(place.rating) || 3.5,
          city: place.city || 'Unknown',
          state: place.state || 'Unknown',
          entryFee: place.entryFee || { indian: 0, foreign: 0 },
          kidFriendly: place.kidFriendly !== false,
          wheelchairAccessible: place.wheelchairAccessible === true,
          openingHours: place.openingHours || null,
          priority: place.priority || 0
        })),

        // Algorithm selection and configuration
        preferences: {
          // Select optimization algorithm based on problem size and user preference
          algorithm: this.selectOptimizationAlgorithm(
            optimizationData.places.length, 
            optimizationData.preferences?.optimizationLevel || 'balanced'
          ),
          
          // Multi-criteria optimization weights
          weights: {
            rating: optimizationData.preferences?.ratingWeight || 0.3,
            distance: optimizationData.preferences?.distanceWeight || 0.25,
            time: optimizationData.preferences?.timeWeight || 0.2,
            cost: optimizationData.preferences?.costWeight || 0.15,
            accessibility: optimizationData.preferences?.accessibilityWeight || 0.1
          },

          // Optimization strategy
          optimizeFor: optimizationData.preferences?.optimizeFor || 'balanced', // 'time', 'distance', 'rating', 'cost', 'balanced'
          allowPartialRoute: optimizationData.preferences?.allowPartialRoute !== false,
          prioritizeHighRated: optimizationData.preferences?.prioritizeHighRated === true,
          minimizeTravel: optimizationData.preferences?.minimizeTravel === true,
          maximizeDiversity: optimizationData.preferences?.maximizeDiversity === true
        },

        // Enhanced constraints for algorithms
        constraints: {
          // Time constraints
          startTime: optimizationData.constraints?.startTime || '09:00',
          endTime: optimizationData.constraints?.endTime || '18:00',
          totalTimeAvailable: parseInt(optimizationData.constraints?.totalTimeAvailable) || 480,
          startDay: optimizationData.constraints?.startDay || new Date().getDay(),
          
          // Location constraints
          startLocation: optimizationData.constraints?.startLocation || null,
          endLocation: optimizationData.constraints?.endLocation || null,
          maxDistancePerLeg: optimizationData.constraints?.maxDistancePerLeg || 150,
          maxTotalDistance: optimizationData.constraints?.maxTotalDistance || 500,
          
          // Budget and accessibility
          budget: optimizationData.constraints?.budget || null,
          accessibility: {
            wheelchairAccess: optimizationData.constraints?.accessibility?.wheelchairAccess === true,
            kidFriendly: optimizationData.constraints?.accessibility?.kidFriendly === true,
            elderlyFriendly: optimizationData.constraints?.accessibility?.elderlyFriendly === true
          },

          // Advanced constraints
          weatherConditions: optimizationData.constraints?.weatherConditions || 'normal',
          trafficConditions: optimizationData.constraints?.trafficConditions || 'normal',
          seasonalFactors: optimizationData.constraints?.seasonalFactors === true
        },

        // Algorithm-specific parameters
        algorithmParams: this.getAlgorithmParameters(
          optimizationData.places.length,
          optimizationData.preferences?.optimizationLevel || 'balanced'
        )
      };

      console.log('🧮 Algorithm payload prepared:', {
        placesCount: algorithmPayload.places.length,
        algorithm: algorithmPayload.preferences.algorithm,
        constraints: Object.keys(algorithmPayload.constraints),
        weights: algorithmPayload.preferences.weights
      });

      // Call the BACKEND OPTIMIZATION ENDPOINT - No frontend fallbacks
      const result = await this.makeRequest('/api/trips/generate', {
        method: 'POST',
        body: JSON.stringify(algorithmPayload),
      });

      console.log('✅ Backend algorithm result:', result);

      // Validate the algorithmic response
      if (!result || !result.success) {
        throw new Error(result?.message || 'Algorithm optimization failed');
      }

      if (!result.data || !result.data.optimizedRoute || !Array.isArray(result.data.optimizedRoute)) {
        throw new Error('Invalid algorithmic route data in response');
      }

      if (result.data.optimizedRoute.length === 0) {
        throw new Error('Algorithm could not find a feasible route with given constraints');
      }

      // Return the pure algorithmic result - NO modifications
      return {
        success: true,
        algorithm: result.data.algorithm || algorithmPayload.preferences.algorithm,
        route: result.data.optimizedRoute,
        itinerary: result.data.itinerary || [],
        metrics: result.data.metrics || {},
        optimizationDetails: {
          totalDistance: result.data.metrics?.totalDistance || 0,
          totalTime: result.data.metrics?.totalTime || 0,
          totalTravelTime: result.data.metrics?.totalTravelTime || 0,
          efficiency: result.data.metrics?.efficiency || 0,
          algorithmUsed: result.data.algorithm,
          constraintsSatisfied: result.data.metrics?.constraintsSatisfied || {},
          placesVisited: result.data.optimizedRoute.length,
          placesSkipped: optimizationData.places.length - result.data.optimizedRoute.length
        },
        alternatives: result.data.alternatives || [],
        recommendations: result.data.recommendations || [],
        warnings: result.data.warnings || []
      };

    } catch (error) {
      console.error('❌ Algorithm-based route optimization failed:', error);

      // Enhanced error handling with algorithm-specific messages
      if (error.message.includes('timeout')) {
        throw new Error('Algorithm optimization timeout. Try with fewer places or simpler constraints.');
      } else if (error.message.includes('no feasible route')) {
        throw new Error('Algorithm could not find a feasible route. Try relaxing time constraints or increasing budget.');
      } else if (error.message.includes('invalid coordinates')) {
        throw new Error('Some places have invalid location data preventing algorithmic optimization.');
      } else if (error.message.includes('insufficient data')) {
        throw new Error('Places lack required data for algorithmic processing.');
      }

      throw error;
    }
  }

  /**
   * Select optimal algorithm based on problem complexity and user preferences
   */
  selectOptimizationAlgorithm(placeCount, optimizationLevel) {
    console.log(`🔍 Selecting algorithm for ${placeCount} places, level: ${optimizationLevel}`);
    
    // Algorithm selection logic based on computational complexity
    if (placeCount <= 3) {
      return 'advanced-greedy'; // Fast for small problems
    } else if (placeCount <= 6 && optimizationLevel === 'optimal') {
      return 'dynamic-programming'; // Exact solution for small problems
    } else if (placeCount <= 8 && optimizationLevel === 'optimal') {
      return 'genetic'; // Near-optimal for medium problems
    } else if (placeCount <= 12) {
      if (optimizationLevel === 'fast') return 'advanced-greedy';
      if (optimizationLevel === 'balanced') return 'genetic';
      if (optimizationLevel === 'optimal') return 'simulated-annealing';
    } else if (placeCount <= 16) {
      if (optimizationLevel === 'fast') return 'advanced-greedy';
      if (optimizationLevel === 'balanced') return 'ant-colony';
      if (optimizationLevel === 'optimal') return 'genetic';
    } else {
      // Large problems (16+ places)
      if (optimizationLevel === 'fast') return 'advanced-greedy';
      if (optimizationLevel === 'balanced') return 'ant-colony';
      if (optimizationLevel === 'optimal') return 'multi-objective';
    }
    
    return 'advanced-greedy'; // Default fallback
  }

  /**
   * Get algorithm-specific parameters for optimization
   */
  getAlgorithmParameters(placeCount, optimizationLevel) {
    const baseParams = {
      maxIterations: placeCount * 10,
      convergenceThreshold: 0.001,
      timeLimit: 30000 // 30 seconds max
    };

    switch (optimizationLevel) {
      case 'fast':
        return {
          ...baseParams,
          greedyParams: {
            lookaheadDepth: 1,
            diversityFactor: 0.1
          },
          maxIterations: Math.min(baseParams.maxIterations, 50)
        };

      case 'balanced':
        return {
          ...baseParams,
          geneticParams: {
            populationSize: Math.min(placeCount * 4, 50),
            generations: Math.min(placeCount * 5, 100),
            mutationRate: 0.1,
            crossoverRate: 0.8,
            eliteSize: Math.floor(placeCount * 0.2)
          },
          acoParams: {
            antCount: Math.min(placeCount * 2, 30),
            iterations: Math.min(placeCount * 3, 75),
            alpha: 1.0,
            beta: 2.0,
            evaporation: 0.5
          }
        };

      case 'optimal':
        return {
          ...baseParams,
          geneticParams: {
            populationSize: Math.min(placeCount * 6, 100),
            generations: Math.min(placeCount * 8, 200),
            mutationRate: 0.05,
            crossoverRate: 0.9,
            eliteSize: Math.floor(placeCount * 0.3)
          },
          saParams: {
            initialTemperature: 10000,
            coolingRate: 0.95,
            minTemperature: 1,
            maxIterationsPerTemp: placeCount * 2
          },
          moParams: {
            populationSize: Math.min(placeCount * 8, 150),
            generations: Math.min(placeCount * 10, 150),
            objectives: ['distance', 'time', 'cost', 'rating', 'diversity']
          },
          maxIterations: Math.min(baseParams.maxIterations * 2, 500),
          timeLimit: 45000 // 45 seconds for optimal
        };

      default:
        return baseParams;
    }
  }

  /**
   * Legacy method - now redirects to algorithm-based optimization
   */
  async optimizeRoute(optimizationData) {
    console.warn('⚠️ Using legacy optimizeRoute method - redirecting to algorithm-based optimization');
    return this.optimizeRouteWithAlgorithm(optimizationData);
  }

  /**
   * Get route validation and feasibility check from backend algorithms
   */
  async validateRouteAlgorithmically(routeData) {
    try {
      return await this.makeRequest('/api/routes/validate', {
        method: 'POST',
        body: JSON.stringify(routeData)
      });
    } catch (error) {
      console.error('Route validation failed:', error);
      throw error;
    }
  }

  /**
   * Get algorithmic suggestions based on preferences
   */
  async getAlgorithmicSuggestions(criteria) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(criteria).forEach(key => {
        if (criteria[key] !== undefined && criteria[key] !== null) {
          if (Array.isArray(criteria[key])) {
            params.append(key, criteria[key].join(','));
          } else {
            params.append(key, criteria[key].toString());
          }
        }
      });

      const endpoint = `/api/routes/suggestions${params.toString() ? '?' + params.toString() : ''}`;
      return await this.makeRequest(endpoint);
    } catch (error) {
      console.error('Failed to get algorithmic suggestions:', error);
      throw error;
    }
  }

  /**
   * Calculate distance matrix using backend algorithms
   */
  async calculateTravelMatrix(placeIds) {
    try {
      return await this.makeRequest('/api/routes/matrix', {
        method: 'POST',
        body: JSON.stringify({ placeIds })
      });
    } catch (error) {
      console.error('Travel matrix calculation failed:', error);
      throw error;
    }
  }

  // Utility method for retrying failed optimizations with different algorithms
  async retryOptimizationWithFallback(optimizationData, maxRetries = 3) {
    const algorithms = ['advanced-greedy', 'genetic', 'ant-colony'];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const modifiedData = {
          ...optimizationData,
          preferences: {
            ...optimizationData.preferences,
            algorithm: algorithms[attempt % algorithms.length]
          }
        };

        console.log(`🔄 Retry attempt ${attempt + 1} with algorithm: ${modifiedData.preferences.algorithm}`);
        return await this.optimizeRouteWithAlgorithm(modifiedData);

      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // Test connectivity and algorithm availability
  async testAlgorithmConnectivity() {
    try {
      const start = Date.now();
      
      // Test basic health
      const health = await this.healthCheck();
      
      // Test algorithm endpoints
      const tests = await Promise.allSettled([
        this.makeRequest('/api/routes/algorithms'),
        this.makeRequest('/api/optimization/status')
      ]);

      const duration = Date.now() - start;

      return {
        connected: health.status === 'OK',
        responseTime: duration,
        algorithmsAvailable: tests[0].status === 'fulfilled',
        optimizationService: tests[1].status === 'fulfilled',
        details: {
          health,
          tests: tests.map(t => t.status)
        }
      };
    } catch (error) {
      return {
        connected: false,
        responseTime: null,
        algorithmsAvailable: false,
        optimizationService: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const apiService = new APIService();

// Export utility functions for algorithm handling
export const algorithmUtils = {
  isAlgorithmError: (error) => {
    return error.message.includes('algorithm') || 
           error.message.includes('optimization') || 
           error.message.includes('feasible');
  },

  getAlgorithmErrorSuggestion: (error, placeCount) => {
    if (error.message.includes('timeout')) {
      return placeCount > 10 ? 
        'Try with fewer places (≤10) or use "fast" optimization level' :
        'Use "fast" optimization level for quicker results';
    } else if (error.message.includes('no feasible route')) {
      return 'Increase time budget, reduce places, or relax constraints';
    } else if (error.message.includes('invalid')) {
      return 'Check that all selected places have valid location data';
    }
    
    return 'Try with different optimization settings or fewer places';
  },

  formatOptimizationLevel: (level) => {
    const levels = {
      fast: 'Fast (Greedy Algorithm)',
      balanced: 'Balanced (Genetic/ACO Algorithm)', 
      optimal: 'Optimal (Multi-Algorithm Approach)'
    };
    return levels[level] || level;
  },

  estimateOptimizationTime: (placeCount, level = 'balanced') => {
    const timeEstimates = {
      fast: Math.min(placeCount * 0.5, 5),
      balanced: Math.min(placeCount * 1.5, 15),
      optimal: Math.min(placeCount * 3, 30)
    };
    
    return timeEstimates[level] || 10;
  }
};

export default apiService;