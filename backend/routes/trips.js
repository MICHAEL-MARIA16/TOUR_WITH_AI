// backend/routes/tripRoutes.js - FIXED ROUTING AND ENHANCED ERROR HANDLING

const express = require('express');
const router = express.Router();

// Import controllers
const {
  optimizeTripWithAI,
  getTripSuggestions,
  analyzeExistingTrip,
  addRequestTiming
} = require('../controllers/tripController');

const detailedTripController = require('../controllers/detailedTripController');
const distanceController = require('../controllers/distanceController');
const mapController = require('../controllers/mapController');

// Middleware for request timing and logging
router.use(addRequestTiming);

// Enhanced middleware for request validation and logging
router.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.method !== 'GET') {
    console.log('📊 Request body size:', JSON.stringify(req.body).length);
    console.log('📍 Places count:', req.body?.places?.length || 0);
  }
  console.log('🔍 Query params:', JSON.stringify(req.query, null, 2));
  next();
});

// Enhanced error handling middleware
const handleAsyncErrors = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('💥 Route error:', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // Specific error handling
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map(err => err.message),
          type: 'VALIDATION_ERROR'
        });
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format',
          type: 'CAST_ERROR'
        });
      }
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry found',
          type: 'DUPLICATE_ERROR'
        });
      }

      if (error.message.includes('Gemini') || error.message.includes('AI')) {
        return res.status(503).json({
          success: false,
          message: 'AI service temporarily unavailable',
          type: 'AI_SERVICE_ERROR',
          fallbackAvailable: true
        });
      }
      
      // Generic error response
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        type: 'INTERNAL_ERROR',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      });
    });
  };
};

// MAIN ROUTES

// 1. ENHANCED AI + ALGORITHM OPTIMIZATION
router.post('/optimize-with-algorithm', handleAsyncErrors(async (req, res) => {
  console.log('🚀 Starting enhanced AI + Algorithm optimization...');
  
  // Enhanced input validation
  const { places, preferences = {}, constraints = {} } = req.body;
  
  if (!places || !Array.isArray(places) || places.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one place is required',
      type: 'VALIDATION_ERROR'
    });
  }
  
  if (places.length > 25) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 25 places allowed',
      type: 'VALIDATION_ERROR'
    });
  }
  
  // Call the enhanced controller
  return optimizeTripWithAI(req, res);
}));

// 2. FIXED: PERSONALIZED DETAILED TRIP PLANNING (Multiple endpoints for compatibility)
router.post('/generate-detailed-plan', handleAsyncErrors(async (req, res) => {
  console.log('📋 Starting detailed trip planning via /generate-detailed-plan...');
  return detailedTripController.generateDetailedPlan(req, res);
}));

router.post('/detailed-plan', handleAsyncErrors(async (req, res) => {
  console.log('📋 Starting detailed trip planning via /detailed-plan...');
  return detailedTripController.generateDetailedPlan(req, res);
}));

// 3. AI TRIP SUGGESTIONS
router.get('/suggestions', handleAsyncErrors(async (req, res) => {
  console.log('💡 Generating AI trip suggestions...');
  
  // Validate query parameters
  const { timeAvailable, groupSize } = req.query;
  
  if (timeAvailable && (isNaN(timeAvailable) || parseInt(timeAvailable) < 60)) {
    return res.status(400).json({
      success: false,
      message: 'timeAvailable must be a number >= 60 minutes',
      type: 'VALIDATION_ERROR'
    });
  }
  
  if (groupSize && (isNaN(groupSize) || parseInt(groupSize) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'groupSize must be a number >= 1',
      type: 'VALIDATION_ERROR'
    });
  }
  
  return getTripSuggestions(req, res);
}));

// 4. ANALYZE EXISTING TRIP
router.post('/analyze', handleAsyncErrors(async (req, res) => {
  console.log('🔍 Analyzing existing trip...');
  
  const { places } = req.body;
  
  if (!places || !Array.isArray(places) || places.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'At least 2 places are required for analysis',
      type: 'VALIDATION_ERROR'
    });
  }
  
  return analyzeExistingTrip(req, res);
}));

// DISTANCE AND ROUTE CALCULATION ROUTES

