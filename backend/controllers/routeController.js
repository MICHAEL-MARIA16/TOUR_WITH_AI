// backend/controllers/routeController.js
const Place = require('../models/Place');
const PathOptimizer = require('../utils/pathOptimizer');

// Optimize route for selected places
const optimizeRoute = async (req, res) => {
  try {
    const { 
      placeIds, 
      startTime = '09:00',
      totalTimeAvailable = 480, // 8 hours in minutes
      startDay = new Date().getDay(),
      optimizationLevel = 'fast' // 'fast' or 'optimal'
    } = req.body;

    // Validate input
    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Place IDs array is required and cannot be empty'
      });
    }

    if (placeIds.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 15 places can be optimized at once'
      });
    }

    // Fetch places from database
    const places = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ],
      isActive: true
    }).select('-__v');

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found for the provided IDs'
      });
    }

    if (places.length !== placeIds.length) {
      console.warn(`Warning: ${placeIds.length - places.length} places not found`);
    }

    // Initialize path optimizer
    const optimizer = new PathOptimizer();

    // Set optimization constraints
    const timeConstraints = {
      startTime,
      totalTimeAvailable,
      startDay
    };

    // Choose optimization algorithm based on level and number of places
    let optimizedRoute;
    if (optimizationLevel === 'optimal' && places.length <= 10) {
      optimizedRoute = await optimizer.optimizeRouteDP(places, timeConstraints);
    } else {
      optimizedRoute = await optimizer.optimizeRoute(places, timeConstraints);
    }

    // Calculate additional metrics
    const metrics = {
      placesVisited: optimizedRoute.route.length,
      placesSkipped: places.length - optimizedRoute.route.length,
      totalTravelTime: optimizedRoute.totalTime - optimizedRoute.route.reduce((sum, place) => sum + place.averageVisitDuration, 0),
      totalVisitTime: optimizedRoute.route.reduce((sum, place) => sum + place.averageVisitDuration, 0),
      efficiency: (optimizedRoute.route.length / places.length * 100).toFixed(1) + '%',
      estimatedEndTime: calculateEndTime(startTime, optimizedRoute.totalTime)
    };

    res.status(200).json({
      success: true,
      data: {
        optimizedRoute: optimizedRoute.route,
        itinerary: optimizedRoute.itinerary,
        metrics,
        totalDistance: optimizedRoute.totalDistance?.toFixed(2) + ' km',
        totalTime: formatDuration(optimizedRoute.totalTime),
        feasible: optimizedRoute.feasible,
        optimizationLevel
      }
    });

  } catch (error) {
    console.error('Error optimizing route:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing route',
      error: error.message
    });
  }
};

// Get distance and travel time between two places
const getDistanceBetweenPlaces = async (req, res) => {
  try {
    const { fromPlaceId, toPlaceId } = req.params;

    const fromPlace = await Place.findOne({
      $or: [{ _id: fromPlaceId }, { id: fromPlaceId }],
      isActive: true
    });

    const toPlace = await Place.findOne({
      $or: [{ _id: toPlaceId }, { id: toPlaceId }],
      isActive: true
    });

    if (!fromPlace || !toPlace) {
      return res.status(404).json({
        success: false,
        message: 'One or both places not found'
      });
    }

    const optimizer = new PathOptimizer();
    const travelInfo = await optimizer.getGoogleMapsDistance(
      fromPlace.location,
      toPlace.location
    );

    res.status(200).json({
      success: true,
      data: {
        from: {
          id: fromPlace.id,
          name: fromPlace.name
        },
        to: {
          id: toPlace.id,
          name: toPlace.name
        },
        distance: travelInfo.distanceText,
        duration: travelInfo.durationText,
        distanceKm: travelInfo.distance.toFixed(2),
        durationMinutes: Math.round(travelInfo.duration)
      }
    });

  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating distance between places',
      error: error.message
    });
  }
};

