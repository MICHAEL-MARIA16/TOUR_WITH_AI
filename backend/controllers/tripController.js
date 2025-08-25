// backend/controllers/tripController.js - FIXED Complete Working Version

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');
const OptimizationAlgorithms = require('../utils/optimizationAlgorithms');
const DistanceCalculator = require('../utils/distanceCalculator');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize optimization algorithms and distance calculator
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
      
      // Strategy 3: Search by name (exact and fuzzy)
      if (place.name) {
        searchStrategies.push({ name: place.name });
        searchStrategies.push({ name: { $regex: new RegExp(`^${escapeRegex(place.name)}$`, 'i') } });
        searchStrategies.push({ name: { $regex: new RegExp(escapeRegex(place.name), 'i') } });
      }
      
      // Strategy 4: Search by name extracted from ID
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
      
      // Strategy 5: Multi-field search
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

// FIXED: Enhanced Gemini analysis with better error handling and algorithm mapping
async function getGeminiTripAnalysis(places, preferences, constraints) {
  console.log('🤖 Starting Gemini AI analysis...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not found, using fallback analysis');
    return generateFallbackAnalysis(places, preferences, constraints);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    
    // Calculate geographic spread for algorithm selection
    const coordinates = places.map(p => p.location).filter(loc => loc && loc.latitude && loc.longitude);
    const spread = coordinates.length >= 2 ? calculateGeographicSpread(coordinates) : {
      maxDistance: 0,
      averageDistance: 0,
      density: 'high',
      complexity: 'low'
    };
    
    // ENHANCED PROMPT with strict JSON formatting requirements
    const analysisPrompt = `You are a travel optimization AI. Analyze this South Indian trip and respond with ONLY a valid JSON object.

CRITICAL INSTRUCTIONS:
- Respond with ONLY valid RFC 8259 compliant JSON
- NO markdown formatting, NO code blocks, NO extra text
- All property names MUST be in double quotes
- All string values MUST be in double quotes
- Use only standard JSON data types (string, number, boolean, array, object)
- Do NOT include comments or trailing commas


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

Select the best algorithm and provide analysis in JSON format.
Available algorithms: "advancedGreedy", "genetic", "nearestNeighbor", "dynamicProgramming"

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
}
Available algorithms: "advancedGreedy", "genetic", "nearestNeighbor", "dynamicProgramming"

Respond with ONLY the JSON object above, filled with appropriate values.`;

    console.log('📤 Sending request to Gemini AI...');
    
    const result = await Promise.race([
      model.generateContent(analysisPrompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), 20000)
      )
    ]);
    
    const response = await result.response;
    const aiResponse = response.text();
    
    console.log('📥 Gemini AI response received');
    const analysis = await parseGeminiResponseWithFallbacks(aiResponse, places, preferences, constraints);
    
    return analysis;
    
  } catch (error) {
    console.error('🚨 Gemini analysis failed:', error);
    console.log('🔄 Using fallback analysis...');
    return generateFallbackAnalysis(places, preferences, constraints);
  }
}

