// backend/controllers/routeController.js
const Place = require('../models/Place');
const PathOptimizer = require('../utils/pathOptimizer');

// Enhanced route optimization with comprehensive error handling
const optimizeRoute = async (req, res) => {
  try {
    const { 
      placeIds, 
      startTime = '09:00',
      endTime = '18:00',
      totalTimeAvailable = 480, // 8 hours in minutes
      startDay = new Date().getDay(),
      optimizationLevel = 'fast', // 'fast', 'balanced', 'optimal'
      preferences = {}
    } = req.body;

    console.log(req.body);
    // Enhanced input validation
    const validation = validateOptimizeRouteInput({
      placeIds,
      startTime,
      endTime,
      totalTimeAvailable,
      startDay,
      optimizationLevel
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input parameters',
        errors: validation.errors
      });
    }

    console.log(`Optimizing route for ${placeIds.length} places with ${optimizationLevel} optimization`);

    // Fetch places with enhanced error handling
    const places = await fetchValidPlaces(placeIds);

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found for the provided IDs'
      });
    }

    // Log warning if some places not found
    if (places.length !== placeIds.length) {
      console.warn(`Warning: ${placeIds.length - places.length} places not found or inactive`);
    }

    // Initialize path optimizer
    const optimizer = new PathOptimizer();

    // Set optimization constraints with enhanced parameters
    const timeConstraints = {
      startTime,
      endTime,
      totalTimeAvailable,
      startDay,
      priorityWeight: preferences.priorityWeight || 0.3,
      timeWeight: preferences.timeWeight || 0.4,
      openingWeight: preferences.openingWeight || 0.3
    };

    // Execute optimization with timeout protection
    const optimizedRoute = await Promise.race([
      optimizer.optimizeRoute(places, timeConstraints),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Optimization timeout')), 30000) // 30 second timeout
      )
    ]);

    // Validate optimization result
    if (!optimizedRoute || !optimizedRoute.route || optimizedRoute.route.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Unable to create a feasible route with the given constraints',
        suggestion: 'Try increasing the available time or reducing the number of places'
      });
    }

    // Calculate comprehensive metrics
    const metrics = calculateRouteMetrics(optimizedRoute, places, timeConstraints);

    // Build response with detailed information
    const response = {
      success: true,
      data: {
        optimizedRoute: optimizedRoute.route,
        itinerary: optimizedRoute.itinerary,
        metrics,
        totalDistance: `${optimizedRoute.totalDistance?.toFixed(2)} km`,
        totalTime: formatDuration(optimizedRoute.totalTime),
        totalTravelTime: formatDuration(optimizedRoute.totalTravelTime),
        feasible: optimizedRoute.feasible,
        efficiency: `${optimizedRoute.efficiency?.toFixed(1)}%`,
        optimizationLevel,
        warnings: generateWarnings(optimizedRoute, places, timeConstraints)
      }
    };

    // Add cache statistics in development mode
    if (process.env.NODE_ENV === 'development') {
      response.data.cacheStats = optimizer.getCacheStats();
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Error optimizing route:', error);
    
    // Enhanced error handling with specific error types
    if (error.message === 'Optimization timeout') {
      return res.status(408).json({
        success: false,
        message: 'Route optimization took too long. Try with fewer places or simpler constraints.',
        errorType: 'TIMEOUT'
      });
    }

    if (error.message.includes('API quota exceeded')) {
      return res.status(429).json({
        success: false,
        message: 'Temporarily unable to calculate precise distances. Please try again later.',
        errorType: 'QUOTA_EXCEEDED'
      });
    }

    if (error.message.includes('Invalid coordinates')) {
      return res.status(400).json({
        success: false,
        message: 'Some places have invalid location data.',
        errorType: 'INVALID_COORDINATES'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error optimizing route',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      errorType: 'INTERNAL_ERROR'
    });
  }
};

