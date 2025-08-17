// backend/routes/map.js
const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const osmHelpers = require('../utils/osmHelpers');
const leafletHelpers = require('../utils/leafletHelpers');

// Map bounds and viewport endpoints
router.get('/bounds', mapController.getMapBounds);
router.get('/places-in-bounds', mapController.getPlacesInBounds);

// Route optimization for maps
router.post('/optimize-route', mapController.getOptimizedRoute);

// Clustering and performance endpoints
router.get('/clustered-markers', mapController.getClusteredMarkers);
router.get('/heatmap-data', mapController.getHeatmapData);

// Geocoding endpoints using OSM
router.get('/geocode', async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 3 characters long'
      });
    }

    const results = await osmHelpers.geocodeAddress(query.trim(), {
      limit: parseInt(limit),
      countrycodes: 'in'
    });

    res.status(200).json({
      success: true,
      query: query.trim(),
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Geocoding failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reverse geocoding
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng, zoom = 18 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (!leafletHelpers.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const result = await osmHelpers.reverseGeocode(latitude, longitude, {
      zoom: parseInt(zoom)
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No address found for coordinates'
      });
    }

    res.status(200).json({
      success: true,
      coordinates: { latitude, longitude },
      data: result
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Reverse geocoding failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search Points of Interest using OSM
router.get('/search-poi', async (req, res) => {
  try {
    const { 
      bounds, 
      category, 
      limit = 50,
      timeout = 25 
    } = req.query;
    
    if (!bounds) {
      return res.status(400).json({
        success: false,
        message: 'Bounds parameter required (format: south,north,west,east)'
      });
    }

    const boundsArray = bounds.split(',').map(Number);
    if (boundsArray.length !== 4 || boundsArray.some(isNaN)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bounds format. Use: south,north,west,east'
      });
    }

    const pois = await osmHelpers.searchPOI(boundsArray, category || 'attraction', {
      timeout: parseInt(timeout),
      limit: parseInt(limit)
    });

    // Format for Leaflet
    const markers = leafletHelpers.formatPlacesForMarkers(
      pois.slice(0, parseInt(limit))
    );

    res.status(200).json({
      success: true,
      category: category || 'attraction',
      bounds: boundsArray,
      count: markers.length,
      data: markers
    });

  } catch (error) {
    console.error('POI search error:', error);
    res.status(500).json({
      success: false,
      message: 'POI search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get elevation data
router.get('/elevation', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (!leafletHelpers.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const elevation = await osmHelpers.getElevation(latitude, longitude);

    if (!elevation) {
      return res.status(404).json({
        success: false,
        message: 'Elevation data not available for this location'
      });
    }

    res.status(200).json({
      success: true,
      coordinates: { latitude, longitude },
      data: elevation
    });

  } catch (error) {
    console.error('Elevation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get elevation data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Calculate route using OSRM
router.post('/calculate-route', async (req, res) => {
  try {
    const { coordinates, profile = 'driving' } = req.body;
    
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 coordinates required'
      });
    }

    // Validate coordinates
    for (let coord of coordinates) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinate format. Use [[lat, lng], [lat, lng]]'
        });
      }
      
      if (!leafletHelpers.validateCoordinates(coord[0], coord[1])) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }
    }

    const route = await osmHelpers.calculateRoute(coordinates, profile);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route calculation failed'
      });
    }

    res.status(200).json({
      success: true,
      profile,
      waypoints: coordinates,
      data: route
    });

  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Route calculation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get nearby amenities
router.get('/nearby-amenities', async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      radius = 1000, 
      types 
    } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusNum = parseInt(radius);
    
    if (!leafletHelpers.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const amenityTypes = types ? types.split(',').map(t => t.trim()) : [];
    
    const amenities = await osmHelpers.getNearbyAmenities(
      latitude, 
      longitude, 
      radiusNum, 
      amenityTypes
    );

    // Format for Leaflet
    const markers = leafletHelpers.formatPlacesForMarkers(amenities);

    res.status(200).json({
      success: true,
      center: { latitude, longitude },
      radius: radiusNum,
      types: amenityTypes,
      count: markers.length,
      data: markers
    });

  } catch (error) {
    console.error('Nearby amenities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby amenities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get tile information
router.get('/tile-info', (req, res) => {
  try {
    const { lat, lng, zoom } = req.query;
    
    if (!lat || !lng || !zoom) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and zoom required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const zoomLevel = parseInt(zoom);
    
    if (!leafletHelpers.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    if (zoomLevel < 0 || zoomLevel > 19) {
      return res.status(400).json({
        success: false,
        message: 'Zoom level must be between 0 and 19'
      });
    }

    const tileInfo = osmHelpers.getTileInfo(latitude, longitude, zoomLevel);
    const tileUrls = {
      osm: osmHelpers.generateTileUrls(tileInfo.x, tileInfo.y, tileInfo.z, 'osm'),
      cartodb: osmHelpers.generateTileUrls(tileInfo.x, tileInfo.y, tileInfo.z, 'cartodb'),
      opentopo: osmHelpers.generateTileUrls(tileInfo.x, tileInfo.y, tileInfo.z, 'opentopo')
    };

    res.status(200).json({
      success: true,
      coordinates: { latitude, longitude },
      zoom: zoomLevel,
      tile: tileInfo,
      urls: tileUrls
    });

  } catch (error) {
    console.error('Tile info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tile information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get map configuration for frontend
router.get('/config', (req, res) => {
  try {
    const { region = 'southIndia' } = req.query;
    
    const config = {
      defaultRegion: region,
      mapOptions: leafletHelpers.mapConfigs[region] || leafletHelpers.mapConfigs.southIndia,
      tileLayerConfigs: leafletHelpers.getTileLayerConfigs(),
      markerIcons: leafletHelpers.markerIcons,
      clusterConfig: leafletHelpers.generateClusterConfig([]),
      heatmapConfig: leafletHelpers.generateHeatmapConfig([])
    };

    res.status(200).json({
      success: true,
      region,
      data: config
    });

  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get map configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check API status
router.get('/api-status', async (req, res) => {
  try {
    const status = await osmHelpers.checkAPIStatus();
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      apis: status,
      allOperational: Object.values(status).every(Boolean)
    });

  } catch (error) {
    console.error('API status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check API status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get responsive map options
router.get('/responsive-options', (req, res) => {
  try {
    const { screenWidth = 1024 } = req.query;
    
    const options = leafletHelpers.getResponsiveMapOptions(parseInt(screenWidth));
    
    res.status(200).json({
      success: true,
      screenWidth: parseInt(screenWidth),
      data: options
    });

  } catch (error) {
    console.error('Responsive options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get responsive options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;