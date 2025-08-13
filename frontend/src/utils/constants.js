// App configuration constants
export const CONSTANTS = {
  APP_NAME: process.env.REACT_APP_APP_NAME || 'TourWithAI',
  APP_VERSION: process.env.REACT_APP_APP_VERSION || '1.0.0',
  APP_TAGLINE: process.env.REACT_APP_TAGLINE || 'Your Smartest Travel Buddy Through South India',
  
  // API Configuration
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api',
  Maps_API_KEY: process.env.REACT_APP_Maps_API_KEY,
  
  // Map Configuration
  DEFAULT_MAP_CENTER: {
    lat: parseFloat(process.env.REACT_APP_DEFAULT_MAP_CENTER_LAT) || 11.1271,
    lng: parseFloat(process.env.REACT_APP_DEFAULT_MAP_CENTER_LNG) || 78.6569
  },
  DEFAULT_MAP_ZOOM: parseInt(process.env.REACT_APP_DEFAULT_MAP_ZOOM) || 7,
  
  // Feature Toggles
  FEATURES: {
    CHAT_ENABLED: process.env.REACT_APP_ENABLE_CHAT !== 'false',
    ROUTE_OPTIMIZATION: process.env.REACT_APP_ENABLE_ROUTE_OPTIMIZATION !== 'false',
    ANALYTICS_ENABLED: process.env.REACT_APP_ENABLE_ANALYTICS === 'true'
  }
};

// Place categories with metadata
export const PLACE_CATEGORIES = {
  temple: {
    label: 'Temples',
    icon: '🛕',
    color: '#f59e0b',
    description: 'Sacred temples and religious sites'
  },
  palace: {
    label: 'Palaces',
    icon: '🏰',
    color: '#8b5cf6',
    description: 'Royal palaces and heritage buildings'
  },
  'hill-station': {
    label: 'Hill Stations',
    icon: '⛰️',
    color: '#10b981',
    description: 'Scenic hill stations and mountain retreats'
  },
  beach: {
    label: 'Beaches',
    icon: '🏖️',
    color: '#06b6d4',
    description: 'Beautiful beaches and coastal areas'
  },
  fort: {
    label: 'Forts',
    icon: '🏛️',
    color: '#ef4444',
    description: 'Historic forts and defensive structures'
  },
  heritage: {
    label: 'Heritage Sites',
    icon: '🏛️',
    color: '#f97316',
    description: 'UNESCO sites and heritage monuments'
  },
  nature: {
    label: 'Nature',
    icon: '🌿',
    color: '#22c55e',
    description: 'Natural attractions and scenic spots'
  },
  wildlife: {
    label: 'Wildlife',
    icon: '🦁',
    color: '#84cc16',
    description: 'Wildlife sanctuaries and national parks'
  },
  museum: {
    label: 'Museums',
    icon: '🏛️',
    color: '#6366f1',
    description: 'Museums and cultural centers'
  }
};

// States covered by the app
export const SOUTH_INDIAN_STATES = {
  'Tamil Nadu': {
    code: 'TN',
    capital: 'Chennai',
    color: '#e11d48'
  },
  'Kerala': {
    code: 'KL',
    capital: 'Thiruvananthapuram',
    color: '#059669'
  },
  'Karnataka': {
    code: 'KA',
    capital: 'Bengaluru',
    color: '#dc2626'
  },
  'Telangana': {
    code: 'TG',
    capital: 'Hyderabad',
    color: '#7c3aed'
  },
  'Andhra Pradesh': {
    code: 'AP',
    capital: 'Amaravati',
    color: '#0891b2'
  }
};

// Route optimization settings
export const ROUTE_SETTINGS = {
  TIME_OPTIONS: [
    { value: 240, label: '4 hours' },
    { value: 360, label: '6 hours' },
    { value: 480, label: '8 hours' },
    { value: 600, label: '10 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: 'Full day (24h)' },
    { value: 2880, label: '2 days' }
  ],
  
  OPTIMIZATION_LEVELS: {
    fast: {
      label: 'Fast (Greedy)',
      description: 'Quick optimization using nearest neighbor algorithm'
    },
    optimal: {
      label: 'Optimal (DP)',
      description: 'Best possible route using dynamic programming (slower)'
    }
  },
  
  DEFAULT_START_TIME: '09:00',
  DEFAULT_DURATION: 480, // 8 hours
  MAX_PLACES_FOR_OPTIMIZATION: 15,
  MAX_PLACES_FOR_OPTIMAL: 10
};

// Map styles and configuration
export const MAP_CONFIG = {
  STYLES: {
    default: [],
    dark: [
      { elementType: 'geometry', stylers: [{ color: '#212121' }] },
      { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] }
    ],
    light: [
      { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] }
    ]
  },
  
  MARKER_COLORS: {
    unselected: '#6b7280',
    selected: '#3b82f6',
    visited: '#10b981',
    current: '#f59e0b',
    route: '#ef4444'
  },
  
  CLUSTER_OPTIONS: {
    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
    gridSize: 60,
    maxZoom: 12,
    minimumClusterSize: 3
  }
};

