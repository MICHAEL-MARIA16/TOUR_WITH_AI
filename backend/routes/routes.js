// backend/routes/routes.js
const express = require('express');
const router = express.Router();
const {
  optimizeRoute,
  getDistanceBetweenPlaces,
  getSuggestedRoutes,
  getTravelMatrix
} = require('../controllers/routeController');

// Request logging middleware
router.use((req, res, next) => {
  console.log(`Route API: ${req.method} ${req.originalUrl}`);
  next();
});

// Request validation middleware for route optimization
const validateOptimizationRequest = (req, res, next) => {
  const { placeIds } = req.body;
  
  if (!placeIds || !Array.isArray(placeIds)) {
    return res.status(400).json({
      success: false,
      message: 'placeIds array is required'
    });
  }
  
  if (placeIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one place is required'
    });
  }
  
  if (placeIds.length > 15) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 15 places can be optimized at once'
    });
  }
  
  next();
};

// POST  - Optimize route for selected places
// Body: { 
//   placeIds: array, 
//   startTime?: string, 
//   totalTimeAvailable?: number, 
//   startDay?: number, 
//   optimizationLevel?: string 
// }
router.post('/optimize', validateOptimizationRequest, optimizeRoute);

// GET /api/routes/suggestions - Get suggested routes based on preferences
// Query params: timeAvailable, interests, startLocation, maxPlaces
router.get('/suggestions', (req, res, next) => {
  // Convert comma-separated interests to array
  if (req.query.interests && typeof req.query.interests === 'string') {
    req.query.interests = req.query.interests.split(',').map(s => s.trim());
  }
  next();
}, getSuggestedRoutes);

// GET /api/routes/distance/:fromPlaceId/:toPlaceId - Get distance and travel time between two places
router.get('/distance/:fromPlaceId/:toPlaceId', (req, res, next) => {
  const { fromPlaceId, toPlaceId } = req.params;
  
  if (!fromPlaceId || !toPlaceId) {
    return res.status(400).json({
      success: false,
      message: 'Both fromPlaceId and toPlaceId are required'
    });
  }
  
  if (fromPlaceId === toPlaceId) {
    return res.status(400).json({
      success: false,
      message: 'Source and destination cannot be the same'
    });
  }
  
  next();
}, getDistanceBetweenPlaces);

// POST /api/routes/matrix - Get travel matrix for multiple places
// Body: { placeIds: array }
router.post('/matrix', (req, res, next) => {
  const { placeIds } = req.body;
  
  if (!placeIds || !Array.isArray(placeIds)) {
    return res.status(400).json({
      success: false,
      message: 'placeIds array is required'
    });
  }
  
  if (placeIds.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'At least 2 places are required for matrix calculation'
    });
  }
  
  if (placeIds.length > 10) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 10 places allowed for matrix calculation to avoid timeout'
    });
  }
  
  next();
}, getTravelMatrix);

// GET /api/routes/health - Health check for route optimization service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Route optimization service is operational',
    services: {
      googleMaps: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'missing',
      pathOptimizer: 'ready',
      database: 'connected'
    },
    capabilities: {
      maxPlacesOptimization: 15,
      maxPlacesMatrix: 10,
      algorithms: ['greedy', 'dynamic-programming']
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/routes/algorithms - Get information about available optimization algorithms
router.get('/algorithms', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      fast: {
        name: 'Greedy Nearest Neighbor',
        description: 'Quick optimization suitable for most cases',
        maxPlaces: 15,
        averageTime: '1-3 seconds',
        accuracy: 'Good'
      },
      optimal: {
        name: 'Dynamic Programming TSP',
        description: 'Optimal solution for smaller sets',
        maxPlaces: 10,
        averageTime: '3-10 seconds',
        accuracy: 'Optimal'
      }
    }
  });
});

// POST /api/routes/validate - Validate a route without optimization
router.post('/validate', async (req, res) => {
  try {
    const { placeIds, timeConstraints } = req.body;
    
    if (!placeIds || !Array.isArray(placeIds)) {
      return res.status(400).json({
        success: false,
        message: 'placeIds array is required'
      });
    }
    
    // Import Place model to validate places exist
    const Place = require('../models/Place');
    const places = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ],
      isActive: true
    });
    
    const validation = {
      totalPlacesRequested: placeIds.length,
      validPlaces: places.length,
      invalidPlaces: placeIds.length - places.length,
      estimatedTotalTime: places.reduce((sum, place) => sum + place.averageVisitDuration, 0),
      feasible: timeConstraints ? 
        places.reduce((sum, place) => sum + place.averageVisitDuration, 0) <= timeConstraints.totalTimeAvailable :
        true
    };
    
    res.status(200).json({
      success: true,
      data: {
        validation,
        places: places.map(p => ({
          id: p.id,
          name: p.name,
          city: p.city,
          averageVisitDuration: p.averageVisitDuration
        }))
      }
    });
    
  } catch (error) {
    console.error('Route validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating route',
      error: error.message
    });
  }
});

// Error handling middleware specific to route routes
router.use((error, req, res, next) => {
  console.error('Route optimization error:', error);
  
  // Handle Google Maps API errors
  if (error.message && error.message.includes('Google Maps')) {
    return res.status(503).json({
      success: false,
      message: 'Route optimization service temporarily unavailable',
      fallbackAvailable: true
    });
  }
  
  // Handle timeout errors
  if (error.code === 'TIMEOUT' || error.message.includes('timeout')) {
    return res.status(408).json({
      success: false,
      message: 'Request timeout. Try with fewer places or use fast optimization.',
      suggestion: 'Reduce number of places or use "fast" optimization level'
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Route optimization error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;