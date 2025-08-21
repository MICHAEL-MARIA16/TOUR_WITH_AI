// frontend/utils/constants.js - Enhanced with Complete Timing Intelligence

// Storage Keys
export const STORAGE_KEYS = {
  VISITED_PLACES: 'tourwithai_visited_places',
  ROUTE_SETTINGS: 'tourwithai_route_settings',
  USER_PREFERENCES: 'tourwithai_user_preferences',
  TIMING_PREFERENCES: 'tourwithai_timing_preferences', // NEW: Timing-specific preferences
  CHAT_HISTORY: 'tourwithai_chat_history',
  RECENT_SEARCHES: 'tourwithai_recent_searches',
  SAVED_ROUTES: 'tourwithai_saved_routes',
  RECENT_LOCATIONS: 'tourwithai_recent_locations',
  OPTIMIZATION_HISTORY: 'tourwithai_optimization_history' // NEW: Track optimization performance
};

// Enhanced Route Settings with Timing Intelligence
export const ROUTE_SETTINGS = {
  DEFAULT_START_TIME: '09:00',
  DEFAULT_END_TIME: '18:00', // NEW: Trip end time
  DEFAULT_DURATION: 480, // 8 hours in minutes
  MIN_DURATION: 120, // 2 hours minimum
  MAX_DURATION: 720, // 12 hours maximum (extended for full day trips)
  DEFAULT_BUFFER_TIME: 30, // Buffer between places
  MAX_WAIT_TIME: 60, // Maximum wait time for opening
  MIN_PLACE_TIME: 30, // Minimum time per place
  DEFAULT_OPTIMIZATION_LEVEL: 'enhanced_timing',
  DEFAULT_TRANSPORT_MODE: 'car',
  
  // NEW: Time preference defaults
  DEFAULT_USER_PREFERRED_TIMES: ['morning', 'afternoon'],
  TIME_FLEXIBILITY: 30, // Minutes of flexibility around preferred times
  RUSH_HOUR_AVOIDANCE: true,
  PRIORITIZE_TIMINGS: true
};

// Enhanced Time Preferences Configuration (MERGED - SINGLE DECLARATION)
export const TIME_PREFERENCES = {
  MORNING: {
    id: 'morning',
    name: 'Morning Person',
    displayName: 'Early Bird (6AM - 12PM)',
    description: 'Prefer visiting places in the morning when they\'re less crowded',
    timeRange: '06:00-12:00',
    timeSlots: ['morning'],
    icon: '🌅',
    benefits: ['Less crowded', 'Cool weather', 'Better photos', 'Fresh energy'],
    advantages: ['Less crowded', 'Better weather', 'Fresh energy', 'Better photography light'],
    bestFor: ['temples', 'nature', 'hiking', 'photography'],
    suitableFor: ['temples', 'nature', 'heritage sites', 'museums']
  },
  AFTERNOON: {
    id: 'afternoon',
    name: 'Afternoon Explorer',
    displayName: 'Midday Active (12PM - 5PM)',
    description: 'Comfortable with midday activities and moderate crowds',
    timeRange: '12:00-17:00',
    timeSlots: ['afternoon'],
    icon: '☀️',
    benefits: ['Full energy', 'All places open', 'Good weather', 'Extended hours'],
    advantages: ['Good visibility', 'Most places open', 'Active atmosphere', 'Lunch opportunities'],
    bestFor: ['museums', 'palaces', 'shopping', 'cultural sites'],
    suitableFor: ['markets', 'shopping', 'city tours', 'cultural sites']
  },
  EVENING: {
    id: 'evening',
    name: 'Evening Wanderer',
    displayName: 'Golden Hour (5PM - 9PM)',
    description: 'Love evening visits, sunsets, and illuminated attractions',
    timeRange: '17:00-21:00',
    timeSlots: ['evening'],
    icon: '🌆',
    benefits: ['Beautiful lighting', 'Cooler weather', 'Vibrant atmosphere', 'Night markets'],
    advantages: ['Beautiful sunsets', 'Illuminated sites', 'Pleasant weather', 'Cultural events'],
    bestFor: ['beaches', 'viewpoints', 'markets', 'entertainment'],
    suitableFor: ['beaches', 'viewpoints', 'palaces', 'entertainment']
  },
  FLEXIBLE: {
    id: 'flexible',
    name: 'Flexible Traveler',
    displayName: 'Anytime Explorer',
    description: 'Open to any time based on optimal conditions',
    timeRange: '06:00-21:00',
    timeSlots: ['morning', 'afternoon', 'evening'],
    icon: '🔄',
    benefits: ['Maximum options', 'Best optimization', 'Adaptive planning', 'No constraints'],
    advantages: ['Maximum flexibility', 'Best optimization results', 'Adaptive scheduling'],
    bestFor: ['any', 'mixed', 'day-trips', 'spontaneous'],
    suitableFor: ['all types', 'mixed itineraries', 'group travel']
  },
  EARLY_BIRD: {
    id: 'earlyBird',
    name: 'Super Early',
    displayName: 'Dawn Seeker (5AM - 9AM)',
    description: 'Love very early starts for sunrise views and empty attractions',
    timeRange: '05:00-09:00',
    timeSlots: ['early-morning'],
    icon: '🌅',
    benefits: ['Sunrise views', 'Empty attractions', 'Cool weather', 'Photographer\'s paradise'],
    advantages: ['Sunrise views', 'Empty attractions', 'Cool weather', 'Photographer\'s paradise'],
    bestFor: ['viewpoints', 'beaches', 'hill stations', 'wildlife'],
    suitableFor: ['viewpoints', 'beaches', 'hill stations', 'wildlife']
  }
};

