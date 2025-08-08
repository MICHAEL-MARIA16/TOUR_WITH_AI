// backend/controllers/chatController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat with AI assistant
const chatWithAI = async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context for the AI
    const systemContext = await buildSystemContext(context);
    
    // Create enhanced prompt
    const enhancedPrompt = `${systemContext}

User Question: ${message}

Please provide a helpful, friendly, and informative response about South Indian travel. Keep responses concise but informative. If the question is about specific places, provide practical details like timings, entry fees, best time to visit, etc.`;

    // Generate response
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Log interaction for analytics (optional)
    console.log(`Chat Query: ${message.substring(0, 100)}...`);

    res.status(200).json({
      success: true,
      data: {
        message: aiResponse,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - req.startTime
      }
    });

  } catch (error) {
    console.error('Error in AI chat:', error);
    
    // Provide fallback response
    const fallbackResponse = getFallbackResponse(req.body.message);
    
    res.status(200).json({
      success: true,
      data: {
        message: fallbackResponse,
        timestamp: new Date().toISOString(),
        fallback: true
      }
    });
  }
};

// Get travel suggestions based on user preferences
const getTravelSuggestions = async (req, res) => {
  try {
    const { 
      interests = [], 
      duration, 
      budget, 
      travelStyle,
      season = 'any'
    } = req.body;

    // Fetch relevant places based on interests
    let places = [];
    if (interests.length > 0) {
      places = await Place.find({
        category: { $in: interests },
        isActive: true
      }).sort({ rating: -1 }).limit(10);
    } else {
      places = await Place.find({ isActive: true })
        .sort({ rating: -1 })
        .limit(8);
    }

    // Prepare context for AI
    const placesContext = places.map(place => ({
      name: place.name,
      category: place.category,
      city: place.city,
      state: place.state,
      rating: place.rating,
      duration: place.averageVisitDuration,
      description: place.description.substring(0, 100) + '...'
    }));

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `As a South India travel expert, provide personalized travel suggestions based on:

User Preferences:
- Interests: ${interests.join(', ') || 'General sightseeing'}
- Duration: ${duration || 'Flexible'}
- Budget: ${budget || 'Moderate'}
- Travel Style: ${travelStyle || 'Balanced'}
- Season: ${season}

Available Places:
${JSON.stringify(placesContext, null, 2)}

Please provide:
1. Top 3-5 recommended places from the list
2. Brief reason for each recommendation
3. Best time to visit tips
4. Budget-friendly tips if budget is a concern
5. Travel style specific advice

Keep response conversational and under 300 words.`;

    const result = await model.generateContent(prompt);
    const suggestions = await result.response.text();

    res.status(200).json({
      success: true,
      data: {
        suggestions,
        recommendedPlaces: places.slice(0, 5),
        basedOn: {
          interests,
          duration,
          budget,
          travelStyle,
          season
        }
      }
    });

  } catch (error) {
    console.error('Error generating travel suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating travel suggestions',
      error: error.message
    });
  }
};

// Get place-specific information
const getPlaceInfo = async (req, res) => {
  try {
    const { placeId, question } = req.body;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'Place ID is required'
      });
    }

    // Fetch place details
    const place = await Place.findOne({
      $or: [{ _id: placeId }, { id: placeId }],
      isActive: true
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found'
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const placeContext = `
Place Information:
- Name: ${place.name}
- Location: ${place.city}, ${place.state}
- Category: ${place.category}
- Description: ${place.description}
- Average Visit Duration: ${place.averageVisitDuration} minutes
- Entry Fee: Indian ₹${place.entryFee.indian}, Foreign ₹${place.entryFee.foreign}
- Rating: ${place.rating}/5
- Amenities: ${place.amenities.join(', ')}
- Best Time to Visit: ${place.bestTimeToVisit.join(', ')}
- Kid Friendly: ${place.kidFriendly ? 'Yes' : 'No'}
- Wheelchair Accessible: ${place.wheelchairAccessible ? 'Yes' : 'No'}
- Tags: ${place.tags.join(', ')}
`;

    const prompt = `${placeContext}

User Question: ${question || 'Tell me about this place'}

Provide helpful information about this place. If no specific question is asked, give a comprehensive overview including what to expect, tips for visiting, and interesting facts.`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    res.status(200).json({
      success: true,
      data: {
        place: {
          id: place.id,
          name: place.name,
          city: place.city,
          state: place.state
        },
        information: response,
        question: question || 'General information'
      }
    });

  } catch (error) {
    console.error('Error getting place information:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting place information',
      error: error.message
    });
  }
};

// Helper function to build system context
async function buildSystemContext(context) {
  let systemContext = `You are a friendly and knowledgeable South India travel assistant. Your name is "TourWithAI Assistant." You specialize in helping travelers explore the best destinations across Tamil Nadu, Kerala, Karnataka, Telangana, and Andhra Pradesh.

Key Guidelines:
- Be warm, helpful, and professional
- Provide practical travel advice
- Include specific details like timings, costs when relevant
- Suggest the best times to visit places
- Mention travel tips for families, accessibility, etc.
- Keep responses concise but informative
- Focus on the 20 curated destinations in your database

`;

  // Add current context if provided
  if (context.currentRoute && context.currentRoute.length > 0) {
    systemContext += `\nUser's Current Route: ${context.currentRoute.map(p => p.name).join(' → ')}\n`;
  }

  if (context.selectedPlaces && context.selectedPlaces.length > 0) {
    systemContext += `\nUser's Selected Places: ${context.selectedPlaces.join(', ')}\n`;
  }

  if (context.timeConstraints) {
    systemContext += `\nUser's Time Constraints: ${JSON.stringify(context.timeConstraints)}\n`;
  }

  return systemContext;
}

// Fallback responses for when AI is unavailable
function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('timing') || lowerMessage.includes('hours')) {
    return "Most temples in South India open early (5-6 AM) and close by 9-10 PM. Museums and palaces typically operate from 9 AM to 5 PM. I'd recommend checking specific timings for each place in your itinerary.";
  }
  
  if (lowerMessage.includes('food') || lowerMessage.includes('eat')) {
    return "South Indian cuisine is diverse! Try authentic Tamil meals, Kerala fish curry, Karnataka's Bisi Bele Bath, and Andhra spicy biryanis. Most tourist spots have good local restaurants nearby.";
  }
  
  if (lowerMessage.includes('weather') || lowerMessage.includes('climate')) {
    return "South India has a tropical climate. Best time to visit hill stations like Ooty and Munnar is October-March. Coastal areas are pleasant in winter months. Monsoon season (June-September) brings heavy rains to Kerala and coastal Karnataka.";
  }
  
  if (lowerMessage.includes('transport') || lowerMessage.includes('travel')) {
    return "South India has excellent connectivity. Trains connect major cities, and buses are available for shorter routes. For temple towns, hiring a taxi or using ride-sharing apps works well. Many places are walkable once you reach there.";
  }
  
  if (lowerMessage.includes('budget') || lowerMessage.includes('cost')) {
    return "Budget varies widely. Temple visits are mostly free, while palaces charge ₹25-70 for Indians. Accommodation ranges from ₹800-5000 per night. Local meals cost ₹100-300 per person. Hill stations tend to be pricier.";
  }
  
  return "I'm here to help with your South India travel plans! Feel free to ask about specific places, timings, travel routes, local food, or any other travel-related questions.";
}

// Add request timing middleware
function addRequestTiming(req, res, next) {
  req.startTime = Date.now();
  next();
}

module.exports = {
  chatWithAI,
  getTravelSuggestions,
  getPlaceInfo,
  addRequestTiming
};