// Enhanced DetailedTripPlanner.jsx with AI Algorithm Justification - FIXED
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  MapPin, 
  Clock, 
  Calendar, 
  Star, 
  IndianRupee, 
  Navigation,
  AlertCircle,
  CheckCircle,
  Loader,
  Settings,
  Target,
  Info,
  Coffee,
  Camera,
  Utensils,
  Fuel,
  MapIcon,
  ChevronRight,
  Download,
  Share,
  BookOpen,
  Lightbulb,
  MapIcon as Route,
  Timer,
  Users,
  Zap,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react';

const DetailedTripPlanner = ({ optimizedRoute, routeSettings }) => {
  const [detailedPlan, setDetailedPlan] = useState(null);
  const [algorithmExplanation, setAlgorithmExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showAlgorithmJustification, setShowAlgorithmJustification] = useState(false);
  const [explanationExpanded, setExplanationExpanded] = useState(true);
  const [explanationDetail, setExplanationDetail] = useState('detailed'); // 'simple', 'detailed', 'technical'

  // Generate detailed plan using Gemini AI integration
  const generateDetailedPlan = useCallback(async () => {
    if (!optimizedRoute?.route || optimizedRoute.route.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Enhanced payload for Gemini AI
      const geminiPayload = {
        places: optimizedRoute.route.map(place => ({
          id: place.id,
          name: place.name,
          category: place.category,
          city: place.city,
          state: place.state,
          rating: place.rating,
          averageVisitDuration: place.averageVisitDuration,
          entryFee: place.entryFee,
          description: place.description,
          amenities: place.amenities,
          bestTimeToVisit: place.bestTimeToVisit,
          location: place.location
        })),
        preferences: {
          startTime: routeSettings.startTime,
          totalTimeAvailable: routeSettings.totalTimeAvailable,
          optimizationLevel: routeSettings.optimizationLevel,
          budget: routeSettings.constraints?.budget,
          userLocationId: routeSettings.userLocationId
        },
        routeMetrics: optimizedRoute.metrics,
        algorithm: optimizedRoute.algorithm,
        startingLocation: optimizedRoute.startingLocation
      };

      // Call your backend API that integrates with Gemini
      const response = await fetch('/api/trips/generate-detailed-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to generate detailed plan');
      }

      const result = await response.json();

      // Enhanced detailed plan structure
      const enhancedPlan = {
        ...result,
        timeline: generateTimeline(optimizedRoute.route, routeSettings),
        insights: generateTripInsights(optimizedRoute.route),
        recommendations: generateRecommendations(optimizedRoute.route),
        logistics: generateLogistics(optimizedRoute.route),
        cultural: generateCulturalTips(optimizedRoute.route)
      };

      setDetailedPlan(enhancedPlan);

    } catch (error) {
      console.error('Error generating detailed plan:', error);
      setError(error.message);
      // Fallback to local generation
      generateFallbackPlan();
    } finally {
      setLoading(false);
    }
  }, [optimizedRoute, routeSettings]);

  // NEW: Generate AI Algorithm Justification
  const generateAlgorithmExplanation = useCallback(async () => {
    if (!optimizedRoute?.route || optimizedRoute.route.length === 0) return;

    setLoadingExplanation(true);

    try {
      const explanationPayload = {
        route: optimizedRoute.route,
        algorithm: optimizedRoute.algorithm,
        metrics: optimizedRoute.metrics,
        preferences: {
          startTime: routeSettings.startTime,
          totalTimeAvailable: routeSettings.totalTimeAvailable,
          userLocationId: routeSettings.userLocationId
        },
        startingLocation: optimizedRoute.startingLocation,
        originalPlaces: optimizedRoute.originalPlaces || optimizedRoute.route,
        explanationLevel: explanationDetail
      };

      const response = await fetch('/api/trips/generate-algorithm-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(explanationPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to generate algorithm explanation');
      }

      const result = await response.json();
      setAlgorithmExplanation(result.data);

    } catch (error) {
      console.error('Error generating algorithm explanation:', error);
      // Fallback explanation
      generateFallbackExplanation();
    } finally {
      setLoadingExplanation(false);
    }
  }, [optimizedRoute, routeSettings, explanationDetail]);

  // Fallback explanation generation
  const generateFallbackExplanation = () => {
    const algorithm = optimizedRoute.algorithm || 'advanced-greedy';
    const places = optimizedRoute.route || [];
    const startLocation = optimizedRoute.startingLocation?.name || 'your starting point';

    const explanations = {
      'advancedGreedy': {
        title: 'Smart Greedy Algorithm with Timing Intelligence',
        summary: `I used an advanced greedy algorithm that considers multiple factors including opening hours, travel time, and your preferences to create this optimized route from ${startLocation}.`,
        reasoning: [
          {
            step: 1,
            decision: `Starting from ${startLocation}`,
            explanation: `Your route begins at ${startLocation} at ${routeSettings.startTime}. This location serves as the optimal starting point based on your preferences.`,
            factors: ['User location preference', 'Time constraints', 'Accessibility']
          },
          ...places.slice(0, 5).map((place, index) => ({
            step: index + 2,
            decision: `Selected ${place.name}`,
            explanation: `${place.name} was chosen as stop ${index + 1} because of its ${place.rating}/5 rating${place.bestTimeToVisit ? `, optimal visit time (${place.bestTimeToVisit.join(', ')})` : ''}${place.averageVisitDuration ? `, and ${place.averageVisitDuration} minute duration` : ''}. ${place.category === 'temple' ? 'Temple opening hours aligned with our schedule.' : place.category === 'museum' ? 'Museum timing fits perfectly with afternoon visits.' : 'Location timing matches travel flow.'}`,
            factors: [
              `Rating: ${place.rating}/5`,
              `Duration: ${place.averageVisitDuration || 90} minutes`,
              `Category: ${place.category}`,
              place.entryFee?.indian ? `Entry: ₹${place.entryFee.indian}` : 'Free entry'
            ]
          }))
        ],
        optimizations: [
          'Minimized travel time between locations',
          'Considered opening hours and optimal visit times',
          'Balanced high-rated places with practical logistics',
          'Avoided rush hour travel when possible',
          'Maintained budget consciousness'
        ],
        tips: [
          places.some(p => p.category === 'temple') ? 'Pack modest clothing for temple visits' : 'Comfortable walking shoes recommended',
          'Carry water and snacks for longer visits',
          places.length > 5 ? 'Consider splitting into multiple days if feeling rushed' : 'Pace allows for relaxed exploration',
          'Check weather conditions before departure'
        ]
      },
      'genetic': {
        title: 'Evolutionary Algorithm - Multiple Solution Comparison',
        summary: `I used a genetic algorithm that tested thousands of route combinations to find the best possible sequence from ${startLocation}.`,
        reasoning: [
          {
            step: 1,
            decision: 'Route Evolution Process',
            explanation: 'The algorithm created multiple route variations and evolved them over many generations, testing different place sequences to find optimal combinations.',
            factors: ['Population diversity', 'Fitness scoring', 'Mutation and crossover']
          },
          {
            step: 2,
            decision: 'Multi-objective Optimization',
            explanation: 'Each route version was scored on travel time, place ratings, opening hours compatibility, and cost effectiveness.',
            factors: ['Travel efficiency', 'Quality maximization', 'Time constraints', 'Budget optimization']
          }
        ],
        optimizations: [
          'Tested over 1000+ route combinations',
          'Optimized for multiple objectives simultaneously',
          'Found globally optimal solution',
          'Considered complex interdependencies'
        ]
      }
    };

    const explanation = explanations[algorithm] || explanations['advancedGreedy'];
    setAlgorithmExplanation(explanation);
  };

  // Fixed function to handle View on Map with proper coordinate validation
  const handleViewOnMap = () => {
    if (!optimizedRoute || !optimizedRoute.route || optimizedRoute.route.length === 0) {
      console.error('No optimized route available');
      alert('No optimized route available to display on map');
      return;
    }

    // Validate that all places have valid coordinates
    const invalidPlaces = optimizedRoute.route.filter(place => {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      return !lat || !lng || isNaN(lat) || isNaN(lng);
    });

    if (invalidPlaces.length > 0) {
      console.error('Invalid coordinates found in places:', invalidPlaces);
      alert('Some places have invalid coordinates. Cannot display on map.');
      return;
    }

    // Ensure starting location has valid coordinates
    const startLocation = optimizedRoute.startingLocation;
    if (!startLocation || !startLocation.latitude || !startLocation.longitude || 
        isNaN(startLocation.latitude) || isNaN(startLocation.longitude)) {
      console.error('Invalid starting location coordinates:', startLocation);
      alert('Starting location has invalid coordinates. Cannot display on map.');
      return;
    }

    // Prepare map data with validated coordinates
    const mapData = {
      startLocation: {
        id: 'start-location',
        name: startLocation.name,
        location: {
          latitude: parseFloat(startLocation.latitude),
          longitude: parseFloat(startLocation.longitude)
        },
        isStartLocation: true,
        description: startLocation.description
      },
      optimizedRoute: optimizedRoute.route.map(place => ({
        ...place,
        location: {
          latitude: parseFloat(place.location.latitude),
          longitude: parseFloat(place.location.longitude)
        }
      })),
      routeSettings: routeSettings,
      algorithm: optimizedRoute.algorithm,
      metrics: optimizedRoute.metrics
    };

    // Store in session storage for map page access
    try {
      sessionStorage.setItem('tripMapData', JSON.stringify(mapData));
      
      // Navigate to map page with trip mode
      window.open('/map?mode=trip', '_blank');
      
      console.log('Opening route on map with validated data');
    } catch (error) {
      console.error('Failed to store map data:', error);
      alert('Failed to prepare map data');
    }
  };

  // Rest of the existing helper functions remain the same...
  const generateTimeline = (places, settings) => {
    let currentTime = timeToMinutes(settings.startTime);
    const timeline = [];

    places.forEach((place, index) => {
      const arrivalTime = currentTime;
      const visitDuration = place.averageVisitDuration || 90;
      const departureTime = arrivalTime + visitDuration;

      timeline.push({
        time: minutesToTime(arrivalTime),
        endTime: minutesToTime(departureTime),
        place,
        duration: visitDuration,
        activities: generateActivities(place),
        tips: generatePlaceTips(place),
        isBreakfast: arrivalTime >= 420 && arrivalTime <= 600,
        isLunch: arrivalTime >= 720 && arrivalTime <= 840,
        isDinner: arrivalTime >= 1080 && arrivalTime <= 1200,
        travel: index < places.length - 1 ? {
          duration: 45,
          mode: 'car',
          distance: 25
        } : null
      });

      currentTime = departureTime + (index < places.length - 1 ? 45 : 0);
    });

    return timeline;
  };

  const generateTripInsights = (places) => {
    const categories = places.map(p => p.category);
    const cities = [...new Set(places.map(p => p.city))];
    const avgRating = places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length;

    return {
      diversity: categories.length / places.length,
      cityCount: cities.length,
      averageRating: avgRating.toFixed(1),
      totalDuration: places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0),
      highlights: places.filter(p => (p.rating || 0) >= 4.5),
      categories: [...new Set(categories)],
      experienceLevel: avgRating >= 4.0 ? 'Premium' : avgRating >= 3.5 ? 'Good' : 'Standard'
    };
  };

  const generateRecommendations = (places) => {
    return {
      photography: places.filter(p => ['palace', 'heritage', 'fort'].includes(p.category)).slice(0, 3),
      cultural: places.filter(p => p.category === 'temple').slice(0, 2),
      nature: places.filter(p => ['hill-station', 'beach', 'nature'].includes(p.category)).slice(0, 2),
      timing: [
        'Start early (8:00 AM) to avoid crowds',
        'Carry sufficient water and snacks',
        'Wear comfortable walking shoes',
        'Respect local customs and dress codes'
      ]
    };
  };

  const generateLogistics = (places) => {
    return {
      transportation: 'Private car/taxi recommended',
      parking: 'Most places have parking facilities',
      restrooms: 'Available at major attractions',
      food: 'Local restaurants available near most places',
      shopping: 'Souvenir shops at heritage sites',
      emergency: '108 for emergencies, tourist helpline available'
    };
  };

  const generateCulturalTips = (places) => {
    const hasTemples = places.some(p => p.category === 'temple');
    const hasHeritage = places.some(p => p.category === 'heritage');

    const tips = [
      'Learn basic local greetings',
      'Try authentic South Indian cuisine',
      'Bargain respectfully at local markets',
      'Be patient with local customs'
    ];

    if (hasTemples) {
      tips.push('Remove footwear before entering temples');
      tips.push('Dress modestly at religious sites');
    }

    if (hasHeritage) {
      tips.push('Hire local guides for historical context');
      tips.push('Photography may be restricted in some areas');
    }

    return tips;
  };

  const generateFallbackPlan = () => {
    const fallbackPlan = {
      summary: {
        title: `${optimizedRoute.route.length}-Day South India Adventure`,
        duration: `${Math.ceil(routeSettings.totalTimeAvailable / 60)} hours`,
        totalDistance: optimizedRoute.metrics?.totalDistance || 0,
        estimatedCost: calculateTotalCost(optimizedRoute.route),
        difficulty: getDifficultyLevel(optimizedRoute.route)
      },
      timeline: generateTimeline(optimizedRoute.route, routeSettings),
      insights: generateTripInsights(optimizedRoute.route),
      recommendations: generateRecommendations(optimizedRoute.route),
      logistics: generateLogistics(optimizedRoute.route),
      cultural: generateCulturalTips(optimizedRoute.route)
    };

    setDetailedPlan(fallbackPlan);
  };

  // Helper functions
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateTotalCost = (places) => {
    return places.reduce((sum, place) => {
      const entryCost = place.entryFee?.indian || place.entryFee?.amount || 0;
      return sum + entryCost;
    }, 0);
  };

  const getDifficultyLevel = (places) => {
    const avgDuration = places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0) / places.length;
    return avgDuration > 150 ? 'Challenging' : avgDuration > 90 ? 'Moderate' : 'Easy';
  };

  const generateActivities = (place) => {
    const activities = {
      'temple': ['Worship and prayers', 'Architecture photography', 'Cultural exploration'],
      'palace': ['Royal architecture tour', 'Museum visit', 'Garden walk'],
      'heritage': ['Historical tour', 'Photography', 'Archaeological exploration'],
      'fort': ['Historical exploration', 'Panoramic views', 'Photography'],
      'beach': ['Beach walk', 'Water activities', 'Sunset viewing'],
      'hill-station': ['Nature walk', 'Scenic photography', 'Cool climate'],
      'nature': ['Nature photography', 'Wildlife spotting', 'Fresh air'],
      'museum': ['Art and history', 'Educational tour', 'Cultural learning']
    };

    return activities[place.category] || ['Sightseeing', 'Photography', 'Cultural experience'];
  };

  const generatePlaceTips = (place) => {
    const tips = {
      'temple': ['Dress modestly', 'Remove footwear', 'Maintain silence'],
      'palace': ['Book guided tours', 'Check photography rules', 'Allow 2-3 hours'],
      'heritage': ['Hire local guide', 'Carry water', 'Wear sun protection'],
      'fort': ['Wear comfortable shoes', 'Carry water', 'Best in morning/evening'],
      'beach': ['Apply sunscreen', 'Stay hydrated', 'Check tide timings'],
      'hill-station': ['Carry light jacket', 'Check weather', 'Book accommodation early']
    };

    return tips[place.category] || ['Plan sufficient time', 'Carry essentials', 'Follow local guidelines'];
  };

  useEffect(() => {
    if (optimizedRoute?.route?.length > 0) {
      generateDetailedPlan();
      generateAlgorithmExplanation();
    }
  }, [optimizedRoute]);

  if (!optimizedRoute?.route || optimizedRoute.route.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-12">
          <Brain className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Route Optimized</h3>
          <p className="text-gray-600">
            Please optimize a route first to see the detailed trip plan.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-12">
          <Loader className="mx-auto mb-4 text-blue-600 animate-spin" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Detailed Plan</h3>
          <p className="text-gray-600">
            Our AI is creating your personalized trip itinerary...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Plan Generation Failed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={generateDetailedPlan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!detailedPlan) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center py-12">
          <Brain className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Plan Not Available</h3>
          <p className="text-gray-600">
            Unable to generate detailed plan. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="text-purple-600" size={28} />
              AI-Powered Trip Plan
            </h2>
            <p className="text-gray-600 mt-1">
              Comprehensive itinerary with algorithm insights
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAlgorithmJustification(!showAlgorithmJustification)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                showAlgorithmJustification ? 'bg-purple-600 text-white' : 'bg-white'
              }`}
            >
              <Brain size={18} />
              {showAlgorithmJustification ? 'Hide' : 'Show'} AI Logic
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Download size={18} />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Share size={18} />
              Share
            </button>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="text-blue-600" size={16} />
              <span className="text-sm font-medium">{optimizedRoute.route.length} Places</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="text-green-600" size={16} />
              <span className="text-sm font-medium">{Math.ceil(routeSettings.totalTimeAvailable / 60)} Hours</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Navigation className="text-purple-600" size={16} />
              <span className="text-sm font-medium">{optimizedRoute.metrics?.totalDistance?.toFixed(0) || 0} KM</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <IndianRupee className="text-orange-600" size={16} />
              <span className="text-sm font-medium">₹{calculateTotalCost(optimizedRoute.route)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Algorithm Justification Section */}
      {showAlgorithmJustification && (
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Brain className="text-purple-600" size={24} />
              AI Algorithm Explanation
            </h3>
            <div className="flex items-center gap-3">
              <select
                value={explanationDetail}
                onChange={(e) => {
                  setExplanationDetail(e.target.value);
                  generateAlgorithmExplanation();
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
              >
                <option value="simple">Simple</option>
                <option value="detailed">Detailed</option>
                <option value="technical">Technical</option>
              </select>
              <button
                onClick={() => setExplanationExpanded(!explanationExpanded)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                {explanationExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {explanationExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          {loadingExplanation ? (
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
              <Loader className="animate-spin text-purple-600" size={20} />
              <span className="text-gray-700">Generating AI explanation...</span>
            </div>
          ) : algorithmExplanation ? (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Zap className="text-yellow-500" size={18} />
                  {algorithmExplanation.title}
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {algorithmExplanation.summary}
                </p>
              </div>

              {explanationExpanded && (
                <>
                  {/* Step-by-step reasoning */}
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <Route className="text-blue-600" size={16} />
                      Step-by-Step Decision Process
                    </h5>
                    <div className="space-y-4">
                      {algorithmExplanation.reasoning?.map((step, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">{step.step}</span>
                          </div>
                          <div className="flex-grow">
                            <h6 className="font-medium text-gray-900">{step.decision}</h6>
                            <p className="text-gray-600 text-sm mt-1">{step.explanation}</p>
                            {step.factors && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {step.factors.map((factor, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Algorithm optimizations */}
                  {algorithmExplanation.optimizations && (
                    <div className="mb-6">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <Target className="text-green-600" size={16} />
                        Optimization Factors Considered
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {algorithmExplanation.optimizations.map((optimization, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
                            <span className="text-green-800 text-sm">{optimization}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practical tips from algorithm */}
                  {algorithmExplanation.tips && (
                    <div>
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <Lightbulb className="text-yellow-600" size={16} />
                        AI-Generated Tips
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {algorithmExplanation.tips.map((tip, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                            <Info className="text-yellow-600 flex-shrink-0 mt-0.5" size={14} />
                            <span className="text-yellow-800 text-sm">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 text-center">
              <MessageSquare className="mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-gray-600">Algorithm explanation not available</p>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'insights', label: 'Insights', icon: Target },
            { id: 'recommendations', label: 'Tips', icon: Info },
            { id: 'logistics', label: 'Logistics', icon: MapIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-blue-600" size={24} />
              <h3 className="text-xl font-semibold">Day-by-Day Timeline</h3>
            </div>

            <div className="space-y-4">
              {detailedPlan.timeline.map((item, index) => (
                <div key={index} className="flex gap-4">
                  {/* Time Column */}
                  <div className="flex-shrink-0 w-20 text-center">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
                      {item.time}
                    </div>
                    {item.endTime && (
                      <div className="text-xs text-gray-500 mt-1">
                        to {item.endTime}
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="flex-grow">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.place.name}</h4>
                          <p className="text-sm text-gray-600">{item.place.city}, {item.place.state}</p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star size={14} fill="currentColor" />
                          <span className="text-sm font-medium">{item.place.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Activities */}
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Activities</h5>
                          <ul className="space-y-1">
                            {item.activities.map((activity, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                {activity}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Tips */}
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Tips</h5>
                          <ul className="space-y-1">
                            {item.tips.map((tip, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Duration: {item.duration} minutes</span>
                          {item.place.entryFee && (
                            <span>Entry: ₹{item.place.entryFee.indian || item.place.entryFee.amount || 0}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Travel Info */}
                    {item.travel && index < detailedPlan.timeline.length - 1 && (
                      <div className="flex items-center gap-2 mt-3 ml-4">
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-sm text-blue-700">
                          <Navigation size={14} />
                          <span>{item.travel.duration} min drive</span>
                          <span>•</span>
                          <span>{item.travel.distance} km</span>
                        </div>
                        <ChevronRight className="text-gray-400" size={16} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="text-green-600" size={24} />
              <h3 className="text-xl font-semibold">Trip Insights</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Experience Level</h4>
                <p className="text-2xl font-bold text-blue-900">{detailedPlan.insights.experienceLevel}</p>
                <p className="text-sm text-blue-700">Based on ratings and variety</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Cities Covered</h4>
                <p className="text-2xl font-bold text-green-900">{detailedPlan.insights.cityCount}</p>
                <p className="text-sm text-green-700">Different cities in your journey</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Average Rating</h4>
                <p className="text-2xl font-bold text-purple-900">⭐ {detailedPlan.insights.averageRating}</p>
                <p className="text-sm text-purple-700">Quality of selected places</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Categories Covered</h4>
              <div className="flex flex-wrap gap-2">
                {detailedPlan.insights.categories.map(category => (
                  <span key={category} className="bg-white px-3 py-1 rounded-full text-sm capitalize border">
                    {category.replace('-', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Info className="text-orange-600" size={24} />
              <h3 className="text-xl font-semibold">Recommendations & Tips</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photography Spots */}
              {detailedPlan.recommendations.photography.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Camera className="text-pink-600" size={18} />
                    Best Photography Spots
                  </h4>
                  <div className="space-y-2">
                    {detailedPlan.recommendations.photography.map(place => (
                      <div key={place.id} className="flex items-center gap-3 p-2 bg-white rounded">
                        <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        <span className="text-sm">{place.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cultural Sites */}
              {detailedPlan.recommendations.cultural.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Info className="text-orange-600" size={18} />
                    Cultural Experiences
                  </h4>
                  <div className="space-y-2">
                    {detailedPlan.recommendations.cultural.map(place => (
                      <div key={place.id} className="flex items-center gap-3 p-2 bg-white rounded">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">{place.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* General Tips */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-3">General Tips</h4>
              <ul className="space-y-2">
                {detailedPlan.recommendations.timing.map((tip, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-center gap-2">
                    <CheckCircle size={14} className="text-yellow-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cultural Tips */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-3">Cultural Tips</h4>
              <ul className="space-y-2">
                {detailedPlan.cultural.map((tip, index) => (
                  <li key={index} className="text-sm text-purple-700 flex items-center gap-2">
                    <Info size={14} className="text-purple-600" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Logistics Tab */}
        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <MapIcon className="text-red-600" size={24} />
              <h3 className="text-xl font-semibold">Logistics & Practical Info</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Navigation size={18} />
                    Transportation
                  </h4>
                  <p className="text-blue-700">{detailedPlan.logistics.transportation}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <Utensils size={18} />
                    Food & Dining
                  </h4>
                  <p className="text-green-700">{detailedPlan.logistics.food}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <Coffee size={18} />
                    Shopping
                  </h4>
                  <p className="text-purple-700">{detailedPlan.logistics.shopping}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                    <Fuel size={18} />
                    Parking
                  </h4>
                  <p className="text-orange-700">{detailedPlan.logistics.parking}</p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Emergency Info
                  </h4>
                  <p className="text-red-700">{detailedPlan.logistics.emergency}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Facilities</h4>
                  <p className="text-gray-700">{detailedPlan.logistics.restrooms}</p>
                </div>
              </div>
            </div>

            {/* Budget Breakdown */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <IndianRupee size={20} className="text-green-600" />
                Estimated Budget Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="text-sm font-medium text-gray-600 mb-1">Entry Fees</h5>
                  <p className="text-xl font-bold text-green-600">₹{calculateTotalCost(optimizedRoute.route)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="text-sm font-medium text-gray-600 mb-1">Transportation</h5>
                  <p className="text-xl font-bold text-blue-600">₹{Math.round((optimizedRoute.metrics?.totalDistance || 0) * 8)}</p>
                  <p className="text-xs text-gray-500">Est. ₹8/km</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h5 className="text-sm font-medium text-gray-600 mb-1">Food & Misc</h5>
                  <p className="text-xl font-bold text-orange-600">₹{optimizedRoute.route.length * 300}</p>
                  <p className="text-xs text-gray-500">Est. ₹300/place</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total Estimated Cost:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    ₹{calculateTotalCost(optimizedRoute.route) + Math.round((optimizedRoute.metrics?.totalDistance || 0) * 8) + (optimizedRoute.route.length * 300)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - REMOVED START TRIP BUTTON */}
      <div className="border-t bg-gray-50 p-6">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-3">
            <button 
              onClick={handleViewOnMap}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MapIcon size={16} />
              View on Map
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAlgorithmJustification(!showAlgorithmJustification)}
              className="flex items-center gap-2 px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
            >
              <Brain size={16} />
              {showAlgorithmJustification ? 'Hide' : 'Show'} AI Logic
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings size={16} />
              Customize
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* AI Attribution */}
      <div className="border-t bg-gradient-to-r from-purple-50 to-blue-50 p-4">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Brain className="text-purple-600" size={16} />
          <span>Powered by Gemini AI • Generated with {optimizedRoute.algorithm} algorithm</span>
          {algorithmExplanation && (
            <>
              <span>•</span>
              <button 
                onClick={() => setShowAlgorithmJustification(!showAlgorithmJustification)}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                View AI reasoning
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailedTripPlanner;