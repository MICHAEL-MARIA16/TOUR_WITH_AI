import React, { useState, useEffect } from 'react';
import {
  MapPin,
  CheckCircle2,
  Route,
  Wallet,
  Loader,
  Navigation as NavigationIcon,
  MessageSquare,
  Search,
  Target
} from 'lucide-react';
import { STORAGE_KEYS } from '../utils/constants';
import { apiService } from '../services/api';
import ConnectionStatus from './ConnectionStatus';

const DashboardPage = ({ onPageChange, isConnected, onRetry }) => {
  const [stats, setStats] = useState({
    totalTrips: 0,
    visitedPlaces: 0,
    totalDistance: 0,
    savedMoney: 0
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected) {
      loadDashboardData();
    } else {
      const visitedPlaces = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITED_PLACES) || '[]');
      setStats(prev => ({ ...prev, visitedPlaces: visitedPlaces.length }));
      setLoading(false);
    }
  }, [isConnected]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const tripsResp = await apiService.getAllTrips();
      const trips = tripsResp?.success ? tripsResp.data : [];

      const totalTrips = trips.length;
      const totalDistance = trips.reduce((sum, t) => sum + (t.metrics?.totalDistance || 0), 0);
      const savedMoney = 0;

      const visitedIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITED_PLACES) || '[]');
      const totalVisitedPlaces = visitedIds.length;

      setStats({
        totalTrips,
        visitedPlaces: totalVisitedPlaces,
        totalDistance: Math.round(totalDistance),
        savedMoney: Math.round(savedMoney)
      });

      setRecentTrips(trips.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Dashboard</h1>
          <p className="text-gray-600">Your personalized travel command center</p>
        </div>

        {!isConnected && (
          <div className="mb-6">
            <ConnectionStatus isConnected={isConnected} onRetry={onRetry} />
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Route} color="bg-blue-100" iconColor="text-blue-600" label="Total Trips" value={loading ? '...' : stats.totalTrips} />
          <StatCard icon={CheckCircle2} color="bg-green-100" iconColor="text-green-600" label="Visited Places" value={loading ? '...' : stats.visitedPlaces} />
          <StatCard icon={NavigationIcon} color="bg-purple-100" iconColor="text-purple-600" label="Distance Traveled" value={loading ? '...' : `${stats.totalDistance} km`} />
          <StatCard icon={Wallet} color="bg-yellow-100" iconColor="text-yellow-600" label="Money Saved" value={loading ? '...' : `₹${stats.savedMoney}`} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <ActionButton onClick={() => onPageChange('planner')} icon={Route} label="Plan New Trip" primary />
                <ActionButton onClick={() => onPageChange('chat')} icon={MessageSquare} label="Ask AI Assistant" />
                <ActionButton onClick={() => onPageChange('planner')} icon={Search} label="Discover Places" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Trips</h3>
              {isConnected && !loading ? (
                <div className="space-y-3">
                  {recentTrips.length > 0 ? (
                    recentTrips.map((trip) => (
                      <div key={trip._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MapPin className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{trip.name || 'Unnamed Trip'}</div>
                          <div className="text-xs text-gray-600">
                            {trip.places?.length || 0} places — {Math.round(trip.metrics?.totalDistance || 0)} km
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No trips yet.</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  {loading ? <Loader className="animate-spin mx-auto mb-2" size={24} /> : <p className="text-gray-500">Connect to backend to see trips</p>}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
              <StatusRow label="Backend Server" ok={isConnected} />
              <StatusRow label="AI Assistant" ok={isConnected} />
              <StatusRow label="Trip Planner" ok={isConnected} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tips & Updates</h3>
              <TipBox color="blue" title="🚀 New Features" text="Try the new AI-powered trip optimization algorithms!" />
              <TipBox color="green" title="💡 Travel Tip" text="Visit temples early morning for a peaceful experience." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, color, iconColor, label, value }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="flex items-center">
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mr-4`}>
        <Icon className={iconColor} size={24} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  </div>
);

const ActionButton = ({ onClick, icon: Icon, label, primary }) => (
  <button
    onClick={onClick}
    className={`${primary ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'} 
      p-4 rounded-lg transition-colors flex items-center justify-center space-x-2`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const StatusRow = ({ label, ok }) => (
  <div className="flex items-center justify-between my-2">
    <span className="text-sm text-gray-600">{label}</span>
    <div className={`w-3 h-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}></div>
  </div>
);

const TipBox = ({ color, title, text }) => (
  <div className={`p-4 mb-4 bg-${color}-50 rounded-lg`}>
    <h4 className={`font-medium text-${color}-900 mb-2`}>{title}</h4>
    <p className={`text-sm text-${color}-800`}>{text}</p>
  </div>
);

export default DashboardPage;