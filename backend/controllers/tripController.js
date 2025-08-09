// backend/controllers/tripController.js
const TripPlanner = require('../utils/tripPlanner');
const DistanceCalculator = require('../utils/distanceCalculator');
const Place = require('../models/Place');
const Trip = require('../models/Trip');

const tripPlanner = new TripPlanner();
const distanceCalculator = new DistanceCalculator();

/**
 * Generate optimized trip using greedy algorithm
 * POST /api/trips/generate
 */
const generateTrip = async (req, res) => {
  try {
    const {
      preferences,
      constraints = {},
      userId,
      tripName = 'My Optimized Trip'
    } = req.body;

    // Input validation
    const validationError = validateTripPreferences(preferences, constraints);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip preferences',
        error: validationError
      });
    }

    console.log(`Generating trip for user: ${userId || 'anonymous'}`);

    // Merge preferences and constraints
    const planningParams = {
      ...preferences,
      ...constraints,
      startTime: Date.now()
    };

    // Generate optimized trip using greedy algorithm
    const result = await tripPlanner.planTrip(planningParams);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: 'Unable to generate optimal trip',
        error: result.error,
        fallback: result.fallback
      });
    }

    // Save trip to database if user provided
    let savedTrip = null;
    if (userId) {
      try {
        savedTrip = await saveTripToDatabase({
          userId,
          name: tripName,
          trip: result.trip,
          itinerary: result.itinerary,
          metadata: result.metadata,
          preferences: planningParams
        });
      } catch (saveError) {
        console.warn('Failed to save trip to database:', saveError);
        // Continue without saving
      }
    }

    res.status(200).json({
      success: true,
      data: {
        trip: result.trip,
        itinerary: result.itinerary,
        savedTripId: savedTrip?._id,
        metadata: {
          ...result.metadata,
          generatedAt: new Date().toISOString(),
          algorithm: 'greedy-optimized',
          version: '2.0'
        }
      }
    });

  } catch (error) {
    console.error('Trip generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get AI-powered trip suggestions based on preferences
 * GET /api/trips/suggestions
 */
const getTripSuggestions = async (req, res) => {
  try {
    const {
      city,
      interests = [],
      duration = '1-day',
      budget,
      groupType = 'solo',
      season = 'any'
    } = req.query;

    // Get popular places based on filters
    const filter = {
      rating: { $gte: 3.5 }
    };

    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    if (interests.length > 0) {
      const interestArray = Array.isArray(interests) ? interests : interests.split(',');
      filter.category = { $in: interestArray };
    }

    const places = await Place.find(filter)
      .sort({ rating: -1, averageVisitDuration: 1 })
      .limit(20)
      .lean();

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No places found matching your criteria'
      });
    }

    // Generate different trip suggestions
    const suggestions = await generateTripSuggestions(places, {
      duration,
      budget: budget ? parseInt(budget) : Infinity,
      groupType,
      season,
      interests: Array.isArray(interests) ? interests : interests.split(',')
    });

    res.status(200).json({
      success: true,
      data: {
        suggestions,
        basedOn: {
          city: city || 'Multiple cities',
          interests: interests.length > 0 ? interests : ['All categories'],
          duration,
          budget: budget ? `₹${budget}` : 'No limit'
        },
        totalPlacesConsidered: places.length
      }
    });

  } catch (error) {
    console.error('Trip suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting trip suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Optimize existing trip route
 * POST /api/trips/optimize
 */
const optimizeTrip = async (req, res) => {
  try {
    const {
      places,
      startLocation,
      constraints = {},
      optimizationGoal = 'balanced'
    } = req.body;

    if (!places || !Array.isArray(places) || places.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 places are required for optimization'
      });
    }

    // Fetch place details from database
    const placeIds = places.map(p => p.id || p._id || p);
    const placeDetails = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ]
    }).lean();

    if (placeDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found'
      });
    }

    // Apply optimization strategy
    const optimizationParams = {
      startLocation,
      ...constraints,
      strategy: optimizationGoal,
      maxPlaces: placeDetails.length
    };

    const optimizedResult = await tripPlanner.planTrip(optimizationParams, placeDetails);

    if (!optimizedResult.success) {
      return res.status(422).json({
        success: false,
        message: 'Optimization failed',
        error: optimizedResult.error
      });
    }

    // Calculate improvement metrics
    const originalMetrics = await calculateTripMetrics(placeDetails, startLocation);
    const optimizedMetrics = await calculateTripMetrics(optimizedResult.trip.places, startLocation);
    const improvement = calculateImprovement(originalMetrics, optimizedMetrics);

    res.status(200).json({
      success: true,
      data: {
        originalTrip: {
          places: placeDetails,
          metrics: originalMetrics
        },
        optimizedTrip: {
          places: optimizedResult.trip.places,
          metrics: optimizedMetrics
        },
        improvement,
        itinerary: optimizedResult.itinerary,
        recommendations: generateOptimizationRecommendations(improvement)
      }
    });

  } catch (error) {
    console.error('Trip optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get travel matrix for multiple places
 * POST /api/trips/matrix
 */
const getTravelMatrix = async (req, res) => {
  try {
    const { places } = req.body;

    if (!places || !Array.isArray(places) || places.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 places required for travel matrix'
      });
    }

    if (places.length > 12) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 12 places allowed for matrix calculation'
      });
    }

    // Fetch place details
    const placeIds = places.map(p => p.id || p._id || p);
    const placeDetails = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ]
    }).lean();

    if (placeDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found'
      });
    }

    // Extract locations
    const locations = placeDetails.map(place => place.location);

    // Calculate distance matrix
    const matrix = await distanceCalculator.calculateDistanceMatrix(locations, locations);

    // Format response
    const formattedMatrix = placeDetails.map((fromPlace, i) => ({
      from: {
        id: fromPlace.id,
        name: fromPlace.name,
        location: fromPlace.location
      },
      destinations: placeDetails.map((toPlace, j) => ({
        to: {
          id: toPlace.id,
          name: toPlace.name,
          location: toPlace.location
        },
        ...matrix[i][j]
      }))
    }));

    // Calculate statistics
    const statistics = await distanceCalculator.getDistanceStatistics(placeDetails);

    res.status(200).json({
      success: true,
      data: {
        matrix: formattedMatrix,
        statistics,
        places: placeDetails.map(p => ({
          id: p.id,
          name: p.name,
          city: p.city,
          category: p.category
        }))
      }
    });

  } catch (error) {
    console.error('Travel matrix error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating travel matrix',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get saved trips for user
 * GET /api/trips/user/:userId
 */
const getUserTrips = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, sortBy = 'createdAt', sortOrder = 'desc', limit = 10 } = req.query;

    let query = { userId };
    if (status) {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: {
        trips,
        count: trips.length,
        user: userId
      }
    });

  } catch (error) {
    console.error('Get user trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user trips',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get trip by ID
 * GET /api/trips/:tripId
 */
const getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId).lean();
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    res.status(200).json({
      success: true,
      data: trip
    });

  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Analyze trip performance and suggest improvements
 * POST /api/trips/analyze
 */
const analyzeTrip = async (req, res) => {
  try {
    const { places, constraints = {} } = req.body;

    if (!places || !Array.isArray(places)) {
      return res.status(400).json({
        success: false,
        message: 'Places array is required'
      });
    }

    // Fetch place details
    const placeIds = places.map(p => p.id || p._id || p);
    const placeDetails = await Place.find({
      $or: [
        { _id: { $in: placeIds } },
        { id: { $in: placeIds } }
      ]
    }).lean();

    // Calculate current trip metrics
    const metrics = await calculateTripMetrics(placeDetails, constraints.startLocation);
    
    // Generate analysis and recommendations
    const analysis = await generateTripAnalysis(placeDetails, metrics, constraints);
    
    // Get alternative suggestions
    const alternatives = await getAlternativeSuggestions(placeDetails, constraints);

    res.status(200).json({
      success: true,
      data: {
        currentTrip: {
          places: placeDetails.map(p => ({ id: p.id, name: p.name, category: p.category })),
          metrics
        },
        analysis,
        alternatives,
        recommendations: generateImprovementRecommendations(analysis)
      }
    });

  } catch (error) {
    console.error('Trip analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Helper Functions
 */

function validateTripPreferences(preferences, constraints) {
  if (!preferences) {
    return 'Preferences object is required';
  }

  if (preferences.budget && preferences.budget < 0) {
    return 'Budget must be a positive number';
  }

  if (constraints.timeConstraints?.maxDuration && constraints.timeConstraints.maxDuration < 60) {
    return 'Time constraints must be at least 60 minutes';
  }

  if (preferences.interests && !Array.isArray(preferences.interests)) {
    return 'Interests must be an array';
  }

  if (preferences.startLocation && (!preferences.startLocation.latitude || !preferences.startLocation.longitude)) {
    return 'Start location must have valid latitude and longitude';
  }

  return null;
}

async function saveTripToDatabase(tripData) {
  const trip = new Trip({
    userId: tripData.userId,
    name: tripData.name,
    places: tripData.trip.places.map(place => ({
      placeId: place._id || place.id,
      name: place.name,
      category: place.category,
      location: place.location,
      visitDuration: place.averageVisitDuration,
      entryFee: place.entryFee.indian,
      order: tripData.trip.places.indexOf(place) + 1
    })),
    itinerary: tripData.itinerary,
    metrics: {
      totalDistance: tripData.trip.totalDistance || 0,
      totalTime: tripData.trip.totalTime || 0,
      totalCost: tripData.trip.totalCost || 0,
      efficiency: tripData.trip.efficiency || 0,
      placesCount: tripData.trip.places.length
    },
    preferences: tripData.preferences,
    status: 'generated',
    metadata: tripData.metadata
  });

  return await trip.save();
}

async function generateTripSuggestions(places, options) {
  const { duration, budget, groupType, season, interests } = options;
  
  const suggestions = [];

  // Quick Trip (3-4 hours)
  if (duration.includes('half') || duration.includes('quick')) {
    const quickPlaces = places
      .filter(p => p.averageVisitDuration <= 90)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    if (quickPlaces.length >= 2) {
      const optimizedQuick = await tripPlanner.planTrip({
        strategy: 'time',
        timeConstraints: { maxDuration: 240 }, // 4 hours
        budget,
        interests
      }, quickPlaces);

      if (optimizedQuick.success) {
        suggestions.push({
          type: 'Quick Explorer',
          duration: '3-4 hours',
          description: 'Perfect for short visits with top-rated attractions',
          places: optimizedQuick.trip.places.slice(0, 4),
          metrics: {
            totalTime: '3-4 hours',
            estimatedCost: optimizedQuick.trip.totalCost,
            difficulty: 'Easy'
          },
          ideal_for: ['Business travelers', 'Short layovers', 'Quick city tours']
        });
      }
    }
  }

  // Full Day Trip (8-10 hours)
  if (duration.includes('day') || duration.includes('full')) {
    const dayPlaces = places
      .sort((a, b) => (b.rating * 2 + Math.log(b.reviewCount || 1)) - (a.rating * 2 + Math.log(a.reviewCount || 1)))
      .slice(0, 8);

    const optimizedDay = await tripPlanner.planTrip({
      strategy: 'balanced',
      timeConstraints: { maxDuration: 600 }, // 10 hours
      budget,
      interests
    }, dayPlaces);

    if (optimizedDay.success) {
      suggestions.push({
        type: 'Full Day Adventure',
        duration: '8-10 hours',
        description: 'Comprehensive exploration with diverse experiences',
        places: optimizedDay.trip.places,
        metrics: {
          totalTime: '8-10 hours',
          estimatedCost: optimizedDay.trip.totalCost,
          difficulty: 'Moderate'
        },
        ideal_for: ['Tourists', 'Weekend travelers', 'Culture enthusiasts']
      });
    }
  }

  // Cultural Heritage Focus
  const culturalPlaces = places.filter(p => 
    ['temple', 'heritage', 'palace', 'fort'].includes(p.category)
  );

  if (culturalPlaces.length >= 3) {
    const culturalTrip = await tripPlanner.planTrip({
      strategy: 'rating',
      timeConstraints: { maxDuration: 480 },
      budget,
      interests: ['temple', 'heritage', 'palace', 'fort']
    }, culturalPlaces.slice(0, 6));

    if (culturalTrip.success) {
      suggestions.push({
        type: 'Cultural Heritage Trail',
        duration: '6-8 hours',
        description: 'Deep dive into historical and cultural landmarks',
        places: culturalTrip.trip.places,
        metrics: {
          totalTime: '6-8 hours',
          estimatedCost: culturalTrip.trip.totalCost,
          difficulty: 'Moderate'
        },
        ideal_for: ['History buffs', 'Cultural tourists', 'Educational trips'],
        speciality: 'Heritage Focus'
      });
    }
  }

  // Budget-Friendly Trip
  if (budget && budget < 2000) {
    const budgetPlaces = places
      .filter(p => (p.entryFee?.indian || 0) <= budget * 0.2)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);

    if (budgetPlaces.length >= 3) {
      const budgetTrip = await tripPlanner.planTrip({
        strategy: 'balanced',
        budget,
        timeConstraints: { maxDuration: 480 }
      }, budgetPlaces);

      if (budgetTrip.success) {
        suggestions.push({
          type: 'Budget Explorer',
          duration: '6-8 hours',
          description: 'Great experiences without breaking the bank',
          places: budgetTrip.trip.places,
          metrics: {
            totalTime: '6-8 hours',
            estimatedCost: budgetTrip.trip.totalCost,
            difficulty: 'Easy'
          },
          ideal_for: ['Budget travelers', 'Students', 'Backpackers'],
          speciality: 'Budget Friendly'
        });
      }
    }
  }

  return suggestions.length > 0 ? suggestions : [{
    type: 'Custom Selection',
    description: 'Handpicked places based on your preferences',
    places: places.slice(0, 5),
    metrics: {
      totalTime: 'Variable',
      estimatedCost: places.slice(0, 5).reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0),
      difficulty: 'Moderate'
    }
  }];
}

async function calculateTripMetrics(places, startLocation = null) {
  if (places.length === 0) {
    return {
      totalDistance: 0,
      totalTime: 0,
      totalCost: 0,
      averageRating: 0,
      placesCount: 0
    };
  }

  const routeMetrics = await distanceCalculator.calculateRouteMetrics(places, startLocation);
  const totalVisitTime = places.reduce((sum, place) => sum + place.averageVisitDuration, 0);
  const totalCost = places.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
  const averageRating = places.reduce((sum, place) => sum + place.rating, 0) / places.length;

  return {
    totalDistance: routeMetrics.totalDistance,
    totalTravelTime: routeMetrics.totalTime,
    totalVisitTime,
    totalTime: routeMetrics.totalTime + totalVisitTime,
    totalCost,
    averageRating: Math.round(averageRating * 10) / 10,
    placesCount: places.length,
    efficiency: places.length / Math.max((routeMetrics.totalTime + totalVisitTime) / 60, 1),
    categoryDistribution: getCategoryDistribution(places)
  };
}

function calculateImprovement(original, optimized) {
  const distanceImprovement = ((original.totalDistance - optimized.totalDistance) / original.totalDistance) * 100;
  const timeImprovement = ((original.totalTime - optimized.totalTime) / original.totalTime) * 100;
  const efficiencyImprovement = ((optimized.efficiency - original.efficiency) / original.efficiency) * 100;

  return {
    distance: {
      original: `${original.totalDistance.toFixed(1)} km`,
      optimized: `${optimized.totalDistance.toFixed(1)} km`,
      improvement: `${distanceImprovement.toFixed(1)}%`,
      better: distanceImprovement > 0
    },
    time: {
      original: formatDuration(original.totalTime),
      optimized: formatDuration(optimized.totalTime),
      improvement: `${timeImprovement.toFixed(1)}%`,
      better: timeImprovement > 0
    },
    efficiency: {
      original: original.efficiency.toFixed(2),
      optimized: optimized.efficiency.toFixed(2),
      improvement: `${efficiencyImprovement.toFixed(1)}%`,
      better: efficiencyImprovement > 0
    },
    overall: {
      score: (distanceImprovement + timeImprovement + efficiencyImprovement) / 3,
      recommendation: distanceImprovement > 5 || timeImprovement > 5 ? 
        'Significant improvement achieved' : 
        'Marginal improvement - consider other factors'
    }
  };
}

function generateOptimizationRecommendations(improvement) {
  const recommendations = [];

  if (improvement.distance.better && parseFloat(improvement.distance.improvement) > 10) {
    recommendations.push({
      type: 'distance',
      message: 'Route optimization significantly reduced travel distance',
      impact: 'high',
      benefit: 'Lower fuel costs and less travel fatigue'
    });
  }

  if (improvement.time.better && parseFloat(improvement.time.improvement) > 15) {
    recommendations.push({
      type: 'time',
      message: 'Optimized route saves considerable travel time',
      impact: 'high',
      benefit: 'More time for actual sightseeing'
    });
  }

  if (improvement.efficiency.better && parseFloat(improvement.efficiency.improvement) > 20) {
    recommendations.push({
      type: 'efficiency',
      message: 'Trip efficiency significantly improved',
      impact: 'medium',
      benefit: 'Better value for time spent'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'general',
      message: 'Original route was already well-optimized',
      impact: 'low',
      benefit: 'Minor adjustments made for better flow'
    });
  }

  return recommendations;
}

async function generateTripAnalysis(places, metrics, constraints) {
  const analysis = {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    risks: []
  };

  // Analyze strengths
  if (metrics.averageRating >= 4.0) {
    analysis.strengths.push('High-quality attractions with excellent ratings');
  }

  if (metrics.efficiency >= 1.0) {
    analysis.strengths.push('Good time efficiency - visiting multiple places per hour');
  }

  const categoryDistribution = metrics.categoryDistribution;
  if (Object.keys(categoryDistribution).length >= 3) {
    analysis.strengths.push('Diverse experience with multiple attraction types');
  }

  // Analyze weaknesses
  if (metrics.totalTravelTime > metrics.totalVisitTime * 0.6) {
    analysis.weaknesses.push('High travel time relative to visit time');
  }

  if (metrics.totalDistance > 200) {
    analysis.weaknesses.push('Long total distance may cause fatigue');
  }

  if (constraints.budget && metrics.totalCost > constraints.budget * 0.8) {
    analysis.weaknesses.push('Trip cost approaching budget limit');
  }

  // Analyze opportunities
  const clusters = distanceCalculator.clusterPlacesByProximity(places);
  if (clusters.some(cluster => cluster.places.length >= 3)) {
    analysis.opportunities.push('Clustered attractions allow for focused exploration');
  }

  if (metrics.totalTime < (constraints.timeConstraints?.maxDuration || 480) * 0.7) {
    analysis.opportunities.push('Additional time available for more attractions or leisure');
  }

  // Analyze risks
  if (places.some(place => place.averageVisitDuration > 180)) {
    analysis.risks.push('Some attractions require significant time - plan accordingly');
  }

  if (metrics.totalDistance > 150 && !constraints.hasPrivateTransport) {
    analysis.risks.push('Long distance without private transport may be challenging');
  }

  return analysis;
}

async function getAlternativeSuggestions(originalPlaces, constraints) {
  const alternatives = [];

  try {
    // Get nearby alternatives for each place
    for (const place of originalPlaces.slice(0, 3)) { // Limit to avoid too many queries
      const nearbyPlaces = await Place.find({
        _id: { $ne: place._id },
        city: place.city,
        category: place.category,
        rating: { $gte: place.rating - 0.5 }
      }).limit(2).lean();

      if (nearbyPlaces.length > 0) {
        alternatives.push({
          original: { id: place.id, name: place.name, rating: place.rating },
          alternatives: nearbyPlaces.map(p => ({
            id: p.id,
            name: p.name,
            rating: p.rating,
            reason: p.rating > place.rating ? 'Higher rated' : 'Similar experience'
          }))
        });
      }
    }

    return alternatives;
  } catch (error) {
    console.warn('Error getting alternatives:', error);
    return [];
  }
}

function generateImprovementRecommendations(analysis) {
  const recommendations = [];

  // Based on weaknesses
  if (analysis.weaknesses.includes('High travel time relative to visit time')) {
    recommendations.push({
      priority: 'high',
      category: 'routing',
      suggestion: 'Consider grouping places by location to reduce travel time',
      impact: 'Significant time savings'
    });
  }

  if (analysis.weaknesses.includes('Long total distance may cause fatigue')) {
    recommendations.push({
      priority: 'medium',
      category: 'planning',
      suggestion: 'Split trip across multiple days or focus on specific regions',
      impact: 'Reduced fatigue, better experience quality'
    });
  }

  // Based on opportunities
  if (analysis.opportunities.includes('Additional time available for more attractions or leisure')) {
    recommendations.push({
      priority: 'low',
      category: 'enhancement',
      suggestion: 'Add local dining experiences or shopping time',
      impact: 'More comprehensive travel experience'
    });
  }

  // Based on risks
  if (analysis.risks.includes('Some attractions require significant time - plan accordingly')) {
    recommendations.push({
      priority: 'high',
      category: 'timing',
      suggestion: 'Allocate buffer time and consider priority ranking of attractions',
      impact: 'Avoid rushed visits, better time management'
    });
  }

  return recommendations.length > 0 ? recommendations : [{
    priority: 'low',
    category: 'general',
    suggestion: 'Trip appears well-balanced - consider personal preferences for final adjustments',
    impact: 'Personalized experience'
  }];
}

function getCategoryDistribution(places) {
  const distribution = {};
  places.forEach(place => {
    const category = place.category || 'Other';
    distribution[category] = (distribution[category] || 0) + 1;
  });
  return distribution;
}

function formatDuration(minutes) {
  if (minutes < 60) {
    return `${Math.round(minutes)} mins`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}

module.exports = {
  generateTrip,
  getTripSuggestions,
  optimizeTrip,
  getTravelMatrix,
  getUserTrips,
  getTripById,
  analyzeTrip
};