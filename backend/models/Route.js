// backend/models/Route.js
const mongoose = require('mongoose');

// Schema for individual route stops
const routeStopSchema = new mongoose.Schema({
  place: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place',
    required: true
  },
  placeData: {
    id: String,
    name: String,
    location: {
      latitude: Number,
      longitude: Number
    }
  },
  order: {
    type: Number,
    required: true
  },
  arrivalTime: {
    type: String, // "09:30"
    required: true
  },
  departureTime: {
    type: String, // "11:00"
    required: true
  },
  visitDuration: {
    type: Number, // in minutes
    required: true
  },
  travelTimeToNext: {
    type: Number, // in minutes
    default: 0
  },
  travelDistanceToNext: {
    type: Number, // in kilometers
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: String
});

// Main route schema
const routeSchema = new mongoose.Schema({
  userId: {
    type: String, // Can be session ID or user ID
    required: true
  },
  name: {
    type: String,
    default: 'My Route'
  },
  description: {
    type: String,
    default: ''
  },
  
  // Route configuration
  settings: {
    startTime: {
      type: String,
      required: true,
      default: '09:00'
    },
    totalTimeAvailable: {
      type: Number, // in minutes
      required: true,
      default: 480
    },
    startDay: {
      type: Number, // 0-6 (Sunday-Saturday)
      default: 0
    },
    optimizationLevel: {
      type: String,
      enum: ['fast', 'optimal'],
      default: 'fast'
    }
  },
  
  // Route data
  stops: [routeStopSchema],
  
  // Route metrics
  metrics: {
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
    efficiency: {
      type: String, // percentage
      default: '0%'
    },
    estimatedEndTime: String,
    placesVisited: {
      type: Number,
      default: 0
    },
    placesSkipped: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'optimized', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  
  feasible: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdDate: {
    type: Date,
    default: Date.now
  },
  optimizedDate: Date,
  startedDate: Date,
  completedDate: Date,
  
  // Sharing and collaboration
  isPublic: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Feedback and rating
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  
  // Tags for organization
  tags: [String],
  
  // Version control
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for better query performance
routeSchema.index({ userId: 1, status: 1 });
routeSchema.index({ createdDate: -1 });
routeSchema.index({ shareToken: 1 });
routeSchema.index({ isPublic: 1, rating: -1 });

// Virtual for route duration in human-readable format
routeSchema.virtual('durationFormatted').get(function() {
  const totalMinutes = this.metrics.totalTime;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
});

// Instance method to calculate route progress
routeSchema.methods.getProgress = function() {
  const completedStops = this.stops.filter(stop => stop.completed).length;
  return {
    completed: completedStops,
    total: this.stops.length,
    percentage: Math.round((completedStops / this.stops.length) * 100)
  };
};

// Instance method to get next stop
routeSchema.methods.getNextStop = function() {
  return this.stops.find(stop => !stop.completed);
};

// Instance method to mark stop as completed
routeSchema.methods.completeStop = function(stopIndex) {
  if (this.stops[stopIndex]) {
    this.stops[stopIndex].completed = true;
    
    // Check if all stops are completed
    const allCompleted = this.stops.every(stop => stop.completed);
    if (allCompleted && this.status === 'active') {
      this.status = 'completed';
      this.completedDate = new Date();
    }
  }
};

// Static method to find public routes
routeSchema.statics.findPublicRoutes = function(limit = 10) {
  return this.find({ 
    isPublic: true, 
    status: { $in: ['completed', 'optimized'] } 
  })
  .sort({ rating: -1, createdDate: -1 })
  .limit(limit)
  .populate('stops.place', 'name city state rating');
};

// Static method to generate unique share token
routeSchema.statics.generateShareToken = function() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Pre-save middleware
routeSchema.pre('save', function(next) {
  // Generate share token if making route public
  if (this.isPublic && !this.shareToken) {
    this.shareToken = this.constructor.generateShareToken();
  }
  
  // Update version on modification
  if (this.isModified('stops') && !this.isNew) {
    this.version += 1;
  }
  
  next();
});

module.exports = mongoose.model('Route', routeSchema);