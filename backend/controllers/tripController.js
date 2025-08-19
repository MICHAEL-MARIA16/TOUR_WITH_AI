// backend/controllers/tripController.js - FIXED PLACE ENRICHMENT LOGIC

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');
const OptimizationAlgorithms = require('../utils/optimizationAlgorithms');
const DistanceCalculator = require('../utils/distanceCalculator');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize optimization algorithms
const optimizationAlgorithms = new OptimizationAlgorithms();
const distanceCalculator = new DistanceCalculator();

// FIXED: Enhanced place enrichment function with better error handling
async function enrichPlacesFromDatabase(inputPlaces) {
  console.log(`🔍 Starting place enrichment for ${inputPlaces.length} places...`);
  const enrichedPlaces = [];
  
  for (const place of inputPlaces) {
    try {
      let dbPlace = null;
      const placeName = place.name || place.id || 'Unknown';
      
      console.log(`🔎 Searching for place: ${placeName}`);
      
      // Build flexible search query with multiple fallback strategies
      const searchStrategies = [];
      
      // Strategy 1: Search by ObjectId if the ID looks like one
      if (place.id && typeof place.id === 'string' && place.id.match(/^[0-9a-fA-F]{24}$/)) {
        searchStrategies.push({ _id: place.id });
      }
      
      // Strategy 2: Search by custom id field (string-based IDs)
      if (place.id) {
        searchStrategies.push({ id: place.id });
      }
      
      // Strategy 3: Search by slug/URL-friendly version
      if (place.id && typeof place.id === 'string') {
        searchStrategies.push({ slug: place.id.toLowerCase() });
        // Also try variations of the slug
        const slugVariations = [
          place.id.toLowerCase().replace(/-/g, ' '),
          place.id.toLowerCase().replace(/_/g, ' '),
          place.id.toLowerCase().replace(/[-_]/g, '')
        ];
        slugVariations.forEach(variation => {
          searchStrategies.push({ slug: variation });
        });
      }
      
      // Strategy 4: Search by name (exact and fuzzy)
      if (place.name) {
        searchStrategies.push({ name: place.name });
        searchStrategies.push({ name: { $regex: new RegExp(`^${escapeRegex(place.name)}$`, 'i') } });
        searchStrategies.push({ name: { $regex: new RegExp(escapeRegex(place.name), 'i') } });
      }
      
      // Strategy 5: Search by name extracted from ID
      if (place.id && typeof place.id === 'string') {
        const nameFromId = place.id
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
          .replace(/([A-Z])/g, ' $1')
          .trim();
        
        if (nameFromId !== place.id) {
          searchStrategies.push({ name: { $regex: new RegExp(escapeRegex(nameFromId), 'i') } });
        }
      }
      
      // Strategy 6: Multi-field search
      if (place.city || place.state) {
        const cityStateQuery = {};
        if (place.city) cityStateQuery.city = { $regex: new RegExp(escapeRegex(place.city), 'i') };
        if (place.state) cityStateQuery.state = { $regex: new RegExp(escapeRegex(place.state), 'i') };
        
        if (place.name) {
          searchStrategies.push({
            ...cityStateQuery,
            name: { $regex: new RegExp(escapeRegex(place.name), 'i') }
          });
        }
      }
      
      // Execute search strategies sequentially until we find a match
      for (let i = 0; i < searchStrategies.length && !dbPlace; i++) {
        try {
          const strategy = searchStrategies[i];
          console.log(`  🎯 Trying strategy ${i + 1}: ${JSON.stringify(strategy)}`);
          
          dbPlace = await Place.findOne({
            ...strategy,
            isActive: true
          }).lean();
          
          if (dbPlace) {
            console.log(`  ✅ Found place using strategy ${i + 1}: ${dbPlace.name}`);
            break;
          }
        } catch (searchError) {
          console.warn(`  ⚠️ Strategy ${i + 1} failed:`, searchError.message);
          continue;
        }
      }
      
      // If still no match, try a broad search across all fields
      if (!dbPlace && place.name) {
        try {
          console.log(`  🔍 Trying broad search for: ${place.name}`);
          const searchTerms = place.name.split(/\s+/).filter(term => term.length > 2);
          
          if (searchTerms.length > 0) {
            const regexQueries = searchTerms.map(term => ({
              $or: [
                { name: { $regex: new RegExp(escapeRegex(term), 'i') } },
                { description: { $regex: new RegExp(escapeRegex(term), 'i') } },
                { tags: { $regex: new RegExp(escapeRegex(term), 'i') } },
                { city: { $regex: new RegExp(escapeRegex(term), 'i') } }
              ]
            }));
            
            dbPlace = await Place.findOne({
              $and: regexQueries,
              isActive: true
            }).lean();
            
            if (dbPlace) {
              console.log(`  ✅ Found place using broad search: ${dbPlace.name}`);
            }
          }
        } catch (broadSearchError) {
          console.warn(`  ⚠️ Broad search failed:`, broadSearchError.message);
        }
      }
      
      if (dbPlace) {
        // Successfully found place in database - merge with input data
        const enrichedPlace = {
          // Start with input data
          ...place,
          // Override with database data (more authoritative)
          ...dbPlace,
          // Ensure critical fields are properly formatted
          id: dbPlace.id || dbPlace._id.toString(),
          _id: dbPlace._id.toString(),
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
          wheelchairAccessible: dbPlace.wheelchairAccessible === true,
          // Mark as found in database
          _enriched: true,
          _source: 'database'
        };
        
        console.log(`  ✅ Successfully enriched: ${enrichedPlace.name}`);
        enrichedPlaces.push(enrichedPlace);
        
      } else {
        // Place not found in database - use input data with sensible defaults
        console.warn(`  ❌ Place not found in database: ${placeName}`);
        
        const fallbackPlace = {
          ...place,
          id: place.id || place._id || `fallback_${Date.now()}_${Math.random()}`,
          name: place.name || 'Unknown Place',
          location: place.location || { latitude: 11.0168, longitude: 76.9558 }, // Default to Coimbatore
          averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
          rating: parseFloat(place.rating) || 3.5,
          category: place.category || 'general',
          city: place.city || 'Unknown',
          state: place.state || 'Tamil Nadu',
          entryFee: place.entryFee || { indian: 0, foreign: 0 },
          description: place.description || `Visit ${place.name || 'this place'} for a unique experience.`,
          amenities: place.amenities || [],
          tags: place.tags || [],
          bestTimeToVisit: place.bestTimeToVisit || ['morning', 'evening'],
          kidFriendly: place.kidFriendly !== false,
          wheelchairAccessible: place.wheelchairAccessible === true,
          // Mark as fallback data
          _enriched: false,
          _source: 'fallback',
          _warning: 'Place not found in database, using fallback data'
        };
        
        enrichedPlaces.push(fallbackPlace);
      }
      
    } catch (error) {
      console.error(`💥 Error enriching place ${place.name || place.id}:`, error);
      
      // Create absolute fallback entry
      const errorPlace = {
        ...place,
        id: place.id || `error_${Date.now()}`,
        name: place.name || 'Error Place',
        location: { latitude: 11.0168, longitude: 76.9558 },
        averageVisitDuration: 90,
        rating: 3.0,
        category: 'general',
        city: 'Unknown',
        state: 'Tamil Nadu',
        entryFee: { indian: 0, foreign: 0 },
        description: 'Place data unavailable due to processing error.',
        _enriched: false,
        _source: 'error',
        _error: error.message
      };
      
      enrichedPlaces.push(errorPlace);
    }
  }
  
  console.log(`📊 Place enrichment completed:`);
  console.log(`  • Total input places: ${inputPlaces.length}`);
  console.log(`  • Successfully enriched: ${enrichedPlaces.filter(p => p._enriched).length}`);
  console.log(`  • Using fallback data: ${enrichedPlaces.filter(p => p._source === 'fallback').length}`);
  console.log(`  • Error cases: ${enrichedPlaces.filter(p => p._source === 'error').length}`);
  
  return enrichedPlaces;
}