// FIXED: Parse Gemini response with multiple fallback strategies
async function parseGeminiResponseWithFallbacks(aiResponse, places, preferences, constraints) {
  const strategies = [
    // Strategy 1: Direct JSON parsing
    () => JSON.parse(aiResponse),
    
    // Strategy 2: Extract JSON from markdown code blocks
    () => {
      const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
      throw new Error('No code block found');
    },
    
    // Strategy 3: Find JSON object boundaries
    () => {
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        throw new Error('No valid JSON boundaries found');
      }
      
      const jsonStr = aiResponse.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    },
    
    // Strategy 4: Clean and extract JSON
    () => {
      const cleaned = aiResponse.replace(/```json|```|\n\s*\/\/.*$/gm, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found after cleaning');
    }
  ];

  // Try each parsing strategy
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying parsing strategy ${i + 1}...`);
      const analysis = strategies[i]();
      
      // FIXED: Ensure algorithm name is valid
      const validAlgorithms = ['advancedGreedy', 'genetic', 'nearestNeighbor', 'dynamicProgramming'];
      if (analysis.algorithmRecommendation?.algorithm) {
        const recommendedAlgorithm = analysis.algorithmRecommendation.algorithm;
        
        // Map common variations to correct names
        const algorithmMap = {
          'greedy': 'advancedGreedy',
          'advanced-greedy': 'advancedGreedy',
          'enhanced-greedy': 'advancedGreedy',
          'genetic-algorithm': 'genetic',
          'ga': 'genetic',
          'nearest-neighbor': 'nearestNeighbor',
          'nn': 'nearestNeighbor',
          'dynamic-programming': 'dynamicProgramming',
          'dp': 'dynamicProgramming'
        };
        
        const mappedAlgorithm = algorithmMap[recommendedAlgorithm.toLowerCase()] || recommendedAlgorithm;
        
        if (validAlgorithms.includes(mappedAlgorithm)) {
          analysis.algorithmRecommendation.algorithm = mappedAlgorithm;
        } else {
          console.warn(`Invalid algorithm "${recommendedAlgorithm}" recommended by AI, using advancedGreedy`);
          analysis.algorithmRecommendation.algorithm = 'advancedGreedy';
          analysis.algorithmRecommendation.reason = `Fallback to advanced greedy (original: ${recommendedAlgorithm})`;
        }
      }
      
      console.log(`🧠 AI recommended algorithm: ${analysis.algorithmRecommendation?.algorithm}`);
      return analysis;
    } catch (parseError) {
      console.warn(`Parsing strategy ${i + 1} failed:`, parseError.message);
      continue;
    }
  }

  // If all parsing strategies fail, generate fallback analysis
  console.error('🚨 All JSON parsing strategies failed, using fallback analysis');
  return generateFallbackAnalysis(places, preferences, constraints);
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    
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

// Generate fallback analysis when Gemini fails
function generateFallbackAnalysis(places, preferences, constraints) {
  console.log('🔧 Generating fallback analysis...');
  
  const coordinates = places.map(p => p.location).filter(loc => loc && loc.latitude && loc.longitude);
  const spread = coordinates.length >= 2 ? calculateGeographicSpread(coordinates) : {
    maxDistance: 0,
    averageDistance: 0,
    complexity: 'low'
  };
  
  // FIXED: Algorithm selection logic with proper names
  let algorithm = 'advancedGreedy';
  let reason = 'General purpose optimization with timing intelligence';
  
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

// FIXED: Apply optimization algorithm function with proper method calls
async function applyOptimizationAlgorithm(places, algorithmRecommendation, preferences, algorithmParams) {
  const algorithm = algorithmRecommendation.algorithm || 'advancedGreedy';
  
  console.log(`⚡ Applying ${algorithm} algorithm...`);
  console.log(`🚀 Applying ${algorithm} algorithm to ${places.length} places`);
  
  try {
    let result;
    
    // Prepare constraints for algorithms
    const constraints = {
      ...preferences,
      ...algorithmParams,
      startLocationId: preferences.startLocationId || 'coimbatore',
      startTime: preferences.startTime || '09:00',
      endTime: preferences.endTime || '18:00',
      budget: preferences.budget || Infinity,
      totalTimeAvailable: preferences.totalTimeAvailable || 480
    };
    
    // FIXED: Use the correct method names that exist in OptimizationAlgorithms class
    switch (algorithm) {
      case 'advancedGreedy':
        result = await optimizationAlgorithms.advancedGreedyOptimization(places, constraints);
        break;
        
      case 'genetic':
        result = await optimizationAlgorithms.geneticAlgorithmOptimization(places, constraints);
        break;
        
      case 'nearestNeighbor':
        result = await optimizationAlgorithms.nearestNeighborOptimization(places, constraints);
        break;
        
      case 'dynamicProgramming':
        result = await optimizationAlgorithms.dynamicProgrammingOptimization(places, constraints);
        break;
        
      default:
        console.warn(`Unknown algorithm: ${algorithm}, falling back to advancedGreedy`);
        result = await optimizationAlgorithms.advancedGreedyOptimization(places, constraints);
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
    
    // Fallback to advanced greedy algorithm
    console.log('🔄 Falling back to advanced greedy algorithm...');
    try {
      const fallbackResult = await optimizationAlgorithms.advancedGreedyOptimization(places, {
        startLocationId: 'coimbatore',
        startTime: '09:00',
        endTime: '18:00',
        ...preferences
      });
      
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
        totalTravelTime: 0,
        totalVisitTime: places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
        totalCost: places.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0),
        efficiency: 0,
        success: false,
        error: fallbackError.message
      };
    }
  }
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

// Generate AI Algorithm Explanation - NEW ENDPOINT
const generateAlgorithmExplanation = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('🧠 Generating AI Algorithm Explanation...');

    const {
      route,
      algorithm,
      metrics,
      preferences = {},
      startingLocation,
      originalPlaces = [],
      explanationLevel = 'detailed'
    } = req.body;

    // Validate input
    if (!route || !Array.isArray(route) || route.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid route is required for explanation'
      });
    }

    const algorithmName = algorithm || 'advancedGreedy';
    const startLocation = startingLocation?.name || 'your starting location';

    console.log(`📊 Explaining ${algorithmName} for ${route.length} places from ${startLocation}`);

    // Generate explanation based on algorithm and level
    let explanation;

    if (process.env.GEMINI_API_KEY && explanationLevel !== 'simple') {
      try {
        explanation = await generateGeminiAlgorithmExplanation(
          route, 
          algorithmName, 
          metrics, 
          preferences, 
          startingLocation, 
          originalPlaces,
          explanationLevel
        );
      } catch (geminiError) {
        console.warn('Gemini explanation failed, using fallback:', geminiError.message);
        explanation = generateFallbackAlgorithmExplanation(
          route, 
          algorithmName, 
          metrics, 
          preferences, 
          startingLocation,
          explanationLevel
        );
      }
    } else {
      explanation = generateFallbackAlgorithmExplanation(
        route, 
        algorithmName, 
        metrics, 
        preferences, 
        startingLocation,
        explanationLevel
      );
    }

    const executionTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: explanation,
      metadata: {
        algorithm: algorithmName,
        routeLength: route.length,
        explanationLevel,
        generatedAt: new Date().toISOString(),
        executionTime,
        aiGenerated: !!process.env.GEMINI_API_KEY && explanationLevel !== 'simple'
      }
    });

  } catch (error) {
    console.error('Algorithm explanation failed:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate algorithm explanation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Generate Gemini AI Algorithm Explanation
async function generateGeminiAlgorithmExplanation(route, algorithm, metrics, preferences, startingLocation, originalPlaces, level) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const algorithmDescriptions = {
    'advancedGreedy': 'Smart Timing-Aware Greedy Algorithm',
    'genetic': 'Evolutionary Genetic Algorithm', 
    'nearestNeighbor': 'Distance-Optimized Nearest Neighbor',
    'dynamicProgramming': 'Optimal Dynamic Programming Solution'
  };

  // Calculate additional insights
  const totalVisitTime = route.reduce((sum, place) => sum + (place.averageVisitDuration || 90), 0);
  const avgRating = route.reduce((sum, place) => sum + (place.rating || 0), 0) / route.length;
  const categories = [...new Set(route.map(p => p.category))];
  const cities = [...new Set(route.map(p => p.city))];
  
  const complexity = level === 'technical' ? 'Include technical algorithm details and complexity analysis' : 
                   level === 'detailed' ? 'Provide detailed step-by-step reasoning with practical insights' : 
                   'Keep explanations simple and accessible';

  const prompt = `As an AI travel optimization expert, explain why and how I selected this specific route using the ${algorithm} algorithm.Provide a comprehensive trip plan.
   like a personal south indian local guide.

ALGORITHM USED: ${algorithmDescriptions[algorithm] || algorithm}
STARTING LOCATION: ${startingLocation?.name || 'User location'}
TRIP DETAILS:
- ${route.length} places selected from ${originalPlaces.length || route.length} options
- Total visit time: ${totalVisitTime} minutes
- Average rating: ${avgRating.toFixed(1)}/5
- Categories: ${categories.join(', ')}
- Cities covered: ${cities.length}
- Trip starts: ${preferences.startTime || '09:00'}

OPTIMIZED ROUTE:
${route.map((place, index) => 
`${index + 1}. ${place.name} (${place.city})
   - Rating: ${place.rating}/5 ⭐
   - Duration: ${place.averageVisitDuration || 90} minutes
   - Category: ${place.category}
   - Entry fee: ₹${place.entryFee?.indian || 0}
   - Best time: ${place.bestTimeToVisit?.join(', ') || 'Any time'}`
).join('\n')}

OPTIMIZATION RESULTS:
- Total time: ${metrics?.totalTime || totalVisitTime} minutes
- Total distance: ${metrics?.totalDistance?.toFixed(1) || 'N/A'} km
- Efficiency: ${metrics?.efficiency?.toFixed(1) || 'N/A'}%
- Travel time: ${metrics?.totalTravelTime || 'N/A'} minutes

EXPLANATION LEVEL: ${complexity}

Provide a comprehensive explanation and trip plan in a valid in JSON format:

{
  "title": "Algorithm name and approach",
  "summary": "2-3 sentence overview of why this algorithm and route was chosen",
  "reasoning": [
    {
      "step": 1,
      "decision": "Why this starting point",
      "explanation": "Detailed reasoning for starting location and time",
      "factors": ["Factor 1", "Factor 2", "Factor 3"]
    },
    {
      "step": 2,
      "decision": "First place selection: ${route[0]?.name}",
      "explanation": "Why this specific place was chosen first, considering opening hours (${route[0]?.bestTimeToVisit?.join(' or ') || 'flexible timing'}), travel distance, and ratings",
      "factors": ["Opening hours alignment", "High rating: ${route[0]?.rating}/5", "Category: ${route[0]?.category}", "Travel time optimization"]
    },
    {
      "step": 3,
      "decision": "Lunch planning strategy",
      "explanation": "How meal timing was integrated - whether to pack lunch or eat at specific locations based on route timing",
      "factors": ["Time of day", "Restaurant availability", "Budget considerations"]
    }
  ],
  "optimizations": [
    "Key optimization factors the algorithm considered",
    "How opening hours influenced decisions",
    "Travel time vs quality trade-offs made"
  ],
  "tips": [
    "Practical advice based on the selected route",
    "Timing-specific recommendations",
    "What to pack or prepare"
  ],
  "packingList": [
    { "item": "Comfortable Walking Shoes", "reason": "Essential for exploring large temple complexes and forts." },
    { "item": "Modest Clothing (Scarves, etc.)", "reason": "Required for entry into most religious sites if any are included." },
    { "item": "Reusable Water Bottle", "reason": "To stay hydrated in the warm climate." }
  ],
  "localExperiences": [
    { "recommendation": "Try authentic filter coffee at a local 'mess' or cafe.", "context": "A must-do South Indian cultural experience." },
    { "recommendation": "Taste a traditional thali meal for lunch.", "context": "Offers a variety of local vegetarian dishes on a single platter." }
  ],
  "culturalEtiquette": [
    { "tip": "Always remove footwear before entering any temple or home.", "appliesTo": "temple" },
    { "tip": "Use your right hand for giving and receiving items, especially food.", "appliesTo": "general" }
  ],
  ${level === 'technical' ? `"technical": {
    "algorithmComplexity": "Big O notation and performance",
    "optimizationCriteria": "Mathematical criteria used",
    "alternatives": "Other algorithms considered and why rejected"
  },` : ''}
  "mealPlan": {
    "breakfast": "Timing and suggestion",
    "lunch": "Where and when based on route",
    "snacks": "Recommendations for longer visits"
  }
}

Focus on explaining the LOGICAL REASONING behind each decision, especially:
1. Why places are visited in this specific order
2. How opening hours affected the sequence  
3. When to have meals and why
4. What to pack based on place types and timing
5. How travel time was optimized
6. What to pack specifically for these locations (e.g., modest clothing for temples).
7. Unique local experiences or foods to try near the planned stops.
8. Important cultural etiquette and rules for the visited places.
Make it conversational and insightful, as if explaining to a curious traveler from the perspective of an expert South Indian pro guide.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const aiResponse = response.text();

  // Parse JSON response
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsedExplanation = JSON.parse(jsonMatch[0]);
    
    // Add fallback reasoning if not enough steps provided
    if (!parsedExplanation.reasoning || parsedExplanation.reasoning.length < route.length) {
      parsedExplanation.reasoning = generateDetailedReasoningSteps(route, algorithm, preferences, startingLocation);
    }

    return parsedExplanation;
  } else {
    throw new Error('Failed to parse AI explanation response');
  }
}

