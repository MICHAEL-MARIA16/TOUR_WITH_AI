// backend/models/Trip.js
const mongoose = require('mongoose');

// Schema for individual places in the trip
const tripPlaceSchema = new mongoose.Schema({
  placeId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  visitDuration: {
    type: Number, // in minutes
    required: true,
    min: 15
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  order: {
    type: Number,
    required: true,
    min: 1
  },
  arrivalTime: String, // "09:30"
  departureTime: String, // "11:00"
  travelTimeToNext: {
    type: Number, // in minutes
    default: 0
  },
  travelDistanceToNext: {
    type: Number, // in kilometers
    default: 0
  },
  visited: {
    type: Boolean,
    default: false
  },
  rating: Number, // User's rating after visit
  notes: String,
  photos: [String] // URLs to photos
}, { _id: false });

// Schema for trip metrics and analytics
const tripMetricsSchema = new mongoose.Schema({
  totalDistance: {
    type: Number, // in kilometers
    default: 0
  },
  totalTravelTime: {
    type: Number, // in minutes
    default: 0
  },
  totalVisitTime: {
    type: Number, // in minutes
    default: 0
  },
  totalTime: {
    type: Number, // in minutes
    default: 0
  },
  totalCost: {
    type: Number, // in rupees
    default: 0
  },
  averageRating: {
    type: Number,
    min: 1,
    max: 5
  },
  efficiency: {
    type: Number, // places per hour
    default: 0
  },
  placesCount: {
    type: Number,
    default: 0
  },
  categoryDistribution: {
    type: Map,
    of: Number,
    default: new Map()
  },
  optimizationScore: {
    type: Number, // 0-100 score
    min: 0,
    max: 100
  }
}, { _id: false });

// Schema for user preferences and constraints
const preferencesSchema = new mongoose.Schema({
  interests: [{
    type: String,
    enum: ['temple', 'palace', 'hill-station', 'heritage', 'beach', 'wildlife', 'nature', 'fort']
  }],
  budget: {
    type: Number,
    min: 0
  },
  maxTravelTime: Number, // in minutes
  startLocation: {
    latitude: Number,
    longitude: Number,
    name: String
  },
  accessibility: {
    wheelchairAccess: { type: Boolean, default: false },
    kidFriendly: { type: Boolean, default: false }
  },
  groupSize: {
    type: Number,
    default: 1,
    min: 1
  },
  transportMode: {
    type: String,
    enum: ['driving', 'taxi', 'public', 'walking'],
    default: 'driving'
  },
  optimizationGoal: {
    type: String,
    enum: ['distance', 'time', 'rating', 'cost', 'balanced'],
    default: 'balanced'
  }
}, { _id: false });

// Main Trip schema
const tripSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  description: {
    type: String,
    maxLength: 500,
    default: ''
  },
  
  // Trip places and itinerary
  places: [tripPlaceSchema],
  
  // Trip timing and schedule
  schedule: {
    startDate: Date,
    endDate: Date,
    startTime: {
      type: String,
      default: '09:00',
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    endTime: String,
    duration: Number, // total trip duration in minutes
    flexibleTiming: {
      type: Boolean,
      default: true
    }
  },

  // Metrics and analytics
  metrics: tripMetricsSchema,

  // User preferences used to generate this trip
  preferences: preferencesSchema,

  // Trip status and lifecycle
  status: {
    type: String,
    enum: ['draft', 'planned', 'active', 'completed', 'cancelled', 'archived'],
    default: 'planned',
    index: true
  },

  // Trip metadata
  metadata: {
    algorithm: {
      type: String,
      default: 'greedy-optimized'
    },
    version: {
      type: String,
      default: '2.0'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    optimizationTime: Number, // milliseconds taken to optimize
    fallbackUsed: {
      type: Boolean,
      default: false
    },
    constraints: {
      timeLimited: Boolean,
      budgetLimited: Boolean,
      accessibilityRequired: Boolean
    }
  },

  // Trip progress tracking
  progress: {
    placesVisited: {
      type: Number,
      default: 0
    },
    percentComplete: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentPlace: String, // ID of current place
    startedAt: Date,
    lastUpdated: Date
  },

  // User feedback and rating
  feedback: {
    overallRating: {
      type: Number,
      min: 1,
      max: 5
    },
    wouldRecommend: Boolean,
    comments: String,
    improvements: String,
    ratedAt: Date
  },

  // Sharing and collaboration
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true
    },
    sharedWith: [{
      userId: String,
      permission: {
        type: String,
        enum: ['view', 'edit'],
        default: 'view'
      },
      sharedAt: Date
    }],
    publicViews: {
      type: Number,
      default: 0
    }
  },

  // Trip alternatives and variations
  alternatives: [{
    name: String,
    places: [String], // place IDs
    reason: String, // why this alternative was suggested
    metrics: tripMetricsSchema
  }],

  // Weather and external factors
  externalFactors: {
    weatherConsiderations: [String],
    seasonalFactors: [String],
    crowdingAlerts: [String],
    transportAlerts: [String]
  },

  // Tags for organization and search
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Analytics and optimization history
  optimizationHistory: [{
    timestamp: { type: Date, default: Date.now },
    strategy: String,
    originalMetrics: tripMetricsSchema,
    optimizedMetrics: tripMetricsSchema,
    improvement: {
      distance: Number,
      time: Number,
      cost: Number,
      efficiency: Number
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ 'sharing.isPublic': 1, 'feedback.overallRating': -1 });
tripSchema.index({ 'schedule.startDate': 1 });
tripSchema.index({ 'metadata.generatedAt': -1 });
tripSchema.index({ tags: 1 });
tripSchema.index({ 'sharing.shareToken': 1 });

// Virtual properties
tripSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

tripSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

tripSchema.virtual('durationFormatted').get(function() {
  const totalMinutes = this.metrics.totalTime || 0;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
});

tripSchema.virtual('estimatedCostFormatted').get(function() {
  return `₹${this.metrics.totalCost || 0}`;
});

tripSchema.virtual('progressPercentage').get(function() {
  const visited = this.places.filter(place => place.visited).length;
  return this.places.length > 0 ? Math.round((visited / this.places.length) * 100) : 0;
});

// Instance methods

// Update trip progress
tripSchema.methods.updateProgress = function() {
  const visitedPlaces = this.places.filter(place => place.visited).length;
  this.progress.placesVisited = visitedPlaces;
  this.progress.percentComplete = this.places.length > 0 ? 
    Math.round((visitedPlaces / this.places.length) * 100) : 0;
  this.progress.lastUpdated = new Date();
  
  // Update status based on progress
  if (this.progress.percentComplete === 100 && this.status === 'active') {
    this.status = 'completed';
  }
};

// Mark a place as visited
tripSchema.methods.visitPlace = function(placeId, rating = null, notes = null) {
  const place = this.places.find(p => p.placeId === placeId);
  if (place) {
    place.visited = true;
    if (rating) place.rating = rating;
    if (notes) place.notes = notes;
    
    this.updateProgress();
    
    // Start trip if this is the first place visited
    if (this.status === 'planned') {
      this.status = 'active';
      this.progress.startedAt = new Date();
    }
  }
};

// Get next unvisited place
tripSchema.methods.getNextPlace = function() {
  return this.places.find(place => !place.visited);
};

// Get current place (if any)
tripSchema.methods.getCurrentPlace = function() {
  const currentPlaceId = this.progress.currentPlace;
  return currentPlaceId ? this.places.find(p => p.placeId === currentPlaceId) : null;
};

// Calculate remaining time and distance
tripSchema.methods.getRemainingMetrics = function() {
  const unvisitedPlaces = this.places.filter(place => !place.visited);
  
  const remainingTime = unvisitedPlaces.reduce((sum, place) => 
    sum + place.visitDuration + place.travelTimeToNext, 0);
    
  const remainingDistance = unvisitedPlaces.reduce((sum, place) => 
    sum + place.travelDistanceToNext, 0);
    
  const remainingCost = unvisitedPlaces.reduce((sum, place) => 
    sum + place.entryFee, 0);

  return {
    remainingPlaces: unvisitedPlaces.length,
    remainingTime: Math.round(remainingTime),
    remainingDistance: Math.round(remainingDistance * 100) / 100,
    remainingCost
  };
};

// Generate summary report
tripSchema.methods.generateSummary = function() {
  return {
    basic: {
      name: this.name,
      status: this.status,
      placesCount: this.places.length,
      duration: this.durationFormatted,
      totalCost: this.estimatedCostFormatted
    },
    progress: {
      completed: this.progressPercentage,
      placesVisited: this.progress.placesVisited,
      placesRemaining: this.places.length - this.progress.placesVisited
    },
    metrics: {
      totalDistance: `${this.metrics.totalDistance}km`,
      averageRating: this.metrics.averageRating || 'Not rated',
      efficiency: `${this.metrics.efficiency?.toFixed(1) || 0} places/hour`
    }
  };
};

// Static methods

// Find public trips for inspiration
tripSchema.statics.findPublicTrips = function(filters = {}) {
  const query = { 
    'sharing.isPublic': true,
    status: { $in: ['completed', 'planned'] }
  };
  
  if (filters.city) {
    query['places.city'] = { $regex: filters.city, $options: 'i' };
  }
  
  if (filters.interests && filters.interests.length > 0) {
    query['preferences.interests'] = { $in: filters.interests };
  }
  
  if (filters.duration) {
    const durationRange = getDurationRange(filters.duration);
    query['metrics.totalTime'] = { 
      $gte: durationRange.min, 
      $lte: durationRange.max 
    };
  }
  
  return this.find(query)
    .sort({ 'feedback.overallRating': -1, 'sharing.publicViews': -1 })
    .select('name description places metrics feedback sharing tags')
    .limit(20);
};

// Find similar trips
tripSchema.statics.findSimilarTrips = function(tripId) {
  return this.findById(tripId).then(trip => {
    if (!trip) return [];
    
    const query = {
      _id: { $ne: tripId },
      'sharing.isPublic': true,
      $or: [
        { 'preferences.interests': { $in: trip.preferences.interests || [] } },
        { 'places.category': { $in: trip.places.map(p => p.category) } },
        { tags: { $in: trip.tags || [] } }
      ]
    };
    
    return this.find(query)
      .sort({ 'feedback.overallRating': -1 })
      .limit(5)
      .select('name description metrics feedback tags');
  });
};

// Get trip statistics
tripSchema.statics.getTripStatistics = function(userId = null) {
  const matchStage = userId ? { userId } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTrips: { $sum: 1 },
        completedTrips: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
        },
        totalPlacesVisited: { $sum: '$progress.placesVisited' },
        totalDistanceTraveled: { $sum: '$metrics.totalDistance' },
        averageRating: { $avg: '$feedback.overallRating' },
        favoriteCategories: { $push: '$preferences.interests' }
      }
    },
    {
      $project: {
        _id: 0,
        totalTrips: 1,
        completedTrips: 1,
        totalPlacesVisited: 1,
        totalDistanceTraveled: { $round: ['$totalDistanceTraveled', 1] },
        averageRating: { $round: ['$averageRating', 1] },
        completionRate: {
          $round: [
            { $multiply: [{ $divide: ['$completedTrips', '$totalTrips'] }, 100] },
            1
          ]
        }
      }
    }
  ]);
};

