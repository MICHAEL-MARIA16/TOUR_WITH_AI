// backend/controllers/placeController.js
const Place = require('../models/Place');
const { validationResult, body, param, query } = require('express-validator');

// Validation middleware
const validatePlace = [
  param('id').isMongoId().withMessage('Invalid place ID'),
];

const validateNearbySearch = [
  query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('radius').optional().isFloat({ min: 0.1, max: 200 }).withMessage('Radius must be between 0.1 and 200 km'),
];

const validateRouteOptimization = [
  body('places').isArray({ min: 1, max: 20 }).withMessage('Places must be an array of 1-20 items'),
  body('places.*.id').notEmpty().withMessage('Each place must have an ID'),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('totalTimeAvailable').optional().isInt({ min: 60, max: 1440 }).withMessage('Time available must be between 60-1440 minutes'),
  body('startDay').optional().isInt({ min: 0, max: 6 }).withMessage('Start day must be between 0-6'),
];

// Utility function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return null;
};

// Enhanced error handler
const handleError = (res, error, message = 'Internal server error', statusCode = 500) => {
  console.error(`${message}:`, error);
  
  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(isDevelopment && { error: error.message, stack: error.stack })
  });
};

// Get all places with advanced filtering and optimization
const getAllPlaces = async (req, res) => {
  try {
    const { 
      category, 
      city, 
      state, 
      search, 
      minRating, 
      maxVisitDuration, 
      kidFriendly, 
      wheelchairAccessible,
      hasEntryFee,
      sortBy = 'rating',
      sortOrder = 'desc',
      limit = 50,
      page = 1
    } = req.query;

    let query = { isActive: true };

    // Build advanced query filters
    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      query.category = { $in: categories.map(cat => cat.toLowerCase()) };
    }

    if (city) {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    if (state) {
      query.state = { $regex: state.trim(), $options: 'i' };
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (maxVisitDuration) {
      query.averageVisitDuration = { $lte: parseInt(maxVisitDuration) };
    }

    if (kidFriendly === 'true') {
      query.$or = [
        { kidFriendly: true },
        { kidFriendly: { $exists: false } } // Assume kid-friendly if not specified
      ];
    } else if (kidFriendly === 'false') {
      query.kidFriendly = false;
    }

    if (wheelchairAccessible === 'true') {
      query.wheelchairAccessible = true;
    }

    if (hasEntryFee === 'true') {
      query.$or = [
        { 'entryFee.indian': { $gt: 0 } },
        { 'entryFee.amount': { $gt: 0 } }
      ];
    } else if (hasEntryFee === 'false') {
      query.$and = [
        { $or: [{ 'entryFee.indian': 0 }, { 'entryFee.indian': { $exists: false } }] },
        { $or: [{ 'entryFee.amount': 0 }, { 'entryFee.amount': { $exists: false } }] }
      ];
    }

    if (search && search.trim()) {
      const searchTerms = search.trim().split(' ').map(term => new RegExp(term, 'i'));
      query.$or = [
        { name: { $in: searchTerms } },
        { description: { $in: searchTerms } },
        { tags: { $in: searchTerms } },
        { city: { $in: searchTerms } },
        { state: { $in: searchTerms } }
      ];
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'name':
        sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sortCriteria.rating = sortOrder === 'asc' ? 1 : -1;
        sortCriteria.name = 1; // Secondary sort
        break;
      case 'visitDuration':
        sortCriteria.averageVisitDuration = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'city':
        sortCriteria.city = sortOrder === 'asc' ? 1 : -1;
        sortCriteria.name = 1;
        break;
      default:
        sortCriteria = { rating: -1, name: 1 };
    }

    const allPlaces = await Place.find();

    console.log('All Places:', allPlaces);

    // Execute query with pagination
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 places per request
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    const [places, totalCount] = await Promise.all([
      Place.find(query)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNum)
        .select('-__v')
        .lean(), // Use lean() for better performance
      Place.countDocuments(query)
    ]);

    // Enhanced response with metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      count: places.length,
      totalCount,
      currentPage: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      data: places,
      allPlaces,
      filters: {
        category,
        city,
        state,
        search,
        minRating,
        maxVisitDuration,
        kidFriendly,
        wheelchairAccessible,
        hasEntryFee
      },
      sort: { sortBy, sortOrder }
    });

  } catch (error) {
    handleError(res, error, 'Error fetching places');
  }
};

