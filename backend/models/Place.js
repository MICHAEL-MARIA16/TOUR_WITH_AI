// backend/models/Place.js
const mongoose = require('mongoose');

const openingHoursSchema = new mongoose.Schema({
  open: { type: String, required: true }, // "09:00"
  close: { type: String, required: true }, // "18:00"
  closed: { type: Boolean, default: false }
});

const placeSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true 
  },
  location: {
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
  },
  address: { 
    type: String, 
    required: true 
  },
  city: { 
    type: String, 
    required: true 
  },
  state: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: ['temple', 'palace', 'nature', 'museum', 'hill-station', 'beach', 'fort', 'wildlife']
  },
  openingHours: {
    monday: openingHoursSchema,
    tuesday: openingHoursSchema,
    wednesday: openingHoursSchema,
    thursday: openingHoursSchema,
    friday: openingHoursSchema,
    saturday: openingHoursSchema,
    sunday: openingHoursSchema
  },
  averageVisitDuration: { 
    type: Number, 
    required: true, // in minutes
    min: 30,
    max: 480
  },
  entryFee: {
    indian: { type: Number, default: 0 },
    foreign: { type: Number, default: 0 }
  },
  amenities: [String],
  bestTimeToVisit: [String], // ["morning", "evening"]
  kidFriendly: { type: Boolean, default: true },
  wheelchairAccessible: { type: Boolean, default: false },
  parkingAvailable: { type: Boolean, default: true },
  imageUrl: String,
  tags: [String],
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 4.0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Compound index for geospatial queries
placeSchema.index({ "location.latitude": 1, "location.longitude": 1 });
placeSchema.index({ city: 1, category: 1 });
placeSchema.index({ isActive: 1 });

// Instance method to check if place is open at a given time
placeSchema.methods.isOpenAt = function(day, time) {
  const daySchedule = this.openingHours[day.toLowerCase()];
  if (!daySchedule || daySchedule.closed) return false;
  
  return time >= daySchedule.open && time <= daySchedule.close;
};

// Static method to find places within radius
placeSchema.statics.findNearby = function(lat, lng, maxDistance = 100) {
  return this.find({
    isActive: true,
    "location.latitude": {
      $gte: lat - (maxDistance / 111), // rough conversion km to degrees
      $lte: lat + (maxDistance / 111)
    },
    "location.longitude": {
      $gte: lng - (maxDistance / 111),
      $lte: lng + (maxDistance / 111)
    }
  });
};

module.exports = mongoose.model('Place', placeSchema);