import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Star, DollarSign, MessageSquare, Menu, X, ChevronRight, Globe, Route } from 'lucide-react';

// Mock API service (simplified)
const apiService = {
  getAllPlaces: async () => {
    return {
      data: [
        {
          id: '1', name: 'Meenakshi Temple', category: 'temple', city: 'Madurai',
          location: { latitude: 9.9195, longitude: 78.1193 },
          rating: 4.8, averageVisitDuration: 120, description: 'Historic Hindu temple with stunning architecture',
          entryFee: { indian: 0, foreign: 50 }, kidFriendly: true
        },
        {
          id: '2', name: 'Mysore Palace', category: 'palace', city: 'Mysore',
          location: { latitude: 12.3051, longitude: 76.6551 },
          rating: 4.6, averageVisitDuration: 90, description: 'Royal palace complex with rich history',
          entryFee: { indian: 70, foreign: 200 }, kidFriendly: true
        },
        {
          id: '3', name: 'Ooty Hill Station', category: 'hill-station', city: 'Ooty',
          location: { latitude: 11.4064, longitude: 76.6932 },
          rating: 4.4, averageVisitDuration: 300, description: 'Beautiful hill station with scenic views',
          entryFee: { indian: 0, foreign: 0 }, kidFriendly: true
        },
        {
          id: '4', name: 'Hampi Heritage Site', category: 'heritage', city: 'Hampi',
          location: { latitude: 15.3350, longitude: 76.4600 },
          rating: 4.7, averageVisitDuration: 240, description: 'UNESCO World Heritage site with ancient ruins',
          entryFee: { indian: 40, foreign: 600 }, kidFriendly: true
        },
        {
          id: '5', name: 'Marina Beach', category: 'beach', city: 'Chennai',
          location: { latitude: 13.0487, longitude: 80.2785 },
          rating: 4.2, averageVisitDuration: 150, description: 'World\'s second longest urban beach',
          entryFee: { indian: 0, foreign: 0 }, kidFriendly: true
        },
        {
          id: '6', name: 'Backwaters Alleppey', category: 'nature', city: 'Alleppey',
          location: { latitude: 9.4981, longitude: 76.3388 },
          rating: 4.5, averageVisitDuration: 360, description: 'Serene backwater cruises',
          entryFee: { indian: 500, foreign: 1000 }, kidFriendly: true
        }
      ]
    };
  },
  optimizeRoute: async (data) => {
    return {
      success: true,
      data: {
        optimizedRoute: data.selectedPlaces,
        itinerary: data.selectedPlaces.map((place, index) => ({
          place,
          order: index + 1,
          arrivalTime: `${9 + index * 2}:00`,
          departureTime: `${9 + index * 2 + Math.floor(place.averageVisitDuration / 60)}:00`,
          visitDuration: place.averageVisitDuration,
          travelTimeToNext: index < data.selectedPlaces.length - 1 ? 60 : 0
        })),
        totalTime: data.selectedPlaces.reduce((sum, p) => sum + p.averageVisitDuration, 0),
        totalDistance: data.selectedPlaces.length * 50
      }
    };
  },
  chatWithAI: async ({ message }) => {
    const responses = [
      "I'd recommend visiting temples early morning for peaceful experience and better lighting for photos.",
      "The weather is perfect for hill stations during this season! Don't forget to carry light jackets.",
      "Local cuisine is amazing in South India. Try the regional specialties at each destination.",
      "Beach visits are magical during sunset hours - plan accordingly for the best experience.",
      "Heritage sites often have guided tours available. They provide incredible historical insights!"
    ];
    return {
      reply: responses[Math.floor(Math.random() * responses.length)],
      suggestions: ['Tell me about timings', 'Best route suggestions', 'Local food recommendations']
    };
  }
};

// Navigation Component
const Navigation = ({ currentPage, onPageChange, isMenuOpen, setIsMenuOpen }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Globe },
    { id: 'planner', label: 'Trip Planner', icon: Route },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🗺️</div>
            <span className="text-xl font-bold text-gray-900">TourWithAI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  currentPage === id
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
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