// 5. CALCULATE DISTANCE BETWEEN PLACES
router.post('/distance', handleAsyncErrors(distanceController.calculateDistance));

// 6. CALCULATE DISTANCE MATRIX
router.post('/distance-matrix', handleAsyncErrors(distanceController.calculateMatrix));

// 7. OPTIMIZE ROUTE ORDER
router.post('/optimize-route', handleAsyncErrors(distanceController.findOptimalRoute));

// 8. GET DISTANCE STATISTICS
router.post('/distance-stats', handleAsyncErrors(distanceController.getDistanceStatistics));

// 9. CLUSTER PLACES BY PROXIMITY
router.post('/cluster-places', handleAsyncErrors(distanceController.clusterPlaces));

// 10. ESTIMATE TRAVEL COST
router.get('/travel-cost', handleAsyncErrors(distanceController.estimateTravelCost));

// MAP AND VISUALIZATION ROUTES

// 11. GET MAP BOUNDS FOR PLACES
router.get('/map/bounds', handleAsyncErrors(mapController.getMapBounds));

// 12. GET PLACES WITHIN MAP BOUNDS
router.get('/map/places-in-bounds', handleAsyncErrors(mapController.getPlacesInBounds));

// 13. GET OPTIMIZED ROUTE FOR MAP
router.post('/map/optimized-route', handleAsyncErrors(mapController.getOptimizedRoute));

// 14. GET CLUSTERED MARKERS FOR MAP
router.get('/map/clustered-markers', handleAsyncErrors(mapController.getClusteredMarkers));

// 15. GET HEATMAP DATA
router.get('/map/heatmap', handleAsyncErrors(mapController.getHeatmapData));

// UTILITY AND DEBUG ROUTES

// 16. GET CACHE STATISTICS
router.get('/cache-stats', handleAsyncErrors(distanceController.getCacheStats));

// 17. CLEAR CACHE
router.delete('/cache', handleAsyncErrors(distanceController.clearCache));

