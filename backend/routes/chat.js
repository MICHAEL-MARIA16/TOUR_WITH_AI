// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const {
  chatWithAI,
  getTravelSuggestions,
  getPlaceInfo,
  addRequestTiming
} = require('../controllers/chatController');

// Add timing middleware to all chat routes for performance monitoring
router.use(addRequestTiming);

// Basic request logging middleware
router.use((req, res, next) => {
  console.log(`Chat API: ${req.method} ${req.originalUrl}`);
  next();
});

// POST /api/chat - Main chat endpoint with AI assistant
// Body: { message: string, context?: object }
router.post('/', chatWithAI);

// POST /api/chat/suggestions - Get AI-powered travel suggestions
// Body: { interests: array, duration: string, budget: string, travelStyle: string, season: string }
router.post('/suggestions', getTravelSuggestions);

// POST /api/chat/place-info - Get detailed place information with AI insights
// Body: { placeId: string, question?: string }
router.post('/place-info', getPlaceInfo);

// GET /api/chat/health - Health check for chat service
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chat service is operational',
    services: {
      geminiAI: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      database: 'connected'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware specific to chat routes
router.use((error, req, res, next) => {
  console.error('Chat route error:', error);
  
  // Handle specific AI service errors
  if (error.message && error.message.includes('API key')) {
    return res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable',
      fallback: true
    });
  }
  
  // Handle rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: 60
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Chat service error',
    fallback: true
  });
});

module.exports = router;