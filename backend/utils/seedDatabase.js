// backend/utils/seedDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');
const Place = require('../models/Place');
const connectDB = require('../config/database');

const southIndiaPlaces = [
  {
    id: "meenakshi-temple",
    name: "Meenakshi Amman Temple",
    description: "Ancient temple complex dedicated to Goddess Meenakshi with stunning Dravidian architecture",
    location: { latitude: 9.9195, longitude: 78.1194 },
    address: "Madurai Main, Madurai",
    city: "Madurai",
    state: "Tamil Nadu",
    category: "temple",
    openingHours: {
      monday: { open: "05:00", close: "21:30", closed: false },
      tuesday: { open: "05:00", close: "21:30", closed: false },
      wednesday: { open: "05:00", close: "21:30", closed: false },
      thursday: { open: "05:00", close: "21:30", closed: false },
      friday: { open: "05:00", close: "21:30", closed: false },
      saturday: { open: "05:00", close: "21:30", closed: false },
      sunday: { open: "05:00", close: "21:30", closed: false }
    },
    averageVisitDuration: 120,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["parking", "shoes-keeping", "prasadam"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["temple", "architecture", "heritage", "spiritual"],
    rating: 4.7
  },
  {
    id: "mysore-palace",
    name: "Mysore Palace",
    description: "Magnificent royal residence showcasing Indo-Saracenic architecture",
    location: { latitude: 12.3051, longitude: 76.6551 },
    address: "Sayyaji Rao Rd, Mysuru",
    city: "Mysuru",
    state: "Karnataka",
    category: "palace",
    openingHours: {
      monday: { open: "10:00", close: "17:30", closed: false },
      tuesday: { open: "10:00", close: "17:30", closed: false },
      wednesday: { open: "10:00", close: "17:30", closed: false },
      thursday: { open: "10:00", close: "17:30", closed: false },
      friday: { open: "10:00", close: "17:30", closed: false },
      saturday: { open: "10:00", close: "17:30", closed: false },
      sunday: { open: "10:00", close: "17:30", closed: false }
    },
    averageVisitDuration: 90,
    entryFee: { indian: 70, foreign: 200 },
    amenities: ["parking", "guide", "museum", "photography"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ["palace", "royal", "architecture", "museum"],
    rating: 4.6
  },
  {
    id: "munnar-hills",
    name: "Munnar Hill Station",
    description: "Scenic hill station famous for tea plantations and mountain views",
    location: { latitude: 10.0889, longitude: 77.0595 },
    address: "Munnar, Idukki District",
    city: "Munnar",
    state: "Kerala",
    category: "hill-station",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 240,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["coffee-plantation", "trekking", "waterfalls", "wildlife"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["coffee", "nature", "waterfalls", "hills"],
    rating: 4.5
  },
  {
    id: "thanjavur-temple",
    name: "Brihadeeswarar Temple, Thanjavur",
    description: "UNESCO World Heritage Chola temple with towering architecture",
    location: { latitude: 10.7828, longitude: 79.1317 },
    address: "Thanjavur, Thanjavur District",
    city: "Thanjavur",
    state: "Tamil Nadu",
    category: "temple",
    openingHours: {
      monday: { open: "06:00", close: "20:30", closed: false },
      tuesday: { open: "06:00", close: "20:30", closed: false },
      wednesday: { open: "06:00", close: "20:30", closed: false },
      thursday: { open: "06:00", close: "20:30", closed: false },
      friday: { open: "06:00", close: "20:30", closed: false },
      saturday: { open: "06:00", close: "20:30", closed: false },
      sunday: { open: "06:00", close: "20:30", closed: false }
    },
    averageVisitDuration: 90,
    entryFee: { indian: 30, foreign: 250 },
    amenities: ["parking", "museum", "guide"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["temple", "chola", "unesco", "architecture"],
    rating: 4.7
  },
  {
    id: "belur-halebidu",
    name: "Belur and Halebidu Temples",
    description: "Hoysala architecture masterpieces with intricate stone carvings",
    location: { latitude: 13.1658, longitude: 75.8648 },
    address: "Hassan District",
    city: "Belur",
    state: "Karnataka",
    category: "temple",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 180,
    entryFee: { indian: 25, foreign: 300 },
    amenities: ["parking", "guide", "photography"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["temple", "hoysala", "architecture", "sculpture"],
    rating: 4.6
  },
  {
    id: "rameshwaram",
    name: "Rameshwaram Temple",
    description: "Sacred island temple with longest temple corridor in the world",
    location: { latitude: 9.2876, longitude: 79.3129 },
    address: "Pamban Island, Ramanathapuram District",
    city: "Rameshwaram",
    state: "Tamil Nadu",
    category: "temple",
    openingHours: {
      monday: { open: "05:00", close: "21:00", closed: false },
      tuesday: { open: "05:00", close: "21:00", closed: false },
      wednesday: { open: "05:00", close: "21:00", closed: false },
      thursday: { open: "05:00", close: "21:00", closed: false },
      friday: { open: "05:00", close: "21:00", closed: false },
      saturday: { open: "05:00", close: "21:00", closed: false },
      sunday: { open: "05:00", close: "21:00", closed: false }
    },
    averageVisitDuration: 120,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["parking", "prasadam", "accommodation"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["temple", "pilgrimage", "island", "corridor"],
    rating: 4.5
  },
  {
    id: "mahabalipuram",
    name: "Mahabalipuram Shore Temple",
    description: "UNESCO World Heritage site with ancient rock-cut temples",
    location: { latitude: 12.6162, longitude: 80.1992 },
    address: "Mahabalipuram, Chengalpattu District",
    city: "Mahabalipuram",
    state: "Tamil Nadu",
    category: "heritage",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 150,
    entryFee: { indian: 40, foreign: 600 },
    amenities: ["parking", "guide", "beach", "photography"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ["heritage", "unesco", "shore-temple", "sculpture"],
    rating: 4.4
  },
  {
    id: "wayanad",
    name: "Wayanad Hill Station",
    description: "Scenic hill station with spice plantations and wildlife",
    location: { latitude: 11.6054, longitude: 76.0861 },
    address: "Wayanad District",
    city: "Kalpetta",
    state: "Kerala",
    category: "hill-station",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 300,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["spice-plantation", "trekking", "wildlife", "caves"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["hills", "spices", "nature", "wildlife"],
    rating: 4.3
  },
  {
    id: "gokarna-beaches",
    name: "Gokarna Beaches",
    description: "Pristine beaches and ancient temple town",
    location: { latitude: 14.5492, longitude: 74.3188 },
    address: "Uttara Kannada District",
    city: "Gokarna",
    state: "Karnataka",
    category: "beach",
    openingHours: {
      monday: { open: "06:00", close: "20:00", closed: false },
      tuesday: { open: "06:00", close: "20:00", closed: false },
      wednesday: { open: "06:00", close: "20:00", closed: false },
      thursday: { open: "06:00", close: "20:00", closed: false },
      friday: { open: "06:00", close: "20:00", closed: false },
      saturday: { open: "06:00", close: "20:00", closed: false },
      sunday: { open: "06:00", close: "20:00", closed: false }
    },
    averageVisitDuration: 240,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["beach", "temple", "water-sports", "trekking"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["beach", "temple", "pristine", "trekking"],
    rating: 4.4
  },
  {
    id: "srirangam-temple",
    name: "Srirangam Ranganathaswamy Temple",
    description: "Largest functioning temple complex in the world",
    location: { latitude: 10.8629, longitude: 78.6932 },
    address: "Srirangam, Tiruchirappalli",
    city: "Tiruchirappalli",
    state: "Tamil Nadu",
    category: "temple",
    openingHours: {
      monday: { open: "06:00", close: "21:00", closed: false },
      tuesday: { open: "06:00", close: "21:00", closed: false },
      wednesday: { open: "06:00", close: "21:00", closed: false },
      thursday: { open: "06:00", close: "21:00", closed: false },
      friday: { open: "06:00", close: "21:00", closed: false },
      saturday: { open: "06:00", close: "21:00", closed: false },
      sunday: { open: "06:00", close: "21:00", closed: false }
    },
    averageVisitDuration: 120,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["parking", "prasadam", "accommodation"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["temple", "largest", "vishnu", "pilgrimage"],
    rating: 4.6
  },
  {
    id: "badami-caves",
    name: "Badami Cave Temples",
    description: "Ancient rock-cut cave temples with stunning architecture",
    location: { latitude: 15.9149, longitude: 75.6765 },
    address: "Badami, Bagalkot District",
    city: "Badami",
    state: "Karnataka",
    category: "heritage",
    openingHours: {
      monday: { open: "09:00", close: "17:30", closed: false },
      tuesday: { open: "09:00", close: "17:30", closed: false },
      wednesday: { open: "09:00", close: "17:30", closed: false },
      thursday: { open: "09:00", close: "17:30", closed: false },
      friday: { open: "09:00", close: "17:30", closed: false },
      saturday: { open: "09:00", close: "17:30", closed: false },
      sunday: { open: "09:00", close: "17:30", closed: false }
    },
    averageVisitDuration: 120,
    entryFee: { indian: 25, foreign: 300 },
    amenities: ["parking", "guide", "photography"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["caves", "heritage", "architecture", "chalukya"],
    rating: 4.5
  },
  {
    id: "periyar-wildlife",
    name: "Periyar Wildlife Sanctuary",
    description: "Wildlife sanctuary famous for elephants and boat safaris",
    location: { latitude: 9.4616, longitude: 77.2411 },
    address: "Thekkady, Idukki District",
    city: "Thekkady",
    state: "Kerala",
    category: "wildlife",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 180,
    entryFee: { indian: 25, foreign: 300 },
    amenities: ["boat-safari", "trekking", "spice-plantation", "accommodation"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["wildlife", "elephants", "boat-safari", "nature"],
    rating: 4.3
  },
  {
    id: "varkala-beach",
    name: "Varkala Beach",
    description: "Clifftop beach with natural springs and spiritual significance",
    location: { latitude: 8.7379, longitude: 76.7164 },
    address: "Varkala, Thiruvananthapuram District",
    city: "Varkala",
    state: "Kerala",
    category: "beach",
    openingHours: {
      monday: { open: "06:00", close: "20:00", closed: false },
      tuesday: { open: "06:00", close: "20:00", closed: false },
      wednesday: { open: "06:00", close: "20:00", closed: false },
      thursday: { open: "06:00", close: "20:00", closed: false },
      friday: { open: "06:00", close: "20:00", closed: false },
      saturday: { open: "06:00", close: "20:00", closed: false },
      sunday: { open: "06:00", close: "20:00", closed: false }
    },
    averageVisitDuration: 180,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["cliff-beach", "ayurveda", "sunset-view", "temple"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["beach", "cliff", "spiritual", "sunset"],
    rating: 4.4
  },
  {
    id: "hampi-ruins",
    name: "Hampi Ruins",
    description: "UNESCO World Heritage site with ancient Vijayanagara Empire ruins",
    location: { latitude: 15.3350, longitude: 76.4600 },
    address: "Hampi, Vijayanagara District",
    city: "Hampi",
    state: "Karnataka",
    category: "heritage",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 300,
    entryFee: { indian: 40, foreign: 600 },
    amenities: ["guide", "photography", "cycling", "heritage-walk"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["heritage", "ruins", "history", "unesco"],
    rating: 4.8
  },
  {
    id: "backwaters-alleppey",
    name: "Alleppey Backwaters",
    description: "Serene network of canals, lakes, and lagoons with houseboats",
    location: { latitude: 9.4981, longitude: 76.3388 },
    address: "Alappuzha District",
    city: "Alappuzha",
    state: "Kerala",
    category: "nature",
    openingHours: {
      monday: { open: "06:00", close: "20:00", closed: false },
      tuesday: { open: "06:00", close: "20:00", closed: false },
      wednesday: { open: "06:00", close: "20:00", closed: false },
      thursday: { open: "06:00", close: "20:00", closed: false },
      friday: { open: "06:00", close: "20:00", closed: false },
      saturday: { open: "06:00", close: "20:00", closed: false },
      sunday: { open: "06:00", close: "20:00", closed: false }
    },
    averageVisitDuration: 360,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["houseboat", "fishing", "photography", "ayurveda"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["backwaters", "houseboat", "nature", "peaceful"],
    rating: 4.4
  },
  {
    id: "chidambaram-temple",
    name: "Chidambaram Nataraja Temple",
    description: "Ancient temple dedicated to Lord Shiva as Nataraja, the cosmic dancer",
    location: { latitude: 11.3992, longitude: 79.6947 },
    address: "Chidambaram, Cuddalore District",
    city: "Chidambaram",
    state: "Tamil Nadu",
    category: "temple",
    openingHours: {
      monday: { open: "06:00", close: "22:00", closed: false },
      tuesday: { open: "06:00", close: "22:00", closed: false },
      wednesday: { open: "06:00", close: "22:00", closed: false },
      thursday: { open: "06:00", close: "22:00", closed: false },
      friday: { open: "06:00", close: "22:00", closed: false },
      saturday: { open: "06:00", close: "22:00", closed: false },
      sunday: { open: "06:00", close: "22:00", closed: false }
    },
    averageVisitDuration: 90,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["parking", "prasadam", "cultural-programs"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["temple", "nataraja", "spiritual", "culture"],
    rating: 4.6
  },
  {
    id: "ooty-hill-station",
    name: "Ooty (Udhagamandalam)",
    description: "Queen of Hill Stations with botanical gardens and toy train",
    location: { latitude: 11.4064, longitude: 76.6932 },
    address: "The Nilgiris District",
    city: "Ooty",
    state: "Tamil Nadu",
    category: "hill-station",
    openingHours: {
      monday: { open: "06:00", close: "19:00", closed: false },
      tuesday: { open: "06:00", close: "19:00", closed: false },
      wednesday: { open: "06:00", close: "19:00", closed: false },
      thursday: { open: "06:00", close: "19:00", closed: false },
      friday: { open: "06:00", close: "19:00", closed: false },
      saturday: { open: "06:00", close: "19:00", closed: false },
      sunday: { open: "06:00", close: "19:00", closed: false }
    },
    averageVisitDuration: 300,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["toy-train", "botanical-garden", "boating", "trekking"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ["hill-station", "toy-train", "gardens", "cool-climate"],
    rating: 4.3
  },
  {
    id: "kanyakumari",
    name: "Kanyakumari",
    description: "Southernmost tip of India where three seas meet",
    location: { latitude: 8.0883, longitude: 77.5385 },
    address: "Kanyakumari District",
    city: "Kanyakumari",
    state: "Tamil Nadu",
    category: "beach",
    openingHours: {
      monday: { open: "05:00", close: "21:00", closed: false },
      tuesday: { open: "05:00", close: "21:00", closed: false },
      wednesday: { open: "05:00", close: "21:00", closed: false },
      thursday: { open: "05:00", close: "21:00", closed: false },
      friday: { open: "05:00", close: "21:00", closed: false },
      saturday: { open: "05:00", close: "21:00", closed: false },
      sunday: { open: "05:00", close: "21:00", closed: false }
    },
    averageVisitDuration: 180,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["sunrise-sunset-view", "memorial", "shopping"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ["beach", "sunrise", "sunset", "three-seas"],
    rating: 4.4
  },
  {
    id: "golconda-fort",
    name: "Golconda Fort",
    description: "Historic fort complex with impressive architecture and acoustics",
    location: { latitude: 17.3833, longitude: 78.4011 },
    address: "Golconda, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    category: "fort",
    openingHours: {
      monday: { open: "09:00", close: "17:30", closed: false },
      tuesday: { open: "09:00", close: "17:30", closed: false },
      wednesday: { open: "09:00", close: "17:30", closed: false },
      thursday: { open: "09:00", close: "17:30", closed: false },
      friday: { open: "09:00", close: "17:30", closed: false },
      saturday: { open: "09:00", close: "17:30", closed: false },
      sunday: { open: "09:00", close: "17:30", closed: false }
    },
    averageVisitDuration: 120,
    entryFee: { indian: 25, foreign: 300 },
    amenities: ["parking", "guide", "sound-light-show"],
    bestTimeToVisit: ["morning", "evening"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["fort", "history", "architecture", "acoustics"],
    rating: 4.2
  },
  {
    id: "coorg-kodagu",
    name: "Coorg (Kodagu)",
    description: "Coffee country with lush landscapes and waterfalls",
    location: { latitude: 12.3375, longitude: 75.8069 },
    address: "Kodagu District",
    city: "Madikeri",
    state: "Karnataka",
    category: "hill-station",
    openingHours: {
      monday: { open: "06:00", close: "18:00", closed: false },
      tuesday: { open: "06:00", close: "18:00", closed: false },
      wednesday: { open: "06:00", close: "18:00", closed: false },
      thursday: { open: "06:00", close: "18:00", closed: false },
      friday: { open: "06:00", close: "18:00", closed: false },
      saturday: { open: "06:00", close: "18:00", closed: false },
      sunday: { open: "06:00", close: "18:00", closed: false }
    },
    averageVisitDuration: 240,
    entryFee: { indian: 0, foreign: 0 },
    amenities: ["trekking", "coffee-tasting", "waterfalls", "resorts"],
    bestTimeToVisit: ["morning", "afternoon"],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ["hills", "coffee", "nature", "waterfalls"],
    rating: 4.5
  }
];

async function seedDatabase() {
  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing places...');
    await Place.deleteMany({});

    // Insert new data
    console.log('🌱 Seeding database with South India places...');
    const insertedPlaces = await Place.insertMany(southIndiaPlaces);

    console.log(`✅ Successfully seeded ${insertedPlaces.length} places to the database`);

    // Log some stats
    const stats = await Place.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    console.log('\n📊 Database Statistics:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} places (avg rating: ${stat.avgRating.toFixed(1)})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, southIndiaPlaces };