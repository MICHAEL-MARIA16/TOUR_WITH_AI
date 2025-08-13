// backend/models/Place.js
const mongoose = require('mongoose');

const openingHoursSchema = new mongoose.Schema({
  open: { type: String, required: true },
  close: { type: String, required: true },
  closed: { type: Boolean, default: false }
}, { _id: false });

const placeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
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
    required: true,
    index: true
  },
  state: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['temple', 'palace', 'hill-station', 'heritage', 'beach', 'wildlife', 'nature', 'fort'],
    index: true
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
    required: true,
    min: 30
  },
  entryFee: {
    indian: {
      type: Number,
      required: true,
      min: 0
    },
    foreign: {
      type: Number,
      required: true,
      min: 0
    }
  },
  amenities: [{
    type: String,
    required: true
  }],
  bestTimeToVisit: [{
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
    required: true
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
    required: true,
    index: true
  }],
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // ADD THIS FIELD
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for better query performance
placeSchema.index({ city: 1, category: 1 });
placeSchema.index({ state: 1, category: 1 });
placeSchema.index({ rating: -1 });
placeSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
placeSchema.index({ isActive: 1, category: 1 }); // ADD THIS INDEX

// Text index for search functionality
placeSchema.index({
  name: 'text',
  description: 'text',
  city: 'text',
  tags: 'text'
});

module.exports = mongoose.model('Place', placeSchema);