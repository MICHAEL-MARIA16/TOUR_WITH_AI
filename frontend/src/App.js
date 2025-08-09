import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Star, DollarSign, MessageSquare, Menu, X, ChevronRight, Globe, Route, CheckCircle2, Target, Send, Filter, Calendar, Users, Wallet, Search, Loader, AlertCircle, ArrowRight, Navigation as NavigationIcon } from 'lucide-react';

// Updated API Service with proper trip endpoints
const apiService = {
  baseURL: 'http://localhost:5000/api',

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  },

  // Places API
  async getAllPlaces(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.append(key, value);
    });
    
    const queryString = params.toString();
    return this.makeRequest(`/places${queryString ? '?' + queryString : ''}`);
  },

  async getPlacesByCategory(category) {
    return this.makeRequest(`/places/category/${category}`);
  },

  // Trip Planning API (using your new endpoints)
  async generateTrip(preferences, constraints = {}) {
    return this.makeRequest('/trips/generate', {
      method: 'POST',
      body: JSON.stringify({
        preferences,
        constraints,
        algorithm: 'advanced-greedy'
      })
    });
  },

  async optimizeTrip(places, constraints = {}) {
    return this.makeRequest('/trips/optimize', {
      method: 'POST',
      body: JSON.stringify({
        places,
        constraints,
        algorithm: 'genetic'
      })
    });
  },

  async getTripSuggestions(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.makeRequest(`/trips/suggestions${queryParams ? '?' + queryParams : ''}`);
  },

  async getTripTemplates() {
    return this.makeRequest('/trips/templates');
  },

  async validateTrip(places, constraints) {
    return this.makeRequest('/trips/validate', {
      method: 'POST',
      body: JSON.stringify({ places, constraints })
    });
  },

  // Chat API
  async chatWithAI(message, context = {}) {
    return this.makeRequest('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  },

  // Health check
  async healthCheck() {
    return this.makeRequest('/health');
  }
};

// Navigation Component
const Navigation = ({ currentPage, onPageChange, isMenuOpen, setIsMenuOpen }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Globe },
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'planner', label: 'Trip Planner', icon: Route },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🗺️</div>
            <div>
              <span className="text-xl font-bold text-gray-900">TourWithAI</span>
              <div className="text-xs text-gray-500">South India Explorer</div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentPage === id
                    ? 'text-blue-600 bg-blue-50 font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onPageChange(id);
                  setIsMenuOpen(false);
                }}
                className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-all duration-200 ${
                  currentPage === id
                    ? 'text-blue-600 bg-blue-50 font-medium border-r-4 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

// Connection Status Component
const ConnectionStatus = ({ isConnected, onRetry }) => {
  if (isConnected) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <AlertCircle className="text-yellow-600" size={20} />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800">Backend Server Not Connected</h3>
          <p className="text-yellow-700 text-sm mt-1">
            Make sure your backend server is running on http://localhost:5000
          </p>
        </div>
        <button
          onClick={onRetry}
          className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage = ({ onPageChange, isConnected }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (isConnected) {
          const response = await apiService.getAllPlaces();
          if (response.success) {
            setStats({
              totalPlaces: response.data.places.length,
              totalStates: [...new Set(response.data.places.map(p => p.state))].length,
              averageRating: (response.data.places.reduce((sum, p) => sum + (p.rating || 0), 0) / response.data.places.length).toFixed(1)
            });
          }
        } else {
          // Fallback stats
          setStats({
            totalPlaces: 25,
            totalStates: 4,
            averageRating: 4.5
          });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
        setStats({
          totalPlaces: 25,
          totalStates: 4,
          averageRating: 4.5
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [isConnected]);

  const features = [
    {
      icon: Route,
      title: 'Smart Route Optimization',
      description: 'AI-powered algorithms find the most efficient paths using advanced graph theory and real-time data.'
    },
    {
      icon: MessageSquare,
      title: 'AI Assistant',
      description: 'Get personalized recommendations powered by advanced AI technology.'
    },
    {
      icon: MapPin,
      title: '15+ Curated Destinations',
      description: 'Handpicked temples, palaces, hill stations and heritage sites across South India.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Discover South India with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {' '}AI Intelligence
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Experience perfect travel planning with advanced algorithms, AI assistance, and interactive trip management for South India's most beautiful destinations.
            </p>
            
            {stats && !loading && (
              <div className="flex flex-wrap justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalPlaces}</div>
                  <div className="text-sm text-gray-600">Places</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.totalStates}</div>
                  <div className="text-sm text-gray-600">States</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.averageRating}</div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => onPageChange('planner')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
              >
                <Route size={20} />
                <span>Start Trip Planning</span>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => onPageChange('chat')}
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2"
              >
                <MessageSquare size={20} />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Powered by Advanced Technology</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Cutting-edge algorithms and AI technology working together to create the perfect travel experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-200 group hover:border-blue-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Enhanced Trip Planner Component
const TripPlannerPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [tripResult, setTripResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState({
    category: 'all',
    budget: 'moderate',
    duration: 8
  });

  useEffect(() => {
    if (isConnected) {
      loadPlaces();
      loadTemplates();
    }
  }, [isConnected]);

  const loadPlaces = async () => {
    try {
      const response = await apiService.getAllPlaces(filters.category !== 'all' ? { category: filters.category } : {});
      if (response.success) {
        setPlaces(response.data.places);
      }
    } catch (error) {
      console.error('Error loading places:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await apiService.getTripTemplates();
      if (response.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const togglePlaceSelection = (place) => {
    setSelectedPlaces(prev => 
      prev.find(p => p.id === place.id)
        ? prev.filter(p => p.id !== place.id)
        : [...prev, place]
    );
  };

  const generateTrip = async () => {
    if (selectedPlaces.length < 2) {
      alert('Please select at least 2 places for trip planning');
      return;
    }

    setLoading(true);
    try {
      const preferences = {
        interests: [...new Set(selectedPlaces.map(p => p.category))],
        duration: filters.duration * 60,
        budget: filters.budget === 'low' ? 500 : filters.budget === 'moderate' ? 1000 : 2000
      };

      const response = await apiService.optimizeTrip(selectedPlaces, {
        timeConstraints: { maxDuration: filters.duration * 60 }
      });

      if (response.success) {
        setTripResult(response.data);
      }
    } catch (error) {
      console.error('Error generating trip:', error);
      alert('Error generating trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (template) => {
    try {
      const response = await apiService.getAllPlaces({ category: template.categories.join(',') });
      if (response.success) {
        const templatePlaces = response.data.places.slice(0, 5); // Limit to 5 places
        setSelectedPlaces(templatePlaces);
        setFilters(prev => ({ ...prev, duration: template.duration / 60 }));
      }
    } catch (error) {
      console.error('Error using template:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <ConnectionStatus isConnected={isConnected} onRetry={onRetry} />
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Route className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Trip Planner</h3>
            <p className="text-gray-600">Connect to the backend server to start planning your trip.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Trip Planner</h1>
          <p className="text-gray-600">Select destinations and let AI optimize your perfect route</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Place Selection */}
          <div className="lg:col-span-2">
            {/* Templates */}
            {templates && templates.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Trip Templates</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {templates && templates.slice(0, 4).map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      onClick={() => applyTemplate(template)}
                    >
                      <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{Math.floor(template.duration / 60)}h duration</span>
                        <span>₹{template.estimatedCost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="all">All Categories</option>
                    <option value="temple">Temples</option>
                    <option value="palace">Palaces</option>
                    <option value="hill-station">Hill Stations</option>
                    <option value="beach">Beaches</option>
                    <option value="heritage">Heritage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
                  <select
                    value={filters.budget}
                    onChange={(e) => setFilters(prev => ({ ...prev, budget: e.target.value }))}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="low">Low (₹500)</option>
                    <option value="moderate">Moderate (₹1000)</option>
                    <option value="high">High (₹2000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    value={filters.duration}
                    onChange={(e) => setFilters(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    min="4"
                    max="24"
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={loadPlaces}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>

            {/* Places Grid */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Select Places ({selectedPlaces.length} selected)
              </h3>
              {places && places.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {places && places.map((place) => (
                    <div
                      key={place.id}
                      onClick={() => togglePlaceSelection(place)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPlaces.find(p => p.id === place.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{place.name}</h4>
                        {selectedPlaces.find(p => p.id === place.id) && (
                          <CheckCircle2 className="text-blue-600" size={20} />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{place.city}, {place.state}</p>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <Star className="text-yellow-500" size={14} />
                          <span>{place.rating || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="text-green-500" size={14} />
                          <span>₹{place.entryFee?.indian || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No places found. Try adjusting your filters.</p>
              )}
            </div>
          </div>

          {/* Right Panel - Trip Summary */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Trip Summary</h3>
              
              {selectedPlaces.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {selectedPlaces.map((place, index) => (
                      <div key={place.id} className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-800">{place.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Places:</span>
                        <span className="font-medium">{selectedPlaces.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entry Fees:</span>
                        <span className="font-medium">
                          ₹{selectedPlaces.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{filters.duration}h</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generateTrip}
                    disabled={loading || selectedPlaces.length < 2}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        <span>Optimizing...</span>
                      </>
                    ) : (
                      <>
                        <Route size={16} />
                        <span>Generate Optimal Route</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">
                  Select at least 2 places to start planning your trip
                </p>
              )}

              {/* Trip Result */}
              {tripResult && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Optimized Itinerary</h4>
                  <div className="space-y-3">
                    {tripResult.optimizedRoute.map((place, index) => (
                      <div key={place.id} className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{place.name}</div>
                          <div className="text-xs text-gray-600">{place.city}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {tripResult.metrics && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Total Distance:</span>
                          <span className="font-medium">{Math.round(tripResult.metrics.totalDistance || 0)} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Time:</span>
                          <span className="font-medium">{Math.round((tripResult.metrics.totalTime || 0) / 60)} hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Algorithm:</span>
                          <span className="font-medium">{tripResult.algorithm || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Chat Component
const ChatPage = ({ isConnected, onRetry }) => {
  const [messages, setMessages] = useState([
    { 
      type: 'assistant', 
      text: "🙏 Namaste! I'm your AI travel assistant for South India. I can help you discover amazing places, plan routes, and answer questions about temples, palaces, hill stations, and more!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', text: userMessage, timestamp: new Date() }]);
    
    if (!isConnected) {
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          text: "I'd love to help you with that! However, I need to connect to the backend server to provide real-time AI assistance. Please ensure your server is running on http://localhost:5000.", 
          timestamp: new Date()
        }]);
      }, 1000);
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.chatWithAI(userMessage, {
        currentConversation: messages.slice(-5) // Send last 5 messages for context
      });

      if (response.success) {
        setMessages(prev => [...prev, {
          type: 'assistant',
          text: response.data.response || response.data.message || 'I received your message but had trouble processing it. Could you rephrase?',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        text: "I'm having trouble connecting right now. Please check if the backend server is running and try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <ConnectionStatus isConnected={isConnected} onRetry={onRetry} />
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Assistant</h3>
            <p className="text-gray-600">Connect to the backend server to chat with the AI assistant.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistant</h1>
          <p className="text-gray-600">Get personalized South India travel advice and recommendations</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <div className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Loader className="animate-spin" size={16} />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-600 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Show me temples in Tamil Nadu",
                "Plan a 2-day trip to Kerala",
                "Best hill stations to visit",
                "Budget-friendly places in Karnataka"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInput(suggestion)}
                  className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about places, routes, tips..."
                className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-400 hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Dashboard Component
const DashboardPage = ({ onPageChange, isConnected }) => {
  const [stats, setStats] = useState({
    totalTrips: 0,
    visitedPlaces: 0,
    totalDistance: 0,
    savedMoney: 0
  });
  const [recentPlaces, setRecentPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [isConnected]);

  const loadDashboardData = async () => {
    try {
      const response = await apiService.getAllPlaces();
      if (response.success) {
        setRecentPlaces(response.data.places.slice(0, 5));
        // Update stats based on real data
        setStats(prev => ({
          ...prev,
          visitedPlaces: response.data.places.length
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Dashboard</h1>
          <p className="text-gray-600">Your personalized travel command center</p>
        </div>

        {!isConnected && (
          <div className="mb-6">
            <ConnectionStatus isConnected={isConnected} onRetry={() => window.location.reload()} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Route className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalTrips}</div>
                <div className="text-sm text-gray-600">Total Trips</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <CheckCircle2 className="text-green-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.visitedPlaces}</div>
                <div className="text-sm text-gray-600">Available Places</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <NavigationIcon className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalDistance} km</div>
                <div className="text-sm text-gray-600">Distance Traveled</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                <Wallet className="text-yellow-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">₹{stats.savedMoney}</div>
                <div className="text-sm text-gray-600">Money Saved</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => onPageChange('planner')}
                  className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Route size={18} />
                  <span>Plan New Trip</span>
                </button>
                <button
                  onClick={() => onPageChange('chat')}
                  className="border border-gray-200 text-gray-700 p-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare size={18} />
                  <span>Ask AI Assistant</span>
                </button>
                <button className="border border-gray-200 text-gray-700 p-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                  <Search size={18} />
                  <span>Discover Places</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
              {isConnected && !loading ? (
                <div className="space-y-3">
                  {recentPlaces.map((place, index) => (
                    <div key={place.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <MapPin className="text-blue-600" size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{place.name}</div>
                        <div className="text-sm text-gray-600">{place.city}, {place.state}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  {loading ? (
                    <Loader className="animate-spin mx-auto mb-2" size={24} />
                  ) : (
                    <p className="text-gray-500">Connect to backend to see recent activity</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Backend Server</span>
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">AI Assistant</span>
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Trip Planner</span>
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tips & Updates</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🚀 New Features</h4>
                  <p className="text-sm text-blue-800">Try the new AI-powered trip optimization algorithms!</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">💡 Travel Tip</h4>
                  <p className="text-sm text-green-800">Visit temples early morning for a peaceful experience.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);

  const checkConnection = async () => {
    try {
      await apiService.healthCheck();
      setIsConnected(true);
    } catch (error) {
      console.error('Backend connection failed:', error);
      setIsConnected(false);
    } finally {
      setConnectionChecked(true);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setConnectionChecked(false);
    checkConnection();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={setCurrentPage} isConnected={isConnected} />;
      case 'dashboard':
        return <DashboardPage onPageChange={setCurrentPage} isConnected={isConnected} />;
      case 'planner':
        return <TripPlannerPage isConnected={isConnected} onRetry={handleRetry} />;
      case 'chat':
        return <ChatPage isConnected={isConnected} onRetry={handleRetry} />;
      default:
        return <HomePage onPageChange={setCurrentPage} isConnected={isConnected} />;
    }
  };

  if (!connectionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting to TourWithAI</h2>
          <p className="text-gray-600">Checking backend server connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      {renderPage()}
    </div>
  );
};

export default App;