// backend/config/locations.js - Fixed with Proper Coordinate Structure
// Synchronized with frontend coordinates and standardized format

const USER_LOCATIONS = {
  coimbatore: {
    id: 'coimbatore',
    name: 'Coimbatore Tidal Park',
    latitude: 11.0638,
    longitude: 77.0596,
    coordinates: { latitude: 11.0638, longitude: 77.0596 },
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Major IT hub and business center - Gateway to Western Ghats'
  },
  thirunelveli: {
    id: 'thirunelveli', 
    name: 'Tirunelveli Central Bus Stand',
    latitude: 8.7139,
    longitude: 77.7563,
    coordinates: { latitude: 8.7139, longitude: 77.7563 },
    district: 'Tirunelveli',
    state: 'Tamil Nadu',
    description: 'Historic temple town in southern Tamil Nadu - Famous for halwa and Nellaiappar Temple'
  },
  tanjore: {
    id: 'tanjore',
    name: 'Thanjavur New Bus Stand',
    latitude: 10.7867,
    longitude: 79.1431,
    coordinates: { latitude: 10.7867, longitude: 79.1431 },
    district: 'Thanjavur',
    state: 'Tamil Nadu',
    description: 'Cultural capital known for Brihadeeswarar Temple - UNESCO World Heritage Site'
  },
  alleppey: {
    id: 'alleppey',
    name: 'Alleppey KSRTC Bus Station',
    latitude: 9.4942,
    longitude: 76.3316,
    coordinates: { latitude: 9.4942, longitude: 76.3316 },
    district: 'Alappuzha',
    state: 'Kerala',
    description: 'Venice of the East - Famous for backwaters and houseboat cruises'
  },
  chennai: {
    id: 'chennai',
    name: 'Chennai Koyambedu Bus Terminus',
    latitude: 13.0707,
    longitude: 80.2170,
    coordinates: { latitude: 13.0707, longitude: 80.2170 },
    district: 'Chennai',
    state: 'Tamil Nadu',
    description: 'Capital city and major metropolitan area - Gateway to South India'
  },
  salem: {
    id: 'salem',
    name: 'Salem Market (Five Roads Junction)',
    latitude: 11.6544,
    longitude: 78.1461,
    coordinates: { latitude: 11.6544, longitude: 78.1461 },
    district: 'Salem',
    state: 'Tamil Nadu',
    description: 'Steel city known for textile industry - Gateway to Yercaud hills'
  },
  erode: {
    id: 'erode',
    name: 'Erode Central Bus Terminus',
    latitude: 11.3330,
    longitude: 77.7154,
    coordinates: { latitude: 11.3330, longitude: 77.7154 },
    district: 'Erode',
    state: 'Tamil Nadu',
    description: 'Textile hub on the Kaveri river - Known for handloom and powerloom'
  },
  kanniyakumari: {
    id: 'kanniyakumari',
    name: 'Kanyakumari Beach & Vivekananda Rock Ferry',
    latitude: 8.0782,
    longitude: 77.5419,
    coordinates: { latitude: 8.0782, longitude: 77.5419 },
    district: 'Kanyakumari',
    state: 'Tamil Nadu',
    description: 'Southernmost tip of India - Confluence of three seas'
  },
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore Central',
    latitude: 12.9716,
    longitude: 77.5946,
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
    district: 'Bangalore',
    state: 'Karnataka',
    description: 'Silicon Valley of India - Tech capital with pleasant weather'
  },
  mysore: {
    id: 'mysore',
    name: 'Mysore City Bus Stand',
    latitude: 12.3072,
    longitude: 76.6497,
    coordinates: { latitude: 12.3072, longitude: 76.6497 },
    district: 'Mysuru',
    state: 'Karnataka',
    description: 'City of Palaces - Rich cultural heritage and royal history'
  }
};

// Enhanced helper function with multiple coordinate format support
const getLocationById = (locationId) => {
  const location = USER_LOCATIONS[locationId];
  if (!location) {
    console.warn(`⚠️ Location ID '${locationId}' not found, falling back to 'coimbatore'`);
    return USER_LOCATIONS.coimbatore;
  }
  
  // Ensure both formats are available
  if (!location.coordinates && location.latitude && location.longitude) {
    location.coordinates = { 
      latitude: parseFloat(location.latitude), 
      longitude: parseFloat(location.longitude) 
    };
  }
  
  if (!location.latitude && location.coordinates) {
    location.latitude = parseFloat(location.coordinates.latitude);
    location.longitude = parseFloat(location.coordinates.longitude);
  }
  
  // Validate coordinates
  const lat = location.latitude || location.coordinates?.latitude;
  const lng = location.longitude || location.coordinates?.longitude;
  
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    console.error(`❌ Invalid coordinates for location '${locationId}', using fallback`);
    return {
      ...location,
      latitude: USER_LOCATIONS.coimbatore.latitude,
      longitude: USER_LOCATIONS.coimbatore.longitude,
      coordinates: { 
        latitude: USER_LOCATIONS.coimbatore.latitude, 
        longitude: USER_LOCATIONS.coimbatore.longitude 
      }
    };
  }
  
  return location;
};

