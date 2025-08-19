// backend/models/Place.js - ENHANCED WITH BETTER ID HANDLING

const mongoose = require('mongoose');

// Location schema with validation
const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Latitude must be a valid number between -90 and 90'
    }
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Longitude must be a valid number between -180 and 180'
    }
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
  student: {
    type: Number,
    default: 0,
    min: 0
  },
  senior: {
    type: Number,
    default: 0,
    min: 0
  },
  camera: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  }
}, { _id: false });

// Opening hours schema for each day
const dayScheduleSchema = new mongoose.Schema({
  open: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: '06:00'
  },
  close: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: '18:00'
  },
  closed: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const openingHoursSchema = new mongoose.Schema({
  monday: { type: dayScheduleSchema, default: {} },
  tuesday: { type: dayScheduleSchema, default: {} },
  wednesday: { type: dayScheduleSchema, default: {} },
  thursday: { type: dayScheduleSchema, default: {} },
  friday: { type: dayScheduleSchema, default: {} },
  saturday: { type: dayScheduleSchema, default: {} },
  sunday: { type: dayScheduleSchema, default: {} }
}, { _id: false });

// Main Place schema with enhanced ID handling
const placeSchema = new mongoose.Schema({
  // Primary identifier - can be ObjectId or custom string
  id: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values to be unique
    index: true
  },
  
  // URL-friendly slug for easy searching
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Basic information
  name: {
    type: String,
    required: [true, 'Place name is required'],
    trim: true,
    maxLength: [200, 'Name cannot exceed 200 characters'],
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxLength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    lowercase: true,
    enum: {
      values: [
        'temple', 'palace', 'fort', 'heritage', 'museum', 'park', 'garden',
        'beach', 'hill-station', 'waterfall', 'lake', 'wildlife', 'zoo',
        'shopping', 'market', 'restaurant', 'viewpoint', 'cultural',
        'adventure', 'entertainment', 'nature', 'religious', 'historical'
      ],
      message: 'Invalid category. Please choose from the available options.'
    },
    index: true
  },
  
  // Location details
  location: {
    type: locationSchema,
    required: [true, 'Location coordinates are required'],
    index: '2dsphere' // For geospatial queries
  },
  
  address: {
    street: String,
    area: String,
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    district: String,
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true
    },
    pincode: {
      type: String,
      match: /^[1-9][0-9]{5}$/
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Visit information
  averageVisitDuration: {
    type: Number,
    required: [true, 'Average visit duration is required'],
    min: [15, 'Visit duration must be at least 15 minutes'],
    max: [1440, 'Visit duration cannot exceed 24 hours'],
    default: 90
  },
  
  bestTimeToVisit: [{
    type: String,
    enum: ['early-morning', 'morning', 'afternoon', 'evening', 'night', 'sunset', 'sunrise'],
    default: ['morning']
  }],
  
  // Ratings and reviews
  rating: {
    type: Number,
    min: [1, 'Rating must be between 1 and 5'],
    max: [5, 'Rating must be between 1 and 5'],
    default: 3.5,
    get: v => Math.round(v * 10) / 10 // Round to 1 decimal place
  },
  
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Financial information
  entryFee: {
    type: entryFeeSchema,
    default: () => ({ indian: 0, foreign: 0 })
  },
  
  // Timing and availability
  openingHours: {
    type: openingHoursSchema,
    default: () => ({})
  },
  
  seasonalInfo: {
    bestMonths: [{
      type: String,
      enum: ['january', 'february', 'march', 'april', 'may', 'june',
             'july', 'august', 'september', 'october', 'november', 'december']
    }],
    avoid: [{
      type: String,
      enum: ['january', 'february', 'march', 'april', 'may', 'june',
             'july', 'august', 'september', 'october', 'november', 'december']
    }],
    peakSeason: {
      start: String,
      end: String
    }
  },
  
  // Accessibility and amenities
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    elevatorAvailable: {
      type: Boolean,
      default: false
    },
    restrooms: {
      type: Boolean,
      default: false
    },
    parkingAvailable: {
      type: Boolean,
      default: false
    },
    guidedToursAvailable: {
      type: Boolean,
      default: false
    }
  },
  
  amenities: [{
    type: String,
    enum: [
      'parking', 'restrooms', 'food-court', 'gift-shop', 'wifi',
      'audio-guide', 'wheelchair-access', 'elevator', 'air-conditioning',
      'prayer-hall', 'meditation-area', 'photography-allowed',
      'security', 'first-aid', 'water-fountain', 'seating-area'
    ]
  }],
  
  // Family and group information
  suitableFor: {
    families: {
      type: Boolean,
      default: true
    },
    couples: {
      type: Boolean,
      default: true
    },
    soloTravelers: {
      type: Boolean,
      default: true
    },
    groups: {
      type: Boolean,
      default: true
    },
    children: {
      type: Boolean,
      default: true
    },
    elderly: {
      type: Boolean,
      default: true
    }
  },
  
  kidFriendly: {
    type: Boolean,
    default: true
  },
  
  wheelchairAccessible: {
    type: Boolean,
    default: false
  },
  
  // Content and media
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
    maxLength: 50
  }],
  
  // Administrative fields
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  verified: {
    type: Boolean,
    default: false
  },
  
  lastVerified: Date,
  
  // Search and SEO
  searchKeywords: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  
  bookmarks: {
    type: Number,
    default: 0
  },
  
  // Data source tracking
  dataSource: {
    type: String,
    enum: ['manual', 'api', 'scraping', 'user-submission', 'bulk-import'],
    default: 'manual'
  },
  
  externalIds: {
    googlePlaceId: String,
    tripadvisorId: String,
    wikiDataId: String,
    governmentId: String
  },
  
  // Content moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs-review'],
    default: 'approved'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Indexes for better query performance
