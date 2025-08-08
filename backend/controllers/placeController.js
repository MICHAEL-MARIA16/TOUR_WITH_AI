// backend/controllers/placeController.js
const Place = require('../models/Place');

// Get all places
const getAllPlaces = async (req, res) => {
  try {
    const { category, city, state, search } = req.query;
    let query = { isActive: true };

    // Add filters if provided
    if (category) query.category = category;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (state) query.state = { $regex: state, $options: 'i' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const places = await Place.find(query)
      .sort({ rating: -1, name: 1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching places',
      error: error.message
    });
  }
};

// Get single place by ID
const getPlaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const place = await Place.findOne({ 
      $or: [{ _id: id }, { id: id }], 
      isActive: true 
    }).select('-__v');

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    res.status(200).json({
      success: true,
      data: place
    });
  } catch (error) {
    console.error('Error fetching place:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching place',
      error: error.message
    });
  }
};

// Get places by category
const getPlacesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const places = await Place.find({ 
      category: category.toLowerCase(), 
      isActive: true 
    })
    .sort({ rating: -1, name: 1 })
    .select('-__v');

    res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error) {
    console.error('Error fetching places by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching places by category',
      error: error.message
    });
  }
};

// Get places by city
const getPlacesByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const places = await Place.find({ 
      city: { $regex: city, $options: 'i' }, 
      isActive: true 
    })
    .sort({ rating: -1, name: 1 })
    .select('-__v');

    res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error) {
    console.error('Error fetching places by city:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching places by city',
      error: error.message
    });
  }
};

// Get nearby places
const getNearbyPlaces = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const maxDistance = parseFloat(radius);

    const places = await Place.findNearby(lat, lng, maxDistance);

    res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby places',
      error: error.message
    });
  }
};

// Get place statistics
const getPlaceStats = async (req, res) => {
  try {
    const stats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgVisitDuration: { $avg: '$averageVisitDuration' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalPlaces = await Place.countDocuments({ isActive: true });
    
    const stateStats = await Place.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPlaces,
        categoryStats: stats,
        stateStats
      }
    });
  } catch (error) {
    console.error('Error fetching place statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching place statistics',
      error: error.message
    });
  }
};

// Check if place is open
const checkPlaceOpenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { day, time } = req.query;

    const place = await Place.findOne({ 
      $or: [{ _id: id }, { id: id }], 
      isActive: true 
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    const currentDay = day || new Date().getDay();
    const currentTime = time || new Date().toTimeString().slice(0, 5);
    
    const isOpen = place.isOpenAt(
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDay],
      currentTime
    );

    res.status(200).json({
      success: true,
      data: {
        place: place.name,
        isOpen,
        checkTime: currentTime,
        checkDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]
      }
    });
  } catch (error) {
    console.error('Error checking place open status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking place open status',
      error: error.message
    });
  }
};

module.exports = {
  getAllPlaces,
  getPlaceById,
  getPlacesByCategory,
  getPlacesByCity,
  getNearbyPlaces,
  getPlaceStats,
  checkPlaceOpenStatus
};