// Generate detailed reasoning steps for each place
function generateDetailedReasoningSteps(route, algorithm, preferences, startingLocation) {
  const steps = [];
  const startTime = preferences.startTime || '09:00';
  let currentTime = timeToMinutes(startTime);

  // Starting point explanation
  steps.push({
    step: 1,
    decision: `Starting from ${startingLocation?.name || 'chosen location'}`,
    explanation: `Your journey begins at ${startingLocation?.name || 'your location'} at ${startTime}. This serves as the optimal departure point considering accessibility, parking availability, and your proximity to the first destination.`,
    factors: ['User convenience', 'Strategic location', 'Time efficiency', 'Accessibility']
  });

  route.forEach((place, index) => {
    const arrivalTime = currentTime;
    const arrivalTimeStr = minutesToTime(arrivalTime);
    const visitDuration = place.averageVisitDuration || 90;
    const departureTime = arrivalTime + visitDuration;
    
    let explanation = '';
    let factors = [];

    // Generate contextual explanation based on place type and timing
    if (place.category === 'temple') {
      explanation = `${place.name} is scheduled for ${arrivalTimeStr} to align with temple opening hours and avoid afternoon crowds. Temples are best visited in the morning when the atmosphere is peaceful and temperatures are comfortable.`;
      factors = ['Temple opening hours', 'Peaceful morning atmosphere', 'Cooler temperatures', `${visitDuration} minute duration`];
    } else if (place.category === 'museum') {
      explanation = `${place.name} is perfectly timed for ${arrivalTimeStr} when museums are less crowded and you can enjoy exhibits comfortably. The ${visitDuration}-minute duration allows for thorough exploration.`;
      factors = ['Museum optimal hours', 'Reduced crowds', 'Climate controlled environment', 'Educational value'];
    } else if (place.category === 'palace') {
      explanation = `${place.name} is scheduled for ${arrivalTimeStr} to capture the palace in good lighting conditions. The ${visitDuration}-minute visit allows time for both architecture appreciation and photography.`;
      factors = ['Optimal lighting', 'Photography opportunities', 'Architecture focus', 'Historical significance'];
    } else if (place.category === 'beach') {
      explanation = `${place.name} is timed for ${arrivalTimeStr} to avoid the harsh midday sun while still enjoying good visibility. Beach visits are most pleasant during cooler parts of the day.`;
      factors = ['Comfortable temperature', 'Sun safety', 'Beach activities', 'Scenic beauty'];
    } else {
      explanation = `${place.name} (${place.category}) is optimally scheduled for ${arrivalTimeStr}, considering its ${place.rating}/5 star rating and ${visitDuration}-minute recommended duration. This timing ensures you experience it at its best.`;
      factors = [`Rating: ${place.rating}/5`, `Duration: ${visitDuration} minutes`, 'Optimal timing', 'Quality experience'];
    }

    // Add meal planning context
    if (arrivalTime >= 720 && arrivalTime <= 840) { // 12:00-14:00 lunch time
      explanation += ` This timing also works perfectly for a lunch break either at nearby restaurants or packed meals, depending on your preference.`;
      factors.push('Lunch timing alignment');
    } else if (arrivalTime >= 420 && arrivalTime <= 600) { // 07:00-10:00 breakfast time
      explanation += ` The early timing means you should have breakfast before departure or pack light snacks.`;
      factors.push('Early morning visit');
    }

    // Add cost consideration
    if (place.entryFee?.indian > 0) {
      factors.push(`Entry fee: ₹${place.entryFee.indian}`);
    } else {
      factors.push('Free entry');
    }

    steps.push({
      step: index + 2,
      decision: `${index === 0 ? 'First stop' : `Stop ${index + 1}`}: ${place.name}`,
      explanation,
      factors
    });

    currentTime = departureTime + 30; // Add 30 min travel time
  });

  return steps;
}

