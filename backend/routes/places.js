// backend/routes/places.js
const express = require('express');
const router = express.Router();
const {
  getAllPlaces,
  getPlaceById,
  getPlacesByCategory,
  getPlacesByCity,
  getNearbyPlaces,
  getPlaceStats,
  checkPlaceOpenStatus
} = require('../controllers/placeController');

// GET /api/places - Get all places with optional filters
router.get('/', getAllPlaces);

// GET /api/places/stats - Get place statistics
router.get('/stats', getPlaceStats);

// GET /api/places/nearby - Get nearby places
router.get('/nearby', getNearbyPlaces);

// GET /api/places/category/:category - Get places by category
router.get('/category/:category', getPlacesByCategory);

// GET /api/places/city/:city - Get places by city
router.get('/city/:city', getPlacesByCity);

// GET /api/places/:id - Get single place by ID
router.get('/:id', getPlaceById);

// GET /api/places/:id/status - Check if place is open
router.get('/:id/status', checkPlaceOpenStatus);

module.exports = router;

// backend/routes/routes.js
//const express = require('express');
//const router = express.Router();
const {
  optimizeRoute,
  getDistanceBetweenPlaces,
  getSuggestedRoutes,
  getTravelMatrix
} = require('../controllers/routeController');

// POST /api/routes/optimize - Optimize route for selected places
router.post('/optimize', optimizeRoute);

// GET /api/routes/suggestions - Get suggested routes
router.get('/suggestions', getSuggestedRoutes);

// GET /api/routes/distance/:fromPlaceId/:toPlaceId - Get distance between places
router.get('/distance/:fromPlaceId/:toPlaceId', getDistanceBetweenPlaces);

// POST /api/routes/matrix - Get travel matrix for multiple places
router.post('/matrix', getTravelMatrix);

module.exports = router;

// backend/routes/chat.js
//const express = require('express');
//const router = express.Router();
const {
  chatWithAI,
  getTravelSuggestions,
  getPlaceInfo,
  addRequestTiming
} = require('../controllers/chatController');

// Add timing middleware to all chat routes
router.use(addRequestTiming);

// POST /api/chat - Chat with AI assistant
router.post('/', chatWithAI);

// POST /api/chat/suggestions - Get AI-powered travel suggestions
router.post('/suggestions', getTravelSuggestions);

// POST /api/chat/place-info - Get place-specific information
router.post('/place-info', getPlaceInfo);

module.exports = router;