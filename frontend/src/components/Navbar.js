import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MapPin, 
  MessageCircle, 
  Map,
  Menu,
  X,
  Brain,
  Compass,
  Zap
} from 'lucide-react';

const Navbar = ({ isConnected }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      description: 'Welcome to Tour With AI'
    },
    {
      name: 'Trip Planner',
      href: '/trip-planner',
      icon: Brain,
      description: 'AI-powered route optimization'
    },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: MessageCircle,
      description: 'Chat with your travel guide'
    },
    {
      name: 'Map View',
      href: '/map',
      icon: Map,
      description: 'Interactive map exploration'
    },
    {
      name: 'Places',
      href: '/places',
      icon: Compass,
      description: 'Explore South Indian destinations'
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-3 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              <div className="relative">
                <Zap className="text-blue-600" size={28} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="hidden sm:block">Tour With AI</span>
            </Link>
            
            {/* Tagline */}
            <div className="hidden lg:block ml-6 text-sm text-gray-500 border-l border-gray-300 pl-6">
              Discover South India with AI Intelligence
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  title={item.description}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Connection Status Indicator */}
            <div className="ml-4 flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'AI Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            {/* Mobile Connection Status */}
            <div className={`mr-3 w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200 shadow-lg">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              );
            })}
            
            {/* Mobile Connection Status */}
            <div className="px-3 py-2 border-t border-gray-200 mt-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  Backend Status: {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isConnected 
                  ? 'AI algorithms and features are available' 
                  : 'Some features may be limited'}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;