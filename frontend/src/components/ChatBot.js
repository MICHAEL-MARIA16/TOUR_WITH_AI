import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Bot, Clock, MapPin, RefreshCw, Minimize2, Lightbulb, Info } from 'lucide-react';
import { apiService } from '../services/api';
import { CHAT_CONFIG } from '../utils/constants';
import toast from 'react-hot-toast';

const ChatBot = ({ selectedPlaces, optimizedRoute, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: CHAT_CONFIG.SYSTEM_MESSAGES.welcome,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);
  useEffect(() => { if (inputRef.current && !isMinimized) inputRef.current.focus(); }, [isMinimized]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, CHAT_CONFIG.AUTO_SCROLL_DELAY || 100);
  };

  const addMessage = (type, content, metadata = {}) => {
    const newMessage = { 
      id: Date.now() + Math.random(), 
      type, 
      content, 
      timestamp: new Date(), 
      ...metadata 
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  // ✅ FIXED: Better response content extraction
  const extractMessageContent = (responseData) => {
    console.log('🔍 Extracting content from response:', responseData);
    
    // Handle different response structures
    if (typeof responseData === 'string') {
      return responseData;
    }
    
    if (responseData?.message) {
      return responseData.message;
    }
    
    if (responseData?.suggestions) {
      return responseData.suggestions;
    }
    
    if (responseData?.information) {
      return responseData.information;
    }
    
    // If it's an object with other properties, try to find text content
    if (typeof responseData === 'object') {
      const textFields = ['text', 'content', 'response', 'answer'];
      for (const field of textFields) {
        if (responseData[field]) {
          return responseData[field];
        }
      }
    }
    
    console.warn('⚠️ Could not extract message content from:', responseData);
    return 'Sorry, I received an empty response. Please try asking your question again.';
  };

  const handleSendMessage = async (message = inputMessage.trim(), mode = 'normal') => {
    if (!message && mode === 'normal') return;
    if (isLoading) return;

    // Add user message
    if (mode === 'normal') {
      addMessage('user', message);
    } else if (mode === 'suggestions') {
      addMessage('user', 'Can you suggest me some places?');
    } else if (mode === 'placeInfo' && selectedPlaces?.length > 0) {
      addMessage('user', `Tell me about ${selectedPlaces[0].name}`);
    }

    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      let response;

      if (mode === 'normal') {
        const context = {
          selectedPlaces: selectedPlaces?.map(p => p.name) || [],
          currentRoute: optimizedRoute?.map(p => p.name) || [],
          timeConstraints: {
            totalPlaces: selectedPlaces?.length || 0,
            hasRoute: !!optimizedRoute
          }
        };
        
        console.log('📤 Sending chat message:', message, 'with context:', context);
        response = await apiService.chatWithAI(message, context);
        
      } else if (mode === 'suggestions') {
        console.log('📤 Getting travel suggestions');
        response = await apiService.getTravelSuggestions({
          interests: [...new Set(selectedPlaces?.map(p => p.category) || [])],
          duration: 'full-day',
          budget: 'medium',
          travelStyle: 'balanced',
          season: 'winter'
        });
        
      } else if (mode === 'placeInfo' && selectedPlaces?.length > 0) {
        console.log('📤 Getting place info for:', selectedPlaces[0].name);
        response = await apiService.getPlaceInfo(
          selectedPlaces[0].id, 
          `Tell me more about ${selectedPlaces[0].name}`
        );
      }

      console.log('📥 Received response:', response);
      setIsTyping(false);

      if (response?.success) {
        // ✅ FIXED: Extract content properly from response
        const messageContent = extractMessageContent(response.data);
        
        addMessage('bot', messageContent, {
          responseTime: response.data?.responseTime,
          fallback: response.data?.fallback
        });
        
      } else {
        throw new Error(response?.message || 'Failed to get response');
      }

    } catch (error) {
      console.error('💥 Chat error:', error);
      setIsTyping(false);
      
      // Add error message
      addMessage('bot', `Sorry, I encountered an error: ${error.message}. Please try again.`, { 
        error: true 
      });
      
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      type: 'bot',
      content: "Chat cleared! How can I help you with your South India travel plans?",
      timestamp: new Date()
    }]);
    toast.success('Chat history cleared');
  };

  const formatTime = (timestamp) =>
    timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`chat-bot ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header">
        <div className="chat-title">
          <Bot className="chat-icon" />
          <div>
            <h3>Travel Assistant</h3>
            <span className="chat-subtitle">AI-powered South India guide</span>
          </div>
        </div>
        
        <div className="chat-actions">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="chat-action-btn" 
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 size={16} />
          </button>
          <button onClick={clearChat} className="chat-action-btn" title="Clear Chat">
            <RefreshCw size={16} />
          </button>
          <button onClick={onClose} className="chat-action-btn close" title="Close Chat">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {selectedPlaces?.length > 0 && (
            <div className="chat-context">
              <div className="context-item">
                <MapPin size={14} /> {selectedPlaces.length} places selected
              </div>
              {optimizedRoute && optimizedRoute.length > 0 && (
                <div className="context-item">
                  <Clock size={14} /> Route optimized
                </div>
              )}
            </div>
          )}

          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type} ${message.error ? 'error' : ''}`}>
                <div className="message-avatar">
                  {message.type === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    {/* ✅ FIXED: Better message rendering */}
                    {message.type === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <div>
                        <p>{typeof message.content === 'string' ? message.content : 'Loading...'}</p>
                        {message.fallback && (
                          <div className="fallback-notice">
                            ⚠️ Fallback response (AI temporarily unavailable)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="message-meta">
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                    {message.responseTime && (
                      <span className="response-time">{message.responseTime}ms</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="message bot typing">
                <div className="message-avatar"><Bot size={18} /></div>
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="quick-actions">
            <button 
              onClick={() => handleSendMessage('', 'suggestions')} 
              disabled={isLoading}
            >
              <Lightbulb size={14}/> Get Suggestions
            </button>
            <button 
              onClick={() => handleSendMessage('', 'placeInfo')} 
              disabled={isLoading || !selectedPlaces?.length}
            >
              <Info size={14}/> Place Info
            </button>
          </div>

          <div className="chat-input-area">
            <div className="chat-input-container">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => { 
                  if (e.target.value.length <= (CHAT_CONFIG.MAX_MESSAGE_LENGTH || 500)) {
                    setInputMessage(e.target.value); 
                  }
                }}
                placeholder="Ask about places, routes, timings..."
                rows={1}
                disabled={isLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button 
                onClick={() => handleSendMessage()} 
                disabled={!inputMessage.trim() || isLoading} 
                title="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;