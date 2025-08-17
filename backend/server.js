// Updated server.js - Add map routes

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');

// Import routes
const placeRoutes = require('./routes/places');
const routeRoutes = require('./routes/routes');
const chatRoutes = require('./routes/chat');
const tripRoutes = require('./routes/trips');
const distanceRoutes = require('./routes/distance');
const mapRoutes = require('./routes/map'); // ADD THIS LINE

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Enhanced rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const intensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  message: {
    error: 'Too many optimization requests. Please try again later.',
    retryAfter: '15 minutes'
  }
});

// CORS configuration - MUST come before routes
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsing middleware - MUST come before routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip}`);
  next();
});

// Apply general rate limiting to all API routes
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
}));

// Apply intensive rate limiting only to specific optimization endpoints
app.use('/api/trips/generate', intensiveLimiter);
app.use('/api/trips/optimize', intensiveLimiter);
app.use('/api/trips/matrix', intensiveLimiter);
app.use('/api/routes/optimize', intensiveLimiter);
app.use('/api/routes/matrix', intensiveLimiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    
    let placeCount = 0;
    try {
      const Place = require('./models/Place');
      placeCount = await Place.countDocuments();
    } catch (dbError) {
      console.log('Database query failed:', dbError.message);
    }
    
    res.status(200).json({
      status: 'OK',
      success: true,
      database: dbStatus === 1 ? 'connected' : 'disconnected',
      placesInDatabase: placeCount,
      features: {
        leafletMaps: true,
        openStreetMap: true,
        freeMapping: true,
        noApiKeysRequired: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      success: false, 
      message: error.message 
    });
  }
});

// Mount API routes
app.use('/api/places', placeRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/distance', distanceRoutes);
app.use('/api/map', mapRoutes); // ADD THIS LINE

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    title: 'TourWithAI Backend API Documentation',
    version: '2.1.0',
    description: 'AI-powered travel planning with Leaflet.js + OpenStreetMap integration',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    mappingTechnology: {
      frontend: 'Leaflet.js',
      tiles: 'OpenStreetMap',
      cost: 'Free',
      features: ['No API keys required', 'Unlimited requests', 'Open source']
    },
    endpoints: {
      places: {
        base: '/places',
        description: 'Tourist place data and search',
        methods: ['GET'],
        examples: [
          'GET /places - Get all places with filters',
          'GET /places/category/temple - Get temples',
          'GET /places/nearby?latitude=12.9716&longitude=77.5946 - Get nearby places'
        ]
      },
      map: {
        base: '/map',
        description: 'Leaflet.js + OpenStreetMap integration endpoints',
        methods: ['GET', 'POST'],
        examples: [
          'GET /map/bounds - Get map bounds for places',
          'GET /map/places-in-bounds - Get places in viewport',
          'POST /map/optimize-route - Get optimized route coordinates',
          'GET /map/clustered-markers - Get clustered markers',
          'GET /map/heatmap-data - Get heatmap data',
          'GET /map/geocode?q=Bangalore - Geocode address',
          'GET /map/reverse-geocode?lat=12.9716&lng=77.5946 - Reverse geocode',
          'GET /map/config - Get map configuration'
        ]
      },
      trips: {
        base: '/trips',
        description: 'Advanced trip planning with AI optimization',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        examples: [
          'GET /trips - Get all trips for user',
          'GET /trips/:id - Get specific trip',
          'POST /trips/generate - Generate new trip',
          'POST /trips/optimize - Optimize trip places',
          'GET /trips/templates - Get trip templates',
          'PUT /trips/:id - Update trip',
          'DELETE /trips/:id - Delete trip'
        ]
      },
      routes: {
        base: '/routes',
        description: 'Legacy route optimization',
        methods: ['GET', 'POST'],
        examples: [
          'POST /routes/optimize - Basic route optimization',
          'GET /routes/suggestions - Get route suggestions'
        ]
      },
      chat: {
        base: '/chat',
        description: 'AI chat assistant for travel planning',
        methods: ['POST'],
        examples: [
          'POST /chat - Chat with AI assistant'
        ]
      },
      distance: {
        base: '/distance',
        description: 'Distance and travel time calculations',
        methods: ['POST'],
        examples: [
          'POST /distance/matrix - Calculate distance matrix'
        ]
      }
    }
  });
});

// Test endpoint for Leaflet integration
app.get('/api/test/leaflet', (req, res) => {
  res.json({
    success: true,
    message: 'Leaflet.js + OpenStreetMap integration ready!',
    features: {
      mapping: 'Leaflet.js',
      tiles: 'OpenStreetMap',
      geocoding: 'Nominatim (OSM)',
      routing: 'OSRM',
      cost: 'Free',
      apiKeysRequired: false
    },
    testEndpoints: [
      'GET /api/map/bounds',
      'GET /api/map/config',
      'GET /api/map/geocode?q=Bangalore'
    ],
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to list all places
app.get('/api/debug/places', async (req, res) => {
  try {
    const Place = require('./models/Place');
    const places = await Place.find({}).limit(5);
    const count = await Place.countDocuments();
    
    res.status(200).json({
      success: true,
      totalPlaces: count,
      samplePlaces: places.map(place => ({
        id: place.id || place._id,
        name: place.name,
        city: place.city,
        state: place.state,
        category: place.category,
        coordinates: {
          latitude: place.location?.latitude,
          longitude: place.location?.longitude
        }
      })),
      message: `Found ${count} places in database`,
      leafletReady: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to query places from database'
    });
  }
});

// 404 handler for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: ['/places', '/routes', '/trips', '/chat', '/distance', '/map'],
    requestedEndpoint: req.originalUrl,
    suggestion: 'Check /api/docs for available endpoints'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 TourWithAI Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🗺️  Leaflet.js + OpenStreetMap: ENABLED`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Leaflet Test: http://localhost:${PORT}/api/test/leaflet`);
  console.log(`🌍 Map API: http://localhost:${PORT}/api/map/*`);
});

server.timeout = 120000;
module.exports = app;