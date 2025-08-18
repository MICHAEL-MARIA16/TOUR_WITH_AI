// backend/controllers/detailedTripController.js - Fixed version

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class DetailedTripController {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Bind methods to preserve 'this' context
    this.generateDetailedPlan = this.generateDetailedPlan.bind(this);
    this.generateGeminiDetailedPlan = this.generateGeminiDetailedPlan.bind(this);
    this.buildComprehensivePrompt = this.buildComprehensivePrompt.bind(this);
    this.parseGeminiResponse = this.parseGeminiResponse.bind(this);
    this.generateFallbackDetailedPlan = this.generateFallbackDetailedPlan.bind(this);
    this.calculateTripStatistics = this.calculateTripStatistics.bind(this);
  }

  /**
   * Generate comprehensive detailed trip plan using Gemini AI
   */
  async generateDetailedPlan(req, res) {
    try {
      const { places, preferences, routeMetrics, algorithm } = req.body;

      console.log('🧠 Generating detailed trip plan with Gemini AI...');
      console.log(`📍 Places: ${places?.length}`);
      console.log(`⚙️ Algorithm: ${algorithm}`);

      // Input validation
      if (!places || !Array.isArray(places) || places.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Places array is required and cannot be empty'
        });
      }

      // Enhanced trip analysis using Gemini AI
      const detailedPlan = await this.generateGeminiDetailedPlan(places, preferences, routeMetrics, algorithm);

      res.status(200).json({
        success: true,
        data: detailedPlan,
        generatedAt: new Date().toISOString(),
        aiModel: 'gemini-1.5-flash'
      });

    } catch (error) {
      console.error('💥 Detailed trip plan generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate detailed trip plan',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Generate detailed plan using Gemini AI with comprehensive context
   */
  async generateGeminiDetailedPlan(places, preferences, routeMetrics, algorithm) {
    try {
      // Calculate trip statistics
      const tripStats = this.calculateTripStatistics(places, preferences);
      
      // Generate comprehensive prompt for Gemini
      const prompt = this.buildComprehensivePrompt(places, preferences, routeMetrics, algorithm, tripStats);

      console.log('🤖 Sending request to Gemini AI...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();

      console.log('✅ Gemini AI response received');

      // Parse and structure the AI response
      const structuredPlan = this.parseGeminiResponse(aiResponse, places, preferences, tripStats);

      return structuredPlan;

    } catch (error) {
      console.error('🚨 Gemini AI generation failed:', error);
      // Fallback to structured plan generation
      return this.generateFallbackDetailedPlan(places, preferences, routeMetrics);
    }
  }

  /**
   * Build comprehensive prompt for Gemini AI
   */
  buildComprehensivePrompt(places, preferences, routeMetrics, algorithm, tripStats) {
    const startTime = preferences?.startTime || '09:00';
    const totalHours = Math.ceil((preferences?.totalTimeAvailable || 480) / 60);
    const budget = preferences?.budget || 'Flexible';

    return `You are an expert South Indian travel planner with deep knowledge of cultural sites, local customs, and practical travel advice. Create a comprehensive, detailed trip plan for this optimized route.

OPTIMIZED ROUTE DETAILS:
${places.map((place, index) => `
${index + 1}. ${place.name} (${place.city}, ${place.state})
   • Category: ${place.category}
   • Rating: ${place.rating}/5 ⭐
   • Visit Duration: ${place.averageVisitDuration} minutes
   • Entry Fee: ₹${place.entryFee?.indian || place.entryFee?.amount || 0}
   • Best Time: ${place.bestTimeToVisit?.join(', ') || 'Anytime'}
   • Amenities: ${place.amenities?.join(', ') || 'Basic facilities'}
   • Description: ${place.description?.substring(0, 200) || 'Historic attraction'}
`).join('')}

TRIP PARAMETERS:
• Algorithm Used: ${algorithm} optimization
• Start Time: ${startTime}
• Total Duration: ${totalHours} hours
• Budget: ${budget === null ? 'Flexible' : '₹' + budget}
• Total Distance: ${routeMetrics?.totalDistance?.toFixed(1) || 'Unknown'} km
• Optimization Level: ${preferences?.optimizationLevel || 'balanced'}

TRIP STATISTICS:
• Categories Covered: ${tripStats.categories.join(', ')}
• Cities: ${tripStats.cities.join(', ')}
• Average Rating: ${tripStats.averageRating.toFixed(1)}/5
• Cultural Sites: ${tripStats.culturalSites}
• Religious Sites: ${tripStats.religiousSites}
• Nature/Outdoor: ${tripStats.natureSites}

Generate a comprehensive trip plan in this EXACT JSON format:

{
  "summary": {
    "title": "Engaging trip title",
    "description": "2-3 sentence overview of the journey highlighting key experiences",
    "highlights": ["Top 3-4 unique experiences this trip offers"],
    "difficulty": "Easy|Moderate|Challenging",
    "bestSeason": "Best time of year to take this trip",
    "tripType": "Cultural|Adventure|Mixed|Spiritual"
  },
  "detailedTimeline": [
    {
      "time": "09:00",
      "endTime": "11:30",
      "place": {
        "name": "Place name exactly as provided",
        "arrivalTime": "09:00",
        "departureTime": "11:30"
      },
      "activities": [
        "Specific activity 1 at this place",
        "Specific activity 2 at this place",
        "Specific activity 3 at this place"
      ],
      "culturalInsights": [
        "Interesting historical/cultural fact about this place",
        "Local customs or traditions to be aware of",
        "Architectural or artistic significance"
      ],
      "practicalTips": [
        "Specific practical advice for visiting this place",
        "Photography guidelines or restrictions",
        "Best areas to explore or things not to miss"
      ],
      "localRecommendations": {
        "food": "Specific local dishes to try nearby",
        "shopping": "Local crafts or souvenirs available",
        "interactions": "How to respectfully interact with locals"
      },
      "travelToNext": {
        "duration": 45,
        "mode": "car",
        "route": "Brief description of the route/road",
        "scenery": "What you'll see during travel"
      }
    }
  ],
  "culturalGuide": {
    "languagePhrases": {
      "greetings": {"hello": "Local greeting", "thankyou": "Local thank you"},
      "useful": {"howmuch": "How much?", "where": "Where is?"}
    },
    "etiquette": [
      "Important cultural do's and don'ts",
      "Religious site protocols",
      "Photography etiquette",
      "Dress code recommendations"
    ],
    "festivals": "Any local festivals or special events to be aware of",
    "cusine": {
      "mustTry": ["Local dish 1", "Local dish 2", "Local dish 3"],
      "dietary": "Vegetarian/dietary considerations",
      "where": "Best places to try authentic local food"
    }
  },
  "practicalInfo": {
    "packing": {
      "essential": ["Item 1", "Item 2", "Item 3"],
      "weather": ["Weather-specific items based on season"],
      "cultural": ["Items needed for cultural/religious sites"]
    },
    "transportation": {
      "recommended": "Best transport mode for this route",
      "alternatives": "Alternative transport options",
      "parking": "Parking information for each major stop",
      "costs": "Estimated transportation costs"
    },
    "accommodation": {
      "suggestions": "Best areas to stay if this is multi-day",
      "types": "Types of accommodation available"
    },
    "safety": [
      "Important safety considerations",
      "Emergency contacts",
      "Health precautions"
    ]
  },
  "budgetBreakdown": {
    "entryFees": ${places.reduce((sum, p) => sum + (p.entryFee?.indian || p.entryFee?.amount || 0), 0)},
    "food": "Estimated food costs",
    "transportation": "Estimated transport costs",
    "shopping": "Estimated shopping budget",
    "miscellaneous": "Other expenses",
    "total": "Total estimated budget",
    "tips": "Money-saving tips specific to this route"
  },
  "alternatives": {
    "quickVersion": "How to do this trip in less time",
    "extendedVersion": "How to extend this trip for more depth",
    "seasonalVariations": "How this trip changes with seasons",
    "budgetOptions": "How to do this trip on a tighter budget"
  },
  "localSecrets": [
    "Hidden gem or lesser-known aspect of one of the places",
    "Best time of day for photography at a specific location",
    "Local insider tip for a better experience",
    "Secret viewpoint or special experience"
  ]
}

Make this plan personal, engaging, and full of insider knowledge. Include specific details that show deep understanding of South Indian culture, customs, and these particular places. Focus on creating an experience, not just a schedule.`;
  }

  /**
   * Parse Gemini AI response and structure the data
   */
  parseGeminiResponse(aiResponse, places, preferences, tripStats) {
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      let parsedPlan;
      try {
        parsedPlan = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('JSON parsing failed, attempting to fix common issues...');
        // Try to fix common JSON issues
        let fixedJson = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*([^",\[\]{}\s]+)(?=\s*[,\}\]])/g, ':"$1"'); // Quote unquoted string values
        
        parsedPlan = JSON.parse(fixedJson);
      }

      // Enhance the parsed plan with additional data
      const enhancedPlan = {
        ...parsedPlan,
        metadata: {
          generatedAt: new Date().toISOString(),
          placesCount: places.length,
          totalDuration: Math.ceil((preferences?.totalTimeAvailable || 480) / 60),
          algorithm: 'gemini-ai-enhanced',
          tripStats
        },
        timeline: this.generateTimeline(places, preferences), // Fallback timeline
        insights: this.generateInsights(places, tripStats),
        recommendations: this.generateRecommendations(places)
      };

      return enhancedPlan;

    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw error;
    }
  }

  /**
   * Generate fallback detailed plan when AI fails
   */
  generateFallbackDetailedPlan(places, preferences, routeMetrics) {
    const tripStats = this.calculateTripStatistics(places, preferences);
    
    return {
      summary: {
        title: `${places.length}-Stop South India Cultural Journey`,
        description: `Explore the rich heritage and culture of South India through ${places.length} carefully selected destinations, spanning ${tripStats.cities.length} cities.`,
        highlights: [
          ...places.filter(p => p.rating >= 4.5).slice(0, 2).map(p => p.name),
          `${tripStats.culturalSites} cultural experiences`,
          `${tripStats.categories.length} different types of attractions`
        ],
        difficulty: this.getDifficultyLevel(places),
        bestSeason: 'October to March (pleasant weather)',
        tripType: this.getTripType(places)
      },
      timeline: this.generateTimeline(places, preferences),
      insights: this.generateInsights(places, tripStats),
      recommendations: this.generateRecommendations(places),
      culturalGuide: this.generateCulturalGuide(places),
      practicalInfo: this.generatePracticalInfo(places, preferences),
      budgetBreakdown: this.generateBudgetBreakdown(places, routeMetrics),
      alternatives: this.generateAlternatives(places, preferences),
      localSecrets: this.generateLocalSecrets(places),
      metadata: {
        generatedAt: new Date().toISOString(),
        placesCount: places.length,
        totalDuration: Math.ceil((preferences?.totalTimeAvailable || 480) / 60),
        algorithm: 'fallback-structured',
        tripStats
      }
    };
  }

  /**
   * Calculate comprehensive trip statistics
   */
  calculateTripStatistics(places, preferences) {
    const categories = [...new Set(places.map(p => p.category))];
    const cities = [...new Set(places.map(p => p.city))];
    const states = [...new Set(places.map(p => p.state))];
    
    const totalDuration = places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0);
    const averageRating = places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length;
    const totalEntryCost = places.reduce((sum, p) => sum + (p.entryFee?.indian || p.entryFee?.amount || 0), 0);
    
    const culturalSites = places.filter(p => ['temple', 'heritage', 'palace', 'fort'].includes(p.category)).length;
    const religiousSites = places.filter(p => p.category === 'temple').length;
    const natureSites = places.filter(p => ['hill-station', 'beach', 'nature', 'park'].includes(p.category)).length;

    return {
      categories,
      cities,
      states,
      totalDuration,
      averageRating,
      totalEntryCost,
      culturalSites,
      religiousSites,
      natureSites,
      highRatedPlaces: places.filter(p => (p.rating || 0) >= 4.5).length
    };
  }

  /**
   * Generate detailed timeline
   */
  generateTimeline(places, preferences) {
    let currentTime = this.timeToMinutes(preferences?.startTime || '09:00');
    const timeline = [];

    places.forEach((place, index) => {
      const visitDuration = place.averageVisitDuration || 90;
      const arrivalTime = currentTime;
      const departureTime = arrivalTime + visitDuration;

      timeline.push({
        time: this.minutesToTime(arrivalTime),
        endTime: this.minutesToTime(departureTime),
        place: {
          name: place.name,
          city: place.city,
          category: place.category,
          rating: place.rating,
          arrivalTime: this.minutesToTime(arrivalTime),
          departureTime: this.minutesToTime(departureTime)
        },
        activities: this.generateActivities(place),
        culturalInsights: this.generateCulturalInsights(place),
        practicalTips: this.generatePracticalTips(place),
        localRecommendations: this.generateLocalRecommendations(place),
        travelToNext: index < places.length - 1 ? {
          duration: 45,
          mode: 'car',
          route: `Travel from ${place.city} to ${places[index + 1].city}`,
          scenery: this.generateSceneryDescription(place, places[index + 1])
        } : null
      });

      // Add travel time for next place
      currentTime = departureTime + (index < places.length - 1 ? 45 : 0);
    });

    return timeline;
  }

  /**
   * Generate insights about the trip
   */
  generateInsights(places, tripStats) {
    return {
      diversity: tripStats.categories.length / places.length,
      culturalRichness: tripStats.culturalSites / places.length,
      averageRating: tripStats.averageRating,
      experienceLevel: tripStats.averageRating >= 4.0 ? 'Premium' : 
                      tripStats.averageRating >= 3.5 ? 'Good' : 'Standard',
      highlights: places.filter(p => (p.rating || 0) >= 4.5),
      categories: tripStats.categories,
      geographicSpread: tripStats.cities.length > 3 ? 'Wide' : 
                       tripStats.cities.length > 1 ? 'Moderate' : 'Local'
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(places) {
    return {
      photography: places.filter(p => ['palace', 'heritage', 'fort'].includes(p.category)),
      cultural: places.filter(p => p.category === 'temple'),
      nature: places.filter(p => ['hill-station', 'beach', 'nature'].includes(p.category)),
      timing: [
        'Start early (8:00 AM) to avoid crowds and heat',
        'Carry sufficient water and stay hydrated',
        'Wear comfortable walking shoes',
        'Respect local customs and dress modestly at religious sites',
        'Keep some cash handy for entry fees and donations'
      ],
      seasonal: this.getSeasonalRecommendations(places)
    };
  }

  /**
   * Generate cultural guide
   */
  generateCulturalGuide(places) {
    const states = [...new Set(places.map(p => p.state))];
    const hasTemples = places.some(p => p.category === 'temple');
    
    const guide = {
      languagePhrases: {
        greetings: {
          hello: 'Namaskaram / Vanakkam',
          thankyou: 'Dhanyawad / Nandri'
        },
        useful: {
          howmuch: 'Evvu? / Evvalavu?',
          where: 'Ekkada? / Enga?'
        }
      },
      etiquette: [
        'Remove footwear before entering temples and homes',
        'Use right hand for greetings and receiving items',
        'Dress modestly, especially at religious sites',
        'Ask permission before photographing people'
      ],
      cuisine: {
        mustTry: this.getRegionalCuisine(states),
        dietary: 'Many options available for vegetarians',
        where: 'Look for local restaurants and street food stalls'
      }
    };

    if (hasTemples) {
      guide.etiquette.push('Maintain silence inside temple premises');
      guide.etiquette.push('Follow the clockwise circumambulation pattern');
    }

    return guide;
  }

  /**
   * Generate practical information
   */
  generatePracticalInfo(places, preferences) {
    return {
      packing: {
        essential: ['Comfortable walking shoes', 'Water bottle', 'Sunscreen', 'Hat/cap'],
        weather: ['Light cotton clothes', 'Light jacket (for hill stations)', 'Umbrella (monsoon season)'],
        cultural: ['Modest clothing for temples', 'Socks (for temple visits)', 'Small bag for footwear']
      },
      transportation: {
        recommended: 'Private car with driver or self-drive',
        alternatives: 'Public buses, trains between major cities',
        parking: 'Most attractions have parking facilities',
        costs: 'Budget ₹8-12 per km for private transport'
      },
      safety: [
        'Carry a copy of ID documents',
        'Inform someone about your travel plans',
        'Stay hydrated in hot weather',
        'Use official guides at major attractions'
      ]
    };
  }

  /**
   * Generate budget breakdown
   */
  generateBudgetBreakdown(places, routeMetrics) {
    const entryFees = places.reduce((sum, p) => sum + (p.entryFee?.indian || p.entryFee?.amount || 0), 0);
    const transportCost = Math.round((routeMetrics?.totalDistance || places.length * 25) * 10);
    const foodCost = places.length * 300;
    const miscCost = places.length * 100;

    return {
      entryFees,
      food: foodCost,
      transportation: transportCost,
      shopping: places.length * 200,
      miscellaneous: miscCost,
      total: entryFees + transportCost + foodCost + miscCost + (places.length * 200),
      tips: [
        'Book accommodation in advance for better rates',
        'Try local street food for authentic and affordable meals',
        'Negotiate prices at local markets',
        'Consider group bookings for transport'
      ]
    };
  }

  /**
   * Generate alternatives
   */
  generateAlternatives(places, preferences) {
    return {
      quickVersion: `Complete this trip in ${Math.ceil(places.length * 0.7)} places by focusing on highest-rated attractions`,
      extendedVersion: `Add nearby attractions to spend 2-3 days exploring each region in depth`,
      seasonalVariations: 'Best during October-March for pleasant weather, monsoon season offers lush greenery',
      budgetOptions: 'Use public transport, stay in budget accommodations, eat at local eateries'
    };
  }

  /**
   * Generate local secrets
   */
  generateLocalSecrets(places) {
    const secrets = [
      'Early morning visits offer the best lighting and fewer crowds',
      'Local guides often share stories not found in guidebooks',
      'Many temples offer free meals (prasadam) to visitors',
      'Sunset/sunrise views from elevated locations are spectacular'
    ];

    // Add place-specific secrets
    places.forEach(place => {
      if (place.category === 'temple') {
        secrets.push(`${place.name}: Visit during evening aarti for a spiritual experience`);
      } else if (place.category === 'fort') {
        secrets.push(`${place.name}: Climb to the highest point for panoramic views`);
      } else if (place.category === 'palace') {
        secrets.push(`${place.name}: Look for intricate details in the architecture`);
      }
    });

    return secrets.slice(0, 6); // Return top 6 secrets
  }

  // Helper methods
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  getDifficultyLevel(places) {
    const avgDuration = places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0) / places.length;
    return avgDuration > 150 ? 'Challenging' : avgDuration > 90 ? 'Moderate' : 'Easy';
  }

  getTripType(places) {
    const cultural = places.filter(p => ['temple', 'heritage', 'palace'].includes(p.category)).length;
    const nature = places.filter(p => ['hill-station', 'beach', 'nature'].includes(p.category)).length;
    
    if (cultural > nature) return 'Cultural';
    if (nature > cultural) return 'Nature & Adventure';
    return 'Mixed Experience';
  }

  generateActivities(place) {
    const activities = {
      'temple': ['Participate in prayers', 'Admire architecture', 'Learn about history'],
      'palace': ['Explore royal chambers', 'Visit museum', 'Photography tour'],
      'heritage': ['Guided historical tour', 'Archaeological exploration', 'Cultural learning'],
      'fort': ['Rampart walk', 'Historical exploration', 'Scenic photography'],
      'beach': ['Beach walk', 'Water sports', 'Sunset viewing'],
      'hill-station': ['Nature trails', 'Viewpoint visits', 'Cool climate relaxation'],
      'nature': ['Wildlife spotting', 'Photography', 'Nature walks'],
      'museum': ['Art appreciation', 'Historical learning', 'Guided tours'],
      'park': ['Leisurely walks', 'Family time', 'Recreational activities']
    };
    
    return activities[place.category] || ['Sightseeing', 'Photography', 'Cultural experience'];
  }

  generateCulturalInsights(place) {
    const insights = {
      'temple': [
        `${place.name} represents South Indian temple architecture`,
        'Temple rituals have been practiced for centuries',
        'Sacred geometry principles used in construction'
      ],
      'palace': [
        `Built during the reign of local dynasties`,
        'Showcases royal lifestyle and artistic patronage',
        'Blend of local and colonial architectural styles'
      ],
      'heritage': [
        'UNESCO World Heritage significance',
        'Historical importance in regional culture',
        'Archaeological findings reveal ancient civilizations'
      ],
      'fort': [
        'Strategic military importance in history',
        'Witness to numerous historical battles',
        'Engineering marvel of medieval times'
      ]
    };
    
    return insights[place.category] || [
      'Rich cultural heritage of South India',
      'Local traditions and customs',
      'Historical significance in the region'
    ];
  }

  generatePracticalTips(place) {
    const tips = {
      'temple': [
        'Remove footwear before entering',
        'Dress modestly - avoid shorts and sleeveless tops',
        'Photography may be restricted in inner sanctum'
      ],
      'palace': [
        'Allow 2-3 hours for complete exploration',
        'Guided tours provide detailed historical context',
        'Some sections may require additional tickets'
      ],
      'heritage': [
        'Hire certified archaeological guides',
        'Carry water and wear comfortable shoes',
        'Best visited during early morning or late afternoon'
      ],
      'fort': [
        'Wear sturdy footwear for uneven surfaces',
        'Carry water as facilities may be limited',
        'Best photography light during golden hours'
      ],
      'beach': [
        'Apply sunscreen and stay hydrated',
        'Check tide timings and weather conditions',
        'Respect local fishing community areas'
      ],
      'hill-station': [
        'Carry light warm clothing',
        'Book accommodation well in advance',
        'Be prepared for altitude effects'
      ]
    };
    
    return tips[place.category] || [
      'Plan adequate time for exploration',
      'Carry essentials like water and snacks',
      'Follow local guidelines and respect customs'
    ];
  }

  generateLocalRecommendations(place) {
    const stateRecommendations = {
      'Tamil Nadu': {
        food: 'Try authentic Tamil meals, filter coffee, and local sweets',
        shopping: 'Handwoven textiles, bronze artifacts, traditional jewelry',
        interactions: 'Learn basic Tamil greetings, respect temple customs'
      },
      'Karnataka': {
        food: 'Mysore pak, dosa varieties, traditional thali meals',
        shopping: 'Mysore silk, sandalwood products, coffee beans',
        interactions: 'Kannada is appreciated, English widely understood'
      },
      'Kerala': {
        food: 'Coconut-based curries, seafood, traditional sadya',
        shopping: 'Spices, tea, handwoven fabrics, wooden crafts',
        interactions: 'Malayalam phrases welcome, very tourist-friendly'
      },
      'Andhra Pradesh': {
        food: 'Spicy Andhra cuisine, biryani, traditional sweets',
        shopping: 'Pearls, handloom textiles, traditional crafts',
        interactions: 'Telugu greetings appreciated, hospitality is excellent'
      }
    };
    
    return stateRecommendations[place.state] || {
      food: 'Try authentic South Indian cuisine',
      shopping: 'Local handicrafts and traditional items',
      interactions: 'English is widely spoken, locals are helpful'
    };
  }

  generateSceneryDescription(fromPlace, toPlace) {
    if (!toPlace) return 'Scenic South Indian countryside';
    
    const sceneryTypes = {
      'temple-palace': 'Traditional villages and agricultural landscapes',
      'palace-fort': 'Historic towns and ancient trade routes',
      'fort-beach': 'Coastal plains with coconut groves',
      'beach-hill-station': 'Gradual elevation through Western Ghats',
      'hill-station-temple': 'Descending through tea estates and forests'
    };
    
    const key = `${fromPlace.category}-${toPlace.category}`;
    return sceneryTypes[key] || 'Beautiful South Indian landscapes';
  }

  getSeasonalRecommendations(places) {
    const hasHillStations = places.some(p => p.category === 'hill-station');
    const hasBeaches = places.some(p => p.category === 'beach');
    
    const recommendations = [
      'October to March: Pleasant weather, ideal for sightseeing',
      'April to June: Hot weather, early morning visits recommended'
    ];
    
    if (hasHillStations) {
      recommendations.push('Hill stations offer respite from heat during summer');
    }
    
    if (hasBeaches) {
      recommendations.push('Beach destinations are beautiful during winter months');
    }
    
    return recommendations;
  }

  getRegionalCuisine(states) {
    const cuisineMap = {
      'Tamil Nadu': ['Idli-Sambar', 'Chettinad Chicken', 'Filter Coffee'],
      'Karnataka': ['Masala Dosa', 'Bisi Bele Bath', 'Mysore Pak'],
      'Kerala': ['Appam-Stew', 'Fish Curry', 'Payasam'],
      'Andhra Pradesh': ['Hyderabadi Biryani', 'Gongura Pickle', 'Pesarattu'],
      'Telangana': ['Hyderabadi Biryani', 'Haleem', 'Qubani Ka Meetha']
    };
    
    let dishes = [];
    states.forEach(state => {
      if (cuisineMap[state]) {
        dishes.push(...cuisineMap[state]);
      }
    });
    
    return dishes.length > 0 ? [...new Set(dishes)].slice(0, 5) : 
           ['South Indian Thali', 'Dosa varieties', 'Traditional sweets'];
  }
}

// Export as singleton instance
module.exports = new DetailedTripController();