// Enhanced Algorithm Configuration with Complete Timing Intelligence
export const ALGORITHMS = {
  ENHANCED_TIMING_GREEDY: {
    id: 'enhancedTimingGreedy',
    name: 'Smart Timing Optimizer',
    displayName: 'AI Timing Intelligence',
    description: 'Advanced algorithm that considers opening hours, best visit times, and your time preferences',
    complexity: 'O(n²)',
    recommended: true,
    processingTime: 'Fast (2-5 seconds)',
    maxPlaces: 15,
    features: [
      'Opening hours optimization',
      'Best time to visit analysis',
      'User time preference matching',
      'Crowd level avoidance',
      'Seasonal suitability',
      'Real-time timing adjustments',
      'Wait time minimization',
      'Rush hour avoidance'
    ],
    strengths: [
      'Perfect for time-sensitive planning',
      'Considers cultural timing patterns',
      'Maximizes visit quality through optimal timing',
      'Minimizes wait times and crowds',
      'Adapts to seasonal conditions',
      'Respects user time preferences'
    ],
    bestFor: ['day trips', 'cultural sites', 'temples', 'museums', 'strict schedules', 'first-time visitors'],
    icon: '🎯',
    color: '#10b981'
  },
  
  ENHANCED_TIMING_GENETIC: {
    id: 'enhancedTimingGenetic',
    name: 'Ultra-Smart Planner',
    displayName: 'Advanced AI Evolution',
    description: 'Evolutionary algorithm with timing intelligence for complex multi-day trips',
    complexity: 'O(g×p×n)',
    recommended: false,
    processingTime: 'Slower (10-30 seconds)',
    maxPlaces: 20,
    features: [
      'All timing intelligence features',
      'Multi-objective optimization',
      'Complex constraint handling',
      'Adaptive learning from user feedback',
      'Global optimization across multiple days',
      'Advanced seasonal planning',
      'Predictive crowd analysis'
    ],
    strengths: [
      'Handles complex multi-day itineraries',
      'Learns from optimization patterns',
      'Balances multiple competing objectives',
      'Finds globally optimal solutions',
      'Adapts to changing conditions'
    ],
    bestFor: ['multi-day trips', 'complex itineraries', '8+ places', 'detailed planning', 'experienced travelers'],
    icon: '🧬',
    color: '#8b5cf6'
  },

  ADVANCED_GREEDY: {
    id: 'advancedGreedy',
    name: 'Balanced Optimizer',
    displayName: 'Classic Smart Planner',
    description: 'Multi-criteria optimization with balanced scoring (Legacy)',
    complexity: 'O(n²)',
    recommended: false,
    features: [
      'Multi-criteria scoring',
      'Distance optimization',
      'Rating consideration',
      'Cost awareness'
    ],
    strengths: [
      'Fast and reliable',
      'Good general-purpose results',
      'Simple to understand'
    ],
    bestFor: ['simple trips', 'distance-focused', 'budget planning'],
    deprecated: true // Mark as legacy
  },

  NEAREST_NEIGHBOR: {
    id: 'nearestNeighbor',
    name: 'Quick Distance Optimizer',
    displayName: 'Simple & Fast',
    description: 'Basic algorithm focusing on minimizing travel distance',
    complexity: 'O(n²)',
    recommended: false,
    processingTime: 'Very Fast (1-2 seconds)',
    maxPlaces: 25,
    features: [
      'Shortest path calculation',
      'Minimal travel distance',
      'Basic time constraints'
    ],
    strengths: [
      'Fastest processing',
      'Good for simple distance optimization',
      'Reliable for small trips'
    ],
    bestFor: ['quick planning', 'distance priority', 'simple routes'],
    icon: '📍',
    color: '#6b7280'
  }
};

// Timing Intelligence Weights Configuration
export const TIMING_WEIGHTS = {
  BALANCED: {
    rating: 0.25,
    distance: 0.20,
    timing: 0.25,
    cost: 0.10,
    userPreference: 0.15,
    crowdLevel: 0.05
  },
  TIMING_FOCUSED: {
    rating: 0.15,
    distance: 0.15,
    timing: 0.35,
    cost: 0.05,
    userPreference: 0.25,
    crowdLevel: 0.05
  },
  QUALITY_FOCUSED: {
    rating: 0.40,
    distance: 0.15,
    timing: 0.20,
    cost: 0.05,
    userPreference: 0.15,
    crowdLevel: 0.05
  },
  BUDGET_FOCUSED: {
    rating: 0.20,
    distance: 0.25,
    timing: 0.15,
    cost: 0.30,
    userPreference: 0.05,
    crowdLevel: 0.05
  }
};

