// backend/controllers/tripController.js
const Place = require('../models/Place');
const OptimizationAlgorithms = require('../utils/optimizationAlgorithms');
const DistanceCalculator = require('../utils/distanceCalculator');

class TripController {
  constructor() {
    this.optimizationAlgorithms = new OptimizationAlgorithms();
    this.distanceCalculator = new DistanceCalculator();
  }

  // Generate optimized trip with AI-powered recommendations
  generateTrip = async (req, res) => {
    try {
      const {
        preferences = {},
        constraints = {},
        algorithm = 'advanced-greedy',
        startLocation = null,
        enableAutoRerouting = true
      } = req.body;

      const {
        interests = [],
        duration = 480, // 8 hours default
        budget = Infinity,
        accessibility = {},
        groupType = 'family',
        season = 'any'
      } = preferences;

      // Get places based on interests
      let places = [];
      if (interests.length > 0) {
        places = await Place.find({
          category: { $in: interests },
          isActive: { $ne: false }
        }).sort({ rating: -1 });
      } else {
        places = await Place.find({
          isActive: { $ne: false }
        }).sort({ rating: -1 }).limit(20);
      }

      if (places.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No places found matching your criteria'
        });
      }

      // Apply filters based on constraints
      places = this.applyConstraintFilters(places, constraints);

      // Select algorithm based on problem size and preferences
      const selectedAlgorithm = this.selectOptimalAlgorithm(places.length, algorithm);

      const optimizationConstraints = {
        startLocation,
        timeConstraints: { maxDuration: duration },
        budget,
        accessibility,
        strategy: this.getOptimizationStrategy(groupType),
        ...constraints
      };

      // Run optimization
      const optimizationResult = await this.runOptimization(
        places,
        selectedAlgorithm,
        optimizationConstraints
      );

      // Generate detailed itinerary
      const itinerary = await this.generateDetailedItinerary(
        optimizationResult.route,
        optimizationConstraints
      );

      // Calculate additional metrics
      const tripMetrics = await this.calculateTripMetrics(
        optimizationResult.route,
        itinerary
      );

      // Generate rerouting alternatives if enabled
      let reroutingOptions = null;
      if (enableAutoRerouting) {
        reroutingOptions = await this.generateReroutingOptions(
          optimizationResult.route,
          places,
          optimizationConstraints
        );
      }