// Get single place by ID with comprehensive details
const getPlaceById = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const { id } = req.params;
    
    // Support both MongoDB ObjectId and custom ID
    const place = await Place.findOne({ 
      $or: [
        { _id: id },
        { id: id },
        { slug: id.toLowerCase().replace(/\s+/g, '-') }
      ], 
      isActive: true 
    }).select('-__v').lean();

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    // Add computed fields
    const currentTime = new Date();
    const currentDay = currentTime.getDay();
    const currentTimeStr = currentTime.toTimeString().slice(0, 5);

    const enhancedPlace = {
      ...place,
      isCurrentlyOpen: isPlaceOpenNow(place, currentDay, currentTimeStr),
      nextOpenTime: getNextOpenTime(place, currentDay, currentTimeStr),
      estimatedVisitCost: place.entryFee?.indian || place.entryFee?.amount || 0,
      popularityScore: calculatePopularityScore(place)
    };

    res.status(200).json({
      success: true,
      data: enhancedPlace
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid place ID format'
      });
    }
    handleError(res, error, 'Error fetching place');
  }
};

// Get places by category with intelligent sorting
const getPlacesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      city, 
      state, 
      minRating = 0, 
      limit = 20,
      includeNearby = false,
      latitude,
      longitude,
      radius = 50
    } = req.query;

    let query = { 
      category: category.toLowerCase(), 
      isActive: true,
      rating: { $gte: parseFloat(minRating) }
    };

    if (city) query.city = { $regex: city, $options: 'i' };
    if (state) query.state = { $regex: state, $options: 'i' };

    let places;

    if (includeNearby === 'true' && latitude && longitude) {
      // Use geographic search for nearby places
      places = await Place.findNearby(
        parseFloat(latitude), 
        parseFloat(longitude), 
        parseFloat(radius),
        { category: category.toLowerCase() }
      );
    } else {
      places = await Place.find(query)
        .sort({ rating: -1, reviewCount: -1, name: 1 })
        .limit(parseInt(limit))
        .select('-__v')
        .lean();
    }

    // Add category-specific insights
    const categoryInsights = await getCategoryInsights(category);

    res.status(200).json({
      success: true,
      category: category,
      count: places.length,
      data: places,
      insights: categoryInsights
    });

  } catch (error) {
    handleError(res, error, 'Error fetching places by category');
  }
};

// Get places by city with tourism insights
const getPlacesByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const { 
      category, 
      sortBy = 'popularity',
      includeStatistics = false 
    } = req.query;

    let query = { 
      city: { $regex: city.trim(), $options: 'i' }, 
      isActive: true 
    };

    if (category) {
      query.category = category.toLowerCase();
    }

    // Dynamic sorting based on request
    let sortCriteria = {};
    switch (sortBy) {
      case 'popularity':
        sortCriteria = { rating: -1, reviewCount: -1 };
        break;
      case 'visitDuration':
        sortCriteria = { averageVisitDuration: 1 };
        break;
      case 'alphabetical':
        sortCriteria = { name: 1 };
        break;
      default:
        sortCriteria = { rating: -1, name: 1 };
    }

    const places = await Place.find(query)
      .sort(sortCriteria)
      .select('-__v')
      .lean();

    let response = {
      success: true,
      city: city,
      count: places.length,
      data: places
    };

    // Add city statistics if requested
    if (includeStatistics === 'true') {
      const cityStats = await getCityStatistics(city);
      response.statistics = cityStats;
    }

    res.status(200).json(response);

  } catch (error) {
    handleError(res, error, 'Error fetching places by city');
  }
};

// Enhanced nearby places search with route optimization hints
const getNearbyPlaces = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const { 
      latitude, 
      longitude, 
      radius = 50,
      category,
      minRating = 0,
      maxResults = 50,
      includeRouteHints = false,
      excludeIds = ''
    } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const maxDistance = Math.min(parseFloat(radius), 200); // Max 200km radius

    let additionalFilters = {
      rating: { $gte: parseFloat(minRating) }
    };

    if (category) {
      const categories = category.split(',').map(cat => cat.trim().toLowerCase());
      additionalFilters.category = { $in: categories };
    }

    // Exclude specific places if requested
    if (excludeIds) {
      const idsToExclude = excludeIds.split(',').map(id => id.trim());
      additionalFilters._id = { $nin: idsToExclude };
      additionalFilters.id = { $nin: idsToExclude };
    }

    const places = await Place.findNearby(lat, lng, maxDistance, additionalFilters);
    
    // Limit results
    const limitedPlaces = places.slice(0, parseInt(maxResults));

    let response = {
      success: true,
      center: { latitude: lat, longitude: lng },
      radius: maxDistance,
      count: limitedPlaces.length,
      data: limitedPlaces
    };

    // Add route optimization hints if requested
    if (includeRouteHints === 'true' && limitedPlaces.length > 1) {
      response.routeHints = generateRouteHints(limitedPlaces, lat, lng);
    }

    res.status(200).json(response);

  } catch (error) {
    handleError(res, error, 'Error fetching nearby places');
  }
};

