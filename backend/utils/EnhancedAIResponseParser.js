/**
 * Enhanced AI response parsing with comprehensive fallback strategies
 * Handles comments, malformed JSON, and provides structured fallbacks
 */

class EnhancedAIResponseParser {
  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Main parsing method with multiple fallback strategies
   */
  parseAndEnhanceAIResponse(aiResponse, places, preferences, realTimeSchedule, currentDateTime) {
    if (this.debugMode) {
      console.log('🔍 Starting AI response parsing...');
      console.log('📊 Response length:', aiResponse?.length);
      console.log('🎯 Response preview:', aiResponse?.substring(0, 200));
    }

    try {
      // Strategy 1: Extract and clean JSON
      let jsonStr = this.extractJsonFromResponse(aiResponse);
      
      if (!jsonStr) {
        console.warn('⚠️ No JSON found in AI response, using fallback');
        return this.generateStructuredFallbackPlan(places, preferences, realTimeSchedule, currentDateTime);
      }

      // Strategy 2: Clean JSON formatting issues including comments
      jsonStr = this.cleanJsonString(jsonStr);

      // Strategy 3: Parse with error recovery
      let parsedPlan = this.parseJsonWithRecovery(jsonStr);

      // Strategy 4: Validate and enhance the parsed plan
      const enhancedPlan = this.validateAndEnhancePlan(parsedPlan, places, preferences, realTimeSchedule, currentDateTime);

      console.log('✅ AI response successfully parsed and enhanced');
      return enhancedPlan;

    } catch (error) {
      console.error('💥 Error parsing AI response:', error.message);
      console.log('📝 Raw AI response length:', aiResponse?.length);
      console.log('🔍 AI response preview:', aiResponse?.substring(0, 500));
      
      // Return structured fallback plan
      return this.generateStructuredFallbackPlan(places, preferences, realTimeSchedule, currentDateTime);
    }
  }

  /**
   * Extract JSON from AI response using multiple strategies
   */
  extractJsonFromResponse(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') {
      return null;
    }