// Crowd Level Configuration
export const CROWD_LEVELS = {
  LOW: {
    id: 'low',
    name: 'Low Crowds',
    description: 'Peaceful experience with minimal crowds',
    icon: '😌',
    color: '#10b981',
    score: 1.0,
    timeRanges: ['early morning', 'late evening']
  },
  MEDIUM: {
    id: 'medium',
    name: 'Moderate Crowds',
    description: 'Some crowds but manageable',
    icon: '🙂',
    color: '#f59e0b',
    score: 0.7,
    timeRanges: ['late morning', 'early afternoon']
  },
  HIGH: {
    id: 'high',
    name: 'High Crowds',
    description: 'Busy with significant crowds',
    icon: '😐',
    color: '#ef4444',
    score: 0.4,
    timeRanges: ['mid-morning', 'afternoon']
  },
  VERY_HIGH: {
    id: 'very-high',
    name: 'Very Crowded',
    description: 'Extremely busy, long waits expected',
    icon: '😤',
    color: '#dc2626',
    score: 0.1,
    timeRanges: ['peak hours', 'festivals', 'holidays']
  }
};

// Season Configuration for South India
export const SEASONS = {
  SUMMER: {
    id: 'summer',
    name: 'Summer',
    months: [2, 3, 4, 5], // Mar-Jun
    description: 'Hot and humid, best for hill stations',
    icon: '☀️',
    recommendations: {
      avoid: ['beaches during day', 'outdoor activities in plains'],
      prefer: ['hill stations', 'indoor attractions', 'early morning visits'],
      bestTimes: ['early morning', 'evening']
    }
  },
  MONSOON: {
    id: 'monsoon',
    name: 'Monsoon',
    months: [5, 6, 7, 8, 9], // Jun-Oct
    description: 'Rainy season, lush landscapes',
    icon: '🌧️',
    recommendations: {
      avoid: ['beach activities', 'trekking', 'outdoor museums'],
      prefer: ['covered attractions', 'cultural sites', 'temples'],
      bestTimes: ['between rains', 'covered areas']
    }
  },
  WINTER: {
    id: 'winter',
    name: 'Winter',
    months: [10, 11, 0, 1], // Nov-Feb
    description: 'Cool and pleasant, perfect for all activities',
    icon: '❄️',
    recommendations: {
      avoid: [],
      prefer: ['all outdoor activities', 'beaches', 'trekking', 'sightseeing'],
      bestTimes: ['any time', 'full day activities']
    }
  }
};

// Enhanced Place Categories with Timing Intelligence
export const PLACE_CATEGORIES = {
  TEMPLE: 'temple',
  PALACE: 'palace',
  HILL_STATION: 'hill-station',
  HERITAGE: 'heritage',
  BEACH: 'beach',
  WILDLIFE: 'wildlife',
  NATURE: 'nature',
  FORT: 'fort',
  MUSEUM: 'museum',
  PARK: 'park'
};

