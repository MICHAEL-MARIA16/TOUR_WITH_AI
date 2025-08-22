// API Service Layer for TourWithAI
import axios from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://tour-with-ai-16.onrender.com'
  : 'http://localhost:5000/api';

const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString();
    console.log(`🌐 API Request [${timestamp}]: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add request timestamp
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    console.log(`✅ API Response [${duration}ms]: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    const duration = error.config?.metadata ? Date.now() - error.config.metadata.startTime : 0;
    console.error(`❌ API Error [${duration}ms]:`, {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.message,
    });

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
      toast.error('Backend server is not running. Please start the server.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment.');
    }

    return Promise.reject(error);
  }
);

// Utility function for retries
const withRetry = async (fn, retries = MAX_RETRIES) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNREFUSED' || error.response?.status >= 500)) {
      console.log(`🔄 Retrying API call... ${retries} attempts left`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

// API Service Object
export const apiService = {
  // Health Check
  async checkHealth() {
    try {
      const response = await withRetry(() => apiClient.get('/health'));
      return response.data;
    } catch (error) {
      throw new Error(`Backend connection failed: ${error.message}`);
    }
  },

  // PLACES API
  async getAllPlaces(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`/places?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch places: ${error.response?.data?.message || error.message}`);
    }
  },

  async getPlaceById(id) {
    try {
      const response = await apiClient.get(`/places/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch place: ${error.response?.data?.message || error.message}`);
    }
  },

  async searchPlaces(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters
      });

      const response = await apiClient.get(`/places/search?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Search failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async getNearbyPlaces(latitude, longitude, radius = 50, filters = {}) {
    try {
      const params = new URLSearchParams({
        latitude,
        longitude,
        radius,
        ...filters
      });

      const response = await apiClient.get(`/places/nearby?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch nearby places: ${error.response?.data?.message || error.message}`);
    }
  },

  async getPlacesByCategory(category, filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/places/category/${category}?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch places by category: ${error.response?.data?.message || error.message}`);
    }
  },

  async getPlaceStats() {
    try {
      const response = await apiClient.get('/places/stats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch place statistics: ${error.response?.data?.message || error.message}`);
    }
  },

  // ROUTE OPTIMIZATION API
  async optimizeRouteWithAlgorithm(payload) {
    try {
      console.log('🚀 Calling algorithm-based route optimization...');
      console.log('📊 Payload:', {
        placesCount: payload.places?.length,
        optimizationLevel: payload.preferences?.optimizationLevel,
        totalTimeAvailable: payload.constraints?.totalTimeAvailable
      });

      const response = await apiClient.post('/routes/optimize-with-algorithm', payload);
      
      console.log('✅ Algorithm optimization response:', {
        success: response.data.success,
        algorithm: response.data.algorithm,
        placesOptimized: response.data.route?.length,
        efficiency: response.data.metrics?.efficiency
      });

      return response.data;
    } catch (error) {
      console.error('💥 Algorithm optimization failed:', error);
      throw new Error(`Route optimization failed: ${error.response?.data?.message || error.message}`);
    }
  },

  // Add this method to your existing apiService object in src/services/api.js

// NEW: Generate Algorithm Explanation
async generateAlgorithmExplanation(payload) {
  try {
    console.log('🧠 Calling algorithm explanation generation...');
    console.log('📊 Payload:', {
      routeLength: payload.route?.length,
      algorithm: payload.algorithm,
      explanationLevel: payload.explanationLevel
    });

    const response = await apiClient.post('/trips/generate-algorithm-explanation', payload);

    console.log('✅ Algorithm explanation response:', {
      success: response.data.success,
      hasReasoning: !!response.data.data?.reasoning,
      hasOptimizations: !!response.data.data?.optimizations,
      hasTips: !!response.data.data?.tips,
      explanationLevel: response.data.metadata?.explanationLevel
    });

    return response.data;
  } catch (error) {
    console.error('💥 Algorithm explanation failed:', error);
    throw new Error(`Algorithm explanation failed: ${error.response?.data?.message || error.message}`);
  }
},

// Enhanced generateDetailedTripPlan method
async generateDetailedTripPlan(payload) {
  try {
    console.log('📋 Calling detailed trip plan generation...');
    console.log('📊 Payload:', {
      placesCount: payload.places?.length,
      algorithm: payload.algorithm,
      startTime: payload.preferences?.startTime,
      userLocationId: payload.preferences?.userLocationId
    });

    const response = await apiClient.post('/trips/generate-detailed-plan', payload);

    console.log('✅ Detailed plan generation response:', {
      success: response.data.success,
      hasSummary: !!response.data.data?.summary,
      hasTimeline: !!response.data.data?.timeline,
      hasInsights: !!response.data.data?.insights,
      hasRecommendations: !!response.data.data?.recommendations,
      hasLogistics: !!response.data.data?.logistics,
      hasPracticalInfo: !!response.data.data?.practicalInfo
    });

    return response.data;
  } catch (error) {
    console.error('💥 Detailed plan generation failed:', error);
    throw new Error(`Detailed plan generation failed: ${error.response?.data?.message || error.message}`);
  }
},
  async getRouteSuggestions(criteria = {}) {
    try {
      const params = new URLSearchParams(criteria);
      const response = await apiClient.get(`/routes/suggestions?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get route suggestions: ${error.response?.data?.message || error.message}`);
    }
  },

  // TRIP PLANNING API
  async createTrip(tripData) {
    try {
      const response = await apiClient.post('/trips', tripData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create trip: ${error.response?.data?.message || error.message}`);
    }
  },

  async optimizeTrip(payload) {
    try {
      const response = await apiClient.post('/trips/optimize', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Trip optimization failed: ${error.response?.data?.message || error.message}`);
    }
  },

  // Add to apiService in src/services/api.js

// Real-time tracking endpoints
async startRealTimeTracking(payload) {
  try {
    const response = await apiClient.post('/trips/start-realtime-tracking', payload);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to start tracking: ${error.response?.data?.message || error.message}`);
  }
},

async updateTripProgress(payload) {
  try {
    const response = await apiClient.put('/trips/update-progress', payload);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to update progress: ${error.response?.data?.message || error.message}`);
  }
},