      res.status(200).json({
        success: true,
        data: {
          tripId: this.generateTripId(),
          optimizedRoute: optimizationResult.route,
          itinerary,
          metrics: {
            ...optimizationResult,
            ...tripMetrics
          },
          algorithm: selectedAlgorithm,
          recommendations: await this.generateRecommendations(optimizationResult.route),
          alternatives: await this.generateAlternatives(places, optimizationResult.route),
          reroutingOptions: reroutingOptions
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

  // NEW: Automatic rerouting endpoint for handling closures and preference changes
  handleAutoRerouting = async (req, res) => {
    try {
      const {
        tripId,
        currentRoute,
        closedPlaces = [],
        newPreferences = {},
        changedConstraints = {},
        reroutingType = 'auto', // 'closure', 'preference', 'constraint', 'auto'
        currentPosition = null
      } = req.body;

      if (!currentRoute || currentRoute.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Current route is required for rerouting'
        });
      }

      // Validate closed places and remove them from route
      const activeRoute = currentRoute.filter(place => 
        !closedPlaces.includes(place.id)
      );

      // If too many places are closed, find alternatives
      let replacementPlaces = [];
      if (closedPlaces.length > 0) {
        replacementPlaces = await this.findReplacementPlaces(
          closedPlaces,
          currentRoute,
          newPreferences,
          changedConstraints
        );
      }

      // Generate rerouting options based on type
      const reroutingResult = await this.executeRerouting({
        activeRoute,
        replacementPlaces,
        reroutingType,
        newPreferences,
        changedConstraints,
        currentPosition,
        originalRoute: currentRoute
      });

      // Calculate impact of rerouting
      const reroutingImpact = await this.calculateReroutingImpact(
        currentRoute,
        reroutingResult.newRoute
      );

      res.status(200).json({
        success: true,
        data: {
          tripId,
          reroutingType,
          originalRoute: currentRoute,
          newRoute: reroutingResult.newRoute,
          replacedPlaces: closedPlaces,
          addedPlaces: replacementPlaces,
          impact: reroutingImpact,
          alternatives: reroutingResult.alternatives,
          confidence: reroutingResult.confidence,
          recommendations: await this.generateReroutingRecommendations(reroutingResult)
        }
      });

    } catch (error) {
      console.error('Auto rerouting error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during automatic rerouting',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // NEW: Check route validity and suggest preemptive rerouting
  validateRouteStatus = async (req, res) => {
    try {
      const { tripId, route } = req.body;

      const validationResults = await Promise.all(
        route.map(async (place) => {
          const placeStatus = await this.checkPlaceStatus(place.id);
          return {
            placeId: place.id,
            name: place.name,
            ...placeStatus
          };
        })
      );

      const closedPlaces = validationResults.filter(result => 
        !result.isOpen || result.hasIssues
      );

      const needsRerouting = closedPlaces.length > 0;

      let reroutingSuggestions = null;
      if (needsRerouting) {
        reroutingSuggestions = await this.generatePreemptiveRerouting(
          route,
          closedPlaces
        );
      }

      res.status(200).json({
        success: true,
        data: {
          tripId,
          isValid: !needsRerouting,
          validationResults,
          closedPlaces: closedPlaces.map(p => ({ id: p.placeId, name: p.name, reason: p.reason })),
          needsRerouting,
          reroutingSuggestions
        }
      });

    } catch (error) {
      console.error('Route validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error validating route status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // NEW: Dynamic preference adjustment during trip
  adjustTripPreferences = async (req, res) => {
    try {
      const {
        tripId,
        currentRoute,
        currentPosition,
        newPreferences,
        keepVisitedPlaces = true,
        maxRouteChanges = 3
      } = req.body;

      // Determine which places have been visited
      const visitedPlaces = keepVisitedPlaces 
        ? await this.determineVisitedPlaces(currentRoute, currentPosition)
        : [];

      const remainingRoute = currentRoute.filter(place => 
        !visitedPlaces.includes(place.id)
      );

      // Find new places based on updated preferences
      const newCandidates = await this.findPlacesForNewPreferences(
        newPreferences,
        remainingRoute,
        currentPosition
      );

      // Optimize the adjusted route
      const adjustedRoute = await this.optimizeAdjustedRoute({
        visitedPlaces: currentRoute.filter(p => visitedPlaces.includes(p.id)),
        remainingRoute,
        newCandidates,
        maxRouteChanges,
        currentPosition,
        preferences: newPreferences
      });

      const adjustmentImpact = await this.calculateAdjustmentImpact(
        currentRoute,
        adjustedRoute.fullRoute
      );

      res.status(200).json({
        success: true,
        data: {
          tripId,
          originalRoute: currentRoute,
          adjustedRoute: adjustedRoute.fullRoute,
          visitedPlaces,
          changedPlaces: adjustedRoute.changes,
          newPlaces: adjustedRoute.additions,
          removedPlaces: adjustedRoute.removals,
          impact: adjustmentImpact,
          confidence: adjustedRoute.confidence
        }
      });

    } catch (error) {
      console.error('Preference adjustment error:', error);
      res.status(500).json({
        success: false,
        message: 'Error adjusting trip preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Optimize existing trip
  optimizeTrip = async (req, res) => {
    try {
      const {
        places,
        constraints = {},
        algorithm = 'genetic',
        currentRoute = []
      } = req.body;

      if (!places || places.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 places are required for optimization'
        });
      }

      // Validate places exist in database
      const validPlaces = await Place.find({
        id: { $in: places.map(p => p.id || p) }
      });

      if (validPlaces.length !== places.length) {
        return res.status(400).json({
          success: false,
          message: 'Some places were not found in the database'
        });
      }

      const selectedAlgorithm = this.selectOptimalAlgorithm(validPlaces.length, algorithm);

      const optimizationResult = await this.runOptimization(
        validPlaces,
        selectedAlgorithm,
        constraints
      );

      // Calculate improvement metrics
      const improvement = currentRoute.length > 0 ? 
        await this.calculateImprovement(currentRoute, optimizationResult.route) : null;

      res.status(200).json({
        success: true,
        data: {
          optimizedRoute: optimizationResult.route,
          metrics: optimizationResult,
          algorithm: selectedAlgorithm,
          improvement,
          executionTime: Date.now() - req.startTime
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

  // Get AI-powered trip suggestions
  getTripSuggestions = async (req, res) => {
    try {
      const {
        currentLocation,
        interests = [],
        duration = 480,
        budget = 'moderate',
        groupSize = 2,
        accessibility = {}
      } = req.query;

      // Get suggested places based on criteria
      const suggestions = await this.generateTripSuggestions({
        currentLocation: currentLocation ? JSON.parse(currentLocation) : null,
        interests: Array.isArray(interests) ? interests : [interests],
        duration: parseInt(duration),
        budget,
        groupSize: parseInt(groupSize),
        accessibility: typeof accessibility === 'string' ? JSON.parse(accessibility) : accessibility
      });

      res.status(200).json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      console.error('Trip suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Error generating trip suggestions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // Calculate travel matrix between places
  calculateTravelMatrix = async (req, res) => {
    try {
      const { placeIds } = req.body;

      if (!placeIds || placeIds.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 places are required for travel matrix'
        });
      }

      const places = await Place.find({
        id: { $in: placeIds }
      });

      if (places.length !== placeIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some places were not found'
        });
      }

      const locations = places.map(place => place.location);
      const travelMatrix = await this.distanceCalculator.calculateDistanceMatrix(
        locations,
        locations
      );

      // Enhance matrix with place information
      const enhancedMatrix = places.map((fromPlace, i) => ({
        from: {
          id: fromPlace.id,
          name: fromPlace.name,
          location: fromPlace.location
        },
        destinations: places.map((toPlace, j) => ({
          to: {
            id: toPlace.id,
            name: toPlace.name,
            location: toPlace.location
          },
          distance: travelMatrix.distances[i][j],
          duration: travelMatrix.durations[i][j],
          travelMode: 'driving'
        }))
      }));

      res.status(200).json({
        success: true,
        data: {
          matrix: enhancedMatrix,
          summary: {
            totalPlaces: places.length,
            avgDistance: this.calculateAverageDistance(travelMatrix.distances),
            maxDistance: this.getMaxDistance(travelMatrix.distances),
            minDistance: this.getMinDistance(travelMatrix.distances)
          }
        }
      });

    } catch (error) {
      console.error('Travel matrix calculation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating travel matrix',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  };

  // NEW: Advanced Rerouting Methods

  async generateReroutingOptions(route, allPlaces, constraints) {
    const alternatives = [];
    
    // Generate different rerouting scenarios
    for (let i = 0; i < route.length; i++) {
      const placeToReplace = route[i];
      const similarPlaces = await this.findSimilarPlaces([placeToReplace], allPlaces, 3);
      
      if (similarPlaces.length > 0) {
        for (const replacement of similarPlaces) {
          const newRoute = [...route];
          newRoute[i] = replacement;
          
          const routeMetrics = await this.calculateRouteMetrics(newRoute);
          alternatives.push({
            type: 'single-replacement',
            originalPlace: { id: placeToReplace.id, name: placeToReplace.name },
            replacementPlace: { id: replacement.id, name: replacement.name },
            position: i,
            route: newRoute,
            metrics: routeMetrics,
            impact: await this.calculateReplacementImpact(placeToReplace, replacement)
          });
        }
      }
    }

    // Sort by impact and return top alternatives
    return alternatives
      .sort((a, b) => b.impact.score - a.impact.score)
      .slice(0, 5);
  }

  async findReplacementPlaces(closedPlaceIds, originalRoute, newPreferences, constraints) {
    const replacements = [];
    
    for (const closedId of closedPlaceIds) {
      const originalPlace = originalRoute.find(p => p.id === closedId);
      if (!originalPlace) continue;

      // Find similar places based on category, rating, and location
      const candidates = await Place.find({
        id: { $ne: closedId },
        category: originalPlace.category,
        rating: { $gte: originalPlace.rating - 0.5 },
        isActive: { $ne: false },
        $or: [
          { state: originalPlace.state },
          {
            'location.latitude': {
              $gte: originalPlace.location.latitude - 1.0,
              $lte: originalPlace.location.latitude + 1.0
            },
            'location.longitude': {
              $gte: originalPlace.location.longitude - 1.0,
              $lte: originalPlace.location.longitude + 1.0
            }
          }
        ]
      }).sort({ rating: -1 }).limit(5);

      // Apply preference filters if provided
      const filteredCandidates = newPreferences.interests 
        ? candidates.filter(place => newPreferences.interests.includes(place.category))
        : candidates;

      if (filteredCandidates.length > 0) {
        replacements.push({
          originalPlace: originalPlace,
          replacementOptions: filteredCandidates,
          bestReplacement: filteredCandidates[0],
          replacementScore: await this.calculateReplacementScore(originalPlace, filteredCandidates[0])
        });
      }
    }

    return replacements;
  }

  async executeRerouting({ activeRoute, replacementPlaces, reroutingType, newPreferences, changedConstraints, currentPosition, originalRoute }) {
    let newRoute = [...activeRoute];
    const alternatives = [];
    let confidence = 0.8;

    switch (reroutingType) {
      case 'closure':
        // Handle place closures
        for (const replacement of replacementPlaces) {
          const originalIndex = originalRoute.findIndex(p => p.id === replacement.originalPlace.id);
          if (originalIndex !== -1 && originalIndex < newRoute.length) {
            newRoute.splice(originalIndex, 0, replacement.bestReplacement);
          } else {
            newRoute.push(replacement.bestReplacement);
          }
        }
        confidence = replacementPlaces.length > 0 ? 0.7 : 0.9;
        break;

      case 'preference':
        // Handle preference changes
        const newPlaces = await this.findPlacesForNewPreferences(newPreferences, newRoute, currentPosition);
        newRoute = await this.integrateNewPreferences(newRoute, newPlaces, newPreferences);
        confidence = 0.75;
        break;

      case 'constraint':
        // Handle constraint changes
        newRoute = this.applyConstraintFilters(newRoute, changedConstraints);
        if (newRoute.length < originalRoute.length) {
          const additionalPlaces = await this.findAdditionalPlaces(newRoute, changedConstraints);
          newRoute = [...newRoute, ...additionalPlaces];
        }
        confidence = 0.8;
        break;

      case 'auto':
      default:
        // Intelligent automatic rerouting
        if (replacementPlaces.length > 0) {
          newRoute = await this.executeRerouting({
            activeRoute, replacementPlaces, reroutingType: 'closure', 
            newPreferences, changedConstraints, currentPosition, originalRoute
          }).then(result => result.newRoute);
        }
        
        if (Object.keys(newPreferences).length > 0) {
          newRoute = await this.executeRerouting({
            activeRoute: newRoute, replacementPlaces: [], reroutingType: 'preference',
            newPreferences, changedConstraints, currentPosition, originalRoute
          }).then(result => result.newRoute);
        }
        
        confidence = 0.85;
        break;
    }

    // Optimize the new route
    const optimizedRoute = await this.optimizationAlgorithms.advancedGreedyOptimization(
      newRoute, 
      { startLocation: currentPosition, ...changedConstraints }
    );

    // Generate alternative routes
    for (let i = 0; i < 3; i++) {
      const alternative = await this.generateAlternativeRoute(newRoute, originalRoute, i);
      if (alternative) alternatives.push(alternative);
    }

    return {
      newRoute: optimizedRoute.route,
      alternatives,
      confidence,
      optimizationMetrics: optimizedRoute
    };
  }

  async checkPlaceStatus(placeId) {
    try {
      const place = await Place.findOne({ id: placeId });
      if (!place) {
        return { isOpen: false, reason: 'Place not found', hasIssues: true };
      }

      // Simulate real-time status check (in production, this would call external APIs)
      const currentHour = new Date().getHours();
      const isBusinessHours = currentHour >= 9 && currentHour <= 18;
      
      return {
        isOpen: place.isActive !== false && isBusinessHours,
        reason: !place.isActive ? 'Permanently closed' : !isBusinessHours ? 'Currently closed' : null,
        hasIssues: place.isActive === false,
        lastUpdated: new Date(),
        openingHours: place.openingHours || '9:00 AM - 6:00 PM'
      };
    } catch (error) {
      return { isOpen: false, reason: 'Status check failed', hasIssues: true };
    }
  }

  async generatePreemptiveRerouting(route, closedPlaces) {
    const suggestions = [];

    for (const closedPlace of closedPlaces) {
      const alternatives = await this.findSimilarPlaces(
        [{ id: closedPlace.placeId }], 
        await Place.find({ isActive: { $ne: false } }), 
        3
      );

      suggestions.push({
        closedPlace: closedPlace,
        alternatives: alternatives,
        urgency: this.calculateReroutingUrgency(closedPlace),
        autoApply: closedPlace.reason === 'Permanently closed'
      });
    }

    return suggestions.sort((a, b) => b.urgency - a.urgency);
  }

  async determineVisitedPlaces(route, currentPosition) {
    if (!currentPosition) return [];

    const visitedPlaces = [];
    
    for (const place of route) {
      const distance = await this.distanceCalculator.calculateDistance(
        currentPosition,
        place.location
      );
      
      // If very close to a place or passed it, consider it visited
      if (distance < 1) { // Less than 1km
        visitedPlaces.push(place.id);
      }
    }

    return visitedPlaces;
  }

  async findPlacesForNewPreferences(newPreferences, currentRoute, currentPosition) {
    const currentCategories = [...new Set(currentRoute.map(p => p.category))];
    const newInterests = newPreferences.interests || [];
    
    // Find places that match new interests but aren't in current categories
    const newCategories = newInterests.filter(interest => !currentCategories.includes(interest));
    
    if (newCategories.length === 0) return [];

    let query = {
      category: { $in: newCategories },
      isActive: { $ne: false }
    };

    // Add location proximity if current position is available
    if (currentPosition) {
      query = {
        ...query,
        'location.latitude': {
          $gte: currentPosition.latitude - 2.0,
          $lte: currentPosition.latitude + 2.0
        },
        'location.longitude': {
          $gte: currentPosition.longitude - 2.0,
          $lte: currentPosition.longitude + 2.0
        }
      };
    }

    const newPlaces = await Place.find(query)
      .sort({ rating: -1 })
      .limit(10);

    return newPlaces;
  }

  async optimizeAdjustedRoute({ visitedPlaces, remainingRoute, newCandidates, maxRouteChanges, currentPosition, preferences }) {
    const allCandidates = [...remainingRoute, ...newCandidates];
    
    // Score each place based on new preferences
    const scoredCandidates = await Promise.all(
      allCandidates.map(async (place) => ({
        ...place,
        score: await this.calculatePlaceScore(place, preferences, currentPosition)
      }))
    );

    // Select best places within the change limit
    const sortedCandidates = scoredCandidates.sort((a, b) => b.score - a.score);
    const selectedPlaces = sortedCandidates.slice(0, remainingRoute.length + Math.min(maxRouteChanges, newCandidates.length));

    // Optimize the route
    const optimizedResult = await this.optimizationAlgorithms.advancedGreedyOptimization(
      selectedPlaces,
      { startLocation: currentPosition, ...preferences }
    );

    const fullRoute = [...visitedPlaces, ...optimizedResult.route];

    return {
      fullRoute,
      changes: this.identifyRouteChanges(remainingRoute, optimizedResult.route),
      additions: selectedPlaces.filter(p => !remainingRoute.some(r => r.id === p.id)),
      removals: remainingRoute.filter(p => !selectedPlaces.some(s => s.id === p.id)),
      confidence: 0.8
    };
  }

  // Helper Methods (continued from original)
  applyConstraintFilters(places, constraints) {
    return places.filter(place => {
      // Accessibility filters
      if (constraints.accessibility?.wheelchairAccess && !place.wheelchairAccessible) {
        return false;
      }

      if (constraints.accessibility?.kidFriendly && !place.kidFriendly) {
        return false;
      }

      // Budget filters
      if (constraints.budget && typeof constraints.budget === 'number') {
        const entryCost = place.entryFee?.indian || 0;
        if (entryCost > constraints.budget * 0.3) { // Max 30% of budget per place
          return false;
        }
      }

      // Time filters
      if (constraints.timeConstraints?.minDuration && 
          place.averageVisitDuration < constraints.timeConstraints.minDuration) {
        return false;
      }

      return true;
    });
  }

  selectOptimalAlgorithm(placeCount, preferredAlgorithm) {
    // Algorithm selection logic based on problem complexity
    if (placeCount <= 3) return 'advanced-greedy';
    if (placeCount <= 8 && preferredAlgorithm === 'optimal') return 'dynamicProgramming';
    if (placeCount <= 12) return 'genetic';
    if (placeCount <= 20) return 'simulatedAnnealing';
    return 'antColony';
  }

  getOptimizationStrategy(groupType) {
    const strategies = {
      family: 'comfort',
      solo: 'efficiency',
      couple: 'scenic',
      group: 'balanced',
      business: 'fast'
    };
    return strategies[groupType] || 'balanced';
  }

  async runOptimization(places, algorithm, constraints) {
    const algorithms = {
      'advanced-greedy': this.optimizationAlgorithms.advancedGreedyOptimization,
      'genetic': this.optimizationAlgorithms.geneticAlgorithmOptimization,
      'dynamicProgramming': this.optimizationAlgorithms.dynamicProgrammingTSP,
      'simulatedAnnealing': this.optimizationAlgorithms.simulatedAnnealingOptimization,
      'antColony': this.optimizationAlgorithms.antColonyOptimization,
      'multiObjective': this.optimizationAlgorithms.multiObjectiveOptimization
    };

    const optimizationFunction = algorithms[algorithm] || algorithms['advanced-greedy'];
    return await optimizationFunction.call(this.optimizationAlgorithms, places, constraints);
  }

  // NEW: Additional helper methods for rerouting

  async calculateReroutingImpact(originalRoute, newRoute) {
    const originalMetrics = await this.calculateRouteMetrics(originalRoute);
    const newMetrics = await this.calculateRouteMetrics(newRoute);

    return {
      routeChanges: {
        placesRemoved: originalRoute.filter(p => !newRoute.some(n => n.id === p.id)).length,
        placesAdded: newRoute.filter(p => !originalRoute.some(o => o.id === p.id)).length,
        placesReordered: this.countReorderedPlaces(originalRoute, newRoute)
      },
      metrics: {
        distanceChange: newMetrics.totalDistance - originalMetrics.totalDistance,
        timeChange: newMetrics.totalTime - originalMetrics.totalTime,
        costChange: this.calculateCostChange(originalRoute, newRoute),
        ratingChange: this.calculateRatingChange(originalRoute, newRoute)
      },
      severity: this.calculateReroutingSeverity(originalRoute, newRoute)
    };
  }

  async calculateAdjustmentImpact(originalRoute, adjustedRoute) {
    return this.calculateReroutingImpact(originalRoute, adjustedRoute);
  }

  async calculateReplacementImpact(originalPlace, replacementPlace) {
    const distanceFromOriginal = await this.distanceCalculator.calculateDistance(
      originalPlace.location,
      replacementPlace.location
    );

    return {
      score: this.calculateReplacementScore(originalPlace, replacementPlace),
      ratingDifference: (replacementPlace.rating || 0) - (originalPlace.rating || 0),
      categoryMatch: originalPlace.category === replacementPlace.category,
      locationDistance: distanceFromOriginal,
      costDifference: (replacementPlace.entryFee?.indian || 0) - (originalPlace.entryFee?.indian || 0),
      timeDifference: (replacementPlace.averageVisitDuration || 0) - (originalPlace.averageVisitDuration || 0)
    };
  }

  calculateReplacementScore(originalPlace, replacementPlace) {
    let score = 0;

    // Category match bonus
    if (originalPlace.category === replacementPlace.category) score += 40;
    
    // Rating comparison
    const ratingDiff = (replacementPlace.rating || 0) - (originalPlace.rating || 0);
    score += Math.max(-20, Math.min(20, ratingDiff * 10));
    
    // Location proximity (closer is better)
    // This would need actual distance calculation in production
    score += 20; // Placeholder
    
    // Cost comparison (similar cost is better)
    const costDiff = Math.abs((replacementPlace.entryFee?.indian || 0) - (originalPlace.entryFee?.indian || 0));
    score += Math.max(0, 20 - costDiff / 10);
    
    // Time compatibility
    const timeDiff = Math.abs((replacementPlace.averageVisitDuration || 0) - (originalPlace.averageVisitDuration || 0));
    score += Math.max(0, 20 - timeDiff / 10);

    return Math.max(0, Math.min(100, score));
  }

  calculateReroutingUrgency(closedPlace) {
    let urgency = 50; // Base urgency
    
    if (closedPlace.reason === 'Permanently closed') urgency += 40;
    if (closedPlace.reason === 'Currently closed') urgency += 20;
    if (closedPlace.hasIssues) urgency += 30;
    
    return Math.min(100, urgency);
  }

  async calculatePlaceScore(place, preferences, currentPosition) {
    let score = place.rating || 0;
    
    // Interest match bonus
    if (preferences.interests?.includes(place.category)) {
      score += 2;
    }
    
    // Accessibility bonus
    if (preferences.accessibility?.wheelchairAccess && place.wheelchairAccessible) {
      score += 1;
    }
    if (preferences.accessibility?.kidFriendly && place.kidFriendly) {
      score += 1;
    }
    
    // Budget consideration
    if (preferences.budget && typeof preferences.budget === 'number') {
      const cost = place.entryFee?.indian || 0;
      if (cost <= preferences.budget * 0.2) score += 0.5;
    }
    
    // Proximity bonus if current position is available
    if (currentPosition) {
      const distance = await this.distanceCalculator.calculateDistance(
        currentPosition,
        place.location
      );
      score += Math.max(0, 2 - distance / 50); // Bonus for closer places
    }
    
    return score;
  }

  identifyRouteChanges(originalRoute, newRoute) {
    const changes = [];
    
    // Find additions
    newRoute.forEach((place, index) => {
      if (!originalRoute.some(p => p.id === place.id)) {
        changes.push({
          type: 'addition',
          place: place,
          position: index
        });
      }
    });
    
    // Find removals
    originalRoute.forEach((place, index) => {
      if (!newRoute.some(p => p.id === place.id)) {
        changes.push({
          type: 'removal',
          place: place,
          originalPosition: index
        });
      }
    });
    
    // Find reorders
    const commonPlaces = originalRoute.filter(p => newRoute.some(n => n.id === p.id));
    commonPlaces.forEach(place => {
      const originalIndex = originalRoute.findIndex(p => p.id === place.id);
      const newIndex = newRoute.findIndex(p => p.id === place.id);
      
      if (originalIndex !== newIndex) {
        changes.push({
          type: 'reorder',
          place: place,
          from: originalIndex,
          to: newIndex
        });
      }
    });
    
    return changes;
  }

  countReorderedPlaces(originalRoute, newRoute) {
    let reorderedCount = 0;
    
    originalRoute.forEach((place, index) => {
      const newIndex = newRoute.findIndex(p => p.id === place.id);
      if (newIndex !== -1 && newIndex !== index) {
        reorderedCount++;
      }
    });
    
    return reorderedCount;
  }

  calculateCostChange(originalRoute, newRoute) {
    const originalCost = originalRoute.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
    const newCost = newRoute.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
    return newCost - originalCost;
  }

  calculateRatingChange(originalRoute, newRoute) {
    const originalRating = originalRoute.reduce((sum, place) => sum + (place.rating || 0), 0) / originalRoute.length;
    const newRating = newRoute.reduce((sum, place) => sum + (place.rating || 0), 0) / newRoute.length;
    return newRating - originalRating;
  }

  calculateReroutingSeverity(originalRoute, newRoute) {
    const placesChanged = originalRoute.filter(p => !newRoute.some(n => n.id === p.id)).length;
    const changePercentage = (placesChanged / originalRoute.length) * 100;
    
    if (changePercentage <= 20) return 'low';
    if (changePercentage <= 50) return 'medium';
    return 'high';
  }

  async generateAlternativeRoute(baseRoute, originalRoute, variation) {
    // Create variations by swapping/replacing places
    const alternative = [...baseRoute];
    
    if (variation === 0 && alternative.length > 2) {
      // Swap two random places
      const idx1 = Math.floor(Math.random() * alternative.length);
      const idx2 = Math.floor(Math.random() * alternative.length);
      [alternative[idx1], alternative[idx2]] = [alternative[idx2], alternative[idx1]];
    } else if (variation === 1 && alternative.length > 0) {
      // Replace one place with a similar alternative
      const replaceIndex = Math.floor(Math.random() * alternative.length);
      const placeToReplace = alternative[replaceIndex];
      const alternatives = await this.findSimilarPlaces([placeToReplace], [], 1);
      if (alternatives.length > 0) {
        alternative[replaceIndex] = alternatives[0];
      }
    } else if (variation === 2) {
      // Reverse a portion of the route
      if (alternative.length > 2) {
        const start = Math.floor(Math.random() * (alternative.length - 1));
        const end = start + Math.floor(Math.random() * (alternative.length - start - 1)) + 1;
        const reversed = alternative.slice(start, end + 1).reverse();
        alternative.splice(start, end - start + 1, ...reversed);
      }
    }
    
    const metrics = await this.calculateRouteMetrics(alternative);
    
    return {
      route: alternative,
      variation: variation,
      metrics: metrics,
      description: this.getAlternativeDescription(variation)
    };
  }

  getAlternativeDescription(variation) {
    const descriptions = [
      'Optimized for reduced travel time',
      'Alternative places with similar experiences',
      'Reordered for better flow'
    ];
    return descriptions[variation] || 'Alternative route option';
  }

  async generateReroutingRecommendations(reroutingResult) {
    const recommendations = [];
    
    // Analyze the rerouting result and provide specific recommendations
    if (reroutingResult.confidence < 0.7) {
      recommendations.push({
        type: 'warning',
        message: 'Route changes have moderate confidence. Consider reviewing alternatives.',
        action: 'review_alternatives'
      });
    }
    
    if (reroutingResult.newRoute.length < 3) {
      recommendations.push({
        type: 'suggestion',
        message: 'Route has few places. Consider adding more destinations.',
        action: 'add_places'
      });
    }
    
    const totalDistance = await this.calculateTotalDistance(reroutingResult.newRoute);
    if (totalDistance > 300) { // 300km
      recommendations.push({
        type: 'tip',
        message: 'Route covers long distances. Plan for sufficient travel time.',
        action: 'adjust_timing'
      });
    }
    
    recommendations.push({
      type: 'info',
      message: 'New route has been optimized. Check timings and make reservations if needed.',
      action: 'confirm_bookings'
    });
    
    return recommendations;
  }

  async integrateNewPreferences(currentRoute, newPlaces, preferences) {
    // Combine current route with new places based on preferences
    const combinedPlaces = [...currentRoute, ...newPlaces];
    
    // Score and select best places
    const scoredPlaces = await Promise.all(
      combinedPlaces.map(async place => ({
        ...place,
        score: await this.calculatePlaceScore(place, preferences)
      }))
    );
    
    // Select top places (maintain reasonable route length)
    const maxPlaces = Math.min(10, Math.max(currentRoute.length, currentRoute.length + 2));
    const selectedPlaces = scoredPlaces
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPlaces);
    
    return selectedPlaces;
  }

  async findAdditionalPlaces(currentRoute, constraints) {
    const currentCategories = [...new Set(currentRoute.map(p => p.category))];
    const currentStates = [...new Set(currentRoute.map(p => p.state))];
    
    // Find places in same regions with different categories
    const additionalPlaces = await Place.find({
      $and: [
        { id: { $nin: currentRoute.map(p => p.id) } },
        {
          $or: [
            { state: { $in: currentStates } },
            { category: { $nin: currentCategories } }
          ]
        },
        { isActive: { $ne: false } }
      ]
    }).sort({ rating: -1 }).limit(5);
    
    return this.applyConstraintFilters(additionalPlaces, constraints);
  }

  async calculateTotalDistance(route) {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const distance = await this.distanceCalculator.calculateDistance(
        route[i].location,
        route[i + 1].location
      );
      totalDistance += distance;
    }
    
    return totalDistance;
  }

  // Continue with existing methods...
  async generateDetailedItinerary(route, constraints) {
    const startTime = constraints.startTime || '09:00';
    const itinerary = [];
    let currentTime = this.parseTime(startTime);
    let currentLocation = constraints.startLocation;

    for (let i = 0; i < route.length; i++) {
      const place = route[i];
      const isFirst = i === 0;
      const isLast = i === route.length - 1;

      let travelTime = 0;
      let travelDistance = 0;

      // Calculate travel time to this place
      if (currentLocation) {
        const travelInfo = await this.distanceCalculator.calculateDrivingDistance(
          currentLocation,
          place.location
        );
        travelTime = travelInfo.duration;
        travelDistance = travelInfo.distance;
      }

      // Add travel time to current time
      currentTime += travelTime;

      const itineraryItem = {
        order: i + 1,
        place: {
          id: place.id,
          name: place.name,
          category: place.category,
          location: place.location,
          description: place.description,
          entryFee: place.entryFee,
          amenities: place.amenities,
          tags: place.tags
        },
        timing: {
          arrivalTime: this.formatTime(currentTime),
          departureTime: this.formatTime(currentTime + place.averageVisitDuration),
          visitDuration: place.averageVisitDuration,
          bestTimeToVisit: place.bestTimeToVisit
        },
        travel: isFirst ? null : {
          from: currentLocation,
          distance: travelDistance,
          duration: travelTime,
          mode: 'driving'
        },
        recommendations: {
          tips: await this.getPlaceTips(place),
          nearby: await this.getNearbyAttractions(place),
          dining: await this.getNearbyDining(place)
        }
      };

      itinerary.push(itineraryItem);

      // Update current time and location
      currentTime += place.averageVisitDuration;
      currentLocation = place.location;
    }

    return itinerary;
  }

  async calculateTripMetrics(route, itinerary) {
    const totalPlaces = route.length;
    const totalVisitTime = route.reduce((sum, place) => sum + place.averageVisitDuration, 0);
    const totalTravelTime = itinerary.reduce((sum, item) => sum + (item.travel?.duration || 0), 0);
    const totalDistance = itinerary.reduce((sum, item) => sum + (item.travel?.distance || 0), 0);
    const totalCost = route.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
    const averageRating = route.reduce((sum, place) => sum + (place.rating || 0), 0) / totalPlaces;

    const categories = [...new Set(route.map(place => place.category))];
    const states = [...new Set(route.map(place => place.state))];

    return {
      summary: {
        totalPlaces,
        totalTime: totalVisitTime + totalTravelTime,
        totalVisitTime,
        totalTravelTime,
        totalDistance,
        totalCost,
        averageRating,
        categories: categories.length,
        states: states.length
      },
      breakdown: {
        byCategory: this.groupByCategory(route),
        byState: this.groupByState(route),
        timeDistribution: {
          visiting: totalVisitTime,
          traveling: totalTravelTime,
          efficiency: totalVisitTime / (totalVisitTime + totalTravelTime)
        }
      }
    };
  }

  async generateRecommendations(route) {
    return {
      packingList: this.generatePackingList(route),
      weatherTips: await this.getWeatherTips(route),
      culturalTips: this.getCulturalTips(route),
      budgetTips: this.getBudgetTips(route),
      safetyTips: this.getSafetyTips(route)
    };
  }

  async generateAlternatives(allPlaces, selectedRoute) {
    const selectedIds = selectedRoute.map(p => p.id);
    const alternativePlaces = allPlaces.filter(p => !selectedIds.includes(p.id));
    
    return {
      similarPlaces: this.findSimilarPlaces(selectedRoute, alternativePlaces),
      nearbyAlternatives: await this.findNearbyAlternatives(selectedRoute, alternativePlaces),
      categoryAlternatives: this.findCategoryAlternatives(selectedRoute, alternativePlaces)
    };
  }

  generateTripId() {
    return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for time handling
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Additional helper methods
  groupByCategory(places) {
    return places.reduce((acc, place) => {
      acc[place.category] = (acc[place.category] || 0) + 1;
      return acc;
    }, {});
  }

  groupByState(places) {
    return places.reduce((acc, place) => {
      acc[place.state] = (acc[place.state] || 0) + 1;
      return acc;
    }, {});
  }

  generatePackingList(route) {
    const items = new Set(['Camera', 'Water bottle', 'Sunscreen', 'Comfortable shoes']);
    
    route.forEach(place => {
      if (place.category === 'hill-station') {
        items.add('Warm clothing');
        items.add('Light jacket');
      }
      if (place.category === 'beach') {
        items.add('Swimwear');
        items.add('Beach towel');
      }
      if (place.category === 'temple') {
        items.add('Modest clothing');
        items.add('Socks for temple visits');
      }
    });

    return Array.from(items);
  }

  getCulturalTips(route) {
    const tips = [];
    const hasTemples = route.some(p => p.category === 'temple');
    const hasHeritage = route.some(p => p.category === 'heritage');

    if (hasTemples) {
      tips.push('Dress modestly when visiting temples');
      tips.push('Remove shoes before entering temple premises');
    }
    if (hasHeritage) {
      tips.push('Respect historical sites and follow photography rules');
    }

    tips.push('Learn basic local greetings');
    tips.push('Try local cuisine at each destination');
    
    return tips;
  }

  getBudgetTips(route) {
    const totalCost = route.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0);
    
    return [
      `Total entry fees: ₹${totalCost}`,
      'Book accommodations in advance for better rates',
      'Use local transport for cost-effective travel',
      'Try street food for authentic and affordable meals',
      'Negotiate prices at local markets'
    ];
  }

  getSafetyTips(route) {
    return [
      'Keep emergency contacts handy',
      'Inform someone about your itinerary',
      'Carry a first aid kit',
      'Stay hydrated, especially in coastal areas',
      'Be cautious while trekking in hill stations',
      'Respect local customs and traditions'
    ];
  }

  async getPlaceTips(place) {
    const tips = [`Visit during ${place.bestTimeToVisit.join(' or ')} for the best experience`];
    
    if (place.averageVisitDuration > 180) {
      tips.push('Allow plenty of time to fully explore this place');
    }
    
    if (place.entryFee.indian === 0) {
      tips.push('Free entry - great for budget travelers!');
    }
    
    return tips;
  }

  async getWeatherTips(route) {
    // Mock weather tips based on locations and seasons
    const tips = ['Check weather forecast before departure'];
    
    const hasCoastal = route.some(p => p.category === 'beach');
    const hasHills = route.some(p => p.category === 'hill-station');
    
    if (hasCoastal) {
      tips.push('Coastal areas can be humid - pack light, breathable clothing');
    }
    if (hasHills) {
      tips.push('Hill stations can be cooler - carry warm clothing for evenings');
    }
    
    return tips;
  }

  async getNearbyAttractions(place) {
    // Find other places within 20km radius
    const nearby = await Place.find({
      id: { $ne: place.id },
      $or: [
        { city: place.city },
        {
          'location.latitude': {
            $gte: place.location.latitude - 0.18, // ~20km
            $lte: place.location.latitude + 0.18
          },
          'location.longitude': {
            $gte: place.location.longitude - 0.18,
            $lte: place.location.longitude + 0.18
          }
        }
      ]
    }).limit(3);

    return nearby.map(p => ({ id: p.id, name: p.name, category: p.category }));
  }

  async getNearbyDining(place) {
    // Mock nearby dining recommendations based on location
    const diningOptions = {
      'Chennai': ['Murugan Idli Shop', 'Saravana Bhavan', 'Hotel Pandian'],
      'Madurai': ['Arya Bhavan', 'Kumar Mess', 'Meenakshi Bhavan'],
      'Mysore': ['Hotel RRR', 'Vinayaka Mylari', 'Depth N Green'],
      'Ooty': ['Earl\'s Secret', 'Ascot Multi Cuisine', 'Nahar\'s Sidewalk Cafe']
    };

    return diningOptions[place.city] || ['Local restaurants', 'Street food stalls', 'Hotel dining'];
  }

  findSimilarPlaces(selectedRoute, alternativePlaces, limit = 5) {
    const selectedCategories = selectedRoute.map(p => p.category);
    return alternativePlaces
      .filter(place => selectedCategories.includes(place.category))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  async findNearbyAlternatives(selectedRoute, alternativePlaces) {
    // Implementation for finding nearby alternative places
    return alternativePlaces.slice(0, 3); // Simplified for now
  }

  findCategoryAlternatives(selectedRoute, alternativePlaces) {
    const categories = [...new Set(selectedRoute.map(p => p.category))];
    const alternatives = {};
    
    categories.forEach(category => {
      alternatives[category] = alternativePlaces
        .filter(place => place.category === category)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
    });
    
    return alternatives;
  }

  calculateAverageDistance(distances) {
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < distances.length; i++) {
      for (let j = 0; j < distances[i].length; j++) {
        if (i !== j) {
          sum += distances[i][j];
          count++;
        }
      }
    }
    
    return count > 0 ? sum / count : 0;
  }

  getMaxDistance(distances) {
    let max = 0;
    for (let i = 0; i < distances.length; i++) {
      for (let j = 0; j < distances[i].length; j++) {
        if (i !== j && distances[i][j] > max) {
          max = distances[i][j];
        }
      }
    }
    return max;
  }

  getMinDistance(distances) {
    let min = Infinity;
    for (let i = 0; i < distances.length; i++) {
      for (let j = 0; j < distances[i].length; j++) {
        if (i !== j && distances[i][j] < min) {
          min = distances[i][j];
        }
      }
    }
    return min === Infinity ? 0 : min;
  }

  async generateTripSuggestions(criteria) {
    // AI-powered trip suggestions based on criteria
    let query = {};
    
    if (criteria.interests.length > 0) {
      query.category = { $in: criteria.interests };
    }
    
    const places = await Place.find(query)
      .sort({ rating: -1 })
      .limit(15);

    // Group suggestions by different themes
    const suggestions = {
      recommended: places.slice(0, 6),
      cultural: places.filter(p => ['temple', 'heritage', 'palace'].includes(p.category)).slice(0, 4),
      nature: places.filter(p => ['hill-station', 'beach', 'nature', 'wildlife'].includes(p.category)).slice(0, 4),
      quickTrip: places.filter(p => p.averageVisitDuration <= 120).slice(0, 4),
      weekend: places.filter(p => p.averageVisitDuration >= 180).slice(0, 3)
    };

    return suggestions;
  }

  async calculateImprovement(originalRoute, optimizedRoute) {
    if (!originalRoute.length || !optimizedRoute.length) return null;

    const originalMetrics = await this.calculateRouteMetrics(originalRoute);
    const optimizedMetrics = await this.calculateRouteMetrics(optimizedRoute);

    return {
      distanceReduction: originalMetrics.totalDistance - optimizedMetrics.totalDistance,
      timeReduction: originalMetrics.totalTime - optimizedMetrics.totalTime,
      efficiencyImprovement: optimizedMetrics.efficiency - originalMetrics.efficiency,
      percentageImprovement: {
        distance: ((originalMetrics.totalDistance - optimizedMetrics.totalDistance) / originalMetrics.totalDistance * 100).toFixed(2),
        time: ((originalMetrics.totalTime - optimizedMetrics.totalTime) / originalMetrics.totalTime * 100).toFixed(2)
      }
    };
  }

  async calculateRouteMetrics(route) {
    const routeMetrics = await this.distanceCalculator.calculateRouteMetrics(route);
    const totalVisitTime = route.reduce((sum, place) => sum + place.averageVisitDuration, 0);
    
    return {
      totalTime: routeMetrics.totalTime + totalVisitTime,
      totalDistance: routeMetrics.totalDistance,
      efficiency: route.length / ((routeMetrics.totalTime + totalVisitTime) / 60)
    };
  }
}

module.exports = new TripController();