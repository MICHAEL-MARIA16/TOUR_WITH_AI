import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, User, Loader, Heart } from 'lucide-react';
import { apiService } from '../services/api';
import ConnectionStatus from '../components/ConnectionStatus';
import toast from 'react-hot-toast';

const AIAssistantPage = ({ isConnected, onRetry }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Welcome message
  useEffect(() => {
    if (isConnected) {
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: "Vanakkam! 🙏 I'm your South Indian travel guide. I know all the beautiful places from Tamil Nadu's temples to Kerala's backwaters, Karnataka's palaces to Andhra's heritage sites. How can I help you plan your perfect South Indian adventure?",
        timestamp: new Date()
      }]);
    }
  }, [isConnected]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      console.log('🤖 Sending message to AI assistant:', userMessage.content);
      
      const response = await apiService.chatWithAI(userMessage.content, {
        context: 'south_indian_travel',
        previousMessages: messages.slice(-5) // Send last 5 messages for context
      });

      if (response.success && response.data) {
        const assistantMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: response.data.message || 'I apologize, but I encountered an issue. Could you please try asking again?',
          timestamp: new Date(),
          fallback: response.data.fallback || false
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (response.data.fallback) {
          toast('AI is using fallback mode - some features may be limited', {
            icon: '⚠️',
            duration: 3000
          });
        }
      } else {
        throw new Error(response.message || 'AI response failed');
      }

    } catch (error) {
      console.error('💥 AI chat error:', error);
      setError(error.message);
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: "I'm having trouble connecting right now. But I can still help you with basic South Indian travel information! Please try asking about specific places, food, culture, or travel tips.",
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('AI assistant temporarily unavailable');
      
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick suggestions
  const suggestions = [
    "Best temples to visit in Tamil Nadu",
    "Kerala backwater destinations",
    "South Indian food recommendations",
    "Monsoon travel tips",
    "Budget travel in South India",
    "Beach destinations in South India"
  ];

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  // Connection check
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <ConnectionStatus isConnected={isConnected} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <MessageCircle className="text-green-600" size={32} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              South Indian AI Travel Guide
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Your friendly AI assistant with deep knowledge of South Indian culture, places, food, and travel tips. 
              Ask me anything about Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, and Telangana!
            </p>
            
            {/* AI Status */}
            <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 text-sm font-medium">AI Assistant Online</span>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-sm border flex flex-col" style={{ height: '600px' }}>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  
                  {/* Message bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.isError
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    
                    {/* Fallback indicator */}
                    {message.fallback && (
                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        ⚠️ Fallback mode
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`text-xs text-gray-500 mt-1 ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {/* Avatar */}
                <div className={`flex-shrink-0 ${
                  message.type === 'user' ? 'order-1 ml-3' : 'order-2 mr-3'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user'
                      ? 'bg-blue-100'
                      : message.isError
                      ? 'bg-red-100'
                      : 'bg-green-100'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Bot className={`w-5 h-5 ${message.isError ? 'text-red-600' : 'text-green-600'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100">
                    <Bot className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin text-gray-600" />
                    <span className="text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length <= 1 && (
            <div className="px-6 pb-4">
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">💡 Try asking about:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about South Indian destinations, culture, food, or travel tips..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  maxLength={1000}
                  disabled={isLoading}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {inputMessage.length}/1000
                </div>
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  !inputMessage.trim() || isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">
                  {isLoading ? 'Sending...' : 'Send'}
                </span>
              </button>
            </div>

            {/* Helpful tips */}
            <div className="mt-3 text-xs text-gray-500 text-center">
              💡 Tip: I speak like a local South Indian guide and love sharing cultural insights!
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Local Knowledge</h3>
            </div>
            <p className="text-sm text-gray-600">
              Get authentic insights about South Indian places, culture, and hidden gems from an AI that thinks like a local guide.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Cultural Tips</h3>
            </div>
            <p className="text-sm text-gray-600">
              Learn about local customs, festivals, food etiquette, and the best times to visit different places.
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">24/7 Available</h3>
            </div>
            <p className="text-sm text-gray-600">
              Your AI travel companion is always ready to help with personalized recommendations and travel advice.
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <MessageCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">AI Connection Issue</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  The AI assistant is experiencing connectivity issues, but basic chat functionality is still available.
                  {' '}
                  <button 
                    onClick={() => setError(null)}
                    className="underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistantPage;