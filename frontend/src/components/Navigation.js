import React from 'react';
import { Globe, Route, Target, MessageSquare, Menu, X, ChevronRight } from 'lucide-react';

const Navigation = ({ currentPage, onPageChange, isMenuOpen, setIsMenuOpen }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Globe },
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'planner', label: 'Trip Planner', icon: Route },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare }
  ];
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🗺️</div>
            <div>
              <span className="text-xl font-bold text-gray-900">TourWithAI</span>
              <div className="text-xs text-gray-500">South India Explorer</div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentPage === id
                    ? 'text-blue-600 bg-blue-50 font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-600 hover:text-gray-900 p-2">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onPageChange(id);
                  setIsMenuOpen(false);
                }}
                className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-all duration-200 ${
                  currentPage === id
                    ? 'text-blue-600 bg-blue-50 font-medium border-r-4 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;