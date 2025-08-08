// frontend/src/components/ChatBot.js
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Bot, Clock, MapPin, RefreshCw, Minimize2 } from 'lucide-react';
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
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (inputRef.current && !isMinimized) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }, CHAT_CONFIG.AUTO_SCROLL_DELAY);
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

  const handleSendMessage = async (message = inputMessage.trim()) => {
    if (!message || isLoading) return;

    // Add user message
    addMessage('user', message);
    setInputMessage('');
    setIsLoading(true);

    // Show typing indicator
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, CHAT_CONFIG.TYPING_INDICATOR_DELAY));

    try {
      // Prepare context
      const context = {
        selectedPlaces: selectedPlaces?.map(p => p.name) || [],
        currentRoute: optimizedRoute || [],
        timeConstraints: {
          totalPlaces: selectedPlaces?.length || 0,
          hasRoute: !!optimizedRoute
        }
      };

      const response = await apiService.chatWithAI(message, context);
      
      setIsTyping(false);
      
      if (response.success) {
        addMessage('bot', response.data.message, {
          responseTime: response.data.responseTime,
          fallback: response.data.fallback
        });
      } else {
        throw new Error(response.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      addMessage('bot', CHAT_CONFIG.SYSTEM_MESSAGES.error, {
        error: true
      });
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (quickReply) => {
    const cleanMessage = quickReply.replace(/^[🕐💰🚗⭐🍽️🏨]\s*/, '');
    handleSendMessage(cleanMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const contextInfo = selectedPlaces?.length > 0 ? (
    <div className="chat-context">
      <div className="context-item">
        <MapPin size={14} />
        <span>{selectedPlaces.length} places selected</span>
      </div>
      {optimizedRoute && (
        <div className="context-item">
          <Clock size={14} />
          <span>Route optimized</span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={`chat-bot ${isMinimized ? 'minimized' : ''}`}>
      {/* Chat Header */}
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
          <button 
            onClick={clearChat}
            className="chat-action-btn"
            title="Clear Chat"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={onClose}
            className="chat-action-btn close"
            title="Close Chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Context Info */}
          {contextInfo}

          {/* Messages Container */}
          <div className="chat-messages" ref={chatContainerRef}>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.type} ${message.error ? 'error' : ''}`}
              >
                <div className="message-avatar">
                  {message.type === 'user' ? (
                    <User size={18} />
                  ) : (
                    <Bot size={18} />
                  )}
                </div>
                
                <div className="message-content">
                  <div className="message-bubble">
                    <p>{message.content}</p>
                    {message.fallback && (
                      <div className="fallback-notice">
                        ⚠️ Fallback response (AI temporarily unavailable)
                      </div>
                    )}
                  </div>
                  
                  <div className="message-meta">
                    <span className="message-time">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.responseTime && (
                      <span className="response-time">
                        {message.responseTime}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="message bot typing">
                <div className="message-avatar">
                  <Bot size={18} />
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 2 && (
            <div className="quick-replies">
              <div className="quick-replies-title">Quick questions:</div>
              <div className="quick-replies-list">
                {CHAT_CONFIG.QUICK_REPLIES.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="quick-reply-btn"
                    disabled={isLoading}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="chat-input-container">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => {
                  if (e.target.value.length <= CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
                    setInputMessage(e.target.value);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Ask about places, routes, timings, or travel tips..."
                className="chat-input"
                rows={1}
                disabled={isLoading}
                style={{
                  height: 'auto',
                  minHeight: '20px',
                  maxHeight: '100px',
                  resize: 'none'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
              
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="send-button"
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
            
            <div className="input-meta">
              <span className="char-count">
                {inputMessage.length}/{CHAT_CONFIG.MAX_MESSAGE_LENGTH}
              </span>
              <span className="input-hint">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;