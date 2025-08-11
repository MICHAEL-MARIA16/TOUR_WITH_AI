// backend/controllers/distanceController.js
const DistanceCalculator = require('../utils/distanceCalculator');

class DistanceController {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();
  }

  // Calculate distance between two points
  calculateDistance = async (req, res) => {
    try {
      const { origin, destination, mode = 'driving' } = req.body;

      // Validate input
      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination coordinates are required',
          example: {
            origin: { latitude: 13.0827, longitude: 80.2707 },
            destination: { latitude: 12.9716, longitude: 77.5946 }
          }
        });
      }

      // Validate coordinates
      if (!this.isValidCoordinate(origin.latitude, origin.longitude) ||
          !this.isValidCoordinate(destination.latitude, destination.longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates provided'
        });
      }

      // Calculate driving distance with Google Maps API
      const result = await this.distanceCalculator.calculateDrivingDistance(
        origin, 
        destination, 
        { mode }
      );

      // Also calculate straight-line distance for comparison
      const straightLineDistance = this.distanceCalculator.calculateDistance(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      );

      res.status(200).json({
        success: true,
        data: {
          origin,
          destination,
          driving: {
            distance: result.distance,
            duration: result.duration,
            durationInTraffic: result.durationInTraffic,
            distanceText: result.distanceText,
            durationText: result.durationText,
            durationInTrafficText: result.durationInTrafficText,
            isFallback: result.isFallback
          },
          straightLine: {
            distance: straightLineDistance,
            distanceText: `${straightLineDistance} km`
          },
          travelCost: this.distanceCalculator.estimateTravelCost(result.distance, mode)
        }
      });

    } catch (error) {
      console.error('Distance calculation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating distance',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Calculate distance matrix for multiple locations
  calculateMatrix = async (req, res) => {
    try {
      const { origins, destinations } = req.body;

      if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
        return res.status(400).json({
          success: false,
          message: 'Origins and destinations arrays are required'
        });
      }

      if (origins.length === 0 || destinations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Origins and destinations cannot be empty'
        });
      }

      if (origins.length * destinations.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Matrix too large. Maximum 100 origin-destination pairs allowed'
        });
      }

      // Validate all coordinates
      const allLocations = [...origins, ...destinations];
      for (const location of allLocations) {
        if (!this.isValidCoordinate(location.latitude, location.longitude)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid coordinates found',
            invalidLocation: location
          });
        }
      }

      const matrix = await this.distanceCalculator.calculateDistanceMatrix(origins, destinations);

      res.status(200).json({
        success: true,
        data: {
          origins,
          destinations,
          matrix,
          summary: {
            totalPairs: origins.length * destinations.length,
            originsCount: origins.length,
            destinationsCount: destinations.length
          }
        }
      });

    } catch (error) {
      console.error('Matrix calculation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating distance matrix',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Find optimal route using nearest neighbor
  findOptimalRoute = async (req, res) => {
    try {
      const { places, startLocation } = req.body;

      if (!places || !Array.isArray(places) || places.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Places array is required'
        });
      }

      // Validate places have required structure
      for (const place of places) {
        if (!place.location || !this.isValidCoordinate(place.location.latitude, place.location.longitude)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid place location found',
            place
          });
        }
      }

      const optimizedRoute = await this.distanceCalculator.findOptimalRoute(places, startLocation);
      const routeMetrics = await this.distanceCalculator.calculateRouteMetrics(optimizedRoute, startLocation);

      res.status(200).json({
        success: true,
        data: {
          originalOrder: places,
          optimizedRoute,
          metrics: routeMetrics,
          improvement: {
            message: places.length > 1 ? 'Route optimized using nearest neighbor algorithm' : 'Single place, no optimization needed'
          }
        }
      });

    } catch (error) {
      console.error('Route optimization error:', error);
      res.status(500).json({
        success: false,
        message: 'Error optimizing route',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Get distance statistics for a set of places
  getDistanceStatistics = async (req, res) => {
    try {
      const { places } = req.body;

      if (!places || !Array.isArray(places) || places.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 places are required for statistics'
        });
      }

      const statistics = await this.distanceCalculator.getDistanceStatistics(places);

      res.status(200).json({
        success: true,
        data: statistics
      });

    } catch (error) {
      console.error('Statistics calculation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Cluster places by proximity
  clusterPlaces = async (req, res) => {
    try {
      const { places, maxDistance = 25 } = req.body;

      if (!places || !Array.isArray(places) || places.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Places array is required'
        });
      }

      const maxDistanceNum = parseFloat(maxDistance);
      if (isNaN(maxDistanceNum) || maxDistanceNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid maxDistance. Must be a positive number'
        });
      }

      const clusters = this.distanceCalculator.clusterPlacesByProximity(places, maxDistanceNum);

      res.status(200).json({
        success: true,
        data: {
          clusters,
          summary: {
            totalPlaces: places.length,
            totalClusters: clusters.length,
            maxDistance: maxDistanceNum,
            avgPlacesPerCluster: places.length / clusters.length
          }
        }
      });

    } catch (error) {
      console.error('Clustering error:', error);
      res.status(500).json({
        success: false,
        message: 'Error clustering places',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Estimate travel cost
  estimateTravelCost = async (req, res) => {
    try {
      const { distance, mode = 'driving' } = req.query;

      const distanceNum = parseFloat(distance);
      if (isNaN(distanceNum) || distanceNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid distance parameter is required'
        });
      }

      const costEstimation = this.distanceCalculator.estimateTravelCost(distanceNum, mode);

      res.status(200).json({
        success: true,
        data: costEstimation
      });

    } catch (error) {
      console.error('Cost estimation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error estimating travel cost',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Get cache statistics
  getCacheStats = (req, res) => {
    try {
      const stats = this.distanceCalculator.getCacheStats();
      
      res.status(200).json({
        success: true,
        data: {
          cache: stats,
          performance: {
            rateLimit: '100ms between API calls',
            maxCacheSize: 5000,
            googleMapsApi: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'missing'
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting cache statistics'
      });
    }
  };

  // Clear cache
  clearCache = (req, res) => {
    try {
      this.distanceCalculator.reset();
      
      res.status(200).json({
        success: true,
        message: 'Distance calculator cache cleared successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error clearing cache'
      });
    }
  };

  // Helper method to validate coordinates
  isValidCoordinate(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
           lat >= -90 && lat <= 90 &&
           lon >= -180 && lon <= 180 &&
           !isNaN(lat) && !isNaN(lon);
  }
}

module.exports = new DistanceController();

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

// backend/app.js - Add the distance routes to your main app
const express = require('express');
const app = express();

// Import your existing routes
const placesRoutes = require('./routes/places');
const routeRoutes = require('./routes/routes');
const tripRoutes = require('./routes/trips');
const chatRoutes = require('./routes/chat');
const distanceRoutes = require('./routes/distance'); // Add this line

// Use routes
app.use('/api/places', placesRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/distance', distanceRoutes); // Add this line

module.exports = app;