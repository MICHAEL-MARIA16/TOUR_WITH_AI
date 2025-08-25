// Enhanced PlaceDetailsDropdown Component with AI-Generated Details
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Star, 
  IndianRupee, 
  Camera, 
  Utensils, 
  Car, 
  Gift, 
  AlertCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Loader,
  CheckCircle,
  Users,
  Calendar,
  Thermometer,
  Navigation,
  ShoppingBag,
  Heart,
  Coffee,
  Wifi,
  Accessibility,
  Phone,
  Globe,
  Timer,
  Activity,
  Sun,
  CloudRain,
  Wind
} from 'lucide-react';

const PlaceDetailsDropdown = ({ place, isExpanded, onToggle, routeSettings }) => {
  const [detailedInfo, setDetailedInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate comprehensive place details using Gemini AI
  const generateDetailedInfo = async () => {
    if (detailedInfo) return; // Already loaded
    
    setLoading(true);
    setError(null);

    try {
      const payload = {
        place: {
          id: place.id,
          name: place.name,
          city: place.city,
          state: place.state,
          category: place.category,
          rating: place.rating,
          description: place.description,
          amenities: place.amenities || [],
          averageVisitDuration: place.averageVisitDuration,
          entryFee: place.entryFee,
          bestTimeToVisit: place.bestTimeToVisit || [],
          location: place.location
        },
        context: {
          startTime: routeSettings?.startTime || '09:00',
          season: getCurrentSeason(),
          userPreferences: routeSettings?.preferences || {},
          currentMonth: new Date().getMonth() + 1
        }
      };

      const response = await fetch('/api/places/generate-detailed-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to generate detailed information');
      }

      const result = await response.json();
      setDetailedInfo(result.data);

    } catch (error) {
      console.error('Error generating detailed info:', error);
      setError(error.message);
      // Fallback to basic info if AI generation fails
      generateFallbackInfo();
    } finally {
      setLoading(false);
    }
  };

  // Fallback information generator
  const generateFallbackInfo = () => {
    const fallbackInfo = {
      visitPlan: {
        optimalArrivalTime: place.bestTimeToVisit?.[0] === 'morning' ? '09:00' : 
                            place.bestTimeToVisit?.[0] === 'evening' ? '17:00' : '14:00',
        recommendedDuration: place.averageVisitDuration || 90,
        departureTime: calculateDepartureTime(),
        bestWeatherTime: place.category === 'beach' ? 'Early morning or evening' : 
                        place.category === 'temple' ? 'Early morning' : 'Any time',
        crowdLevel: 'Medium',
        waitTime: '15-30 minutes'
      },
      activities: {
        mainActivities: getActivityByCategory(place.category),
        photography: {
          allowed: true,
          restrictions: place.category === 'temple' ? 'No flash inside sanctum' : 'Allowed everywhere',
          bestSpots: [`Main ${place.category}`, 'Entrance area', 'Surrounding gardens'],
          bestTime: 'Golden hour (6-8 AM, 5-7 PM)'
        },
        specialExperiences: getSpecialExperiences(place.category)
      },
      facilities: {
        parking: 'Available nearby',
        restrooms: 'Available',
        accessibility: place.wheelchairAccessible ? 'Wheelchair accessible' : 'Limited accessibility',
        wifi: 'Not specified',
        foodCourt: place.category === 'heritage' || place.category === 'palace' ? 'Available' : 'Not available',
        giftShop: 'Available at entrance'
      },
      foodAndDining: {
        localSpecialties: getLocalFood(place.state),
        nearbyRestaurants: 'Local restaurants within 1km',
        streetFood: place.city === 'Chennai' || place.city === 'Bangalore' ? 'Excellent street food nearby' : 'Local snacks available',
        dietaryOptions: 'Vegetarian and non-vegetarian options available',
        priceRange: '₹50-300 per person'
      },
      shopping: {
        souvenirs: getSouvenirsByCategory(place.category),
        localCrafts: getLocalCrafts(place.state),
        nearbyMarkets: 'Local markets within walking distance',
        specialItems: getSpecialItems(place.category, place.state),
        priceRange: '₹20-2000'
      },
      transportation: {
        recommendedMode: 'Car/Taxi',
        publicTransport: 'Local buses available',
        parking: 'Paid parking available',
        walkingDistance: 'Short walk from parking',
        accessibility: 'Moderate accessibility'
      },
      budget: {
        entryFee: {
          indian: place.entryFee?.indian || 0,
          foreign: place.entryFee?.foreign || (place.entryFee?.indian * 10) || 0,
          children: Math.floor((place.entryFee?.indian || 0) / 2),
          students: Math.floor((place.entryFee?.indian || 0) * 0.75)
        },
        estimatedTotal: calculateEstimatedBudget(place),
        breakdown: {
          entry: place.entryFee?.indian || 0,
          food: 200,
          transport: 100,
          shopping: 300,
          miscellaneous: 100
        }
      },
      timing: {
        openingHours: place.openingHours || { general: '06:00-18:00' },
        bestMonthsToVisit: getBestMonths(place.category, place.state),
        weatherConsiderations: getWeatherTips(place.category),
        seasonalSpecial: getSeasonalEvents(place.category),
        crowdPatterns: {
          weekdays: 'Moderate crowds',
          weekends: 'High crowds',
          festivals: 'Very crowded',
          bestTime: 'Early morning or late afternoon'
        }
      },
      tips: {
        beforeVisit: getPreVisitTips(place.category),
        duringVisit: getDuringVisitTips(place.category),
        afterVisit: ['Share your experience', 'Rate the place', 'Recommend to friends'],
        dressCode: place.category === 'temple' ? 'Modest clothing required' : 'Casual comfortable clothing',
        whatToBring: ['Water bottle', 'Comfortable shoes', 'Camera', 'Sun protection']
      },
      contact: {
        phone: 'Contact information not available',
        website: 'Official website not available',
        email: 'Email not available',
        socialMedia: 'Check local tourism board'
      }
    };

    setDetailedInfo(fallbackInfo);
  };

  // Load detailed info when expanded
  useEffect(() => {
    if (isExpanded && !detailedInfo && !loading) {
      generateDetailedInfo();
    }
  }, [isExpanded]);

  // Helper functions
  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 5) return 'summer';
    if (month >= 6 && month <= 9) return 'monsoon';
    return 'winter';
  };

  const calculateDepartureTime = () => {
    const duration = place.averageVisitDuration || 90;
    // Add calculation logic here
    return '11:30'; // Placeholder
  };

  const getActivityByCategory = (category) => {
    const activities = {
      'temple': ['Prayer and worship', 'Architecture appreciation', 'Cultural learning', 'Photography'],
      'palace': ['Royal architecture tour', 'Historical exploration', 'Museum visit', 'Garden walk'],
      'beach': ['Beach walking', 'Water activities', 'Sunset viewing', 'Beach sports'],
      'hill-station': ['Nature walks', 'Scenic photography', 'Weather enjoyment', 'Adventure activities'],
      'heritage': ['Historical tour', 'Archaeological exploration', 'Educational visit', 'Cultural immersion'],
      'fort': ['Historical exploration', 'Architecture study', 'Panoramic views', 'Photography'],
      'museum': ['Educational tour', 'Art appreciation', 'Cultural learning', 'Interactive exhibits'],
      'nature': ['Nature photography', 'Wildlife observation', 'Fresh air', 'Peaceful meditation']
    };
    return activities[category] || ['Sightseeing', 'Photography', 'Cultural experience', 'Relaxation'];
  };

  const getSpecialExperiences = (category) => {
    const experiences = {
      'temple': ['Participate in aarti ceremony', 'Learn about Hindu traditions', 'Architectural photography'],
      'palace': ['Royal heritage walk', 'Light and sound show', 'Traditional cultural programs'],
      'beach': ['Sunrise/sunset viewing', 'Water sports', 'Beach camping'],
      'heritage': ['Archaeological workshops', 'Guided historical tours', 'UNESCO site exploration'],
      'museum': ['Interactive exhibits', 'Educational workshops', 'Cultural events']
    };
    return experiences[category] || ['Guided tours', 'Photography sessions', 'Cultural interactions'];
  };

  const getLocalFood = (state) => {
    const foods = {
      'Tamil Nadu': ['Idli, Dosa, Sambar', 'Chettinad cuisine', 'Filter coffee', 'Pongal'],
      'Kerala': ['Appam and stew', 'Fish curry', 'Coconut-based dishes', 'Banana chips'],
      'Karnataka': ['Bisi bele bath', 'Mysore pak', 'Ragi mudde', 'South Indian thali'],
      'Andhra Pradesh': ['Biryani', 'Spicy curries', 'Pesarattu', 'Gongura dishes'],
      'Telangana': ['Hyderabadi biryani', 'Haleem', 'Nihari', 'Qubani ka meetha']
    };
    return foods[state] || ['South Indian cuisine', 'Local specialties', 'Traditional meals', 'Street food'];
  };

  const getSouvenirsByCategory = (category) => {
    const souvenirs = {
      'temple': ['Religious artifacts', 'Prasadam', 'Sacred books', 'Incense'],
      'palace': ['Royal replicas', 'Historical books', 'Miniature paintings', 'Jewelry'],
      'heritage': ['Archaeological replicas', 'Historical guides', 'Postcards', 'Books'],
      'beach': ['Seashells', 'Beach art', 'Local crafts', 'Coconut products']
    };
    return souvenirs[category] || ['Local handicrafts', 'Traditional items', 'Cultural artifacts', 'Postcards'];
  };

  const getLocalCrafts = (state) => {
    const crafts = {
      'Tamil Nadu': ['Tanjore paintings', 'Bronze sculptures', 'Kanchipuram silk', 'Wooden crafts'],
      'Kerala': ['Kathakali masks', 'Coconut products', 'Spices', 'Traditional boats models'],
      'Karnataka': ['Mysore silk', 'Sandalwood products', 'Channapatna toys', 'Coffee'],
      'Andhra Pradesh': ['Kalamkari textiles', 'Bidriware', 'Pearls', 'Handwoven sarees']
    };
    return crafts[state] || ['Local handicrafts', 'Traditional textiles', 'Artwork', 'Souvenirs'];
  };

  const getSpecialItems = (category, state) => {
    return [`${state} specialty items`, `${category}-specific souvenirs`, 'Local artwork', 'Cultural memorabilia'];
  };

  const calculateEstimatedBudget = (place) => {
    const entry = place.entryFee?.indian || 0;
    const food = 200;
    const transport = 100;
    const shopping = 300;
    const misc = 100;
    return entry + food + transport + shopping + misc;
  };

  const getBestMonths = (category, state) => {
    // General rule: Oct-Mar for most South Indian places
    return ['October', 'November', 'December', 'January', 'February', 'March'];
  };

  const getWeatherTips = (category) => {
    const tips = {
      'temple': 'Visit early morning or evening to avoid heat',
      'beach': 'Avoid midday sun, best during sunrise/sunset',
      'hill-station': 'Pack light woolens, weather can be unpredictable',
      'heritage': 'Carry water and sun protection for outdoor sites'
    };
    return tips[category] || 'Check weather conditions before visit';
  };

  const getSeasonalEvents = (category) => {
    return category === 'temple' ? 'Festival celebrations throughout the year' : 
           category === 'heritage' ? 'Cultural events and exhibitions' : 
           'Seasonal cultural programs';
  };

  const getPreVisitTips = (category) => {
    const tips = {
      'temple': ['Check dress code', 'Remove footwear', 'Respect photography rules', 'Learn basic customs'],
      'palace': ['Book tickets online', 'Check visiting hours', 'Allow sufficient time', 'Wear comfortable shoes'],
      'beach': ['Check tide timings', 'Apply sunscreen', 'Carry water', 'Wear appropriate clothing']
    };
    return tips[category] || ['Plan your visit', 'Check timings', 'Carry essentials', 'Respect local customs'];
  };

  const getDuringVisitTips = (category) => {
    const tips = {
      'temple': ['Maintain silence', 'Follow queue system', 'Don\'t touch artifacts', 'Be respectful'],
      'palace': ['Follow guided tour', 'Don\'t touch exhibits', 'Stay with group', 'Ask questions'],
      'beach': ['Stay hydrated', 'Watch for currents', 'Don\'t litter', 'Respect marine life']
    };
    return tips[category] || ['Follow guidelines', 'Be respectful', 'Stay safe', 'Enjoy responsibly'];
  };

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        <Info size={16} />
        View Your Complete Plan
        <ChevronDown size={16} />
      </button>
    );
  }

  return (
    <div className="mt-3 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin size={18} />
            Your Complete Plan for {place.name}
          </h3>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronUp size={18} />
          </button>
        </div>
        <p className="text-blue-100 text-sm mt-1">
          Everything you need to know for an amazing visit
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-6 text-center">
          <Loader className="animate-spin mx-auto mb-3 text-blue-600" size={32} />
          <p className="text-gray-600">Generating your personalized plan...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
          <p className="text-red-600 mb-2">Failed to generate detailed plan</p>
          <button
            onClick={() => {
              setError(null);
              generateDetailedInfo();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Detailed Information */}
      {detailedInfo && (
        <div className="p-6 space-y-6">
          
          {/* Visit Timeline */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Timer size={18} />
              Your Visit Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-2">
                  Arrival: {detailedInfo.visitPlan?.optimalArrivalTime}
                </div>
                <p className="text-xs text-green-700">Perfect timing for your visit</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-2">
                  Duration: {detailedInfo.visitPlan?.recommendedDuration} min
                </div>
                <p className="text-xs text-blue-700">Recommended time to spend</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium mb-2">
                  Departure: {detailedInfo.visitPlan?.departureTime}
                </div>
                <p className="text-xs text-purple-700">Leave by this time</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Sun className="text-yellow-500" size={16} />
                <span><strong>Best Weather:</strong> {detailedInfo.visitPlan?.bestWeatherTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="text-orange-500" size={16} />
                <span><strong>Crowd Level:</strong> {detailedInfo.visitPlan?.crowdLevel}</span>
              </div>
            </div>
          </div>

          {/* Things to Do */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Activity size={18} />
              Things to Do & Experience
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Main Activities</h5>
                <ul className="space-y-1">
                  {detailedInfo.activities?.mainActivities?.map((activity, index) => (
                    <li key={index} className="text-sm text-blue-700 flex items-center gap-2">
                      <CheckCircle size={12} />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h5 className="font-medium text-purple-800 mb-2">Special Experiences</h5>
                <ul className="space-y-1">
                  {detailedInfo.activities?.specialExperiences?.map((experience, index) => (
                    <li key={index} className="text-sm text-purple-700 flex items-center gap-2">
                      <Heart size={12} />
                      {experience}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Photography Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Camera size={18} />
              Photography Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-2">
                  <strong>Photography:</strong> <span className={`px-2 py-1 rounded text-xs ${
                    detailedInfo.activities?.photography?.allowed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {detailedInfo.activities?.photography?.allowed ? 'Allowed' : 'Restricted'}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Restrictions:</strong> {detailedInfo.activities?.photography?.restrictions}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Best Time:</strong> {detailedInfo.activities?.photography?.bestTime}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Best Photo Spots:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {detailedInfo.activities?.photography?.bestSpots?.map((spot, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {spot}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Food & Dining */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Utensils size={18} />
              Food & Dining
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <h5 className="font-medium text-orange-800 mb-2">Local Specialties</h5>
                <div className="space-y-2">
                  {detailedInfo.foodAndDining?.localSpecialties?.map((food, index) => (
                    <div key={index} className="text-sm text-orange-700 flex items-center gap-2">
                      <Coffee size={12} />
                      {food}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Price Range: {detailedInfo.foodAndDining?.priceRange}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h5 className="font-medium text-red-800 mb-2">Dining Options</h5>
                <div className="text-sm text-red-700 space-y-1">
                  <p><strong>Nearby Restaurants:</strong> {detailedInfo.foodAndDining?.nearbyRestaurants}</p>
                  <p><strong>Street Food:</strong> {detailedInfo.foodAndDining?.streetFood}</p>
                  <p><strong>Dietary Options:</strong> {detailedInfo.foodAndDining?.dietaryOptions}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shopping & Souvenirs */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ShoppingBag size={18} />
              Shopping & Souvenirs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-pink-50 rounded-lg p-4">
                <h5 className="font-medium text-pink-800 mb-2">Must-Buy Souvenirs</h5>
                <ul className="space-y-1">
                  {detailedInfo.shopping?.souvenirs?.map((souvenir, index) => (
                    <li key={index} className="text-sm text-pink-700 flex items-center gap-2">
                      <Gift size={12} />
                      {souvenir}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <h5 className="font-medium text-indigo-800 mb-2">Local Crafts</h5>
                <ul className="space-y-1">
                  {detailedInfo.shopping?.localCrafts?.map((craft, index) => (
                    <li key={index} className="text-sm text-indigo-700 flex items-center gap-2">
                      <Star size={12} />
                      {craft}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Price Range:</strong> {detailedInfo.shopping?.priceRange}
            </p>
          </div>

          {/* Budget Breakdown */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <IndianRupee size={18} />
              Complete Budget Breakdown
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-lg font-bold text-green-600">
                    ₹{detailedInfo.budget?.entryFee?.indian || 0}
                  </p>
                  <p className="text-xs text-gray-600">Entry Fee</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-lg font-bold text-orange-600">
                    ₹{detailedInfo.budget?.breakdown?.food || 200}
                  </p>
                  <p className="text-xs text-gray-600">Food</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-lg font-bold text-blue-600">
                    ₹{detailedInfo.budget?.breakdown?.transport || 100}
                  </p>
                  <p className="text-xs text-gray-600">Transport</p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-lg font-bold text-purple-600">
                    ₹{detailedInfo.budget?.breakdown?.shopping || 300}
                  </p>
                  <p className="text-xs text-gray-600">Shopping</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg text-center shadow-sm">
              <p className="text-xl font-bold text-green-700">
                Total Estimated: ₹{detailedInfo.budget?.estimatedTotal || 700}
              </p>
              <p className="text-sm text-gray-600">Per person (approximate)</p>
            </div>
          </div>

          {/* Transportation & Facilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Navigation size={18} />
                Transportation
              </h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p><strong>Recommended:</strong> {detailedInfo.transportation?.recommendedMode}</p>
                <p><strong>Public Transport:</strong> {detailedInfo.transportation?.publicTransport}</p>
                <p><strong>Parking:</strong> {detailedInfo.transportation?.parking}</p>
                <p><strong>Walking:</strong> {detailedInfo.transportation?.walkingDistance}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Info size={18} />
                Facilities
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Car size={12} />
                  <span>{detailedInfo.facilities?.parking}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Accessibility size={12} />
                  <span>{detailedInfo.facilities?.accessibility}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wifi size={12} />
                  <span>{detailedInfo.facilities?.wifi}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils size={12} />
                  <span>{detailedInfo.facilities?.foodCourt}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timing & Weather */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={18} />
              Timing & Weather Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-yellow-50 rounded-lg p-4">
                <h5 className="font-medium text-yellow-800 mb-2">Best Time to Visit</h5>
                <div className="space-y-2 text-sm text-yellow-700">
                  <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span><strong>Months:</strong> {detailedInfo.timing?.bestMonthsToVisit?.slice(0, 3).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer size={12} />
                    <span><strong>Weather:</strong> {detailedInfo.timing?.weatherConsiderations}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={12} />
                    <span><strong>Crowds:</strong> {detailedInfo.timing?.crowdPatterns?.bestTime}</span>
                  </div>
                </div>
              </div>
              <div className="bg-cyan-50 rounded-lg p-4">
                <h5 className="font-medium text-cyan-800 mb-2">Opening Hours</h5>
                <div className="text-sm text-cyan-700">
                  <p className="mb-2"><strong>General Hours:</strong> {detailedInfo.timing?.openingHours?.general || '06:00 - 18:00'}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Weekdays:</span>
                      <span className="font-medium">{detailedInfo.timing?.crowdPatterns?.weekdays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weekends:</span>
                      <span className="font-medium">{detailedInfo.timing?.crowdPatterns?.weekends}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Festivals:</span>
                      <span className="font-medium">{detailedInfo.timing?.crowdPatterns?.festivals}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Tips */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Lightbulb size={18} />
              Pro Tips for Your Visit
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <h5 className="font-medium text-emerald-800 mb-2">Before Visit</h5>
                <ul className="space-y-1">
                  {detailedInfo.tips?.beforeVisit?.map((tip, index) => (
                    <li key={index} className="text-sm text-emerald-700 flex items-start gap-2">
                      <CheckCircle size={12} className="mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <h5 className="font-medium text-amber-800 mb-2">During Visit</h5>
                <ul className="space-y-1">
                  {detailedInfo.tips?.duringVisit?.map((tip, index) => (
                    <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                      <Info size={12} className="mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-50 rounded-lg p-4">
                <h5 className="font-medium text-rose-800 mb-2">What to Bring</h5>
                <ul className="space-y-1">
                  {detailedInfo.tips?.whatToBring?.map((item, index) => (
                    <li key={index} className="text-sm text-rose-700 flex items-start gap-2">
                      <Gift size={12} className="mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Dress Code & Special Requirements */}
          {detailedInfo.tips?.dressCode && (
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <h4 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                Important Guidelines
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-indigo-700">
                    <strong>Dress Code:</strong> {detailedInfo.tips?.dressCode}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-700">
                    <strong>Special Notes:</strong> {detailedInfo.timing?.seasonalSpecial}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Phone size={18} />
              Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone size={12} />
                  <span><strong>Phone:</strong> {detailedInfo.contact?.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={12} />
                  <span><strong>Website:</strong> {detailedInfo.contact?.website}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail size={12} />
                  <span><strong>Email:</strong> {detailedInfo.contact?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={12} />
                  <span><strong>Social:</strong> {detailedInfo.contact?.socialMedia}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Navigation size={16} />
              Get Directions
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Phone size={16} />
              Call Now
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Calendar size={16} />
              Add to Calendar
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <Share2 size={16} />
              Share Plan
            </button>
          </div>

          {/* AI Attribution */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 text-center border border-purple-200">
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <Brain className="text-purple-600" size={16} />
              This comprehensive plan was generated by AI to enhance your travel experience
              <Sparkles className="text-blue-600" size={16} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceDetailsDropdown;