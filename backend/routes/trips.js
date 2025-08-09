// backend/routes/trips.js
const express = require('express');
const router = express.Router();
const {
  generateTrip,
  getTripSuggestions,
  optimizeTrip,
  getTravelMatrix,
  getUserTrips,
  getTripById,
  analyzeTrip
} = require('../controllers/tripController');

// Request logging middleware
router.use((req, res, next) => {
  console.log(`Trip API: ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Input validation middleware
const validateTripGeneration = (req, res, next) => {
  const { preferences } = req.body;
  
  if (!preferences) {
    return res.status(400).json({
      success: false,
      message: 'Preferences object is required',
      required_fields: ['interests', 'budget', 'timeConstraints']
    });
  }
  
  if (preferences.budget && (typeof preferences.budget !== 'number' || preferences.budget < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Budget must be a positive number'
    });
  }
  
  if (preferences.interests && !Array.isArray(preferences.interests)) {
    return res.status(400).json({
      success: false,
      message: 'Interests must be an array'
    });
  }
  
  if (preferences.startLocation) {
    const { latitude, longitude } = preferences.startLocation;
    if (!latitude || !longitude || 
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Valid start location coordinates required'
      });
    }
  }
  
  next();
};

const validateOptimizationRequest = (req, res, next) => {
  const { places } = req.body;
  
  if (!places || !Array.isArray(places)) {
    return res.status(400).json({
      success: false,
      message: 'Places array is required'
    });
  }
  
  if (places.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'At least 2 places required for optimization'
    });
  }
  
  if (places.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 20 places allowed for optimization'
    });
  }
  
  next();
};

const validateMatrixRequest = (req, res, next) => {
  const { places } = req.body;
  
  if (!places || !Array.isArray(places)) {
    return res.status(400).json({
      success: false,
      message: 'Places array is required'
    });
  }
  
  if (places.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'At least 2 places required for matrix calculation'
    });
  }
  
  if (places.length > 12) {
    return res.status(400).json({
      success: false,
      message: 'Maximum 12 places allowed for matrix calculation'
    });
  }
  
  next();
};

// Rate limiting for intensive operations
const intensiveOperationLimiter = (req, res, next) => {
  // Add rate limiting logic here if needed
  // For now, just pass through
  next();
};

/**
 * CORE TRIP PLANNING ROUTES
 */

// POST /api/trips/generate - Generate optimized trip using greedy algorithm
// Body: { 
//   preferences: { interests, budget, timeConstraints, startLocation, accessibility },
//   constraints: { maxPlaces, strategy },
//   userId?: string,
//   tripName?: string 
// }
router.post('/generate', 
  validateTripGeneration, 
  intensiveOperationLimiter, 
  generateTrip
);

// GET /api/trips/suggestions - Get AI-powered trip suggestions
// Query: city, interests, duration, budget, groupType, season
router.get('/suggestions', (req, res, next) => {
  // Convert comma-separated interests to array
  if (req.query.interests && typeof req.query.interests === 'string') {
    req.query.interests = req.query.interests.split(',').map(s => s.trim());
  }
  next();
}, getTripSuggestions);

// POST /api/trips/optimize - Optimize existing trip route
// Body: { 
//   places: array, 
//   startLocation?: object, 
//   constraints?: object, 
//   optimizationGoal?: string 
// }
router.post('/optimize', 
  validateOptimizationRequest, 
  intensiveOperationLimiter, 
  optimizeTrip
);

// POST /api/trips/matrix - Get travel time/distance matrix
// Body: { places: array }
router.post('/matrix', 
  validateMatrixRequest, 
  getTravelMatrix
);

// POST /api/trips/analyze - Analyze trip performance and get recommendations
// Body: { places: array, constraints?: object }
router.post('/analyze', (req, res, next) => {
  const { places } = req.body;
  
  if (!places || !Array.isArray(places) || places.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Places array is required for analysis'
    });
  }
  
  next();
}, analyzeTrip);

/**
 * TRIP MANAGEMENT ROUTES
 */

// GET /api/trips/user/:userId - Get all trips for a user
// Query: status, sortBy, sortOrder, limit, page
router.get('/user/:userId', (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  next();
}, getUserTrips);

// GET /api/trips/:tripId - Get specific trip by ID
router.get('/:tripId', (req, res, next) => {
  const { tripId } = req.params;
  
  if (!tripId || tripId.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Valid trip ID is required'
    });
  }
  
  next();
}, getTripById);

// PUT /api/trips/:tripId - Update trip details
router.put('/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const updateData = req.body;
    
    // Import Trip model
    const { Trip } = require('../models/Trip');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'tags', 'schedule', 'preferences'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        trip[field] = updateData[field];
      }
    });
    
    await trip.save();
    
    res.status(200).json({
      success: true,
      data: trip,
      message: 'Trip updated successfully'
    });
    
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/trips/:tripId - Delete trip
router.delete('/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { userId } = req.query; // Optional: verify ownership
    
    const { Trip } = require('../models/Trip');
    
    let query = { _id: tripId };
    if (userId) {
      query.userId = userId;
    }
    
    const trip = await Trip.findOneAndDelete(query);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or not authorized'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully',
      deletedTrip: {
        id: trip._id,
        name: trip.name
      }
    });
    
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * TRIP PROGRESS AND TRACKING ROUTES
 */

// POST /api/trips/:tripId/start - Start a trip
router.post('/:tripId/start', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { startLocation } = req.body;
    
    const { Trip } = require('../models/Trip');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    if (trip.status !== 'planned') {
      return res.status(400).json({
        success: false,
        message: 'Trip must be in planned status to start'
      });
    }
    
    trip.status = 'active';
    trip.progress.startedAt = new Date();
    trip.progress.lastUpdated = new Date();
    
    if (startLocation) {
      trip.preferences.startLocation = startLocation;
    }
    
    await trip.save();
    
    res.status(200).json({
      success: true,
      data: trip,
      message: 'Trip started successfully'
    });
    
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting trip'
    });
  }
});

// POST /api/trips/:tripId/visit/:placeId - Mark place as visited
router.post('/:tripId/visit/:placeId', async (req, res) => {
  try {
    const { tripId, placeId } = req.params;
    const { rating, notes, photos } = req.body;
    
    const { Trip } = require('../models/Trip');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    trip.visitPlace(placeId, rating, notes);
    
    if (photos && Array.isArray(photos)) {
      const place = trip.places.find(p => p.placeId === placeId);
      if (place) {
        place.photos = photos;
      }
    }
    
    await trip.save();
    
    const remainingMetrics = trip.getRemainingMetrics();
    
    res.status(200).json({
      success: true,
      data: {
        trip: trip.generateSummary(),
        remainingMetrics,
        nextPlace: trip.getNextPlace()
      },
      message: 'Place marked as visited'
    });
    
  } catch (error) {
    console.error('Visit place error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating place visit status'
    });
  }
});

// GET /api/trips/:tripId/progress - Get trip progress
router.get('/:tripId/progress', async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const { Trip } = require('../models/Trip');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    const summary = trip.generateSummary();
    const remainingMetrics = trip.getRemainingMetrics();
    const nextPlace = trip.getNextPlace();
    const currentPlace = trip.getCurrentPlace();
    
    res.status(200).json({
      success: true,
      data: {
        summary,
        remainingMetrics,
        nextPlace,
        currentPlace,
        progressPercentage: trip.progressPercentage,
        visitedPlaces: trip.places.filter(p => p.visited),
        unvisitedPlaces: trip.places.filter(p => !p.visited)
      }
    });
    
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip progress'
    });
  }
});

// POST /api/trips/:tripId/complete - Complete trip and add feedback
router.post('/:tripId/complete', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { overallRating, comments, wouldRecommend, improvements } = req.body;
    
    const { Trip } = require('../models/Trip');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    trip.status = 'completed';
    trip.feedback = {
      overallRating,
      comments,
      wouldRecommend,
      improvements,
      ratedAt: new Date()
    };
    
    await trip.save();
    
    res.status(200).json({
      success: true,
      data: trip.generateSummary(),
      message: 'Trip completed successfully'
    });
    
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing trip'
    });
  }
});

/**
 * SHARING AND DISCOVERY ROUTES
 */

// POST /api/trips/:tripId/share - Share trip publicly or with specific users
router.post('/:tripId/share', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { isPublic, shareWith } = req.body;
    
    const { Trip } = require('../models/Trip');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    trip.sharing.isPublic = isPublic;
    
    if (shareWith && Array.isArray(shareWith)) {
      trip.sharing.sharedWith = shareWith.map(userId => ({
        userId,
        permission: 'view',
        sharedAt: new Date()
      }));
    }
    
    await trip.save();
    
    res.status(200).json({
      success: true,
      data: {
        shareToken: trip.sharing.shareToken,
        isPublic: trip.sharing.isPublic,
        sharedWith: trip.sharing.sharedWith
      },
      message: 'Trip sharing updated successfully'
    });
    
  } catch (error) {
    console.error('Share trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating trip sharing'
    });
  }
});

// GET /api/trips/public - Get public trips for discovery
router.get('/public', async (req, res) => {
  try {
    const { 
      city, 
      interests, 
      duration, 
      rating = 3, 
      limit = 20, 
      page = 1 
    } = req.query;
    
    const { Trip } = require('../models/Trip');
    
    const filters = { 
      city, 
      interests: interests ? interests.split(',') : undefined, 
      duration, 
      rating: parseFloat(rating) 
    };
    
    const publicTrips = await Trip.findPublicTrips(filters);
    
    res.status(200).json({
      success: true,
      data: publicTrips,
      count: publicTrips.length,
      filters: filters
    });
    
  } catch (error) {
    console.error('Get public trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching public trips'
    });
  }
});

// GET /api/trips/:tripId/similar - Get similar trips
router.get('/:tripId/similar', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { limit = 5 } = req.query;
    
    const { Trip } = require('../models/Trip');
    
    const similarTrips = await Trip.findSimilarTrips(tripId);
    
    res.status(200).json({
      success: true,
      data: similarTrips.slice(0, parseInt(limit))
    });
    
  } catch (error) {
    console.error('Get similar trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding similar trips'
    });
  }
});

/**
 * ANALYTICS AND STATISTICS ROUTES
 */

// GET /api/trips/stats/user/:userId - Get user trip statistics
router.get('/stats/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { Trip } = require('../models/Trip');
    
    const stats = await Trip.getTripStatistics(userId);
    
    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalTrips: 0,
        completedTrips: 0,
        totalPlacesVisited: 0,
        totalDistanceTraveled: 0,
        completionRate: 0
      }
    });
    
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
});

// GET /api/trips/stats/global - Get global trip statistics
router.get('/stats/global', async (req, res) => {
  try {
    const { Trip } = require('../models/Trip');
    
    const stats = await Trip.getTripStatistics();
    
    res.status(200).json({
      success: true,
      data: stats[0] || {}
    });
    
  } catch (error) {
    console.error('Get global stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching global statistics'
    });
  }
});

/**
 * HEALTH AND UTILITY ROUTES
 */

// GET /api/trips/health - Health check for trip service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Trip Planning Service',
    status: 'operational',
    features: {
      tripGeneration: 'active',
      routeOptimization: 'active',
      travelMatrix: 'active',
      tripAnalysis: 'active',
      progressTracking: 'active',
      publicSharing: 'active'
    },
    algorithms: {
      greedy: 'active',
      balanced: 'active',
      distance: 'active',
      rating: 'active',
      time: 'active'
    },
    version: '2.0',
    timestamp: new Date().toISOString()
  });
});

// GET /api/trips/algorithms - Get available optimization algorithms
router.get('/algorithms', (req, res) => {
  res.status(200).json({
    success: true,
    algorithms: {
      greedy: {
        name: 'Greedy Selection',
        description: 'Fast algorithm that picks best available option at each step',
        best_for: 'Quick optimization with good results',
        time_complexity: 'O(n²)',
        max_places: 20
      },
      balanced: {
        name: 'Balanced Multi-Criteria',
        description: 'Considers multiple factors: rating, distance, time, cost',
        best_for: 'Most practical real-world trips',
        time_complexity: 'O(n² log n)',
        max_places: 15
      },
      distance: {
        name: 'Distance Minimization',
        description: 'Minimizes total travel distance using nearest neighbor',
        best_for: 'Fuel efficiency and less travel time',
        time_complexity: 'O(n²)',
        max_places: 20
      },
      rating: {
        name: 'Rating Maximization',
        description: 'Prioritizes highest-rated attractions',
        best_for: 'Quality-focused experiences',
        time_complexity: 'O(n log n)',
        max_places: 25
      },
      time: {
        name: 'Time Optimization',
        description: 'Maximizes places visited within time constraints',
        best_for: 'Time-limited trips',
        time_complexity: 'O(n²)',
        max_places: 15
      }
    }
  });
});

/**
 * ERROR HANDLING MIDDLEWARE
 */

// Trip-specific error handler
router.use((error, req, res, next) => {
  console.error('Trip service error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry'
    });
  }
  
  // Optimization timeout
  if (error.message.includes('timeout') || error.code === 'TIMEOUT') {
    return res.status(408).json({
      success: false,
      message: 'Optimization took too long. Try with fewer places or simpler constraints.',
      suggestion: 'Use fast algorithm or reduce number of places'
    });
  }
  
  // Google Maps API errors
  if (error.message.includes('Google Maps') || error.message.includes('API quota')) {
    return res.status(503).json({
      success: false,
      message: 'External mapping service temporarily unavailable',
      fallback: 'Using estimated distances based on coordinates'
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Trip service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;