// backend/routes/tripRoutes.js - COMPLETE VERSION WITH ALL MISSING LINES ADDED

const express = require('express');
const router = express.Router();

// Import controllers
const {
  optimizeTripWithAI,
  getTripSuggestions,
  analyzeExistingTrip,
  generateAlgorithmExplanation, // ADDED FROM FIRST VERSION
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

// ADDED FROM FIRST VERSION: AI Algorithm Explanation Endpoint
router.post('/generate-algorithm-explanation', handleAsyncErrors(async (req, res) => {
  try {
    console.log('🎯 Algorithm explanation request received');
    console.log('📊 Route length:', req.body.route?.length || 0);
    console.log('🧠 Algorithm:', req.body.algorithm || 'unknown');
    console.log('📈 Detail level:', req.body.explanationLevel || 'detailed');

    await generateAlgorithmExplanation(req, res);
  } catch (error) {
    console.error('Algorithm explanation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Algorithm explanation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}));

// 2. FIXED: PERSONALIZED DETAILED TRIP PLANNING (Multiple endpoints for compatibility)
router.post('/generate-detailed-plan', handleAsyncErrors(async (req, res) => {
  console.log('📋 Starting detailed trip planning via /generate-detailed-plan...');
  
  // ADDED FROM FIRST VERSION: Enhanced detailed plan generation with fallback
  try {
    console.log('📋 Detailed plan generation request received');
    console.log('📊 Places:', req.body.places?.length || 0);
    console.log('🧠 Algorithm:', req.body.algorithm || 'unknown');
    
    // Check if detailedTripController exists, otherwise use inline implementation
    if (detailedTripController && detailedTripController.generateDetailedPlan) {
      return detailedTripController.generateDetailedPlan(req, res);
    }
    
    // FALLBACK: Inline detailed plan generation from first version
    const { places, preferences, routeMetrics, algorithm, constraints } = req.body;
    
    if (!places || places.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Places array is required for detailed plan generation'
      });
    }

    // Generate comprehensive detailed plan
    const detailedPlan = {
      summary: {
        title: `${places.length}-Place South India Journey`,
        duration: `${Math.ceil((preferences?.totalTimeAvailable || 480) / 60)} hours`,
        totalDistance: routeMetrics?.totalDistance || 0,
        estimatedCost: places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0),
        difficulty: getDifficultyLevel(places),
        startingLocation: constraints?.startLocation?.name || preferences?.userLocationId || 'Coimbatore'
      },
      
      timeline: generateEnhancedTimeline(places, preferences, constraints),
      
      insights: {
        diversity: [...new Set(places.map(p => p.category))].length / places.length,
        cityCount: [...new Set(places.map(p => p.city))].length,
        averageRating: (places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length).toFixed(1),
        totalDuration: places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
        highlights: places.filter(p => (p.rating || 0) >= 4.5),
        categories: [...new Set(places.map(p => p.category))],
        experienceLevel: getExperienceLevel(places)
      },
      
      recommendations: generateEnhancedRecommendations(places, preferences),
      
      logistics: generateLogisticsInfo(places, preferences),
      
      cultural: generateCulturalTips(places),
      
      practicalInfo: {
        totalDuration: `${Math.ceil((preferences?.totalTimeAvailable || 480) / 60)} hours`,
        transportationTips: 'Private car or taxi recommended for flexible scheduling',
        budgetBreakdown: generateBudgetBreakdown(places, routeMetrics),
        packingList: generatePackingList(places),
        weatherConsiderations: generateWeatherTips(places),
        emergencyInfo: 'Keep emergency contacts handy: 108 for ambulance, 100 for police'
      }
    };

    res.status(200).json({
      success: true,
      data: detailedPlan,
      metadata: {
        algorithm: algorithm || 'advanced-optimization',
        generatedAt: new Date().toISOString(),
        placesProcessed: places.length,
        aiEnhanced: true
      }
    });

  } catch (error) {
    console.error('Detailed plan generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate detailed plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
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

// ADDED FROM FIRST VERSION: Real-time trip tracking endpoints
router.post('/start-realtime-tracking', handleAsyncErrors(async (req, res) => {
  try {
    const { tripId, userId, startLocation } = req.body;
    
    // Store tracking session (implement with your database)
    const trackingSession = {
      tripId,
      userId, 
      startLocation,
      startTime: new Date(),
      status: 'active'
    };

    res.status(200).json({
      success: true,
      data: {
        trackingId: `track_${Date.now()}`,
        session: trackingSession,
        message: 'Real-time tracking started successfully'
      }
    });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start tracking',
      error: error.message
    });
  }
}));

router.put('/update-progress', handleAsyncErrors(async (req, res) => {
  try {
    const { tripId, currentLocation, checkpointId, action } = req.body;
    
    // Update progress logic here
    const progressUpdate = {
      tripId,
      currentLocation,
      checkpointId,
      action,
      timestamp: new Date()
    };

    res.status(200).json({
      success: true,
      data: progressUpdate,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message
    });
  }
}));

router.get('/real-time-updates', handleAsyncErrors(async (req, res) => {
  try {
    const { tripId, currentLocation, lastUpdateTime } = req.query;
    
    // Generate mock real-time updates
    const updates = [
      {
        type: 'traffic',
        message: 'Light traffic ahead - no delays expected',
        timestamp: new Date(),
        severity: 'info'
      },
      {
        type: 'weather',
        message: 'Clear skies - perfect for sightseeing!',
        timestamp: new Date(),
        severity: 'info'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        updates,
        nextUpdateIn: 40000 // 40 seconds
      }
    });
  } catch (error) {
    console.error('Real-time updates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get updates',
      error: error.message
    });
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

// ADDED FROM FIRST VERSION: Helper functions for detailed plan generation
function getDifficultyLevel(places) {
  const avgDuration = places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0) / places.length;
  const hasComplexPlaces = places.some(p => ['heritage', 'fort', 'nature'].includes(p.category));
  
  if (avgDuration > 150 || hasComplexPlaces) return 'Challenging';
  if (avgDuration > 90) return 'Moderate';
  return 'Easy';
}

function getExperienceLevel(places) {
  const avgRating = places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length;
  if (avgRating >= 4.0) return 'Premium';
  if (avgRating >= 3.5) return 'Good';
  return 'Standard';
}

function generateEnhancedTimeline(places, preferences, constraints) {
  const startTime = preferences?.startTime || '09:00';
  let currentTime = timeToMinutes(startTime);
  
  return places.map((place, index) => {
    const arrivalTime = currentTime;
    const visitDuration = place.averageVisitDuration || 90;
    const departureTime = arrivalTime + visitDuration;
    
    const timelineItem = {
      time: minutesToTime(arrivalTime),
      endTime: minutesToTime(departureTime),
      place,
      duration: visitDuration,
      activities: getPlaceActivities(place),
      tips: getPlaceTips(place),
      mealSuggestion: getMealSuggestion(arrivalTime),
      travel: index < places.length - 1 ? {
        duration: 45,
        mode: 'car',
        distance: 25
      } : null
    };
    
    currentTime = departureTime + (index < places.length - 1 ? 45 : 0);
    return timelineItem;
  });
}

function generateEnhancedRecommendations(places, preferences) {
  return {
    photography: places.filter(p => ['palace', 'heritage', 'fort'].includes(p.category)).slice(0, 3),
    cultural: places.filter(p => p.category === 'temple').slice(0, 2),
    nature: places.filter(p => ['hill-station', 'beach', 'nature'].includes(p.category)).slice(0, 2),
    timing: [
      'Start early to avoid crowds and heat',
      'Carry sufficient water and energy snacks',
      'Wear comfortable walking shoes',
      'Respect local customs and dress codes',
      'Keep important documents safe and accessible'
    ],
    budgetTips: [
      'Many temples have free entry - take advantage of these cultural experiences',
      'Pack lunch to save money, especially for longer visits',
      'Negotiate taxi fares in advance for better rates',
      'Carry small denominations for entry fees and donations'
    ]
  };
}

function generateLogisticsInfo(places, preferences) {
  const hasTemples = places.some(p => p.category === 'temple');
  const hasOutdoorSites = places.some(p => ['fort', 'heritage', 'nature'].includes(p.category));
  
  return {
    transportation: 'Private car/taxi recommended for flexibility and comfort',
    parking: 'Most attractions have parking facilities - expect ₹10-50 parking fees',
    restrooms: 'Available at major attractions and restaurants along the route',
    food: 'Local restaurants available near most destinations - South Indian cuisine recommended',
    shopping: hasTemples ? 'Temple souvenir shops available for religious items and local crafts' : 'Local markets near heritage sites',
    accessibility: hasTemples ? 'Temple visits require removing footwear - carry socks' : 'Most sites have reasonable accessibility',
    emergency: '108 for medical emergencies, 100 for police, tourist helpline numbers available',
    connectivity: 'Good mobile network coverage in most areas - download offline maps as backup'
  };
}

function generateCulturalTips(places) {
  const tips = ['Learn basic Tamil/local language greetings', 'Try authentic South Indian cuisine at each stop'];
  
  if (places.some(p => p.category === 'temple')) {
    tips.push('Remove footwear before entering temples');
    tips.push('Dress modestly - cover shoulders and legs at religious sites');
    tips.push('Maintain silence and respect during prayer times');
    tips.push('Photography may be restricted in some temple areas');
  }
  
  if (places.some(p => p.category === 'heritage')) {
    tips.push('Hire local guides for historical context and stories');
    tips.push('Respect photography restrictions at heritage monuments');
  }
  
  if (places.some(p => p.category === 'palace')) {
    tips.push('Audio guides often available at palaces - worth the investment');
  }
  
  tips.push('Bargain respectfully at local markets');
  tips.push('Be patient with local customs and traditions');
  
  return tips;
}

function generateBudgetBreakdown(places, routeMetrics) {
  const entryFees = places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0);
  const transportCost = Math.round((routeMetrics?.totalDistance || 100) * 8); // ₹8 per km estimate
  const foodCost = places.length * 200; // ₹200 per place for meals/snacks
  
  return {
    entryFees: `₹${entryFees}`,
    transportation: `₹${transportCost} (estimated ₹8/km)`,
    food: `₹${foodCost} (₹200 per location average)`,
    miscellaneous: `₹${Math.round(places.length * 100)} (parking, tips, souvenirs)`,
    total: `₹${entryFees + transportCost + foodCost + (places.length * 100)}`
  };
}

function generatePackingList(places) {
  const packingItems = ['Water bottle (essential)', 'Comfortable walking shoes', 'Camera or smartphone', 'Power bank', 'Small backpack or day bag'];
  
  if (places.some(p => p.category === 'temple')) {
    packingItems.push('Socks (for temple visits)');
    packingItems.push('Modest clothing (covering shoulders and legs)');
  }
  
  if (places.some(p => ['beach', 'nature', 'fort'].includes(p.category))) {
    packingItems.push('Sunscreen and hat');
    packingItems.push('Light rain jacket (seasonal)');
  }
  
  packingItems.push('Cash in small denominations');
  packingItems.push('Government ID proof');
  packingItems.push('Emergency contact numbers');
  
  return packingItems;
}

function generateWeatherTips(places) {
  const hasOutdoor = places.some(p => !['museum'].includes(p.category));
  
  if (hasOutdoor) {
    return 'Check weather forecast before departure. Carry light rain protection during monsoon season (June-October). Summer visits (March-May) require sun protection and extra hydration.';
  }
  
  return 'Mostly indoor attractions - weather impact minimal. Still carry basics like water and light jacket.';
}

function getPlaceActivities(place) {
  const activities = {
    'temple': ['Darshan and prayers', 'Architecture photography', 'Cultural immersion', 'Peaceful meditation'],
    'palace': ['Royal architecture tour', 'Museum exploration', 'Garden walk', 'Photography'],
    'heritage': ['Historical tour', 'Archaeological exploration', 'Photography', 'Cultural learning'],
    'fort': ['Historical exploration', 'Panoramic city views', 'Photography', 'Architecture study'],
    'beach': ['Beach walks', 'Water activities', 'Sunset viewing', 'Photography'],
    'hill-station': ['Nature walks', 'Scenic photography', 'Cool climate enjoyment', 'Fresh air'],
    'nature': ['Nature photography', 'Wildlife observation', 'Fresh air', 'Peaceful environment'],
    'museum': ['Educational exhibits', 'Art appreciation', 'Cultural learning', 'Photography (if allowed)']
  };
  
  return activities[place.category] || ['Sightseeing', 'Photography', 'Cultural experience'];
}

function getPlaceTips(place) {
  const tips = {
    'temple': ['Dress modestly', 'Remove footwear', 'Maintain silence', 'Respect photography rules'],
    'palace': ['Book guided tours if available', 'Check photography rules', 'Allow 2-3 hours', 'Visit gardens if present'],
    'heritage': ['Hire local guide for context', 'Carry water', 'Wear sun protection', 'Start early to avoid crowds'],
    'fort': ['Wear comfortable shoes', 'Carry water', 'Best visited morning/evening', 'Bring camera for views'],
    'beach': ['Apply sunscreen', 'Stay hydrated', 'Check tide timings', 'Avoid midday sun'],
    'hill-station': ['Carry light jacket', 'Check weather conditions', 'Book early if staying overnight', 'Enjoy cool climate'],
    'nature': ['Respect natural environment', 'Don\'t disturb wildlife', 'Carry insect repellent', 'Stay on marked paths'],
    'museum': ['Check opening hours', 'Allow sufficient time', 'Audio guides recommended', 'No flash photography usually']
  };
  
  return tips[place.category] || ['Plan sufficient time', 'Carry essentials', 'Follow local guidelines'];
}

function getMealSuggestion(arrivalTime) {
  if (arrivalTime >= 720 && arrivalTime <= 840) { // 12:00-14:00
    return 'Perfect timing for lunch break at nearby restaurants';
  } else if (arrivalTime >= 1020 && arrivalTime <= 1080) { // 17:00-18:00
    return 'Good time for evening snacks or early dinner';
  } else if (arrivalTime < 600) { // Before 10:00
    return 'Early visit - have breakfast before or pack energy snacks';
  }
  return null;
}

// Helper functions
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

module.exports = router;

// Export route information for documentation
module.exports.routeInfo = {
  prefix: '/api/trips',
  version: '2.0',
  totalRoutes: 22, // Updated count with added routes
  categories: {
    optimization: 2,
    detailedPlanning: 2, // Both endpoints
    suggestions: 2,
    distance: 6,
    map: 5,
    utility: 3,
    realTime: 3, // Added real-time tracking routes
    algorithmExplanation: 1 // Added algorithm explanation
  },
  detailedPlanEndpoints: [
    '/api/trips/generate-detailed-plan',
    '/api/trips/detailed-plan'
  ],
  newFeatures: [
    'AI Algorithm Explanation',
    'Real-time Trip Tracking',
    'Enhanced Detailed Planning with Fallback',
    'Comprehensive Helper Functions',
    'Cultural Tips and Recommendations',
    'Budget Breakdown and Packing Lists'
  ]
};