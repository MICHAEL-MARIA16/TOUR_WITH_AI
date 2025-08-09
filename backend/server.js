// backend/server.js - Updated with trip planning integration
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
const tripRoutes = require('./routes/trips'); // New trip planning routes

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enhanced rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for intensive operations
const intensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests for trip planning operations
  message: {
    error: 'Too many optimization requests. Please try again later.',
    retryAfter: '15 minutes'
  }
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Apply intensive rate limiting to trip planning routes
app.use('/api/trips/generate', intensiveLimiter);
app.use('/api/trips/optimize', intensiveLimiter);
app.use('/api/trips/matrix', intensiveLimiter);
app.use('/api/routes/optimize', intensiveLimiter);
app.use('/api/routes/matrix', intensiveLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from your frontend domains
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001', // For development
      'https://your-domain.com' // Add your production domain
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Body parsing middleware with larger limits for trip data
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip}`);
  next();
});

// Health check endpoint with enhanced diagnostics
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Check environment variables
    const envCheck = {
      nodeEnv: process.env.NODE_ENV || 'not-set',
      mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing',
      googleMapsKey: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'missing',
      frontendUrl: process.env.FRONTEND_URL || 'default'
    };

    // System info
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      nodeVersion: process.version,
      platform: process.platform
    };

    res.status(200).json({
      status: 'OK',
      message: 'TourWithAI Backend is running',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStates[dbStatus],
        tripPlanner: 'active',
        routeOptimizer: 'active',
        distanceCalculator: 'active',
        aiChat: 'active'
      },
      environment: envCheck,
      system: systemInfo,
      endpoints: {
        places: '/api/places',
        routes: '/api/routes', 
        trips: '/api/trips',
        chat: '/api/chat'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API routes
app.use('/api/places', placeRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/trips', tripRoutes); // New comprehensive trip planning API

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    title: 'TourWithAI Backend API Documentation',
    version: '2.0.0',
    description: 'AI-powered travel planning and route optimization API',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
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
      routes: {
        base: '/routes',
        description: 'Legacy route optimization (use /trips for new features)',
        methods: ['GET', 'POST'],
        examples: [
          'POST /routes/optimize - Basic route optimization',
          'GET /routes/suggestions - Get route suggestions'
        ]
      },
      trips: {
        base: '/trips',
        description: 'Advanced trip planning with AI optimization',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        examples: [
          'POST /trips/generate - Generate optimized trip',
          'POST /trips/optimize - Optimize existing trip',
          'GET /trips/suggestions - Get AI-powered suggestions',
          'POST /trips/matrix - Calculate travel matrix'
        ]
      },
      chat: {
        base: '/chat',
        description: 'AI chat assistant for travel planning',
        methods: ['POST'],
        examples: [
          'POST /chat - Chat with AI assistant',
          'POST /chat/suggestions - Get AI travel suggestions'
        ]
      }
    },
    algorithms: {
      greedy: 'Fast optimization for up to 20 places',
      genetic: 'Advanced optimization for complex problems',
      dynamicProgramming: 'Optimal solutions for up to 12 places',
      simulatedAnnealing: 'Escape local optima for better solutions',
      antColony: 'Nature-inspired optimization',
      multiObjective: 'Balance multiple criteria simultaneously'
    },
    rateLimit: {
      general: '100 requests per 15 minutes',
      intensive: '20 optimization requests per 15 minutes'
    }
  });
});

// API status endpoint for monitoring
app.get('/api/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Place = require('./models/Place');
    const { Trip } = require('./models/Trip');

    // Get database statistics
    const [placeCount, tripCount] = await Promise.all([
      Place.countDocuments({}),
      Trip.countDocuments({})
    ]);

    // Memory usage
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        places: placeCount,
        trips: tripCount
      },
      performance: {
        uptime: `${Math.floor(process.uptime())}s`,
        memoryUsage: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        }
      },
      services: {
        tripPlanning: 'active',
        routeOptimization: 'active',
        aiChat: 'active',
        distanceCalculation: 'active'
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Status check failed',
      error: error.message
    });
  }
});

// 404 handler for unknown API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: ['/places', '/routes', '/trips', '/chat'],
    requestedEndpoint: req.originalUrl,
    suggestion: 'Check /api/docs for available endpoints'
  });
});

// Catch-all 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.originalUrl,
    suggestion: 'This is an API server. Try /api/docs for documentation'
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      field: err.path
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large'
    });
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      origin: req.get('Origin')
    });
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { 
      stack: err.stack,
      details: err 
    })
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  const mongoose = require('mongoose');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  
  const mongoose = require('mongoose');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 TourWithAI Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🤖 AI Trip Planning: Active`);
  console.log(`⚡ Route Optimization: Active`);
  console.log(`📊 Analytics: Active`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
});

// Set server timeout for long-running operations
server.timeout = 120000; // 2 minutes for complex optimizations

module.exports = app;