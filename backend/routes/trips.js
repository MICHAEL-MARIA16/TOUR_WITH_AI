// backend/routes/trips.js
const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

// Middleware for request timing and logging
const addRequestTiming = (req, res, next) => {
  req.startTime = Date.now();
  console.log(`Trip API: ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
};

// Apply timing middleware to all trip routes
router.use(addRequestTiming);

// POST /api/trips/generate - Generate optimized trip with AI recommendations
// Body: { preferences: {...}, constraints: {...}, algorithm?: string, startLocation?: object }
router.post('/generate', tripController.generateTrip);

// POST /api/trips/optimize - Optimize existing trip route
// Body: { places: [...], constraints?: {...}, algorithm?: string, currentRoute?: [...] }
router.post('/optimize', tripController.optimizeTrip);

// GET /api/trips/suggestions - Get AI-powered trip suggestions
// Query: { currentLocation?, interests?, duration?, budget?, groupSize?, accessibility? }
router.get('/suggestions', tripController.getTripSuggestions);

// POST /api/trips/matrix - Calculate travel distance/time matrix between places
// Body: { placeIds: [...] }
router.post('/matrix', tripController.calculateTravelMatrix);

// GET /api/trips/algorithms - Get available optimization algorithms with descriptions
router.get('/algorithms', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      algorithms: {
        'advanced-greedy': {
          name: 'Advanced Greedy',
          description: 'Fast optimization with multi-criteria selection',
          bestFor: 'Quick results, up to 20 places',
          timeComplexity: 'O(n²)',
          features: ['Fast execution', 'Multi-criteria scoring', 'Good for most cases']
        },
        'genetic': {
          name: 'Genetic Algorithm',
          description: 'Evolutionary optimization for complex problems',
          bestFor: 'Medium to large problems, 8-25 places',
          timeComplexity: 'O(generations × population × n)',
          features: ['Global optimization', 'Handles local optima', 'Configurable parameters']
        },
        'dynamicProgramming': {
          name: 'Dynamic Programming TSP',
          description: 'Optimal solution using Held-Karp algorithm',
          bestFor: 'Small problems, up to 12 places',
          timeComplexity: 'O(n² × 2ⁿ)',
          features: ['Guaranteed optimal', 'Exact solution', 'Memory intensive']
        },
        'simulatedAnnealing': {
          name: 'Simulated Annealing',
          description: 'Temperature-based optimization to escape local optima',
          bestFor: 'Medium problems, good solution quality',
          timeComplexity: 'O(iterations × n)',
          features: ['Escapes local optima', 'Probabilistic acceptance', 'Tunable cooling']
        },
        'antColony': {
          name: 'Ant Colony Optimization',
          description: 'Nature-inspired optimization using pheromone trails',
          bestFor: 'Complex routing problems, 15+ places',
          timeComplexity: 'O(iterations × ants × n²)',
          features: ['Bio-inspired', 'Good for TSP variants', 'Parallel processing']
        },
        'multiObjective': {
          name: 'Multi-Objective NSGA-II',
          description: 'Optimize multiple criteria simultaneously',
          bestFor: 'When balancing multiple objectives',
          timeComplexity: 'O(generations × population × objectives × n)',
          features: ['Pareto front solutions', 'Multiple objectives', 'Trade-off analysis']
        }
      },
      recommendations: {
        small: ['advanced-greedy', 'dynamicProgramming'],
        medium: ['genetic', 'simulatedAnnealing'],
        large: ['antColony', 'genetic'],
        multiCriteria: ['multiObjective', 'advanced-greedy'],
        fast: ['advanced-greedy'],
        optimal: ['dynamicProgramming', 'genetic']
      }
    }
  });
});

// GET /api/trips/templates - Get predefined trip templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'cultural-heritage',
        name: 'Cultural Heritage Tour',
        description: 'Explore ancient temples, palaces, and heritage sites',
        duration: 720, // 12 hours
        categories: ['temple', 'palace', 'heritage'],
        estimatedCost: 500,
        groupType: 'family',
        highlights: ['Ancient architecture', 'Cultural immersion', 'Historical significance']
      },
      {
        id: 'nature-adventure',
        name: 'Nature & Adventure',
        description: 'Hill stations, beaches, and natural wonders',
        duration: 960, // 16 hours (2 days)
        categories: ['hill-station', 'beach', 'nature', 'wildlife'],
        estimatedCost: 800,
        groupType: 'adventure',
        highlights: ['Scenic beauty', 'Adventure activities', 'Wildlife spotting']
      },
      {
        id: 'spiritual-journey',
        name: 'Spiritual Journey',
        description: 'Sacred temples and spiritual experiences',
        duration: 480, // 8 hours
        categories: ['temple'],
        estimatedCost: 300,
        groupType: 'spiritual',
        highlights: ['Peace and tranquility', 'Spiritual awakening', 'Sacred rituals']
      },
      {
        id: 'beach-hopping',
        name: 'Coastal Paradise',
        description: 'Beautiful beaches and coastal attractions',
        duration: 600, // 10 hours
        categories: ['beach', 'nature'],
        estimatedCost: 600,
        groupType: 'leisure',
        highlights: ['Beach activities', 'Coastal cuisine', 'Water sports']
      },
      {
        id: 'quick-getaway',
        name: 'Quick Weekend Getaway',
        description: 'Perfect for a short 1-day trip',
        duration: 360, // 6 hours
        categories: ['temple', 'palace'],
        estimatedCost: 400,
        groupType: 'couple',
        highlights: ['Time-efficient', 'Popular attractions', 'Easy accessibility']
      }
    ];

    res.status(200).json({
      success: true,
      data: { templates }
    });

  } catch (error) {
    console.error('Error fetching trip templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip templates'
    });
  }
});

// GET /api/trips/stats - Get trip planning statistics
router.get('/stats', async (req, res) => {
  try {
    const Place = require('../models/Place');
    
    const [
      totalPlaces,
      placesByCategory,
      placesByState,
      avgRating,
      freeEntryPlaces
    ] = await Promise.all([
      Place.countDocuments(),
      Place.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Place.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 } } }
      ]),
      Place.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),
      Place.countDocuments({ 'entryFee.indian': 0 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalPlaces,
          averageRating: avgRating[0]?.avgRating?.toFixed(1) || '0',
          freeEntryPlaces,
          coverageStates: placesByState.length
        },
        distribution: {
          byCategory: placesByCategory.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byState: placesByState.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        algorithms: {
          available: 6,
          optimal: ['dynamicProgramming'],
          fast: ['advanced-greedy'],
          scalable: ['genetic', 'antColony']
        }
      }
    });

  } catch (error) {
    console.error('Error fetching trip stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// POST /api/trips/validate - Validate trip constraints and feasibility
router.post('/validate', async (req, res) => {
  try {
    const { places, constraints = {} } = req.body;
    const Place = require('../models/Place');

    if (!places || !Array.isArray(places) || places.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Places array is required'
      });
    }

    // Validate places exist
    const placeIds = places.map(p => typeof p === 'string' ? p : p.id);
    const validPlaces = await Place.find({ id: { $in: placeIds } });

    if (validPlaces.length !== places.length) {
      return res.status(400).json({
        success: false,
        message: 'Some places were not found in database',
        details: {
          requested: places.length,
          found: validPlaces.length,
          missing: places.length - validPlaces.length
        }
      });
    }

    // Validate constraints
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Time constraint validation
    if (constraints.timeConstraints?.maxDuration) {
      const totalVisitTime = validPlaces.reduce((sum, place) => sum + place.averageVisitDuration, 0);
      const estimatedTravelTime = validPlaces.length > 1 ? (validPlaces.length - 1) * 60 : 0; // Rough estimate
      const totalTime = totalVisitTime + estimatedTravelTime;

      if (totalTime > constraints.timeConstraints.maxDuration) {
        validation.warnings.push({
          type: 'TIME_EXCEEDED',
          message: `Estimated total time (${Math.round(totalTime/60)}h) exceeds available time (${Math.round(constraints.timeConstraints.maxDuration/60)}h)`,
          suggestion: 'Consider reducing the number of places or increasing available time'
        });
      }

      if (totalTime < constraints.timeConstraints.maxDuration * 0.5) {
        validation.recommendations.push({
          type: 'UNDERUTILIZED_TIME',
          message: 'You have extra time available',
          suggestion: 'Consider adding more places or spending more time at each location'
        });
      }
    }

    // Budget constraint validation
    if (constraints.budget) {
      const totalEntryCost = validPlaces.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
      const budgetNumber = typeof constraints.budget === 'number' ? constraints.budget : parseFloat(constraints.budget);

      if (totalEntryCost > budgetNumber * 0.7) { // Entry fees shouldn't exceed 70% of budget
        validation.warnings.push({
          type: 'BUDGET_TIGHT',
          message: `Entry fees (₹${totalEntryCost}) are high compared to budget`,
          suggestion: 'Consider including more free-entry places or increasing budget'
        });
      }
    }

    // Accessibility validation
    if (constraints.accessibility?.wheelchairAccess) {
      const inaccessiblePlaces = validPlaces.filter(place => !place.wheelchairAccessible);
      if (inaccessiblePlaces.length > 0) {
        validation.errors.push({
          type: 'ACCESSIBILITY_ISSUE',
          message: `${inaccessiblePlaces.length} places are not wheelchair accessible`,
          places: inaccessiblePlaces.map(p => p.name),
          suggestion: 'Remove these places or check for alternative access options'
        });
        validation.isValid = false;
      }
    }

    // Distance validation (rough check)
    const states = [...new Set(validPlaces.map(place => place.state))];
    if (states.length > 2 && constraints.timeConstraints?.maxDuration < 720) { // More than 2 states in less than 12 hours
      validation.warnings.push({
        type: 'LONG_DISTANCE',
        message: `Places span ${states.length} states: ${states.join(', ')}`,
        suggestion: 'Consider grouping places by region to reduce travel time'
      });
    }

    // Generate optimization recommendations
    if (validPlaces.length <= 8) {
      validation.recommendations.push({
        type: 'ALGORITHM_SUGGESTION',
        message: 'Small problem size detected',
        suggestion: 'Use dynamic programming for optimal results'
      });
    } else if (validPlaces.length > 15) {
      validation.recommendations.push({
        type: 'ALGORITHM_SUGGESTION',
        message: 'Large problem size detected',
        suggestion: 'Use genetic algorithm or ant colony optimization'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        validation,
        summary: {
          placesCount: validPlaces.length,
          estimatedDuration: `${Math.round((validPlaces.reduce((sum, p) => sum + p.averageVisitDuration, 0) + (validPlaces.length - 1) * 60) / 60)}h`,
          totalEntryCost: validPlaces.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0),
          statesCovered: states.length,
          categoriesIncluded: [...new Set(validPlaces.map(p => p.category))].length
        }
      }
    });

  } catch (error) {
    console.error('Trip validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/trips/health - Health check for trip service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Trip planning service is operational',
    services: {
      optimization: 'active',
      algorithms: 6,
      database: 'connected',
      distanceCalculator: 'active'
    },
    features: {
      routeOptimization: true,
      multiObjective: true,
      realTimeCalculation: true,
      aiSuggestions: true
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware for trip routes
router.use((error, req, res, next) => {
  console.error('Trip route error:', error);

  // Handle specific optimization errors
  if (error.message && error.message.includes('Dynamic programming TSP limited')) {
    return res.status(400).json({
      success: false,
      message: 'Too many places for optimal algorithm',
      suggestion: 'Use genetic algorithm instead or reduce the number of places',
      maxPlacesForOptimal: 12
    });
  }

  // Handle timeout errors
  if (error.code === 'OPTIMIZATION_TIMEOUT') {
    return res.status(408).json({
      success: false,
      message: 'Optimization timed out',
      suggestion: 'Try with fewer places or use a faster algorithm',
      fallback: 'advanced-greedy'
    });
  }

  // Handle distance calculation errors
  if (error.message && error.message.includes('distance calculation')) {
    return res.status(503).json({
      success: false,
      message: 'Distance calculation service temporarily unavailable',
      fallback: true
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Trip planning service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;