// Helper function to escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// FIXED: Enhanced Gemini analysis with better error handling
async function getGeminiTripAnalysis(places, preferences, constraints) {
  console.log('🤖 Starting Gemini AI analysis...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not found, using fallback analysis');
    return generateFallbackAnalysis(places, preferences, constraints);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Calculate geographic spread for algorithm selection
    const coordinates = places.map(p => p.location).filter(loc => loc && loc.latitude && loc.longitude);
    const spread = coordinates.length >= 2 ? calculateGeographicSpread(coordinates) : {
      maxDistance: 0,
      averageDistance: 0,
      density: 'high',
      complexity: 'low'
    };
    
    const analysisPrompt = `Analyze this South Indian trip and recommend the best optimization strategy:

PLACES TO VISIT (${places.length} places):
${places.map((place, index) => `
${index + 1}. ${place.name} (${place.city}, ${place.state})
   • Category: ${place.category}
   • Rating: ${place.rating}/5 ⭐
   • Duration: ${place.averageVisitDuration} minutes
   • Entry: ₹${place.entryFee?.indian || 0}
   • Location: ${place.location.latitude}, ${place.location.longitude}
   • Source: ${place._source || 'database'}
`).join('')}

CONSTRAINTS:
• Time Available: ${constraints.totalTimeAvailable || 480} minutes
• Budget: ${constraints.budget ? '₹' + constraints.budget : 'Flexible'}
• Start Time: ${constraints.startTime || '09:00'}

GEOGRAPHIC ANALYSIS:
• Max Distance: ${spread.maxDistance?.toFixed(1) || 0}km
• Avg Distance: ${spread.averageDistance?.toFixed(1) || 0}km
• Complexity: ${spread.complexity || 'low'}

Select the best algorithm and provide analysis in JSON format:

{
  "tripOverview": "Brief 2-3 sentence description of this trip",
  "algorithmRecommendation": {
    "algorithm": "advancedGreedy",
    "reason": "Why this algorithm is best for this scenario",
    "confidence": "high"
  },
  "routingStrategy": {
    "startingPlace": "${places[0]?.name || 'First place'}",
    "optimizationPriorities": ["rating", "proximity", "time_efficiency"]
  },
  "recommendations": [
    "Start early to avoid crowds",
    "Book tickets in advance",
    "Carry water and snacks"
  ],
  "warnings": [
    "Some places are far apart - expect travel time"
  ],
  "budgetEstimate": {
    "total": ${places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0) + 500}
  },
  "culturalTips": [
    "Dress modestly at temples",
    "Try local cuisine"
  ]
}`;

    console.log('📤 Sending request to Gemini AI...');
    
    const result = await Promise.race([
      model.generateContent(analysisPrompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
      )
    ]);
    
    const response = await result.response;
    const aiResponse = response.text();
    
    console.log('📥 Gemini AI response received');
    
    // Parse JSON response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log(`🧠 AI recommended algorithm: ${analysis.algorithmRecommendation?.algorithm}`);
        return analysis;
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('🚨 JSON parsing failed:', parseError);
      throw new Error(`Gemini response parsing failed: ${parseError.message}`);
    }
    
  } catch (error) {
    console.error('🚨 Gemini analysis failed:', error);
    console.log('🔄 Using fallback analysis...');
    return generateFallbackAnalysis(places, preferences, constraints);
  }
}

