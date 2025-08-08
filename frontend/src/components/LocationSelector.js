// frontend/src/components/LocationSelector.js
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Clock, 
  IndianRupee,
  Users,
  Accessibility,
  CarIcon, CompassIcon,
  X,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { PLACE_CATEGORIES, SOUTH_INDIAN_STATES, UTILS } from '../utils/constants';
import toast from 'react-hot-toast';

const LocationSelector = ({
  places,
  selectedPlaces,
  onPlaceSelect,
  onOptimizeRoute,
  onClearSelection,
  isLoading,
  error
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [priceFilter, setPriceFilter] = useState('all');
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState(false);
  const [wheelchairAccessibleOnly, setWheelchairAccessibleOnly] = useState(false);

  // Filter and sort places
  const filteredPlaces = useMemo(() => {
    let filtered = [...places];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchLower) ||
        place.description.toLowerCase().includes(searchLower) ||
        place.city.toLowerCase().includes(searchLower) ||
        place.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }

    // State filter
    if (selectedState !== 'all') {
      filtered = filtered.filter(place => place.state === selectedState);
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(place => {
        const fee = place.entryFee?.indian || 0;
        switch (priceFilter) {
          case 'free': return fee === 0;
          case 'low': return fee > 0 && fee <= 50;
          case 'medium': return fee > 50 && fee <= 200;
          case 'high': return fee > 200;
          default: return true;
        }
      });
    }

    // Accessibility filters
    if (kidFriendlyOnly) {
      filtered = filtered.filter(place => place.kidFriendly);
    }

    if (wheelchairAccessibleOnly) {
      filtered = filtered.filter(place => place.wheelchairAccessible);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return a.averageVisitDuration - b.averageVisitDuration;
        case 'price':
          return (a.entryFee?.indian || 0) - (b.entryFee?.indian || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    places, 
    searchTerm, 
    selectedCategory, 
    selectedState, 
    sortBy, 
    priceFilter,
    kidFriendlyOnly,
    wheelchairAccessibleOnly
  ]);

  const handlePlaceToggle = (place) => {
    const isSelected = selectedPlaces.some(p => p.id === place.id);
    onPlaceSelect(place, !isSelected);
    
    toast.success(
      isSelected ? 
        `${place.name} removed from selection` : 
        `${place.name} added to selection`
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedState('all');
    setSortBy('rating');
    setPriceFilter('all');
    setKidFriendlyOnly(false);
    setWheelchairAccessibleOnly(false);
    setShowFilters(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedState !== 'all') count++;
    if (priceFilter !== 'all') count++;
    if (kidFriendlyOnly) count++;
    if (wheelchairAccessibleOnly) count++;
    return count;
  };

  if (error) {
    return (
      <div className="location-selector error">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="location-selector">
      {/* Header */}
      <div className="selector-header">
        <div className="header-title">
          <h3>Select Places</h3>
          <span className="places-count">
            {filteredPlaces.length} of {places.length} places
          </span>
        </div>

        {/* Selection Summary */}
        {selectedPlaces.length > 0 && (
          <div className="selection-summary">
            <div className="selected-info">
              <CheckCircle2 className="selected-icon" />
              <span>{selectedPlaces.length} selected</span>
            </div>
            <button onClick={onClearSelection} className="clear-btn">
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="search-container">
        <div className="search-input-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search places, cities, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="clear-search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
        >
          <Filter size={16} />
          <span>Filters</span>
          {getActiveFilterCount() > 0 && (
            <span className="filter-count">{getActiveFilterCount()}</span>
          )}
          <ChevronDown className={`chevron ${showFilters ? 'rotated' : ''}`} />
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="rating">Sort by Rating</option>
          <option value="name">Sort by Name</option>
          <option value="duration">Sort by Duration</option>
          <option value="price">Sort by Price</option>
        </select>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            {/* Category Filter */}
            <div className="filter-group">
              <label>Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {Object.entries(PLACE_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div className="filter-group">
              <label>State:</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="filter-select"
              >
                <option value="all">All States</option>
                {Object.entries(SOUTH_INDIAN_STATES).map(([state, info]) => (
                  <option key={state} value={state}>
                    {info.code} - {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div className="filter-group">
              <label>Entry Fee:</label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Prices</option>
                <option value="free">Free (₹0)</option>
                <option value="low">Low (₹1-50)</option>
                <option value="medium">Medium (₹51-200)</option>
                <option value="high">High (₹200+)</option>
              </select>
            </div>
          </div>

          <div className="filter-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={kidFriendlyOnly}
                onChange={(e) => setKidFriendlyOnly(e.target.checked)}
              />
              <Users size={16} />
              <span>Kid Friendly Only</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={wheelchairAccessibleOnly}
                onChange={(e) => setWheelchairAccessibleOnly(e.target.checked)}
              />
              <Accessibility size={16} />
              <span>Wheelchair Accessible Only</span>
            </label>
          </div>

          <div className="filter-actions">
            <button onClick={clearAllFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Places List */}
      <div className="places-list">
        {isLoading ? (
          <div className="loading-places">
            <div className="loading-spinner"></div>
            <p>Loading places...</p>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="no-places">
            <div className="no-places-icon">🔍</div>
            <h4>No places found</h4>
            <p>Try adjusting your search or filters</p>
            {searchTerm || getActiveFilterCount() > 0 ? (
              <button onClick={clearAllFilters} className="reset-filters-btn">
                Reset Filters
              </button>
            ) : null}
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const isSelected = selectedPlaces.some(p => p.id === place.id);
            const category = PLACE_CATEGORIES[place.category];

            return (
              <div
                key={place.id}
                className={`place-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handlePlaceToggle(place)}
              >
                {/* Place Header */}
                <div className="place-header">
                  <div className="place-title">
                    <div className="place-category" style={{ color: category?.color }}>
                      {category?.icon}
                    </div>
                    <div className="place-info">
                      <h4>{place.name}</h4>
                      <p className="place-location">
                        <MapPin size={14} />
                        {place.city}, {place.state}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`selection-indicator ${isSelected ? 'selected' : ''}`}>
                    <CheckCircle2 size={20} />
                  </div>
                </div>

                {/* Place Meta */}
                <div className="place-meta">
                  <div className="meta-row">
                    {place.rating && (
                      <div className="meta-item">
                        <Star className="meta-icon" />
                        <span>{place.rating}</span>
                      </div>
                    )}
                    
                    <div className="meta-item">
                      <Clock className="meta-icon" />
                      <span>{UTILS.formatDuration(place.averageVisitDuration)}</span>
                    </div>
                    
                    <div className="meta-item">
                      <IndianRupee className="meta-icon" />
                      <span>
                        {place.entryFee?.indian === 0 ? 'Free' : `₹${place.entryFee?.indian}`}
                      </span>
                    </div>
                  </div>

                  <div className="accessibility-icons">
                    {place.kidFriendly && (
                      <div className="access-icon" title="Kid Friendly">
                        <Users size={14} />
                      </div>
                    )}
                    {place.wheelchairAccessible && (
                      <div className="access-icon" title="Wheelchair Accessible">
                        <Accessibility size={14} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Place Description */}
                <p className="place-description">
                  {place.description.length > 120
                    ? `${place.description.substring(0, 120)}...`
                    : place.description}
                </p>

                {/* Tags */}
                {place.tags && place.tags.length > 0 && (
                  <div className="place-tags">
                    {place.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      {selectedPlaces.length > 0 && (
        <div className="action-buttons">
          <div className="selection-info">
            <p>{selectedPlaces.length} places selected</p>
            <p className="estimated-time">
              Estimated time: {UTILS.formatDuration(
                selectedPlaces.reduce((sum, place) => sum + place.averageVisitDuration, 0)
              )}
            </p>
          </div>
          
          <button
            onClick={onOptimizeRoute}
            disabled={selectedPlaces.length < 2 || isLoading}
            className="optimize-btn"
          >
            <CarIcon size={18} />
            {isLoading ? 'Optimizing...' : 'Optimize Route'}
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;