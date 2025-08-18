// backend/routes/trips.js - ENHANCED WITH DETAILED PLAN GENERATION

const express = require('express');
const { 
  optimizeTripWithAI, 
  getTripSuggestions, 
  analyzeExistingTrip,
  addRequestTiming 
} = require('../controllers/tripController');

// Import the new detailed trip controller
const detailedTripController = require('../controllers/detailedTripController');

const router = express.Router();

// Apply timing middleware to all routes
router.use(addRequestTiming);

// MAIN ENDPOINTS: Gemini AI + Algorithm Optimization
router.post('/optimize', optimizeTripWithAI);
router.post('/generate', optimizeTripWithAI);
router.post('/ai-optimize', optimizeTripWithAI);

// NEW ENDPOINT: Generate detailed trip plan using Gemini AI
router.post('/generate-detailed-plan', detailedTripController.generateDetailedPlan);

// ENHANCED ENDPOINT: Complete trip planning (optimization + detailed plan)
router.post('/create-complete-trip', async (req, res) => {
  try {
    console.log('🎯 Creating complete trip with optimization and detailed plan...');
    
    const { places, preferences, constraints } = req.body;

    // Input validation
    if (!places || !Array.isArray(places) || places.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 places required for trip creation'
      });
    }

    // Step 1: Optimize the route
    console.log('🔄 Step 1: Optimizing route...');
    req.body.places = places;
    req.body.preferences = preferences || {};
    req.body.constraints = constraints || {};

    // Call the optimization function
    const optimizationResult = await new Promise((resolve, reject) => {
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            if (data.success) {
              resolve(data);
            } else {
              reject(new Error(data.message || 'Optimization failed'));
            }
          }
        })
      };

      optimizeTripWithAI(req, mockRes);
    });

    if (!optimizationResult.success || !optimizationResult.route) {
      throw new Error('Route optimization failed');
    }

    // Step 2: Generate detailed plan
    console.log('🔄 Step 2: Generating detailed plan...');
    const detailedPlanPayload = {
      places: optimizationResult.route,
      preferences: preferences || {},
      routeMetrics: optimizationResult.metrics || {},
      algorithm: optimizationResult.algorithm || 'unknown'
    };

    let detailedPlan = null;
    try {
      const planResult = await detailedTripController.generateDetailedPlan({
        body: detailedPlanPayload
      }, {
        status: (code) => ({
          json: (data) => data
        })
      });

      if (planResult.success) {
        detailedPlan = planResult.data;
      }
    } catch (planError) {
      console.warn('⚠️ Detailed plan generation failed, continuing with optimization only:', planError.message);
    }

    // Step 3: Combine results
    const completeTrip = {
      success: true,
      optimizedRoute: {
        route: optimizationResult.route,
        algorithm: optimizationResult.algorithm,
        metrics: optimizationResult.metrics,
        aiInsights: optimizationResult.aiInsights,
        efficiency: optimizationResult.efficiency
      },
      detailedPlan: detailedPlan,
      completeTripGenerated: !!detailedPlan,
      generatedAt: new Date().toISOString(),
      processingSteps: [
        { step: 'route_optimization', status: 'completed', algorithm: optimizationResult.algorithm },
        { step: 'detailed_plan_generation', status: detailedPlan ? 'completed' : 'failed', aiModel: detailedPlan ? 'gemini-1.5-flash' : null }
      ]
    };

    console.log('✅ Complete trip creation finished:', {
      routeOptimized: true,
      detailedPlanGenerated: !!detailedPlan,
      placesCount: optimizationResult.route?.length || 0
    });

    res.status(200).json(completeTrip);

  } catch (error) {
    console.error('💥 Complete trip creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create complete trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorType: 'COMPLETE_TRIP_ERROR'
    });
  }
});

// Trip suggestions endpoint
router.get('/suggestions', getTripSuggestions);

// Trip analysis endpoint
router.post('/analyze', analyzeExistingTrip);

