// backend/middleware/cors.js
const cors = require('cors');

// CORS configuration options
const corsOptions = {
  // Allow specific origins based on environment
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://tourwithai.vercel.app', // Add your production domain
      'https://tourwithai.netlify.app'
    ];
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allow credentials for authentication
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  
  // Exposed headers that the client can access
  exposedHeaders: [
    'X-Total-Count',
    'X-Response-Time',
    'X-API-Version'
  ],
  
  // Preflight cache duration (in seconds)
  maxAge: 86400, // 24 hours
  
  // Handle preflight for complex requests
  preflightContinue: false,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Create CORS middleware
const corsMiddleware = cors(corsOptions);

// Custom CORS handler for specific routes
const apiCors = (req, res, next) => {
  // Add custom headers for API responses
  res.header('X-API-Version', '1.0.0');
  res.header('X-Powered-By', 'TourWithAI');
  
  // Apply CORS
  corsMiddleware(req, res, next);
};

// Strict CORS for sensitive routes
const strictCors = cors({
  ...corsOptions,
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ]
});

module.exports = {
  corsMiddleware,
  apiCors,
  strictCors,
  corsOptions
};