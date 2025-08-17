// Application Constants for TourWithAI

// Storage Keys
export const STORAGE_KEYS = {
  VISITED_PLACES: 'tourwithai_visited_places',
  ROUTE_SETTINGS: 'tourwithai_route_settings',
  USER_PREFERENCES: 'tourwithai_user_preferences',
  CHAT_HISTORY: 'tourwithai_chat_history',
  RECENT_SEARCHES: 'tourwithai_recent_searches',
  SAVED_ROUTES: 'tourwithai_saved_routes'
};

// Route Settings Defaults
export const ROUTE_SETTINGS = {
  DEFAULT_START_TIME: '09:00',
  DEFAULT_END_TIME: '18:00',
  DEFAULT_DURATION: 480, // 8 hours in minutes
  MIN_DURATION: 120, // 2 hours
  MAX_DURATION: 1440, // 24 hours
  DEFAULT_OPTIMIZATION_LEVEL: 'balanced',
  DEFAULT_TRANSPORT_MODE: 'car'
};

// Place Categories
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

// Category Display Names and Icons
export const CATEGORY_CONFIG = {
  [PLACE_CATEGORIES.TEMPLE]: {
    name: 'Temples',
    icon: '🕉️',
    color: '#dc2626',
    description: 'Sacred temples and religious sites'
  },
  [PLACE_CATEGORIES.PALACE]: {
    name: 'Palaces',
    icon: '🏰',
    color: '#fbbf24',
    description: 'Royal palaces and historic buildings'
  },
  [PLACE_CATEGORIES.HILL_STATION]: {
    name: 'Hill Stations',
    icon: '⛰️',
    color: '#059669',
    description: 'Scenic hill stations and mountain retreats'
  },
  [PLACE_CATEGORIES.HERITAGE]: {
    name: 'Heritage Sites',
    icon: '🏛️',
    color: '#92400e',
    description: 'UNESCO sites and historical monuments'
  },
  [PLACE_CATEGORIES.BEACH]: {
    name: 'Beaches',
    icon: '🏖️',
    color: '#2563eb',
    description: 'Beautiful beaches and coastal areas'
  },
  [PLACE_CATEGORIES.WILDLIFE]: {
    name: 'Wildlife',
    icon: '🦎',
    color: '#15803d',
    description: 'Wildlife sanctuaries and national parks'
  },
  [PLACE_CATEGORIES.NATURE]: {
    name: 'Nature Spots',
    icon: '🌿',
    color: '#16a34a',
    description: 'Gardens, waterfalls, and natural attractions'
  },
  [PLACE_CATEGORIES.FORT]: {
    name: 'Forts',
    icon: '🏯',
    color: '#6b7280',
    description: 'Historic forts and military structures'
  },
  [PLACE_CATEGORIES.MUSEUM]: {
    name: 'Museums',
    icon: '🏛️',
    color: '#7c3aed',
    description: 'Museums and cultural centers'
  },
  [PLACE_CATEGORIES.PARK]: {
    name: 'Parks',
    icon: '🌳',
    color: '#16a34a',
    description: 'City parks and recreational areas'
  }
};

// South Indian States
export const SOUTH_INDIAN_STATES = [
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'KL', name: 'Kerala' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'TS', name: 'Telangana' },
  { code: 'PY', name: 'Puducherry' }
];

// Major South Indian Cities
export const MAJOR_CITIES = [
  'Chennai', 'Bangalore', 'Hyderabad', 'Kochi', 'Coimbatore',
  'Madurai', 'Mysore', 'Thiruvananthapuram', 'Visakhapatnam', 'Mangalore',
  'Salem', 'Tiruchirappalli', 'Warangal', 'Guntur', 'Pondicherry'
];

// Optimization Algorithms
export const ALGORITHMS = {
  FAST: {
    id: 'fast',
    name: 'Fast (Greedy)',
    description: 'Quick optimization using greedy algorithm',
    timeComplexity: 'O(n²)',
    recommended: true,
    maxPlaces: 15
  },
  BALANCED: {
    id: 'balanced',
    name: 'Balanced (Genetic/ACO)',
    description: 'Best balance of speed and quality',
    timeComplexity: 'O(g×p×n)',
    recommended: true,
    maxPlaces: 20
  },
  OPTIMAL: {
    id: 'optimal',
    name: 'Optimal (Multi-Algorithm)',
    description: 'Best possible route with multiple algorithms',
    timeComplexity: 'O(n!)',
    recommended: false,
    maxPlaces: 12
  }
};

