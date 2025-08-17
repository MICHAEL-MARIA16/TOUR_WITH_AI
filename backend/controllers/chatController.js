// backend/controllers/chatController.js - SOUTH INDIAN TOUR GUIDE VERSION

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Place = require('../models/Place');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// SOUTH INDIAN GUIDE: Chat with AI assistant
const chatWithAI = async (req, res) => {
  try {
    console.log('🌴 South Indian Guide Controller - Request received:', {
      body: req.body,
      headers: req.headers['content-type']
    });

    const { message, context = {} } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log('❌ South Indian Guide Controller - Invalid message:', message);
      return res.status(400).json({
        success: false,
        message: 'What would you like to know about our beautiful South India, friend?'
      });
    }

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ South Indian Guide Controller - No Gemini API key, using fallback');
      const fallbackResponse = getSouthIndianFallbackResponse(message);
      return res.status(200).json({
        success: true,
        data: {
          message: fallbackResponse,
          timestamp: new Date().toISOString(),
          fallback: true
        }
      });
    }

    console.log('📤 South Indian Guide Controller - Processing message:', message.substring(0, 100) + '...');

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context for the AI
    const systemContext = await buildSouthIndianSystemContext(context);
    
    // Create enhanced prompt
    const enhancedPrompt = `${systemContext}

User Question: ${message}

Remember to respond as a warm, friendly South Indian local who loves sharing the beauty of south indian places. Be conversational, sweet, and focus on authentic local experiences. NO MARKDOWN formatting - just natural,brief, informative, flowing text that's easy to read.`;

    console.log('🧠 South Indian Guide Controller - Sending to Gemini AI');

    // Generate response
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('✅ South Indian Guide Controller - AI response received:', aiResponse.substring(0, 100) + '...');

    // Clean up any markdown formatting
    const cleanResponse = cleanMarkdownFromResponse(aiResponse);

    // Log interaction for analytics
    console.log(`South Indian Guide Query: ${message.substring(0, 100)}... | Response: ${cleanResponse.substring(0, 100)}...`);

    res.status(200).json({
      success: true,
      data: {
        message: cleanResponse,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - req.startTime
      }
    });

  } catch (error) {
    console.error('❌ South Indian Guide Controller - Error in AI chat:', error);
    
    // Provide fallback response
    const fallbackResponse = getSouthIndianFallbackResponse(req.body?.message || 'general');
    
    res.status(200).json({
      success: true,
      data: {
        message: fallbackResponse,
        timestamp: new Date().toISOString(),
        fallback: true,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// SOUTH INDIAN GUIDE: Get travel suggestions for South Indian destinations
const getTravelSuggestions = async (req, res) => {
  try {
    console.log('🏛️ South Indian Travel Suggestions - Request received:', req.body);

    const { 
      interests = [], 
      experience_type = 'authentic_local',
      state_preference,
      budget,
      season = 'any'
    } = req.body;

    // Try to get South Indian places from database
    let places = [];
    if (interests.length > 0) {
      places = await Place.find({
        category: { $in: interests },
        state: { $in: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'] },
        isActive: true
      }).sort({ rating: -1 }).limit(5).catch(() => []);
    }

    console.log(`🌴 South Indian Travel Suggestions - Found ${places.length} database places, generating AI suggestions`);

    // Check if we have Gemini API
    if (!process.env.GEMINI_API_KEY) {
      const fallbackSuggestions = generateSouthIndianFallbackSuggestions(interests, state_preference);
      return res.status(200).json({
        success: true,
        data: {
          suggestions: fallbackSuggestions,
          recommendedPlaces: [],
          basedOn: { interests, state_preference, experience_type },
          fallback: true
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a warm, friendly South Indian local guide who knows every corner of India like family!

User is looking for travel suggestions with these preferences:
- Interests: ${interests.join(', ') || 'Open to everything'}
- State Preference: ${state_preference || 'Any South Indian state'}
- Experience Type: Authentic local experiences
- Budget: ${budget || 'Flexible'}
- Season: ${season}

As their local friend and guide, provide 4-5 amazing South Indian destinations. For each place, share:

- Why locals love this spot
- Best local food to try there
- Perfect time to visit and why
- One insider tip only locals know
- How to experience it authentically
- Things to avoid as a tourist
- Things that should not be missed

Write in a natural, conversational tone without any markdown formatting. Be warm and personal like talking to a friend. Keep it sweet and not too detailed - around 300-400 words total.`;

    console.log('🧠 South Indian Travel Suggestions - Sending to Gemini AI');

    const result = await model.generateContent(prompt);
    const suggestions = await result.response.text();
    const cleanSuggestions = cleanMarkdownFromResponse(suggestions);

    console.log('✅ South Indian Travel Suggestions - AI response received');

    res.status(200).json({
      success: true,
      data: {
        suggestions: cleanSuggestions,
        recommendedPlaces: places,
        basedOn: {
          interests,
          state_preference,
          experience_type
        }
      }
    });

  } catch (error) {
    console.error('❌ South Indian Travel Suggestions - Error generating suggestions:', error);
    
    const fallbackSuggestions = generateSouthIndianFallbackSuggestions(req.body.interests || [], req.body.state_preference);
    
    res.status(200).json({
      success: true,
      data: {
        suggestions: fallbackSuggestions,
        recommendedPlaces: [],
        basedOn: req.body,
        fallback: true
      }
    });
  }
};

// SOUTH INDIAN GUIDE: Get place-specific information with local insights
const getPlaceInfo = async (req, res) => {
  try {
    console.log('📍 South Indian Place Info - Request received:', req.body);

    const { placeId, question } = req.body;

    let place = null;
    
    if (placeId) {
      place = await Place.findOne({
        $or: [
          { _id: placeId }, 
          { id: placeId }
        ],
        isActive: true
      }).catch(() => null);
    }

    const placeName = place?.name || extractPlaceFromQuestion(question) || 'this beautiful place';
    
    console.log('🌴 South Indian Place Info - Processing place:', placeName);

    // Check if we have Gemini API
    if (!process.env.GEMINI_API_KEY) {
      const fallbackInfo = generateSouthIndianFallbackPlaceInfo(place, question, placeName);
      return res.status(200).json({
        success: true,
        data: {
          place: place ? {
            id: place.id || place._id,
            name: place.name,
            city: place.city,
            state: place.state
          } : { name: placeName },
          information: fallbackInfo,
          question: question || 'Local insights',
          fallback: true
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let contextInfo = '';
    if (place) {
      contextInfo = `
About ${place.name}:
- Location: ${place.city}, ${place.state}
- Type: ${place.category}
- Local Rating: ${place.rating || 'Well-loved'}/5
- Description: ${place.description || 'A beautiful South Indian destination'}
`;
    }

    const prompt = `You are a friendly local South Indian guide who knows ${placeName} very well!

${contextInfo}

User Question: ${question || `Tell me about ${placeName} like a local would`}

As their local friend, share warm insights about this place:
- What makes it special for locals
- Best time to visit and why
- Local food specialties to try
- Cultural customs to know
- How to get there easily
- Insider tips for the best experience
- Any local stories or traditions

Write naturally without markdown formatting. Be conversational, sweet, and helpful. Keep it informative but not overwhelming - around 250-300 words.`;

    console.log('🧠 South Indian Place Info - Sending to Gemini AI');

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    const cleanResponse = cleanMarkdownFromResponse(response);

    console.log('✅ South Indian Place Info - AI response received');

    res.status(200).json({
      success: true,
      data: {
        place: place ? {
          id: place.id || place._id,
          name: place.name,
          city: place.city,
          state: place.state
        } : { name: placeName },
        information: cleanResponse,
        question: question || 'Local insights'
      }
    });

  } catch (error) {
    console.error('❌ South Indian Place Info - Error getting place information:', error);
    
    const placeName = req.body.question ? extractPlaceFromQuestion(req.body.question) : 'this place';
    const fallbackInfo = generateSouthIndianFallbackPlaceInfo(null, req.body.question, placeName);
    
    res.status(500).json({
      success: true,
      data: {
        place: { name: placeName },
        information: fallbackInfo,
        question: req.body.question || 'Local insights',
        fallback: true,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Helper function to build South Indian system context
async function buildSouthIndianSystemContext(context) {
  let systemContext = `You are a warm, friendly South Indian tour guide who absolutely loves sharing the beauty and culture of South India! You speak like a local friend - sweet, welcoming, and knowledgeable.

YOUR PERSONALITY:
- Warm, friendly, and genuinely excited about South Indian culture
- Like a local friend who knows all the best spots
- Sweet and conversational, never formal or robotic
- Passionate about authentic South Indian experiences
- Knowledgeable about Sputh Indian places
-be brief while responsing
YOUR EXPERTISE:
- Traditional South Indian temples, festivals, and customs
- Authentic South Indian cuisine and where locals eat
- Classical dance, music, and arts
- Beautiful hill stations, beaches, and backwaters
- Local markets, silk sarees, and handicrafts  
- Monsoons, festivals, and best visiting times
- Local transportation and practical tips
- Hidden gems that tourists often miss

YOUR COMMUNICATION STYLE:
- Natural, conversational tone like talking to a friend
- NO markdown formatting - just clean, readable text
- Sweet and encouraging, never overwhelming
- Share personal touches and local stories
- Focus on authentic, local experiences
- Be helpful but keep responses concise and friendly
- Use simple, warm language that everyone can understand

IMPORTANT: Always respond in plain text without any markdown, asterisks, hashtags, or special formatting. Write naturally as if speaking to a friend.`;

  // Add current context if provided
  if (context.currentRoute && context.currentRoute.length > 0) {
    systemContext += `\n\nUser's Current Journey: ${context.currentRoute.join(' to ')}\n`;
  }

  if (context.selectedPlaces && context.selectedPlaces.length > 0) {
    systemContext += `\nUser's Selected Places: ${context.selectedPlaces.join(', ')}\n`;
  }

  systemContext += `\nRemember: Be the kind of local guide who makes visitors feel like family and helps them fall in love with South India's incredible culture, food, and beauty!`;

  return systemContext;
}

// Function to clean markdown formatting from responses
function cleanMarkdownFromResponse(text) {
  if (!text) return text;
  
  return text
    // Remove markdown headers
    .replace(/#{1,6}\s*/g, '')
    // Remove bold markdown
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic markdown  
    .replace(/\*(.*?)\*/g, '$1')
    // Remove bullet points
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove numbered lists
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// Extract place name from user question
function extractPlaceFromQuestion(question) {
  if (!question) return null;
  
  const southIndianPlaces = [
    'Chennai', 'Coimbatore', 'Madurai', 'Thanjavur', 'Kanchipuram', 'Ooty', 'Kodaikanal',
    'Kochi', 'Munnar', 'Alleppey', 'Thekkady', 'Kovalam', 'Wayanad', 'Kumarakom',
    'Bangalore', 'Mysore', 'Hampi', 'Coorg', 'Chikmagalur', 'Udupi', 'Gokarna',
    'Hyderabad', 'Warangal', 'Tirupati', 'Vijayawada', 'Visakhapatnam', 'Araku'
  ];
  
  for (const place of southIndianPlaces) {
    if (question.toLowerCase().includes(place.toLowerCase())) {
      return place;
    }
  }
  
  const patterns = [
    /about ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /in ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /visit ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /to ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  ];
  
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// SOUTH INDIAN GUIDE: Fallback responses when AI is unavailable
function getSouthIndianFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('chennai') || lowerMessage.includes('tamil nadu')) {
    return "Ah, Chennai! The heart of Tamil culture! You know, we locals love starting our day with hot filter coffee and crispy dosas at Saravana Bhavan. Don't miss the beautiful Marina Beach at sunset, and if you're here during the music season in December-January, the whole city comes alive with classical concerts. Try the authentic Chettinad cuisine at Dakshin - the spice levels will surprise you! And please visit Kapaleeshwarar Temple early morning to experience the peaceful prayers. My AI friend is taking a tea break, but I'm still here with all my local Chennai secrets!";
  }
  
  if (lowerMessage.includes('kerala') || lowerMessage.includes('kochi') || lowerMessage.includes('munnar') || lowerMessage.includes('alleppey')) {
    return "Kerala, God's Own Country! I'm so excited you're interested in our beautiful backwaters and spice gardens. If you're going to Alleppey, stay in a traditional houseboat and wake up to the sound of gentle waters. In Munnar, visit the tea plantations early morning when the mist covers the hills - it's like a dream! Don't miss trying authentic Kerala sadya on a banana leaf, and our fish curry with appam is something special. The monsoons here are magical if you don't mind getting a little wet! My AI is taking a spice break, but I have so many Kerala stories to share!";
  }
  
  if (lowerMessage.includes('bangalore') || lowerMessage.includes('mysore') || lowerMessage.includes('karnataka') || lowerMessage.includes('coorg')) {
    return "Karnataka is such a diverse state! Bangalore has this amazing blend of tradition and modernity - visit Lalbagh early morning for a peaceful walk, and don't miss the authentic South Indian breakfast at MTR or Vidyarthi Bhavan. If you're going to Mysore, the palace illumination on Sundays is breathtaking! And Coorg... oh, the coffee plantations and misty hills will steal your heart. Try the local Kodava cuisine - pandi curry is absolutely delicious! My AI buddy is taking a coffee break in Coorg, but I'm still here with local insights!";
  }
  
  if (lowerMessage.includes('hyderabad') || lowerMessage.includes('telangana') || lowerMessage.includes('biryani')) {
    return "Hyderabad! The city of pearls and the most amazing biryani you'll ever taste! You haven't lived until you've had authentic Hyderabadi biryani at Paradise or Shah Ghouse - the flavors are incredible. Visit the beautiful Charminar in the evening when it's lit up, and explore the bustling Laad Bazaar for traditional bangles and pearls. Don't miss the Golkonda Fort at sunset - the acoustics are fascinating! And try our famous Osmania biscuits with Irani chai. My AI is probably stuck in a biryani queue right now, but I'm here to help you discover Hyderabad!";
  }
  
  if (lowerMessage.includes('tirupati') || lowerMessage.includes('andhra pradesh') || lowerMessage.includes('temple')) {
    return "Andhra Pradesh has some of the most beautiful temples! If you're visiting Tirupati, book your darshan online in advance and wear traditional clothes - it's more respectful and you'll feel the spiritual energy better. The prasadam there is divine! Try the famous Andhra meals - the spice level is intense but so flavorful. Don't miss the beautiful beaches at Visakhapatnam and the scenic Araku Valley. Our local pickles and chutneys are legendary too! My AI is probably standing in the darshan queue, but I'm here with all the temple tips!";
  }

  if (lowerMessage.includes('food') || lowerMessage.includes('eat') || lowerMessage.includes('dosa') || lowerMessage.includes('idli')) {
    return "Oh, you're asking about our food! South Indian cuisine is so close to my heart. Start your day with fluffy idlis and crispy vadas with coconut chutney and sambar - that's how we locals begin every morning. Try different types of dosas - masala dosa, rava dosa, set dosa - each state has its own style! Don't miss our filter coffee - it's an art form here. For lunch, a traditional meals on banana leaf is a must-try experience. And our sweets like Mysore pak, payasam, and kozhukattai will melt your heart! My AI is busy learning to make the perfect dosa batter, but I'm here to guide your taste buds!";
  }
  
  if (lowerMessage.includes('festival') || lowerMessage.includes('culture') || lowerMessage.includes('classical')) {
    return "South Indian festivals are absolutely magical! During Diwali, our homes light up with beautiful rangoli patterns and oil lamps. Pongal in Tamil Nadu is harvest celebration with delicious sweet rice and sugarcane. Don't miss the classical music and dance season in Chennai - the whole city resonates with beautiful ragas and bharatanatyam performances. Our temple festivals with colorful processions and traditional music are spectacular. If you're here during Onam in Kerala, you'll experience incredible boat races and the grand feast called sadya! My AI is probably practicing classical music right now, but I'm here to share our cultural treasures!";
  }
  
  return "Vanakkam! Welcome to beautiful South India! I'm your friendly local guide who loves sharing the incredible culture, delicious food, and stunning places of Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, and Telangana. Whether you want to explore ancient temples, relax in hill stations, enjoy authentic cuisine, or experience our vibrant festivals, I'm here to help you discover South India like a local! My AI friend is taking a little break, but I have endless stories and tips to share. What would you like to know about our amazing region?";
}

// Generate South Indian fallback suggestions
function generateSouthIndianFallbackSuggestions(interests, statePreference) {
  let suggestions = `Here are some wonderful South Indian experiences I'd love to share with you:\n\n`;
  
  suggestions += `TAMIL NADU GEMS:\n`;
  suggestions += `Visit Madurai's Meenakshi Temple early morning for the peaceful prayers and stunning architecture. The temple comes alive with devotional music and the air filled with incense - it's truly spiritual.\n\n`;
  suggestions += `Ooty and Kodaikanal hill stations are perfect during summer months. Try the local homemade chocolates and take a ride on the charming toy train through the Nilgiri hills.\n\n`;
  
  suggestions += `KERALA DELIGHTS:\n`;
  suggestions += `Experience the backwaters of Alleppey in a traditional houseboat - wake up to gentle waters and try the authentic fish curry prepared by the local crew.\n\n`;
  suggestions += `Munnar's tea plantations are breathtaking, especially during the blooming season of Neelakurinji flowers that happens once in 12 years!\n\n`;
  
  suggestions += `KARNATAKA TREASURES:\n`;
  suggestions += `Mysore Palace during Dasara festival is absolutely spectacular with thousands of lights and cultural performances every evening.\n\n`;
  suggestions += `Coorg coffee plantations offer the freshest coffee you'll ever taste, and the local Kodava cuisine is a hidden culinary gem.\n\n`;
  
  suggestions += `ANDHRA & TELANGANA WONDERS:\n`;
  suggestions += `Hyderabad's authentic biryani is legendary - locals prefer Paradise or Bawarchi for the real deal. The city's old charm around Charminar is captivating.\n\n`;
  suggestions += `Tirupati temple visit is spiritually enriching, and the nearby Chandragiri Fort offers beautiful sunset views.\n\n`;
  
  if (statePreference) {
    suggestions += `Since you're interested in ${statePreference}, I have so many local secrets and authentic experiences to share! Each place has its own unique charm and flavors.\n\n`;
  }
  
  suggestions += `LOCAL INSIDER TIPS:\n`;
  suggestions += `Always try meals served on banana leaves for the most authentic experience. Learn a few words in local languages - people here are incredibly warm when you make the effort. Visit temples during early morning or evening prayers for the most spiritual atmosphere. Don't miss the local markets for fresh spices, silk sarees, and traditional handicrafts.\n\n`;
  
  suggestions += `My AI friend is taking a chai break, but I'm always excited to share more about our beautiful South Indian culture and destinations!`;
  
  return suggestions;
}

// Generate South Indian fallback place information
function generateSouthIndianFallbackPlaceInfo(place, question, placeName) {
  let info = `${placeName} - Your Local Guide's Insights\n\n`;
  
  if (place) {
    info += `What I know about this beautiful place:\n`;
    info += `Located in ${place.city}, ${place.state}\n`;
    info += `Locals rate it ${place.rating || 'highly'} out of 5\n`;
    info += `Best time to spend here: ${place.averageVisitDuration || 90} minutes\n\n`;
  }
  
  info += `As your local friend, here's what I'd share:\n\n`;
  
  info += `EXPERIENCING IT LIKE A LOCAL:\n`;
  info += `Visit early morning or late evening when locals come for their peaceful time. You'll get beautiful lighting for photos and a more authentic atmosphere without crowds.\n\n`;
  
  info += `FOOD & CULTURE:\n`;
  info += `Look for small local eateries nearby - they usually serve the most authentic South Indian food. Try filter coffee if available, and don't hesitate to ask locals for restaurant recommendations.\n\n`;
  
  info += `PRACTICAL LOCAL TIPS:\n`;
  info += `Learn basic Tamil, Malayalam, Kannada, or Telugu greetings - locals absolutely light up when visitors make this effort. Dress modestly, especially at religious places. Remove footwear at temples and follow local customs respectfully.\n\n`;
  
  info += `BEST TIME TO VISIT:\n`;
  info += `Early mornings are perfect for peaceful experiences and cooler weather. Evenings offer beautiful lighting and local life. Avoid peak afternoon hours during summer months.\n\n`;
  
  if (place && place.entryFee) {
    info += `ENTRY DETAILS:\n`;
    info += `Indian visitors: Rs ${place.entryFee.indian || 0}\n`;
    info += `Foreign visitors: Rs ${place.entryFee.foreign || 0}\n\n`;
  }
  
  info += `CULTURAL CONNECTION:\n`;
  info += `Every place in South India has beautiful stories and traditions. Ask local guides about the history and legends - they love sharing these tales with interested visitors.\n\n`;
  
  info += `Remember, South Indian hospitality is legendary - locals are genuinely happy to help and share their culture with respectful travelers. My AI companion is taking a South Indian coffee break, but I'm always here to share more local insights and help you fall in love with our incredible region!`;
  
  return info;
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