// Enhanced Category Configuration with Timing Intelligence
export const CATEGORY_CONFIG = {
  [PLACE_CATEGORIES.TEMPLE]: {
    name: 'Temples',
    icon: '🕉️',
    color: '#dc2626',
    description: 'Sacred temples and religious sites',
    bestTimes: ['morning', 'evening'],
    typicalDuration: 45,
    crowdPatterns: {
      weekdays: 'medium',
      weekends: 'high',
      festivals: 'very-high'
    },
    seasonalSuitability: {
      summer: 'fair',
      monsoon: 'good',
      winter: 'excellent'
    },
    specialTimings: {
      puja: ['06:00-08:00', '18:00-20:00'],
      aarti: ['morning', 'evening'],
      festivals: 'very crowded'
    }
  },
  [PLACE_CATEGORIES.PALACE]: {
    name: 'Palaces',
    icon: '🏰',
    color: '#fbbf24',
    description: 'Royal palaces and historic buildings',
    bestTimes: ['morning', 'afternoon'],
    typicalDuration: 90,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'high',
      holidays: 'very-high'
    },
    seasonalSuitability: {
      summer: 'good',
      monsoon: 'excellent',
      winter: 'excellent'
    }
  },
  [PLACE_CATEGORIES.HILL_STATION]: {
    name: 'Hill Stations',
    icon: '⛰️',
    color: '#059669',
    description: 'Scenic hill stations and mountain retreats',
    bestTimes: ['morning', 'evening'],
    typicalDuration: 180,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'very-high',
      summers: 'extremely-high'
    },
    seasonalSuitability: {
      summer: 'excellent',
      monsoon: 'good',
      winter: 'good'
    }
  },
  [PLACE_CATEGORIES.BEACH]: {
    name: 'Beaches',
    icon: '🏖️',
    color: '#2563eb',
    description: 'Beautiful beaches and coastal areas',
    bestTimes: ['morning', 'evening'],
    typicalDuration: 120,
    crowdPatterns: {
      weekdays: 'medium',
      weekends: 'high',
      summers: 'high'
    },
    seasonalSuitability: {
      summer: 'poor',
      monsoon: 'poor',
      winter: 'excellent'
    },
    avoidTimes: ['12:00-16:00'] // Too hot/sunny
  },
  [PLACE_CATEGORIES.MUSEUM]: {
    name: 'Museums',
    icon: '🏛️',
    color: '#7c3aed',
    description: 'Museums and cultural centers',
    bestTimes: ['morning', 'afternoon'],
    typicalDuration: 75,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'medium',
      school_holidays: 'high'
    },
    seasonalSuitability: {
      summer: 'excellent', // Air conditioned
      monsoon: 'excellent',
      winter: 'good'
    }
  },
  [PLACE_CATEGORIES.WILDLIFE]: {
    name: 'Wildlife',
    icon: '🦎',
    color: '#15803d',
    description: 'Wildlife sanctuaries and national parks',
    bestTimes: ['early morning', 'evening'],
    typicalDuration: 180,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'high'
    },
    seasonalSuitability: {
      summer: 'fair',
      monsoon: 'closed',
      winter: 'excellent'
    },
    specialNotes: ['Book safaris in advance', 'Early morning best for sightings']
  },
  [PLACE_CATEGORIES.NATURE]: {
    name: 'Nature Spots',
    icon: '🌿',
    color: '#16a34a',
    description: 'Gardens, waterfalls, and natural attractions',
    bestTimes: ['morning', 'evening'],
    typicalDuration: 90,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'medium'
    },
    seasonalSuitability: {
      summer: 'fair',
      monsoon: 'excellent',
      winter: 'excellent'
    }
  },
  [PLACE_CATEGORIES.HERITAGE]: {
    name: 'Heritage Sites',
    icon: '🏛️',
    color: '#92400e',
    description: 'UNESCO sites and historical monuments',
    bestTimes: ['morning', 'late afternoon'],
    typicalDuration: 100,
    crowdPatterns: {
      weekdays: 'medium',
      weekends: 'high',
      holidays: 'very-high'
    },
    seasonalSuitability: {
      summer: 'fair',
      monsoon: 'good',
      winter: 'excellent'
    }
  },
  [PLACE_CATEGORIES.FORT]: {
    name: 'Forts',
    icon: '🏯',
    color: '#6b7280',
    description: 'Historic forts and military structures',
    bestTimes: ['morning', 'evening'],
    typicalDuration: 75,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'medium'
    },
    seasonalSuitability: {
      summer: 'fair',
      monsoon: 'poor',
      winter: 'excellent'
    }
  },
  [PLACE_CATEGORIES.PARK]: {
    name: 'Parks',
    icon: '🌳',
    color: '#16a34a',
    description: 'City parks and recreational areas',
    bestTimes: ['morning', 'evening'],
    typicalDuration: 60,
    crowdPatterns: {
      weekdays: 'low',
      weekends: 'high'
    },
    seasonalSuitability: {
      summer: 'morning/evening only',
      monsoon: 'good',
      winter: 'excellent'
    }
  }
};

// Time Constraint Configuration
export const TIME_CONSTRAINTS = {
  STRICT: {
    id: 'strict',
    name: 'Strict Schedule',
    description: 'Must follow exact timing, no delays',
    bufferTime: 15,
    maxWaitTime: 0,
    flexibility: 'none'
  },
  MODERATE: {
    id: 'moderate',
    name: 'Moderate Flexibility',
    description: 'Some flexibility allowed',
    bufferTime: 30,
    maxWaitTime: 30,
    flexibility: 'limited'
  },
  FLEXIBLE: {
    id: 'flexible',
    name: 'Flexible Timing',
    description: 'Open to timing adjustments for better experience',
    bufferTime: 45,
    maxWaitTime: 60,
    flexibility: 'high'
  }
};

// User Preference Configuration
export const USER_PREFERENCES = {
  PRIORITIZE_TIMINGS: {
    id: 'prioritizeTimings',
    name: 'Prioritize Optimal Timing',
    description: 'Focus on visiting places at their best times',
    weight: 1.3
  },
  AVOID_RUSH: {
    id: 'avoidRush',
    name: 'Avoid Rush Hours',
    description: 'Skip peak traffic and crowded times',
    weight: 1.2
  },
  PREFER_MORNING: {
    id: 'preferMorning',
    name: 'Morning Person',
    description: 'Prefer early starts and morning activities',
    weight: 1.25
  },
  PREFER_EVENING: {
    id: 'preferEvening',
    name: 'Evening Person',
    description: 'Enjoy evening visits and sunset experiences',
    weight: 1.25
  },
  MAX_TRAVEL_TIME_PERCENT: {
    id: 'maxTravelTimePercent',
    name: 'Limit Travel Time',
    description: 'Maximum percentage of time spent traveling',
    defaultValue: 40,
    range: [20, 60]
  }
};

