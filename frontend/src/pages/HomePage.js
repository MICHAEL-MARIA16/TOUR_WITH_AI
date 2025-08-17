import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  MessageCircle, 
  Map, 
  Zap, 
  Star, 
  MapPin, 
  Clock, 
  Users,
  Compass,
  TrendingUp,
  Shield,
  Globe
} from 'lucide-react';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConnectionStatus from '../components/ConnectionStatus';

const HomePage = ({ isConnected, onRetry }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load basic statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiService.getPlaceStats();
        if (response.success) {
          setStats(response.stats);
        }
      } catch (error) {
        console.error('Failed to load statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <ConnectionStatus isConnected={isConnected} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Brain className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                    Tour With AI
                  </h1>
                  <p className="text-xl text-blue-100 mt-2">
                    Discover South India with AI Intelligence
                  </p>
                </div>
              </div>

              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                Experience the power of advanced AI algorithms to plan your perfect South Indian adventure. 
                From ancient temples to pristine beaches, let artificial intelligence craft your ideal journey 
                through Tamil Nadu, Kerala, Karnataka, and beyond.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/trip-planner"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Zap className="mr-2" size={20} />
                  Start Your Trip
                </Link>
                <Link
                  to="/ai-assistant"
                  className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-700 transition-all duration-200"
                >
                  <MessageCircle className="mr-2" size={20} />
                  AI Assistant
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 flex items-center space-x-6 text-sm text-blue-200">
                <div className="flex items-center space-x-2">
                  <Shield size={16} />
                  <span>Free to Use</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe size={16} />
                  <span>No API Keys Required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain size={16} />
                  <span>AI Powered</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Stats */}
            <div className="lg:pl-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold mb-6">Powered by Advanced AI</h3>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="medium" />
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/10 rounded-lg">
                      <div className="text-3xl font-bold text-white">{stats.totalPlaces || 0}</div>
                      <div className="text-blue-200 text-sm">Places</div>
                    </div>
                    <div className="text-center p-4 bg-white/10 rounded-lg">
                      <div className="text-3xl font-bold text-white">{stats.averageRating || '4.5'}</div>
                      <div className="text-blue-200 text-sm">Avg Rating</div>
                    </div>
                    <div className="text-center p-4 bg-white/10 rounded-lg">
                      <div className="text-3xl font-bold text-white">{stats.totalStates || 5}</div>
                      <div className="text-blue-200 text-sm">States</div>
                    </div>
                    <div className="text-center p-4 bg-white/10 rounded-lg">
                      <div className="text-3xl font-bold text-white">{stats.totalCategories || 10}</div>
                      <div className="text-blue-200 text-sm">Categories</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-200">
                    Statistics loading...
                  </div>
                )}

                <div className="mt-6 text-center">
                  <div className="text-sm text-blue-200 mb-2">Algorithm Status</div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 font-medium">AI Optimization Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Travel Planning
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of travel planning with advanced artificial intelligence 
              that optimizes your South Indian journey for maximum enjoyment and efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Trip Planner Feature */}
            <div className="group p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="p-3 bg-blue-600 rounded-xl w-fit mb-6 group-hover:bg-blue-700 transition-colors">
                <Brain className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Trip Planner</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Advanced optimization algorithms analyze thousands of combinations to create 
                your perfect route through South India's most beautiful destinations.
              </p>
              <Link
                to="/trip-planner"
                className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Start Planning <TrendingUp className="ml-2" size={16} />
              </Link>
            </div>

            {/* AI Assistant Feature */}
            <div className="group p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="p-3 bg-green-600 rounded-xl w-fit mb-6 group-hover:bg-green-700 transition-colors">
                <MessageCircle className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Travel Guide</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Chat with your personal AI assistant that knows South India like a local. 
                Get instant recommendations, cultural insights, and travel tips.
              </p>
              <Link
                to="/ai-assistant"
                className="inline-flex items-center text-green-600 font-semibold hover:text-green-700 transition-colors"
              >
                Chat Now <MessageCircle className="ml-2" size={16} />
              </Link>
            </div>

            {/* Interactive Map Feature */}
            <div className="group p-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="p-3 bg-purple-600 rounded-xl w-fit mb-6 group-hover:bg-purple-700 transition-colors">
                <Map className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Interactive Maps</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Explore South India on beautiful OpenStreetMap-powered interactive maps. 
                Visualize routes, discover nearby places, and navigate with confidence.
              </p>
              <Link
                to="/map"
                className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700 transition-colors"
              >
                Explore Map <Map className="ml-2" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How AI Optimization Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our advanced algorithms analyze multiple factors to create the most efficient 
              and enjoyable travel routes through South India.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-6">
                <MapPin className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Select Places</h3>
              <p className="text-gray-600">
                Choose from our curated collection of South India's most beautiful destinations
              </p>
            </div>

            <div className="text-center">
              <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-6">
                <Brain className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Analysis</h3>
              <p className="text-gray-600">
                Our algorithms analyze distances, ratings, opening hours, and your preferences
              </p>
            </div>

            <div className="text-center">
              <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-6">
                <Zap className="text-purple-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Optimization</h3>
              <p className="text-gray-600">
                Advanced genetic and greedy algorithms find the most efficient route
              </p>
            </div>

            <div className="text-center">
              <div className="p-4 bg-orange-100 rounded-full w-fit mx-auto mb-6">
                <Star className="text-orange-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Perfect Trip</h3>
              <p className="text-gray-600">
                Get a personalized itinerary with optimal timing and route planning
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Discover South India?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Join thousands of travelers who have used AI to plan their perfect South Indian adventure. 
            From the backwaters of Kerala to the temples of Tamil Nadu, your journey awaits.
          </p>
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
            <Link
              to="/trip-planner"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Brain className="mr-2" size={20} />
              Plan with AI
            </Link>
            <Link
              to="/places"
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-700 transition-all duration-200"
            >
              <Compass className="mr-2" size={20} />
              Explore Places
            </Link>
          </div>

          <div className="mt-8 text-sm text-blue-200">
            ✨ Completely free • No registration required • Powered by OpenStreetMap
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;