// Generate Fallback Algorithm Explanation
function generateFallbackAlgorithmExplanation(route, algorithm, metrics, preferences, startingLocation, level) {
  const algorithmTitles = {
    'advancedGreedy': 'Smart Greedy Algorithm with Timing Intelligence',
    'genetic': 'Evolutionary Genetic Algorithm',
    'nearestNeighbor': 'Distance-Optimized Nearest Neighbor',
    'dynamicProgramming': 'Optimal Dynamic Programming Solution'
  };

  const title = algorithmTitles[algorithm] || 'Advanced Route Optimization';
  const startLocation = startingLocation?.name || 'your starting point';
  const startTime = preferences.startTime || '09:00';

  // Generate detailed reasoning steps
  const reasoning = generateDetailedReasoningSteps(route, algorithm, preferences, startingLocation);

  // Algorithm-specific optimizations
  const optimizations = {
    'advancedGreedy': [
      'Selected highest-rated places within time constraints',
      'Optimized travel sequence to minimize distance',
      'Aligned visits with optimal timing windows',
      'Considered opening hours and crowd patterns',
      'Balanced quality ratings with practical logistics'
    ],
    'genetic': [
      'Tested thousands of route combinations through evolution',
      'Optimized multiple objectives simultaneously',
      'Found globally optimal solution through genetic operators',
      'Balanced travel time, ratings, and timing constraints',
      'Used advanced crossover and mutation techniques'
    ],
    'nearestNeighbor': [
      'Prioritized shortest travel distances between locations',
      'Minimized total transportation time and costs',
      'Selected logical geographic progression',
      'Reduced backtracking and inefficient routing',
      'Optimized for fuel efficiency and time savings'
    ],
    'dynamicProgramming': [
      'Calculated mathematically optimal route',
      'Evaluated all possible combinations systematically',
      'Guaranteed best possible solution for given constraints',
      'Optimized total trip value within time limits',
      'Used exact optimization rather than approximation'
    ]
  };

  // Generate practical tips
  const tips = generatePracticalTips(route, preferences, startingLocation);

  const explanation = {
    title,
    summary: `I used the ${title.toLowerCase()} to create your optimized route from ${startLocation}. This algorithm analyzed ${route.length} selected places, considering factors like ratings, opening hours, travel distances, and your ${startTime} start time to create the most efficient and enjoyable sequence.`,
    reasoning,
    optimizations: optimizations[algorithm] || optimizations['advancedGreedy'],
    tips,
    mealPlan: generateMealPlan(route, preferences)
  };

  // Add technical details for technical level
  if (level === 'technical') {
    explanation.technical = generateTechnicalDetails(algorithm, route.length, metrics);
  }

  return explanation;
}

