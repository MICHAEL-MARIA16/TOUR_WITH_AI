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

  const svgRef = useRef(null);

  // Use useMemo to prevent re-creation on every render
  const graphDimensions = useMemo(() => ({ width: 800, height: 600 }), []);
  const nodeSize = useMemo(() => ({ radius: 22, fontSize: 12 }), []);
  const categoryConfig = PLACE_CATEGORIES;

  const loadAllPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const placesList = await apiService.getAllPlaces();
      setPlaces(placesList);
    } catch (err) {
      console.error('Error loading places:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadAllPlaces();
    }
  }, [isConnected]);

  const handlePlaceSelect = (place, isSelected) => {
    setSelectedPlaces(prev => {
      if (isSelected) {
        return [...prev, place];
      } else {
        const newSelection = prev.filter(p => p.id !== place.id);
        if (newSelection.length < 2) {
          setOptimizedRoute(null);
        }
        return newSelection;
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedPlaces([]);
    setOptimizedRoute(null);
    setVisitedPlaces(new Set());
    toast('Selection cleared', { icon: '🗑️' });
  };

  const handlePlaceVisited = (placeId, isVisited) => {
    setVisitedPlaces(prev => {
      const newSet = new Set(prev);
      if (isVisited) {
        newSet.add(placeId);
      } else {
        newSet.delete(placeId);
      }
      localStorage.setItem(STORAGE_KEYS.VISITED_PLACES, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const handleOptimizeRoute = async () => {
    if (selectedPlaces.length < 2) {
      toast.error('Please select at least 2 places to optimize.');
      return;
    }

    setLoading(true);
    setError(null);
    setOptimizedRoute(null);

    const placeIds = selectedPlaces.map(p => p.id);
    const optimizationData = {
      placeIds,
      optimizationLevel: routeSettings.optimizationLevel,
    };

    try {
      const response = await apiService.optimizeRoute(optimizationData);
      
      if (response?.success) {
        const { optimizedRoute: route, itinerary } = response.data;
        if (route && itinerary) {
          setOptimizedRoute({ route, itinerary });
          toast.success('Route optimized successfully!');
        } else {
          throw new Error('No feasible route could be generated.');
        }
      } else {
        throw new Error(response?.message || 'Failed to optimize route.');
      }
    } catch (err) {
      console.error('Optimization error:', err);
      setError(err.message);
      toast.error(err.message || 'Error optimizing route.');
    } finally {
      setLoading(false);
    }
  };

  // D3 Visualization logic
  useEffect(() => {
    if (!optimizedRoute) return;

    const nodesData = optimizedRoute.route.map(place => ({
      ...place,
      id: place.id,
      name: place.name,
      category: place.category
    }));

    const linksData = [];
    for (let i = 0; i < nodesData.length - 1; i++) {
      linksData.push({
        source: nodesData[i].id,
        target: nodesData[i + 1].id,
      });
    }

    const simulation = d3.forceSimulation(nodesData)
      .force("link", d3.forceLink(linksData).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(graphDimensions.width / 2, graphDimensions.height / 2))
      .force("collision", d3.forceCollide().radius(nodeSize.radius + 6))
      .on("tick", () => {
        const svg = d3.select(svgRef.current);
        
        svg.selectAll(".route-link")
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);
          
        svg.selectAll(".node-group")
          .attr("transform", d => `translate(${d.x},${d.y})`);
      });

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
    
    svg.selectAll("*").remove();

    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#dc2626");

    const linksGroup = svg.append("g").attr("class", "links");
    linksGroup.selectAll(".route-link")
      .data(linksData)
      .enter().append("line")
      .attr("class", "route-link")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)");
      
    const nodesGroup = svg.append("g").attr("class", "nodes");
    const node = nodesGroup.selectAll(".node-group")
      .data(nodesData)
      .enter().append("g")
      .attr("class", "node-group")
      .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded));
    
    node.append("circle")
      .attr("r", nodeSize.radius)
      .attr("fill", d => visitedPlaces.has(d.id) ? "#22c55e" : (categoryConfig[d.category]?.color || "#6b7280"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
      
    node.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-size", nodeSize.fontSize)
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .text((d, i) => i + 1);

    node.append("title").text(d => d.name);

    return () => simulation.stop();
  }, [optimizedRoute, visitedPlaces, graphDimensions, nodeSize, categoryConfig]);

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
          <h3 className="panel-title">Route Visualization</h3>
          <p className="panel-subtitle">Drag nodes to explore the optimal path.</p>
          {loading && (
            <div className="visualization-loading">
              <Loader size={48} className="animate-spin text-gray-400" />
              <p className="mt-4 text-gray-500">Generating optimal route...</p>
            </div>
          )}
          {optimizedRoute ? (
            <svg
              ref={svgRef}
              width={graphDimensions.width}
              height={graphDimensions.height}
              className="d3-graph"
            />
          ) : (
            <div className="visualization-empty">
              <p>Select at least 2 places and click "Optimize Route" to see the visualization.</p>
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
        />
      </div>
    </div>
  );
};

export default TripPlannerPage;