// Helper function to get all locations with coordinate validation
const getAllLocations = () => {
  return Object.values(USER_LOCATIONS).filter(location => {
    const lat = location.latitude || location.coordinates?.latitude;
    const lng = location.longitude || location.coordinates?.longitude;
    return lat && lng && !isNaN(lat) && !isNaN(lng) &&
           lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });
};

// Helper function to get locations by state with coordinate validation
const getLocationsByState = (state) => {
  return getAllLocations().filter(location => 
    location.state && location.state.toLowerCase() === state.toLowerCase()
  );
};

// Enhanced validation function with detailed checks
const validateLocation = (locationId) => {
  if (!USER_LOCATIONS.hasOwnProperty(locationId)) {
    console.warn(`Location ID '${locationId}' not found in USER_LOCATIONS`);
    return false;
  }
  
  const location = USER_LOCATIONS[locationId];
  const lat = location.latitude || location.coordinates?.latitude;
  const lng = location.longitude || location.coordinates?.longitude;
  
  const isValid = lat && lng && 
                 !isNaN(lat) && !isNaN(lng) &&
                 lat >= -90 && lat <= 90 && 
                 lng >= -180 && lng <= 180;
  
  if (!isValid) {
    console.error(`Invalid coordinates for '${locationId}': lat=${lat}, lng=${lng}`);
  }
  
  return isValid;
};

// Function to standardize coordinate format for API responses
const standardizeLocationFormat = (location) => {
  if (!location) return null;
  
  const lat = parseFloat(location.latitude || location.coordinates?.latitude);
  const lng = parseFloat(location.longitude || location.coordinates?.longitude);
  
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Cannot standardize location - invalid coordinates:', location);
    return null;
  }
  
  return {
    ...location,
    latitude: lat,
    longitude: lng,
    coordinates: { latitude: lat, longitude: lng },
    // Also provide alternative format for compatibility
    location: { latitude: lat, longitude: lng }
  };
};

// Debug function to verify all coordinates
const debugLocationCoordinates = () => {
  console.log('🔍 Backend Location Coordinate Debug:');
  console.log('=====================================');
  
  Object.entries(USER_LOCATIONS).forEach(([id, location]) => {
    const isValid = validateLocation(id);
    const lat = location.latitude || location.coordinates?.latitude;
    const lng = location.longitude || location.coordinates?.longitude;
    
    console.log(`📍 ${id.toUpperCase()}:`);
    console.log(`   Name: ${location.name}`);
    console.log(`   Direct: lat=${location.latitude}, lng=${location.longitude}`);
    console.log(`   Nested: lat=${location.coordinates?.latitude}, lng=${location.coordinates?.longitude}`);
    console.log(`   Parsed: lat=${lat}, lng=${lng}`);
    console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
    console.log(`   Range Check: lat in [-90,90]=${lat >= -90 && lat <= 90}, lng in [-180,180]=${lng >= -180 && lng <= 180}`);
    console.log('');
  });
  
  const status = getLocationValidationStatus();
  console.log(`📊 Summary: ${status.valid}/${status.total} (${status.validationRate}%) locations valid`);
};

// Get validation status for all locations
const getLocationValidationStatus = () => {
  const allLocations = Object.values(USER_LOCATIONS);
  const validLocations = getAllLocations();
  
  return {
    total: allLocations.length,
    valid: validLocations.length,
    invalid: allLocations.length - validLocations.length,
    validationRate: Math.round((validLocations.length / allLocations.length) * 100)
  };
};

// Function to get location in format expected by trip optimization
const getLocationForOptimization = (locationId) => {
  const location = getLocationById(locationId);
  if (!location) return null;
  
  return standardizeLocationFormat(location);
};

// Initialize and validate all locations on module load
const initializeLocations = () => {
  console.log('🏗️ Initializing location configurations...');
  
  // Standardize all locations
  Object.keys(USER_LOCATIONS).forEach(id => {
    const original = USER_LOCATIONS[id];
    USER_LOCATIONS[id] = standardizeLocationFormat(original) || original;
  });
  
  // Run validation
  const status = getLocationValidationStatus();
  console.log(`✅ Location initialization complete: ${status.valid}/${status.total} valid locations`);
  
  if (status.invalid > 0) {
    console.warn(`⚠️ ${status.invalid} locations have invalid coordinates and may cause issues`);
    debugLocationCoordinates();
  }
  
  return status;
};

// Run initialization
const initStatus = initializeLocations();

module.exports = {
  USER_LOCATIONS,
  getLocationById,
  getAllLocations,
  getLocationsByState,
  validateLocation,
  getLocationValidationStatus,
  debugLocationCoordinates,
  standardizeLocationFormat,
  getLocationForOptimization,
  initStatus
};