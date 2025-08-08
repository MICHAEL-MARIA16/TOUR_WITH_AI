// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'An unexpected error occurred');
  }
);

// API Service methods
export const apiService = {
  // Places API
  getAllPlaces: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    return api.get(`/places?${params.toString()}`);
  },

  getPlaceById: async (id) => {
    return api.get(`/places/${id}`);
  },

  getPlacesByCategory: async (category) => {
    return api.get(`/places/category/${category}`);
  },

  getPlacesByCity: async (city) => {
    return api.get(`/places/city/${city}`);
  },

  getNearbyPlaces: async (latitude, longitude, radius = 50) => {
    return api.get('/places/nearby', {
      params: { latitude, longitude, radius }
    });
  },

  getPlaceStats: async () => {
    return api.get('/places/stats');
  },

  checkPlaceOpenStatus: async (id, day, time) => {
    return api.get(`/places/${id}/status`, {
      params: { day, time }
    });
  },

  // Routes API
  optimizeRoute: async (routeData) => {
    return api.post('/routes/optimize', routeData);
  },

  getSuggestedRoutes: async (params = {}) => {
    return api.get('/routes/suggestions', { params });
  },

  getDistanceBetweenPlaces: async (fromPlaceId, toPlaceId) => {
    return api.get(`/routes/distance/${fromPlaceId}/${toPlaceId}`);
  },

  getTravelMatrix: async (placeIds) => {
    return api.post('/routes/matrix', { placeIds });
  },

  // Chat API
  chatWithAI: async (message, context = {}) => {
    return api.post('/chat', { message, context });
  },

  getTravelSuggestions: async (preferences) => {
    return api.post('/chat/suggestions', preferences);
  },

  getPlaceInfo: async (placeId, question = '') => {
    return api.post('/chat/place-info', { placeId, question });
  },

  // Health check
  healthCheck: async () => {
    return api.get('/health');
  }
};

// Utility functions for API calls
export const apiUtils = {
  // Handle API errors with user-friendly messages
  handleApiError: (error) => {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Unauthorized. Please log in again.';
        case 403:
          return 'Access denied.';
        case 404:
          return 'Requested resource not found.';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return message || 'An unexpected error occurred.';
      }
    } else if (error.request) {
      // Network error
      return 'Network error. Please check your internet connection.';
    } else {
      // Other error
      return error.message || 'An unexpected error occurred.';
    }
  },

  // Retry API call with exponential backoff
  retryApiCall: async (apiCall, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Cache API responses
  createCachedApiCall: (apiCall, cacheDuration = 5 * 60 * 1000) => { // 5 minutes default
    const cache = new Map();
    
    return async (...args) => {
      const cacheKey = JSON.stringify(args);
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        return cached.data;
      }
      
      const data = await apiCall(...args);
      cache.set(cacheKey, { data, timestamp: Date.now() });
      
      return data;
    };
  }
};

export default api;