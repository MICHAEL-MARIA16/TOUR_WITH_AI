// backend/controllers/mapController.js
const Place = require('../models/Place');
const DistanceCalculator = require('../utils/distanceCalculator');

class MapController {
  constructor() {
  this.distanceCalculator = new DistanceCalculator();
  
  this.getMapBounds = this.getMapBounds.bind(this);
  this.getPlacesInBounds = this.getPlacesInBounds.bind(this);
  this.getOptimizedRoute = this.getOptimizedRoute.bind(this);
  this.getClusteredMarkers = this.getClusteredMarkers.bind(this);
  this.getHeatmapData = this.getHeatmapData.bind(this);
}


  /**
   * Get map bounds containing all places
   * Essential for Leaflet.js initial map view
   */
  async getMapBounds(req, res) {
    try {
      const { category, city, state } = req.query;
      
      let query = { isActive: true };
      if (category) query.category = category.toLowerCase();
      if (city) query.city = { $regex: city, $options: 'i' };
      if (state) query.state = { $regex: state, $options: 'i' };

      const places = await Place.find(query)
        .select('location name')
        .lean();

      if (places.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No places found for the given criteria'
        });
      }

      // Calculate bounds for Leaflet fitBounds()
      const latitudes = places.map(p => p.location.latitude);
      const longitudes = places.map(p => p.location.longitude);

      const bounds = {
        northEast: {
          lat: Math.max(...latitudes),
          lng: Math.max(...longitudes)
        },
        southWest: {
          lat: Math.min(...latitudes),
          lng: Math.min(...longitudes)
        }
      };

      // Calculate center point
      const center = {
        lat: (bounds.northEast.lat + bounds.southWest.lat) / 2,
        lng: (bounds.northEast.lng + bounds.southWest.lng) / 2
      };

      // Calculate appropriate zoom level
      const latDiff = bounds.northEast.lat - bounds.southWest.lat;
      const lngDiff = bounds.northEast.lng - bounds.southWest.lng;
      const maxDiff = Math.max(latDiff, lngDiff);
      
      let zoomLevel = 10; // Default zoom
      if (maxDiff < 0.1) zoomLevel = 13;
      else if (maxDiff < 0.5) zoomLevel = 11;
      else if (maxDiff < 1) zoomLevel = 10;
      else if (maxDiff < 5) zoomLevel = 8;
      else zoomLevel = 6;

