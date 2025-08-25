// backend/routes/places.js
const express = require('express');
const router = express.Router();
const Place = require('../models/Place');
//const { generateDetailedPlaceInfo } = require('../services/geminiService');

// GET /api/places - Get all places with optional filtering
router.get('/', async (req, res) => {
  console.log('🌐 [PLACES API] GET /api/places called');
  console.log('🔍 [PLACES API] Query params:', req.query);
  console.log('🔍 [PLACES API] Full URL:', req.originalUrl);
  try {
    const {
      category,
      city,
      state,
      limit = 50,
      page = 1,
      search,
      rating,
      kidFriendly,
      wheelchairAccessible
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }
    
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }
    
    if (kidFriendly === 'true') {
      filter.kidFriendly = true;
    }
    
    if (wheelchairAccessible === 'true') {
      filter.wheelchairAccessible = true;
    }
    
    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    console.log('🔍 [PLACES API] Filter being used:', JSON.stringify(filter, null, 2));
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    let query = Place.find(filter);
    
    if (search) {
      query = query.select({ score: { $meta: 'textScore' } });
      query = query.sort({ score: { $meta: 'textScore' } });
    } else {
      query = query.sort({ rating: -1, name: 1 });
    }
    
    const places = await query
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('📤 [PLACES API] Found places count:', places.length);
    console.log('📍 [PLACES API] First place:', places[0] ? places[0].name : 'No places found');
    // Get total count for pagination
    const totalPlaces = await Place.countDocuments(filter);
    const totalPages = Math.ceil(totalPlaces / parseInt(limit));

    res.json({
      success: true,
      places,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPlaces,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        category,
        city,
        state,
        search,
        rating,
        kidFriendly,
        wheelchairAccessible
      }
    });

  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places',
      error: error.message
    });
  }
});

// GET /api/places/stats - Get places statistics (MUST be before /:id route)
router.get('/stats', async (req, res) => {
  try {
    const stats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalPlaces: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          categories: { $addToSet: '$category' },
          cities: { $addToSet: '$city' },
          states: { $addToSet: '$state' }
        }
      },
      {
        $project: {
          _id: 0,
          totalPlaces: 1,
          averageRating: { $round: ['$averageRating', 2] },
          totalCategories: { $size: '$categories' },
          totalCities: { $size: '$cities' },
          totalStates: { $size: '$states' },
          categories: 1,
          cities: 1,
          states: 1
        }
      }
    ]);

    // Get category breakdown
    const categoryStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get state breakdown
    const stateStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          state: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalPlaces: 0,
        averageRating: 0,
        totalCategories: 0,
        totalCities: 0,
        totalStates: 0,
        categories: [],
        cities: [],
        states: []
      },
      categoryBreakdown: categoryStats,
      stateBreakdown: stateStats
    });

  } catch (error) {
    console.error('Error fetching places statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET /api/places/categories - Get all available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Place.distinct('category', { isActive: true });
    
    // Get count for each category
    const categoryStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      categories: categories.sort(),
      categoryStats,
      count: categories.length
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// GET /api/places/cities - Get all unique cities
router.get('/cities', async (req, res) => {
  try {
    const { state } = req.query;
    
    const filter = { isActive: true };
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    const cities = await Place.distinct('city', filter);
    
    res.json({
      success: true,
      cities: cities.sort(),
      count: cities.length,
      ...(state && { state })
    });

  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: error.message
    });
  }
});

// GET /api/places/states - Get all unique states
router.get('/states', async (req, res) => {
  try {
    const states = await Place.distinct('state', { isActive: true });
    
    res.json({
      success: true,
      states: states.sort(),
      count: states.length
    });

  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message
    });
  }
});

// GET /api/places/nearby - Get places near a location
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20, category } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values'
      });
    }

    // Build filter
    const filter = {
      isActive: true,
      'location.latitude': {
        $gte: lat - (rad / 111.32), // Rough conversion: 1 degree ≈ 111.32 km
        $lte: lat + (rad / 111.32)
      },
      'location.longitude': {
        $gte: lon - (rad / (111.32 * Math.cos(lat * Math.PI / 180))),
        $lte: lon + (rad / (111.32 * Math.cos(lat * Math.PI / 180)))
      }
    };

    if (category) {
      filter.category = category.toLowerCase();
    }

    const places = await Place.find(filter)
      .limit(parseInt(limit))
      .lean();

    // Calculate actual distances and sort by distance
    const placesWithDistance = places.map(place => {
      const distance = calculateDistance(
        lat, lon,
        place.location.latitude, place.location.longitude
      );
      return {
        ...place,
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      places: placesWithDistance,
      searchCenter: { latitude: lat, longitude: lon },
      searchRadius: rad,
      count: placesWithDistance.length
    });

  } catch (error) {
    console.error('Error finding nearby places:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby places',
      error: error.message
    });
  }
});