placeSchema.index({ name: 'text', description: 'text', tags: 'text' });
placeSchema.index({ category: 1, city: 1 });
placeSchema.index({ rating: -1, reviewCount: -1 });
placeSchema.index({ 'location': '2dsphere' });
placeSchema.index({ isActive: 1, category: 1 });
placeSchema.index({ slug: 1 });
placeSchema.index({ id: 1 });
placeSchema.index({ city: 1, state: 1 });

// Virtual properties
placeSchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address?.street) parts.push(this.address.street);
  if (this.address?.area) parts.push(this.address.area);
  if (this.address?.city) parts.push(this.address.city);
  if (this.address?.state) parts.push(this.address.state);
  if (this.address?.pincode) parts.push(this.address.pincode);
  return parts.join(', ');
});

placeSchema.virtual('visitDurationFormatted').get(function() {
  const duration = this.averageVisitDuration || 0;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
});

placeSchema.virtual('entryFeeFormatted').get(function() {
  const fee = this.entryFee?.indian || 0;
  return fee === 0 ? 'Free' : `₹${fee}`;
});

placeSchema.virtual('coordinates').get(function() {
  return [this.location.longitude, this.location.latitude]; // GeoJSON format
});

placeSchema.virtual('primaryImage').get(function() {
  const primary = this.images?.find(img => img.isPrimary);
  return primary?.url || (this.images?.[0]?.url);
});

// Instance methods

// ENHANCED: Find by flexible ID - handles both ObjectId and string IDs
placeSchema.statics.findByFlexibleId = async function(id) {
  if (!id) return null;
  
  const searches = [];
  
  // Try ObjectId if it looks like one
  if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    searches.push(this.findById(id));
  }
  
  // Try custom id field
  searches.push(this.findOne({ id: id, isActive: true }));
  
  // Try slug
  if (typeof id === 'string') {
    searches.push(this.findOne({ slug: id.toLowerCase(), isActive: true }));
  }
  
  // Execute searches in parallel
  const results = await Promise.allSettled(searches);
  
  // Return first successful result
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  
  return null;
};

