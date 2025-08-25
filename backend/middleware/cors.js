// backend/controllers/tripController.js - ENHANCED WITH GEMINI AI + ALGORITHMS - FIXED

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');
const OptimizationAlgorithms = require('../utils/optimizationAlgorithms');
const DistanceCalculator = require('../utils/distanceCalculator');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize optimization algorithms
const optimizationAlgorithms = new OptimizationAlgorithms();
const distanceCalculator = new DistanceCalculator();

// FIXED: Add the missing applyOptimizationAlgorithm function
async function applyOptimizationAlgorithm(places, algorithmRecommendation, preferences, algorithmParams) {
  const algorithm = algorithmRecommendation.algorithm;
  
  console.log(`🚀 Applying ${algorithm} algorithm to ${places.length} places`);
  
  try {
    switch (algorithm) {
      case 'advancedGreedy':
        return await optimizationAlgorithms.advancedGreedyOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        
      case 'genetic':
        return await optimizationAlgorithms.geneticAlgorithmOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        
      case 'nearestNeighbor':
        return await optimizationAlgorithms.nearestNeighborOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        
      default:
        console.warn(`Unknown algorithm: ${algorithm}, falling back to advancedGreedy`);
        return await optimizationAlgorithms.advancedGreedyOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
    }
  } catch (error) {
    console.error(`Algorithm ${algorithm} failed:`, error);
    // Fallback to simple greedy
    return await optimizationAlgorithms.advancedGreedyOptimization(places, preferences);
  }
}