// Enhanced Optimization Targets with Timing
export const OPTIMIZATION_TARGETS = {
  BALANCED: 'balanced',
  TIME: 'time',
  DISTANCE: 'distance',
  RATING: 'rating',
  COST: 'cost',
  TIMING_QUALITY: 'timing_quality' // NEW
};

export const OPTIMIZATION_TARGET_CONFIG = {
  [OPTIMIZATION_TARGETS.BALANCED]: {
    name: 'Balanced Experience',
    description: 'Best overall travel experience with timing intelligence',
    icon: '⚖️',
    weights: TIMING_WEIGHTS.BALANCED
  },
  [OPTIMIZATION_TARGETS.TIMING_QUALITY]: {
    name: 'Perfect Timing',
    description: 'Maximize visit quality through optimal timing',
    icon: '⏰',
    weights: TIMING_WEIGHTS.TIMING_FOCUSED
  },
  [OPTIMIZATION_TARGETS.TIME]: {
    name: 'Minimize Travel Time',
    description: 'Shortest total travel time',
    icon: '⏱️',
    weights: { ...TIMING_WEIGHTS.BALANCED, distance: 0.35, timing: 0.30 }
  },
  [OPTIMIZATION_TARGETS.DISTANCE]: {
    name: 'Minimize Distance',
    description: 'Shortest total distance',
    icon: '📏',
    weights: { ...TIMING_WEIGHTS.BALANCED, distance: 0.40, timing: 0.20 }
  },
  [OPTIMIZATION_TARGETS.RATING]: {
    name: 'Maximize Ratings',
    description: 'Visit highest-rated places at best times',
    icon: '⭐',
    weights: TIMING_WEIGHTS.QUALITY_FOCUSED
  },
  [OPTIMIZATION_TARGETS.COST]: {
    name: 'Minimize Costs',
    description: 'Most budget-friendly route with timing optimization',
    icon: '💰',
    weights: TIMING_WEIGHTS.BUDGET_FOCUSED
  }
};

// Rush Hour Configuration for South Indian Cities
export const RUSH_HOURS = {
  MORNING: {
    start: '08:00',
    end: '10:00',
    severity: 'high',
    description: 'Morning office rush'
  },
  EVENING: {
    start: '17:00',
    end: '19:00',
    severity: 'very-high',
    description: 'Evening office rush'
  },
  LUNCH: {
    start: '12:30',
    end: '14:00',
    severity: 'medium',
    description: 'Lunch hour traffic'
  }
};

// Enhanced South Indian States with Timing Context
export const SOUTH_INDIAN_STATES = [
  { 
    code: 'TN', 
    name: 'Tamil Nadu',
    timezone: 'Asia/Kolkata',
    peakSeason: 'winter',
    culturalTimings: {
      templeHours: { morning: '06:00-12:00', evening: '16:00-21:00' },
      lunchBreak: '12:00-14:00',
      shopHours: '10:00-20:00'
    }
  },
  { 
    code: 'KL', 
    name: 'Kerala',
    timezone: 'Asia/Kolkata',
    peakSeason: 'winter',
    culturalTimings: {
      backwaterBestTime: '06:00-18:00',
      templeHours: { morning: '05:00-12:00', evening: '17:00-20:00' },
      ayurvedicCenters: '07:00-19:00'
    }
  },
  { 
    code: 'KA', 
    name: 'Karnataka',
    timezone: 'Asia/Kolkata',
    peakSeason: 'winter',
    culturalTimings: {
      palaceHours: '10:00-17:30',
      gardenHours: '06:00-18:00',
      mysoreSpecial: { palace: '10:00-17:30', illumination: '19:00-20:00' }
    }
  },
  { 
    code: 'AP', 
    name: 'Andhra Pradesh',
    timezone: 'Asia/Kolkata',
    peakSeason: 'winter'
  },
  { 
    code: 'TS', 
    name: 'Telangana',
    timezone: 'Asia/Kolkata',
    peakSeason: 'winter'
  },
  { 
    code: 'PY', 
    name: 'Puducherry',
    timezone: 'Asia/Kolkata',
    peakSeason: 'winter',
    culturalTimings: {
      beachBestTime: '06:00-10:00, 16:00-19:00',
      frenchQuarter: '09:00-18:00'
    }
  }
];

