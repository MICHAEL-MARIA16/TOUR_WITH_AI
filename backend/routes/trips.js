// backend/routes/trips.js - UPDATED FOR GEMINI + ALGORITHMS

const express = require('express');
const { optimizeTripWithAI, addRequestTiming } = require('../controllers/tripController');
const router = express.Router();

// Apply timing middleware to all routes
router.use(addRequestTiming);

// MAIN ENDPOINT: Gemini AI + Algorithm Optimization
router.post('/optimize', optimizeTripWithAI);

// Alternative endpoint names for compatibility
router.post('/generate', optimizeTripWithAI);
router.post('/ai-optimize', optimizeTripWithAI);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Trip optimization with Gemini AI + Algorithms is ready',
    endpoints: {
      optimize: 'POST /api/trips/optimize',
      generate: 'POST /api/trips/generate', 
      aiOptimize: 'POST /api/trips/ai-optimize'
    },
    features: [
      'Gemini AI trip analysis',
      'Advanced optimization algorithms',
      'Intelligent algorithm selection',
      'Detailed itinerary generation',
      'Cultural insights and tips'
    ]
  });
});

module.exports = router;