// Enhanced distance calculation with better error handling
const getDistanceBetweenPlaces = async (req, res) => {
  try {
    const { fromPlaceId, toPlaceId } = req.params;

    // Input validation
    if (!fromPlaceId || !toPlaceId) {
      return res.status(400).json({
        success: false,
        message: 'Both fromPlaceId and toPlaceId are required'
      });
    }

    if (fromPlaceId === toPlaceId) {
      return res.status(400).json({
        success: false,
        message: 'From and to places cannot be the same'
      });
    }

    // Fetch places with parallel queries
    const [fromPlace, toPlace] = await Promise.all([
      Place.findOne({
        $or: [{ _id: fromPlaceId }, { id: fromPlaceId }],
        isActive: true
      }),
      Place.findOne({
        $or: [{ _id: toPlaceId }, { id: toPlaceId }],
        isActive: true
      })
    ]);

    if (!fromPlace) {
      return res.status(404).json({
        success: false,
        message: 'Source place not found',
        errorType: 'FROM_PLACE_NOT_FOUND'
      });
    }

    if (!toPlace) {
      return res.status(404).json({
        success: false,
        message: 'Destination place not found',
        errorType: 'TO_PLACE_NOT_FOUND'
      });
    }

    // Validate coordinates
    if (!isValidCoordinates(fromPlace.location) || !isValidCoordinates(toPlace.location)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates in place data',
        errorType: 'INVALID_COORDINATES'
      });
    }

    const optimizer = new PathOptimizer();
    
    // Get travel information with timeout
    const travelInfo = await Promise.race([
      optimizer.getGoogleMapsDistance(fromPlace.location, toPlace.location),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Distance calculation timeout')), 10000)
      )
    ]);

    res.status(200).json({
      success: true,
      data: {
        from: {
          id: fromPlace.id || fromPlace._id,
          name: fromPlace.name,
          coordinates: fromPlace.location
        },
        to: {
          id: toPlace.id || toPlace._id,
          name: toPlace.name,
          coordinates: toPlace.location
        },
        distance: travelInfo.distanceText,
        duration: travelInfo.durationText,
        distanceKm: parseFloat(travelInfo.distance.toFixed(2)),
        durationMinutes: Math.round(travelInfo.duration),
        durationInTraffic: Math.round(travelInfo.durationInTraffic || travelInfo.duration),
        isFallback: travelInfo.isFallback || false
      }
    });

  } catch (error) {
    console.error('Error calculating distance:', error);
    
    if (error.message === 'Distance calculation timeout') {
      return res.status(408).json({
        success: false,
        message: 'Distance calculation took too long',
        errorType: 'TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error calculating distance between places',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced route suggestions with intelligent filtering
const getSuggestedRoutes = async (req, res) => {
  try {
    const { 
      timeAvailable = 480,
      interests = [],
      startLocation,
      maxPlaces = 8,
      budget,
      accessibility,
      startTime = '09:00',
      startDay = new Date().getDay()
    } = req.query;

    // Input validation
    const timeAvailableNum = parseInt(timeAvailable);
    const maxPlacesNum = parseInt(maxPlaces);

    if (timeAvailableNum < 60 || timeAvailableNum > 1440) {
      return res.status(400).json({
        success: false,
        message: 'Time available must be between 60 and 1440 minutes'
      });
    }

    if (maxPlacesNum < 1 || maxPlacesNum > 20) {
      return res.status(400).json({
        success: false,
        message: 'Max places must be between 1 and 20'
      });
    }

    // Build query with enhanced filtering
    let query = { isActive: true };
    
    // Filter by interests (categories)
    if (interests && interests.length > 0) {
      const interestArray = Array.isArray(interests) ? interests : interests.split(',');
      query.category = { $in: interestArray.map(i => i.toLowerCase()) };
    }

    // Filter by budget if provided
    if (budget) {
      const budgetNum = parseInt(budget);
      query.$or = [
        { 'entryFee.indian': { $lte: budgetNum } },
        { 'entryFee.indian': { $exists: false } },
        { 'entryFee.indian': 0 }
      ];
    }

    // Filter by accessibility requirements
    if (accessibility === 'wheelchair') {
      query.wheelchairAccessible = true;
    }

    // Get places with enhanced sorting
    let places = await Place.find(query)
      .sort({ 
        rating: -1, 
        reviewCount: -1,
        averageVisitDuration: 1 
      })
      .limit(50) // Get more places for better selection
      .select('-__v');

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No places found matching your criteria'
      });
    }

    // Filter by location proximity if provided
    if (startLocation && typeof startLocation === 'string') {
      const coords = startLocation.split(',').map(Number);
      if (coords.length === 2 && !coords.some(isNaN)) {
        const [lat, lng] = coords;
        places = await Place.findNearby(lat, lng, 100); // 100km radius
        
        if (places.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No places found near the specified location'
          });
        }
      }
    }

    // Filter places that are open during the suggested time
    const openPlaces = places.filter(place => 
      !place.openingHours || 
      Object.values(place.openingHours).some(schedule => !schedule.closed)
    );

    const placesToUse = openPlaces.length > 0 ? openPlaces : places;

    // Create intelligent route suggestions
    const suggestions = [];
    const optimizer = new PathOptimizer();

    // Quick Explorer Route (3-4 hours, top-rated, short duration)
    if (timeAvailableNum >= 180) {
      const quickPlaces = placesToUse
        .filter(p => (p.averageVisitDuration || 60) <= 90)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, Math.min(6, maxPlacesNum));
      
      if (quickPlaces.length > 0) {
        try {
          const quickRoute = await optimizer.optimizeRoute(quickPlaces, {
            startTime,
            totalTimeAvailable: Math.min(timeAvailableNum * 0.7, 240),
            startDay
          });
          
          suggestions.push({
            type: 'Quick Explorer',
            description: 'Perfect for short trips - visit top-rated places with minimal time commitment',
            route: quickRoute.route,
            totalTime: formatDuration(quickRoute.totalTime),
            totalDistance: `${quickRoute.totalDistance?.toFixed(1)} km`,
            placesCount: quickRoute.route.length,
            difficulty: 'Easy',
            estimatedCost: calculateRouteCost(quickRoute.route),
            highlights: getRouteHighlights(quickRoute.route)
          });
        } catch (error) {
          console.warn('Error creating quick route:', error);
        }
      }
    }

    // Balanced Discovery Route (4-6 hours, mixed attractions)
    if (timeAvailableNum >= 240) {
      const balancedPlaces = placesToUse
        .filter(p => (p.averageVisitDuration || 60) <= 150)
        .sort((a, b) => {
          const scoreA = (a.rating || 0) + (a.reviewCount || 0) / 100;
          const scoreB = (b.rating || 0) + (b.reviewCount || 0) / 100;
          return scoreB - scoreA;
        })
        .slice(0, Math.min(8, maxPlacesNum));
      
      if (balancedPlaces.length > 0) {
        try {
          const balancedRoute = await optimizer.optimizeRoute(balancedPlaces, {
            startTime,
            totalTimeAvailable: timeAvailableNum,
            startDay
          });
          
          suggestions.push({
            type: 'Balanced Discovery',
            description: 'Ideal mix of popular attractions with comfortable pacing',
            route: balancedRoute.route,
            totalTime: formatDuration(balancedRoute.totalTime),
            totalDistance: `${balancedRoute.totalDistance?.toFixed(1)} km`,
            placesCount: balancedRoute.route.length,
            difficulty: 'Moderate',
            estimatedCost: calculateRouteCost(balancedRoute.route),
            highlights: getRouteHighlights(balancedRoute.route)
          });
        } catch (error) {
          console.warn('Error creating balanced route:', error);
        }
      }
    }

    // Comprehensive Adventure Route (6+ hours, maximum places)
    if (timeAvailableNum >= 360) {
      const comprehensivePlaces = placesToUse
        .sort((a, b) => {
          // Complex scoring: rating + popularity + category diversity
          const scoreA = (a.rating || 0) * 2 + Math.log(a.reviewCount || 1);
          const scoreB = (b.rating || 0) * 2 + Math.log(b.reviewCount || 1);
          return scoreB - scoreA;
        })
        .slice(0, Math.min(12, maxPlacesNum));
      
      if (comprehensivePlaces.length > 0) {
        try {
          const comprehensiveRoute = await optimizer.optimizeRoute(comprehensivePlaces, {
            startTime,
            totalTimeAvailable: timeAvailableNum,
            startDay
          });
          
          suggestions.push({
            type: 'Comprehensive Adventure',
            description: 'Maximum exploration for full-day trips with diverse experiences',
            route: comprehensiveRoute.route,
            totalTime: formatDuration(comprehensiveRoute.totalTime),
            totalDistance: `${comprehensiveRoute.totalDistance?.toFixed(1)} km`,
            placesCount: comprehensiveRoute.route.length,
            difficulty: 'Challenging',
            estimatedCost: calculateRouteCost(comprehensiveRoute.route),
            highlights: getRouteHighlights(comprehensiveRoute.route)
          });
        } catch (error) {
          console.warn('Error creating comprehensive route:', error);
        }
      }
    }

    // Cultural Heritage Route (if cultural places available)
    const culturalPlaces = placesToUse.filter(p => 
      ['temple', 'heritage', 'museum', 'cultural'].includes(p.category?.toLowerCase())
    );

    if (culturalPlaces.length >= 3) {
      try {
        const culturalRoute = await optimizer.optimizeRoute(
          culturalPlaces.slice(0, Math.min(8, maxPlacesNum)), 
          {
            startTime,
            totalTimeAvailable: timeAvailableNum * 0.9,
            startDay
          }
        );
        
        suggestions.push({
          type: 'Cultural Heritage',
          description: 'Immerse yourself in rich cultural and historical experiences',
          route: culturalRoute.route,
          totalTime: formatDuration(culturalRoute.totalTime),
          totalDistance: `${culturalRoute.totalDistance?.toFixed(1)} km`,
          placesCount: culturalRoute.route.length,
          difficulty: 'Moderate',
          estimatedCost: calculateRouteCost(culturalRoute.route),
          highlights: getRouteHighlights(culturalRoute.route),
          speciality: 'Cultural Focus'
        });
      } catch (error) {
        console.warn('Error creating cultural route:', error);
      }
    }

    if (suggestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unable to create route suggestions with current constraints',
        suggestion: 'Try adjusting your criteria or increasing available time'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        suggestions,
        totalAvailableTime: formatDuration(timeAvailableNum),
        basedOnCriteria: {
          interests: interests.length > 0 ? interests : ['all'],
          timeAvailable: timeAvailableNum,
          maxPlaces: maxPlacesNum,
          budget: budget || 'no limit',
          accessibility: accessibility || 'standard'
        },
        totalPlacesConsidered: placesToUse.length
      }
    });

  } catch (error) {
    console.error('Error generating route suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating route suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced travel matrix with better error handling
const getTravelMatrix = async (req, res) => {
  try {
    const { placeIds } = req.body;

    if (!placeIds || !Array.isArray(placeIds)) {
      return res.status(400).json({
        success: false,
        message: 'placeIds array is required'
      });
    }

    if (placeIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 place IDs are required'
      });
    }

    if (placeIds.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 15 places allowed for matrix calculation (to prevent timeout)'
      });
    }

    const places = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ],
      isActive: true
    });

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found'
      });
    }

    if (places.length !== placeIds.length) {
      console.warn(`Warning: Only ${places.length} out of ${placeIds.length} places found`);
    }

    // Validate all coordinates before processing
    const invalidPlaces = places.filter(place => !isValidCoordinates(place.location));
    if (invalidPlaces.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some places have invalid coordinates',
        invalidPlaces: invalidPlaces.map(p => ({ id: p.id, name: p.name }))
      });
    }

    const optimizer = new PathOptimizer();
    
    // Build matrix with timeout protection
    const { matrix, distances } = await Promise.race([
      optimizer.buildAdjacencyMatrix(places),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Matrix calculation timeout')), 60000) // 60 second timeout
      )
    ]);

    // Format response with comprehensive information
    const travelMatrix = places.map((fromPlace, i) => ({
      from: {
        id: fromPlace.id || fromPlace._id,
        name: fromPlace.name,
        coordinates: fromPlace.location
      },
      destinations: places.map((toPlace, j) => {
        const distanceInfo = distances[i][j];
        return {
          to: {
            id: toPlace.id || toPlace._id,
            name: toPlace.name,
            coordinates: toPlace.location
          },
          duration: Math.round(matrix[i][j]),
          distance: parseFloat(distanceInfo.distance.toFixed(2)),
          durationText: distanceInfo.durationText,
          distanceText: distanceInfo.distanceText,
          durationInTraffic: Math.round(distanceInfo.durationInTraffic || matrix[i][j]),
          isFallback: distanceInfo.isFallback || false
        };
      })
    }));

    // Calculate matrix statistics
    const matrixStats = {
      totalPairs: places.length * places.length,
      averageDistance: calculateAverageDistance(distances),
      averageDuration: calculateAverageDuration(matrix),
      maxDistance: findMaxDistance(distances),
      minDistance: findMinDistance(distances)
    };

    res.status(200).json({
      success: true,
      data: {
        places: places.map(p => ({ 
          id: p.id || p._id, 
          name: p.name,
          coordinates: p.location 
        })),
        travelMatrix,
        statistics: matrixStats
      }
    });

  } catch (error) {
    console.error('Error calculating travel matrix:', error);
    
    if (error.message === 'Matrix calculation timeout') {
      return res.status(408).json({
        success: false,
        message: 'Travel matrix calculation took too long. Try with fewer places.',
        errorType: 'TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error calculating travel matrix',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper functions with enhanced logic

function validateOptimizeRouteInput(input) {
  const errors = [];
  const { placeIds, startTime, endTime, totalTimeAvailable, startDay, optimizationLevel } = input;

  // Validate placeIds
  if (!placeIds || !Array.isArray(placeIds)) {
    errors.push('placeIds must be an array');
  } else if (placeIds.length === 0) {
    errors.push('placeIds array cannot be empty');
  } else if (placeIds.length > 20) {
    errors.push('Maximum 20 places allowed for optimization');
  }

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (startTime && !timeRegex.test(startTime)) {
    errors.push('startTime must be in HH:MM format');
  }
  if (endTime && !timeRegex.test(endTime)) {
    errors.push('endTime must be in HH:MM format');
  }

  // Validate time logic
  if (startTime && endTime) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (endMinutes <= startMinutes) {
      errors.push('endTime must be after startTime');
    }
  }

  // Validate totalTimeAvailable
  if (totalTimeAvailable !== undefined) {
    if (typeof totalTimeAvailable !== 'number' || totalTimeAvailable < 30) {
      errors.push('totalTimeAvailable must be a number >= 30 minutes');
    }
    if (totalTimeAvailable > 1440) {
      errors.push('totalTimeAvailable cannot exceed 1440 minutes (24 hours)');
    }
  }

  // Validate startDay
  if (startDay !== undefined && (typeof startDay !== 'number' || startDay < 0 || startDay > 6)) {
    errors.push('startDay must be a number between 0 (Sunday) and 6 (Saturday)');
  }

  // Validate optimizationLevel
  const validLevels = ['fast', 'balanced', 'optimal'];
  if (optimizationLevel && !validLevels.includes(optimizationLevel)) {
    errors.push(`optimizationLevel must be one of: ${validLevels.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function fetchValidPlaces(placeIds) {
  try {
    // Separate ObjectIds from string IDs
    const objectIds = [];
    const stringIds = [];
    
    placeIds.forEach(id => {
      // Check if the ID looks like a MongoDB ObjectId (24 hex characters)
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        objectIds.push(id);
      } else {
        stringIds.push(id);
      }
    });

    // Build query conditions
    const queryConditions = [];
    
    if (objectIds.length > 0) {
      queryConditions.push({ _id: { $in: objectIds } });
    }
    
    if (stringIds.length > 0) {
      queryConditions.push({ id: { $in: stringIds } });
    }

    // If no valid conditions, return empty array
    if (queryConditions.length === 0) {
      return [];
    }

    const places = await Place.find({
      $or: queryConditions,
      isActive: true
    }).select('-__v');

    // Validate each place has required data
    return places.filter(place => {
      const hasValidLocation = isValidCoordinates(place.location);
      const hasValidData = place.name && (place.averageVisitDuration || place.averageVisitDuration === 0);
      
      if (!hasValidLocation || !hasValidData) {
        console.warn(`Skipping place ${place.name || place.id}: missing required data`);
        return false;
      }
      
      return true;
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    throw error;
  }
}

function isValidCoordinates(location) {
  return location && 
         typeof location.latitude === 'number' && 
         typeof location.longitude === 'number' &&
         location.latitude >= -90 && location.latitude <= 90 &&
         location.longitude >= -180 && location.longitude <= 180 &&
         !isNaN(location.latitude) && !isNaN(location.longitude);
}

function calculateRouteMetrics(optimizedRoute, allPlaces, timeConstraints) {
  const visitedPlaces = optimizedRoute.route.length;
  const totalPlaces = allPlaces.length;
  const efficiency = (visitedPlaces / totalPlaces * 100).toFixed(1);
  
  const totalVisitTime = optimizedRoute.route.reduce(
    (sum, place) => sum + (place.averageVisitDuration || 60), 0
  );

  return {
    placesVisited: visitedPlaces,
    placesSkipped: totalPlaces - visitedPlaces,
    totalTravelTime: formatDuration(optimizedRoute.totalTravelTime || 0),
    totalVisitTime: formatDuration(totalVisitTime),
    efficiency: `${efficiency}%`,
    estimatedStartTime: timeConstraints.startTime,
    estimatedEndTime: calculateEndTime(timeConstraints.startTime, optimizedRoute.totalTime),
    averageRating: calculateAverageRating(optimizedRoute.route),
    totalEstimatedCost: calculateRouteCost(optimizedRoute.route),
    categoryDistribution: getCategoryDistribution(optimizedRoute.route)
  };
}

function generateWarnings(optimizedRoute, allPlaces, timeConstraints) {
  const warnings = [];

  if (optimizedRoute.route.length < allPlaces.length) {
    warnings.push({
      type: 'INCOMPLETE_ROUTE',
      message: `${allPlaces.length - optimizedRoute.route.length} places were skipped due to time constraints`
    });
  }

  if (optimizedRoute.totalTravelTime > optimizedRoute.totalTime * 0.6) {
    warnings.push({
      type: 'HIGH_TRAVEL_TIME',
      message: 'This route involves significant travel time. Consider grouping places by area.'
    });
  }

  const endTime = calculateEndTime(timeConstraints.startTime, optimizedRoute.totalTime);
  if (timeToMinutes(endTime) > 20 * 60) { // After 8 PM
    warnings.push({
      type: 'LATE_FINISH',
      message: 'This route finishes quite late. Some places might be closed.'
    });
  }

  return warnings;
}

function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function calculateEndTime(startTime, totalMinutes) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMin;
  const endTotalMinutes = startTotalMinutes + Math.round(totalMinutes);
  
  const endHour = Math.floor(endTotalMinutes / 60) % 24;
  const endMin = endTotalMinutes % 60;
  
  return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateRouteCost(route) {
  return route.reduce((total, place) => {
    return total + (place.entryFee?.indian || 0);
  }, 0);
}

function getRouteHighlights(route) {
  return route
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3)
    .map(place => place.name);
}

function calculateAverageRating(route) {
  const ratings = route.filter(place => place.rating).map(place => place.rating);
  return ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 'N/A';
}

function getCategoryDistribution(route) {
  const categories = {};
  route.forEach(place => {
    const category = place.category || 'Other';
    categories[category] = (categories[category] || 0) + 1;
  });
  return categories;
}

function calculateAverageDistance(distances) {
  const allDistances = distances.flat().filter(d => d && d.distance > 0);
  const sum = allDistances.reduce((acc, d) => acc + d.distance, 0);
  return allDistances.length > 0 ? (sum / allDistances.length).toFixed(1) : 0;
}

function calculateAverageDuration(matrix) {
  const allDurations = matrix.flat().filter(d => d > 0);
  const sum = allDurations.reduce((acc, d) => acc + d, 0);
  return allDurations.length > 0 ? Math.round(sum / allDurations.length) : 0;
}

function findMaxDistance(distances) {
  let max = 0;
  distances.forEach(row => {
    row.forEach(d => {
      if (d && d.distance > max) max = d.distance;
    });
  });
  return max.toFixed(1);
}

function findMinDistance(distances) {
  let min = Infinity;
  distances.forEach(row => {
    row.forEach(d => {
      if (d && d.distance > 0 && d.distance < min) min = d.distance;
    });
  });
  return min === Infinity ? 0 : min.toFixed(1);
}

module.exports = {
  optimizeRoute,
  getDistanceBetweenPlaces,
  getSuggestedRoutes,
  getTravelMatrix
};