async getRealTimeUpdates(tripId, currentLocation, lastUpdateTime) {
  try {
    const params = new URLSearchParams({
      tripId,
      currentLocation: JSON.stringify(currentLocation),
      lastUpdateTime
    });
    const response = await apiClient.get(`/trips/real-time-updates?${params}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get updates: ${error.response?.data?.message || error.message}`);
  }
},


  async getTripSuggestions(criteria = {}) {
    try {
      const params = new URLSearchParams(criteria);
      const response = await apiClient.get(`/trips/suggestions?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get trip suggestions: ${error.response?.data?.message || error.message}`);
    }
  },

  // AI CHAT API
  async chatWithAI(message, context = {}) {
    try {
      const response = await apiClient.post('/chat', { message, context });
      return response.data;
    } catch (error) {
      throw new Error(`AI chat failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async getTravelSuggestions(preferences) {
    try {
      const response = await apiClient.post('/chat/suggestions', preferences);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get travel suggestions: ${error.response?.data?.message || error.message}`);
    }
  },

  async getPlaceInfo(placeId, question = null) {
    try {
      const response = await apiClient.post('/chat/place-info', { placeId, question });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get place information: ${error.response?.data?.message || error.message}`);
    }
  },

  // MAP API
  async getMapBounds(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/map/bounds?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get map bounds: ${error.response?.data?.message || error.message}`);
    }
  },

  async getPlacesInBounds(bounds, filters = {}) {
    try {
      const params = new URLSearchParams({
        ...bounds,
        ...filters
      });
      const response = await apiClient.get(`/map/places-in-bounds?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get places in bounds: ${error.response?.data?.message || error.message}`);
    }
  },

  async getOptimizedRoute(payload) {
    try {
      const response = await apiClient.post('/map/optimize-route', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get optimized route: ${error.response?.data?.message || error.message}`);
    }
  },

  async getClusteredMarkers(params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await apiClient.get(`/map/clustered-markers?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get clustered markers: ${error.response?.data?.message || error.message}`);
    }
  },

  async getHeatmapData(params = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await apiClient.get(`/map/heatmap-data?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get heatmap data: ${error.response?.data?.message || error.message}`);
    }
  },

  async geocodeAddress(address) {
    try {
      const response = await apiClient.get(`/map/geocode?q=${encodeURIComponent(address)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Geocoding failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async reverseGeocode(latitude, longitude) {
    try {
      const response = await apiClient.get(`/map/reverse-geocode?lat=${latitude}&lng=${longitude}`);
      return response.data;
    } catch (error) {
      throw new Error(`Reverse geocoding failed: ${error.response?.data?.message || error.message}`);
    }
  },

  // DISTANCE API
  async calculateDistanceMatrix(origins, destinations) {
    try {
      const response = await apiClient.post('/distance/matrix', { origins, destinations });
      return response.data;
    } catch (error) {
      throw new Error(`Distance calculation failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async calculateDistance(origin, destination) {
    try {
      const response = await apiClient.post('/distance/calculate', { origin, destination });
      return response.data;
    } catch (error) {
      throw new Error(`Distance calculation failed: ${error.response?.data?.message || error.message}`);
    }
  },

  async generateDetailedTripPlan(payload) {
    try {
      console.log('🧠 Calling detailed trip plan generation...');
      console.log('📊 Payload:', {
        placesCount: payload.places?.length,
        algorithm: payload.algorithm,
        startTime: payload.preferences?.startTime
      });

      const response = await apiClient.post('/trips/generate-detailed-plan', payload);
      
      console.log('✅ Detailed plan generation response:', {
        success: response.data.success,
        aiModel: response.data.aiModel,
        hasTimeline: !!response.data.data?.timeline,
        hasCulturalGuide: !!response.data.data?.culturalGuide
      });

      return response.data;
    } catch (error) {
      console.error('💥 Detailed plan generation failed:', error);
      throw new Error(`Detailed plan generation failed: ${error.response?.data?.message || error.message}`);
    }
  },

  // Enhanced route optimization that also prepares for detailed plan
  async optimizeRouteWithAlgorithm(payload) {
    try {
      console.log('🚀 Calling algorithm-based route optimization...');
      console.log('📊 Payload:', {
        placesCount: payload.places?.length,
        optimizationLevel: payload.preferences?.optimizationLevel,
        totalTimeAvailable: payload.constraints?.totalTimeAvailable,
        startLocation: payload.constraints?.startLocation?.name
      });

      const response = await apiClient.post('/routes/optimize-with-algorithm', payload);
      
      console.log('✅ Algorithm optimization response:', {
        success: response.data.success,
        algorithm: response.data.algorithm,
        placesOptimized: response.data.route?.length,
        efficiency: response.data.metrics?.efficiency,
        hasAiInsights: !!response.data.aiInsights
      });

      // If optimization is successful, prepare data for potential detailed plan generation
      if (response.data.success && response.data.route) {
        // Store optimization result for detailed plan generation
        response.data._detailedPlanPayload = {
          places: response.data.route,
          preferences: payload.preferences || {},
          routeMetrics: response.data.metrics || {},
          algorithm: response.data.algorithm || 'unknown',
          constraints: payload.constraints || {}
        };
      }

      return response.data;
    } catch (error) {
      console.error('💥 Algorithm optimization failed:', error);
      throw new Error(`Route optimization failed: ${error.response?.data?.message || error.message}`);
    }
  },

  // TRIP PLANNING API - Enhanced
  async createTripWithDetailedPlan(tripData) {
    try {
      // First optimize the route
      const optimizedResult = await this.optimizeRouteWithAlgorithm(tripData);
      
      if (optimizedResult.success) {
        // Then generate detailed plan
        const detailedPlan = await this.generateDetailedTripPlan(optimizedResult._detailedPlanPayload);
        
        // Combine both results
        return {
          success: true,
          optimizedRoute: optimizedResult,
          detailedPlan: detailedPlan.data,
          combined: true
        };
      }
      
      return optimizedResult;
    } catch (error) {
      throw new Error(`Complete trip creation failed: ${error.message}`);
    }
  },

  // Enhanced trip optimization with detailed plan option
  async optimizeTrip(payload, includeDetailedPlan = false) {
    try {
      const response = await apiClient.post('/trips/optimize', payload);
      
      if (includeDetailedPlan && response.data.success) {
        try {
          const detailedPlan = await this.generateDetailedTripPlan({
            places: response.data.route || [],
            preferences: payload.preferences || {},
            routeMetrics: response.data.metrics || {},
            algorithm: response.data.algorithm || 'unknown'
          });
          
          response.data.detailedPlan = detailedPlan.data;
        } catch (detailError) {
          console.warn('Failed to generate detailed plan:', detailError);
          // Continue without detailed plan
        }
      }
      
      return response.data;
    } catch (error) {
      throw new Error(`Trip optimization failed: ${error.response?.data?.message || error.message}`);
    }
  },

  // UTILITY FUNCTIONS
  isOnline() {
    return navigator.onLine;
  },

  async testConnection() {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      return false;
    }
  },

  // Cache management
  clearCache() {
    // Clear any cached data if needed
    console.log('🗑️ API cache cleared');
  },

  // Debug information
  getDebugInfo() {
    return {
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      maxRetries: MAX_RETRIES,
      isOnline: navigator.onLine,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  }
};

// Enhanced error handling for trip planning
export const handleTripPlanningError = (error) => {
  if (error.message.includes('Gemini')) {
    return {
      type: 'AI_ERROR',
      message: 'AI service is temporarily unavailable. Using fallback planning.',
      fallbackAvailable: true
    };
  }
  
  if (error.message.includes('optimization')) {
    return {
      type: 'OPTIMIZATION_ERROR',
      message: 'Route optimization failed. Please try with fewer places.',
      suggestion: 'Reduce the number of selected places or adjust time constraints.'
    };
  }
  
  if (error.message.includes('timeout')) {
    return {
      type: 'TIMEOUT_ERROR',
      message: 'Request timed out. Please try again.',
      suggestion: 'Check your internet connection and try again.'
    };
  }
  
  return {
    type: 'GENERAL_ERROR',
    message: error.message || 'Something went wrong. Please try again.',
    suggestion: 'Please try again or contact support if the problem persists.'
  };
};

// Trip planning utilities
export const tripPlanningUtils = {
  // Validate trip data before sending to API
  validateTripData(data) {
    const errors = [];
    
    if (!data.places || !Array.isArray(data.places) || data.places.length === 0) {
      errors.push('At least one place must be selected');
    }
    
    if (data.places && data.places.length > 20) {
      errors.push('Maximum 20 places allowed');
    }
    
    if (data.preferences?.startTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.preferences.startTime)) {
      errors.push('Invalid start time format');
    }
    
    if (data.constraints?.totalTimeAvailable && (data.constraints.totalTimeAvailable < 120 || data.constraints.totalTimeAvailable > 1440)) {
      errors.push('Time available must be between 2-24 hours');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Format trip data for API
  formatTripDataForAPI(places, settings) {
    return {
      places: places.map(place => ({
        id: place.id,
        name: place.name,
        category: place.category || 'attraction',
        location: {
          latitude: parseFloat(place.location.latitude),
          longitude: parseFloat(place.location.longitude)
        },
        averageVisitDuration: parseInt(place.averageVisitDuration) || 90,
        rating: parseFloat(place.rating) || 3.5,
        city: place.city || 'Unknown',
        state: place.state || 'Unknown',
        entryFee: place.entryFee || { indian: 0, foreign: 0 },
        description: place.description || '',
        amenities: place.amenities || [],
        bestTimeToVisit: place.bestTimeToVisit || ['morning']
      })),
      preferences: {
        startTime: settings.startTime,
        optimizationLevel: settings.optimizationLevel,
        optimizeFor: settings.preferences?.optimizeFor || 'balanced',
        ...settings.preferences
      },
      constraints: {
        totalTimeAvailable: settings.totalTimeAvailable,
        startDay: new Date().getDay(),
        startLocation: settings.constraints?.startLocation || {
          name: 'Coimbatore Tidal Park',
          latitude: 11.0638,
          longitude: 77.0596
        },
        ...settings.constraints
      }
    };
  },

  // Calculate trip statistics
  calculateTripStats(places) {
    if (!places || places.length === 0) {
      return {
        totalPlaces: 0,
        categories: [],
        cities: [],
        averageRating: 0,
        totalDuration: 0,
        estimatedCost: 0
      };
    }

    const categories = [...new Set(places.map(p => p.category))];
    const cities = [...new Set(places.map(p => p.city))];
    const averageRating = places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length;
    const totalDuration = places.reduce((sum, p) => sum + (p.averageVisitDuration || 90), 0);
    const estimatedCost = places.reduce((sum, p) => sum + (p.entryFee?.indian || p.entryFee?.amount || 0), 0);

    return {
      totalPlaces: places.length,
      categories,
      cities,
      averageRating: Math.round(averageRating * 10) / 10,
      totalDuration,
      estimatedCost
    };
  },

  // Format route metrics for display
  formatRouteMetrics(metrics) {
    if (!metrics) return {};

    return {
      totalTime: Math.ceil((metrics.totalTime || 0) / 60) + ' hours',
      totalDistance: (metrics.totalDistance || 0).toFixed(1) + ' km',
      efficiency: (metrics.efficiency || 0).toFixed(1) + '%',
      placesVisited: metrics.placesVisited || 0,
      estimatedCost: '₹' + (metrics.totalCost || 0)
    };
  }
};

// Export enhanced API client configuration
export const enhancedApiConfig = {
  ...apiClient.defaults,
  timeout: 45000, // Increased timeout for detailed plan generation
  retries: 2,
  retryDelay: 1000
};

// Detailed plan generation status tracking
export const detailedPlanStatus = {
  IDLE: 'idle',
  GENERATING: 'generating',
  SUCCESS: 'success',
  ERROR: 'error',
  FALLBACK: 'fallback'
};

// Export axios instance for direct use if needed
export { apiClient };

// Export API base URL for other modules
export { API_BASE_URL };