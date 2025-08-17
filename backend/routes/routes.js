// backend/routes/routes.js - UPDATED TO MATCH FRONTEND EXPECTATIONS

const express = require('express');
const { 
  optimizeTripWithAI, 
  getTripSuggestions, 
  analyzeExistingTrip,
  addRequestTiming 
} = require('../controllers/tripController');

const router = express.Router();

// Apply timing middleware to all routes
router.use(addRequestTiming);

// MAIN ENDPOINT: This is what your frontend is calling
router.post('/optimize-with-algorithm', optimizeTripWithAI);

// Alternative endpoint names for compatibility
router.post('/optimize', optimizeTripWithAI);
router.post('/generate', optimizeTripWithAI);

// Trip suggestions endpoint
router.get('/suggestions', getTripSuggestions);

// Trip analysis endpoint
router.post('/analyze', analyzeExistingTrip);

// Algorithm support check
router.get('/algorithm-support', (req, res) => {
  res.json({
    success: true,
    supported: true,
    algorithms: [
      'advancedGreedy',
      'genetic',
      'nearestNeighbor',
      'antColony',
      'simulatedAnnealing'
    ],
    features: {
      geminiAI: true,
      multiCriteria: true,
      coimbatoreOptimized: true
    }
  });
});

// Available algorithms endpoint
router.get('/algorithms', (req, res) => {
  const OptimizationAlgorithms = require('../utils/optimizationAlgorithms');
  const optimizer = new OptimizationAlgorithms();
  
  res.json({
    success: true,
    algorithms: optimizer.getAvailableAlgorithms()
  });
});

// Route metrics endpoint
router.get('/metrics/:routeId', (req, res) => {
  // Placeholder for route metrics
  res.json({
    success: true,
    message: 'Route metrics endpoint - to be implemented',
    routeId: req.params.routeId
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Route optimization with Gemini AI + Algorithms is ready',
    endpoints: {
      main: 'POST /api/routes/optimize-with-algorithm',
      optimize: 'POST /api/routes/optimize',
      generate: 'POST /api/routes/generate',
      suggestions: 'GET /api/routes/suggestions',
      analyze: 'POST /api/routes/analyze'
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