      res.status(200).json({
        success: true,
        data: {
          bounds: {
            northEast: [bounds.northEast.lat, bounds.northEast.lng],
            southWest: [bounds.southWest.lat, bounds.southWest.lng]
          },
          center: [center.lat, center.lng],
          zoom: zoomLevel,
          totalPlaces: places.length
        }
      });

    } catch (error) {
      console.error('Error getting map bounds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate map bounds',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get places within viewport bounds
   * Called when user pans/zooms Leaflet map
   */
  async getPlacesInBounds(req, res) {
    try {
      const { 
        north, 
        south, 
        east, 
        west,
        category,
        minRating = 0,
        limit = 100
      } = req.query;

      // Validate bounds
      if (!north || !south || !east || !west) {
        return res.status(400).json({
          success: false,
          message: 'Missing bounds parameters: north, south, east, west required'
        });
      }

      const northNum = parseFloat(north);
      const southNum = parseFloat(south);
      const eastNum = parseFloat(east);
      const westNum = parseFloat(west);

      // Build query for places within bounds
      let query = {
        isActive: true,
        'location.latitude': { $gte: southNum, $lte: northNum },
        'location.longitude': { $gte: westNum, $lte: eastNum },
        rating: { $gte: parseFloat(minRating) }
      };

      if (category) {
        const categories = category.split(',').map(cat => cat.trim().toLowerCase());
        query.category = { $in: categories };
      }

      const places = await Place.find(query)
        .sort({ rating: -1 })
        .limit(parseInt(limit))
        .select('-__v')
        .lean();

      // Format for Leaflet markers
      const markers = places.map(place => ({
        id: place._id,
        position: [place.location.latitude, place.location.longitude],
        name: place.name,
        category: place.category,
        city: place.city,
        rating: place.rating,
        entryFee: place.entryFee,
        averageVisitDuration: place.averageVisitDuration,
        description: place.description.substring(0, 150) + '...'
      }));

      res.status(200).json({
        success: true,
        bounds: { north: northNum, south: southNum, east: eastNum, west: westNum },
        count: markers.length,
        data: markers
      });

    } catch (error) {
      console.error('Error getting places in bounds:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get places in bounds',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get optimized route for Leaflet polyline rendering
   */
  async getOptimizedRoute(req, res) {
    try {
      const { placeIds, startLocation } = req.body;

      if (!placeIds || !Array.isArray(placeIds) || placeIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Minimum 2 place IDs required'
        });
      }

      // Get place details
      const places = await Place.find({
        _id: { $in: placeIds },
        isActive: true
      }).select('name location averageVisitDuration rating').lean();

      if (places.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Not enough valid places found'
        });
      }

      // Optimize route using existing distance calculator
      const optimizedPlaces = await this.distanceCalculator.findOptimalRoute(
        places.map(p => ({ ...p, location: p.location })),
        startLocation
      );

      // Create route coordinates for Leaflet polyline
      const routeCoordinates = optimizedPlaces.map(place => [
        place.location.latitude,
        place.location.longitude
      ]);

      // Add start location if provided
      if (startLocation) {
        routeCoordinates.unshift([startLocation.latitude, startLocation.longitude]);
      }

      // Calculate route metrics
      const metrics = await this.distanceCalculator.calculateRouteMetrics(
        optimizedPlaces,
        startLocation
      );

      // Format waypoints for Leaflet markers
      const waypoints = optimizedPlaces.map((place, index) => ({
        id: place._id,
        position: [place.location.latitude, place.location.longitude],
        name: place.name,
        order: index + 1,
        rating: place.rating,
        visitDuration: place.averageVisitDuration
      }));

      res.status(200).json({
        success: true,
        data: {
          waypoints,
          routeCoordinates,
          metrics: {
            totalDistance: metrics.totalDistance,
            totalTime: metrics.totalTime,
            totalDistanceText: metrics.totalDistanceText,
            totalTimeText: metrics.totalTimeText
          }
        }
      });

    } catch (error) {
      console.error('Error optimizing route:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to optimize route',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get clustered markers for better map performance
   */
  async getClusteredMarkers(req, res) {
    try {
      const { 
        zoom, 
        bounds, 
        category,
        clusterRadius = 50 // pixels
      } = req.query;

      const zoomLevel = parseInt(zoom) || 10;
      
      // Determine clustering strategy based on zoom level
      let shouldCluster = zoomLevel < 12;
      let query = { isActive: true };

      if (category) {
        const categories = category.split(',').map(cat => cat.trim().toLowerCase());
        query.category = { $in: categories };
      }

      // Add bounds filter if provided
      if (bounds) {
        const { north, south, east, west } = JSON.parse(bounds);
        query['location.latitude'] = { $gte: south, $lte: north };
        query['location.longitude'] = { $gte: west, $lte: east };
      }

      const places = await Place.find(query)
        .select('name location category rating')
        .lean();

      let result;

      if (shouldCluster && places.length > 20) {
        // Group nearby places into clusters
        const clusters = this.distanceCalculator.clusterPlacesByProximity(
          places,
          this.getClusterDistanceForZoom(zoomLevel)
        );

        result = {
          type: 'clustered',
          clusters: clusters.map(cluster => ({
            center: [cluster.center.latitude, cluster.center.longitude],
            count: cluster.places.length,
            radius: cluster.radius,
            places: cluster.places.map(p => ({
              id: p._id,
              name: p.name,
              category: p.category,
              rating: p.rating
            }))
          }))
        };
      } else {
        // Return individual markers
        result = {
          type: 'individual',
          markers: places.map(place => ({
            id: place._id,
            position: [place.location.latitude, place.location.longitude],
            name: place.name,
            category: place.category,
            rating: place.rating
          }))
        };
      }

      res.status(200).json({
        success: true,
        zoom: zoomLevel,
        totalPlaces: places.length,
        data: result
      });

    } catch (error) {
      console.error('Error getting clustered markers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get clustered markers',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get heatmap data for Leaflet heat layer
   */
  async getHeatmapData(req, res) {
    try {
      const { 
        category,
        metric = 'rating' // 'rating', 'popularity', 'density'
      } = req.query;

      let query = { isActive: true };
      if (category) {
        const categories = category.split(',').map(cat => cat.trim().toLowerCase());
        query.category = { $in: categories };
      }

      const places = await Place.find(query)
        .select('location rating averageVisitDuration')
        .lean();

      // Convert to heatmap format: [lat, lng, intensity]
      const heatmapData = places.map(place => {
        let intensity;
        
        switch (metric) {
          case 'rating':
            intensity = place.rating / 5; // Normalize to 0-1
            break;
          case 'popularity':
            intensity = Math.min(place.rating * 0.2, 1); // Rating-based popularity
            break;
          case 'density':
            intensity = 0.5; // Fixed intensity for density visualization
            break;
          default:
            intensity = place.rating / 5;
        }

        return [
          place.location.latitude,
          place.location.longitude,
          intensity
        ];
      });

      res.status(200).json({
        success: true,
        metric,
        count: heatmapData.length,
        data: heatmapData
      });

    } catch (error) {
      console.error('Error getting heatmap data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get heatmap data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Helper method to determine cluster distance based on zoom level
   */
  getClusterDistanceForZoom(zoom) {
    // Cluster distance in km based on zoom level
    const clusterDistances = {
      6: 100,  // Country level
      7: 75,   // State level
      8: 50,   // Region level
      9: 30,   // City cluster level
      10: 20,  // City level
      11: 10,  // District level
      12: 5    // Neighborhood level
    };
    
    return clusterDistances[zoom] || 25;
  }
}

module.exports = new MapController();