// Home Page Component
const HomePage = ({ onPageChange }) => {
  const features = [
    {
      icon: Route,
      title: 'Smart Route Optimization',
      description: 'AI-powered algorithms find the most efficient paths between destinations, saving you time and travel costs.'
    },
    {
      icon: MessageSquare,
      title: 'AI Travel Assistant',
      description: 'Get personalized recommendations, local insights, and instant answers to all your travel questions.'
    },
    {
      icon: MapPin,
      title: 'Curated Destinations',
      description: 'Discover hidden gems and popular attractions across South India with detailed information and reviews.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
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
              Experience the perfect blend of technology and travel. Let our AI assistant craft personalized itineraries, 
              optimize your routes, and guide you through the cultural wonders of South India.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => onPageChange('planner')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
              >
                <Route size={20} />
                <span>Start Planning</span>
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

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose TourWithAI?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Revolutionary travel planning powered by artificial intelligence, designed to make your South Indian journey unforgettable.
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

// Graph Visualization Component
const TravelGraph = ({ places, selectedPlaces, onPlaceSelect, optimizedRoute }) => {
  const svgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(container.clientHeight, 500)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getNodePosition = (index, total) => {
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    const angle = (2 * Math.PI * index) / total;
    
    return {
      x: centerX + radius * Math.cos(angle - Math.PI / 2),
      y: centerY + radius * Math.sin(angle - Math.PI / 2)
    };
  };

  const categoryColors = {
    temple: '#f59e0b',
    palace: '#8b5cf6',
    'hill-station': '#10b981',
    beach: '#06b6d4',
    fort: '#ef4444',
    heritage: '#f97316',
    nature: '#22c55e'
  };

  const handleNodeClick = (place) => {
    const isSelected = selectedPlaces.some(p => p.id === place.id);
    onPlaceSelect(place, !isSelected);
  };

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50"
      >
        {/* Optimized route edges */}
        {optimizedRoute && optimizedRoute.length > 1 && optimizedRoute.map((place, index) => {
          const nextPlace = optimizedRoute[index + 1];
          if (!nextPlace) return null;
          
          const pos1 = getNodePosition(places.findIndex(p => p.id === place.id), places.length);
          const pos2 = getNodePosition(places.findIndex(p => p.id === nextPlace.id), places.length);
          
          return (
            <line
              key={`optimized-edge-${place.id}-${nextPlace.id}`}
              x1={pos1.x}
              y1={pos1.y}
              x2={pos2.x}
              y2={pos2.y}
              stroke="#dc2626"
              strokeWidth={4}
              opacity={0.8}
            />
          );
        })}

        {/* Nodes */}
        {places.map((place, index) => {
          const position = getNodePosition(index, places.length);
          const isSelected = selectedPlaces.some(p => p.id === place.id);
          const routeOrder = optimizedRoute?.findIndex(p => p.id === place.id);
          
          return (
            <g key={place.id}>
              <circle
                cx={position.x}
                cy={position.y}
                r={isSelected ? 28 : 22}
                fill={categoryColors[place.category] || '#6b7280'}
                stroke={isSelected ? '#1f2937' : '#fff'}
                strokeWidth={isSelected ? 3 : 2}
                opacity={isSelected ? 1 : 0.8}
                className="cursor-pointer transition-all duration-200 hover:scale-110"
                onClick={() => handleNodeClick(place)}
              />
              
              {routeOrder !== undefined && routeOrder !== -1 && (
                <text
                  x={position.x}
                  y={position.y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {routeOrder + 1}
                </text>
              )}
              
              <text
                x={position.x}
                y={position.y - 40}
                textAnchor="middle"
                fill="#1f2937"
                fontSize="12"
                fontWeight="600"
                pointerEvents="none"
              >
                {place.name.length > 15 ? place.name.substring(0, 15) + '...' : place.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Trip Planner Page
const TripPlannerPage = () => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllPlaces();
      setPlaces(response.data);
    } catch (error) {
      console.error('Error loading places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceSelection = (place, isSelected) => {
    if (isSelected) {
      setSelectedPlaces(prev => [...prev, place]);
    } else {
      setSelectedPlaces(prev => prev.filter(p => p.id !== place.id));
    }
  };

  const handleRouteOptimization = async () => {
    if (selectedPlaces.length < 2) return;
    
    try {
      setIsLoading(true);
      const response = await apiService.optimizeRoute({ selectedPlaces });
      
      if (response.success) {
        setOptimizedRoute(response.data.optimizedRoute);
        setItinerary(response.data.itinerary);
      }
    } catch (error) {
      console.error('Route optimization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && places.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip Planner</h1>
          <p className="text-gray-600">Select destinations and let AI optimize your route</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">
                Select Places ({selectedPlaces.length})
              </h3>
              
              <div className="max-h-96 overflow-y-auto space-y-3 mb-6">
                {places.map(place => {
                  const isSelected = selectedPlaces.some(p => p.id === place.id);
                  return (
                    <div
                      key={place.id}
                      onClick={() => handlePlaceSelection(place, !isSelected)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{place.name}</h4>
                          <p className="text-sm text-gray-600">{place.city}</p>
                          <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Star size={12} className="mr-1" />
                              {place.rating}
                            </span>
                            <span className="flex items-center">
                              <Clock size={12} className="mr-1" />
                              {Math.round(place.averageVisitDuration / 60)}h
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-blue-600 font-bold">✓</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleRouteOptimization}
                disabled={selectedPlaces.length < 2}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Optimize Route
              </button>
            </div>
          </div>

          {/* Graph Visualization */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Travel Network Graph</h3>
              <div className="h-96">
                <TravelGraph
                  places={places}
                  selectedPlaces={selectedPlaces}
                  onPlaceSelect={handlePlaceSelection}
                  optimizedRoute={optimizedRoute}
                />
              </div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Itinerary</h3>
              
              {!optimizedRoute || optimizedRoute.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Route className="mx-auto mb-3" size={32} />
                  <p className="text-sm">Select places and optimize route</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {itinerary.map((item, index) => (
                    <div key={item.place.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {item.order}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.place.name}</h4>
                        <p className="text-xs text-gray-600">{item.place.city}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.arrivalTime} - {item.departureTime}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chat Page Component
const ChatPage = () => {
  const [messages, setMessages] = useState([
    { 
      type: 'assistant', 
      text: "Hello! I'm your AI travel assistant for South India. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', text: userMessage, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      const response = await apiService.chatWithAI({ message: userMessage });
      setIsTyping(false);
      setMessages(prev => [...prev, { type: 'assistant', text: response.reply, timestamp: new Date() }]);
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        text: "Sorry, I'm having trouble responding right now. Please try again.", 
        timestamp: new Date() 
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Travel Assistant</h1>
          <p className="text-gray-600">Get personalized travel advice for South India</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-semibold">Travel Assistant</h3>
                <p className="text-blue-100 text-sm">Ready to help with your travel plans</p>
              </div>
            </div>
          </div>

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
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100">
            <div className="flex space-x-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask me about South India travel..."
                className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
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

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={setCurrentPage} />;
      case 'planner':
        return <TripPlannerPage />;
      case 'chat':
        return <ChatPage />;
      default:
        return <HomePage onPageChange={setCurrentPage} />;
    }
  };

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