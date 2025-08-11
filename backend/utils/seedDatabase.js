// backend/utils/seedDatabase.js
require('dotenv').config();
const connectDB = require('../config/database');
const Place = require('../models/Place');

// 20 Curated South Indian Tourist Places
const southIndianPlaces = [
  {
    id: 'meenakshi-temple-madurai',
    name: 'Meenakshi Amman Temple',
    description: 'A historic Hindu temple dedicated to Goddess Meenakshi, famous for its stunning Dravidian architecture with intricately carved towers and vibrant sculptures. One of the most important temples in Tamil Nadu.',
    location: {
      latitude: 9.9195,
      longitude: 78.1193
    },
    address: 'Madurai Main, Madurai, Tamil Nadu 625001',
    city: 'Madurai',
    state: 'Tamil Nadu',
    category: 'temple',
    openingHours: {
      monday: { open: '05:00', close: '22:00' },
      tuesday: { open: '05:00', close: '22:00' },
      wednesday: { open: '05:00', close: '22:00' },
      thursday: { open: '05:00', close: '22:00' },
      friday: { open: '05:00', close: '22:00' },
      saturday: { open: '05:00', close: '22:00' },
      sunday: { open: '05:00', close: '22:00' }
    },
    averageVisitDuration: 120,
    entryFee: {
      indian: 0,
      foreign: 50
    },
    amenities: ['Parking', 'Guided Tours', 'Photography', 'Shoe Storage', 'Temple Shop'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['hindu temple', 'architecture', 'cultural heritage', 'dravidian style', 'goddess meenakshi'],
    rating: 4.8
  },
  {
    id: 'mysore-palace-karnataka',
    name: 'Mysore Palace',
    description: 'The official residence of the Wadiyar dynasty and the kingdom of Mysore, known for its Indo-Saracenic architecture. The palace is illuminated on Sundays and during festivals, creating a magical spectacle.',
    location: {
      latitude: 12.3051,
      longitude: 76.6551
    },
    address: 'Sayyaji Rao Road, Mysuru, Karnataka 570001',
    city: 'Mysore',
    state: 'Karnataka',
    category: 'palace',
    openingHours: {
      monday: { open: '10:00', close: '17:30' },
      tuesday: { open: '10:00', close: '17:30' },
      wednesday: { open: '10:00', close: '17:30' },
      thursday: { open: '10:00', close: '17:30' },
      friday: { open: '10:00', close: '17:30' },
      saturday: { open: '10:00', close: '17:30' },
      sunday: { open: '10:00', close: '17:30' }
    },
    averageVisitDuration: 90,
    entryFee: {
      indian: 70,
      foreign: 200
    },
    amenities: ['Audio Guide', 'Museum', 'Gift Shop', 'Parking', 'Cafeteria'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['royal palace', 'indo-saracenic architecture', 'wadiyar dynasty', 'illumination'],
    rating: 4.6
  },
  {
    id: 'ooty-hill-station-tamilnadu',
    name: 'Ooty (Udhagamandalam)',
    description: 'The "Queen of Hill Stations" in the Nilgiri Mountains, famous for its tea gardens, botanical gardens, and toy train. A perfect hill retreat with pleasant climate year-round.',
    location: {
      latitude: 11.4064,
      longitude: 76.6932
    },
    address: 'Udhagamandalam, The Nilgiris, Tamil Nadu 643001',
    city: 'Ooty',
    state: 'Tamil Nadu',
    category: 'hill-station',
    openingHours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    averageVisitDuration: 480, // Full day
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Hotels', 'Restaurants', 'Toy Train', 'Botanical Garden', 'Lake', 'Shopping'],
    bestTimeToVisit: ['morning', 'afternoon', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['hill station', 'tea gardens', 'nilgiri mountains', 'toy train', 'botanical garden'],
    rating: 4.4
  },
  {
    id: 'hampi-karnataka-heritage',
    name: 'Hampi',
    description: 'UNESCO World Heritage Site showcasing the ruins of Vijayanagara Empire. Ancient temples, royal complexes, and boulder landscapes create a unique historical experience.',
    location: {
      latitude: 15.3350,
      longitude: 76.4600
    },
    address: 'Hampi, Vijayanagara, Karnataka 583239',
    city: 'Hampi',
    state: 'Karnataka',
    category: 'heritage',
    openingHours: {
      monday: { open: '06:00', close: '18:00' },
      tuesday: { open: '06:00', close: '18:00' },
      wednesday: { open: '06:00', close: '18:00' },
      thursday: { open: '06:00', close: '18:00' },
      friday: { open: '06:00', close: '18:00' },
      saturday: { open: '06:00', close: '18:00' },
      sunday: { open: '06:00', close: '18:00' }
    },
    averageVisitDuration: 360, // 6 hours
    entryFee: {
      indian: 40,
      foreign: 600
    },
    amenities: ['Archaeological Museum', 'Guided Tours', 'Coracle Rides', 'Bicycle Rental', 'Local Guides'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['unesco world heritage', 'vijayanagara empire', 'ancient ruins', 'historical site'],
    rating: 4.7
  },
  {
    id: 'marina-beach-chennai',
    name: 'Marina Beach',
    description: 'World\'s second longest urban beach stretching 13km along the Bay of Bengal. Popular for evening walks, local food stalls, and cultural activities.',
    location: {
      latitude: 13.0487,
      longitude: 80.2785
    },
    address: 'Marina Beach, Chennai, Tamil Nadu 600006',
    city: 'Chennai',
    state: 'Tamil Nadu',
    category: 'beach',
    openingHours: {
      monday: { open: '05:00', close: '21:00' },
      tuesday: { open: '05:00', close: '21:00' },
      wednesday: { open: '05:00', close: '21:00' },
      thursday: { open: '05:00', close: '21:00' },
      friday: { open: '05:00', close: '21:00' },
      saturday: { open: '05:00', close: '21:00' },
      sunday: { open: '05:00', close: '21:00' }
    },
    averageVisitDuration: 150,
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Food Stalls', 'Horse Riding', 'Parking', 'Rest Areas', 'Police Station'],
    bestTimeToVisit: ['evening', 'morning'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['urban beach', 'bay of bengal', 'evening walks', 'street food'],
    rating: 4.2
  },
  {
    id: 'backwaters-alleppey-kerala',
    name: 'Backwaters of Alleppey',
    description: 'Serene network of canals, rivers, and lakes lined with coconut trees. Famous for houseboat cruises offering a unique glimpse into Kerala\'s rural life.',
    location: {
      latitude: 9.4981,
      longitude: 76.3388
    },
    address: 'Alappuzha, Kerala 688001',
    city: 'Alleppey',
    state: 'Kerala',
    category: 'nature',
    openingHours: {
      monday: { open: '06:00', close: '18:00' },
      tuesday: { open: '06:00', close: '18:00' },
      wednesday: { open: '06:00', close: '18:00' },
      thursday: { open: '06:00', close: '18:00' },
      friday: { open: '06:00', close: '18:00' },
      saturday: { open: '06:00', close: '18:00' },
      sunday: { open: '06:00', close: '18:00' }
    },
    averageVisitDuration: 480, // 8 hours (full day cruise)
    entryFee: {
      indian: 500,
      foreign: 1000
    },
    amenities: ['Houseboat Cruises', 'Traditional Meals', 'Fishing', 'Bird Watching', 'Village Tours'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['backwaters', 'houseboat cruise', 'kerala canals', 'rural life'],
    rating: 4.5
  },
  {
    id: 'munnar-tea-gardens-kerala',
    name: 'Munnar Tea Gardens',
    description: 'Picturesque hill station known for endless tea plantations, misty hills, and pleasant climate. Home to the endangered Nilgiri Tahr and exotic flora.',
    location: {
      latitude: 10.0889,
      longitude: 77.0595
    },
    address: 'Munnar, Idukki, Kerala 685612',
    city: 'Munnar',
    state: 'Kerala',
    category: 'hill-station',
    openingHours: {
      monday: { open: '24:00', close: '24:00' },
      tuesday: { open: '24:00', close: '24:00' },
      wednesday: { open: '24:00', close: '24:00' },
      thursday: { open: '24:00', close: '24:00' },
      friday: { open: '24:00', close: '24:00' },
      saturday: { open: '24:00', close: '24:00' },
      sunday: { open: '24:00', close: '24:00' }
    },
    averageVisitDuration: 360,
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Tea Museum', 'Trekking Trails', 'Wildlife Sanctuary', 'Resorts', 'Spice Gardens'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['tea plantations', 'hill station', 'western ghats', 'nilgiri tahr'],
    rating: 4.6
  },
  {
    id: 'charminar-hyderabad-telangana',
    name: 'Charminar',
    description: 'Iconic 16th-century mosque and monument in Hyderabad\'s old city. Symbol of Hyderabad with four grand arches and minarets, surrounded by bustling bazaars.',
    location: {
      latitude: 17.3616,
      longitude: 78.4747
    },
    address: 'Charminar Road, Char Kaman, Ghansi Bazaar, Hyderabad, Telangana 500002',
    city: 'Hyderabad',
    state: 'Telangana',
    category: 'heritage',
    openingHours: {
      monday: { open: '09:30', close: '17:30' },
      tuesday: { open: '09:30', close: '17:30' },
      wednesday: { open: '09:30', close: '17:30' },
      thursday: { open: '09:30', close: '17:30' },
      friday: { open: '14:00', close: '17:30' },
      saturday: { open: '09:30', close: '17:30' },
      sunday: { open: '09:30', close: '17:30' }
    },
    averageVisitDuration: 90,
    entryFee: {
      indian: 25,
      foreign: 300
    },
    amenities: ['Laad Bazaar', 'Photography', 'Local Shopping', 'Street Food', 'Guided Tours'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['qutb shahi architecture', 'hyderabad symbol', 'heritage monument', 'bazaars'],
    rating: 4.3
  },
  {
    id: 'golconda-fort-hyderabad',
    name: 'Golconda Fort',
    description: 'Magnificent medieval fortress known for its acoustic architecture and diamond trade history. Offers panoramic views of Hyderabad city.',
    location: {
      latitude: 17.3833,
      longitude: 78.4011
    },
    address: 'Ibrahim Bagh, Hyderabad, Telangana 500008',
    city: 'Hyderabad',
    state: 'Telangana',
    category: 'fort',
    openingHours: {
      monday: { open: '09:00', close: '17:30' },
      tuesday: { open: '09:00', close: '17:30' },
      wednesday: { open: '09:00', close: '17:30' },
      thursday: { open: '09:00', close: '17:30' },
      friday: { open: '09:00', close: '17:30' },
      saturday: { open: '09:00', close: '17:30' },
      sunday: { open: '09:00', close: '17:30' }
    },
    averageVisitDuration: 180,
    entryFee: {
      indian: 25,
      foreign: 300
    },
    amenities: ['Sound and Light Show', 'Archaeological Museum', 'Parking', 'Guided Tours', 'Photography'],
    bestTimeToVisit: ['morning', 'afternoon', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['medieval fort', 'qutb shahi dynasty', 'acoustic architecture', 'diamond trade'],
    rating: 4.4
  },
  {
    id: 'rameshwaram-temple-tamilnadu',
    name: 'Ramanathaswamy Temple',
    description: 'One of the twelve Jyotirlinga temples dedicated to Lord Shiva, located on Rameswaram island. Famous for its magnificent corridors and sacred significance.',
    location: {
      latitude: 9.2881,
      longitude: 79.3129
    },
    address: 'Rameswaram, Tamil Nadu 623526',
    city: 'Rameswaram',
    state: 'Tamil Nadu',
    category: 'temple',
    openingHours: {
      monday: { open: '05:00', close: '13:00' },
      tuesday: { open: '05:00', close: '13:00' },
      wednesday: { open: '05:00', close: '13:00' },
      thursday: { open: '05:00', close: '13:00' },
      friday: { open: '05:00', close: '13:00' },
      saturday: { open: '05:00', close: '13:00' },
      sunday: { open: '05:00', close: '13:00' }
    },
    averageVisitDuration: 120,
    entryFee: {
      indian: 0,
      foreign: 50
    },
    amenities: ['Sacred Tanks', 'Pilgrimage Facilities', 'Temple Shop', 'Parking', 'Shoe Storage'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['jyotirlinga', 'lord shiva', 'pilgrimage site', 'sacred corridors'],
    rating: 4.7
  },
  {
    id: 'mahabalipuram-shore-temple',
    name: 'Shore Temple, Mahabalipuram',
    description: 'UNESCO World Heritage site featuring ancient rock-cut temples and sculptures from the 7th century. Exemplifies Pallava architecture facing the Bay of Bengal.',
    location: {
      latitude: 12.6269,
      longitude: 80.1992
    },
    address: 'Mahabalipuram, Chengalpattu, Tamil Nadu 603104',
    city: 'Mahabalipuram',
    state: 'Tamil Nadu',
    category: 'heritage',
    openingHours: {
      monday: { open: '06:00', close: '18:00' },
      tuesday: { open: '06:00', close: '18:00' },
      wednesday: { open: '06:00', close: '18:00' },
      thursday: { open: '06:00', close: '18:00' },
      friday: { open: '06:00', close: '18:00' },
      saturday: { open: '06:00', close: '18:00' },
      sunday: { open: '06:00', close: '18:00' }
    },
    averageVisitDuration: 180,
    entryFee: {
      indian: 30,
      foreign: 500
    },
    amenities: ['Archaeological Museum', 'Beach Access', 'Photography', 'Guided Tours', 'Parking'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['unesco world heritage', 'pallava architecture', 'rock-cut temples', 'shore temple'],
    rating: 4.5
  },
  {
    id: 'coorg-coffee-plantations-karnataka',
    name: 'Coorg (Kodagu)',
    description: 'Scotland of India, famous for coffee plantations, mist-covered hills, and unique Coorgi culture. Perfect destination for nature lovers and adventure enthusiasts.',
    location: {
      latitude: 12.3375,
      longitude: 75.8069
    },
    address: 'Madikeri, Kodagu, Karnataka 571201',
    city: 'Coorg',
    state: 'Karnataka',
    category: 'hill-station',
    openingHours: {
      monday: { open: '06:00', close: '18:00' },
      tuesday: { open: '06:00', close: '18:00' },
      wednesday: { open: '06:00', close: '18:00' },
      thursday: { open: '06:00', close: '18:00' },
      friday: { open: '06:00', close: '18:00' },
      saturday: { open: '06:00', close: '18:00' },
      sunday: { open: '06:00', close: '18:00' }
    },
    averageVisitDuration: 480, // Full day
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Coffee Estate Tours', 'Trekking', 'Waterfalls', 'Wildlife Sanctuary', 'Homestays'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['coffee plantations', 'western ghats', 'coorgi culture', 'hill station'],
    rating: 4.5
  },
  {
    id: 'kanyakumari-southern-tip',
    name: 'Kanyakumari',
    description: 'Southernmost tip of mainland India where Arabian Sea, Indian Ocean, and Bay of Bengal meet. Famous for spectacular sunrise and sunset views.',
    location: {
      latitude: 8.0883,
      longitude: 77.5385
    },
    address: 'Kanyakumari, Tamil Nadu 629702',
    city: 'Kanyakumari',
    state: 'Tamil Nadu',
    category: 'beach',
    openingHours: {
      monday: { open: '04:00', close: '20:00' },
      tuesday: { open: '04:00', close: '20:00' },
      wednesday: { open: '04:00', close: '20:00' },
      thursday: { open: '04:00', close: '20:00' },
      friday: { open: '04:00', close: '20:00' },
      saturday: { open: '04:00', close: '20:00' },
      sunday: { open: '04:00', close: '20:00' }
    },
    averageVisitDuration: 240,
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Vivekananda Rock Memorial', 'Thiruvalluvar Statue', 'Ferry Services', 'Sunset Point', 'Beach'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['southernmost point', 'confluence of seas', 'sunrise sunset', 'vivekananda memorial'],
    rating: 4.3
  },
  {
    id: 'bandipur-wildlife-sanctuary',
    name: 'Bandipur National Park',
    description: 'Premier wildlife sanctuary in Karnataka, part of the Nilgiri Biosphere Reserve. Home to tigers, elephants, and diverse wildlife in deciduous forests.',
    location: {
      latitude: 11.7401,
      longitude: 76.5026
    },
    address: 'Bandipur, Chamarajanagar, Karnataka 571126',
    city: 'Bandipur',
    state: 'Karnataka',
    category: 'wildlife',
    openingHours: {
      monday: { open: '06:30', close: '09:00' },
      tuesday: { open: '06:30', close: '09:00' },
      wednesday: { open: '06:30', close: '09:00' },
      thursday: { open: '06:30', close: '09:00' },
      friday: { open: '06:30', close: '09:00' },
      saturday: { open: '06:30', close: '09:00' },
      sunday: { open: '06:30', close: '09:00' }
    },
    averageVisitDuration: 180,
    entryFee: {
      indian: 80,
      foreign: 300
    },
    amenities: ['Safari Rides', 'Wildlife Photography', 'Nature Walks', 'Forest Guest House', 'Interpretation Center'],
    bestTimeToVisit: ['morning'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['wildlife sanctuary', 'tiger reserve', 'nilgiri biosphere', 'safari'],
    rating: 4.4
  },
  {
    id: 'tirumala-tirupati-temple',
    name: 'Tirumala Venkateswara Temple',
    description: 'One of the richest and most visited temples in the world, dedicated to Lord Venkateswara. Located on the seven hills of Tirumala.',
    location: {
      latitude: 13.6288,
      longitude: 79.4192
    },
    address: 'Tirumala, Tirupati, Andhra Pradesh 517504',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    category: 'temple',
    openingHours: {
      monday: { open: '02:30', close: '02:00' },
      tuesday: { open: '02:30', close: '02:00' },
      wednesday: { open: '02:30', close: '02:00' },
      thursday: { open: '02:30', close: '02:00' },
      friday: { open: '02:30', close: '02:00' },
      saturday: { open: '02:30', close: '02:00' },
      sunday: { open: '02:30', close: '02:00' }
    },
    averageVisitDuration: 300, // 5 hours including waiting
    entryFee: {
      indian: 0,
      foreign: 300
    },
    amenities: ['TTD Services', 'Accommodation', 'Prasadam', 'Darshan Booking', 'Hair Donation'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['lord venkateswara', 'seven hills', 'richest temple', 'pilgrimage'],
    rating: 4.6
  },
  {
    id: 'wayanad-kerala-hills',
    name: 'Wayanad',
    description: 'Pristine hill station in Kerala known for spice plantations, wildlife sanctuaries, and ancient caves. Perfect blend of adventure and tranquility.',
    location: {
      latitude: 11.6854,
      longitude: 76.1320
    },
    address: 'Wayanad, Kerala 673121',
    city: 'Wayanad',
    state: 'Kerala',
    category: 'hill-station',
    openingHours: {
      monday: { open: '06:00', close: '18:00' },
      tuesday: { open: '06:00', close: '18:00' },
      wednesday: { open: '06:00', close: '18:00' },
      thursday: { open: '06:00', close: '18:00' },
      friday: { open: '06:00', close: '18:00' },
      saturday: { open: '06:00', close: '18:00' },
      sunday: { open: '06:00', close: '18:00' }
    },
    averageVisitDuration: 480, // Full day
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Spice Gardens', 'Wildlife Sanctuary', 'Trekking Trails', 'Waterfalls', 'Cave Exploration'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['spice plantations', 'western ghats', 'wildlife sanctuary', 'edakkal caves'],
    rating: 4.5
  },
  {
    id: 'pondicherry-french-quarter',
    name: 'French Quarter, Pondicherry',
    description: 'Former French colonial settlement with distinctive European architecture, tree-lined streets, and vibrant cafes. Unique blend of Indian and French cultures.',
    location: {
      latitude: 11.9416,
      longitude: 79.8083
    },
    address: 'French Quarter, Puducherry 605001',
    city: 'Pondicherry',
    state: 'Puducherry',
    category: 'heritage',
    openingHours: {
      monday: { open: '06:00', close: '22:00' },
      tuesday: { open: '06:00', close: '22:00' },
      wednesday: { open: '06:00', close: '22:00' },
      thursday: { open: '06:00', close: '22:00' },
      friday: { open: '06:00', close: '22:00' },
      saturday: { open: '06:00', close: '22:00' },
      sunday: { open: '06:00', close: '22:00' }
    },
    averageVisitDuration: 240,
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['French Cafes', 'Heritage Walks', 'Aurobindo Ashram', 'Beach Promenade', 'Museums'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['french colonial', 'heritage architecture', 'cultural fusion', 'aurobindo ashram'],
    rating: 4.2
  },
  {
    id: 'brihadeshwara-temple-thanjavur',
    name: 'Brihadeeshwarar Temple',
    description: 'UNESCO World Heritage Site and architectural masterpiece of Chola dynasty. One of the largest temples in India with a towering vimana.',
    location: {
      latitude: 10.7829,
      longitude: 79.1378
    },
    address: 'Thanjavur, Tamil Nadu 613007',
    city: 'Thanjavur',
    state: 'Tamil Nadu',
    category: 'temple',
    openingHours: {
      monday: { open: '06:00', close: '12:30' },
      tuesday: { open: '06:00', close: '12:30' },
      wednesday: { open: '06:00', close: '12:30' },
      thursday: { open: '06:00', close: '12:30' },
      friday: { open: '06:00', close: '12:30' },
      saturday: { open: '06:00', close: '12:30' },
      sunday: { open: '06:00', close: '12:30' }
    },
    averageVisitDuration: 120,
    entryFee: {
      indian: 30,
      foreign: 500
    },
    amenities: ['Archaeological Survey', 'Museum', 'Photography', 'Guided Tours', 'Cultural Programs'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['unesco world heritage', 'chola architecture', 'big temple', 'lord shiva'],
    rating: 4.7
  },
  {
    id: 'belur-halebidu-temples',
    name: 'Belur and Halebidu Temples',
    description: 'Exquisite Hoysala architecture temples from 12th century. Intricate stone carvings depicting Hindu mythology and celestial dancers.',
    location: {
      latitude: 13.1622,
      longitude: 75.8651
    },
    address: 'Belur, Hassan, Karnataka 573115',
    city: 'Belur',
    state: 'Karnataka',
    category: 'temple',
    openingHours: {
      monday: { open: '06:00', close: '18:00' },
      tuesday: { open: '06:00', close: '18:00' },
      wednesday: { open: '06:00', close: '18:00' },
      thursday: { open: '06:00', close: '18:00' },
      friday: { open: '06:00', close: '18:00' },
      saturday: { open: '06:00', close: '18:00' },
      sunday: { open: '06:00', close: '18:00' }
    },
    averageVisitDuration: 240,
    entryFee: {
      indian: 25,
      foreign: 300
    },
    amenities: ['Archaeological Museum', 'Guided Tours', 'Photography', 'Parking', 'Local Handicrafts'],
    bestTimeToVisit: ['morning', 'afternoon'],
    kidFriendly: true,
    wheelchairAccessible: false,
    tags: ['hoysala architecture', 'stone carvings', 'chennakeshava temple', 'hoysaleswara temple'],
    rating: 4.6
  },
  {
    id: 'gokarna-karnataka-beaches',
    name: 'Gokarna Beaches',
    description: 'Sacred town with pristine beaches and ancient temples. Popular pilgrimage site offering both spiritual and beach experiences.',
    location: {
      latitude: 14.5426,
      longitude: 74.3188
    },
    address: 'Gokarna, Uttara Kannada, Karnataka 581326',
    city: 'Gokarna',
    state: 'Karnataka',
    category: 'beach',
    openingHours: {
      monday: { open: '05:00', close: '20:00' },
      tuesday: { open: '05:00', close: '20:00' },
      wednesday: { open: '05:00', close: '20:00' },
      thursday: { open: '05:00', close: '20:00' },
      friday: { open: '05:00', close: '20:00' },
      saturday: { open: '05:00', close: '20:00' },
      sunday: { open: '05:00', close: '20:00' }
    },
    averageVisitDuration: 300,
    entryFee: {
      indian: 0,
      foreign: 0
    },
    amenities: ['Beach Shacks', 'Water Sports', 'Temple Complex', 'Trekking', 'Backpacker Hostels'],
    bestTimeToVisit: ['morning', 'evening'],
    kidFriendly: true,
    wheelchairAccessible: true,
    tags: ['pristine beaches', 'pilgrimage site', 'mahabaleshwar temple', 'arabian sea'],
    rating: 4.4
  }
];


async function seedPlaces() {
  try {
    // Clear existing places
    console.log('🔄 Clearing existing places...');
    await Place.deleteMany({});
    
    // Insert new places
    console.log('📍 Inserting South Indian places...');
    const insertedPlaces = await Place.insertMany(southIndianPlaces);
    
    console.log(`✅ Successfully inserted ${insertedPlaces.length} places:`);
    
    // Display summary by state and category
    const summary = {};
    const categoryCount = {};
    
    insertedPlaces.forEach(place => {
      // Count by state
      if (!summary[place.state]) summary[place.state] = 0;
      summary[place.state]++;
      
      // Count by category
      if (!categoryCount[place.category]) categoryCount[place.category] = 0;
      categoryCount[place.category]++;
      
      console.log(`  • ${place.name} (${place.city}, ${place.state}) - ${place.category}`);
    });
    
    console.log('\n📊 Summary by State:');
    Object.entries(summary).forEach(([state, count]) => {
      console.log(`  ${state}: ${count} places`);
    });
    
    console.log('\n📊 Summary by Category:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} places`);
    });
    
    // Create indexes for better performance
    console.log('\n🔍 Creating database indexes...');
    await Place.createIndexes();
    console.log('✅ Indexes created successfully');
    
    return insertedPlaces;
    
  } catch (error) {
    console.error('❌ Error seeding places:', error);
    throw error;
  }
}

async function validatePlaces() {
  try {
    console.log('\n🔍 Validating inserted places...');
    
    const places = await Place.find({});
    const validationResults = {
      total: places.length,
      errors: [],
      warnings: []
    };
    
    places.forEach(place => {
      // Validate required fields
      if (!place.location || !place.location.latitude || !place.location.longitude) {
        validationResults.errors.push(`${place.name}: Missing or invalid location`);
      }
      
      if (!place.averageVisitDuration || place.averageVisitDuration < 30) {
        validationResults.warnings.push(`${place.name}: Very short visit duration (${place.averageVisitDuration}min)`);
      }
      
      if (!place.entryFee || (place.entryFee.indian === undefined || place.entryFee.foreign === undefined)) {
        validationResults.warnings.push(`${place.name}: Missing entry fee information`);
      }
      
      if (!place.rating || place.rating < 1 || place.rating > 5) {
        validationResults.errors.push(`${place.name}: Invalid rating (${place.rating})`);
      }
      
      // Validate coordinates are within South India bounds
      if (place.location && place.location.latitude && place.location.longitude) {
        const lat = place.location.latitude;
        const lng = place.location.longitude;
        
        if (lat < 8 || lat > 20 || lng < 68 || lng > 84) {
          validationResults.warnings.push(`${place.name}: Coordinates may be outside South India bounds`);
        }
      }
    });
    
    console.log(`📊 Validation Results:`);
    console.log(`  Total places: ${validationResults.total}`);
    console.log(`  Errors: ${validationResults.errors.length}`);
    console.log(`  Warnings: ${validationResults.warnings.length}`);
    
    if (validationResults.errors.length > 0) {
      console.log('\n❌ Errors found:');
      validationResults.errors.forEach(error => console.log(`  • ${error}`));
    }
    
    if (validationResults.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      validationResults.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    if (validationResults.errors.length === 0) {
      console.log('✅ All places validated successfully!');
    }
    
    return validationResults;
    
  } catch (error) {
    console.error('❌ Error validating places:', error);
    throw error;
  }
}

async function generateStatistics() {
  try {
    console.log('\n📈 Generating statistics...');
    
    const [
      totalPlaces,
      byState,
      byCategory,
      avgRating,
      freeEntryPlaces,
      avgVisitDuration,
      accessiblePlaces,
      kidFriendlyPlaces
    ] = await Promise.all([
      Place.countDocuments(),
      Place.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 }, places: { $push: '$name' } } },
        { $sort: { count: -1 } }
      ]),
      Place.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
        { $sort: { count: -1 } }
      ]),
      Place.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),
      Place.countDocuments({ 'entryFee.indian': 0 }),
      Place.aggregate([
        { $group: { _id: null, avgDuration: { $avg: '$averageVisitDuration' } } }
      ]),
      Place.countDocuments({ wheelchairAccessible: true }),
      Place.countDocuments({ kidFriendly: true })
    ]);
    
    const stats = {
      overview: {
        totalPlaces,
        averageRating: Number(avgRating[0]?.avgRating?.toFixed(2)) || 0,
        freeEntryPlaces,
        averageVisitDuration: Math.round(avgVisitDuration[0]?.avgDuration || 0),
        accessiblePlaces,
        kidFriendlyPlaces
      },
      byState,
      byCategory
    };
    
    console.log(`📊 Database Statistics:`);
    console.log(`  Total Places: ${stats.overview.totalPlaces}`);
    console.log(`  Average Rating: ${stats.overview.averageRating}/5`);
    console.log(`  Free Entry Places: ${stats.overview.freeEntryPlaces}`);
    console.log(`  Average Visit Duration: ${stats.overview.averageVisitDuration} minutes`);
    console.log(`  Wheelchair Accessible: ${stats.overview.accessiblePlaces}`);
    console.log(`  Kid Friendly: ${stats.overview.kidFriendlyPlaces}`);
    
    console.log(`\n📍 Distribution by State:`);
    stats.byState.forEach(state => {
      console.log(`  ${state._id}: ${state.count} places`);
    });
    
    console.log(`\n🏛️ Distribution by Category:`);
    stats.byCategory.forEach(category => {
      console.log(`  ${category._id}: ${category.count} places (avg rating: ${category.avgRating.toFixed(1)})`);
    });
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error generating statistics:', error);
    throw error;
  }
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('🚀 Starting South Indian Places Database Seeding...\n');
    
    await connectDB();
    const places = await seedPlaces();
    await validatePlaces();
    await generateStatistics();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log(`📍 ${places.length} South Indian tourist places are now available in your database.`);
    console.log('\n🎯 Next Steps:');
    console.log('  1. Start your backend server: npm run dev');
    console.log('  2. Test the places API: GET /api/places');
    console.log('  3. Try route optimization with your favorite places!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } 
}

// Export functions for use in other modules
module.exports = {
  seedDatabase,
  seedPlaces,
  validatePlaces,
  generateStatistics,
  southIndianPlaces
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}