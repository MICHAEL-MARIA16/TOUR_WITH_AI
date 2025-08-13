// services/api.js - Complete version with all chat methods

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('🌐 API Request:', url);
    console.log('📤 Request options:', options);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        // Try to parse error as JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || `HTTP ${response.status}: ${response.statusText}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
      
    } catch (error) {
      console.error('💥 API Error:', error);
      throw error;
    }
  }

  // Places API methods
  async getAllPlaces() {
    const response = await this.makeRequest('/places');
    
    if (response.success && Array.isArray(response.places)) {
      return response.places;
    }
    
    throw new Error('Invalid response structure from places API');
  }

  async getPlacesByCategory(category) {
    const response = await this.makeRequest(`/places/category/${category}`);
    return response;
  }

  async getNearbyPlaces(latitude, longitude, radius = 10) {
    const response = await this.makeRequest(`/places/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);
    return response;
  }

  // Route optimization methods
  async optimizeRoute(optimizationData) {
    console.log('🔄 Transforming optimization data:', optimizationData);
    
    // Validate required data
    if (!optimizationData.places || !Array.isArray(optimizationData.places)) {
      throw new Error('Place objects are required, not just IDs. Please pass full place objects.');
    }

    if (optimizationData.places.length < 2) {
      throw new Error('At least 2 places are required for route optimization.');
    }
    
    const requestData = {
      places: optimizationData.places,
      preferences: {
        startTime: optimizationData.startTime || '09:00',
        totalTimeAvailable: optimizationData.totalTimeAvailable || 480, // 8 hours in minutes
        optimizationLevel: optimizationData.optimizationLevel || 'fast'
      },
      userId: 'anonymous', // Default user
      algorithm: optimizationData.optimizationLevel === 'fast' ? 'greedy' : 'advanced'
    };
    
    console.log('📤 Sending to backend:', requestData);
    
    try {
      const response = await this.makeRequest('/trips/optimize', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      if (!response) {
        throw new Error('No response received from optimization service');
      }
      
      if (!response.success) {
        throw new Error(response.message || 'Optimization failed');
      }
      
      console.log('🔍 Full optimization response structure:', JSON.stringify(response, null, 2));
      
      return response;
      
    } catch (error) {
      console.error('💥 Optimization request failed:', error);
      throw error;
    }
  }

  // ✅ CHAT API METHODS - These were missing!
  async chatWithAI(message, context = {}) {
    const requestData = {
      message,
      context
    };

    try {
      const response = await this.makeRequest('/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      return response;
    } catch (error) {
      console.error('Chat API error:', error);
      // Return fallback response structure to match expected format
      return {
        success: true,
        data: {
          message: "I'm having trouble connecting right now. Please try asking your question again, or check if the backend server is running.",
          timestamp: new Date().toISOString(),
          fallback: true
        }
      };
    }
  }

  async getTravelSuggestions(preferences) {
    const requestData = {
      interests: preferences.interests || [],
      duration: preferences.duration || 'full-day',
      budget: preferences.budget || 'moderate',
      travelStyle: preferences.travelStyle || 'balanced',
      season: preferences.season || 'any'
    };

    try {
      const response = await this.makeRequest('/chat/suggestions', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      return response;
    } catch (error) {
      console.error('Travel suggestions API error:', error);
      return {
        success: true,
        data: {
          suggestions: "I'd be happy to suggest some places! South India has amazing temples like Meenakshi Temple in Madurai, beautiful hill stations like Ooty and Munnar, and historic sites like Hampi. Each offers unique experiences for different types of travelers.",
          fallback: true
        }
      };
    }
  }

  async getPlaceInfo(placeId, question = '') {
    const requestData = {
      placeId,
      question
    };

    try {
      const response = await this.makeRequest('/chat/place-info', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      return response;
    } catch (error) {
      console.error('Place info API error:', error);
      return {
        success: true,
        data: {
          information: "I'm unable to fetch detailed information about this place right now. You can try asking more specific questions, or check if the backend server is properly connected.",
          fallback: true
        }
      };
    }
  }

  // Utility methods
  async getPlaceStats() {
    return await this.makeRequest('/places/stats');
  }

  async healthCheck() {
    return await this.makeRequest('/health');
  }

  // Distance calculation
  async getDistanceMatrix(origins, destinations) {
    const requestData = {
      origins,
      destinations
    };

    const response = await this.makeRequest('/distance/matrix', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    return response;
  }

  // Trip management methods (for future use)
  async createTrip(tripData) {
    const response = await this.makeRequest('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
    return response;
  }

  async getTrips(userId) {
    const response = await this.makeRequest(`/trips?userId=${userId}`);
    return response;
  }

  async updateTrip(tripId, tripData) {
    const response = await this.makeRequest(`/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(tripData),
    });
    return response;
  }

  async deleteTrip(tripId) {
    const response = await this.makeRequest(`/trips/${tripId}`, {
      method: 'DELETE',
    });
    return response;
  }
}

export const apiService = new ApiService();