// Get suggested routes based on time available
const getSuggestedRoutes = async (req, res) => {
  try {
    const { 
      timeAvailable = 480, // 8 hours
      interests = [],
      startLocation,
      maxPlaces = 8
    } = req.query;

    let query = { isActive: true };
    
    // Filter by interests (categories)
    if (interests.length > 0) {
      const interestArray = Array.isArray(interests) ? interests : interests.split(',');
      query.category = { $in: interestArray };
    }

    // Get places sorted by rating
    let places = await Place.find(query)
      .sort({ rating: -1, averageVisitDuration: 1 })
      .limit(20)
      .select('-__v');

    // If start location is provided, prioritize nearby places
    if (startLocation) {
      const [lat, lng] = startLocation.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        places = await Place.findNearby(lat, lng, 200); // 200km radius
      }
    }

    // Create different route suggestions
    const suggestions = [];
    const optimizer = new PathOptimizer();

    // Quick route (high rating, less time)
    const quickPlaces = places
      .filter(p => p.averageVisitDuration <= 120)
      .slice(0, Math.min(6, maxPlaces));
    
    if (quickPlaces.length > 0) {
      const quickRoute = await optimizer.optimizeRoute(quickPlaces, {
        totalTimeAvailable: timeAvailable * 0.8
      });
      
      suggestions.push({
        type: 'Quick Highlights',
        description: 'Visit top-rated places with shorter durations',
        route: quickRoute.route,
        totalTime: formatDuration(quickRoute.totalTime),
        placesCount: quickRoute.route.length
      });
    }

    // Balanced route
    const balancedPlaces = places.slice(0, Math.min(8, maxPlaces));
    if (balancedPlaces.length > 0) {
      const balancedRoute = await optimizer.optimizeRoute(balancedPlaces, {
        totalTimeAvailable: timeAvailable
      });
      
      suggestions.push({
        type: 'Balanced Tour',
        description: 'Mix of popular attractions with optimal timing',
        route: balancedRoute.route,
        totalTime: formatDuration(balancedRoute.totalTime),
        placesCount: balancedRoute.route.length
      });
    }

    // Comprehensive route (if time allows)
    if (timeAvailable > 600) { // More than 10 hours
      const comprehensivePlaces = places.slice(0, Math.min(12, maxPlaces));
      const comprehensiveRoute = await optimizer.optimizeRoute(comprehensivePlaces, {
        totalTimeAvailable: timeAvailable
      });
      
      suggestions.push({
        type: 'Comprehensive Experience',
        description: 'Maximum places for extended trips',
        route: comprehensiveRoute.route,
        totalTime: formatDuration(comprehensiveRoute.totalTime),
        placesCount: comprehensiveRoute.route.length
      });
    }

    res.status(200).json({
      success: true,
      data: {
        suggestions,
        totalAvailableTime: formatDuration(timeAvailable),
        basedOnInterests: interests.length > 0 ? interests : ['all']
      }
    });

  } catch (error) {
    console.error('Error generating route suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating route suggestions',
      error: error.message
    });
  }
};

// Calculate travel matrix for multiple places
const getTravelMatrix = async (req, res) => {
  try {
    const { placeIds } = req.body;

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 place IDs are required'
      });
    }

    if (placeIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 places allowed for matrix calculation'
      });
    }

    const places = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ],
      isActive: true
    });

    if (places.length !== placeIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Some places not found'
      });
    }

    const optimizer = new PathOptimizer();
    const { matrix, distances } = await optimizer.buildAdjacencyMatrix(places);

    // Format response
    const travelMatrix = places.map((fromPlace, i) => ({
      from: {
        id: fromPlace.id,
        name: fromPlace.name
      },
      destinations: places.map((toPlace, j) => ({
        to: {
          id: toPlace.id,
          name: toPlace.name
        },
        duration: Math.round(matrix[i][j]),
        distance: distances[i][j].distance.toFixed(2),
        durationText: distances[i][j].durationText,
        distanceText: distances[i][j].distanceText
      }))
    }));

    res.status(200).json({
      success: true,
      data: {
        places: places.map(p => ({ id: p.id, name: p.name })),
        travelMatrix
      }
    });

  } catch (error) {
    console.error('Error calculating travel matrix:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating travel matrix',
      error: error.message
    });
  }
};

// Helper functions
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function calculateEndTime(startTime, totalMinutes) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = startTotalMinutes + totalMinutes;
  
  const endHour = Math.floor(endTotalMinutes / 60) % 24;
  const endMin = endTotalMinutes % 60;
  
  return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
}

module.exports = {
  optimizeRoute,
  getDistanceBetweenPlaces,
  getSuggestedRoutes,
  getTravelMatrix
};