// GET /api/places/search - Advanced search
router.get('/search', async (req, res) => {
  try {
    const { q, category, city, state, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filter = {
      isActive: true,
      $text: { $search: q }
    };

    if (category) {
      filter.category = category.toLowerCase();
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    const places = await Place.find(filter)
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, rating: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      places,
      searchQuery: q,
      filters: { category, city, state },
      count: places.length
    });

  } catch (error) {
    console.error('Error searching places:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search places',
      error: error.message
    });
  }
});

// GET /api/places/category/:category - Get places by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20, city, state } = req.query;

    const filter = { 
      category: category.toLowerCase(),
      isActive: true 
    };
    
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    const places = await Place.find(filter)
      .sort({ rating: -1, name: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      places,
      category,
      count: places.length
    });

  } catch (error) {
    console.error('Error fetching places by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places by category',
      error: error.message
    });
  }
});

// GET /api/places/:id - Get specific place by ID (MUST be last!)
router.get('/:id', async (req, res) => {
  try {
    const place = await Place.findOne({ 
      $or: [
        { _id: req.params.id },
        { id: req.params.id }
      ],
      isActive: true 
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    res.json({
      success: true,
      place
    });

  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch place',
      error: error.message
    });
  }
});

// GET /api/places/category/:category - Get places by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20, city, state } = req.query;

    const filter = { 
      category: category.toLowerCase(),
      isActive: true 
    };
    
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }
    
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    const places = await Place.find(filter)
      .sort({ rating: -1, name: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      places,
      category,
      count: places.length
    });

  } catch (error) {
    console.error('Error fetching places by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch places by category',
      error: error.message
    });
  }
});

// GET /api/places/nearby - Get places near a location
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20, category } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseInt(radius);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values'
      });
    }

    // Build filter
    const filter = {
      isActive: true,
      'location.latitude': {
        $gte: lat - (rad / 111.32), // Rough conversion: 1 degree ≈ 111.32 km
        $lte: lat + (rad / 111.32)
      },
      'location.longitude': {
        $gte: lon - (rad / (111.32 * Math.cos(lat * Math.PI / 180))),
        $lte: lon + (rad / (111.32 * Math.cos(lat * Math.PI / 180)))
      }
    };

    if (category) {
      filter.category = category.toLowerCase();
    }

    const places = await Place.find(filter)
      .limit(parseInt(limit))
      .lean();

    // Calculate actual distances and sort by distance
    const placesWithDistance = places.map(place => {
      const distance = calculateDistance(
        lat, lon,
        place.location.latitude, place.location.longitude
      );
      return {
        ...place,
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      places: placesWithDistance,
      searchCenter: { latitude: lat, longitude: lon },
      searchRadius: rad,
      count: placesWithDistance.length
    });

  } catch (error) {
    console.error('Error finding nearby places:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearby places',
      error: error.message
    });
  }
});

// GET /api/places/search - Advanced search
router.get('/search', async (req, res) => {
  try {
    const { q, category, city, state, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filter = {
      isActive: true,
      $text: { $search: q }
    };

    if (category) {
      filter.category = category.toLowerCase();
    }

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    const places = await Place.find(filter)
      .select({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, rating: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      places,
      searchQuery: q,
      filters: { category, city, state },
      count: places.length
    });

  } catch (error) {
    console.error('Error searching places:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search places',
      error: error.message
    });
  }
});

// GET /api/places/stats - Get places statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalPlaces: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          categories: { $addToSet: '$category' },
          cities: { $addToSet: '$city' },
          states: { $addToSet: '$state' }
        }
      },
      {
        $project: {
          _id: 0,
          totalPlaces: 1,
          averageRating: { $round: ['$averageRating', 2] },
          totalCategories: { $size: '$categories' },
          totalCities: { $size: '$cities' },
          totalStates: { $size: '$states' },
          categories: 1,
          cities: 1,
          states: 1
        }
      }
    ]);

    // Get category breakdown
    const categoryStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get state breakdown
    const stateStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          state: '$_id',
          count: 1,
          averageRating: { $round: ['$averageRating', 2] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalPlaces: 0,
        averageRating: 0,
        totalCategories: 0,
        totalCities: 0,
        totalStates: 0,
        categories: [],
        cities: [],
        states: []
      },
      categoryBreakdown: categoryStats,
      stateBreakdown: stateStats
    });

  } catch (error) {
    console.error('Error fetching places statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// GET /api/places/cities - Get all unique cities
router.get('/cities', async (req, res) => {
  try {
    const { state } = req.query;
    
    const filter = { isActive: true };
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }

    const cities = await Place.distinct('city', filter);
    
    res.json({
      success: true,
      cities: cities.sort(),
      count: cities.length,
      ...(state && { state })
    });

  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: error.message
    });
  }
});

// GET /api/places/states - Get all unique states
router.get('/states', async (req, res) => {
  try {
    const states = await Place.distinct('state', { isActive: true });
    
    res.json({
      success: true,
      states: states.sort(),
      count: states.length
    });

  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message
    });
  }
});

// GET /api/places/categories - Get all available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Place.distinct('category', { isActive: true });
    
    // Get count for each category
    const categoryStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      categories: categories.sort(),
      categoryStats,
      count: categories.length
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;