    // Strategy 1: Look for complete JSON block with proper nesting
    const jsonMatch = aiResponse.match(/\{(?:[^{}]|{[^{}]*})*\}/s);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // Strategy 2: Look for JSON between code blocks
    const codeBlockMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }

    // Strategy 3: Find JSON boundaries more precisely
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < aiResponse.length; i++) {
      if (aiResponse[i] === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (aiResponse[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i;
          break;
        }
      }
    }

    if (startIndex !== -1 && endIndex !== -1) {
      return aiResponse.substring(startIndex, endIndex + 1);
    }

    return null;
  }

  /**
   * Clean JSON string - handles comments and common formatting issues
   */
  cleanJsonString(jsonStr) {
    return jsonStr
      // Remove single-line comments (// comments)
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments (/* comments */)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Fix unquoted property names
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // Fix single quotes to double quotes (but not within strings)
      .replace(/(?<!\\)'([^'\\]*(\\.[^'\\]*)*)'(?=\s*[,}\]:)])/g, '"$1"')
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      // Remove trailing/leading whitespace
      .trim();
  }

  /**
   * Parse JSON with comprehensive error recovery
   */
  parseJsonWithRecovery(jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (firstError) {
      console.warn('🔧 First JSON parse failed, attempting recovery:', firstError.message);
      
      // Recovery Strategy 1: Fix common syntax errors
      try {
        const fixedJson = this.fixCommonJsonErrors(jsonStr);
        return JSON.parse(fixedJson);
      } catch (recoveryError) {
        console.warn('🔧 JSON syntax fix failed:', recoveryError.message);
      }
      
      // Recovery Strategy 2: Extract and rebuild essential structure
      try {
        const simplifiedJson = this.extractEssentialStructure(jsonStr);
        return JSON.parse(simplifiedJson);
      } catch (simplifyError) {
        console.warn('🔧 JSON simplification failed:', simplifyError.message);
      }
      
      // Recovery Strategy 3: Use regex to extract key-value pairs
      try {
        const rebuiltJson = this.rebuildJsonFromParts(jsonStr);
        return JSON.parse(rebuiltJson);
      } catch (rebuildError) {
        console.warn('🔧 JSON rebuild failed:', rebuildError.message);
      }
      
      // Re-throw original error if all recovery attempts fail
      throw firstError;
    }
  }

  /**
   * Fix common JSON syntax errors
   */
  fixCommonJsonErrors(jsonStr) {
    return jsonStr
      // Fix undefined values
      .replace(/:\s*undefined/g, ': null')
      // Fix unescaped quotes in strings
      .replace(/"([^"\\]*(?:\\.[^"\\]*)*)":\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, key, value) => {
        const escapedValue = value.replace(/"/g, '\\"');
        return `"${key}": "${escapedValue}"`;
      })
      // Fix missing quotes around boolean-like strings
      .replace(/:\s*(true|false|null)(?=\s*[,}])/g, ': "$1"')
      // Fix arrays with trailing commas
      .replace(/,(\s*\])/g, '$1')
      // Fix objects with trailing commas
      .replace(/,(\s*\})/g, '$1');
  }

  /**
   * Extract essential structure when full parsing fails
   */
  extractEssentialStructure(jsonStr) {
    const essentialFields = {
      summary: this.extractField(jsonStr, 'summary'),
      timeline: this.extractField(jsonStr, 'timeline'),
      personalizedRecommendations: this.extractField(jsonStr, 'personalizedRecommendations'),
      metadata: this.extractField(jsonStr, 'metadata')
    };

    // Remove null/undefined fields
    Object.keys(essentialFields).forEach(key => {
      if (essentialFields[key] === null || essentialFields[key] === undefined) {
        delete essentialFields[key];
      }
    });

    return JSON.stringify(essentialFields);
  }

  /**
   * Extract specific field from malformed JSON
   */
  extractField(jsonStr, fieldName) {
    try {
      const fieldRegex = new RegExp(`"${fieldName}"\\s*:\\s*([^,}\\]]+(?:{[^}]*}|\\[[^\\]]*\\])?[^,}\\]]*)`, 'g');
      const match = fieldRegex.exec(jsonStr);
      
      if (match) {
        const value = match[1].trim();
        // Try to parse the extracted value
        if (value.startsWith('{') || value.startsWith('[') || value.startsWith('"')) {
          return JSON.parse(value);
        }
        return value;
      }
    } catch (error) {
      console.warn(`Failed to extract field ${fieldName}:`, error.message);
    }
    
    return null;
  }

  /**
   * Rebuild JSON from individual parts using regex
   */
  rebuildJsonFromParts(jsonStr) {
    const rebuiltObject = {};
    
    // Extract string fields
    const stringMatches = jsonStr.match(/"([^"]+)":\s*"([^"]*(?:\\.[^"]*)*)"/g);
    if (stringMatches) {
      stringMatches.forEach(match => {
        const [, key, value] = match.match(/"([^"]+)":\s*"([^"]*(?:\\.[^"]*)*)"/);
        rebuiltObject[key] = value;
      });
    }

    // Extract array fields (simplified)
    const arrayMatches = jsonStr.match(/"([^"]+)":\s*\[[^\]]*\]/g);
    if (arrayMatches) {
      arrayMatches.forEach(match => {
        const [, key] = match.match(/"([^"]+)":\s*\[/);
        const arrayContent = match.match(/\[(.*)\]/)[1];
        try {
          rebuiltObject[key] = JSON.parse(`[${arrayContent}]`);
        } catch {
          // If parsing fails, create simple array
          rebuiltObject[key] = arrayContent.split(',').map(item => item.trim().replace(/"/g, ''));
        }
      });
    }

    return JSON.stringify(rebuiltObject);
  }

  /**
   * Validate and enhance the parsed plan with required structure
   */
  validateAndEnhancePlan(parsedPlan, places, preferences, realTimeSchedule, currentDateTime) {
    // Ensure base structure exists
    const enhancedPlan = {
      summary: parsedPlan.summary || this.generateDefaultSummary(places, currentDateTime),
      timeline: parsedPlan.timeline || this.generateDefaultTimeline(places, realTimeSchedule, currentDateTime),
      personalizedRecommendations: parsedPlan.personalizedRecommendations || this.generateDefaultRecommendations(places, preferences),
      personalizedLogistics: parsedPlan.personalizedLogistics || this.generateDefaultLogistics(places, preferences),
      realTimeFeatures: parsedPlan.realTimeFeatures || this.generateRealTimeFeatures(places, realTimeSchedule),
      interactiveFeatures: parsedPlan.interactiveFeatures || this.generateInteractiveFeatures(places, realTimeSchedule),
      metadata: parsedPlan.metadata || this.generateDefaultMetadata(currentDateTime)
    };

    // Add enhanced features
    enhancedPlan.mapViewData = {
      enabled: true,
      startLocation: {
        name: 'Coimbatore Tidal Park',
        coordinates: { lat: 11.0638, lng: 77.0596 }
      },
      waypoints: places.map((place, index) => ({
        id: place.id,
        name: place.name,
        coordinates: { 
          lat: place.location?.latitude || 0, 
          lng: place.location?.longitude || 0 
        },
        order: index + 1,
        scheduledTime: realTimeSchedule.timeline[index + 1]?.arrivalTime
      })),
      routePolyline: realTimeSchedule.routeCoordinates || [],
      realTimeTracking: true
    };

    enhancedPlan.tripTracking = {
      enabled: true,
      startTripEndpoint: '/api/trips/start-realtime-tracking',
      updateProgressEndpoint: '/api/trips/update-progress',
      completeTrip: '/api/trips/complete-realtime-trip',
      autoProgress: {
        enabled: true,
        interval: 40000,
        smartProgression: true
      }
    };

    enhancedPlan.realTimeContext = currentDateTime;
    enhancedPlan.lastUpdated = new Date().toISOString();

    return enhancedPlan;
  }

  /**
   * Generate structured fallback plan when AI parsing completely fails
   */
  generateStructuredFallbackPlan(places, preferences, realTimeSchedule, currentDateTime) {
    console.log('🔄 Generating comprehensive structured fallback plan...');
    
    return {
      summary: {
        title: `Personalized ${places.length}-Destination Journey`,
        description: `A carefully crafted itinerary for your selected destinations, optimized for ${currentDateTime.dayOfWeek} ${currentDateTime.season} travel`,
        personalizedHighlights: [
          'Route customized to your selected places',
          `Real-time planning for ${currentDateTime.formatted}`,
          'Optimized timing and logistics',
          'Interactive map and tracking features'
        ],
        tripPersonality: 'Tailored for your travel preferences',
        uniqueExperiences: places.map(place => `Discover ${place.name} - your personal selection`),
        realTimeAdvice: `Optimized for ${currentDateTime.dayOfWeek} ${currentDateTime.season} conditions`
      },
      
      timeline: this.generateDefaultTimeline(places, realTimeSchedule, currentDateTime),
      
      personalizedRecommendations: {
        forYourSelection: places.map(place => ({
          place: place.name,
          recommendation: `Explore the unique features of ${place.name}`,
          personalizedTip: `Perfect choice for ${place.category} enthusiasts`
        })),
        forYourTiming: [
          `${preferences?.startTime || '09:00'} start time optimizes your day`,
          'Route planned to minimize travel time',
          'Allows comfortable exploration at each location'
        ],
        forYourGroup: this.getGroupRecommendations(preferences?.groupSize || 1),
        budgetOptimization: this.getBudgetRecommendations(preferences?.budget, places)
      },
      
      personalizedLogistics: {
        transportation: {
          recommended: 'Private vehicle for flexibility',
          alternatives: ['Rental car', 'Hired cab with driver', 'Public transport combinations'],
          personalizedAdvice: this.getTransportAdvice(preferences?.groupSize || 1, places.length)
        },
        accommodation: {
          suggestions: this.getAccommodationSuggestions(preferences?.budget),
          bookingStrategy: 'Book in advance for better rates and availability'
        },
        essentialItems: this.getSeasonalEssentials(currentDateTime.season),
        safetyTips: this.getSafetyTips(places, preferences?.groupSize || 1)
      },
      
      realTimeFeatures: {
        liveMapIntegration: {
          enabled: true,
          startLocation: { name: "Coimbatore Tidal Park", coordinates: { lat: 11.0638, lng: 77.0596 } },
          waypoints: places.map(place => ({
            name: place.name,
            coordinates: { lat: place.location.latitude, lng: place.location.longitude }
          })),
          realTimeRouting: true,
          trafficUpdates: true
        },
        tripTracking: {
          autoProgress: true,
          checkpointNotifications: true,
          realTimeETA: true
        },
        liveUpdates: {
          weatherAlerts: true,
          crowdLevelUpdates: true,
          specialEventNotifications: true
        }
      },
      
      interactiveFeatures: {
        mapView: { enabled: true },
        tripTracker: { enabled: true, interval: 40000 },
        realTimeUpdates: { enabled: true },
        smartCheckpoints: realTimeSchedule.timeline.map((item, index) => ({
          id: `checkpoint_${index}`,
          name: item.name,
          coordinates: item.coordinates || { lat: 11.0638, lng: 77.0596 },
          scheduledTime: item.scheduledTime,
          status: 'pending'
        }))
      },
      
      metadata: {
        personalizationLevel: 'Structured Fallback',
        userSpecific: true,
        realTimePlanning: true,
        basedOnUserSelections: true,
        generatedAt: new Date().toISOString(),
        aiModel: 'fallback-structured-plan',
        planningContext: currentDateTime.planningTimeDescription,
        fallbackReason: 'AI response parsing failed - comprehensive fallback used'
      }
    };
  }

  // Helper methods for fallback plan generation

  generateDefaultSummary(places, currentDateTime) {
    return {
      title: `${places.length}-Destination Personalized Journey`,
      description: `Explore your handpicked destinations with optimized routing and timing`,
      personalizedHighlights: [
        'Customized for your selected places',
        'Real-time travel optimization',
        'Interactive tracking features'
      ],
      tripPersonality: 'Tailored exploration experience'
    };
  }

  generateDefaultTimeline(places, realTimeSchedule, currentDateTime) {
    return realTimeSchedule.timeline.map((item, index) => {
      if (item.type === 'start') {
        return {
          time: item.scheduledTime,
          endTime: item.endTime || item.scheduledTime,
          place: {
            name: "Coimbatore Tidal Park",
            type: "start_location",
            coordinates: { lat: 11.0638, lng: 77.0596 }
          },
          duration: 15,
          activities: [
            "Journey preparation and final checks",
            "Route confirmation",
            "Departure for first destination"
          ],
          tips: [
            `${currentDateTime.season} season preparations`,
            "Ensure all essentials are packed",
            "Check real-time traffic conditions"
          ]
        };
      } else {
        const place = places[index - 1];
        return {
          time: item.arrivalTime || item.scheduledTime,
          endTime: item.departureTime,
          place: {
            name: place.name,
            city: place.city,
            state: place.state,
            category: place.category,
            coordinates: { lat: place.location.latitude, lng: place.location.longitude }
          },
          duration: place.averageVisitDuration || 90,
          activities: this.getDefaultActivities(place.category),
          tips: this.getDefaultTips(place.category, currentDateTime.season),
          entryInfo: {
            fee: place.entryFee?.indian || 0,
            currency: "INR",
            openingHours: "Check current timings"
          }
        };
      }
    });
  }

  generateDefaultRecommendations(places, preferences) {
    return {
      cultural: places.filter(p => ['temple', 'heritage', 'palace'].includes(p.category))
                    .map(p => `Immerse in the cultural heritage of ${p.name}`),
      experiential: places.map(p => `Unique experience awaits at ${p.name}`),
      practical: [
        'Start early for comfortable exploration',
        'Carry water and snacks',
        'Respect local customs and traditions'
      ]
    };
  }

  generateDefaultLogistics(places, preferences) {
    return {
      transportation: 'Private vehicle recommended for flexibility',
      duration: `${Math.ceil(places.length * 1.5)} hours total journey`,
      essentials: ['Comfortable footwear', 'Weather-appropriate clothing', 'Phone charger'],
      timing: 'Allow sufficient time at each location'
    };
  }

  generateRealTimeFeatures(places, realTimeSchedule) {
    return {
      liveMapIntegration: { enabled: true },
      tripTracking: { enabled: true },
      realTimeUpdates: { enabled: true }
    };
  }

  generateInteractiveFeatures(places, realTimeSchedule) {
    return {
      mapView: { enabled: true },
      tripTracker: { enabled: true },
      progressUpdates: { enabled: true }
    };
  }

  generateDefaultMetadata(currentDateTime) {
    return {
      personalizationLevel: 'Standard',
      realTimePlanning: true,
      generatedAt: new Date().toISOString(),
      planningContext: currentDateTime.formatted
    };
  }

  // Utility helper methods

  getDefaultActivities(category) {
    const activities = {
      'temple': ['Explore sacred architecture', 'Observe rituals and customs', 'Photography of exteriors'],
      'heritage': ['Historical site exploration', 'Archaeological significance learning', 'Guided tour participation'],
      'palace': ['Royal chambers visit', 'Museum exploration', 'Garden walkthrough'],
      'fort': ['Rampart exploration', 'Panoramic views', 'Historical significance'],
      'hill-station': ['Scenic viewpoints', 'Nature trails', 'Fresh air and relaxation'],
      'beach': ['Coastal exploration', 'Local culture observation', 'Relaxation time']
    };
    
    return activities[category] || ['General sightseeing', 'Cultural exploration', 'Photography'];
  }

  getDefaultTips(category, season) {
    const tips = [];
    
    if (category === 'temple') {
      tips.push('Remove footwear before entering', 'Dress modestly', 'Respect photography restrictions');
    } else if (category === 'heritage') {
      tips.push('Hire local guide for better understanding', 'Carry water', 'Wear comfortable shoes');
    }
    
    if (season === 'Summer') {
      tips.push('Visit during cooler hours', 'Carry sun protection');
    } else if (season === 'Monsoon') {
      tips.push('Carry rain gear', 'Wear non-slip footwear');
    }
    
    return tips;
  }

  getGroupRecommendations(groupSize) {
    if (groupSize === 1) {
      return ['Perfect for solo exploration', 'Join other travelers for shared experiences'];
    } else if (groupSize <= 4) {
      return ['Ideal small group size', 'Easy coordination and movement'];
    } else {
      return ['Large group coordination needed', 'Consider splitting for some activities'];
    }
  }

  getBudgetRecommendations(budget, places) {
    const totalEntryFees = places.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
    
    return [
      `Entry fees total: ₹${totalEntryFees}`,
      budget ? `Budget allocation: ₹${budget}` : 'Plan budget for food, transport, and incidentals',
      'Many experiences are free - focus on travel comfort'
    ];
  }

  getTransportAdvice(groupSize, placeCount) {
    if (groupSize > 4) {
      return 'Large vehicle or tempo traveler recommended';
    } else if (placeCount > 5) {
      return 'Private car with driver for convenience';
    } else {
      return 'Rental car or premium cab service';
    }
  }

  getAccommodationSuggestions(budget) {
    if (!budget || budget < 2000) {
      return ['Budget guesthouses', 'Temple accommodation', 'Youth hostels'];
    } else if (budget < 5000) {
      return ['Mid-range hotels', '3-star properties', 'Business hotels'];
    } else {
      return ['Luxury hotels', 'Heritage properties', 'Premium resorts'];
    }
  }

  getSeasonalEssentials(season) {
    const essentials = ['Comfortable walking shoes', 'Water bottle', 'Phone charger'];
    
    if (season === 'Summer') {
      essentials.push('Sun hat', 'Sunscreen', 'Light cotton clothes');
    } else if (season === 'Monsoon') {
      essentials.push('Rain jacket', 'Umbrella', 'Waterproof bag');
    } else if (season === 'Winter') {
      essentials.push('Light jacket', 'Warm layer');
    }
    
    return essentials;
  }

  getSafetyTips(places, groupSize) {
    const tips = ['Carry emergency contacts', 'Keep documents safe', 'Stay hydrated'];
    
    if (groupSize === 1) {
      tips.push('Inform someone about your itinerary');
    } else {
      tips.push('Designate group meeting points');
    }
    
    if (places.some(p => ['hill-station', 'fort'].includes(p.category))) {
      tips.push('Wear appropriate footwear for elevation');
    }
    
    return tips;
  }
}

module.exports = EnhancedAIResponseParser;