// ENHANCED: Smart search function
placeSchema.statics.smartSearch = async function(query, options = {}) {
  const {
    category,
    city,
    state,
    minRating = 0,
    maxDistance,
    coordinates,
    limit = 50,
    sortBy = 'rating'
  } = options;
  
  let searchQuery = { isActive: true };
  
  // Text search
  if (query && query.trim()) {
    const searchTerms = query.trim().split(/\s+/);
    const regexQueries = searchTerms.map(term => ({
      $or: [
        { name: { $regex: new RegExp(term, 'i') } },
        { description: { $regex: new RegExp(term, 'i') } },
        { tags: { $regex: new RegExp(term, 'i') } },
        { 'address.city': { $regex: new RegExp(term, 'i') } },
        { 'address.area': { $regex: new RegExp(term, 'i') } }
      ]
    }));
    
    if (regexQueries.length === 1) {
      searchQuery = { ...searchQuery, ...regexQueries[0] };
    } else {
      searchQuery = { ...searchQuery, $and: regexQueries };
    }
  }
  
  // Category filter
  if (category) {
    const categories = Array.isArray(category) ? category : [category];
    searchQuery.category = { $in: categories.map(cat => cat.toLowerCase()) };
  }
  
  // Location filters
  if (city) {
    searchQuery['address.city'] = { $regex: new RegExp(city, 'i') };
  }
  
  if (state) {
    searchQuery['address.state'] = { $regex: new RegExp(state, 'i') };
  }
  
  // Rating filter
  if (minRating > 0) {
    searchQuery.rating = { $gte: minRating };
  }
  
  let queryBuilder = this.find(searchQuery);
  
  // Geospatial search
  if (coordinates && maxDistance) {
    queryBuilder = this.find({
      ...searchQuery,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [coordinates.longitude, coordinates.latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    });
  }
  
  // Sorting
  let sortCriteria = {};
  switch (sortBy) {
    case 'rating':
      sortCriteria = { rating: -1, reviewCount: -1, name: 1 };
      break;
    case 'name':
      sortCriteria = { name: 1 };
      break;
    case 'distance':
      // Distance sorting is handled by $near
      break;
    case 'popularity':
      sortCriteria = { views: -1, bookmarks: -1, rating: -1 };
      break;
    default:
      sortCriteria = { rating: -1, name: 1 };
  }
  
  return queryBuilder
    .sort(sortCriteria)
    .limit(Math.min(limit, 100))
    .lean();
};

// Find nearby places with enhanced error handling
placeSchema.statics.findNearby = async function(lat, lng, radiusKm = 25, additionalFilters = {}) {
  try {
    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates provided');
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Coordinates out of valid range');
    }
    
    const query = {
      ...additionalFilters,
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // GeoJSON format: [longitude, latitude]
          },
          $maxDistance: radiusKm * 1000 // Convert km to meters
        }
      }
    };
    
    return await this.find(query)
      .limit(50)
      .lean();
      
  } catch (error) {
    console.error('Error in findNearby:', error);
    
    // Fallback to basic distance calculation
    const allPlaces = await this.find({
      ...additionalFilters,
      isActive: true
    }).lean();
    
    return allPlaces.filter(place => {
      if (!place.location) return false;
      const distance = this.calculateDistance(lat, lng, place.location.latitude, place.location.longitude);
      return distance <= radiusKm;
    }).slice(0, 50);
  }
};

// Calculate distance between two points (Haversine formula)
placeSchema.statics.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Check if place is currently open
placeSchema.methods.isCurrentlyOpen = function(date = new Date()) {
  if (!this.openingHours) return true; // Assume open if no schedule
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const schedule = this.openingHours[dayName];
  
  if (!schedule || schedule.closed) return false;
  if (!schedule.open || !schedule.close) return true;
  
  const now = date.getHours() * 60 + date.getMinutes();
  const openTime = this.timeToMinutes(schedule.open);
  const closeTime = this.timeToMinutes(schedule.close);
  
  // Handle overnight hours
  if (closeTime < openTime) {
    return now >= openTime || now <= closeTime;
  }
  
  return now >= openTime && now <= closeTime;
};

// Get next opening time
placeSchema.methods.getNextOpenTime = function(fromDate = new Date()) {
  if (!this.openingHours) return null;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(fromDate.getDate() + i);
    
    const dayName = dayNames[checkDate.getDay()];
    const schedule = this.openingHours[dayName];
    
    if (schedule && !schedule.closed && schedule.open) {
      const openTime = this.timeToMinutes(schedule.open);
      const currentTime = checkDate.getHours() * 60 + checkDate.getMinutes();
      
      // If it's today and place opens later
      if (i === 0 && openTime > currentTime) {
        return {
          date: checkDate.toDateString(),
          time: schedule.open,
          daysFromNow: 0
        };
      }
      
      // If it's a future day
      if (i > 0) {
        return {
          date: checkDate.toDateString(),
          time: schedule.open,
          daysFromNow: i
        };
      }
    }
  }
  
  return null; // Always closed
};

// Helper method to convert time string to minutes
placeSchema.methods.timeToMinutes = function(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
};

// Update view count
placeSchema.methods.incrementViews = function() {
  this.views = (this.views || 0) + 1;
  return this.save();
};

// Pre-save middleware
placeSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }
  
  // Generate search keywords
  if (this.isModified('name') || this.isModified('description') || this.isModified('tags')) {
    const keywords = new Set();
    
    // Add name words
    if (this.name) {
      this.name.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }
    
    // Add city and state
    if (this.address?.city) keywords.add(this.address.city.toLowerCase());
    if (this.address?.state) keywords.add(this.address.state.toLowerCase());
    
    // Add category
    if (this.category) keywords.add(this.category);
    
    // Add tags
    if (this.tags) {
      this.tags.forEach(tag => keywords.add(tag.toLowerCase()));
    }
    
    this.searchKeywords = Array.from(keywords);
  }
  
  // Update timestamp
  this.updatedAt = new Date();
  
  next();
});

// Pre-update middleware
placeSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Post-save middleware for logging
placeSchema.post('save', function(doc, next) {
  console.log(`Place saved: ${doc.name} (${doc._id})`);
  next();
});

// Export model
const Place = mongoose.model('Place', placeSchema);

module.exports = Place;