// Generate practical tips based on route
function generatePracticalTips(route, preferences, startingLocation) {
  const tips = [];
  const hasTemples = route.some(p => p.category === 'temple');
  const hasBeaches = route.some(p => p.category === 'beach');
  const hasOutdoor = route.some(p => ['fort', 'heritage', 'nature'].includes(p.category));
  const totalDuration = route.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0);
  const startTime = preferences.startTime || '09:00';
  const earlyStart = timeToMinutes(startTime) < 480; // Before 8 AM

  // Time-specific tips
  if (earlyStart) {
    tips.push('Early start allows you to beat crowds and enjoy cooler morning temperatures');
  }

  if (totalDuration > 360) { // More than 6 hours
    tips.push('Pack energy snacks and stay hydrated throughout this full-day adventure');
  }

  // Location-specific tips
  if (hasTemples) {
    tips.push('Dress modestly for temple visits - cover shoulders and legs, remove shoes before entering');
  }

  if (hasBeaches) {
    tips.push('Bring sunscreen, hat, and extra water for beach visits');
  }

  if (hasOutdoor) {
    tips.push('Wear comfortable walking shoes and carry a small backpack for essentials');
  }

  // Seasonal and practical tips
  tips.push('Check weather forecast and carry light rain protection during monsoon season');
  tips.push('Keep copies of important documents and emergency contact numbers');
  
  // Budget tip
  const totalCost = route.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0);
  if (totalCost > 500) {
    tips.push(`Budget approximately ₹${totalCost} for entry fees plus food and transportation costs`);
  }

  return tips.slice(0, 5); // Limit to 5 most relevant tips
}

