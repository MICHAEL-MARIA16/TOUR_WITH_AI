// backend/config/locations.js - User Starting Location Configuration

const USER_LOCATIONS = {
  coimbatore: {
    id: 'coimbatore',
    name: 'Coimbatore Tidal Park',
    coordinates: { latitude: 11.0638, longitude: 77.0596 },
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Major IT hub and business center'
  },
  thirunelveli: {
    id: 'thirunelveli',
    name: 'Tirunelveli Central Bus Stand',
    coordinates: { latitude: 8.7139, longitude: 77.7563 },
    district: 'Tirunelveli',
    state: 'Tamil Nadu',
    description: 'Historic temple town in southern Tamil Nadu'
  },
  tanjore: {
    id: 'tanjore',
    name: 'Thanjavur New Bus Stand',
    coordinates: { latitude: 10.7867, longitude: 79.1431 },
    district: 'Thanjavur',
    state: 'Tamil Nadu',
    description: 'Cultural capital known for Brihadeeswarar Temple'
  },
  allepey: {
    id: 'allepey',
    name: 'Alleppey KSRTC Bus Station',
    coordinates: { latitude: 9.4942, longitude: 76.3316 },
    district: 'Alappuzha',
    state: 'Kerala',
    description: 'Venice of the East - famous for backwaters'
  },
  chennai: {
    id: 'chennai',
    name: 'Chennai Koyambedu Bus Terminus',
    coordinates: { latitude: 13.0707, longitude: 80.2170 },
    district: 'Chennai',
    state: 'Tamil Nadu',
    description: 'Capital city and major metropolitan area'
  },
  salem: {
    id: 'salem',
    name: 'Salem Market (Five Roads Junction)',
    coordinates: { latitude: 11.6544, longitude: 78.1461 },
    district: 'Salem',
    state: 'Tamil Nadu',
    description: 'Steel city known for textile industry'
  },
  erode: {
    id: 'erode',
    name: 'Erode Central Bus Terminus',
    coordinates: { latitude: 11.3330, longitude: 77.7154 },
    district: 'Erode',
    state: 'Tamil Nadu',
    description: 'Textile hub on the Kaveri river'
  },
  kanniyakumari: {
    id: 'kanniyakumari',
    name: 'Kanyakumari Beach & Vivekananda Rock Ferry',
    coordinates: { latitude: 8.0782, longitude: 77.5419 },
    district: 'Kanyakumari',
    state: 'Tamil Nadu',
    description: 'Southernmost tip of India - confluence of seas'
  },
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore Central',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
    district: 'Bangalore',
    state: 'Karnataka',
    description: 'Silicon Valley of India - tech capital'
  },
  mysore: {
    id: 'mysore',
    name: 'Mysore City Bus Stand',
    coordinates: { latitude: 12.3072, longitude: 76.6497 },
    district: 'Mysuru',
    state: 'Karnataka',
    description: 'City of Palaces - rich cultural heritage'
  }
};

// Helper function to get location by ID
const getLocationById = (locationId) => {
  return USER_LOCATIONS[locationId] || USER_LOCATIONS.coimbatore;
};

// Helper function to get all locations as array
const getAllLocations = () => {
  return Object.values(USER_LOCATIONS);
};

// Helper function to get locations by state
const getLocationsByState = (state) => {
  return Object.values(USER_LOCATIONS).filter(location => location.state === state);
};

// Validation function
const validateLocation = (locationId) => {
  return USER_LOCATIONS.hasOwnProperty(locationId);
};

module.exports = {
  USER_LOCATIONS,
  getLocationById,
  getAllLocations,
  getLocationsByState,
  validateLocation
};