// Advanced route optimization endpoint
const optimizeRoute = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const {
      places: requestedPlaceIds,
      startTime = '09:00',
      totalTimeAvailable = 480, // 8 hours default
      startDay = new Date().getDay(),
      strategy = 'hybrid',
      preferences = {}
    } = req.body;

    // Fetch place details from database
    const placeDetails = await Place.find({
      $or: [
        { _id: { $in: requestedPlaceIds } },
        { id: { $in: requestedPlaceIds } }
      ],
      isActive: true
    }).select('-__v').lean();

    if (placeDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid places found for the provided IDs'
      });
    }

    // Validate all places have required data for route optimization
    const validatedPlaces = placeDetails.filter(place => {
      return place.location && 
             place.location.latitude && 
             place.location.longitude &&
             place.averageVisitDuration &&
             place.averageVisitDuration > 0;
    });

    if (validatedPlaces.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No places have sufficient data for route optimization'
      });
    }

    // Prepare optimization parameters
    const optimizationSettings = {
      startTime,
      totalTimeAvailable,
      startDay,
      strategy,
      preferences,
      allowPartialRoute: true
    };

    // This would integrate with your frontend RouteOptimizer
    // For now, we'll create a simplified optimization logic
    const optimizedRoute = await performServerSideOptimization(
      validatedPlaces, 
      optimizationSettings
    );

    res.status(200).json({
      success: true,
      originalPlaceCount: requestedPlaceIds.length,
      validPlaceCount: validatedPlaces.length,
      optimizationSettings,
      data: optimizedRoute
    });

  } catch (error) {
    handleError(res, error, 'Error optimizing route');
  }
};

// Get comprehensive place statistics
const getPlaceStats = async (req, res) => {
  try {
    const { includeDetailed = false } = req.query;

    // Basic aggregation
    const [categoryStats, stateStats, totalPlaces] = await Promise.all([
      Place.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgVisitDuration: { $avg: '$averageVisitDuration' },
            totalEntryFee: { $sum: { $ifNull: ['$entryFee.indian', '$entryFee.amount', 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Place.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$state',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Place.countDocuments({ isActive: true })
    ]);

    let response = {
      success: true,
      data: {
        totalPlaces,
        categoryStats: categoryStats.map(stat => ({
          ...stat,
          avgRating: Math.round(stat.avgRating * 10) / 10,
          avgVisitDuration: Math.round(stat.avgVisitDuration)
        })),
        stateStats
      }
    };

    // Add detailed statistics if requested
    if (includeDetailed === 'true') {
      const detailedStats = await getDetailedStatistics();
      response.data.detailed = detailedStats;
    }

    res.status(200).json(response);

  } catch (error) {
    handleError(res, error, 'Error fetching place statistics');
  }
};

// Check if place is open with detailed schedule
const checkPlaceOpenStatus = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const { id } = req.params;
    const { day, time, timezone } = req.query;

    const place = await Place.findOne({ 
      $or: [{ _id: id }, { id: id }], 
      isActive: true 
    }).lean();

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    const checkDay = day ? parseInt(day) : new Date().getDay();
    const checkTime = time || new Date().toTimeString().slice(0, 5);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][checkDay];
    
    const isOpen = isPlaceOpenNow(place, checkDay, checkTime);
    const schedule = place.openingHours || {};
    const todaySchedule = schedule[dayKey];

    res.status(200).json({
      success: true,
      data: {
        place: {
          id: place._id,
          name: place.name,
          category: place.category
        },
        isOpen,
        checkTime,
        checkDay: dayNames[checkDay],
        schedule: todaySchedule,
        fullWeekSchedule: schedule,
        nextOpenTime: getNextOpenTime(place, checkDay, checkTime),
        timezone: timezone || 'Local'
      }
    });

  } catch (error) {
    handleError(res, error, 'Error checking place open status');
  }
};