// Rest of the constants
export const MAJOR_CITIES = [
  'Chennai', 'Bangalore', 'Hyderabad', 'Kochi', 'Coimbatore',
  'Madurai', 'Mysore', 'Thiruvananthapuram', 'Visakhapatnam', 'Mangalore',
  'Salem', 'Tiruchirappalli', 'Warangal', 'Guntur', 'Pondicherry'
];

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: [12.9716, 77.5946], // Bangalore
  DEFAULT_ZOOM: 7,
  MIN_ZOOM: 5,
  MAX_ZOOM: 18,
  TILE_LAYER: {
    OSM: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  MARKER_COLORS: {
    DEFAULT: '#3b82f6',
    SELECTED: '#10b981',
    VISITED: '#059669',
    ROUTE: '#ef4444',
    OPTIMAL_TIME: '#10b981', // NEW: For places at optimal time
    SUBOPTIMAL_TIME: '#f59e0b', // NEW: For places at suboptimal time
    WAIT_REQUIRED: '#ef4444' // NEW: For places requiring wait
  }
};

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_HISTORY: 50,
  TYPING_DELAY: 1000,
  WELCOME_MESSAGES: [
    "Hello! I'm your South Indian travel guide with timing intelligence. How can I help you plan your perfect trip?",
    "Namaste! Ready to explore South India at the best times? Ask me about places and I'll optimize your timing!",
    "Welcome to South India's AI travel assistant! I can help you find the perfect time to visit any place."
  ]
};

// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/health',
  PLACES: '/places',
  ROUTES: '/routes',
  TRIPS: '/trips',
  CHAT: '/chat',
  MAP: '/map',
  DISTANCE: '/distance',
  TIMING: '/timing', // NEW: Timing-specific endpoint
  OPTIMIZATION: '/optimization' // NEW: Advanced optimization endpoint
};

// Enhanced Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  INVALID_DATA: 'Invalid data provided. Please check your inputs.',
  NO_PLACES_FOUND: 'No places found matching your criteria.',
  OPTIMIZATION_FAILED: 'Route optimization failed. Please try with fewer places.',
  TIMING_CONFLICT: 'Unable to fit all places within your time window. Consider extending your trip or selecting fewer places.',
  ALL_PLACES_CLOSED: 'All selected places are closed during your planned visit time.',
  LOCATION_ERROR: 'Unable to get your location. Please enable location services.',
  GENERIC_ERROR: 'Something went wrong. Please try again.'
};

// Enhanced Success Messages
export const SUCCESS_MESSAGES = {
  ROUTE_OPTIMIZED: 'Route optimized successfully with perfect timing!',
  TIMING_OPTIMIZED: 'Timing optimized! You\'ll visit each place at the perfect time.',
  PLACE_ADDED: 'Place added to your trip!',
  PLACE_REMOVED: 'Place removed from your trip!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  DATA_LOADED: 'Data loaded successfully!',
  TIMING_ANALYSIS_COMPLETE: 'Timing analysis complete! Your route considers all optimal visit times.'
};

// Feature Flags
export const FEATURES = {
  AI_CHAT: true,
  MAP_VIEW: true,
  GRAPH_VISUALIZATION: true,
  TIMING_INTELLIGENCE: true, // NEW
  CROWD_ANALYSIS: true, // NEW
  SEASONAL_OPTIMIZATION: true, // NEW
  OFFLINE_MODE: false,
  LOCATION_TRACKING: true,
  SOCIAL_SHARING: false,
  TRIP_EXPORT: true,
  COLLABORATIVE_PLANNING: false,
  REAL_TIME_UPDATES: true // NEW
};

// Enhanced Validation Rules
export const VALIDATION = {
  MIN_PLACES: 2,
  MAX_PLACES: 20,
  MIN_TIME_AVAILABLE: 120, // 2 hours
  MAX_TIME_AVAILABLE: 720, // 12 hours
  MIN_RATING: 0,
  MAX_RATING: 5,
  MAX_SEARCH_RESULTS: 100,
  MIN_BUFFER_TIME: 15, // NEW
  MAX_WAIT_TIME: 90, // NEW
  MIN_PLACE_DURATION: 30 // NEW
};

// Time Formats
export const TIME_FORMATS = {
  DISPLAY: 'HH:mm',
  STORAGE: 'HH:mm',
  API: 'HH:mm',
  DETAILED: 'HH:mm A' // NEW: For user-friendly display
};

// Default User Preferences with Timing
export const DEFAULT_PREFERENCES = {
  language: 'en',
  units: 'metric',
  theme: 'light',
  notifications: true,
  autoSave: true,
  showTutorials: true,
  mapStyle: 'osm',
  defaultView: 'list',
  // NEW: Timing preferences
  preferredTimes: ['morning', 'afternoon'],
  avoidRushHours: true,
  prioritizeTiming: true,
  maxWaitTime: 60,
  bufferTime: 30,
  timingFlexibility: 'moderate'
};