// ENHANCED ENDPOINT: Get trip templates with detailed information
router.get('/templates', async (req, res) => {
  try {
    const { category, duration, difficulty } = req.query;
    
    // This would typically come from a database
    const templates = [
      {
        id: 'cultural-heritage-3day',
        name: 'South India Cultural Heritage',
        description: 'Explore ancient temples, majestic palaces, and UNESCO World Heritage sites',
        category: 'cultural',
        duration: '3 days',
        difficulty: 'moderate',
        placesCount: 8,
        estimatedCost: 15000,
        highlights: ['Ancient temples', 'Royal palaces', 'UNESCO sites', 'Traditional crafts'],
        bestSeason: 'October to March',
        includes: {
          accommodation: true,
          meals: true,
          guide: true,
          transport: true
        },
        samplePlaces: [
          'Meenakshi Amman Temple',
          'Mysore Palace',
          'Hampi',
          'Thanjavur Brihadeeswarar Temple'
        ]
      },
      {
        id: 'nature-adventure-2day',
        name: 'Western Ghats Nature Trail',
        description: 'Breathtaking hill stations, wildlife sanctuaries, and scenic landscapes',
        category: 'nature',
        duration: '2 days',
        difficulty: 'easy',
        placesCount: 6,
        estimatedCost: 8000,
        highlights: ['Hill stations', 'Wildlife spotting', 'Tea plantations', 'Waterfalls'],
        bestSeason: 'September to February',
        includes: {
          accommodation: true,
          meals: false,
          guide: false,
          transport: true
        },
        samplePlaces: [
          'Ooty',
          'Kodaikanal',
          'Periyar Wildlife Sanctuary',
          'Athirapally Waterfalls'
        ]
      },
      {
        id: 'spiritual-journey-4day',
        name: 'Sacred South India Pilgrimage',
        description: 'Visit the most revered temples and spiritual centers of South India',
        category: 'spiritual',
        duration: '4 days',
        difficulty: 'moderate',
        placesCount: 10,
        estimatedCost: 12000,
        highlights: ['Ancient temples', 'Spiritual practices', 'Religious festivals', 'Sacred rivers'],
        bestSeason: 'November to February',
        includes: {
          accommodation: true,
          meals: true,
          guide: true,
          transport: true
        },
        samplePlaces: [
          'Rameswaram Temple',
          'Madurai Meenakshi Temple',
          'Tirumala Tirupati',
          'Srirangam Temple'
        ]
      }
    ];

    // Filter templates based on query parameters
    let filteredTemplates = templates;
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category.toLowerCase());
    }
    
    if (duration) {
      filteredTemplates = filteredTemplates.filter(t => t.duration.includes(duration));
    }
    
    if (difficulty) {
      filteredTemplates = filteredTemplates.filter(t => t.difficulty === difficulty.toLowerCase());
    }

    res.status(200).json({
      success: true,
      count: filteredTemplates.length,
      data: filteredTemplates,
      filters: { category, duration, difficulty }
    });

  } catch (error) {
    console.error('Error fetching trip templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trip templates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ENHANCED ENDPOINT: Real-time trip progress tracking
router.post('/start-trip/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { startTime, currentLocation } = req.body;

    // This would typically update a database record
    const tripProgress = {
      tripId,
      status: 'active',
      startedAt: startTime || new Date().toISOString(),
      currentLocation: currentLocation || null,
      visitedPlaces: [],
      currentPlaceIndex: 0,
      estimatedCompletion: null,
      realTimeUpdates: true
    };

    console.log(`🚀 Trip ${tripId} started at ${tripProgress.startedAt}`);

    res.status(200).json({
      success: true,
      message: 'Trip started successfully',
      data: tripProgress
    });

  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ENDPOINT: Update trip progress (for real-time tracking)
router.post('/update-progress/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { visitedPlaces, currentPlaceIndex, currentLocation, notes } = req.body;

    // This would typically update a database record
    const updatedProgress = {
      tripId,
      visitedPlaces: visitedPlaces || [],
      currentPlaceIndex: currentPlaceIndex || 0,
      currentLocation: currentLocation || null,
      notes: notes || [],
      updatedAt: new Date().toISOString(),
      progressPercentage: Math.round((visitedPlaces?.length || 0) / 10 * 100) // Assuming 10 places total
    };

    console.log(`📍 Trip ${tripId} progress updated: ${updatedProgress.progressPercentage}% complete`);

    res.status(200).json({
      success: true,
      message: 'Trip progress updated',
      data: updatedProgress
    });

  } catch (error) {
    console.error('Error updating trip progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trip progress',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ENDPOINT: Complete trip
router.post('/complete-trip/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { rating, feedback, highlights, photos } = req.body;

    const completedTrip = {
      tripId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      userFeedback: {
        rating: rating || null,
        feedback: feedback || '',
        highlights: highlights || [],
        photos: photos || []
      },
      success: true
    };

    console.log(`✅ Trip ${tripId} completed with rating: ${rating}/5`);

    res.status(200).json({
      success: true,
      message: 'Trip completed successfully',
      data: completedTrip
    });

  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Algorithm support and capabilities endpoint
router.get('/algorithm-support', (req, res) => {
  res.json({
    success: true,
    supported: true,
    algorithms: [
      {
        name: 'advancedGreedy',
        displayName: 'Advanced Greedy',
        description: 'Multi-criteria optimization with balanced scoring',
        complexity: 'O(n²)',
        maxPlaces: 15,
        recommended: true,
        features: ['Fast execution', 'Good results', 'Multi-criteria scoring']
      },
      {
        name: 'genetic',
        displayName: 'Genetic Algorithm',
        description: 'Evolutionary approach for complex optimization',
        complexity: 'O(g×p×n)',
        maxPlaces: 20,
        recommended: false,
        features: ['Global optimization', 'Handles constraints', 'High quality results']
      },
      {
        name: 'nearestNeighbor',
        displayName: 'Nearest Neighbor',
        description: 'Simple and fast distance-based optimization',
        complexity: 'O(n²)',
        maxPlaces: 25,
        recommended: false,
        features: ['Very fast', 'Simple logic', 'Distance-based']
      }
    ],
    features: {
      geminiAI: true,
      multiCriteria: true,
      coimbatoreOptimized: true,
      realTimeTracking: true,
      detailedPlans: true,
      culturalInsights: true
    },
    limits: {
      maxPlaces: 20,
      maxTimeHours: 24,
      minTimeHours: 2
    }
  });
});

// Available algorithms endpoint (detailed information)
router.get('/algorithms', (req, res) => {
  const OptimizationAlgorithms = require('../utils/optimizationAlgorithms');
  const optimizer = new OptimizationAlgorithms();
  
  res.json({
    success: true,
    algorithms: optimizer.getAvailableAlgorithms(),
    aiIntegration: {
      geminiAI: !!process.env.GEMINI_API_KEY,
      fallbackAvailable: true,
      enhancedInsights: true
    }
  });
});

// Route metrics and analytics endpoint
router.get('/metrics/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // This would typically fetch from database
    const metrics = {
      routeId,
      analytics: {
        optimizationTime: '2.3s',
        placesAnalyzed: 15,
        placesSelected: 8,
        efficiency: '87.5%',
        userSatisfaction: 4.6,
        completionRate: '94%'
      },
      performance: {
        algorithmUsed: 'advancedGreedy',
        executionTime: 2300, // milliseconds
        memoryUsage: '45MB',
        apiCalls: 12
      },
      userEngagement: {
        viewsCount: 156,
        sharesCount: 23,
        savesCount: 78,
        ratingsCount: 45
      }
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching route metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check and status endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    services: {
      optimization: 'operational',
      geminiAI: process.env.GEMINI_API_KEY ? 'operational' : 'disabled',
      database: 'operational',
      caching: 'operational'
    },
    version: '2.1.0',
    features: {
      routeOptimization: true,
      detailedPlans: true,
      realTimeTracking: true,
      aiInsights: !!process.env.GEMINI_API_KEY
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for development
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced trip planning with Gemini AI + Algorithms is ready',
    endpoints: {
      optimization: 'POST /api/trips/optimize',
      detailedPlan: 'POST /api/trips/generate-detailed-plan',
      completeTrip: 'POST /api/trips/create-complete-trip',
      templates: 'GET /api/trips/templates',
      startTrip: 'POST /api/trips/start-trip/:id',
      updateProgress: 'POST /api/trips/update-progress/:id',
      completeTrip: 'POST /api/trips/complete-trip/:id'
    },
    features: [
      'Gemini AI trip analysis and insights',
      'Advanced optimization algorithms (Greedy, Genetic, Nearest Neighbor)',
      'Intelligent algorithm selection based on trip parameters',
      'Comprehensive detailed itinerary generation',
      'Cultural insights and local recommendations',
      'Real-time trip progress tracking',
      'Trip templates for quick planning',
      'Budget estimation and breakdown',
      'Seasonal recommendations and tips',
      'Coimbatore Tidal Park fixed start location'
    ],
    integrations: {
      ai: 'Google Gemini 1.5 Flash',
      maps: 'Google Maps Distance Matrix API',
      database: 'MongoDB with Place schema',
      optimization: 'Custom multi-algorithm engine'
    }
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Trip routes error:', error);

  // Handle specific error types
  if (error.message && error.message.includes('Gemini')) {
    return res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable',
      fallback: 'Basic trip planning is still available',
      errorType: 'AI_SERVICE_ERROR'
    });
  }

  if (error.message && error.message.includes('optimization')) {
    return res.status(422).json({
      success: false,
      message: 'Route optimization failed',
      suggestion: 'Try reducing the number of places or adjusting constraints',
      errorType: 'OPTIMIZATION_ERROR'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Trip planning service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    errorType: 'INTERNAL_ERROR'
  });
});

module.exports = router;