// Generate meal planning recommendations
function generateMealPlan(route, preferences) {
  const startTime = preferences.startTime || '09:00';
  const startMinutes = timeToMinutes(startTime);
  
  let mealPlan = {
    breakfast: 'Have breakfast before departure',
    lunch: 'Pack lunch or find local restaurants',
    snacks: 'Carry water and light snacks'
  };

  // Breakfast planning
  if (startMinutes < 420) { // Before 7 AM
    mealPlan.breakfast = 'Very early start - pack breakfast items or energy bars';
  } else if (startMinutes < 480) { // Before 8 AM
    mealPlan.breakfast = 'Quick breakfast at home before departure';
  } else {
    mealPlan.breakfast = 'Have proper breakfast before starting your journey';
  }

  // Lunch planning based on route timing
  const hasLunchTimePlace = route.some((place, index) => {
    const estimatedArrival = startMinutes + (index * 120); // Estimate 2 hours per place
    return estimatedArrival >= 720 && estimatedArrival <= 840; // 12-2 PM
  });

  if (hasLunchTimePlace) {
    const lunchPlace = route.find((place, index) => {
      const estimatedArrival = startMinutes + (index * 120);
      return estimatedArrival >= 720 && estimatedArrival <= 840;
    });
    mealPlan.lunch = `Have lunch near ${lunchPlace?.name || 'one of your stops'} - local restaurants available`;
  } else {
    mealPlan.lunch = 'Pack lunch from home as your schedule may not align with restaurant hours';
  }

  // Snacks planning
  const longVisits = route.filter(p => (p.averageVisitDuration || 90) > 120);
  if (longVisits.length > 0) {
    mealPlan.snacks = 'Pack extra snacks and water for longer visits, especially at heritage sites';
  }

  return mealPlan;
}

