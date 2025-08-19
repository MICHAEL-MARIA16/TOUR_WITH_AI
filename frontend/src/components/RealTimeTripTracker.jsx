// src/components/RealTimeTripTracker.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Clock, Target, AlertTriangle, CheckCircle } from 'lucide-react';

import toast from 'react-hot-toast'; // Add this line
//import { Clock, Target } from 'lucide-react';

// Rest of your component code...
const RealTimeTripTracker = ({ optimizedRoute, onLocationUpdate }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [tripProgress, setTripProgress] = useState({
    currentCheckpoint: 0,
    visitedPlaces: [],
    totalProgress: 0
  });
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [eta, setETA] = useState(null);

  // Start real-time tracking
  const startTracking = useCallback(async () => {
    try {
      // Get user's current location
      const position = await getCurrentPosition();
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      };

      setCurrentLocation(location);
      setIsTracking(true);

      // Initialize tracking session
      const response = await fetch('/api/trips/start-realtime-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: optimizedRoute.id,
          userId: 'current_user',
          startLocation: location
        })
      });

      if (response.ok) {
        toast.success('Real-time tracking started!');
        startLocationTracking();
      }
    } catch (error) {
      console.error('Failed to start tracking:', error);
      toast.error('Could not start location tracking');
    }
  }, [optimizedRoute]);

  // Real-time location tracking with 40-second intervals
  const startLocationTracking = useCallback(() => {
    const trackingInterval = setInterval(async () => {
      try {
        const position = await getCurrentPosition();
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        };

        setCurrentLocation(newLocation);
        onLocationUpdate && onLocationUpdate(newLocation);

        // Update backend with new location
        await updateLocationOnServer(newLocation);

        // Check for nearby destinations and auto-progress
        checkProximityToDestinations(newLocation);

      } catch (error) {
        console.error('Location tracking error:', error);
      }
    }, 40000); // 40 seconds as requested

    return () => clearInterval(trackingInterval);
  }, [onLocationUpdate]);

  // Update location on server
  const updateLocationOnServer = async (location) => {
    try {
      await fetch('/api/trips/update-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: optimizedRoute.id,
          currentLocation: location,
          action: 'update_location'
        })
      });
    } catch (error) {
      console.error('Failed to update server location:', error);
    }
  };

  // Check proximity to destinations for auto-progression
  const checkProximityToDestinations = (currentLoc) => {
    if (!optimizedRoute?.route || tripProgress.currentCheckpoint >= optimizedRoute.route.length) return;

    const nextDestination = optimizedRoute.route[tripProgress.currentCheckpoint];
    const distance = calculateDistance(
      currentLoc.latitude,
      currentLoc.longitude,
      nextDestination.location.latitude,
      nextDestination.location.longitude
    );

    // Auto-progress if within 100 meters
    if (distance <= 0.1) {
      handleArrivedAtDestination(nextDestination);
    }
  };

  // Handle arrival at destination
  const handleArrivedAtDestination = async (destination) => {
    try {
      setTripProgress(prev => ({
        ...prev,
        currentCheckpoint: prev.currentCheckpoint + 1,
        visitedPlaces: [...prev.visitedPlaces, destination.id],
        totalProgress: ((prev.currentCheckpoint + 1) / optimizedRoute.route.length) * 100
      }));

      // Update server
      await fetch('/api/trips/update-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: optimizedRoute.id,
          currentLocation,
          checkpointId: destination.id,
          action: 'arrive_at_checkpoint'
        })
      });

      toast.success(`Arrived at ${destination.name}!`);
    } catch (error) {
      console.error('Failed to update arrival:', error);
    }
  };

  // Get real-time updates every 40 seconds
  useEffect(() => {
    if (!isTracking || !currentLocation) return;

    const updatesInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/trips/real-time-updates?tripId=${optimizedRoute.id}&currentLocation=${JSON.stringify(currentLocation)}&lastUpdateTime=${Date.now()}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.updates.length > 0) {
            setRealTimeUpdates(prev => [...prev, ...data.data.updates]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch real-time updates:', error);
      }
    }, 40000);

    return () => clearInterval(updatesInterval);
  }, [isTracking, currentLocation, optimizedRoute.id]);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get current position
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Navigation className="text-blue-600" size={24} />
          Live Trip Tracking
        </h3>
        
        <button
          onClick={isTracking ? () => setIsTracking(false) : startTracking}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isTracking 
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isTracking ? 'Stop Tracking' : 'Start Live Tracking'}
        </button>
      </div>

      {isTracking && (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${tripProgress.totalProgress}%` }}
            />
            <div className="mt-2 text-sm text-gray-600 text-center">
              {Math.round(tripProgress.totalProgress)}% Complete
            </div>
          </div>

          {/* Current Location */}
          {currentLocation && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <MapPin className="text-blue-600" size={20} />
              <div>
                <div className="font-medium">Current Location</div>
                <div className="text-sm text-gray-600">
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </div>
                <div className="text-xs text-gray-500">
                  Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          {/* Next Destination */}
          {optimizedRoute?.route && tripProgress.currentCheckpoint < optimizedRoute.route.length && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Navigation className="text-green-600" size={20} />
              <div>
                <div className="font-medium">Next Destination</div>
                <div className="text-sm text-gray-600">
                  {optimizedRoute.route[tripProgress.currentCheckpoint].name}
                </div>
                {eta && (
                  <div className="text-xs text-gray-500">
                    ETA: {eta}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real-Time Updates */}
          {realTimeUpdates.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={18} />
                Live Updates
              </h4>
              {realTimeUpdates.slice(-3).map((update, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                  <div>
                    <div className="font-medium text-sm">{update.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visited Places */}
          {tripProgress.visitedPlaces.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="text-green-500" size={18} />
                Completed ({tripProgress.visitedPlaces.length})
              </h4>
              {tripProgress.visitedPlaces.map((placeId, index) => {
                const place = optimizedRoute.route.find(p => p.id === placeId);
                return (
                  <div key={placeId} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm">{place?.name || `Place ${index + 1}`}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isTracking && (
        <div className="text-center py-8 text-gray-500">
          <Navigation className="mx-auto mb-3" size={48} />
          <p>Start live tracking to monitor your trip progress</p>
          <p className="text-sm mt-1">Updates every 40 seconds with real-time information</p>
        </div>
      )}
    </div>
  );
};

export default RealTimeTripTracker;