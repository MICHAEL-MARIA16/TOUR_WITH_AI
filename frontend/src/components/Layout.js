// frontend/src/components/Layout.js
import React from 'react';
import { MapPin, Clock, Star, Navigation } from 'lucide-react';
import * as Icons from 'lucide-react';
console.log(Object.keys(Icons));


const Layout = ({ children }) => {
  return (
    <div className="layout">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <MapPin className="logo-icon" />
            <div className="logo-text">
              <h1>TourWithAI</h1>
              <p>Your Smartest Travel Buddy Through South India</p>
            </div>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <MapPin size={16} />
              <span>20 Destinations</span>
            </div>
            <div className="stat-item">
              <Navigation size={16} />
              <span>Smart Routing</span>
              <span>Smart Routing</span>
            </div>
            <div className="stat-item">
              <Clock size={16} />
              <span>Time Optimized</span>
            </div>
            <div className="stat-item">
              <Star size={16} />
              <span>AI Powered</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>TourWithAI</h4>
            <p>Making South India exploration smarter, one route at a time.</p>
          </div>
          
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>Route Optimization</li>
              <li>Real-time Traffic</li>
              <li>AI Travel Assistant</li>
              <li>Time Management</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Destinations</h4>
            <ul>
              <li>Tamil Nadu</li>
              <li>Kerala</li>
              <li>Karnataka</li>
              <li>Telangana</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 TourWithAI. All rights reserved.</p>
          <div className="footer-tech">
            <span>Powered by Google Maps & Gemini AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;