// Generate technical details for technical explanation level
function generateTechnicalDetails(algorithm, routeLength, metrics) {
  const complexities = {
    'advancedGreedy': {
      complexity: 'O(n²)',
      description: 'Quadratic time complexity for greedy selection with multi-criteria scoring'
    },
    'genetic': {
      complexity: 'O(g × p × n)',
      description: 'Where g=generations, p=population size, n=places. Typically O(100 × 50 × n)'
    },
    'nearestNeighbor': {
      complexity: 'O(n²)',
      description: 'Quadratic time for distance matrix computation and nearest selection'
    },
    'dynamicProgramming': {
      complexity: 'O(n² × 2ⁿ)',
      description: 'Exponential space and time - only feasible for small problems (n < 15)'
    }
  };

  const technical = complexities[algorithm] || complexities['advancedGreedy'];

  return {
    algorithmComplexity: technical.complexity,
    complexityDescription: technical.description,
    optimizationCriteria: [
      'Multi-objective fitness function combining ratings, distances, and timing',
      'Constraint satisfaction for time windows and budget limits',
      'Heuristic scoring with weighted factors for different optimization goals'
    ],
    alternatives: `Other algorithms like ${algorithm === 'genetic' ? 'simulated annealing' : 'genetic algorithm'} were considered but ${algorithm} provided the best balance of solution quality and computation time for your ${routeLength} places.`,
    performance: {
      routeLength,
      efficiency: metrics?.efficiency?.toFixed(2) || 'N/A',
      totalOptimizationTime: '< 5 seconds',
      memoryUsage: 'Minimal - suitable for mobile devices'
    }
  };
}

