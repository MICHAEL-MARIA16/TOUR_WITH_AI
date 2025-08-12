import axios from 'axios';
import { API_ENDPOINTS } from '../utils/constants';

// HTTP Status Codes constants
const HTTP_STATUS = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// Retry defaults
const DEFAULTS = {
    MAX_RETRIES: 3,
    RETRY_BASE_DELAY: 1000 // in milliseconds
};

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
    response => response.data,
    error => {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message || 'An unexpected error occurred');
    }
);

export const apiService = {
    // Places
    getAllPlaces: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`${API_ENDPOINTS.PLACES.GET_ALL}?${params}`);
        // This is the fix: we now correctly return the nested 'data' array.
        return response.data?.data || [];
    },
    getPlaceById: id => api.get(API_ENDPOINTS.PLACES.GET_BY_ID(id)),
    getPlaceStats: async () => {
        const response = await api.get(API_ENDPOINTS.PLACES.GET_STATS);
        return response.data;
    },

    // Trips
    getAllTrips: async () => api.get(API_ENDPOINTS.TRIPS.HISTORY),
    generateTrip: async (tripData) => {
        if (!tripData) throw new Error('Trip data is required');
        const response = await api.post(API_ENDPOINTS.TRIPS.GENERATE, tripData);
        return response.data;
    },
    optimizeTrip: async (routeData) => {
        if (!routeData?.placeIds?.length) throw new Error('Place IDs are required for optimization');
        const response = await api.post(API_ENDPOINTS.ROUTES.OPTIMIZE, routeData);
        return response.data;
    },
    getTripSuggestions: async (params = {}) => {
        return api.get(API_ENDPOINTS.TRIPS.SUGGESTIONS, { params });
    },
    getTripTemplates: async () => {
        const response = await api.get(API_ENDPOINTS.TRIPS.TEMPLATES);
        return response.data?.templates || [];
    },

    // Routes
    optimizeRoute: async (routeData) => {
        if (!routeData?.placeIds?.length) throw new Error('Place IDs are required for optimization');
        const response = await api.post(API_ENDPOINTS.ROUTES.OPTIMIZE, routeData);
        return response.data;
    },
    getSuggestedRoutes: async (params = {}) => {
        return api.get(API_ENDPOINTS.ROUTES.SUGGESTIONS, { params });
    },
    getDistanceBetweenPlaces: async (fromId, toId) => {
        if (!fromId || !toId) throw new Error('Both from and to place IDs are required');
        return api.get(API_ENDPOINTS.ROUTES.DISTANCE(fromId, toId));
    },
    getTravelMatrix: async (placeIds) => {
        if (!placeIds || !Array.isArray(placeIds)) throw new Error('Place IDs array is required');
        return api.post(API_ENDPOINTS.ROUTES.MATRIX, { placeIds });
    },

    // Chat/AI
    chatWithAI: async (message, context = {}) => {
        if (!message) throw new Error('Message is required');
        return api.post(API_ENDPOINTS.CHAT.MESSAGE, { message, context });
    },
    getTravelSuggestions: async (preferences) => {
        if (!preferences) throw new Error('Preferences are required');
        return api.post(API_ENDPOINTS.CHAT.SUGGESTIONS, preferences);
    },
    getPlaceInfo: async (placeId, question = '') => {
        if (!placeId) throw new Error('Place ID is required');
        return api.post(API_ENDPOINTS.CHAT.PLACE_INFO, { placeId, question });
    },

    // Health check
    healthCheck: async () => api.get('/health'),
};