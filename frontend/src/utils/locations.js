// frontend/utils/locations.js - Enhanced with Timing Intelligence
export const USER_LOCATIONS = {
  coimbatore: {
    id: 'coimbatore',
    name: 'Coimbatore Tidal Park',
    coordinates: { latitude: 11.0638, longitude: 77.0596 },
    district: 'Coimbatore',
    state: 'Tamil Nadu',
    description: 'Major IT hub and business center - Gateway to Western Ghats',
    
    // Enhanced timing and preference data
    timezone: 'Asia/Kolkata',
    elevation: 411, // meters above sea level
    climate: 'tropical',
    
    // Traffic and timing intelligence
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '10:00', intensity: 'high' },
        { start: '17:30', end: '19:30', intensity: 'high' },
        { start: '12:00', end: '13:30', intensity: 'medium' } // Lunch rush
      ],
      bestTravelTimes: ['06:00-08:00', '10:00-17:00', '19:30-22:00'],
      weekendTraffic: 'light'
    },
    
    // Seasonal characteristics  
    seasonalTiming: {
      summer: {
        recommendedStartTime: '06:00',
        avoidAfter: '15:00',
        tips: ['Very early start recommended', 'Seek AC venues after 11 AM']
      },
      monsoon: {
        recommendedStartTime: '08:00',
        considerations: ['Check rain forecasts', 'Indoor backup plans'],
        tips: ['Waterproof essentials', 'Flexible timing']
      },
      winter: {
        recommendedStartTime: '08:00',
        optimal: true,
        tips: ['Perfect weather for all activities', 'Best season for exploration']
      }
    },
    
    // Local insights
    culturalTiming: {
      templeVisits: 'Early morning (5:30-8:00) or evening (18:00-20:00)',
      marketHours: 'Best 7:00-10:00 AM',
      restaurantPeaks: 'Avoid 12:30-14:00 and 19:30-21:30',
      businessHours: '09:00-18:00 on weekdays'
    },
    
    // Accessibility and amenities
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'cabs'],
      parking: 'widely-available',
      wheelchairFriendly: 'moderate',
      languages: ['Tamil', 'English', 'Hindi']
    },
    
    // Nearby attractions (within 2 hours)
    nearbyAttractions: [
      { name: 'Marudamalai Temple', distance: 15, travelTime: 30 },
      { name: 'Siruvani Waterfalls', distance: 37, travelTime: 60 },
      { name: 'Kovai Kutralam Falls', distance: 35, travelTime: 55 },
      { name: 'Ooty', distance: 85, travelTime: 120 }
    ]
  },

  thirunelveli: {
    id: 'thirunelveli',
    name: 'Tirunelveli Central Bus Stand',
    coordinates: { latitude: 8.7139, longitude: 77.7563 },
    district: 'Tirunelveli',
    state: 'Tamil Nadu',
    description: 'Historic temple town in southern Tamil Nadu - Famous for halwa and Nellaiappar Temple',
    
    timezone: 'Asia/Kolkata',
    elevation: 47,
    climate: 'tropical-dry',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:30', end: '09:30', intensity: 'medium' },
        { start: '17:00', end: '18:30', intensity: 'medium' },
        { start: '19:00', end: '20:00', intensity: 'medium' } // Temple visiting hours
      ],
      bestTravelTimes: ['06:00-08:00', '10:00-16:00', '20:30-22:00'],
      weekendTraffic: 'moderate'
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '05:30',
        avoidAfter: '14:00',
        tips: ['Extremely early start essential', 'Temple visits at dawn', 'Afternoon rest mandatory']
      },
      monsoon: {
        recommendedStartTime: '07:00',
        considerations: ['Limited monsoon', 'Pleasant weather'],
        tips: ['Good season for exploration', 'Less rainfall than other regions']
      },
      winter: {
        recommendedStartTime: '07:00',
        optimal: true,
        tips: ['Perfect weather', 'Best time for temple visits', 'Comfortable all day']
      }
    },
    
    culturalTiming: {
      templeVisits: 'Very early morning (5:00-7:00) or late evening (19:00-21:00)',
      marketHours: 'Traditional markets 6:00-9:00 AM',
      halwaShops: 'Open all day, best fresh in morning',
      businessHours: '09:00-20:00 with afternoon break'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'cycle-rickshaws'],
      parking: 'limited-in-city-center',
      wheelchairFriendly: 'limited',
      languages: ['Tamil', 'English']
    },
    
    nearbyAttractions: [
      { name: 'Nellaiappar Temple', distance: 2, travelTime: 10 },
      { name: 'Courtallam Falls', distance: 45, travelTime: 75 },
      { name: 'Manimuthar Falls', distance: 55, travelTime: 90 },
      { name: 'Kanyakumari', distance: 85, travelTime: 120 }
    ]
  },

  tanjore: {
    id: 'tanjore',
    name: 'Thanjavur New Bus Stand',
    coordinates: { latitude: 10.7867, longitude: 79.1431 },
    district: 'Thanjavur',
    state: 'Tamil Nadu', 
    description: 'Cultural capital known for Brihadeeswarar Temple - UNESCO World Heritage Site',
    
    timezone: 'Asia/Kolkata',
    elevation: 57,
    climate: 'tropical',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '09:30', intensity: 'medium' },
        { start: '16:30', end: '18:00', intensity: 'medium' },
        { start: '18:30', end: '19:30', intensity: 'high' } // Temple evening rush
      ],
      bestTravelTimes: ['06:00-07:30', '10:00-16:00', '20:00-22:00'],
      weekendTraffic: 'heavy' // Major tourist destination
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '06:00',
        avoidAfter: '15:00',
        tips: ['Early temple visits essential', 'Museum visits during AC hours']
      },
      monsoon: {
        recommendedStartTime: '08:00',
        considerations: ['Heavy monsoon region', 'Temple visits best indoor'],
        tips: ['Umbrella essential', 'Check temple timings']
      },
      winter: {
        recommendedStartTime: '07:00',
        optimal: true,
        tips: ['Perfect for heritage walks', 'All day exploration possible']
      }
    },
    
    culturalTiming: {
      templeVisits: 'Early morning (6:00-8:00) or evening (18:00-20:30)',
      museumHours: '09:00-17:00, closed Fridays',
      heritageWalks: 'Best 7:00-10:00 AM and 16:00-18:00',
      artGalleries: '10:00-17:00 generally'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'taxis'],
      parking: 'available-near-temple',
      wheelchairFriendly: 'good-at-major-sites',
      languages: ['Tamil', 'English']
    },
    
    nearbyAttractions: [
      { name: 'Brihadeeswarar Temple', distance: 3, travelTime: 15 },
      { name: 'Thanjavur Palace', distance: 4, travelTime: 20 },
      { name: 'Schwartz Church', distance: 2, travelTime: 10 },
      { name: 'Trichy', distance: 55, travelTime: 90 }
    ]
  },

  alleppey: {
    id: 'alleppey',
    name: 'Alleppey KSRTC Bus Station',
    coordinates: { latitude: 9.4942, longitude: 76.3316 },
    district: 'Alappuzha',
    state: 'Kerala',
    description: 'Venice of the East - Famous for backwaters and houseboat cruises',
    
    timezone: 'Asia/Kolkata',
    elevation: 2,
    climate: 'tropical-coastal',
    
    trafficPatterns: {
      rushHours: [
        { start: '07:00', end: '09:00', intensity: 'medium' },
        { start: '17:00', end: '18:30', intensity: 'medium' }
      ],
      bestTravelTimes: ['06:00-07:00', '09:30-16:30', '19:00-21:00'],
      weekendTraffic: 'heavy', // Popular weekend destination
      houseboatBookingTimes: 'Early morning for best selection'
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '06:00',
        avoidAfter: '16:00',
        tips: ['Early backwater cruises', 'Humid conditions', 'Evening beach visits']
      },
      monsoon: {
        recommendedStartTime: '08:00',
        considerations: ['Heavy rainfall', 'Houseboat services may be limited'],
        tips: ['Indoor activities preferred', 'Check weather before cruises']
      },
      winter: {
        recommendedStartTime: '07:00',
        optimal: true,
        tips: ['Perfect for backwater cruises', 'Best season for houseboats', 'Comfortable all day']
      }
    },
    
    culturalTiming: {
      houseboatCruises: 'Start 8:00-10:00 AM for full day experience',
      beachVisits: 'Early morning or late evening',
      backwaterTours: 'Morning 6:00-11:00 best for wildlife',
      marketVisits: 'Early morning for fresh catch and spices'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'boats'],
      parking: 'limited-book-ahead',
      wheelchairFriendly: 'limited-on-boats',
      languages: ['Malayalam', 'English', 'Hindi']
    },
    
    nearbyAttractions: [
      { name: 'Backwater Cruises', distance: 0, travelTime: 0 },
      { name: 'Kumarakom', distance: 32, travelTime: 45 },
      { name: 'Vembanad Lake', distance: 12, travelTime: 25 },
      { name: 'Marari Beach', distance: 11, travelTime: 20 }
    ]
  },

  chennai: {
    id: 'chennai',
    name: 'Chennai Koyambedu Bus Terminus',
    coordinates: { latitude: 13.0707, longitude: 80.2170 },
    district: 'Chennai',
    state: 'Tamil Nadu',
    description: 'Capital city and major metropolitan area - Gateway to South India',
    
    timezone: 'Asia/Kolkata',
    elevation: 6,
    climate: 'tropical-coastal',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '10:30', intensity: 'very-high' },
        { start: '17:00', end: '20:00', intensity: 'very-high' },
        { start: '12:30', end: '14:00', intensity: 'high' }
      ],
      bestTravelTimes: ['06:00-07:30', '10:30-12:00', '14:30-16:30', '20:30-22:00'],
      weekendTraffic: 'moderate',
      metroAvailable: true
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '06:00',
        avoidAfter: '15:00',
        tips: ['Very hot and humid', 'Mall visits during afternoon', 'Beach visits early morning/evening']
      },
      monsoon: {
        recommendedStartTime: '09:00',
        considerations: ['Heavy rainfall', 'Flooding possible', 'Traffic disruptions'],
        tips: ['Metro preferred over road', 'Indoor activities', 'Check flood warnings']
      },
      winter: {
        recommendedStartTime: '08:00',
        optimal: true,
        tips: ['Pleasant weather', 'Best for city exploration', 'Beach visits comfortable']
      }
    },
    
    culturalTiming: {
      templeVisits: 'Early morning (5:00-8:00) or evening (18:00-21:00)',
      beachVisits: 'Early morning or post 17:00',
      marketHours: 'T.Nagar best 10:00-20:00, avoid weekends',
      museumHours: 'Generally 09:30-17:00, Monday closed'
    },
    
    accessibility: {
      publicTransport: ['metro', 'buses', 'auto-rickshaws', 'cabs'],
      parking: 'very-limited-expensive',
      wheelchairFriendly: 'good-in-malls-hotels',
      languages: ['Tamil', 'English', 'Hindi', 'Telugu']
    },
    
    nearbyAttractions: [
      { name: 'Marina Beach', distance: 15, travelTime: 45 },
      { name: 'Kapaleeshwarar Temple', distance: 12, travelTime: 35 },
      { name: 'Mahabalipuram', distance: 58, travelTime: 90 },
      { name: 'Kanchipuram', distance: 72, travelTime: 120 }
    ]
  },

  salem: {
    id: 'salem',
    name: 'Salem Market (Five Roads Junction)',
    coordinates: { latitude: 11.6544, longitude: 78.1461 },
    district: 'Salem',
    state: 'Tamil Nadu',
    description: 'Steel city known for textile industry - Gateway to Yercaud hills',
    
    timezone: 'Asia/Kolkata',
    elevation: 278,
    climate: 'tropical-dry',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '09:30', intensity: 'high' },
        { start: '17:30', end: '19:00', intensity: 'high' },
        { start: '13:00', end: '14:00', intensity: 'medium' }
      ],
      bestTravelTimes: ['06:00-07:30', '10:00-12:30', '14:30-17:00', '19:30-21:00'],
      weekendTraffic: 'moderate'
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '05:30',
        avoidAfter: '14:00',
        tips: ['Very early start for Yercaud', 'Hot and dry climate', 'Hill station visits preferred']
      },
      monsoon: {
        recommendedStartTime: '07:30',
        considerations: ['Moderate rainfall', 'Pleasant weather'],
        tips: ['Good time for local sightseeing', 'Less crowded hill stations']
      },
      winter: {
        recommendedStartTime: '07:00',
        optimal: true,
        tips: ['Perfect for all activities', 'Best time for Yercaud', 'Comfortable city tours']
      }
    },
    
    culturalTiming: {
      hillStationTrips: 'Early morning start (6:00 AM) for Yercaud',
      templeVisits: 'Early morning or evening',
      marketHours: 'Traditional markets 7:00-12:00',
      industrialTours: '09:00-17:00 on weekdays'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'taxis'],
      parking: 'adequate',
      wheelchairFriendly: 'moderate',
      languages: ['Tamil', 'English']
    },
    
    nearbyAttractions: [
      { name: 'Yercaud', distance: 32, travelTime: 60 },
      { name: 'Mettur Dam', distance: 45, travelTime: 75 },
      { name: 'Kolli Hills', distance: 85, travelTime: 150 },
      { name: 'Namakkal', distance: 58, travelTime: 90 }
    ]
  },

  erode: {
    id: 'erode',
    name: 'Erode Central Bus Terminus',
    coordinates: { latitude: 11.3330, longitude: 77.7154 },
    district: 'Erode',
    state: 'Tamil Nadu',
    description: 'Textile hub on the Kaveri river - Known for handloom and powerloom',
    
    timezone: 'Asia/Kolkata',
    elevation: 142,
    climate: 'tropical',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '09:30', intensity: 'medium' },
        { start: '17:00', end: '18:30', intensity: 'medium' },
        { start: '13:00', end: '14:00', intensity: 'medium' }
      ],
      bestTravelTimes: ['06:30-07:30', '10:00-12:30', '14:30-16:30', '19:00-21:00'],
      weekendTraffic: 'light'
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '06:00',
        avoidAfter: '15:00',
        tips: ['Early river visits', 'Temple visits at dawn', 'Avoid afternoon textile markets']
      },
      monsoon: {
        recommendedStartTime: '08:00',
        considerations: ['River levels may rise', 'Pleasant weather'],
        tips: ['Good for indoor textile shopping', 'Beautiful riverside views']
      },
      winter: {
        recommendedStartTime: '07:30',
        optimal: true,
        tips: ['Perfect for riverside walks', 'Textile market visits comfortable', 'Temple festivals season']
      }
    },
    
    culturalTiming: {
      textileMarkets: 'Early morning 7:00-11:00 for best selection',
      templeVisits: 'Early morning or evening',
      riverFront: 'Early morning or late evening for pleasant weather',
      businessHours: '09:00-18:00 for textile businesses'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws'],
      parking: 'adequate',
      wheelchairFriendly: 'limited',
      languages: ['Tamil', 'English']
    },
    
    nearbyAttractions: [
      { name: 'Kaveri River Front', distance: 3, travelTime: 15 },
      { name: 'Bhavani', distance: 8, travelTime: 20 },
      { name: 'Kodumudi', distance: 15, travelTime: 30 },
      { name: 'Gobichettipalayam', distance: 35, travelTime: 60 }
    ]
  },

  kanniyakumari: {
    id: 'kanniyakumari',
    name: 'Kanyakumari Beach & Vivekananda Rock Ferry',
    coordinates: { latitude: 8.0782, longitude: 77.5419 },
    district: 'Kanyakumari',
    state: 'Tamil Nadu',
    description: 'Southernmost tip of India - Confluence of three seas',
    
    timezone: 'Asia/Kolkata',
    elevation: 30,
    climate: 'tropical-coastal',
    
    trafficPatterns: {
      rushHours: [
        { start: '17:00', end: '19:00', intensity: 'high' }, // Sunset crowd
        { start: '05:00', end: '07:00', intensity: 'medium' } // Sunrise crowd
      ],
      bestTravelTimes: ['07:30-16:30', '19:30-21:00'],
      weekendTraffic: 'very-heavy', // Major tourist destination
      ferrySchedule: 'Every 30 minutes, 8:00-16:00'
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '05:00',
        avoidAfter: '16:00',
        tips: ['Sunrise viewing essential', 'Very hot afternoons', 'Evening sunset popular']
      },
      monsoon: {
        recommendedStartTime: '07:00',
        considerations: ['Rough seas', 'Ferry services may be suspended', 'Heavy rainfall'],
        tips: ['Check ferry operations', 'Indoor temple visits preferred']
      },
      winter: {
        recommendedStartTime: '05:30',
        optimal: true,
        tips: ['Perfect for sunrise/sunset viewing', 'Comfortable all day', 'Best ferry weather']
      }
    },
    
    culturalTiming: {
      sunriseViewing: '5:30-6:30 AM - Must experience',
      sunsetViewing: '17:30-18:30 PM - Crowds expected',
      ferryToRock: 'Best 8:00-11:00 AM, avoid afternoon',
      templeVisits: 'Early morning or post sunset'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'ferry'],
      parking: 'limited-expensive',
      wheelchairFriendly: 'difficult-rocky-terrain',
      languages: ['Tamil', 'English', 'Hindi']
    },
    
    nearbyAttractions: [
      { name: 'Vivekananda Rock Memorial', distance: 1, travelTime: 30 }, // Ferry ride
      { name: 'Thiruvalluvar Statue', distance: 1, travelTime: 30 },
      { name: 'Suchindram Temple', distance: 11, travelTime: 25 },
      { name: 'Nagercoil', distance: 19, travelTime: 35 }
    ]
  },

  bangalore: {
    id: 'bangalore',
    name: 'Bangalore Central',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
    district: 'Bangalore',
    state: 'Karnataka',
    description: 'Silicon Valley of India - Tech capital with pleasant weather',
    
    timezone: 'Asia/Kolkata',
    elevation: 920,
    climate: 'tropical-highland',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '11:00', intensity: 'very-high' },
        { start: '17:00', end: '21:00', intensity: 'very-high' },
        { start: '12:30', end: '14:00', intensity: 'high' }
      ],
      bestTravelTimes: ['06:00-07:30', '11:30-12:00', '14:30-16:30', '21:30-23:00'],
      weekendTraffic: 'heavy',
      metroAvailable: true
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '07:00',
        avoidAfter: '15:00',
        tips: ['Pleasant compared to other cities', 'Air-conditioned venues preferred afternoon']
      },
      monsoon: {
        recommendedStartTime: '09:00',
        considerations: ['Heavy rainfall', 'Traffic jams', 'Waterlogging'],
        tips: ['Metro preferred', 'Indoor activities', 'Umbrella essential']
      },
      winter: {
        recommendedStartTime: '08:00',
        optimal: true,
        tips: ['Perfect weather year-round', 'Best time for all activities', 'Comfortable city exploration']
      }
    },
    
    culturalTiming: {
      parkVisits: 'Early morning 6:00-9:00 or evening 17:00-19:00',
      mallsAndShopping: '10:00-22:00, less crowded weekday mornings',
      breweries: 'Evening 18:00 onwards',
      techParks: 'Avoid rush hours for visits'
    },
    
    accessibility: {
      publicTransport: ['metro', 'buses', 'auto-rickshaws', 'cabs', 'app-taxis'],
      parking: 'limited-expensive',
      wheelchairFriendly: 'excellent-in-malls-offices',
      languages: ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu']
    },
    
    nearbyAttractions: [
      { name: 'Lalbagh Botanical Garden', distance: 8, travelTime: 30 },
      { name: 'Bangalore Palace', distance: 6, travelTime: 25 },
      { name: 'Nandi Hills', distance: 61, travelTime: 90 },
      { name: 'Mysore', distance: 146, travelTime: 180 }
    ]
  },

  mysore: {
    id: 'mysore',
    name: 'Mysore City Bus Stand',
    coordinates: { latitude: 12.3072, longitude: 76.6497 },
    district: 'Mysuru',
    state: 'Karnataka',
    description: 'City of Palaces - Rich cultural heritage and royal history',
    
    timezone: 'Asia/Kolkata',
    elevation: 770,
    climate: 'tropical-highland',
    
    trafficPatterns: {
      rushHours: [
        { start: '08:00', end: '09:30', intensity: 'medium' },
        { start: '17:00', end: '18:30', intensity: 'medium' },
        { start: '19:00', end: '20:00', intensity: 'high' } // Palace illumination time
      ],
      bestTravelTimes: ['06:30-07:30', '10:00-16:30', '20:30-22:00'],
      weekendTraffic: 'heavy', // Tourist destination
      palaceIllumination: 'Sunday 19:00-20:00 and festivals'
    },
    
    seasonalTiming: {
      summer: {
        recommendedStartTime: '06:30',
        avoidAfter: '15:00',
        tips: ['Early palace visits', 'Pleasant evenings', 'Garden visits morning']
      },
      monsoon: {
        recommendedStartTime: '08:00',
        considerations: ['Moderate rainfall', 'Lush greenery'],
        tips: ['Great for palace interiors', 'Beautiful garden views', 'Less crowded']
      },
      winter: {
        recommendedStartTime: '07:30',
        optimal: true,
        tips: ['Perfect weather', 'Best for all activities', 'Palace illumination season']
      }
    },
    
    culturalTiming: {
      palaceVisits: 'Early morning 10:00-12:00 or late afternoon 15:00-17:00',
      illumination: 'Sunday evenings and festivals 19:00-20:00',
      marketShopping: 'Devaraja Market 8:00-20:00',
      gardenVisits: 'Early morning or evening for best light'
    },
    
    accessibility: {
      publicTransport: ['buses', 'auto-rickshaws', 'taxis', 'city-buses'],
      parking: 'adequate-near-palace',
      wheelchairFriendly: 'good-at-palace-limited-elsewhere',
      languages: ['Kannada', 'English', 'Hindi']
    },
    
    nearbyAttractions: [
      { name: 'Mysore Palace', distance: 2, travelTime: 10 },
      { name: 'Chamundi Hills', distance: 13, travelTime: 30 },
      { name: 'Srirangapatna', distance: 16, travelTime: 35 },
      { name: 'Coorg', distance: 118, travelTime: 180 }
    ]
  }
};