// Optimization Preferences
export const OPTIMIZATION_TARGETS = {
  BALANCED: 'balanced',
  TIME: 'time',
  DISTANCE: 'distance',
  RATING: 'rating',
  COST: 'cost'
};

export const OPTIMIZATION_TARGET_CONFIG = {
  [OPTIMIZATION_TARGETS.BALANCED]: {
    name: 'Balanced Experience',
    description: 'Best overall travel experience',
    icon: '⚖️'
  },
  [OPTIMIZATION_TARGETS.TIME]: {
    name: 'Minimize Travel Time',
    description: 'Shortest total travel time',
    icon: '⏱️'
  },
  [OPTIMIZATION_TARGETS.DISTANCE]: {
    name: 'Minimize Distance',
    description: 'Shortest total distance',
    icon: '📏'
  },
  [OPTIMIZATION_TARGETS.RATING]: {
    name: 'Maximize Ratings',
    description: 'Visit highest-rated places',
    icon: '⭐'
  },
  [OPTIMIZATION_TARGETS.COST]: {
    name: 'Minimize Costs',
    description: 'Most budget-friendly route',
    icon: '💰'
  }
};

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
    ROUTE: '#ef4444'
  }
};

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_HISTORY: 50,
  TYPING_DELAY: 1000,
  WELCOME_MESSAGES: [
    "Hello! I'm your South Indian travel guide. How can I help you plan your trip?",
    "Namaste! Ready to explore the beautiful places of South India? Ask me anything!",
    "Welcome to South India's AI travel assistant! What would you like to discover?"
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
  DISTANCE: '/distance'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  INVALID_DATA: 'Invalid data provided. Please check your inputs.',
  NO_PLACES_FOUND: 'No places found matching your criteria.',
  OPTIMIZATION_FAILED: 'Route optimization failed. Please try with fewer places.',
  LOCATION_ERROR: 'Unable to get your location. Please enable location services.',
  GENERIC_ERROR: 'Something went wrong. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ROUTE_OPTIMIZED: 'Route optimized successfully!',
  PLACE_ADDED: 'Place added to your trip!',
  PLACE_REMOVED: 'Place removed from your trip!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  DATA_LOADED: 'Data loaded successfully!'
};

// Feature Flags
export const FEATURES = {
  AI_CHAT: true,
  MAP_VIEW: true,
  GRAPH_VISUALIZATION: true,
  OFFLINE_MODE: false,
  LOCATION_TRACKING: true,
  SOCIAL_SHARING: false,
  TRIP_EXPORT: true,
  COLLABORATIVE_PLANNING: false
};

// Time Formats
export const TIME_FORMATS = {
  DISPLAY: 'HH:mm',
  STORAGE: 'HH:mm',
  API: 'HH:mm'
};

// Distance Units
export const DISTANCE_UNITS = {
  KM: 'km',
  MILES: 'miles'
};

// Duration Formats
export const DURATION_FORMATS = {
  MINUTES: 'minutes',
  HOURS: 'hours',
  DAYS: 'days'
};

// Validation Rules
export const VALIDATION = {
  MIN_PLACES: 2,
  MAX_PLACES: 20,
  MIN_TIME_AVAILABLE: 120, // 2 hours
  MAX_TIME_AVAILABLE: 1440, // 24 hours
  MIN_RATING: 0,
  MAX_RATING: 5,
  MAX_SEARCH_RESULTS: 100
};

// Default User Preferences
export const DEFAULT_PREFERENCES = {
  language: 'en',
  units: 'metric',
  theme: 'light',
  notifications: true,
  autoSave: true,
  showTutorials: true,
  mapStyle: 'osm',
  defaultView: 'list'
};

// Tutorial Steps
export const TUTORIAL_STEPS = [
  {
    target: '.place-selector',
    content: 'Select places you want to visit by clicking on them.',
    placement: 'right'
  },
  {
    target: '.optimize-button',
    content: 'Click here to optimize your route using AI algorithms.',
    placement: 'top'
  },
  {
    target: '.algorithm-settings',
    content: 'Adjust algorithm settings for better optimization.',
    placement: 'left'
  },
  {
    target: '.route-visualization',
    content: 'View your optimized route on the interactive graph.',
    placement: 'bottom'
  }
];

// Export all constants as default
export default {
  STORAGE_KEYS,
  ROUTE_SETTINGS,
  PLACE_CATEGORIES,
  CATEGORY_CONFIG,
  SOUTH_INDIAN_STATES,
  MAJOR_CITIES,
  ALGORITHMS,
  OPTIMIZATION_TARGETS,
  OPTIMIZATION_TARGET_CONFIG,
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
  TUTORIAL_STEPS
};