// Generate share token
tripSchema.statics.generateShareToken = function() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Pre-save middleware
tripSchema.pre('save', function(next) {
  // Generate share token if making trip public
  if (this.sharing.isPublic && !this.sharing.shareToken) {
    this.sharing.shareToken = this.constructor.generateShareToken();
  }
  
  // Update metrics based on places
  if (this.isModified('places')) {
    this.updateTripMetrics();
  }
  
  // Update progress
  if (this.isModified('places')) {
    this.updateProgress();
  }
  
  next();
});

// Instance method to update trip metrics
tripSchema.methods.updateTripMetrics = function() {
  if (this.places.length === 0) return;
  
  // Calculate totals
  this.metrics.totalVisitTime = this.places.reduce((sum, place) => 
    sum + place.visitDuration, 0);
    
  this.metrics.totalTravelTime = this.places.reduce((sum, place) => 
    sum + place.travelTimeToNext, 0);
    
  this.metrics.totalTime = this.metrics.totalVisitTime + this.metrics.totalTravelTime;
  
  this.metrics.totalDistance = this.places.reduce((sum, place) => 
    sum + place.travelDistanceToNext, 0);
    
  this.metrics.totalCost = this.places.reduce((sum, place) => 
    sum + place.entryFee, 0);
    
  this.metrics.placesCount = this.places.length;
  
  // Calculate efficiency (places per hour)
  this.metrics.efficiency = this.metrics.totalTime > 0 ? 
    (this.places.length / (this.metrics.totalTime / 60)) : 0;
  
  // Calculate category distribution
  const categoryMap = new Map();
  this.places.forEach(place => {
    const category = place.category;
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });
  this.metrics.categoryDistribution = categoryMap;
  
  // Calculate average rating (only for visited places with ratings)
  const ratedPlaces = this.places.filter(place => place.visited && place.rating);
  if (ratedPlaces.length > 0) {
    this.metrics.averageRating = ratedPlaces.reduce((sum, place) => 
      sum + place.rating, 0) / ratedPlaces.length;
  }
};

