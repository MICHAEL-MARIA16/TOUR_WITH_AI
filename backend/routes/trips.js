// backend/routes/trips.js - Create this file if it doesn't exist
const express = require('express');
const router = express.Router();
const { Trip, TripTemplate } = require('../models/Trip');
const Place = require('../models/Place');

// GET /api/trips - Get all trips for a user
router.get('/', async (req, res) => {
  try {
    const { userId = 'anonymous', status, limit = 20 } = req.query;
    
    const filter = { userId };
    if (status) {
      filter.status = status;
    }
    
    const trips = await Trip.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
      
    res.json({
      success: true,
      trips,
      count: trips.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trips',
      error: error.message
    });
  }
});

// GET /api/trips/:id - Get specific trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    res.json({
      success: true,
      trip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trip',
      error: error.message
    });
  }
});

// POST /api/trips/generate - Generate new optimized trip
router.post('/generate', async (req, res) => {
  try {
    const {
      userId = 'anonymous',
      preferences = {},
      places = [],
      name = 'My Trip',
      description = ''
    } = req.body;

    // Validate input
    if (!places || places.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one place is required'
      });
    }

    // Create new trip
    const trip = new Trip({
      userId,
      name,
      description,
      places: places.map((place, index) => ({
        placeId: place.id || place._id,
        name: place.name,
        category: place.category,
        location: {
          latitude: place.location.latitude,
          longitude: place.location.longitude
        },
        visitDuration: place.averageVisitDuration || 120, // 2 hours default
        entryFee: place.entryFee?.indian || 0,
        order: index + 1
      })),
      preferences,
      status: 'planned'
    });

    // Calculate basic metrics
    trip.updateTripMetrics();
    
    await trip.save();

    res.status(201).json({
      success: true,
      message: 'Trip generated successfully',
      trip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate trip',
      error: error.message
    });
  }
});

// POST /api/trips/optimize - Optimize existing trip or create optimized trip
router.post('/optimize', async (req, res) => {
  try {
    const {
      places = [],
      preferences = {},
      userId = 'anonymous',
      algorithm = 'greedy'
    } = req.body;

    if (!places || places.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Places array is required for optimization'
      });
    }

    // Simple greedy optimization (nearest neighbor)
    const optimizedPlaces = optimizePlacesOrder(places, preferences);

    // Calculate travel times and distances (simplified)
    const enhancedPlaces = await calculateTravelMetrics(optimizedPlaces);

    const optimizedTrip = {
      places: enhancedPlaces,
      metrics: {
        totalDistance: enhancedPlaces.reduce((sum, p) => sum + (p.travelDistanceToNext || 0), 0),
        totalTravelTime: enhancedPlaces.reduce((sum, p) => sum + (p.travelTimeToNext || 0), 0),
        totalVisitTime: enhancedPlaces.reduce((sum, p) => sum + p.visitDuration, 0),
        placesCount: enhancedPlaces.length
      },
      algorithm: algorithm,
      optimized: true
    };

    optimizedTrip.metrics.totalTime = optimizedTrip.metrics.totalTravelTime + optimizedTrip.metrics.totalVisitTime;
    optimizedTrip.metrics.efficiency = optimizedTrip.metrics.totalTime > 0 ? 
      (enhancedPlaces.length / (optimizedTrip.metrics.totalTime / 60)) : 0;

    res.json({
      success: true,
      message: 'Trip optimized successfully',
      optimizedTrip,
      originalOrder: places.map(p => p.name),
      optimizedOrder: enhancedPlaces.map(p => p.name),
      improvement: {
        message: 'Route optimized using greedy algorithm'
      }
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize trip',
      error: error.message
    });
  }
});

// GET /api/trips/templates - Get trip templates
router.get('/templates', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    
    const templates = await TripTemplate.find(filter)
      .sort({ popularity: -1 })
      .limit(20);
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
});

// PUT /api/trips/:id - Update trip
router.put('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Trip updated successfully',
      trip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update trip',
      error: error.message
    });
  }
});

// DELETE /api/trips/:id - Delete trip
router.delete('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete trip',
      error: error.message
    });
  }
});

// Helper function for basic optimization
function optimizePlacesOrder(places, preferences = {}) {
  if (places.length <= 2) return places.map((p, i) => ({ ...p, order: i + 1 }));
  
  // Simple nearest neighbor algorithm
  const optimized = [];
  const remaining = [...places];
  
  // Start with the first place or user's preferred starting location
  let current = remaining.shift();
  current.order = 1;
  optimized.push(current);
  
  while (remaining.length > 0) {
    // Find nearest remaining place
    let nearestIndex = 0;
    let minDistance = calculateDistance(
      current.location.latitude, current.location.longitude,
      remaining[0].location.latitude, remaining[0].location.longitude
    );
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(
        current.location.latitude, current.location.longitude,
        remaining[i].location.latitude, remaining[i].location.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    current = remaining.splice(nearestIndex, 1)[0];
    current.order = optimized.length + 1;
    optimized.push(current);
  }
  
  return optimized;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate travel metrics
async function calculateTravelMetrics(places) {
  const enhanced = [];
  
  for (let i = 0; i < places.length; i++) {
    const place = { ...places[i] };
    
    // Set default visit duration if not provided
    if (!place.visitDuration) {
      place.visitDuration = place.averageVisitDuration || 120; // 2 hours default
    }
    
    if (i < places.length - 1) {
      // Calculate distance and travel time to next place
      const nextPlace = places[i + 1];
      const distance = calculateDistance(
        place.location.latitude, place.location.longitude,
        nextPlace.location.latitude, nextPlace.location.longitude
      );
      
      place.travelDistanceToNext = Math.round(distance * 100) / 100; // Round to 2 decimal places
      place.travelTimeToNext = Math.round(distance * 2); // Rough estimate: 2 minutes per km
    } else {
      place.travelDistanceToNext = 0;
      place.travelTimeToNext = 0;
    }
    
    enhanced.push(place);
  }
  
  return enhanced;
}

module.exports = router;