// 18. HEALTH CHECK
router.get('/health', handleAsyncErrors(async (req, res) => {
  const Place = require('../models/Place');
  
  try {
    // Test database connection
    const placeCount = await Place.countDocuments({ isActive: true });
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      data: {
        activePlaces: placeCount,
        apiVersion: '2.0',
        features: {
          aiOptimization: !!process.env.GEMINI_API_KEY,
          distanceCalculation: true,
          mapVisualization: true,
          realTimePlanning: true,
          detailedPlanGeneration: true
        },
        endpoints: {
          detailedPlan: [
            '/api/trips/generate-detailed-plan',
            '/api/trips/detailed-plan'
          ]
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// 19. GET API INFORMATION
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      apiName: 'TouristAI Trip Optimization API',
      version: '2.0',
      description: 'AI-powered trip optimization for South Indian tourism',
      features: [
        'AI-powered route optimization using Gemini',
        'Multiple optimization algorithms (Genetic, Greedy, etc.)',
        'Real-time distance calculation',
        'Interactive map integration',
        'Personalized trip planning',
        'Cultural insights and recommendations'
      ],
      endpoints: {
        optimization: [
          'POST /api/trips/optimize-with-algorithm - Main AI optimization',
          'POST /api/trips/generate-detailed-plan - Detailed personalized planning (PRIMARY)',
          'POST /api/trips/detailed-plan - Detailed personalized planning (ALTERNATIVE)'
        ],
        suggestions: [
          'GET /api/trips/suggestions - AI trip suggestions',
          'POST /api/trips/analyze - Analyze existing trips'
        ],
        distance: [
          'POST /api/trips/distance - Calculate distances',
          'POST /api/trips/distance-matrix - Distance matrix',
          'POST /api/trips/optimize-route - Route optimization'
        ],
        map: [
          'GET /api/trips/map/bounds - Map bounds',
          'GET /api/trips/map/places-in-bounds - Places in viewport',
          'POST /api/trips/map/optimized-route - Map route'
        ],
        utility: [
          'GET /api/trips/health - Health check',
          'GET /api/trips/info - API information'
        ]
      },
      limits: {
        maxPlaces: 25,
        maxMatrixSize: 15,
        requestTimeout: '30s'
      }
    }
  });
});

// backend/routes/tripRoutes.js - Add these new endpoints

// Real-time trip tracking endpoints
router.post('/start-realtime-tracking', handleAsyncErrors(async (req, res) => {
  try {
    const { tripId, userId, startLocation } = req.body;
    
    const trackingSession = {
      tripId,
      userId,
      startedAt: new Date(),
      currentLocation: startLocation,
      status: 'active',
      progress: {
        currentCheckpoint: 0,
        visitedPlaces: [],
        nextDestination: null
      }
    };

    // Store in database or cache
    await redis.setex(`trip_tracking_${tripId}`, 3600 * 8, JSON.stringify(trackingSession));

    res.json({
      success: true,
      trackingId: tripId,
      data: trackingSession
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}));

router.put('/update-progress', handleAsyncErrors(async (req, res) => {
  try {
    const { tripId, currentLocation, checkpointId, action } = req.body;
    
    const trackingData = await redis.get(`trip_tracking_${tripId}`);
    if (!trackingData) {
      return res.status(404).json({ success: false, message: 'Tracking session not found' });
    }

    const session = JSON.parse(trackingData);
    
    // Update location and progress
    session.currentLocation = currentLocation;
    session.lastUpdated = new Date();
    
    if (action === 'arrive_at_checkpoint') {
      session.progress.currentCheckpoint++;
      session.progress.visitedPlaces.push(checkpointId);
    }

    await redis.setex(`trip_tracking_${tripId}`, 3600 * 8, JSON.stringify(session));

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}));


// DEBUG ENDPOINT - Test detailed plan generation
router.post('/test-detailed-plan', handleAsyncErrors(async (req, res) => {
  console.log('🧪 Testing detailed plan generation...');
  
  try {
    // Test payload
    const testPayload = {
      places: [
        {
          id: 'test_place_1',
          name: 'Test Temple',
          category: 'temple',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          rating: 4.5,
          averageVisitDuration: 120,
          location: { latitude: 11.0168, longitude: 76.9558 },
          entryFee: { indian: 0 }
        }
      ],
      preferences: {
        startTime: '09:00',
        totalTimeAvailable: 480,
        optimizationLevel: 'balanced'
      },
      routeMetrics: {
        totalDistance: 50,
        efficiency: 85
      },
      algorithm: 'test-algorithm'
    };

    // Simulate the detailed plan generation
    req.body = testPayload;
    return detailedTripController.generateDetailedPlan(req, res);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
}));

// ENHANCED ERROR HANDLING FOR UNMATCHED ROUTES
router.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    type: 'ROUTE_NOT_FOUND',
    suggestion: req.originalUrl.includes('generate-detailed-plan') 
      ? 'Endpoint exists at /api/trips/generate-detailed-plan - check backend server status'
      : 'Check available endpoints below',
    availableEndpoints: [
      'POST /optimize-with-algorithm',
      'POST /generate-detailed-plan (PRIMARY)',
      'POST /detailed-plan (ALTERNATIVE)', 
      'GET /suggestions',
      'POST /analyze',
      'POST /distance',
      'GET /health',
      'GET /info',
      'POST /test-detailed-plan (DEBUG)'
    ],
    backendStatus: 'Check if backend server is running on correct port'
  });
});

// Global error handler for the router
router.use((error, req, res, next) => {
  console.error('🚨 Router global error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  
  res.status(500).json({
    success: false,
    message: 'Unexpected server error',
    type: 'ROUTER_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
    path: req.path,
    method: req.method,
    error: process.env.NODE_ENV === 'development' ? {
      message: error.message,
      stack: error.stack
    } : undefined
  });
});

module.exports = router;

// Export route information for documentation
module.exports.routeInfo = {
  prefix: '/api/trips',
  version: '2.0',
  totalRoutes: 20,
  categories: {
    optimization: 2,
    detailedPlanning: 2, // Both endpoints
    suggestions: 2,
    distance: 6,
    map: 5,
    utility: 3
  },
  detailedPlanEndpoints: [
    '/api/trips/generate-detailed-plan',
    '/api/trips/detailed-plan'
  ]
};