// Generate fallback analysis when Gemini fails
function generateFallbackAnalysis(places, preferences, constraints) {
  console.log('🔧 Generating fallback analysis...');
  
  const coordinates = places.map(p => p.location).filter(loc => loc && loc.latitude && loc.longitude);
  const spread = coordinates.length >= 2 ? calculateGeographicSpread(coordinates) : {
    maxDistance: 0,
    averageDistance: 0,
    complexity: 'low'
  };
  
  // Algorithm selection logic
  let algorithm = 'advancedGreedy';
  let reason = 'General purpose optimization';
  
  if (places.length <= 6 && spread.complexity === 'low') {
    algorithm = 'dynamicProgramming';
    reason = 'Small number of places with low complexity - optimal solution possible';
  } else if (places.length >= 10 && spread.complexity === 'high') {
    algorithm = 'genetic';
    reason = 'Large number of places with high geographic complexity';
  } else if (spread.maxDistance > 100) {
    algorithm = 'nearestNeighbor';
    reason = 'Large distances between places - prioritizing travel efficiency';
  }
  
  return {
    tripOverview: `A ${places.length}-place journey across ${getUniqueCities(places).length} cities in South India, featuring ${getMostCommonCategory(places)} attractions.`,
    algorithmRecommendation: {
      algorithm: algorithm,
      reason: reason,
      confidence: 'medium'
    },
    routingStrategy: {
      startingPlace: places[0]?.name || 'First place',
      optimizationPriorities: ['rating', 'proximity', 'time_efficiency']
    },
    recommendations: [
      'Start early in the morning to maximize your time',
      'Check opening hours for all attractions in advance',
      spread.maxDistance > 50 ? 'Plan for significant travel time between distant places' : 'Compact route allows for relaxed pacing',
      'Carry water, snacks, and a power bank',
      'Book popular attractions in advance if possible'
    ],
    warnings: generateWarnings(places, spread, constraints),
    budgetEstimate: {
      entryFees: places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0),
      transportation: Math.round(places.length * 150),
      food: Math.round(places.length * 100),
      total: places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0) + Math.round(places.length * 250)
    },
    culturalTips: [
      'Remove shoes before entering temples and religious sites',
      'Dress modestly, especially at religious locations',
      'Try local South Indian cuisine at each destination',
      'Learn basic greetings in Tamil, Telugu, or Kannada',
      'Respect photography restrictions at certain locations'
    ]
  };
}

// Helper functions for fallback analysis
function getUniqueCities(places) {
  return [...new Set(places.map(p => p.city).filter(Boolean))];
}