// MAIN ROUTE OPTIMIZATION WITH GEMINI AI + ALGORITHMS
const optimizeTripWithAI = async (req, res) => {
  try {
    console.log('🤖 STARTING GEMINI AI + ALGORITHM OPTIMIZATION');
    
    const {
      places,
      preferences = {},
      constraints = {},
      algorithmParams = {}
    } = req.body;

    // Enhanced input validation
    const validation = validateTripOptimizationInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    console.log(`📊 Input: ${places.length} places, Level: ${preferences.optimizationLevel || 'balanced'}`);

    // Step 1: Get detailed place information from database
    console.log('🔍 Enriching places from database...');
    const enrichedPlaces = await enrichPlacesFromDatabase(places);
    
    if (enrichedPlaces.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found in database'
      });
    }

    // Step 2: Let Gemini AI analyze and provide intelligent recommendations
    console.log('🧠 Getting Gemini AI analysis...');
    const geminiAnalysis = await getGeminiTripAnalysis(enrichedPlaces, preferences, constraints);
    
    // Step 3: Apply advanced algorithms based on Gemini's recommendations
    console.log(`⚡ Applying ${geminiAnalysis.algorithmRecommendation.algorithm} algorithm...`);
    const algorithmResult = await applyOptimizationAlgorithm(
      enrichedPlaces,
      geminiAnalysis.algorithmRecommendation,
      { ...preferences, ...constraints },
      algorithmParams
    );

    // Step 4: Get Gemini to create detailed itinerary with the optimized route
    console.log('📋 Generating detailed itinerary...');
    const detailedItinerary = await generateGeminiItinerary(
      algorithmResult.route,
      geminiAnalysis,
      preferences,
      constraints
    );

    // Step 5: Combine algorithm results with Gemini insights
    const finalResult = {
      success: true,
      algorithm: algorithmResult.algorithm,
      route: algorithmResult.route,
      itinerary: detailedItinerary.itinerary,
      
      // Algorithm metrics
      metrics: {
        totalTime: algorithmResult.totalTime,
        totalDistance: algorithmResult.totalDistance,
        totalTravelTime: algorithmResult.totalTravelTime,
        totalVisitTime: algorithmResult.totalVisitTime,
        efficiency: algorithmResult.efficiency,
        constraintsSatisfied: algorithmResult.constraintsSatisfied,
        placesVisited: algorithmResult.route.length,
        placesSkipped: places.length - algorithmResult.route.length
      },
      
      // Gemini AI insights
      aiInsights: {
        tripOverview: geminiAnalysis.tripOverview,
        recommendations: geminiAnalysis.recommendations,
        warnings: geminiAnalysis.warnings,
        bestTimeToTravel: geminiAnalysis.bestTimeToTravel,
        budgetEstimate: geminiAnalysis.budgetEstimate,
        culturalTips: geminiAnalysis.culturalTips,
        routingStrategy: geminiAnalysis.routingStrategy
      },
      
      // Combined data
      optimizationDetails: {
        algorithmUsed: algorithmResult.algorithm,
        aiAnalysisUsed: true,
        aiRecommendedAlgorithm: geminiAnalysis.algorithmRecommendation.algorithm,
        executionTime: Date.now() - req.startTime,
        optimizationLevel: preferences.optimizationLevel || 'balanced'
      },
      
      alternatives: detailedItinerary.alternatives || [],
      practicalInfo: detailedItinerary.practicalInfo || {},
      warnings: [...(algorithmResult.warnings || []), ...(geminiAnalysis.warnings || [])]
    };

    console.log('✅ GEMINI + ALGORITHM OPTIMIZATION COMPLETED:', {
      algorithm: finalResult.algorithm,
      placesOptimized: finalResult.route.length,
      efficiency: `${finalResult.metrics.efficiency?.toFixed(1)}%`,
      aiInsightsGenerated: !!finalResult.aiInsights.tripOverview
    });

    res.status(200).json(finalResult);

  } catch (error) {
    console.error('💥 Gemini + Algorithm optimization failed:', error);
    
    // Fallback to algorithm-only if Gemini fails
    try {
      console.log('🔄 Falling back to algorithm-only optimization...');
      const fallbackResult = await optimizationAlgorithms.advancedGreedyOptimization(
        await enrichPlacesFromDatabase(req.body.places),
        { ...req.body.preferences, ...req.body.constraints }
      );
      
      return res.status(200).json({
        success: true,
        ...fallbackResult,
        fallback: true,
        aiInsights: {
          tripOverview: 'AI analysis unavailable - using algorithm optimization only',
          recommendations: ['Check internet connection for AI insights'],
          warnings: ['AI features temporarily unavailable']
        },
        optimizationDetails: {
          algorithmUsed: fallbackResult.algorithm || 'advanced-greedy',
          aiAnalysisUsed: false,
          fallbackReason: error.message
        }
      });
      
    } catch (fallbackError) {
      console.error('💥 Fallback also failed:', fallbackError);
      return res.status(500).json({
        success: false,
        message: 'Both AI and algorithm optimization failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        fallbackError: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined
      });
    }
  }
};

