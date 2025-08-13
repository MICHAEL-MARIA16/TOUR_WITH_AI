// backend/routes/distance.js
const express = require('express');
const router = express.Router();
const distanceController = require('../controllers/distanceController');

// Middleware for request logging
router.use((req, res, next) => {
  console.log(`Distance API: ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// POST /api/distance/calculate - Calculate distance between two points
// Body: { origin: {lat, lng}, destination: {lat, lng}, mode?: string }
router.post('/calculate', distanceController.calculateDistance);

// POST /api/distance/matrix - Calculate distance matrix
// Body: { origins: [{lat, lng}], destinations: [{lat, lng}] }
router.post('/matrix', distanceController.calculateMatrix);

// POST /api/distance/optimize-route - Find optimal route order
// Body: { places: [{location: {lat, lng}, ...}], startLocation?: {lat, lng} }
router.post('/optimize-route', distanceController.findOptimalRoute);

// POST /api/distance/statistics - Get distance statistics for places
// Body: { places: [{location: {lat, lng}, ...}] }
router.post('/statistics', distanceController.getDistanceStatistics);

// POST /api/distance/cluster - Cluster places by proximity
// Body: { places: [{location: {lat, lng}, ...}], maxDistance?: number }
router.post('/cluster', distanceController.clusterPlaces);

// GET /api/distance/estimate-cost - Estimate travel cost
// Query: distance=123&mode=driving
router.get('/estimate-cost', distanceController.estimateTravelCost);

// GET /api/distance/cache-stats - Get cache statistics
router.get('/cache-stats', distanceController.getCacheStats);

// DELETE /api/distance/cache - Clear cache
router.delete('/cache', distanceController.clearCache);

// GET /api/distance/health - Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Distance calculation service is operational',
    features: {
      haversineCalculation: true,
      googleMapsIntegration: !!process.env.GOOGLE_MAPS_API_KEY,
      routeOptimization: true,
      clustering: true,
      caching: true,
      costEstimation: true
    },
    limits: {
      maxMatrixSize: 100,
      cacheSize: 5000,
      rateLimitMs: 100
    }
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Distance API error:', error);

  if (error.message && error.message.includes('Google Maps API')) {
    return res.status(503).json({
      success: false,
      message: 'External mapping service temporarily unavailable',
      fallback: 'Using fallback distance calculations'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Distance calculation service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;