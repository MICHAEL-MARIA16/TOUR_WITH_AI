import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';
import ConnectionStatus from './ConnectionStatus';
import LocationSelector from './LocationSelector';
import ItineraryDisplay from './ItineraryDisplay';
import * as d3 from 'd3';
import { Loader } from 'lucide-react';
import { STORAGE_KEYS, ROUTE_SETTINGS, PLACE_CATEGORIES } from '../utils/constants';

const TripPlannerPage = ({ isConnected, onRetry }) => {
  const [places, setPlaces] = useState([]);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visitedPlaces, setVisitedPlaces] = useState(new Set());
  const [routeSettings, setRouteSettings] = useState({
    startTime: ROUTE_SETTINGS.DEFAULT_START_TIME,
    totalTimeAvailable: ROUTE_SETTINGS.DEFAULT_DURATION,
    optimizationLevel: 'fast'
  });
  const [apiError, setApiError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const svgRef = useRef(null);

  const graphDimensions = useMemo(() => ({ width: 800, height: 600 }), []);
  const nodeSize = useMemo(() => ({ radius: 22, fontSize: 12 }), []);
  const categoryConfig = PLACE_CATEGORIES;

  // Enhanced API response handling with comprehensive error checking
  // Replace your existing response parsing logic with this corrected version:

// Final loadAllPlaces function based on your actual API response structure
const loadAllPlaces = async (showToast = true) => {
  setLoading(true);
  setError(null);
  setApiError(null);
  
  try {
    console.log('🔄 Loading places from API...');
    
    const response = await fetch('http://localhost:5000/api/places');
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📦 Raw API response:', data);
    
    // Based on your API response structure:
    // { "success": true, "places": [...] }
    
    if (!data) {
      throw new Error('No response data received');
    }
    
    if (data.success !== true) {
      throw new Error(data.message || 'API returned success: false');
    }
    
    if (!data.places) {
      throw new Error('No places property in response');
    }
    
    if (!Array.isArray(data.places)) {
      throw new Error('Places property is not an array');
    }
    
    const places = data.places;
    console.log('✅ Places array extracted:', places.length, 'places');
    
    if (places.length === 0) {
      setError('No places found in database');
      if (showToast) {
        toast.error('No places found in database');
      }
      return;
    }
    
    // Validate places have required fields
    const validPlaces = places.filter((place, index) => {
      if (!place) {
        console.warn(`❌ Null place at index ${index}`);
        return false;
      }
      
      const hasId = place.id || place._id;
      const hasName = place.name && typeof place.name === 'string';
      const hasLocation = place.location && 
        typeof place.location.latitude === 'number' && 
        typeof place.location.longitude === 'number';
      
      if (!hasId || !hasName || !hasLocation) {
        console.warn(`❌ Invalid place at index ${index}:`, {
          hasId: !!hasId,
          hasName: !!hasName,
          hasLocation: !!hasLocation,
          place: place.name || 'unnamed'
        });
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ Valid places: ${validPlaces.length}/${places.length}`);
    
    if (validPlaces.length === 0) {
      throw new Error('No valid places found (all missing required fields)');
    }
    
    // Normalize places (ensure they all have an id property)
    const normalizedPlaces = validPlaces.map(place => ({
      ...place,
      id: place.id || place._id
    }));
    
    setPlaces(normalizedPlaces);
    setRetryCount(0);
    
    console.log('🎉 Places loaded successfully:', normalizedPlaces.length);
    console.log('📍 Sample place:', normalizedPlaces[0]?.name);
    
    if (showToast) {
      toast.success(`Loaded ${normalizedPlaces.length} places successfully!`);
    }
    
  } catch (error) {
    console.error('💥 Error loading places:', error);
    
    const errorMessage = error.message || 'Failed to load places';
    setError(errorMessage);
    setApiError(error);
    setRetryCount(prev => prev + 1);
    
    if (showToast) {
      toast.error(errorMessage);
    }
  } finally {
    setLoading(false);
  }
};

  // Enhanced localStorage error handling
  useEffect(() => {
    try {
      const storedVisited = localStorage.getItem(STORAGE_KEYS.VISITED_PLACES);
      if (storedVisited) {
        const visitedArray = JSON.parse(storedVisited);
        if (Array.isArray(visitedArray)) {
          setVisitedPlaces(new Set(visitedArray));
          console.log('Loaded visited places from localStorage:', visitedArray.length);
        } else {
          console.log('Invalid visited places data in localStorage, clearing...');
          localStorage.removeItem(STORAGE_KEYS.VISITED_PLACES);
        }
      }
    } catch (err) {
      console.error('Error loading visited places from localStorage:', err);
      try {
        localStorage.removeItem(STORAGE_KEYS.VISITED_PLACES);
      } catch (clearErr) {
        console.error('Error clearing corrupted localStorage:', clearErr);
      }
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadAllPlaces();
    }
  }, [isConnected]);

  const handlePlaceSelect = useCallback((place, isSelected) => {
    setSelectedPlaces(prev => {
      if (isSelected) {
        const newSelection = [...prev, place];
        console.log('Place selected:', place.name, 'Total selected:', newSelection.length);
        return newSelection;
      } else {
        const newSelection = prev.filter(p => p.id !== place.id);
        console.log('Place deselected:', place.name, 'Total selected:', newSelection.length);
        if (newSelection.length < 2) {
          setOptimizedRoute(null);
        }
        return newSelection;
      }
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPlaces([]);
    setOptimizedRoute(null);
    setVisitedPlaces(new Set());
    try {
      localStorage.removeItem(STORAGE_KEYS.VISITED_PLACES);
    } catch (err) {
      console.error('Error clearing visited places from localStorage:', err);
    }
    toast('Selection cleared', { icon: '🗑️' });
  }, []);

  const handlePlaceVisited = useCallback((placeId, isVisited) => {
    setVisitedPlaces(prev => {
      const newSet = new Set(prev);
      if (isVisited) {
        newSet.add(placeId);
        toast.success('Place marked as visited!', { icon: '✅' });
      } else {
        newSet.delete(placeId);
        toast('Place unmarked', { icon: '↩️' });
      }
      
      try {
        localStorage.setItem(STORAGE_KEYS.VISITED_PLACES, JSON.stringify(Array.from(newSet)));
      } catch (err) {
        console.error('Error saving visited places to localStorage:', err);
        toast.error('Failed to save visited places');
      }
      
      return newSet;
    });
  }, []);

  const handleOptimizeRoute = useCallback(async () => {
  if (selectedPlaces.length < 2) {
    toast.error('Please select at least 2 places to optimize.');
    return;
  }

  setLoading(true);
  setError(null);
  setOptimizedRoute(null);

  console.log('=== OPTIMIZING ROUTE ===');
  console.log('Selected places:', selectedPlaces.length);
  console.log('Route settings:', routeSettings);

  // Normalize places to ensure consistent format
  const normalizedPlaces = selectedPlaces.map(place => ({
    id: place.id,
    name: place.name,
    category: place.category || 'attraction',
    description: place.description || '',
    location: place.location || {
      latitude: place.coordinates?.lat || place.lat,
      longitude: place.coordinates?.lng || place.lng
    },
    visitDuration: place.visitDuration || place.recommendedDuration || 45, // Reduced default
    city: place.city || 'Unknown',
    state: place.state || 'Unknown',
    rating: place.rating || 0
  }));

  console.log('Normalized places:', normalizedPlaces);

  // Strategy 1: Try with current settings
  let optimizationAttempts = [
    {
      name: 'Current Settings',
      data: {
        places: normalizedPlaces,
        optimizationLevel: routeSettings.optimizationLevel,
        startTime: routeSettings.startTime,
        totalTimeAvailable: routeSettings.totalTimeAvailable
      }
    }
  ];

  // Strategy 2: If we have many places, try with more time
  if (selectedPlaces.length > 3 && routeSettings.totalTimeAvailable < 600) {
    optimizationAttempts.push({
      name: 'Extended Time',
      data: {
        places: normalizedPlaces,
        optimizationLevel: 'fast', // Use fast for better success rate
        startTime: routeSettings.startTime,
        totalTimeAvailable: Math.max(routeSettings.totalTimeAvailable, 600) // At least 10 hours
      }
    });
  }

  // Strategy 3: Try with reduced visit times
  const quickVisitPlaces = normalizedPlaces.map(p => ({
    ...p,
    visitDuration: Math.min(p.visitDuration, 30) // Max 30 minutes per place
  }));

  optimizationAttempts.push({
    name: 'Quick Visits',
    data: {
      places: quickVisitPlaces,
      optimizationLevel: 'fast',
      startTime: routeSettings.startTime,
      totalTimeAvailable: routeSettings.totalTimeAvailable
    }
  });

  // Strategy 4: Try with just the first few places if many selected
  if (selectedPlaces.length > 4) {
    optimizationAttempts.push({
      name: 'Reduced Places',
      data: {
        places: normalizedPlaces.slice(0, 4),
        optimizationLevel: 'fast',
        startTime: routeSettings.startTime,
        totalTimeAvailable: routeSettings.totalTimeAvailable
      }
    });
  }

  let lastError = null;
  
  for (let attempt of optimizationAttempts) {
    try {
      console.log(`🚀 Trying strategy: ${attempt.name}`, attempt.data);
      
      const response = await apiService.optimizeRoute(attempt.data);
      console.log('📥 Response for', attempt.name, ':', response);
      
      if (response?.success) {
        // Handle different possible response structures
        let route, itinerary;
        
        if (response.data) {
          route = response.data.optimizedRoute || response.data.route || response.data.places;
          itinerary = response.data.itinerary || response.data.schedule;
        } else {
          route = response.optimizedRoute || response.route || response.places;
          itinerary = response.itinerary || response.schedule;
        }
        
        console.log('🛤️ Extracted route:', route);
        
        if (route && Array.isArray(route) && route.length > 0) {
          // Create itinerary if not provided
          const finalItinerary = itinerary || route.map((place, index) => {
            const visitTime = place.visitDuration || attempt.data.places.find(p => p.id === place.id)?.visitDuration || 45;
            return {
              place: place,
              order: index + 1,
              visitDuration: visitTime,
              travelTimeToNext: index < route.length - 1 ? 15 : 0,
              startTime: calculateStartTime(attempt.data.startTime, index * (visitTime + 15)),
              endTime: calculateStartTime(attempt.data.startTime, index * (visitTime + 15) + visitTime)
            };
          });
          
          console.log('✅ Success with strategy:', attempt.name);
          setOptimizedRoute({ route, itinerary: finalItinerary });
          
          let successMessage = `Route optimized! ${route.length} places in optimal order.`;
          if (attempt.name !== 'Current Settings') {
            successMessage += ` (Used ${attempt.name} strategy)`;
          }
          
          toast.success(successMessage);
          setLoading(false);
          return; // Success! Exit the function
        }
      }
    } catch (err) {
      console.log(`❌ Strategy "${attempt.name}" failed:`, err.message);
      lastError = err;
      continue; // Try next strategy
    }
  }

  // If we get here, all strategies failed
  console.error('💥 All optimization strategies failed. Last error:', lastError);
  
  const fallbackRoute = createFallbackRoute(normalizedPlaces, routeSettings);
  if (fallbackRoute) {
    setOptimizedRoute(fallbackRoute);
    toast.success('Created basic route (optimization unavailable)', { icon: '⚠️' });
  } else {
    let errorMessage = `No feasible route found with ${selectedPlaces.length} places. Try:
    • Reducing to 2-3 places
    • Increasing total time to ${Math.max(routeSettings.totalTimeAvailable + 120, 600)} minutes
    • Selecting places in the same city
    • Using 'fast' optimization level`;
    
    setError(errorMessage);
    toast.error('Route optimization failed - try the suggestions above');
  }
  
  setLoading(false);
}, [selectedPlaces, routeSettings]);

// Helper function to create a simple fallback route
const createFallbackRoute = (places, settings) => {
  if (places.length < 2) return null;
  
  try {
    // Simple fallback: just use places in the order selected
    const route = places.slice(0, Math.min(places.length, 4)); // Limit to 4 places
    
    const itinerary = route.map((place, index) => ({
      place: place,
      order: index + 1,
      visitDuration: Math.min(place.visitDuration || 45, 60), // Cap at 1 hour
      travelTimeToNext: index < route.length - 1 ? 20 : 0, // Conservative travel time
      startTime: calculateStartTime(settings.startTime, index * 80), // 60min visit + 20min travel
      endTime: calculateStartTime(settings.startTime, index * 80 + (place.visitDuration || 45))
    }));
    
    console.log('🔄 Created fallback route:', { route, itinerary });
    return { route, itinerary };
  } catch (err) {
    console.error('Failed to create fallback route:', err);
    return null;
  }
};

// Helper function for time calculations
const calculateStartTime = (baseStartTime, additionalMinutes) => {
  const [hours, minutes] = baseStartTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + additionalMinutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
};

const calculateEndTime = (startTime, index, visitDuration) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + (index * 75) + visitDuration;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
};

  // Enhanced D3 visualization with better error handling
  useEffect(() => {
    if (!optimizedRoute || !optimizedRoute.route || optimizedRoute.route.length === 0) {
      // Clear the visualization if no route
      const svg = d3.select(svgRef.current);
      if (svg.node()) {
        svg.selectAll("*").remove();
      }
      return;
    }

    try {
      const nodesData = optimizedRoute.route.map((place, index) => ({
        ...place,
        id: place.id,
        name: place.name,
        category: place.category,
        order: index + 1
      }));

      const linksData = [];
      for (let i = 0; i < nodesData.length - 1; i++) {
        linksData.push({
          source: nodesData[i].id,
          target: nodesData[i + 1].id,
        });
      }

      const simulation = d3.forceSimulation(nodesData)
        .force("link", d3.forceLink(linksData).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(graphDimensions.width / 2, graphDimensions.height / 2))
        .force("collision", d3.forceCollide().radius(nodeSize.radius + 10))
        .alpha(1)
        .alphaDecay(0.02);

      const dragStarted = (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      };
      
      const dragged = (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      };
      
      const dragEnded = (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      };

      const svg = d3.select(svgRef.current);
      
      // Clear previous content
      svg.selectAll("*").remove();

      // Add arrow marker definition
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", nodeSize.radius + 8)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#dc2626");

      // Add links
      const linksGroup = svg.append("g").attr("class", "links");
      const links = linksGroup.selectAll(".route-link")
        .data(linksData)
        .enter().append("line")
        .attr("class", "route-link")
        .attr("stroke", "#dc2626")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("marker-end", "url(#arrowhead)")
        .style("opacity", 0.8);
        
      // Add nodes
      const nodesGroup = svg.append("g").attr("class", "nodes");
      const node = nodesGroup.selectAll(".node-group")
        .data(nodesData)
        .enter().append("g")
        .attr("class", "node-group")
        .style("cursor", "grab")
        .call(d3.drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded));
      
      // Add circles with better styling
      node.append("circle")
        .attr("r", nodeSize.radius)
        .attr("fill", d => {
          if (visitedPlaces.has(d.id)) return "#22c55e"; // Green for visited
          return categoryConfig[d.category]?.color || "#6b7280"; // Category color or default
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 3)
        .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))");
        
      // Add order numbers
      node.append("text")
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", nodeSize.fontSize)
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .text(d => d.order)
        .style("pointer-events", "none");

      // Add place names below nodes
      node.append("text")
        .attr("dy", nodeSize.radius + 20)
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#374151")
        .style("pointer-events", "none")
        .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name);

      // Add tooltips
      node.append("title").text(d => `${d.order}. ${d.name}\n${d.city}, ${d.state}\nCategory: ${d.category}`);

      // Update positions on tick
      simulation.on("tick", () => {
        links
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
          
        node
          .attr("transform", d => `translate(${d.x},${d.y})`);
      });

      // Cleanup function
      return () => {
        simulation.stop();
      };

    } catch (err) {
      console.error('Error creating D3 visualization:', err);
      toast.error('Failed to create route visualization');
    }
  }, [optimizedRoute, visitedPlaces, graphDimensions, nodeSize, categoryConfig]);

  // Update route settings
  const handleRouteSettingsChange = useCallback((newSettings) => {
    setRouteSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  // Enhanced retry functionality
  const handleRetry = useCallback(() => {
    setError(null);
    setApiError(null);
    loadAllPlaces(true);
  }, []);

  // Auto-retry with exponential backoff for API errors
  useEffect(() => {
    if (apiError && retryCount < 3 && isConnected) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10 seconds
      console.log(`Auto-retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
      
      const timer = setTimeout(() => {
        console.log(`Auto-retry attempt ${retryCount + 1}`);
        loadAllPlaces(false); // Don't show toast for auto-retries
      }, retryDelay);
      
      return () => clearTimeout(timer);
    }
  }, [apiError, retryCount, isConnected]);

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
    <div className="trip-planner-page">
      <div className="main-panel">
        <LocationSelector 
          places={places}
          selectedPlaces={selectedPlaces}
          onPlaceSelect={handlePlaceSelect}
          onClearSelection={handleClearSelection}
          onOptimizeRoute={handleOptimizeRoute}
          isLoading={loading}
          error={error}
        />
        
        <div className="visualization-panel">
          <div className="panel-header">
            <h3 className="panel-title">Route Visualization</h3>
            <p className="panel-subtitle">
              {optimizedRoute 
                ? `Optimal path through ${optimizedRoute.route.length} places. Drag nodes to explore.`
                : `${places.length} places available. Select at least 2 places and click 'Optimize Route' to see the visualization.`
              }
            </p>
          </div>
          
          {error && (
            <div className="error-banner">
              <div className="mb-2">
                <p className="text-red-600">⚠️ {error}</p>
                {apiError && retryCount > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Auto-retry attempt {retryCount}/3 in progress...
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleRetry} className="retry-button">
                  Try Again
                </button>
                {places.length === 0 && (
                  <button 
                    onClick={() => {
                      // Fallback: try to use sample data
                      console.log('Using fallback sample data');
                      // Changed from toast.info() to toast() with custom styling
                      toast('Loading sample data for demonstration', { 
                        icon: 'ℹ️',
                        style: {
                          background: '#3b82f6',
                          color: '#ffffff',
                        }
                      });
                      // You could set sample places here
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Use Sample Data
                  </button>
                )}
              </div>
            </div>
          )}
          
          {loading && (
            <div className="visualization-loading">
              <Loader size={48} className="animate-spin text-blue-500" />
              <p className="mt-4 text-gray-600">
                {places.length === 0 ? 'Loading places...' : 'Generating optimal route...'}
              </p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-500">
                  Retry attempt {retryCount}/3
                </p>
              )}
            </div>
          )}
          
          {optimizedRoute ? (
            <div className="visualization-container">
              <div className="route-stats">
                <span className="stat">
                  📍 {optimizedRoute.route.length} places
                </span>
                <span className="stat">
                  ⏱️ {optimizedRoute.itinerary ? 
                    Math.round(optimizedRoute.itinerary.reduce((sum, item) => sum + item.visitDuration + (item.travelTimeToNext || 0), 0)) + 'min'
                    : 'N/A'
                  }
                </span>
                <span className="stat">
                  ✅ {visitedPlaces.size} visited
                </span>
              </div>
              
              <svg
                ref={svgRef}
                width={graphDimensions.width}
                height={graphDimensions.height}
                className="d3-graph"
                style={{ border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fafafa' }}
              />
              
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#22c55e' }}></div>
                  <span>Visited</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#6b7280' }}></div>
                  <span>Not Visited</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line"></div>
                  <span>Route Path</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="visualization-empty">
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <h4>No Route Generated Yet</h4>
                <p>
                  {places.length > 0 
                    ? `${places.length} places loaded. Select at least 2 places from the list and click "Optimize Route" to see your personalized travel path.`
                    : "Loading places data..."
                  }
                </p>
                {selectedPlaces.length > 0 && (
                  <p className="selected-count">
                    {selectedPlaces.length} place{selectedPlaces.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="itinerary-panel">
        <ItineraryDisplay 
          itinerary={optimizedRoute?.itinerary || []}
          optimizedRoute={optimizedRoute?.route}
          visitedPlaces={visitedPlaces}
          onPlaceVisited={handlePlaceVisited}
          routeSettings={routeSettings}
          onRouteSettingsChange={handleRouteSettingsChange}
        />
      </div>
    </div>
  );
};

export default TripPlannerPage;