// FIXED: Add the missing generateGeminiItinerary function
async function generateGeminiItinerary(route, geminiAnalysis, preferences, constraints) {
  try {
    if (!route || route.length === 0) {
      return {
        itinerary: 'No places in optimized route',
        alternatives: [],
        practicalInfo: {}
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    
    const itineraryPrompt = `Create a detailed day itinerary for this optimized route:

OPTIMIZED ROUTE (${route.length} places):
${route.map((place, index) => `
${index + 1}. ${place.name} (${place.city})
   • Duration: ${place.averageVisitDuration} minutes
   • Rating: ${place.rating}/5 ⭐
   • Entry Fee: ₹${place.entryFee?.indian || 0}
   • Category: ${place.category}
   • Best Time: ${place.bestTimeToVisit?.join(', ') || 'Anytime'}
`).join('')}

PREFERENCES:
• Start Time: ${constraints.startTime || '09:00'}
• Total Time Available: ${constraints.totalTimeAvailable || 480} minutes
• Budget: ${constraints.budget ? '₹' + constraints.budget : 'Flexible'}

Create a detailed hour-by-hour itinerary with travel times, recommendations, and practical tips.

Return in this JSON format:
{
  "itinerary": "Detailed hour-by-hour schedule with specific timings and recommendations",
  "alternatives": ["Alternative suggestion 1", "Alternative suggestion 2"],
  "practicalInfo": {
    "totalDuration": "${Math.round((constraints.totalTimeAvailable || 480) / 60)} hours",
    "transportationTips": "Recommended transport methods",
    "budgetBreakdown": "Estimated cost breakdown",
    "packingList": ["Essential items to carry"]
  }
}`;

    const result = await model.generateContent(itineraryPrompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Gemini itinerary generation failed:', error);
  }

  // Fallback itinerary
  return {
    itinerary: `Start your journey at ${constraints.startTime || '09:00'} and visit ${route.length} amazing places. Total estimated time: ${Math.round((constraints.totalTimeAvailable || 480) / 60)} hours.`,
    alternatives: ['Consider starting earlier for a more relaxed pace', 'Add buffer time between locations'],
    practicalInfo: {
      totalDuration: `${Math.round((constraints.totalTimeAvailable || 480) / 60)} hours`,
      transportationTips: 'Use local transport or cab services',
      budgetBreakdown: 'Entry fees + transportation + meals',
      packingList: ['Water bottle', 'Camera', 'Comfortable shoes']
    }
  };
}

// Get quick trip suggestions with AI recommendations
const getTripSuggestions = async (req, res) => {
  try {
    const {
      location,
      timeAvailable = 480,
      interests = [],
      budget,
      groupSize = 2,
      travelDate
    } = req.query;

    console.log('🎯 Generating AI trip suggestions...');

    // Get nearby places based on location or interests
    let query = { isActive: true };
    
    if (interests && interests.length > 0) {
      const interestArray = Array.isArray(interests) ? interests : interests.split(',');
      query.category = { $in: interestArray.map(i => i.toLowerCase()) };
    }

    let places = await Place.find(query)
      .sort({ rating: -1, reviewCount: -1 })
      .limit(50);

    // Filter by location if provided
    if (location && typeof location === 'string') {
      const coords = location.split(',').map(Number);
      if (coords.length === 2 && !coords.some(isNaN)) {
        const [lat, lng] = coords;
        places = await Place.findNearby(lat, lng, 100);
      }
    }

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No places found matching your criteria'
      });
    }

    // Get AI suggestions for different trip types
    const suggestions = await generateAISuggestions(places, {
      timeAvailable: parseInt(timeAvailable),
      interests,
      budget: budget ? parseInt(budget) : undefined,
      groupSize: parseInt(groupSize),
      travelDate
    });

    res.status(200).json({
      success: true,
      suggestions,
      totalPlacesConsidered: places.length,
      criteria: {
        location,
        timeAvailable: parseInt(timeAvailable),
        interests,
        budget,
        groupSize: parseInt(groupSize)
      }
    });

  } catch (error) {
    console.error('Error generating trip suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating trip suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Analyze existing trip and provide AI improvements
const analyzeExistingTrip = async (req, res) => {
  try {
    const { places, currentOrder } = req.body;

    if (!places || !Array.isArray(places) || places.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 places required for analysis'
      });
    }

    console.log('🔍 Analyzing existing trip with AI...');

    const enrichedPlaces = await enrichPlacesFromDatabase(places);
    const analysis = await getGeminiTripAnalysis(enrichedPlaces, {}, {});
    
    // Calculate current trip metrics
    const currentMetrics = await optimizationAlgorithms.calculateRouteMetrics(enrichedPlaces);
    
    // Get optimized alternative
    const optimized = await optimizationAlgorithms.advancedGreedyOptimization(enrichedPlaces, {});
    const optimizedMetrics = await optimizationAlgorithms.calculateRouteMetrics(optimized.route);

    res.status(200).json({
      success: true,
      currentTrip: {
        route: enrichedPlaces,
        metrics: currentMetrics
      },
      optimizedTrip: {
        route: optimized.route,
        metrics: optimizedMetrics
      },
      analysis: analysis,
      improvements: {
        timeSaved: currentMetrics.totalTime - optimizedMetrics.totalTime,
        distanceSaved: currentMetrics.totalDistance - optimizedMetrics.totalDistance,
        efficiencyGain: ((optimizedMetrics.efficiency - currentMetrics.efficiency) / currentMetrics.efficiency * 100).toFixed(1)
      }
    });

  } catch (error) {
    console.error('Error analyzing trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing trip',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper Functions

// Validate trip optimization input
function validateTripOptimizationInput(body) {
  const errors = [];
  const { places, preferences = {}, constraints = {} } = body;

  // Validate places
  if (!places || !Array.isArray(places)) {
    errors.push('places must be an array');
  } else if (places.length < 2) {
    errors.push('At least 2 places required');
  } else if (places.length > 20) {
    errors.push('Maximum 20 places allowed');
  }

  // Validate places structure
  if (places && Array.isArray(places)) {
    places.forEach((place, index) => {
      if (!place.id && !place._id) {
        errors.push(`Place at index ${index} must have an id or _id`);
      }
    });
  }

  // Validate time constraints
  if (constraints.totalTimeAvailable && 
      (typeof constraints.totalTimeAvailable !== 'number' || constraints.totalTimeAvailable < 60)) {
    errors.push('totalTimeAvailable must be a number >= 60 minutes');
  }

  // Validate budget
  if (constraints.budget && 
      (typeof constraints.budget !== 'number' || constraints.budget < 0)) {
    errors.push('budget must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Enrich places with database information
async function enrichPlacesFromDatabase(inputPlaces) {
  const enrichedPlaces = [];
  
  for (const place of inputPlaces) {
    try {
      // Find place in database using multiple search criteria
      const dbPlace = await Place.findOne({
        $or: [
          { id: place.id },
          { _id: place.id },
          { name: new RegExp(place.name, 'i') }
        ],
        isActive: true
      });

      if (dbPlace) {
        // Merge input with database data, prioritizing database data
        enrichedPlaces.push({
          ...place,
          ...dbPlace.toObject(),
          // Ensure required algorithm fields are properly formatted
          id: dbPlace.id || dbPlace._id.toString(),
          location: {
            latitude: parseFloat(dbPlace.location.latitude),
            longitude: parseFloat(dbPlace.location.longitude)
          },
          averageVisitDuration: parseInt(dbPlace.averageVisitDuration) || 90,
          rating: parseFloat(dbPlace.rating) || 3.5,
          entryFee: dbPlace.entryFee || { indian: 0, foreign: 0 },
          category: dbPlace.category || 'general',
          amenities: dbPlace.amenities || [],
          tags: dbPlace.tags || [],
          bestTimeToVisit: dbPlace.bestTimeToVisit || ['morning'],
          kidFriendly: dbPlace.kidFriendly !== false,
          wheelchairAccessible: dbPlace.wheelchairAccessible === true
        });
      } else {
        console.warn(`Place not found in database: ${place.name || place.id}`);
        // Use input data with defaults if not found in database
        enrichedPlaces.push({
          ...place,
          id: place.id || place._id || `temp_${Date.now()}`,
          location: place.location || { latitude: 0, longitude: 0 },
          averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
          rating: parseFloat(place.rating) || 3.5,
          category: place.category || 'general',
          entryFee: place.entryFee || { indian: 0, foreign: 0 }
        });
      }
    } catch (error) {
      console.error(`Error enriching place ${place.name || place.id}:`, error);
      // Use original data on error
      enrichedPlaces.push({
        ...place,
        id: place.id || place._id || `error_${Date.now()}`,
        averageVisitDuration: 90,
        rating: 3.5
      });
    }
  }
  
  console.log(`📍 Enriched ${enrichedPlaces.length} places from database`);
  return enrichedPlaces;
}

// Get Gemini AI analysis and recommendations
async function getGeminiTripAnalysis(places, preferences, constraints) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  
  // Calculate geographic spread for algorithm selection
  const coordinates = places.map(p => p.location);
  const spread = calculateGeographicSpread(coordinates);
  
  const analysisPrompt = `As an expert South Indian travel planner with deep knowledge of optimization algorithms, analyze this trip request:

PLACES TO VISIT (${places.length} places):
${places.map((place, index) => `
${index + 1}. ${place.name} (${place.city}, ${place.state})
   • Category: ${place.category}
   • Rating: ${place.rating}/5 ⭐
   • Visit Duration: ${place.averageVisitDuration} minutes
   • Entry Fee: ₹${place.entryFee?.indian || 0}
   • Amenities: ${place.amenities?.join(', ') || 'Basic'}
   • Best Time: ${place.bestTimeToVisit?.join(', ') || 'Anytime'}
   • Kid Friendly: ${place.kidFriendly ? '✅' : '❌'}
   • Wheelchair Access: ${place.wheelchairAccessible ? '✅' : '❌'}
   • Coordinates: ${place.location.latitude}, ${place.location.longitude}
`).join('')}

USER PREFERENCES & CONSTRAINTS:
• Optimization Level: ${preferences.optimizationLevel || 'balanced'}
• Optimize For: ${preferences.optimizeFor || 'balanced experience'}
• Time Available: ${constraints.totalTimeAvailable || 480} minutes (${Math.floor((constraints.totalTimeAvailable || 480) / 60)} hours)
• Start Time: ${constraints.startTime || '09:00'}
• Budget: ${constraints.budget ? '₹' + constraints.budget : 'Flexible'}
• Group Size: ${constraints.groupSize || 2} people
• Accessibility Needs: ${constraints.accessibility?.wheelchairAccess ? 'Wheelchair access required' : 'Standard'}
• Kid-Friendly Required: ${constraints.accessibility?.kidFriendly ? 'Yes' : 'No'}

GEOGRAPHIC ANALYSIS:
• Geographic Spread: ${spread.maxDistance.toFixed(1)}km
• Average Distance Between Places: ${spread.averageDistance.toFixed(1)}km
• Cluster Density: ${spread.density}

ALGORITHM SELECTION CRITERIA:
• Places Count: ${places.length}
• Geographic Complexity: ${spread.complexity}
• Time Constraints: ${constraints.totalTimeAvailable ? 'Tight' : 'Flexible'}
• Optimization Level: ${preferences.optimizationLevel || 'balanced'}

Provide a comprehensive analysis in this EXACT JSON format:

{
  "tripOverview": "2-3 sentences describing this trip and its highlights",
  "algorithmRecommendation": {
    "algorithm": "genetic|antColony|simulatedAnnealing|advancedGreedy|dynamicProgramming",
    "reason": "Scientific justification for this algorithm selection",
    "expectedExecutionTime": "5-30 seconds",
    "confidence": "high|medium|low"
  },
  "routingStrategy": {
    "startingPlace": "recommended place name to start with and why",
    "endingPlace": "recommended place to end with and why",
    "criticalConstraints": ["time", "distance", "budget", "accessibility"],
    "optimizationPriorities": ["rating", "proximity", "cultural_significance", "time_efficiency"]
  },
  "recommendations": [
    "Start early at 8:30 AM to avoid crowds",
    "Carry sufficient water and snacks",
    "Book tickets in advance for popular attractions",
    "Consider local transport options between nearby places"
  ],
  "warnings": [
    "Places A and B are 85km apart - plan for 2+ hours travel",
    "Temple X closes at 1 PM - visit in morning",
    "Monsoon season may affect outdoor activities"
  ],
  "bestTimeToTravel": "Optimal time of day, season, and weather considerations",
  "budgetEstimate": {
    "entryFees": ${places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0)},
    "transportation": ${Math.round(places.length * 200)},
    "food": ${Math.round(places.length * 150)},
    "miscellaneous": ${Math.round(places.length * 100)},
    "total": ${Math.round(places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0) + places.length * 450)}
  },
  "culturalTips": [
    "Remove shoes before entering temples",
    "Dress modestly at religious sites",
    "Try local specialties at each location",
    "Learn basic Tamil/Telugu/Kannada phrases"
  ]
}

ALGORITHM SELECTION GUIDELINES:
• advancedGreedy: 2-8 places, low complexity, fast results needed
• genetic: 6-15 places, medium complexity, balanced optimization 
• antColony: 10-20 places, high complexity, handles complex routing
• simulatedAnnealing: Any size, when escaping local optima is crucial
• dynamicProgramming: 2-6 places, when optimal solution is required`;

  try {
    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    console.log('🤖 Gemini AI response received');
    
    // Extract JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`🧠 AI recommended algorithm: ${analysis.algorithmRecommendation.algorithm}`);
      return analysis;
    } else {
      throw new Error('No JSON found in AI response');
    }
  } catch (error) {
    console.error('🚨 Gemini analysis failed:', error);
    
    // Return intelligent default analysis based on input
    const defaultAlgorithm = selectDefaultAlgorithm(places.length, spread);
    
    return {
      tripOverview: `A ${places.length}-place tour covering ${places.map(p => p.city).filter((city, index, arr) => arr.indexOf(city) === index).length} cities in South India with diverse attractions.`,
      algorithmRecommendation: {
        algorithm: defaultAlgorithm,
        reason: `Selected based on ${places.length} places and geographic spread of ${spread.maxDistance.toFixed(1)}km`,
        expectedExecutionTime: '5-15 seconds',
        confidence: 'medium'
      },
      routingStrategy: {
        startingPlace: places[0].name,
        endingPlace: places[places.length - 1].name,
        criticalConstraints: ['time', 'distance'],
        optimizationPriorities: ['rating', 'proximity', 'time_efficiency']
      },
      recommendations: [
        'Start early to make the most of your day',
        'Check opening hours for all attractions',
        'Plan for traffic delays between locations',
        'Carry water and snacks for the journey'
      ],
      warnings: spread.maxDistance > 100 ? ['Some places are quite far apart - expect significant travel time'] : [],
      bestTimeToTravel: 'Early morning start recommended, avoid peak afternoon heat',
      budgetEstimate: {
        entryFees: places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0),
        transportation: Math.round(places.length * 200),
        food: Math.round(places.length * 150),
        miscellaneous: Math.round(places.length * 100),
        total: Math.round(places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0) + places.length * 450)
      },
      culturalTips: [
        'Respect local customs and traditions',
        'Dress modestly at religious sites',
        'Try local cuisine at each destination',
        'Learn basic greetings in the local language'
      ]
    };
  }
}

// Calculate geographic spread for algorithm selection
function calculateGeographicSpread(coordinates) {
  if (coordinates.length < 2) {
    return { maxDistance: 0, averageDistance: 0, density: 'high', complexity: 'low' };
  }

  const distances = [];
  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const distance = distanceCalculator.calculateDistance(
        coordinates[i].latitude, coordinates[i].longitude,
        coordinates[j].latitude, coordinates[j].longitude
      );
      distances.push(distance);
    }
  }

  const maxDistance = Math.max(...distances);
  const averageDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;

  let density, complexity;
  
  if (averageDistance < 25) {
    density = 'high';
    complexity = 'low';
  } else if (averageDistance < 75) {
    density = 'medium';
    complexity = 'medium';
  } else {
    density = 'low';
    complexity = 'high';
  }

  return {
    maxDistance,
    averageDistance,
    density,
    complexity
  };
}

// Select default algorithm when AI fails
function selectDefaultAlgorithm(placeCount, spread) {
  if (placeCount <= 6 && spread.complexity === 'low') {
    return 'dynamicProgramming';
  } else if (placeCount <= 8) {
    return 'advancedGreedy';
  } else if (placeCount <= 15 && spread.complexity === 'medium') {
    return 'genetic';
  } else {
    return 'antColony';
  }
}

// Generate AI suggestions for different trip types
async function generateAISuggestions(places, criteria) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const suggestionsPrompt = `Create 3 different trip suggestions from these South Indian places:

AVAILABLE PLACES:
${places.slice(0, 30).map((place, index) => `
${index + 1}. ${place.name} (${place.city}, ${place.state})
   Rating: ${place.rating}/5 | Duration: ${place.averageVisitDuration}min | Fee: ₹${place.entryFee?.indian || 0}
   Category: ${place.category} | Kid-Friendly: ${place.kidFriendly ? 'Yes' : 'No'}
`).join('')}

CRITERIA:
- Time Available: ${criteria.timeAvailable} minutes
- Interests: ${criteria.interests?.join(', ') || 'All types'}
- Budget: ${criteria.budget ? '₹' + criteria.budget : 'Flexible'}
- Group Size: ${criteria.groupSize} people

Create exactly 3 trip suggestions with this JSON format:

{
  "suggestions": [
    {
      "type": "Quick Explorer",
      "description": "Perfect for half-day trips",
      "recommendedPlaces": ["Place Name 1", "Place Name 2", "Place Name 3"],
      "estimatedTime": "3-4 hours",
      "estimatedCost": 500,
      "difficulty": "Easy",
      "highlights": ["Key attraction 1", "Key attraction 2"]
    },
    {
      "type": "Cultural Heritage",
      "description": "Focus on historical and cultural sites",
      "recommendedPlaces": ["Place Name 1", "Place Name 2", "Place Name 4"],
      "estimatedTime": "5-6 hours", 
      "estimatedCost": 800,
      "difficulty": "Moderate",
      "highlights": ["Cultural highlight 1", "Cultural highlight 2"]
    },
    {
      "type": "Comprehensive Adventure",
      "description": "Full day with diverse experiences",
      "recommendedPlaces": ["Place Name 1", "Place Name 2", "Place Name 5", "Place Name 6"],
      "estimatedTime": "7-8 hours",
      "estimatedCost": 1200,
      "difficulty": "Challenging", 
      "highlights": ["Adventure highlight 1", "Adventure highlight 2"]
    }
  ]
}`;

  try {
    const result = await model.generateContent(suggestionsPrompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('AI suggestions failed:', error);
  }

  // Fallback suggestions
  return {
    suggestions: [
      {
        type: "Quick Explorer",
        description: "Perfect for half-day trips with top-rated places",
        recommendedPlaces: places.slice(0, 3).map(p => p.name),
        estimatedTime: "3-4 hours",
        estimatedCost: places.slice(0, 3).reduce((sum, p) => sum + (p.entryFee?.indian || 0), 300),
        difficulty: "Easy",
        highlights: ["Top-rated attractions", "Minimal travel time"]
      },
      {
        type: "Cultural Heritage",
        description: "Focus on temples, heritage sites and cultural attractions",
        recommendedPlaces: places.filter(p => ['temple', 'heritage', 'museum'].includes(p.category)).slice(0, 4).map(p => p.name),
        estimatedTime: "5-6 hours",
        estimatedCost: 800,
        difficulty: "Moderate", 
        highlights: ["Rich cultural experience", "Historical significance"]
      },
      {
        type: "Comprehensive Adventure",
        description: "Full day experience with maximum variety",
        recommendedPlaces: places.slice(0, 6).map(p => p.name),
        estimatedTime: "7-8 hours",
        estimatedCost: 1200,
        difficulty: "Challenging",
        highlights: ["Diverse experiences", "Maximum exploration"]
      }
    ]
  };
}

// Add timing middleware
function addRequestTiming(req, res, next) {
  req.startTime = Date.now();
  next();
}

module.exports = {
  optimizeTripWithAI,
  getTripSuggestions,
  analyzeExistingTrip,
  addRequestTiming
};