// Bulk operations for places
const bulkOperations = async (req, res) => {
  try {
    const { operation, placeIds, updateData } = req.body;

    if (!['activate', 'deactivate', 'update'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Use: activate, deactivate, or update'
      });
    }

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'placeIds must be a non-empty array'
      });
    }

    let result;
    
    switch (operation) {
      case 'activate':
        result = await Place.updateMany(
          { _id: { $in: placeIds } },
          { $set: { isActive: true, updatedAt: new Date() } }
        );
        break;
      case 'deactivate':
        result = await Place.updateMany(
          { _id: { $in: placeIds } },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        break;
      case 'update':
        if (!updateData) {
          return res.status(400).json({
            success: false,
            message: 'updateData is required for update operation'
          });
        }
        result = await Place.updateMany(
          { _id: { $in: placeIds } },
          { $set: { ...updateData, updatedAt: new Date() } }
        );
        break;
    }

    res.status(200).json({
      success: true,
      operation,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      data: result
    });

  } catch (error) {
    handleError(res, error, 'Error performing bulk operation');
  }
};

// Helper functions

// Check if place is currently open
function isPlaceOpenNow(place, day, time) {
  try {
    if (!place.openingHours) return true;

    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
    const schedule = place.openingHours[dayName];
    
    if (!schedule || schedule.closed) return false;
    if (!schedule.open || !schedule.close) return true;
    
    const openTime = timeToMinutes(schedule.open);
    const closeTime = timeToMinutes(schedule.close);
    const currentTime = timeToMinutes(time);
    
    // Handle overnight hours
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    }
    
    return currentTime >= openTime && currentTime <= closeTime;
  } catch (error) {
    console.error('Error checking if place is open:', error);
    return true; // Default to open if error
  }
}

// Get next opening time
function getNextOpenTime(place, currentDay, currentTime) {
  if (!place.openingHours) return null;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Check remaining days in the week
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const dayName = dayNames[checkDay];
    const schedule = place.openingHours[dayName];
    
    if (schedule && !schedule.closed && schedule.open) {
      const openTime = timeToMinutes(schedule.open);
      const currentTimeMinutes = timeToMinutes(currentTime);
      
      // If it's the same day and place opens later
      if (i === 0 && openTime > currentTimeMinutes) {
        return {
          day: dayNames[checkDay],
          time: schedule.open,
          daysFromNow: 0
        };
      }
      
      // If it's a future day
      if (i > 0) {
        return {
          day: dayNames[checkDay],
          time: schedule.open,
          daysFromNow: i
        };
      }
    }
  }
  
  return null; // Always closed
}

// Convert time string to minutes
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
}

// Calculate popularity score
function calculatePopularityScore(place) {
  const rating = place.rating || 0;
  const reviewCount = place.reviewCount || 0;
  const categoryWeight = getCategoryWeight(place.category);
  
  // Weighted score: rating * review count * category importance
  return Math.round((rating * Math.log(reviewCount + 1) * categoryWeight) * 10) / 10;
}

// Get category weight for popularity calculation
function getCategoryWeight(category) {
  const weights = {
    'historical': 1.2,
    'religious': 1.1,
    'museum': 1.0,
    'park': 0.9,
    'shopping': 0.8,
    'entertainment': 0.9,
    'restaurant': 0.7
  };
  return weights[category?.toLowerCase()] || 1.0;
}

// Get category-specific insights
async function getCategoryInsights(category) {
  try {
    const insights = await Place.aggregate([
      { $match: { category: category.toLowerCase(), isActive: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          avgVisitDuration: { $avg: '$averageVisitDuration' },
          avgEntryFee: { $avg: { $ifNull: ['$entryFee.indian', '$entryFee.amount', 0] } },
          totalPlaces: { $sum: 1 },
          topRated: { $max: '$rating' },
          mostVisited: { $max: '$reviewCount' }
        }
      }
    ]);

    if (insights.length === 0) return null;

    const insight = insights[0];
    return {
      category: category,
      averageRating: Math.round(insight.avgRating * 10) / 10,
      averageVisitDuration: Math.round(insight.avgVisitDuration),
      averageEntryFee: Math.round(insight.avgEntryFee),
      totalPlaces: insight.totalPlaces,
      recommendations: generateCategoryRecommendations(category, insight)
    };
  } catch (error) {
    console.error('Error getting category insights:', error);
    return null;
  }
}