// Helper functions with enhanced intelligence
export const getLocationById = (locationId) => {
  const location = USER_LOCATIONS[locationId];
  if (!location) {
    console.warn(`Location ${locationId} not found, falling back to coimbatore`);
    return USER_LOCATIONS.coimbatore;
  }
  return location;
};

export const getAllLocations = () => {
  return Object.values(USER_LOCATIONS);
};

export const getLocationsByState = (state) => {
  return Object.values(USER_LOCATIONS).filter(location => location.state === state);
};

export const getLocationsByStateGrouped = () => {
  const grouped = {};
  Object.values(USER_LOCATIONS).forEach(location => {
    if (!grouped[location.state]) {
      grouped[location.state] = [];
    }
    grouped[location.state].push(location);
  });
  
  // Sort locations within each state by name
  Object.keys(grouped).forEach(state => {
    grouped[state].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
};

export const validateLocation = (locationId) => {
  return USER_LOCATIONS.hasOwnProperty(locationId);
};

// Enhanced timing intelligence functions
export const getBestStartTimeForLocation = (locationId, season = 'winter') => {
  const location = getLocationById(locationId);
  return location.seasonalTiming[season]?.recommendedStartTime || '08:00';
};

export const getTrafficAwareStartTime = (locationId, preferredTime = '08:00') => {
  const location = getLocationById(locationId);
  const preferred = parseTime(preferredTime);
  
  // Check if preferred time conflicts with rush hours
  const conflictsWithRush = location.trafficPatterns.rushHours.some(rush => {
    const rushStart = parseTime(rush.start);
    const rushEnd = parseTime(rush.end);
    return preferred >= rushStart && preferred <= rushEnd;
  });
  
  if (!conflictsWithRush) {
    return preferredTime;
  }
  
  // Find the earliest good travel time after preferred time
  const bestTimes = location.trafficPatterns.bestTravelTimes;
  for (const timeRange of bestTimes) {
    const [start] = timeRange.split('-');
    if (parseTime(start) >= preferred) {
      return start;
    }
  }
  
  // Fallback to first best travel time
  return bestTimes[0].split('-')[0];
};

export const getSeasonalRecommendations = (locationId, currentDate = new Date()) => {
  const location = getLocationById(locationId);
  const season = getCurrentSeason(currentDate);
  return location.seasonalTiming[season] || location.seasonalTiming.winter;
};

export const getCulturalTimingAdvice = (locationId, activityType) => {
  const location = getLocationById(locationId);
  return location.culturalTiming[activityType] || 'Standard business hours apply';
};

export const getNearbyAttractions = (locationId, maxDistance = 100) => {
  const location = getLocationById(locationId);
  return location.nearbyAttractions.filter(attraction => attraction.distance <= maxDistance);
};

export const getAccessibilityInfo = (locationId) => {
  const location = getLocationById(locationId);
  return location.accessibility;
};

// Utility functions
const parseTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getCurrentSeason = (date = new Date()) => {
  const month = date.getMonth();
  if (month >= 2 && month <= 5) return 'summer'; // Mar-Jun
  if (month >= 6 && month <= 9) return 'monsoon'; // Jul-Oct  
  return 'winter'; // Nov-Feb
};

// Location comparison and recommendation functions
export const findOptimalStartingLocation = (selectedPlaces, userPreferences = {}) => {
  const locations = getAllLocations();
  const scores = locations.map(location => {
    let score = 0;
    
    // Calculate average distance to selected places
    if (selectedPlaces.length > 0) {
      const totalDistance = selectedPlaces.reduce((sum, place) => {
        return sum + calculateDistance(location.coordinates, place.location);
      }, 0);
      const avgDistance = totalDistance / selectedPlaces.length;
      score += Math.max(0, 100 - avgDistance); // Closer is better
    }
    
    // Climate preference bonus
    if (userPreferences.preferMildClimate && location.climate.includes('highland')) {
      score += 20;
    }
    
    // Accessibility bonus
    if (userPreferences.needGoodTransport && location.accessibility.publicTransport.includes('metro')) {
      score += 15;
    }
    
    // Tourist infrastructure bonus
    if (location.accessibility.wheelchairFriendly === 'excellent' || location.accessibility.wheelchairFriendly === 'good') {
      score += 10;
    }
    
    return {
      location,
      score,
      avgDistance: selectedPlaces.length > 0 ? 
        selectedPlaces.reduce((sum, place) => sum + calculateDistance(location.coordinates, place.location), 0) / selectedPlaces.length : 0
    };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
};

const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default {
  USER_LOCATIONS,
  getLocationById,
  getAllLocations,
  getLocationsByState,
  getLocationsByStateGrouped,
  validateLocation,
  getBestStartTimeForLocation,
  getTrafficAwareStartTime,
  getSeasonalRecommendations,
  getCulturalTimingAdvice,
  getNearbyAttractions,
  getAccessibilityInfo,
  findOptimalStartingLocation
};