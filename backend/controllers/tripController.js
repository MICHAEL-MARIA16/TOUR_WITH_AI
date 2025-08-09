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
        startLocation = null
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
          alternatives: await this.generateAlternatives(places, optimizationResult.route)
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

  // Helper Methods
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

  findSimilarPlaces(selectedRoute, alternativePlaces) {
    const selectedCategories = selectedRoute.map(p => p.category);
    return alternativePlaces
      .filter(place => selectedCategories.includes(place.category))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
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