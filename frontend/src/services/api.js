// API Service Layer for TourWithAI
import axios from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com/api'
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

// Export axios instance for direct use if needed
export { apiClient };

// Export API base URL for other modules
export { API_BASE_URL };