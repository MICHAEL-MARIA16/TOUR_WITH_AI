import React, { useState, useEffect } from 'react';
import { Route, MessageSquare, MapPin, ChevronRight, Loader } from 'lucide-react';
import { apiService } from '../services/api';

const HomePage = ({ onPageChange, isConnected }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        if (isConnected) {
          const response = await apiService.getPlaceStats();
          if (response.success) {
            setStats({
              totalPlaces: response.data.overview.totalPlaces,
              totalStates: response.data.overview.coverageStates,
              averageRating: response.data.overview.averageRating
            });
          }
        } else {
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
      title: '20 Curated Destinations',
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
            
            {stats && !loading ? (
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
            ) : (
                <div className="text-center">
                    <Loader className="animate-spin mx-auto text-gray-400" size={32} />
                    <p className="text-sm text-gray-500 mt-2">Loading stats...</p>
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

export default HomePage;