// UI Constants
export const UI_CONFIG = {
  SIDEBAR_WIDTH: 400,
  CHAT_WIDTH: 350,
  HEADER_HEIGHT: 80,
  FOOTER_HEIGHT: 120,
  
  BREAKPOINTS: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  
  ANIMATIONS: {
    DURATION: {
      fast: 200,
      normal: 300,
      slow: 500
    },
    EASING: {
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
};

// Chat configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  TYPING_INDICATOR_DELAY: 1000,
  AUTO_SCROLL_DELAY: 100,
  
  QUICK_REPLIES: [
    '🕐 What are the opening hours?',
    '💰 How much does it cost?',
    '🚗 How do I get there?',
    '⭐ What are the top attractions?',
    '🍽️ Where can I eat nearby?',
    '🏨 Accommodation options?'
  ],
  
  SYSTEM_MESSAGES: {
    welcome: "Hello! I'm your AI travel assistant for South India. Ask me anything about places, routes, timings, or travel tips!",
    error: "I apologize, but I'm having trouble processing your request. Please try again.",
    offline: "You're currently offline. I'll respond once your connection is restored."
  }
};

// Local storage keys
export const STORAGE_KEYS = {
  SELECTED_PLACES: 'tourwithai_selected_places',
  ROUTE_SETTINGS: 'tourwithai_route_settings',
  CHAT_HISTORY: 'tourwithai_chat_history',
  USER_PREFERENCES: 'tourwithai_user_preferences',
  VISITED_PLACES: 'tourwithai_visited_places',
  APP_THEME: 'tourwithai_theme'
};

// API endpoints
export const API_ENDPOINTS = {
  PLACES: {
    GET_ALL: '/places',
    GET_BY_ID: (id) => `/places/${id}`,
    GET_STATS: '/places/stats',
  },
  TRIPS: {
    GENERATE: '/trips/generate',
    OPTIMIZE: '/trips/optimize',
    SUGGESTIONS: '/trips/suggestions',
    MATRIX: '/trips/matrix',
    TEMPLATES: '/trips/templates',
    HISTORY: '/trips',
  },
  ROUTES: {
    OPTIMIZE: '/routes/optimize',
    SUGGESTIONS: '/routes/suggestions',
    DISTANCE: (from, to) => `/routes/distance/${from}/${to}`,
    MATRIX: '/routes/matrix'
  },
  CHAT: {
    MESSAGE: '/chat',
    SUGGESTIONS: '/chat/suggestions',
    PLACE_INFO: '/chat/place-info'
  },
  HEALTH: '/health'
};


// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  Maps_ERROR: 'Error loading Google Maps. Please check your API key.',
  GEOLOCATION_ERROR: 'Unable to access your location. Please enable location services.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  ROUTE_OPTIMIZED: 'Route optimized successfully!',
  PLACE_ADDED: 'Place added to your selection.',
  PLACE_REMOVED: 'Place removed from your selection.',
  PLACE_VISITED: 'Place marked as visited.',
  SETTINGS_SAVED: 'Settings saved successfully.',
  DATA_LOADED: 'Data loaded successfully.'
};

// Validation rules
export const VALIDATION = {
  MIN_PLACES_FOR_ROUTE: 2,
  MAX_PLACES_FOR_ROUTE: 15,
  MIN_TIME_AVAILABLE: 120, // 2 hours
  MAX_TIME_AVAILABLE: 4320, // 3 days
  
  PLACE_NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  
  COORDINATE_BOUNDS: {
    SOUTH_INDIA: {
      north: 20.0,
      south: 8.0,
      east: 84.0,
      west: 68.0
    }
  }
};

// Export utility functions
export const UTILS = {
  // Format duration from minutes to human readable
  formatDuration: (minutes) => {
    if (minutes < 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  },
  
  // Format distance
  formatDistance: (km) => {
    if (km < 0) return '0m';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  },
  
  // Generate random color
  getRandomColor: () => {
    const colors = Object.values(PLACE_CATEGORIES).map(cat => cat.color);
    return colors[Math.floor(Math.random() * colors.length)];
  },
  
  // Check if mobile device
  isMobile: () => {
    return window.innerWidth <= 768; // Using a fixed value for simplicity
  },
  
  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  timeToMinutes: (timeStr) => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    } catch {
      return 0;
    }
  }
};