// Enhanced Tutorial Steps with Timing Intelligence
export const TUTORIAL_STEPS = [
  {
    target: '.place-selector',
    content: 'Select places you want to visit. I\'ll show you the best times to visit each one!',
    placement: 'right'
  },
  {
    target: '.time-preferences',
    content: 'Set your time preferences - are you a morning person or do you prefer evenings?',
    placement: 'top'
  },
  {
    target: '.timing-settings',
    content: 'Configure timing settings like start time, end time, and flexibility.',
    placement: 'left'
  },
  {
    target: '.optimize-button',
    content: 'Click here to optimize your route with AI timing intelligence!',
    placement: 'top'
  },
  {
    target: '.algorithm-settings',
    content: 'Choose between different optimization algorithms based on your needs.',
    placement: 'left'
  },
  {
    target: '.route-visualization',
    content: 'View your optimized route with timing details on the interactive graph.',
    placement: 'bottom'
  },
  {
    target: '.timing-analysis',
    content: 'See detailed timing analysis including wait times, optimal visit windows, and crowd predictions.',
    placement: 'top'
  }
];

// Distance and Duration Units
export const DISTANCE_UNITS = {
  KM: 'km',
  MILES: 'miles'
};

export const DURATION_FORMATS = {
  MINUTES: 'minutes',
  HOURS: 'hours',
  DAYS: 'days'
};

// Timing Analysis Display Configuration
export const TIMING_DISPLAY = {
  OPTIMAL_TIME_BADGE: {
    color: '#10b981',
    icon: '✅',
    text: 'Perfect Time'
  },
  GOOD_TIME_BADGE: {
    color: '#f59e0b',
    icon: '👍',
    text: 'Good Time'
  },
  WAIT_REQUIRED_BADGE: {
    color: '#ef4444',
    icon: '⏳',
    text: 'Wait Required'
  },
  CLOSED_BADGE: {
    color: '#6b7280',
    icon: '🔒',
    text: 'Closed'
  },
  CROWDED_WARNING: {
    color: '#dc2626',
    icon: '👥',
    text: 'Very Crowded'
  }
};

// Notification Configuration for Timing
export const TIMING_NOTIFICATIONS = {
  OPTIMAL_TIME_FOUND: {
    title: 'Perfect Timing!',
    message: 'Found optimal visit times for all your places',
    type: 'success',
    icon: '🎯'
  },
  WAIT_TIME_WARNING: {
    title: 'Wait Time Required',
    message: 'Some places require waiting for opening hours',
    type: 'warning',
    icon: '⏳'
  },
  RUSH_HOUR_WARNING: {
    title: 'Rush Hour Alert',
    message: 'Your route includes travel during rush hours',
    type: 'warning',
    icon: '🚦'
  },
  CROWD_ALERT: {
    title: 'Crowd Alert',
    message: 'Some places may be very crowded at selected times',
    type: 'info',
    icon: '👥'
  },
  SEASONAL_TIP: {
    title: 'Seasonal Tip',
    message: 'Current season affects some place recommendations',
    type: 'info',
    icon: '🌦️'
  }
};

// Analytics Events for Timing Features
export const ANALYTICS_EVENTS = {
  TIMING_OPTIMIZATION_USED: 'timing_optimization_used',
  ALGORITHM_SELECTED: 'algorithm_selected',
  TIME_PREFERENCE_SET: 'time_preference_set',
  WAIT_TIME_ACCEPTED: 'wait_time_accepted',
  RUSH_HOUR_AVOIDED: 'rush_hour_avoided',
  SEASONAL_RECOMMENDATION_FOLLOWED: 'seasonal_recommendation_followed',
  CROWD_AVOIDANCE_ENABLED: 'crowd_avoidance_enabled',
  TIMING_FLEXIBILITY_CHANGED: 'timing_flexibility_changed'
};

// Performance Metrics for Algorithm Comparison
export const PERFORMANCE_METRICS = {
  PROCESSING_TIME: 'processing_time',
  ROUTE_EFFICIENCY: 'route_efficiency',
  TIMING_ACCURACY: 'timing_accuracy',
  USER_SATISFACTION: 'user_satisfaction',
  PLACES_OPTIMALLY_TIMED: 'places_optimally_timed',
  WAIT_TIME_MINIMIZED: 'wait_time_minimized',
  CROWD_AVOIDANCE_SUCCESS: 'crowd_avoidance_success'
};

// Accessibility Configuration with Timing
export const ACCESSIBILITY_CONFIG = {
  WHEELCHAIR_ACCESS: {
    id: 'wheelchairAccess',
    name: 'Wheelchair Accessible',
    description: 'Places with wheelchair accessibility',
    icon: '♿',
    timingConsideration: 'May need extra time for accessibility features'
  },
  KID_FRIENDLY: {
    id: 'kidFriendly',
    name: 'Kid Friendly',
    description: 'Family-friendly places suitable for children',
    icon: '👨‍👩‍👧‍👦',
    timingConsideration: 'Consider nap times and meal times for children'
  },
  ELDERLY_FRIENDLY: {
    id: 'elderlyFriendly',
    name: 'Elderly Friendly',
    description: 'Places suitable for elderly visitors',
    icon: '👴',
    timingConsideration: 'Avoid extreme weather times and long walking distances'
  },
  AUDIO_GUIDE: {
    id: 'audioGuide',
    name: 'Audio Guide Available',
    description: 'Places offering audio guides',
    icon: '🎧',
    timingConsideration: 'Allow extra time for guided tours'
  }
};