// Post-save middleware
tripSchema.post('save', function() {
  // Update public views counter when trip is viewed
  if (this.sharing.isPublic && this.isModified('sharing.publicViews')) {
    // Could trigger analytics update here
  }
});

// Helper functions
function getDurationRange(duration) {
  const ranges = {
    'half-day': { min: 120, max: 300 }, // 2-5 hours
    'full-day': { min: 300, max: 600 }, // 5-10 hours
    'multi-day': { min: 600, max: 1440 * 3 }, // 10 hours - 3 days
    'weekend': { min: 1440, max: 1440 * 2 }, // 1-2 days
    'week': { min: 1440 * 3, max: 1440 * 7 } // 3-7 days
  };
  
  return ranges[duration] || { min: 0, max: 1440 * 7 };
}

// Schema for trip templates (reusable trip patterns)
const tripTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['cultural', 'adventure', 'relaxation', 'family', 'budget', 'luxury', 'educational'],
    required: true
  },
  duration: {
    min: Number, // minimum hours
    max: Number, // maximum hours
    recommended: Number // recommended hours
  },
  places: [{
    category: String,
    importance: {
      type: String,
      enum: ['essential', 'recommended', 'optional'],
      default: 'recommended'
    },
    minRating: {
      type: Number,
      default: 3.0
    },
    timeAllocation: Number // percentage of total time
  }],
  preferences: preferencesSchema,
  tags: [String],
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging'],
    default: 'moderate'
  },
  popularity: {
    type: Number,
    default: 0
  },
  createdBy: String, // System or user ID
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for trip templates
tripTemplateSchema.index({ category: 1, difficulty: 1 });
tripTemplateSchema.index({ popularity: -1 });
tripTemplateSchema.index({ tags: 1 });

// Export models
const Trip = mongoose.model('Trip', tripSchema);
const TripTemplate = mongoose.model('TripTemplate', tripTemplateSchema);

module.exports = { Trip, TripTemplate };