// Helper function to convert time string to minutes
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to convert minutes to time string
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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
          // Simple distance-based filtering if no findNearby method
          places = places.filter(place => {
            if (!place.location?.latitude || !place.location?.longitude) return false;
            
            const distance = distanceCalculator.calculateDistance(
              lat, lng, 
              place.location.latitude, place.location.longitude
            );
            
            return distance <= 100; // Within 100km
          });
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

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
      currentMetrics = await optimizationAlgorithms.calculateRouteMetrics?.(enrichedPlaces) || 
        await calculateBasicRouteMetrics(enrichedPlaces);
    } catch (metricsError) {
      console.warn('Failed to calculate current metrics:', metricsError);
      currentMetrics = await calculateBasicRouteMetrics(enrichedPlaces);
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
      optimizedMetrics = await optimizationAlgorithms.calculateRouteMetrics?.(optimized.route) ||
        await calculateBasicRouteMetrics(optimized.route);
    } catch (metricsError) {
      console.warn('Failed to calculate optimized metrics:', metricsError);
      optimizedMetrics = await calculateBasicRouteMetrics(optimized.route);
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

// Helper function to calculate basic route metrics when main method fails
async function calculateBasicRouteMetrics(route) {
  if (!route || route.length === 0) {
    return {
      totalTime: 0,
      totalTravelTime: 0,
      totalVisitTime: 0,
      totalDistance: 0,
      totalCost: 0,
      averageRating: 0,
      efficiency: 0
    };
  }

  const totalVisitTime = route.reduce((sum, place) => sum + (place.averageVisitDuration || 60), 0);
  const totalCost = route.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
  const averageRating = route.reduce((sum, place) => sum + (place.rating || 0), 0) / route.length;

  let totalDistance = 0;
  let totalTravelTime = 0;

  // Calculate travel metrics using simple distance calculation
  for (let i = 1; i < route.length; i++) {
    try {
      const from = route[i-1].location;
      const to = route[i].location;
      
      if (from && to && from.latitude && from.longitude && to.latitude && to.longitude) {
        const distance = distanceCalculator.calculateDistance(
          from.latitude, from.longitude,
          to.latitude, to.longitude
        );
        
        totalDistance += distance;
        totalTravelTime += (distance / 40) * 60; // 40 km/h average speed
      }
    } catch (error) {
      console.warn('Distance calculation failed, using estimate');
      totalDistance += 10; // Estimate 10km between places
      totalTravelTime += 15; // Estimate 15 minutes travel
    }
  }

  const efficiency = totalVisitTime > 0 ? (route.length * 60) / (totalVisitTime + totalTravelTime) * 100 : 0;

  return {
    totalTime: totalVisitTime + totalTravelTime,
    totalTravelTime,
    totalVisitTime,
    totalDistance,
    totalCost,
    averageRating,
    efficiency
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
  generateAlgorithmExplanation,
  addRequestTiming
};