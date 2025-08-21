import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  MapPin,
  Star,
  Clock,
  DollarSign,
  Compass,
  Heart,
  Info
} from 'lucide-react';
import { apiService } from '../services/api';
import { CATEGORY_CONFIG } from '../utils/constants';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const PlacesPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Load places
  useEffect(() => {
    const loadPlaces = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }

      try {
        console.log('🏛️ Loading places for explorer...');
        const response = await apiService.getAllPlaces();
        
        if (response?.success && response?.places) {
          console.log(`✅ Loaded ${response.places.length} places`);
          setPlaces(response.places);
          setFilteredPlaces(response.places);
        }
      } catch (error) {
        console.error('❌ Failed to load places:', error);
        toast.error('Failed to load places');
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, [isConnected]);

  // Filter and sort places
  useEffect(() => {
    let filtered = [...places];

    // Apply favorites filter first
    if (showFavoritesOnly) {
      filtered = filtered.filter(place => favorites.has(place.id || place._id));
    }

    // Apply other filters
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }

    if (selectedState !== 'all') {
      filtered = filtered.filter(place => 
        place.state && place.state.toLowerCase().includes(selectedState.toLowerCase())
      );
    }

    if (minRating > 0) {
      filtered = filtered.filter(place => (place.rating || 0) >= minRating);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(search) ||
        place.city.toLowerCase().includes(search) ||
        place.state.toLowerCase().includes(search) ||
        (place.description && place.description.toLowerCase().includes(search)) ||
        (place.tags && place.tags.some(tag => tag.toLowerCase().includes(search)))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'duration':
          return (a.averageVisitDuration || 0) - (b.averageVisitDuration || 0);
        case 'city':
          return a.city.localeCompare(b.city);
        default:
          return (b.rating || 0) - (a.rating || 0);
      }
    });

    setFilteredPlaces(filtered);
  }, [places, selectedCategory, selectedState, minRating, searchTerm, sortBy, favorites, showFavoritesOnly]);

  // Get unique states and categories
  const getUniqueStates = () => {
    return [...new Set(places.map(place => place.state))].filter(Boolean).sort();
  };

  const getUniqueCategories = () => {
    return [...new Set(places.map(place => place.category))].filter(Boolean).sort();
  };

  // Toggle favorite
  const toggleFavorite = (placeId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(placeId)) {
        newFavorites.delete(placeId);
        toast('Removed from favorites', { icon: '💔' });
      } else {
        newFavorites.add(placeId);
        toast('Added to favorites', { icon: '❤️' });
      }
      return newFavorites;
    });
  };

  // Toggle favorites view
  const toggleFavoritesView = () => {
    setShowFavoritesOnly(!showFavoritesOnly);
    if (!showFavoritesOnly) {
      toast(`Showing ${favorites.size} favorite places`, { icon: '❤️' });
    } else {
      toast('Showing all places', { icon: '🏛️' });
    }
  };

  // Render place card
  const renderPlaceCard = (place) => {
    const categoryConfig = CATEGORY_CONFIG[place.category] || {};
    const isFavorite = favorites.has(place.id || place._id);

    if (viewMode === 'list') {
      return (
        <div key={place.id || place._id} className="bg-white rounded-lg border hover:shadow-md transition-all duration-200 p-6">
          <div className="flex flex-col md:flex-row md:space-x-6">
            
            {/* Place Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h3>
                  <div className="flex items-center text-gray-600 text-sm mb-2">
                    <MapPin size={14} className="mr-1" />
                    {place.city}, {place.state}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFavorite(place.id || place._id)}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500'
                  }`}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              {place.description && (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {place.description.length > 200
                    ? `${place.description.substring(0, 200)}...`
                    : place.description
                  }
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center text-yellow-600">
                  <Star size={14} className="mr-1" fill="currentColor" />
                  {place.rating || 'N/A'}
                </div>
                <div className="flex items-center text-blue-600">
                  <Clock size={14} className="mr-1" />
                  {place.averageVisitDuration || 'N/A'} min
                </div>
                <div className="flex items-center text-green-600">
                  <DollarSign size={14} className="mr-1" />
                  {place.entryFee?.indian === 0 ? 'Free' : `₹${place.entryFee?.indian || 'N/A'}`}
                </div>
                <div className="flex items-center text-purple-600">
                  <span className="mr-1">{categoryConfig.icon || '🏛️'}</span>
                  {categoryConfig.name || place.category}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Grid view
    return (
      <div key={place.id || place._id} className="bg-white rounded-lg border hover:shadow-lg transition-all duration-200 overflow-hidden">
        
        {/* Category header */}
        <div 
          className="h-2"
          style={{ backgroundColor: categoryConfig.color || '#6b7280' }}
        ></div>
        
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight">{place.name}</h3>
              <div className="flex items-center text-gray-600 text-sm">
                <MapPin size={12} className="mr-1" />
                {place.city}, {place.state}
              </div>
            </div>
            
            <button
              onClick={() => toggleFavorite(place.id || place._id)}
              className={`p-1 rounded-full transition-colors ${
                isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Category badge */}
          <div className="flex items-center mb-3">
            <span 
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: categoryConfig.color || '#6b7280' }}
            >
              <span className="mr-1">{categoryConfig.icon || '🏛️'}</span>
              {categoryConfig.name || place.category}
            </span>
          </div>

          {/* Description */}
          {place.description && (
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
              {place.description.length > 100
                ? `${place.description.substring(0, 100)}...`
                : place.description
              }
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-xs text-center border-t pt-3">
            <div className="text-yellow-600">
              <Star size={14} className="mx-auto mb-1" fill="currentColor" />
              <div className="font-medium">{place.rating || 'N/A'}</div>
            </div>
            <div className="text-blue-600">
              <Clock size={14} className="mx-auto mb-1" />
              <div className="font-medium">{place.averageVisitDuration || 'N/A'}m</div>
            </div>
            <div className="text-green-600">
              <DollarSign size={14} className="mx-auto mb-1" />
              <div className="font-medium">
                {place.entryFee?.indian === 0 ? 'Free' : `₹${place.entryFee?.indian || 'N/A'}`}
              </div>
            </div>
          </div>

          {/* Action button */}
          <button className="w-full mt-4 py-2 px-4 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium">
            <Info size={14} className="inline mr-1" />
            View Details
          </button>
        </div>
      </div>
    );
  };

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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Compass className="text-blue-600" size={32} />
                {showFavoritesOnly ? 'Your Favorite Places' : 'Explore South Indian Destinations'}
              </h1>
              <p className="text-gray-600 mt-2">
                {showFavoritesOnly 
                  ? `Your collection of ${favorites.size} favorite places to visit`
                  : 'Discover amazing temples, palaces, hill stations, and more across South India'
                }
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Favorites toggle button */}
              <button
                onClick={toggleFavoritesView}
                disabled={favorites.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showFavoritesOnly
                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                    : favorites.size === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                }`}
                title={favorites.size === 0 ? 'No favorites yet' : showFavoritesOnly ? 'Show all places' : 'Show only favorites'}
              >
                <Heart size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                <span className="font-medium">
                  {showFavoritesOnly ? 'Show All' : `Favorites (${favorites.size})`}
                </span>
              </button>

              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <List size={18} />
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
              >
                <Filter size={20} />
                Filters
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={showFavoritesOnly ? "Search your favorite places..." : "Search places, cities, or descriptions..."}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {getUniqueCategories().map(category => {
                      const config = CATEGORY_CONFIG[category];
                      return (
                        <option key={category} value={category}>
                          {config ? `${config.icon} ${config.name}` : category}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All States</option>
                    {getUniqueStates().map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="rating">Rating (High to Low)</option>
                    <option value="name">Name (A to Z)</option>
                    <option value="city">City (A to Z)</option>
                    <option value="duration">Duration (Short to Long)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Results</label>
                  <div className="flex items-center p-2 bg-blue-50 rounded-md border border-blue-200">
                    <Compass className="text-blue-600 mr-2" size={16} />
                    <span className="font-semibold text-blue-800">
                      {filteredPlaces.length} places
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner message="Loading amazing places..." size="large" />
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-16">
              {showFavoritesOnly ? (
                <>
                  <Heart className="mx-auto mb-4 text-gray-400" size={64} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorite places yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start exploring and heart the places you'd like to visit!
                  </p>
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Explore Places
                  </button>
                </>
              ) : (
                <>
                  <Compass className="mx-auto mb-4 text-gray-400" size={64} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No places found</h3>
                  <p className="text-gray-600">
                    Try adjusting your filters or search terms to find more places.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="p-6">
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-6'
              }>
                {filteredPlaces.map(renderPlaceCard)}
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && filteredPlaces.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              {showFavoritesOnly ? 'Favorites Summary' : 'Destination Summary'}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-800">
                  {getUniqueStates().length}
                </div>
                <div className="text-blue-600 text-sm">States Covered</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-800">
                  {getUniqueCategories().length}
                </div>
                <div className="text-green-600 text-sm">Categories</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-800">
                  {filteredPlaces.filter(p => (p.entryFee?.indian || 0) === 0).length}
                </div>
                <div className="text-purple-600 text-sm">Free Entry</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-800">
                  {favorites.size}
                </div>
                <div className="text-orange-600 text-sm">Total Favorites</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlacesPage;