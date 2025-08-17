// backend/models/Place.js - FIXED VERSION WITH COMPLETE SCHEMA
const mongoose = require('mongoose');

// Location schema with 2dsphere indexing
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  }
}, { _id: false });

// Opening hours schema
const openingHoursSchema = new mongoose.Schema({
  monday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  },
  tuesday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  },
  wednesday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  },
  thursday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  },
  friday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  },
  saturday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  },
  sunday: {
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  }
}, { _id: false });

// Entry fee schema
const entryFeeSchema = new mongoose.Schema({
  indian: {
    type: Number,
    default: 0,
    min: 0
  },
  foreign: {
    type: Number,
    default: 0,
    min: 0
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Main Place schema
const placeSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 2000
  },
  location: {
    type: locationSchema,
    required: true
  },
  address: {
    type: String,
    trim: true,
    maxLength: 500
  },
  city: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  state: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    lowercase: true,
    enum: [
      'temple',
      'palace',
      'hill-station',
      'heritage',
      'beach',
      'wildlife',
      'nature',
      'fort',
      'museum',
      'park',
      'cultural',
      'adventure',
      'shopping',
      'restaurant',
      'accommodation',
      'transportation'
    ],
    index: true
  },
  openingHours: openingHoursSchema,
  averageVisitDuration: {
    type: Number,
    required: true,
    min: 15,
    max: 1440, // 24 hours max
    default: 90
  },
  entryFee: entryFeeSchema,
  amenities: [{
    type: String,
    trim: true
  }],
  bestTimeToVisit: [{
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'winter', 'summer', 'monsoon', 'year-round']
  }],
  kidFriendly: {
    type: Boolean,
    default: true
  },
  wheelchairAccessible: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 3.5
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  popularity: {
    type: Number,
    default: 0,
    min: 0
  },
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  website: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  weatherDependant: {
    type: Boolean,
    default: false
  },
  crowdLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
placeSchema.index({ location: '2dsphere' }); // Geospatial index for nearby searches
placeSchema.index({ category: 1, rating: -1 });
placeSchema.index({ city: 1, category: 1 });
placeSchema.index({ state: 1, category: 1 });
placeSchema.index({ rating: -1 });
placeSchema.index({ name: 'text', description: 'text', tags: 'text' }); // Text search

// Virtual for formatted rating
placeSchema.virtual('formattedRating').get(function() {
  return this.rating ? this.rating.toFixed(1) : '0.0';
});

// Virtual for visit duration in hours
placeSchema.virtual('visitHours').get(function() {
  return Math.round(this.averageVisitDuration / 60 * 10) / 10;
});

// Virtual for formatted entry fee
placeSchema.virtual('formattedEntryFee').get(function() {
  const fee = this.entryFee?.indian || this.entryFee?.amount || 0;
  return fee === 0 ? 'Free' : `₹${fee}`;
});

// Static method to find nearby places with distance
placeSchema.statics.findNearby = async function(latitude, longitude, radius, additionalFilters = {}) {
  try {
    const radiusInRadians = radius / 6371; // Earth radius in km
    
    const query = {
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians]
        }
      },
      isActive: true,
      ...additionalFilters
    };

    const places = await this.find(query).lean();

    // Calculate distances and add to results
    const placesWithDistance = places.map(place => {
      const distance = calculateDistance(
        latitude, longitude,
        place.location.latitude, place.location.longitude
      );
      
      return {
        ...place,
        distance: Math.round(distance * 100) / 100,
        distanceFormatted: `${Math.round(distance * 100) / 100} km`
      };
    });

    // Sort by distance
    placesWithDistance.sort((a, b) => a.distance - b.distance);

    return placesWithDistance;
  } catch (error) {
    console.error('Error in findNearby:', error);
    return this.find({ isActive: true, ...additionalFilters }).lean();
  }
};

// Static method for advanced search
placeSchema.statics.advancedSearch = async function(criteria) {
  const {
    categories = [],
    cities = [],
    states = [],
    minRating = 0,
    maxEntryFee = null,
    kidFriendly = null,
    wheelchairAccessible = null,
    searchText = null,
    sortBy = 'rating',
    sortOrder = 'desc',
    limit = 50,
    skip = 0
  } = criteria;

  let query = { isActive: true };

  // Category filter
  if (categories.length > 0) {
    query.category = { $in: categories.map(cat => cat.toLowerCase()) };
  }

  // Location filters
  if (cities.length > 0) {
    query.city = { $in: cities.map(city => new RegExp(city, 'i')) };
  }
  
  if (states.length > 0) {
    query.state = { $in: states.map(state => new RegExp(state, 'i')) };
  }

  // Rating filter
  if (minRating > 0) {
    query.rating = { $gte: minRating };
  }

  // Entry fee filter
  if (maxEntryFee !== null) {
    query.$or = [
      { 'entryFee.indian': { $lte: maxEntryFee } },
      { 'entryFee.amount': { $lte: maxEntryFee } },
      { 'entryFee.indian': { $exists: false } },
      { 'entryFee.amount': { $exists: false } }
    ];
  }

  // Accessibility filters
  if (kidFriendly === true) {
    query.kidFriendly = true;
  }
  
  if (wheelchairAccessible === true) {
    query.wheelchairAccessible = true;
  }

  // Text search
  if (searchText) {
    query.$text = { $search: searchText };
  }

  // Build sort criteria
  let sortCriteria = {};
  switch (sortBy) {
    case 'name':
      sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
      break;
    case 'rating':
      sortCriteria.rating = sortOrder === 'asc' ? 1 : -1;
      sortCriteria.reviewCount = -1; // Secondary sort
      break;
    case 'popularity':
      sortCriteria.popularity = sortOrder === 'asc' ? 1 : -1;
      break;
    case 'city':
      sortCriteria.city = sortOrder === 'asc' ? 1 : -1;
      sortCriteria.name = 1;
      break;
    case 'category':
      sortCriteria.category = sortOrder === 'asc' ? 1 : -1;
      sortCriteria.rating = -1;
      break;
    default:
      sortCriteria = { rating: -1, reviewCount: -1 };
  }

  return this.find(query)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit)
    .lean();
};

// Instance method to check if place is open
placeSchema.methods.isOpenAt = function(dayOfWeek, timeString) {
  if (!this.openingHours) return true;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  const schedule = this.openingHours[dayName];

  if (!schedule || schedule.closed) return false;
  if (!schedule.open || !schedule.close) return true;

  const currentTime = timeToMinutes(timeString);
  const openTime = timeToMinutes(schedule.open);
  const closeTime = timeToMinutes(schedule.close);

  if (closeTime > openTime) {
    return currentTime >= openTime && currentTime <= closeTime;
  } else {
    // Handle overnight hours
    return currentTime >= openTime || currentTime <= closeTime;
  }
};

// Pre-save middleware
placeSchema.pre('save', function(next) {
  // Generate ID if not provided
  if (!this.id) {
    this.id = this.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  // Ensure required fields have defaults
  if (!this.rating) this.rating = 3.5;
  if (!this.averageVisitDuration) this.averageVisitDuration = 90;
  if (!this.entryFee) this.entryFee = { indian: 0, foreign: 0 };

  next();
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to convert time to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

module.exports = mongoose.model('Place', placeSchema);