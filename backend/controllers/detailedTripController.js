// backend/controllers/detailedTripController.js - FIXED VERSION

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');
const DistanceCalculator = require('../utils/distanceCalculator');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const distanceCalculator = new DistanceCalculator();

class DetailedTripController {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Bind methods to preserve 'this' context
    this.generateDetailedPlan = this.generateDetailedPlan.bind(this);
    this.generatePersonalizedPlan = this.generatePersonalizedPlan.bind(this);
    this.calculateRealTimeSchedule = this.calculateRealTimeSchedule.bind(this);
    this.buildEnhancedPrompt = this.buildEnhancedPrompt.bind(this);
    this.parseAndEnhanceAIResponse = this.parseAndEnhanceAIResponse.bind(this);
    this.generateStructuredFallbackPlan = this.generateStructuredFallbackPlan.bind(this);
  }

  /**
   * MAIN ENDPOINT: Generate personalized detailed trip plan based on user selections
   */
  async generateDetailedPlan(req, res) {
    try {
      const { places, preferences, routeMetrics, algorithm, userProfile } = req.body;
      
      // Get comprehensive current date/time for real-time planning
      const currentDateTime = this.getCurrentDateTimeContext();

      console.log('🧠 Generating PERSONALIZED detailed trip plan...');
      console.log(`📅 Real-Time Context: ${currentDateTime.formatted}`);
      console.log(`📍 User Selected Places: ${places?.length}`);
      console.log(`⚙️ Algorithm Used: ${algorithm}`);
      console.log(`👤 User Profile: ${userProfile ? 'Available' : 'Standard'}`);

      // Enhanced input validation
      if (!places || !Array.isArray(places) || places.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one place must be selected for trip planning'
        });
      }

      if (places.length > 25) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 25 places allowed for detailed planning'
        });
      }

      // Calculate real-time travel schedule with actual distances
      const realTimeSchedule = await this.calculateRealTimeSchedule(
        places, 
        preferences, 
        currentDateTime
      );

      // Generate comprehensive personalized plan using Gemini AI
      const personalizedPlan = await this.generatePersonalizedPlan(
        places, 
        preferences, 
        routeMetrics, 
        algorithm,
        currentDateTime,
        realTimeSchedule,
        userProfile
      );

      // Enhanced response with all features
      const response = {
        success: true,
        data: {
          ...personalizedPlan,
          
          // Real-time context
          realTimeContext: currentDateTime,
          
          // Interactive features
          interactiveFeatures: {
            mapView: {
              enabled: true,
              startLocation: {
                name: 'Coimbatore Tidal Park',
                coordinates: { lat: 11.0638, lng: 77.0596 }
              },
              waypoints: places.map((place, index) => ({
                id: place.id,
                name: place.name,
                coordinates: { 
                  lat: place.location.latitude, 
                  lng: place.location.longitude 
                },
                order: index + 1,
                category: place.category,
                scheduledTime: realTimeSchedule.timeline[index + 1]?.arrivalTime
              })),
              routePolyline: realTimeSchedule.routeCoordinates
            },
            
            tripTracking: {
              enabled: true,
              checkpoints: realTimeSchedule.timeline.map((item, index) => ({
                id: item.id || `checkpoint_${index}`,
                name: item.name,
                type: item.type || 'destination',
                coordinates: item.coordinates,
                scheduledTime: item.scheduledTime,
                status: 'pending',
                realTimeETA: item.realTimeETA
              })),
              autoProgress: {
                enabled: true,
                interval: 40000, // 40 seconds
                smartProgression: true
              }
            }
          },
          
          // Personal recommendations
          personalizedRecommendations: personalizedPlan.personalizedRecommendations || {},
          
          // Live updates capability
          liveUpdates: {
            weatherIntegration: true,
            trafficUpdates: true,
            crowdLevelAlerts: true,
            lastUpdated: currentDateTime.timestamp
          }
        },
        
        // Metadata
        generatedAt: new Date().toISOString(),
        aiModel: 'gemini-1.5-flash-enhanced',
        algorithm: algorithm || 'personalized-optimization',
        userSpecific: true,
        realTimePlanning: true
      };

      console.log('✅ Personalized detailed plan generated successfully');
      res.status(200).json(response);

    } catch (error) {
      console.error('💥 Detailed trip plan generation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate personalized trip plan',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Generate comprehensive personalized plan using Gemini AI
   */
  async generatePersonalizedPlan(places, preferences, routeMetrics, algorithm, currentDateTime, realTimeSchedule, userProfile) {
    try {
      // Build enhanced prompt with all user-specific data
      const prompt = this.buildEnhancedPrompt(
        places, 
        preferences, 
        routeMetrics, 
        algorithm, 
        currentDateTime, 
        realTimeSchedule, 
        userProfile
      );

      console.log('🤖 Sending enhanced request to Gemini AI for personalized planning...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();

      console.log('✅ Gemini AI personalized response received');

      // Parse and enhance the AI response
      const structuredPlan = this.parseAndEnhanceAIResponse(
        aiResponse, 
        places, 
        preferences, 
        realTimeSchedule, 
        currentDateTime
      );

      return structuredPlan;

    } catch (error) {
      console.error('🚨 Gemini AI personalized planning failed:', error);
      return this.generateStructuredFallbackPlan(
        places, 
        preferences, 
        realTimeSchedule, 
        currentDateTime
      );
    }
  }

  /**
   * Fixed parseAndEnhanceAIResponse method with robust JSON parsing
   */
  parseAndEnhanceAIResponse(aiResponse, places, preferences, realTimeSchedule, currentDateTime) {
    try {
      // Multiple JSON extraction strategies
      let parsedPlan = null;
      
      // Strategy 1: Look for the main JSON block
      let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedPlan = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn('Strategy 1 failed, trying strategy 2...');
        }
      }
      
      // Strategy 2: Look for JSON between code blocks
      if (!parsedPlan) {
        const codeBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
          try {
            parsedPlan = JSON.parse(codeBlockMatch[1]);
          } catch (e) {
            console.warn('Strategy 2 failed, trying strategy 3...');
          }
        }
      }
      
      // Strategy 3: Clean and attempt to fix common JSON issues
      if (!parsedPlan && jsonMatch) {
        try {
          let cleanedJson = jsonMatch[0]
            .replace(/,\s*}/g, '}')  // Remove trailing commas before }
            .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\n/g, ' ')     // Replace newlines with spaces
            .replace(/\r/g, '')      // Remove carriage returns
            .replace(/\t/g, ' ')     // Replace tabs with spaces
            .replace(/\s+/g, ' ');   // Collapse multiple spaces
            
          parsedPlan = JSON.parse(cleanedJson);
        } catch (e) {
          console.warn('Strategy 3 failed, using fallback...');
        }
      }
      
      // If all JSON parsing failed, use fallback
      if (!parsedPlan) {
        console.error('All JSON parsing strategies failed, using structured fallback');
        throw new Error('JSON parsing failed - using fallback plan');
      }

      // Enhance the parsed plan with interactive features
      const enhancedPlan = {
        ...parsedPlan,
        
        // Add map view functionality
        mapViewData: {
          enabled: true,
          startLocation: {
            name: 'Coimbatore Tidal Park',
            coordinates: { lat: 11.0638, lng: 77.0596 }
          },
          waypoints: places.map((place, index) => ({
            id: place.id,
            name: place.name,
            coordinates: { lat: place.location.latitude, lng: place.location.longitude },
            order: index + 1,
            scheduledTime: realTimeSchedule.timeline[index + 1]?.arrivalTime
          })),
          routePolyline: realTimeSchedule.routeCoordinates,
          realTimeTracking: true
        },
        
        // Add trip tracking functionality
        tripTracking: {
          enabled: true,
          startTripEndpoint: '/api/trips/start-realtime-tracking',
          updateProgressEndpoint: '/api/trips/update-progress',
          completeTrip: '/api/trips/complete-realtime-trip',
          autoProgress: {
            enabled: true,
            interval: 40000,
            smartProgression: true
          }
        },
        
        // Real-time context
        realTimeContext: currentDateTime,
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ AI response parsed and enhanced successfully');
      return enhancedPlan;

    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('🔄 Falling back to structured plan generation...');
      
      // Use fallback plan generation
      return this.generateStructuredFallbackPlan(places, preferences, realTimeSchedule, currentDateTime);
    }
  }

  /**
   * Generate structured fallback plan when AI parsing fails
   */
  generateStructuredFallbackPlan(places, preferences, realTimeSchedule, currentDateTime) {
    console.log('⚠️ Using structured fallback plan generation');
    
    try {
      const plan = {
        summary: {
          title: `Personalized ${places.length}-Destination Journey`,
          description: `A tailored itinerary for your selected places, optimized for ${currentDateTime.dayOfWeek} ${currentDateTime.season} travel`,
          personalizedHighlights: [
            'Custom route based on your selected places',
            `Real-time planning for ${currentDateTime.formatted}`,
            'Personalized recommendations for each destination',
            'Interactive map and trip tracking enabled'
          ],
          tripPersonality: `Customized for ${preferences?.userProfile?.travelStyle || 'explorer'} traveling ${preferences?.groupSize === 1 ? 'solo' : 'in group of ' + (preferences?.groupSize || 'multiple people')}`,
          uniqueExperiences: places.map(place => `Explore ${place.name} - your personal choice`),
          realTimeAdvice: `Optimized for ${currentDateTime.dayOfWeek} ${currentDateTime.season} travel with live weather and crowd considerations`
        },
        
        timeline: this.buildFallbackTimeline(places, realTimeSchedule, currentDateTime, preferences?.userProfile),
        
        personalizedRecommendations: {
          forYourInterests: this.buildInterestRecommendations(preferences?.userProfile?.interests, places),
          forYourTravelStyle: this.getRecommendationsForTravelStyle(preferences?.userProfile?.travelStyle, places),
          forYourGroup: this.getRecommendationsForGroupSize(preferences?.groupSize || 1, places),
          personalizedTiming: [
            `Start at ${preferences?.startTime || '09:00'} - perfect for your schedule`,
            this.getPersonalizedTimingTips(currentDateTime, preferences?.userProfile)
          ],
          budgetOptimization: this.getBudgetOptimizationTips(preferences?.budget, places)
        },
        
        personalizedLogistics: {
          transportationForYou: {
            recommended: this.getPersonalizedTransportation(preferences?.userProfile, places),
            alternatives: this.getTransportAlternatives(preferences?.userProfile),
            personalizedAdvice: this.getTransportPersonalizedAdvice(preferences?.userProfile, preferences?.groupSize || 1)
          },
          accommodationSuggestions: {
            personalizedOptions: this.getPersonalizedAccommodation(preferences?.userProfile, preferences?.budget),
            bookingStrategy: this.getBookingStrategy(currentDateTime, preferences?.userProfile)
          },
          personalizedPacking: {
            essentials: this.getPersonalizedPackingList(preferences?.userProfile, currentDateTime).split(',').map(item => item.trim()),
            seasonalItems: this.getSeasonalPackingItems(currentDateTime),
            personalPreferences: this.getPersonalPackingPreferences(preferences?.userProfile)
          },
          personalizedSafetyTips: this.getPersonalizedSafetyTips(preferences?.userProfile, preferences?.groupSize || 1, places)
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
            realTimeETA: true,
            smartRerouting: true
          },
          liveUpdates: {
            weatherAlerts: true,
            crowdLevelUpdates: true,
            specialEventNotifications: true,
            localRecommendations: true
          }
        },
        
        interactiveFeatures: {
          smartCheckpoints: this.buildSmartCheckpoints(realTimeSchedule, preferences?.userProfile),
          personalizedChallenges: this.getPersonalizedChallenges(places, preferences?.userProfile)
        },
        
        metadata: {
          personalizationLevel: "Fallback",
          userSpecific: true,
          realTimePlanning: true,
          basedOnUserSelections: true,
          generatedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          aiModel: "fallback-structured",
          algorithm: algorithm || 'nearestNeighbor',
          planningContext: currentDateTime.planningTimeDescription,
          fallbackUsed: true
        }
      };

      console.log('✅ Structured fallback plan generated successfully');
      return plan;
      
    } catch (error) {
      console.error('💥 Even fallback plan generation failed:', error);
      
      // Ultra-simple fallback
      return {
        summary: {
          title: 'Basic Trip Plan',
          description: `Visit ${places.length} selected destinations`,
          personalizedHighlights: ['Custom route', 'Your selected places'],
          tripPersonality: 'Basic itinerary',
          uniqueExperiences: places.map(p => `Visit ${p.name}`),
          realTimeAdvice: 'Basic travel recommendations'
        },
        timeline: places.map((place, index) => ({
          time: `${9 + index * 2}:00`,
          place: { name: place.name, city: place.city },
          duration: place.averageVisitDuration || 90,
          activities: ['Explore and enjoy the location'],
          personalizedTips: ['Take your time', 'Enjoy the experience']
        })),
        personalizedRecommendations: {
          general: ['Start early', 'Carry water', 'Take photos']
        },
        metadata: {
          personalizationLevel: "Minimal",
          fallbackUsed: true,
          errorRecovery: true
        }
      };
    }
  }

  /**
   * Build fallback timeline when AI parsing fails
   */
  buildFallbackTimeline(places, realTimeSchedule, currentDateTime, userProfile) {
    const timeline = [];
    
    // Add start location
    timeline.push({
      time: realTimeSchedule.timeline[0]?.scheduledTime || '09:00',
      endTime: realTimeSchedule.timeline[0]?.endTime || '09:15',
      place: {
        name: "Coimbatore Tidal Park",
        type: "start_location",
        coordinates: { lat: 11.0638, lng: 77.0596 }
      },
      duration: 15,
      activities: [
        "Final preparation and departure checklist",
        "Weather check and route confirmation",
        "Personal travel ritual"
      ],
      personalizedTips: [
        `Pack according to ${currentDateTime.season} season`,
        "Download offline maps for selected destinations",
        "Carry essentials for the journey"
      ],
      realTimeUpdate: `Current weather: ${currentDateTime.weatherCondition}`,
      travel: realTimeSchedule.timeline[1] ? {
        toNext: realTimeSchedule.timeline[1].name,
        duration: realTimeSchedule.timeline[1].travelTime || 45,
        distance: `${realTimeSchedule.timeline[1].travelDistance || 25}km`,
        mode: "private_vehicle"
      } : null
    });

    // Add each place with fallback data
    places.forEach((place, index) => {
      const scheduleItem = realTimeSchedule.timeline[index + 1] || {
        arrivalTime: `${9 + (index + 1) * 2}:00`,
        departureTime: `${9 + (index + 1) * 2 + 1}:30`,
        duration: place.averageVisitDuration || 90
      };

      const timelineItem = {
        time: scheduleItem.arrivalTime,
        endTime: scheduleItem.departureTime,
        place: {
          name: place.name,
          city: place.city,
          state: place.state,
          category: place.category,
          rating: place.rating,
          coordinates: { 
            lat: place.location?.latitude || 11.0168, 
            lng: place.location?.longitude || 76.9558 
          },
          personalRelevance: this.getPersonalRelevance(place, userProfile)
        },
        duration: place.averageVisitDuration || 90,
        personalizedActivities: this.generatePersonalizedActivities(place, userProfile),
        culturalInsights: this.generateCulturalInsights(place, userProfile),
        personalizedTips: this.generatePersonalizedTips(place, userProfile, currentDateTime),
        photographyRecommendations: this.generatePhotographyTips(place, currentDateTime),
        personalizedFoodRecommendations: this.generatePersonalizedFoodRecommendations(place, userProfile),
        weatherConsiderations: [
          `${currentDateTime.season} season: ${this.getSeasonalAdvice(place, currentDateTime)}`,
          this.getWeatherSpecificAdvice(place, currentDateTime)
        ],
        entryInfo: {
          fee: place.entryFee?.indian || place.entryFee?.amount || 0,
          currency: "INR",
          personalizedTicketAdvice: this.getPersonalizedTicketAdvice(place, userProfile),
          openingHours: this.getRealTimeOpeningHours(place, currentDateTime)
        }
      };

      // Add travel info if not the last place
      if (index < places.length - 1) {
        timelineItem.travel = {
          toNext: places[index + 1].name,
          duration: 45,
          distance: "25km",
          personalizedRoute: this.getPersonalizedRoute(place, places[index + 1], userProfile),
          scenicStops: this.getScenicStops(place, places[index + 1])
        };
      }

      timeline.push(timelineItem);
    });

    return timeline;
  }

  /**
   * Fixed buildEnhancedPrompt method with simpler JSON structure
   */
  buildEnhancedPrompt(places, preferences, routeMetrics, algorithm, currentDateTime, realTimeSchedule, userProfile) {
    const startTime = preferences?.startTime || currentDateTime.time;
    const totalHours = Math.ceil((preferences?.totalTimeAvailable || 480) / 60);
    const budget = preferences?.budget || null;
    const groupSize = preferences?.groupSize || 1;

    // Simplified response structure to avoid JSON parsing issues
    const responseExample = {
      summary: {
        title: "Trip title here",
        description: "Trip description here",
        personalizedHighlights: ["highlight 1", "highlight 2"],
        tripPersonality: "trip personality here"
      },
      timeline: [
        {
          time: "09:00",
          place: { name: "Place name", city: "City" },
          duration: 90,
          activities: ["Activity 1", "Activity 2"],
          personalizedTips: ["Tip 1", "Tip 2"]
        }
      ],
      personalizedRecommendations: {
        forYourInterests: ["Recommendation 1", "Recommendation 2"]
      }
    };

    const prompt = `You are an expert AI travel planner. Create a comprehensive, detailed trip plan for the user's selected places.

REAL-TIME CONTEXT:
• Current Date/Time: ${currentDateTime.formatted} (${currentDateTime.dayOfWeek})
• Season: ${currentDateTime.season}
• Weather: ${currentDateTime.weatherCondition}

USER'S SELECTED PLACES:
${places.map((place, index) => `${index + 1}. ${place.name} (${place.city}) - ${place.category} - Rating: ${place.rating}/5`).join('\n')}

USER PREFERENCES:
• Start Time: ${startTime}
• Duration: ${totalHours} hours
• Budget: ${budget ? '₹' + budget : 'Flexible'}
• Group Size: ${groupSize}

IMPORTANT: Return ONLY valid JSON in this exact format:
${JSON.stringify(responseExample, null, 2)}

Generate a complete trip plan with all timeline items, tips, and recommendations. Ensure all JSON is properly formatted with no trailing commas or syntax errors.`;

    return prompt;
  }

  /**
   * Calculate real-time schedule with actual distances and timing
   */
  async calculateRealTimeSchedule(places, preferences, currentDateTime) {
    const schedule = {
      timeline: [],
      routeCoordinates: [],
      totalDuration: 0,
      totalDistance: 0
    };

    const startTime = preferences?.startTime || currentDateTime.time;
    const startDateTime = this.parseTimeToDateTime(startTime, currentDateTime);
    let currentTime = new Date(startDateTime);

    // Start location
    const tidalPark = {
      id: 'tidal_park_start',
      name: 'Coimbatore Tidal Park',
      type: 'start',
      coordinates: { lat: 11.0638, lng: 77.0596 },
      scheduledTime: this.formatDateTime(currentTime),
      endTime: this.formatDateTime(new Date(currentTime.getTime() + 15 * 60000)),
      duration: 15
    };

    schedule.timeline.push(tidalPark);
    schedule.routeCoordinates.push([11.0638, 77.0596]);
    currentTime = new Date(currentTime.getTime() + 15 * 60000);

    // Process each place with error handling
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      let travelTime = 45; // Default fallback
      let travelDistance = 25; // Default fallback

      try {
        // Try to calculate actual travel time and distance
        const prevLocation = i === 0 ? 
          { latitude: 11.0638, longitude: 77.0596 } : 
          places[i - 1].location;

        if (prevLocation && place.location) {
          const travelData = await distanceCalculator.calculateDrivingDistance(
            { lat: prevLocation.latitude, lng: prevLocation.longitude },
            { lat: place.location.latitude, lng: place.location.longitude }
          );

          travelTime = travelData.duration || 45;
          travelDistance = travelData.distance || 25;
        }
      } catch (error) {
        console.warn(`Error calculating travel for ${place.name}:`, error.message);
        // Use fallback values
      }

      // Add travel time
      currentTime = new Date(currentTime.getTime() + travelTime * 60000);

      const visitDuration = place.averageVisitDuration || 90;
      const arrivalTime = new Date(currentTime);
      const departureTime = new Date(currentTime.getTime() + visitDuration * 60000);

      const scheduleItem = {
        id: place.id,
        name: place.name,
        type: 'destination',
        order: i + 1,
        coordinates: { 
          lat: place.location?.latitude || 11.0168, 
          lng: place.location?.longitude || 76.9558 
        },
        scheduledTime: this.formatDateTime(arrivalTime),
        arrivalTime: this.formatDateTime(arrivalTime),
        departureTime: this.formatDateTime(departureTime),
        duration: visitDuration,
        travelTime,
        travelDistance,
        trafficCondition: this.getTrafficCondition(currentDateTime.dayOfWeek, currentDateTime.hour),
        expectedCrowdLevel: this.getCrowdLevel(place.category, currentDateTime.dayOfWeek, currentDateTime.hour)
      };

      schedule.timeline.push(scheduleItem);
      schedule.routeCoordinates.push([
        place.location?.latitude || 11.0168, 
        place.location?.longitude || 76.9558
      ]);
      schedule.totalDistance += travelDistance;
      
      currentTime = departureTime;
    }

    schedule.totalDuration = Math.round((currentTime - startDateTime) / (1000 * 60));
    return schedule;
  }

  // HELPER METHODS

  getCurrentDateTimeContext() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    
    return {
      timestamp: now.getTime(),
      date: istTime.toISOString().split('T')[0],
      time: istTime.toTimeString().split(' ')[0].substring(0, 5),
      hour: istTime.getHours(),
      dayOfWeek: istTime.toLocaleDateString('en-US', { weekday: 'long' }),
      formatted: istTime.toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }),
      season: this.getCurrentSeason(istTime),
      weatherCondition: this.getWeatherCondition(istTime),
      localEvents: this.getLocalEvents(istTime),
      planningTimeDescription: this.getPlanningTimeDescription(istTime)
    };
  }

  getCurrentSeason(date) {
    const month = date.getMonth() + 1;
    if (month >= 10 || month <= 2) return 'Winter';
    if (month >= 3 && month <= 5) return 'Summer';
    if (month >= 6 && month <= 9) return 'Monsoon';
    return 'Pleasant';
  }

  getWeatherCondition(date) {
    const season = this.getCurrentSeason(date);
    const hour = date.getHours();
    
    if (season === 'Monsoon') return hour < 18 ? 'Partly cloudy with rain chances' : 'Evening showers possible';
    if (season === 'Summer') return hour > 10 && hour < 16 ? 'Hot and sunny' : 'Warm weather';
    return 'Pleasant weather';
  }

  getLocalEvents(date) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    if (dayOfWeek === 'Friday' || dayOfWeek === 'Saturday') return 'Weekend activities, temple festivities';
    if (dayOfWeek === 'Sunday') return 'Weekend temple crowds, family outings';
    return 'Regular weekday activities';
  }

  getPlanningTimeDescription(date) {
    const hour = date.getHours();
    if (hour < 6) return 'Early morning planning - great for sunrise trips';
    if (hour < 12) return 'Morning planning - perfect timing for today\'s trip';
    if (hour < 16) return 'Afternoon planning - consider tomorrow\'s early start';
    if (hour < 20) return 'Evening planning - ideal for next day preparation';
    return 'Night planning - early morning start recommended';
  }

  parseTimeToDateTime(timeStr, currentDateTime) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(currentDateTime.timestamp);
    date.setHours(hours, minutes, 0, 0);
    
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }
    
    return date;
  }

  formatDateTime(date) {
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  getTrafficCondition(dayOfWeek, hour) {
    if (['Saturday', 'Sunday'].includes(dayOfWeek)) return 'Light weekend traffic';
    if (hour >= 8 && hour <= 10) return 'Morning rush hour';
    if (hour >= 17 && hour <= 19) return 'Evening rush hour';
    return 'Normal traffic';
  }

  getCrowdLevel(category, dayOfWeek, hour) {
    if (category === 'temple' && dayOfWeek === 'Sunday') return 'High (Sunday prayers)';
    if (category === 'heritage' && ['Saturday', 'Sunday'].includes(dayOfWeek)) return 'High (weekend tourists)';
    if (hour >= 10 && hour <= 16) return 'Moderate (daytime visitors)';
    return 'Low to moderate';
  }

  // PERSONALIZATION HELPER METHODS

  getPersonalRelevance(place, userProfile) {
    let relevance = 'High - personally selected by you';
    
    if (userProfile?.interests && userProfile.interests.includes(place.category)) {
      relevance = 'Extremely High - matches your interests perfectly';
    }
    
    if (place.rating && place.rating >= 4.5) {
      relevance += ' (Top-rated destination)';
    }
    
    return relevance;
  }

  generatePersonalizedActivities(place, userProfile) {
    const baseActivities = this.getBaseActivities(place);
    const personalizedActivities = [...baseActivities];
    
    if (userProfile?.interests?.includes('photography')) {
      personalizedActivities.push('Dedicated photography session with best angles');
    }
    
    if (userProfile?.interests?.includes('history') && ['temple', 'heritage', 'fort'].includes(place.category)) {
      personalizedActivities.push('Deep dive into historical significance and stories');
    }
    
    if (userProfile?.interests?.includes('spirituality') && place.category === 'temple') {
      personalizedActivities.push('Participate in prayer rituals and meditation');
    }
    
    return personalizedActivities.slice(0, 4);
  }

  getBaseActivities(place) {
    const activities = {
      'temple': ['Explore sacred architecture', 'Learn about religious significance', 'Observe prayer ceremonies'],
      'palace': ['Royal chambers exploration', 'Palace museum visit', 'Garden walkthrough'],
      'heritage': ['Archaeological site tour', 'Historical significance learning', 'Ancient architecture study'],
      'fort': ['Rampart walk with views', 'Defense structure exploration', 'Historical battle stories'],
      'hill-station': ['Scenic viewpoint visits', 'Nature trail walking', 'Fresh air and relaxation'],
      'beach': ['Coastal walk and relaxation', 'Local fishing culture', 'Sunset/sunrise viewing']
    };
    
    return activities[place.category] || ['Sightseeing and exploration', 'Cultural learning', 'Photography'];
  }

  generateCulturalInsights(place, userProfile) {
    const insights = [];
    
    switch (place.category) {
      case 'temple':
        insights.push(`${place.name} represents ancient South Indian temple architecture`);
        insights.push('Sacred site with centuries of continuous worship');
        break;
      case 'heritage':
        insights.push(`UNESCO World Heritage site with unique historical significance`);
        insights.push('Witness to multiple dynasties and cultural periods');
        break;
      case 'palace':
        insights.push(`Former royal residence showcasing architectural grandeur`);
        insights.push('Royal lifestyle and courtly traditions preserved');
        break;
      case 'fort':
        insights.push(`Strategic military fortification with panoramic views`);
        insights.push('Stories of ancient battles and defense strategies');
        break;
      default:
        insights.push(`${place.name} offers unique cultural experiences`);
        insights.push('Rich local traditions and customs');
    }
    
    if (userProfile?.interests?.includes('history')) {
      insights.push('Perfect for history enthusiasts like yourself');
    }
    
    return insights.slice(0, 3);
  }

  generatePersonalizedTips(place, userProfile, currentDateTime) {
    const tips = [];
    
    // Base tips for place category
    if (place.category === 'temple') {
      tips.push('Remove footwear before entering temple premises');
      tips.push('Dress modestly - avoid shorts and sleeveless tops');
    }
    
    // Personalized based on user profile
    if (userProfile?.accessibilityNeeds?.wheelchairAccess) {
      tips.push(this.getAccessibilityTip(place));
    }
    
    if (userProfile?.groupSize > 1) {
      tips.push(`For groups: designate meeting points`);
    }
    
    // Weather-specific tips
    if (currentDateTime.season === 'Summer') {
      tips.push('Carry water and sun protection');
      tips.push('Best visited during cooler hours');
    }
    
    if (currentDateTime.season === 'Monsoon') {
      tips.push('Carry rain gear and wear non-slip footwear');
    }
    
    return tips.slice(0, 4);
  }

  getAccessibilityTip(place) {
    if (place.category === 'temple') return 'Check for ramp access and wheelchair-friendly paths';
    if (place.category === 'fort') return 'Some areas may have steep paths - inquire about accessible routes';
    return 'Contact site management about accessibility facilities';
  }

  generatePhotographyTips(place, currentDateTime) {
    const tips = [];
    
    if (currentDateTime.hour < 10 || currentDateTime.hour > 16) {
      tips.push('Excellent lighting conditions for photography');
    } else {
      tips.push('Harsh midday sun - seek shaded areas for photos');
    }
    
    switch (place.category) {
      case 'temple':
        tips.push('Focus on intricate carvings and architectural details');
        tips.push('Respect photography restrictions in inner sanctum');
        break;
      case 'palace':
        tips.push('Capture royal chambers and ornate decorations');
        tips.push('Garden courtyards provide excellent backdrops');
        break;
      case 'fort':
        tips.push('Panoramic views from ramparts and towers');
        tips.push('Sunset/sunrise shots from elevated positions');
        break;
      default:
        tips.push('Capture unique architectural elements');
        tips.push('Include surrounding landscape in compositions');
    }
    
    return tips.slice(0, 3);
  }

  generatePersonalizedFoodRecommendations(place, userProfile) {
    const recommendations = [];
    const regionalFood = this.getRegionalCuisine(place.state);
    
    if (userProfile?.foodPreferences === 'vegetarian' || !userProfile?.foodPreferences) {
      recommendations.push(...(regionalFood.vegetarian || []));
    }
    
    if (userProfile?.foodPreferences === 'vegan') {
      recommendations.push(...(regionalFood.vegan || []));
    }
    
    if (userProfile?.foodPreferences === 'all' || userProfile?.foodPreferences === 'non-vegetarian') {
      recommendations.push(...(regionalFood.nonVegetarian || []));
    }
    
    recommendations.push(`Local specialty near ${place.name}`);
    
    return recommendations.slice(0, 3);
  }

  getRegionalCuisine(state) {
    const cuisine = {
      'Karnataka': {
        vegetarian: ['Mysore Pak', 'Bisi Bele Bath', 'Masala Dosa'],
        vegan: ['Ragi Mudde', 'Coconut Chutney', 'Vegetable Curry'],
        nonVegetarian: ['Chicken Sukka', 'Fish Curry', 'Mutton Biryani']
      },
      'Tamil Nadu': {
        vegetarian: ['Filter Coffee', 'Idli Sambar', 'Chettinad Vegetable Curry'],
        vegan: ['Coconut Rice', 'Rasam', 'Vegetable Kootu'],
        nonVegetarian: ['Chettinad Chicken', 'Fish Curry', 'Mutton Kuzhambu']
      }
    };
    
    return cuisine[state] || {
      vegetarian: ['South Indian Thali', 'Dosa varieties', 'Traditional sweets'],
      vegan: ['Coconut-based curries', 'Rice preparations', 'Vegetable dishes'],
      nonVegetarian: ['Regional chicken dishes', 'Fish curry', 'Biryani']
    };
  }

  getSeasonalAdvice(place, currentDateTime) {
    const advice = {
      'Summer': 'Visit early morning or late afternoon to avoid heat',
      'Monsoon': 'Carry rain protection and enjoy the lush greenery',
      'Winter': 'Perfect weather for extended exploration',
      'Pleasant': 'Ideal conditions for comfortable sightseeing'
    };
    
    return advice[currentDateTime.season] || 'Weather-appropriate planning recommended';
  }

  getWeatherSpecificAdvice(place, currentDateTime) {
    if (currentDateTime.season === 'Summer' && place.category === 'fort') {
      return 'Hot weather - bring water and sun protection for fort exploration';
    } else if (currentDateTime.season === 'Monsoon') {
      return 'Monsoon season - carry umbrella and wear non-slip footwear';
    }
    
    return 'Current weather is suitable for visiting';
  }

  getPersonalizedTicketAdvice(place, userProfile) {
    const advice = [];
    
    if (place.entryFee?.indian > 0) {
      advice.push(`Entry fee: ₹${place.entryFee.indian} for Indians`);
    } else {
      advice.push('Free entry for all visitors');
    }
    
    if (userProfile?.groupSize > 1) {
      advice.push(`Group booking may be available`);
    }
    
    advice.push('Book online in advance to avoid queues');
    
    return advice.join('; ');
  }

  getRealTimeOpeningHours(place, currentDateTime) {
    const defaultHours = {
      'temple': 'Daily 5:30 AM - 12:00 PM, 4:00 PM - 9:00 PM',
      'heritage': 'Daily 9:00 AM - 6:00 PM',
      'palace': 'Daily 10:00 AM - 5:00 PM',
      'fort': 'Daily sunrise to sunset'
    };
    
    let hours = defaultHours[place.category] || 'Daily 9:00 AM - 6:00 PM';
    
    const currentHour = currentDateTime.hour;
    if (place.category === 'temple') {
      if ((currentHour >= 5 && currentHour < 12) || (currentHour >= 16 && currentHour < 21)) {
        hours += ' (Currently OPEN)';
      } else {
        hours += ' (Currently CLOSED)';
      }
    } else {
      if (currentHour >= 9 && currentHour < 18) {
        hours += ' (Currently OPEN)';
      } else {
        hours += ' (Currently CLOSED)';
      }
    }
    
    return hours;
  }

  buildInterestRecommendations(interests, places) {
    const recommendations = {};
    
    if (interests && Array.isArray(interests)) {
      interests.forEach(interest => {
        recommendations[interest] = this.getRecommendationsForInterest(interest, places);
      });
    } else {
      recommendations.general = ["Explore at your own pace"];
    }
    
    return recommendations;
  }

  getRecommendationsForInterest(interest, places) {
    const interestMap = {
      'history': places.filter(p => ['temple', 'heritage', 'fort'].includes(p.category))
                      .map(p => `Explore the rich history of ${p.name}`),
      'photography': ['Best lighting times for each location', 'Architectural detail focus points'],
      'spirituality': places.filter(p => p.category === 'temple')
                            .map(p => `Spiritual experience at ${p.name}`),
      'nature': places.filter(p => ['hill-station', 'beach'].includes(p.category))
                      .map(p => `Connect with nature at ${p.name}`)
    };
    
    return interestMap[interest] || [`Enjoy ${interest}-related activities`];
  }

  getRecommendationsForTravelStyle(travelStyle, places) {
    const recommendations = {
      'explorer': ['Spend extra time at each location', 'Look for hidden details and stories'],
      'cultural': ['Focus on historical significance', 'Engage with local customs'],
      'relaxed': ['Take your time at each spot', 'Enjoy the peaceful moments'],
      'adventure': ['Explore all accessible areas', 'Try local adventure activities'],
      'photographer': ['Golden hour visits', 'Unique angle discoveries']
    };
    
    return recommendations[travelStyle] || ['Enjoy your selected destinations at your own pace'];
  }

  getRecommendationsForGroupSize(groupSize, places) {
    if (groupSize === 1) {
      return ['Solo travel tips for each destination', 'Connect with other travelers'];
    } else if (groupSize <= 4) {
      return ['Perfect small group activities', 'Coordinate group photos'];
    } else {
      return ['Large group coordination strategies', 'Designate group leaders'];
    }
  }

  getPersonalizedTimingTips(currentDateTime, userProfile) {
    const tips = [];
    
    if (currentDateTime.hour < 8) {
      tips.push('Early start - beat the crowds and heat');
    } else if (currentDateTime.hour > 16) {
      tips.push('Evening start - cooler weather and different atmosphere');
    } else {
      tips.push('Mid-day start - plan for peak sun hours');
    }
    
    return tips.join('; ');
  }

  getBudgetOptimizationTips(budget, places) {
    const tips = [];
    const totalEntryFees = places.reduce((sum, place) => {
      return sum + (place.entryFee?.indian || place.entryFee?.amount || 0);
    }, 0);
    
    tips.push(`Total entry fees: ₹${totalEntryFees}`);
    
    if (budget) {
      const remainingBudget = budget - totalEntryFees;
      tips.push(`Remaining budget for food/transport: ₹${remainingBudget}`);
      
      if (remainingBudget < 1000) {
        tips.push('Budget tip: Pack lunch and use public transport');
      } else if (remainingBudget > 3000) {
        tips.push('Comfortable budget: Enjoy premium experiences');
      }
    }
    
    tips.push('Book accommodation in advance for better rates');
    
    return tips;
  }

  getPersonalizedTransportation(userProfile, places) {
    if (userProfile?.groupSize > 4) {
      return 'Large vehicle or tempo traveler recommended';
    } else if (places.length > 5) {
      return 'Private car with driver for convenience';
    } else if (userProfile?.budget && userProfile.budget < 2000) {
      return 'Public transport and shared cabs';
    }
    return 'Private cab or rental car';
  }

  getTransportAlternatives(userProfile) {
    return [
      'Public buses (most economical)',
      'Shared cabs/auto-rickshaws',
      'Rental two-wheeler',
      'Private car rental'
    ];
  }

  getTransportPersonalizedAdvice(userProfile, groupSize) {
    const advice = [];
    
    if (groupSize === 1) {
      advice.push('Solo travel: Use trusted cab services');
    } else {
      advice.push(`Group of ${groupSize}: Book appropriate vehicle size`);
    }
    
    if (userProfile?.accessibilityNeeds) {
      advice.push('Ensure wheelchair accessible transport if needed');
    }
    
    return advice.join('; ');
  }

  getPersonalizedAccommodation(userProfile, budget) {
    const options = {};
    
    if (!budget || budget < 2000) {
      options.budget = ['Hostels and guesthouses', 'Dharamshalas near temples'];
    }
    if (!budget || budget >= 2000) {
      options.midRange = ['Comfortable hotels', '3-star accommodations'];
    }
    if (budget && budget > 5000) {
      options.luxury = ['Premium hotels', 'Heritage properties'];
    }
    
    if (userProfile?.groupSize > 4) {
      options.family = ['Family rooms', 'Apartment stays'];
    }
    
    return options;
  }

  getBookingStrategy(currentDateTime, userProfile) {
    const strategies = [];
    
    if (['Friday', 'Saturday', 'Sunday'].includes(currentDateTime.dayOfWeek)) {
      strategies.push('Weekend travel: Book accommodations in advance');
    }
    
    if (currentDateTime.season === 'Winter') {
      strategies.push('Peak season: Higher rates expected');
    }
    
    return strategies;
  }

  getPersonalizedPackingList(userProfile, currentDateTime) {
    const items = ['Comfortable walking shoes', 'Water bottle', 'Camera/phone'];
    
    if (currentDateTime.season === 'Summer') items.push('Sun hat', 'Sunscreen', 'Light cotton clothes');
    if (currentDateTime.season === 'Monsoon') items.push('Rain jacket', 'Umbrella', 'Waterproof bag');
    if (currentDateTime.season === 'Winter') items.push('Light jacket', 'Warm layer');
    
    if (userProfile?.interests?.includes('photography')) items.push('Extra batteries', 'Lens cloth');
    if (userProfile?.activityLevel === 'high') items.push('Energy snacks', 'First aid kit');
    
    return items.join(', ');
  }

  getSeasonalPackingItems(currentDateTime) {
    const items = {
      'Summer': ['Sun hat', 'Sunscreen', 'Light cotton clothes', 'Extra water'],
      'Monsoon': ['Rain jacket', 'Umbrella', 'Waterproof bags', 'Quick-dry clothes'],
      'Winter': ['Light jacket', 'Comfortable layers']
    };
    
    return items[currentDateTime.season] || ['Weather-appropriate clothing'];
  }

  getPersonalPackingPreferences(userProfile) {
    const preferences = [];
    
    if (userProfile?.interests?.includes('photography')) {
      preferences.push('Camera equipment and extra batteries');
    }
    
    if (userProfile?.activityLevel === 'high') {
      preferences.push('Energy snacks and first aid kit');
    }
    
    if (userProfile?.accessibilityNeeds) {
      preferences.push('Mobility aids and comfort items');
    }
    
    return preferences;
  }

  getPersonalizedSafetyTips(userProfile, groupSize, places) {
    const tips = [];
    
    if (groupSize === 1) {
      tips.push('Solo travel: Share itinerary with someone');
      tips.push('Keep emergency contacts handy');
    } else {
      tips.push('Group travel: Designate meeting points');
    }
    
    tips.push('Carry copies of important documents');
    
    if (places.some(p => p.category === 'temple')) {
      tips.push('Temple visits: Respect dress codes and customs');
    }
    
    if (places.some(p => ['hill-station', 'fort'].includes(p.category))) {
      tips.push('Hill/fort areas: Wear sturdy footwear');
    }
    
    return tips;
  }

  buildSmartCheckpoints(realTimeSchedule, userProfile) {
    return realTimeSchedule.timeline.map((item, index) => ({
      id: item.id || `checkpoint_${index}`,
      name: item.name,
      type: item.type || 'destination',
      coordinates: {
        lat: item.coordinates?.lat || 11.0638,
        lng: item.coordinates?.lng || 77.0596
      },
      scheduledTime: item.scheduledTime,
      personalizedActions: this.getPersonalizedCheckpointActions(item, userProfile),
      completionTriggers: ["GPS proximity", "Manual check-in", "Photo confirmation"]
    }));
  }

  getPersonalizedCheckpointActions(item, userProfile) {
    const actions = ['Check-in at location', 'Take memorable photos'];
    
    if (userProfile?.interests?.includes('social')) {
      actions.push('Share experience on social media');
    }
    
    if (item.type === 'destination') {
      actions.push('Complete main activity');
      actions.push('Collect personal memory/souvenir');
    }
    
    return actions;
  }

  getPersonalizedChallenges(places, userProfile) {
    const challenges = [];
    
    if (userProfile?.interests?.includes('photography')) {
      challenges.push('Photography challenge: Capture unique angles of each destination');
    }
    
    if (userProfile?.interests?.includes('history')) {
      challenges.push('History hunter: Learn one fascinating story from each location');
    }
    
    challenges.push('Cultural connection: Interact with locals at each destination');
    challenges.push('Taste explorer: Try one local specialty at each stop');
    challenges.push(`Complete journey: Visit all ${places.length} of your chosen destinations`);
    
    return challenges;
  }

  getPersonalizedRoute(fromPlace, toPlace, userProfile) {
    const route = [];
    
    route.push(`Scenic route from ${fromPlace.name} to ${toPlace.name}`);
    
    if (userProfile?.interests?.includes('nature')) {
      route.push('Look for natural scenic stops along the way');
    }
    
    if (userProfile?.interests?.includes('photography')) {
      route.push('Photography opportunities during the journey');
    }
    
    return route.join('; ');
  }

  getScenicStops(fromPlace, toPlace) {
    return [
      'Rural landscapes and traditional villages',
      'Roadside temples and local markets',
      'Scenic viewpoints for quick photo stops'
    ];
  }
}

// Export as singleton instance
module.exports = new DetailedTripController();