function getMostCommonCategory(places) {
  const categoryCount = {};
  places.forEach(p => {
    const category = p.category || 'general';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  const mostCommon = Object.keys(categoryCount).reduce((a, b) => 
    categoryCount[a] > categoryCount[b] ? a : b, 'mixed');
  
  return mostCommon === 'temple' ? 'religious' : mostCommon;
}

function safeJsonParse(jsonString) {
  try {
    return { success: true, data: JSON.parse(jsonString) };
  } catch (error) {
    console.error('JSON parse error:', error.message);
    console.error('Original AI response snippet:', jsonString.substring(0, 200));
    return { success: false, error };
  }
}


function generateWarnings(places, spread, constraints) {
  const warnings = [];
  
  if (spread.maxDistance > 100) {
    warnings.push('Some places are over 100km apart - expect significant travel time');
  }
  
  if (places.length > 10) {
    warnings.push('Large number of places - consider spreading over multiple days');
  }
  
  if (constraints.totalTimeAvailable && places.length * 90 > constraints.totalTimeAvailable) {
    warnings.push('Limited time available - some places may need to be skipped');
  }
  
  const fallbackPlaces = places.filter(p => p._source === 'fallback');
  if (fallbackPlaces.length > 0) {
    warnings.push(`${fallbackPlaces.length} places not found in database - using approximate data`);
  }
  
  return warnings.length > 0 ? warnings : ['No specific warnings for this itinerary'];
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

// FIXED: Apply optimization algorithm function
async function applyOptimizationAlgorithm(places, algorithmRecommendation, preferences, algorithmParams) {
  const algorithm = algorithmRecommendation.algorithm || 'advancedGreedy';
  
  console.log(`🚀 Applying ${algorithm} algorithm to ${places.length} places`);
  
  try {
    let result;
    
    switch (algorithm) {
      case 'advancedGreedy':
        result = await optimizationAlgorithms.advancedGreedyOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        break;
        
      case 'genetic':
        result = await optimizationAlgorithms.geneticAlgorithmOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        break;
        
      case 'nearestNeighbor':
        result = await optimizationAlgorithms.nearestNeighborOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        break;
        
      case 'dynamicProgramming':
        result = await optimizationAlgorithms.dynamicProgrammingOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
        break;
        
      default:
        console.warn(`Unknown algorithm: ${algorithm}, falling back to advancedGreedy`);
        result = await optimizationAlgorithms.advancedGreedyOptimization(places, {
          ...preferences,
          ...algorithmParams
        });
    }
    
    if (!result || !result.route) {
      throw new Error('Algorithm returned invalid result');
    }
    
    console.log(`✅ ${algorithm} completed: ${result.route.length} places in route`);
    return {
      ...result,
      algorithm: algorithm,
      success: true
    };
    
  } catch (error) {
    console.error(`💥 Algorithm ${algorithm} failed:`, error);
    
    // Fallback to simple greedy algorithm
    console.log('🔄 Falling back to simple greedy algorithm...');
    try {
      const fallbackResult = await optimizationAlgorithms.advancedGreedyOptimization(places, preferences);
      return {
        ...fallbackResult,
        algorithm: 'advancedGreedy',
        success: true,
        fallbackUsed: true,
        originalAlgorithm: algorithm,
        fallbackReason: error.message
      };
    } catch (fallbackError) {
      console.error('💥 Fallback algorithm also failed:', fallbackError);
      
      // Ultimate fallback - return places in original order
      return {
        route: places.slice(0, Math.min(places.length, 10)), // Limit to 10 places
        algorithm: 'original-order',
        totalTime: places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
        totalDistance: 0,
        efficiency: 0,
        success: false,
        error: fallbackError.message
      };
    }
  }
}

// Generate detailed itinerary with Gemini AI
async function generateGeminiItinerary(route, geminiAnalysis, preferences, constraints) {
  if (!route || route.length === 0) {
    return {
      itinerary: 'No places in optimized route to create itinerary.',
      alternatives: ['Try with different places or constraints'],
      practicalInfo: {}
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const itineraryPrompt = `Create a detailed day itinerary for this optimized South Indian route:

OPTIMIZED ROUTE (${route.length} places):
${route.map((place, index) => `
${index + 1}. ${place.name} (${place.city})
   • Duration: ${place.averageVisitDuration} minutes
   • Rating: ${place.rating}/5 ⭐
   • Entry: ₹${place.entryFee?.indian || 0}
   • Category: ${place.category}
   • Source: ${place._source || 'database'}
`).join('')}

PREFERENCES:
• Start Time: ${constraints.startTime || '09:00'}
• Time Available: ${constraints.totalTimeAvailable || 480} minutes
• Budget: ${constraints.budget ? '₹' + constraints.budget : 'Flexible'}

Return detailed itinerary in JSON format:
{
  "itinerary": "Hour-by-hour schedule with timings and recommendations",
  "alternatives": ["Alternative suggestion 1", "Alternative suggestion 2"],
  "practicalInfo": {
    "totalDuration": "X hours",
    "transportationTips": "Transport recommendations",
    "budgetBreakdown": "Cost breakdown",
    "packingList": ["Item 1", "Item 2"]
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
  const startTime = constraints.startTime || '09:00';
  const totalHours = Math.round((constraints.totalTimeAvailable || 480) / 60);
  
  return {
    itinerary: `Start your ${route.length}-place journey at ${startTime}. Visit ${route.map(p => p.name).join(' → ')}. Total duration: approximately ${totalHours} hours including travel time.`,
    alternatives: [
      'Consider starting 30 minutes earlier for a more relaxed pace',
      'Add buffer time between locations for traffic delays',
      'Split into multiple days if time permits'
    ],
    practicalInfo: {
      totalDuration: `${totalHours} hours`,
      transportationTips: 'Use private vehicle or cab for flexibility between locations',
      budgetBreakdown: `Entry fees: ₹${route.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0)}, Transport & meals: ₹${route.length * 300}`,
      packingList: ['Water bottle', 'Camera', 'Comfortable shoes', 'Sunscreen', 'Power bank']
    }
  };
}

// MAIN ROUTE OPTIMIZATION WITH ENHANCED ERROR HANDLING
const optimizeTripWithAI = async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🤖 STARTING ENHANCED GEMINI AI + ALGORITHM OPTIMIZATION');
    
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

    // Step 1: Enhanced place enrichment from database
    console.log('🔍 Enriching places from database...');
    const enrichedPlaces = await enrichPlacesFromDatabase(places);
    
    if (enrichedPlaces.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places could be processed'
      });
    }

    // Step 2: Get Gemini AI analysis with fallback
    console.log('🧠 Getting Gemini AI analysis...');
    const geminiAnalysis = await getGeminiTripAnalysis(enrichedPlaces, preferences, constraints);
    
    // Step 3: Apply optimization algorithm
    console.log(`⚡ Applying ${geminiAnalysis.algorithmRecommendation.algorithm} algorithm...`);
    const algorithmResult = await applyOptimizationAlgorithm(
      enrichedPlaces,
      geminiAnalysis.algorithmRecommendation,
      { ...preferences, ...constraints },
      algorithmParams
    );

    // Step 4: Generate detailed itinerary
    console.log('📋 Generating detailed itinerary...');
    const detailedItinerary = await generateGeminiItinerary(
      algorithmResult.route,
      geminiAnalysis,
      preferences,
      constraints
    );

    // Step 5: Build comprehensive response
    const executionTime = Date.now() - startTime;
    
    const finalResult = {
      success: true,
      algorithm: algorithmResult.algorithm,
      route: algorithmResult.route,
      itinerary: detailedItinerary.itinerary,
      
      // Algorithm metrics
      metrics: {
        totalTime: algorithmResult.totalTime || 0,
        totalDistance: algorithmResult.totalDistance || 0,
        totalTravelTime: algorithmResult.totalTravelTime || 0,
        totalVisitTime: algorithmResult.totalVisitTime || 0,
        efficiency: algorithmResult.efficiency || 0,
        constraintsSatisfied: algorithmResult.constraintsSatisfied || true,
        placesVisited: algorithmResult.route?.length || 0,
        placesSkipped: places.length - (algorithmResult.route?.length || 0),
        executionTime: executionTime
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
        aiRecommendedAlgorithm: geminiAnalysis.algorithmRecommendation?.algorithm,
        executionTime: executionTime,
        optimizationLevel: preferences.optimizationLevel || 'balanced',
        fallbackUsed: algorithmResult.fallbackUsed || false,
        placesEnriched: enrichedPlaces.filter(p => p._enriched).length,
        placesFallback: enrichedPlaces.filter(p => p._source === 'fallback').length
      },
      
      alternatives: detailedItinerary.alternatives || [],
      practicalInfo: detailedItinerary.practicalInfo || {},
      warnings: [
        ...(algorithmResult.warnings || []),
        ...(geminiAnalysis.warnings || []),
        ...enrichedPlaces.filter(p => p._warning).map(p => p._warning)
      ].filter((warning, index, arr) => arr.indexOf(warning) === index) // Remove duplicates
    };

    console.log('✅ ENHANCED OPTIMIZATION COMPLETED:', {
      algorithm: finalResult.algorithm,
      placesOptimized: finalResult.route.length,
      placesEnriched: finalResult.optimizationDetails.placesEnriched,
      efficiency: `${finalResult.metrics.efficiency?.toFixed(1)}%`,
      executionTime: `${executionTime}ms`,
      aiInsightsGenerated: !!finalResult.aiInsights.tripOverview
    });

    res.status(200).json(finalResult);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('💥 Enhanced optimization failed:', error);
    
    // Comprehensive fallback response
    try {
      console.log('🔄 Executing comprehensive fallback...');
      
      const fallbackPlaces = req.body.places?.map((place, index) => ({
        ...place,
        id: place.id || `fallback_${index}`,
        name: place.name || `Place ${index + 1}`,
        location: place.location || { latitude: 11.0168, longitude: 76.9558 },
        averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
        rating: parseFloat(place.rating) || 3.5,
        category: place.category || 'general',
        entryFee: place.entryFee || { indian: 0, foreign: 0 },
        _source: 'emergency_fallback'
      })) || [];
      
      if (fallbackPlaces.length === 0) {
        throw new Error('No places to process');
      }
      
      const fallbackRoute = fallbackPlaces.slice(0, Math.min(fallbackPlaces.length, 8));
      
      return res.status(200).json({
        success: true,
        route: fallbackRoute,
        algorithm: 'emergency-fallback',
        itinerary: `Emergency itinerary: Visit ${fallbackRoute.map(p => p.name).join(' → ')} starting at ${req.body.constraints?.startTime || '09:00'}.`,
        
        metrics: {
          totalTime: fallbackRoute.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
          totalDistance: 0,
          totalTravelTime: 0,
          totalVisitTime: fallbackRoute.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
          efficiency: 0,
          placesVisited: fallbackRoute.length,
          placesSkipped: req.body.places?.length - fallbackRoute.length || 0,
          executionTime: executionTime
        },
        
        aiInsights: {
          tripOverview: 'Emergency trip plan created with available data.',
          recommendations: [
            'This is an emergency fallback plan - some data may be incomplete',
            'Verify place details before visiting',
            'Check opening hours and accessibility',
            'Consider regenerating the trip with better connectivity'
          ],
          warnings: [
            'AI optimization failed - using basic fallback',
            'Place data may be incomplete or outdated',
            'Manual verification of locations recommended'
          ],
          budgetEstimate: {
            total: fallbackRoute.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0) + 500
          },
          culturalTips: [
            'Respect local customs and traditions',
            'Dress appropriately for religious sites'
          ]
        },
        
        optimizationDetails: {
          algorithmUsed: 'emergency-fallback',
          aiAnalysisUsed: false,
          executionTime: executionTime,
          optimizationLevel: 'minimal',
          fallbackUsed: true,
          fallbackReason: error.message
        },
        
        warnings: [
          'Emergency fallback used due to system error',
          'Trip plan may not be optimized',
          'Verify all place details before departure'
        ],
        
        emergencyFallback: true,
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
      
    } catch (fallbackError) {
      console.error('💥 Emergency fallback also failed:', fallbackError);
      
      return res.status(500).json({
        success: false,
        message: 'Complete system failure - unable to process trip request',
        error: process.env.NODE_ENV === 'development' ? {
          original: error.message,
          fallback: fallbackError.message,
          stack: error.stack
        } : 'Multiple system errors occurred',
        suggestion: 'Please try again with fewer places or check your input data',
        executionTime: Date.now() - startTime
      });
    }
  }
};

// Validation function for trip optimization input
function validateTripOptimizationInput(body) {
  const errors = [];
  const { places, preferences = {}, constraints = {} } = body;

  // Validate places array
  if (!places || !Array.isArray(places)) {
    errors.push('places must be an array');
  } else if (places.length === 0) {
    errors.push('At least 1 place is required');
  } else if (places.length > 25) {
    errors.push('Maximum 25 places allowed');
  }

  // Validate individual places
  if (places && Array.isArray(places)) {
    places.forEach((place, index) => {
      if (!place.id && !place._id && !place.name) {
        errors.push(`Place at index ${index} must have an id, _id, or name`);
      }
    });
  }

  // Validate time constraints
  if (constraints.totalTimeAvailable && 
      (typeof constraints.totalTimeAvailable !== 'number' || constraints.totalTimeAvailable < 30)) {
    errors.push('totalTimeAvailable must be a number >= 30 minutes');
  }

  if (constraints.totalTimeAvailable && constraints.totalTimeAvailable > 1440) {
    errors.push('totalTimeAvailable cannot exceed 1440 minutes (24 hours)');
  }

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (constraints.startTime && !timeRegex.test(constraints.startTime)) {
    errors.push('startTime must be in HH:MM format');
  }

  // Validate budget
  if (constraints.budget && 
      (typeof constraints.budget !== 'number' || constraints.budget < 0)) {
    errors.push('budget must be a positive number');
  }

  // Validate optimization level
  const validLevels = ['fast', 'balanced', 'optimal'];
  if (preferences.optimizationLevel && !validLevels.includes(preferences.optimizationLevel)) {
    errors.push(`optimizationLevel must be one of: ${validLevels.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
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

    // Build query for places
    let query = { isActive: true };
    
    if (interests && interests.length > 0) {
      const interestArray = Array.isArray(interests) ? interests : interests.split(',');
      query.category = { $in: interestArray.map(i => i.toLowerCase()) };
    }

    // Get places
    let places = await Place.find(query)
      .sort({ rating: -1, reviewCount: -1 })
      .limit(50)
      .lean();

    // Filter by location if provided
    if (location && typeof location === 'string') {
      const coords = location.split(',').map(Number);
      if (coords.length === 2 && !coords.some(isNaN)) {
        const [lat, lng] = coords;
        try {
          const nearbyPlaces = await Place.findNearby(lat, lng, 100);
          if (nearbyPlaces.length > 0) {
            places = nearbyPlaces;
          }
        } catch (locationError) {
          console.warn('Location filtering failed:', locationError);
          // Continue with original places
        }
      }
    }

    if (places.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No places found matching your criteria',
        suggestion: 'Try adjusting your interests or location criteria'
      });
    }

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(places, {
      timeAvailable: parseInt(timeAvailable),
      interests: Array.isArray(interests) ? interests : interests.split(','),
      budget: budget ? parseInt(budget) : undefined,
      groupSize: parseInt(groupSize),
      travelDate
    });

    res.status(200).json({
      success: true,
      suggestions: suggestions.suggestions || [],
      totalPlacesConsidered: places.length,
      criteria: {
        location,
        timeAvailable: parseInt(timeAvailable),
        interests: Array.isArray(interests) ? interests : interests.split(','),
        budget,
        groupSize: parseInt(groupSize)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        aiGenerated: true
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

// Generate AI suggestions for different trip types
async function generateAISuggestions(places, criteria) {
  console.log('🤖 Generating AI trip suggestions...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API not available, using fallback suggestions');
    return generateFallbackSuggestions(places, criteria);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const suggestionsPrompt = `Create 3 different trip suggestions from these South Indian places:

AVAILABLE PLACES (showing top ${Math.min(places.length, 20)}):
${places.slice(0, 20).map((place, index) => `
${index + 1}. ${place.name} (${place.city}, ${place.state})
   Rating: ${place.rating}/5 | Duration: ${place.averageVisitDuration}min | Fee: ₹${place.entryFee?.indian || 0}
   Category: ${place.category} | Kid-Friendly: ${place.kidFriendly ? 'Yes' : 'No'}
`).join('')}

CRITERIA:
- Time Available: ${criteria.timeAvailable} minutes (${Math.floor(criteria.timeAvailable / 60)} hours)
- Interests: ${criteria.interests?.join(', ') || 'All types'}
- Budget: ${criteria.budget ? '₹' + criteria.budget : 'Flexible'}
- Group Size: ${criteria.groupSize} people

Create exactly 3 trip suggestions in this JSON format:

{
  "suggestions": [
    {
      "type": "Quick Explorer",
      "description": "Perfect for half-day trips with minimal travel",
      "recommendedPlaces": ["Place Name 1", "Place Name 2", "Place Name 3"],
      "estimatedTime": "3-4 hours",
      "estimatedCost": 500,
      "difficulty": "Easy",
      "highlights": ["Top-rated attractions", "Minimal travel time"],
      "suitableFor": ["families", "first-time visitors"]
    },
    {
      "type": "Cultural Heritage",
      "description": "Focus on historical, religious and cultural sites",
      "recommendedPlaces": ["Temple 1", "Heritage Site 2", "Museum 3"],
      "estimatedTime": "5-6 hours", 
      "estimatedCost": 800,
      "difficulty": "Moderate",
      "highlights": ["Rich history", "Cultural immersion"],
      "suitableFor": ["culture enthusiasts", "history buffs"]
    },
    {
      "type": "Comprehensive Adventure",
      "description": "Full day with diverse experiences and maximum places",
      "recommendedPlaces": ["Place 1", "Place 2", "Place 3", "Place 4", "Place 5"],
      "estimatedTime": "7-8 hours",
      "estimatedCost": 1200,
      "difficulty": "Challenging", 
      "highlights": ["Maximum variety", "Complete experience"],
      "suitableFor": ["adventure seekers", "detailed explorers"]
    }
  ]
}

Select places that best match the interests: ${criteria.interests?.join(', ')}, considering time and budget constraints.`;

    const result = await model.generateContent(suggestionsPrompt);
    const response = await result.response;
    const aiResponse = response.text();
    
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiSuggestions = JSON.parse(jsonMatch[0]);
      console.log('✅ AI suggestions generated successfully');
      return aiSuggestions;
    } else {
      throw new Error('No valid JSON in AI response');
    }
    
  } catch (error) {
    console.error('AI suggestions failed:', error);
    return generateFallbackSuggestions(places, criteria);
  }
}

// Generate fallback suggestions when AI fails
function generateFallbackSuggestions(places, criteria) {
  console.log('🔧 Generating fallback trip suggestions...');
  
  // Sort places by rating and relevance
  const sortedPlaces = places
    .filter(p => p.rating >= 3.0) // Only include well-rated places
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Filter by interests if provided
  let filteredPlaces = sortedPlaces;
  if (criteria.interests && criteria.interests.length > 0) {
    filteredPlaces = sortedPlaces.filter(place => 
      criteria.interests.some(interest => 
        place.category?.toLowerCase().includes(interest.toLowerCase())
      )
    );
    
    // If no matches, use all places
    if (filteredPlaces.length === 0) {
      filteredPlaces = sortedPlaces;
    }
  }

  // Filter by budget if provided
  if (criteria.budget) {
    filteredPlaces = filteredPlaces.filter(place => 
      (place.entryFee?.indian || 0) <= criteria.budget / 3 // Assume 3+ places
    );
  }

  const suggestions = [
    {
      type: "Quick Explorer",
      description: "Perfect for half-day trips with top-rated places and minimal travel time",
      recommendedPlaces: filteredPlaces.slice(0, 3).map(p => p.name),
      estimatedTime: "3-4 hours",
      estimatedCost: filteredPlaces.slice(0, 3).reduce((sum, p) => sum + (p.entryFee?.indian || 0), 300),
      difficulty: "Easy",
      highlights: ["Top-rated attractions", "Minimal travel time", "Perfect for beginners"],
      suitableFor: ["families", "first-time visitors", "time-constrained travelers"]
    },
    {
      type: "Cultural Heritage",
      description: "Focus on temples, heritage sites and cultural attractions for deep immersion",
      recommendedPlaces: filteredPlaces
        .filter(p => ['temple', 'heritage', 'museum', 'cultural', 'palace'].includes(p.category?.toLowerCase()))
        .slice(0, 4)
        .map(p => p.name),
      estimatedTime: "5-6 hours",
      estimatedCost: 800,
      difficulty: "Moderate", 
      highlights: ["Rich cultural experience", "Historical significance", "Spiritual journey"],
      suitableFor: ["culture enthusiasts", "history buffs", "spiritual seekers"]
    },
    {
      type: "Comprehensive Adventure",
      description: "Full day experience with maximum variety and diverse attractions",
      recommendedPlaces: filteredPlaces.slice(0, 6).map(p => p.name),
      estimatedTime: "7-8 hours",
      estimatedCost: 1200,
      difficulty: "Challenging",
      highlights: ["Maximum variety", "Complete regional experience", "Diverse categories"],
      suitableFor: ["adventure seekers", "detailed explorers", "photography enthusiasts"]
    }
  ];

  // Filter out suggestions with no places
  return {
    suggestions: suggestions.filter(s => s.recommendedPlaces.length > 0)
  };
}

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

    // Enrich places from database
    const enrichedPlaces = await enrichPlacesFromDatabase(places);
    
    if (enrichedPlaces.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid places found for analysis'
      });
    }

    // Get AI analysis
    const analysis = await getGeminiTripAnalysis(enrichedPlaces, {}, {});
    
    // Calculate current trip metrics (original order)
    let currentMetrics;
    try {
      currentMetrics = await optimizationAlgorithms.calculateRouteMetrics?.(enrichedPlaces) || {
        totalTime: enrichedPlaces.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
        totalDistance: 0,
        efficiency: 0
      };
    } catch (metricsError) {
      console.warn('Failed to calculate current metrics:', metricsError);
      currentMetrics = {
        totalTime: enrichedPlaces.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
        totalDistance: 0,
        efficiency: 0
      };
    }
    
    // Get optimized alternative
    const optimized = await applyOptimizationAlgorithm(
      enrichedPlaces,
      analysis.algorithmRecommendation,
      {},
      {}
    );
    
    let optimizedMetrics;
    try {
      optimizedMetrics = await optimizationAlgorithms.calculateRouteMetrics?.(optimized.route) || {
        totalTime: optimized.totalTime || 0,
        totalDistance: optimized.totalDistance || 0,
        efficiency: optimized.efficiency || 0
      };
    } catch (metricsError) {
      console.warn('Failed to calculate optimized metrics:', metricsError);
      optimizedMetrics = {
        totalTime: optimized.totalTime || 0,
        totalDistance: optimized.totalDistance || 0,
        efficiency: optimized.efficiency || 0
      };
    }

    // Calculate improvements
    const timeSaved = Math.max(0, currentMetrics.totalTime - optimizedMetrics.totalTime);
    const distanceSaved = Math.max(0, currentMetrics.totalDistance - optimizedMetrics.totalDistance);
    const efficiencyGain = optimizedMetrics.efficiency - currentMetrics.efficiency;

    res.status(200).json({
      success: true,
      analysis: {
        currentTrip: {
          route: enrichedPlaces,
          metrics: currentMetrics,
          order: 'original'
        },
        optimizedTrip: {
          route: optimized.route,
          metrics: optimizedMetrics,
          algorithm: optimized.algorithm
        },
        aiAnalysis: analysis,
        improvements: {
          timeSaved: Math.round(timeSaved),
          timeSavedFormatted: `${Math.floor(timeSaved / 60)}h ${Math.round(timeSaved % 60)}m`,
          distanceSaved: Math.round(distanceSaved * 100) / 100,
          efficiencyGain: Math.round(efficiencyGain * 100) / 100,
          placesReordered: optimized.route?.length || 0,
          worthOptimizing: timeSaved > 30 || distanceSaved > 5 || efficiencyGain > 0.1
        },
        recommendations: analysis.recommendations || [
          'Consider the optimized route for better time management',
          'Check opening hours for all places',
          'Plan for traffic delays during peak hours'
        ]
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