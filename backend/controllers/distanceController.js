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