// Pricing Tiers for Entry Fees
export const PRICING_TIERS = {
  FREE: {
    range: [0, 0],
    label: 'Free',
    color: '#10b981',
    icon: '🆓'
  },
  LOW: {
    range: [1, 50],
    label: 'Budget Friendly',
    color: '#059669',
    icon: '💚'
  },
  MEDIUM: {
    range: [51, 200],
    label: 'Moderate',
    color: '#f59e0b',
    icon: '💛'
  },
  HIGH: {
    range: [201, 500],
    label: 'Premium',
    color: '#ef4444',
    icon: '💰'
  },
  VERY_HIGH: {
    range: [501, Infinity],
    label: 'Luxury',
    color: '#dc2626',
    icon: '💎'
  }
};

// Transportation Modes with Timing Implications
export const TRANSPORT_MODES = {
  CAR: {
    id: 'car',
    name: 'Car/Taxi',
    speedKmh: 40,
    flexibility: 'high',
    rushHourImpact: 'high',
    icon: '🚗',
    timingNotes: 'Flexible timing, affected by traffic'
  },
  BIKE: {
    id: 'bike',
    name: 'Motorcycle/Bike',
    speedKmh: 35,
    flexibility: 'high',
    rushHourImpact: 'medium',
    icon: '🏍️',
    timingNotes: 'Good for avoiding traffic, weather dependent'
  },
  PUBLIC_TRANSPORT: {
    id: 'public',
    name: 'Bus/Train',
    speedKmh: 25,
    flexibility: 'low',
    rushHourImpact: 'low',
    icon: '🚌',
    timingNotes: 'Fixed schedules, less traffic impact'
  },
  WALKING: {
    id: 'walking',
    name: 'Walking',
    speedKmh: 5,
    flexibility: 'high',
    rushHourImpact: 'none',
    icon: '🚶',
    timingNotes: 'Weather and distance dependent'
  }
};

// Weather Impact on Timing
export const WEATHER_IMPACT = {
  SUNNY: {
    id: 'sunny',
    impact: {
      'outdoor': 'avoid_midday',
      'indoor': 'any_time',
      'beach': 'early_evening',
      'temple': 'early_morning'
    },
    recommendations: 'Avoid outdoor activities 12-4 PM'
  },
  RAINY: {
    id: 'rainy',
    impact: {
      'outdoor': 'covered_areas_only',
      'indoor': 'preferred',
      'temple': 'covered_areas',
      'museum': 'ideal'
    },
    recommendations: 'Focus on indoor attractions'
  },
  OVERCAST: {
    id: 'overcast',
    impact: {
      'outdoor': 'ideal',
      'indoor': 'any_time',
      'photography': 'good_lighting'
    },
    recommendations: 'Perfect for sightseeing'
  }
};

// Real-time Data Sources Configuration
export const DATA_SOURCES = {
  OPENING_HOURS: {
    primary: 'google_places',
    fallback: 'local_database',
    updateFrequency: 'weekly'
  },
  CROWD_DATA: {
    primary: 'google_popular_times',
    fallback: 'historical_patterns',
    updateFrequency: 'hourly'
  },
  WEATHER: {
    primary: 'openweathermap',
    fallback: 'local_forecast',
    updateFrequency: 'hourly'
  },
  TRAFFIC: {
    primary: 'google_maps',
    fallback: 'historical_patterns',
    updateFrequency: 'real_time'
  }
};

// Export all constants as default
export default {
  STORAGE_KEYS,
  ROUTE_SETTINGS,
  TIME_PREFERENCES,
  ALGORITHMS,
  TIMING_WEIGHTS,
  CROWD_LEVELS,
  SEASONS,
  PLACE_CATEGORIES,
  CATEGORY_CONFIG,
  TIME_CONSTRAINTS,
  USER_PREFERENCES,
  OPTIMIZATION_TARGETS,
  OPTIMIZATION_TARGET_CONFIG,
  RUSH_HOURS,
  SOUTH_INDIAN_STATES,
  MAJOR_CITIES,
  MAP_CONFIG,
  CHAT_CONFIG,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURES,
  TIME_FORMATS,
  DISTANCE_UNITS,
  DURATION_FORMATS,
  VALIDATION,
  DEFAULT_PREFERENCES,
  TUTORIAL_STEPS,
  TIMING_DISPLAY,
  TIMING_NOTIFICATIONS,
  ANALYTICS_EVENTS,
  PERFORMANCE_METRICS,
  ACCESSIBILITY_CONFIG,
  PRICING_TIERS,
  TRANSPORT_MODES,
  WEATHER_IMPACT,
  DATA_SOURCES
};