// Generate category-specific recommendations
function generateCategoryRecommendations(category, stats) {
  const recommendations = [];
  
  switch (category.toLowerCase()) {
    case 'historical':
      recommendations.push('Best visited in morning hours for better lighting');
      recommendations.push('Allow extra time for guided tours');
      break;
    case 'religious':
      recommendations.push('Check dress code requirements');
      recommendations.push('Visit during non-prayer times for photography');
      break;
    case 'museum':
      recommendations.push('Weekdays are less crowded');
      recommendations.push('Check for special exhibitions');
      break;
    case 'park':
      recommendations.push('Early morning visits offer best weather');
      recommendations.push('Carry water and snacks');
      break;
  }
  
  if (stats.avgVisitDuration > 180) {
    recommendations.push('Plan for extended visit - average duration is ' + Math.round(stats.avgVisitDuration / 60) + ' hours');
  }
  
  return recommendations;
}

// Get city statistics
async function getCityStatistics(city) {
  try {
    const stats = await Place.aggregate([
      { $match: { city: { $regex: city, $options: 'i' }, isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalPlaces = stats.reduce((sum, stat) => sum + stat.count, 0);
    const overallRating = stats.reduce((sum, stat) => sum + (stat.avgRating * stat.count), 0) / totalPlaces;

    return {
      totalPlaces,
      overallRating: Math.round(overallRating * 10) / 10,
      categoriesAvailable: stats.length,
      categoryBreakdown: stats,
      recommendations: generateCityRecommendations(city, stats)
    };
  } catch (error) {
    console.error('Error getting city statistics:', error);
    return null;
  }
}

// Generate city-specific recommendations
function generateCityRecommendations(city, stats) {
  const recommendations = [];
  
  const topCategory = stats[0];
  if (topCategory) {
    recommendations.push(`${city} is known for its ${topCategory._id} attractions`);
  }
  
  if (stats.length >= 5) {
    recommendations.push('Great variety of attractions available');
  }
  
  const highRatedCategories = stats.filter(s => s.avgRating >= 4.0);
  if (highRatedCategories.length > 0) {
    recommendations.push(`Highly rated: ${highRatedCategories.map(c => c._id).join(', ')}`);
  }
  
  return recommendations;
}

// Generate route optimization hints
function generateRouteHints(places, centerLat, centerLng) {
  const hints = {
    clusteredAreas: [],
    timeOptimization: [],
    categoryMix: []
  };

  // Cluster nearby places
  const clusters = findPlaceClusters(places, centerLat, centerLng);
  hints.clusteredAreas = clusters.map(cluster => ({
    center: cluster.center,
    places: cluster.places.map(p => p.name),
    estimatedTime: cluster.places.reduce((sum, p) => sum + (p.averageVisitDuration || 60), 0)
  }));

  // Time-based recommendations
  const quickVisits = places.filter(p => (p.averageVisitDuration || 60) <= 90);
  const longVisits = places.filter(p => (p.averageVisitDuration || 60) > 180);
  
  if (quickVisits.length >= 3) {
    hints.timeOptimization.push({
      type: 'quick_tour',
      suggestion: 'Perfect for a quick half-day tour',
      places: quickVisits.slice(0, 4).map(p => p.name)
    });
  }
  
  if (longVisits.length >= 2) {
    hints.timeOptimization.push({
      type: 'extended_tour',
      suggestion: 'Plan a full day for these attractions',
      places: longVisits.slice(0, 3).map(p => p.name)
    });
  }

  // Category mixing suggestions
  const categories = [...new Set(places.map(p => p.category))];
  if (categories.length >= 3) {
    hints.categoryMix.push({
      suggestion: 'Great mix of experiences available',
      categories: categories,
      recommendation: 'Alternate between different types for varied experience'
    });
  }

  return hints;
}

// Find place clusters for route optimization
function findPlaceClusters(places, centerLat, centerLng, maxDistance = 5) {
  const clusters = [];
  const processed = new Set();

  places.forEach((place, index) => {
    if (processed.has(index)) return;

    const cluster = {
      center: { lat: place.location.latitude, lng: place.location.longitude },
      places: [place]
    };

    // Find nearby places
    places.forEach((otherPlace, otherIndex) => {
      if (index !== otherIndex && !processed.has(otherIndex)) {
        const distance = calculateDistance(
          place.location.latitude,
          place.location.longitude,
          otherPlace.location.latitude,
          otherPlace.location.longitude
        );

        if (distance <= maxDistance) {
          cluster.places.push(otherPlace);
          processed.add(otherIndex);
        }
      }
    });

    processed.add(index);
    if (cluster.places.length > 1) {
      clusters.push(cluster);
    }
  });

  return clusters;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get detailed statistics for comprehensive analysis
async function getDetailedStatistics() {
  try {
    const [
      ratingDistribution,
      visitDurationStats,
      entryFeeStats,
      accessibilityStats
    ] = await Promise.all([
      Place.aggregate([
        { $match: { isActive: true } },
        {
          $bucket: {
            groupBy: '$rating',
            boundaries: [0, 2, 3, 4, 4.5, 5.1],
            default: 'Unknown',
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      Place.aggregate([
        { $match: { isActive: true, averageVisitDuration: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$averageVisitDuration' },
            minDuration: { $min: '$averageVisitDuration' },
            maxDuration: { $max: '$averageVisitDuration' },
            medianDuration: { $median: { input: '$averageVisitDuration', method: 'approximate' } }
          }
        }
      ]),
      Place.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: {
              $cond: [
                { $gt: [{ $ifNull: ['$entryFee.indian', '$entryFee.amount', 0] }, 0] },
                'Paid',
                'Free'
              ]
            },
            count: { $sum: 1 },
            avgFee: { $avg: { $ifNull: ['$entryFee.indian', '$entryFee.amount', 0] } }
          }
        }
      ]),
      Place.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            wheelchairAccessible: { $sum: { $cond: ['$wheelchairAccessible', 1, 0] } },
            kidFriendly: { $sum: { $cond: [{ $ne: ['$kidFriendly', false] }, 1, 0] } },
            total: { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      ratingDistribution,
      visitDurationStats: visitDurationStats[0] || {},
      entryFeeStats,
      accessibilityStats: accessibilityStats[0] || {}
    };
  } catch (error) {
    console.error('Error getting detailed statistics:', error);
    return {};
  }
}

// Server-side route optimization (simplified version)
async function performServerSideOptimization(places, settings) {
  try {
    const {
      startTime,
      totalTimeAvailable,
      startDay,
      strategy
    } = settings;

    // Simple greedy algorithm implementation
    const optimized = {
      route: [],
      totalTime: 0,
      totalDistance: 0,
      feasible: true,
      efficiency: 0
    };

    // Sort places by a combination of rating and visit efficiency
    const scoredPlaces = places.map(place => ({
      ...place,
      efficiency: (place.rating || 0) / Math.max(place.averageVisitDuration / 60, 1)
    })).sort((a, b) => b.efficiency - a.efficiency);

    let currentTime = timeToMinutes(startTime);
    let totalVisitTime = 0;
    let totalTravelTime = 0;

    for (let i = 0; i < scoredPlaces.length; i++) {
      const place = scoredPlaces[i];
      const visitDuration = place.averageVisitDuration || 60;
      
      // Estimate travel time (simplified - using average of 30 minutes between places)
      const travelTime = optimized.route.length > 0 ? 30 : 0;
      
      // Check if we can fit this place in our schedule
      if (totalVisitTime + totalTravelTime + visitDuration + travelTime <= totalTimeAvailable) {
        // Check if place is open
        const arrivalTime = currentTime + travelTime;
        if (isPlaceOpenNow(place, startDay, minutesToTime(arrivalTime))) {
          optimized.route.push(place);
          totalVisitTime += visitDuration;
          totalTravelTime += travelTime;
          currentTime = arrivalTime + visitDuration;
        }
      }
    }

    optimized.totalTime = totalVisitTime + totalTravelTime;
    optimized.efficiency = Math.round((optimized.route.length / places.length) * 100);
    optimized.feasible = optimized.route.length > 0;

    // Calculate approximate total distance (simplified)
    optimized.totalDistance = optimized.route.length > 1 ? 
      (optimized.route.length - 1) * 15 : 0; // Assume 15km average between places

    return optimized;
  } catch (error) {
    console.error('Error in server-side optimization:', error);
    return {
      route: [],
      totalTime: 0,
      totalDistance: 0,
      feasible: false,
      efficiency: 0,
      error: error.message
    };
  }
}

// Convert minutes to time string
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Validation arrays for express-validator
const validations = {
  validatePlace,
  validateNearbySearch,
  validateRouteOptimization
};

module.exports = {
  getAllPlaces,
  getPlaceById,
  getPlacesByCategory,
  getPlacesByCity,
  getNearbyPlaces,
  getPlaceStats,
  checkPlaceOpenStatus,
  optimizeRoute,
  bulkOperations,
  validations
};