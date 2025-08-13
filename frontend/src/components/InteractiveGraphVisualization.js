import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as d3 from "d3";
import { Loader, MapPin, Clock, IndianRupee, Star, Route, Settings, RefreshCw, Info } from "lucide-react";

const OptimizedGraphVisualization = ({ 
  optimizedRoute, 
  selectedPlaces, 
  visitedPlaces, 
  onPlaceVisited,
  isLoading,
  onOptimizeRoute,
  routeSettings,
  onRouteSettingsChange 
}) => {
  const svgRef = useRef();
  const [dimensions] = useState({ width: 900, height: 650 });
  const [simulation, setSimulation] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showRouteInfo, setShowRouteInfo] = useState(false);

  // Category colors for different place types
  const categoryConfig = {
    temple: { color: "#f59e0b", icon: "🛕" },
    palace: { color: "#8b5cf6", icon: "🏰" },
    "hill-station": { color: "#10b981", icon: "⛰️" },
    beach: { color: "#06b6d4", icon: "🏖️" },
    heritage: { color: "#f97316", icon: "🏛️" },
    nature: { color: "#22c55e", icon: "🌿" },
    museum: { color: "#ef4444", icon: "🏛️" },
    park: { color: "#84cc16", icon: "🌳" },
    fort: { color: "#a855f7", icon: "🏰" },
    waterfall: { color: "#0ea5e9", icon: "💧" },
    default: { color: "#6b7280", icon: "📍" }
  };

  const nodeSize = { radius: 25, fontSize: 14 };

  // Process the optimized route data to create nodes and links
  const processRouteData = useCallback(() => {
    if (!optimizedRoute || !optimizedRoute.route || optimizedRoute.route.length === 0) {
      return { nodes: [], links: [] };
    }

    console.log('🔄 Processing optimized route:', optimizedRoute);

    // Create nodes from the OPTIMIZED route (not original selection order)
    const nodes = optimizedRoute.route.map((place, index) => {
      // Ensure we have all required fields
      const processedPlace = {
        id: place.id || place._id,
        name: place.name,
        category: place.category || 'default',
        city: place.city,
        state: place.state,
        rating: place.rating || 0,
        location: place.location || { latitude: 0, longitude: 0 },
        averageVisitDuration: place.averageVisitDuration || place.visitDuration || 60,
        entryFee: place.entryFee || { indian: 0 },
        description: place.description || '',
        // Add optimization-specific data
        optimizationOrder: index + 1,
        isOptimized: true,
        // Initialize D3 position (will be updated by force simulation)
        x: dimensions.width / 2 + (Math.random() - 0.5) * 200,
        y: dimensions.height / 2 + (Math.random() - 0.5) * 200
      };

      console.log(`📍 Node ${index + 1}: ${processedPlace.name} (ID: ${processedPlace.id})`);
      return processedPlace;
    });

    // Create links based on the OPTIMIZED route order
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const sourceNode = nodes[i];
      const targetNode = nodes[i + 1];
      
      // Get travel info from itinerary if available
      const itineraryItem = optimizedRoute.itinerary?.[i];
      const travelTime = itineraryItem?.travelTimeToNext || 0;
      const travelDistance = itineraryItem?.travelDistanceToNext || 0;

      const link = {
        source: sourceNode.id,
        target: targetNode.id,
        order: i + 1,
        travelTime: travelTime,
        travelDistance: travelDistance,
        // D3 will replace source/target with node objects
      };

      console.log(`🔗 Link ${i + 1}: ${sourceNode.name} → ${targetNode.name} (${travelTime}min, ${travelDistance}km)`);
      links.push(link);
    }

    console.log(`✅ Created ${nodes.length} nodes and ${links.length} links from optimized route`);
    return { nodes, links };
  }, [optimizedRoute, dimensions]);

  // D3 Force Simulation Setup
  useEffect(() => {
    if (!optimizedRoute || optimizedRoute.route.length === 0) {
      // Clear visualization if no optimized route
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      if (simulation) {
        simulation.stop();
        setSimulation(null);
      }
      return;
    }

    const { nodes, links } = processRouteData();
    
    if (nodes.length === 0) return;

    // Clear previous visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    console.log('🎨 Setting up D3 force simulation with', nodes.length, 'nodes');

    // Create force simulation
    const newSimulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id(d => d.id)
        .distance(d => {
          // Dynamic distance based on travel time
          const baseDistance = 100;
          const travelTimeFactor = Math.min(d.travelTime / 30, 3); // Max 3x base distance
          return baseDistance + (travelTimeFactor * 50);
        })
        .strength(0.8)
      )
      .force("charge", d3.forceManyBody()
        .strength(-400)
        .distanceMax(300)
      )
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide()
        .radius(nodeSize.radius + 15)
        .strength(0.7)
      )
      .alphaTarget(0)
      .alphaDecay(0.05);

    // Store simulation reference
    setSimulation(newSimulation);

    // Define drag behavior
    const dragStarted = (event, d) => {
      if (!event.active) newSimulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      setHoveredNode(d);
    };
    
    const dragged = (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    };
    
    const dragEnded = (event, d) => {
      if (!event.active) newSimulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      setHoveredNode(null);
    };

    // Create SVG elements
    const defs = svg.append("defs");
    
    // Arrow marker for route direction
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", nodeSize.radius + 8)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#dc2626")
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 1);

    // Add gradient for links based on optimization efficiency
    const gradient = defs.append("linearGradient")
      .attr("id", "routeGradient")
      .attr("gradientUnits", "userSpaceOnUse");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.8);
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#dc2626")
      .attr("stop-opacity", 0.8);

    // Create container groups
    const linksGroup = svg.append("g").attr("class", "links");
    const nodesGroup = svg.append("g").attr("class", "nodes");
    const labelsGroup = svg.append("g").attr("class", "labels");

    // Create links (route connections)
    const linkElements = linksGroup.selectAll(".route-link")
      .data(links)
      .enter().append("g")
      .attr("class", "route-link-group");

    // Main route line
    const linkLines = linkElements.append("line")
      .attr("class", "route-link")
      .attr("stroke", d => {
        // Color based on travel time - green for short, red for long
        const maxTime = Math.max(...links.map(l => l.travelTime));
        const intensity = maxTime > 0 ? d.travelTime / maxTime : 0;
        return d3.interpolateRgb("#10b981", "#dc2626")(intensity);
      })
      .attr("stroke-width", d => {
        // Width based on importance in route
        return Math.max(2, 6 - d.order);
      })
      .attr("stroke-dasharray", "8,4")
      .attr("marker-end", "url(#arrowhead)")
      .style("opacity", 0.8)
      .style("filter", "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))");

    // Travel time labels on links
    const linkLabels = linkElements.append("text")
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#374151")
      .attr("stroke", "white")
      .attr("stroke-width", "2")
      .attr("paint-order", "stroke")
      .text(d => d.travelTime > 0 ? `${Math.round(d.travelTime)}min` : '')
      .style("opacity", 0.7)
      .style("pointer-events", "none");

    // Create nodes (places)
    const nodeElements = nodesGroup.selectAll(".node-group")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded));

    // Node background circles (for better visibility)
    nodeElements.append("circle")
      .attr("class", "node-bg")
      .attr("r", nodeSize.radius + 3)
      .attr("fill", "white")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2)
      .style("opacity", 0.9);

    // Main node circles
    const nodeCircles = nodeElements.append("circle")
      .attr("class", "node-circle")
      .attr("r", nodeSize.radius)
      .attr("fill", d => {
        if (visitedPlaces && visitedPlaces.has(d.id)) {
          return "#22c55e"; // Green for visited
        }
        const category = categoryConfig[d.category] || categoryConfig.default;
        return category.color;
      })
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.25))")
      .style("transition", "all 0.3s ease");

    // Optimization order numbers
    const orderLabels = nodeElements.append("text")
      .attr("class", "order-label")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("font-size", nodeSize.fontSize)
      .attr("font-weight", "700")
      .attr("fill", "white")
      .attr("stroke", "rgba(0,0,0,0.1)")
      .attr("stroke-width", "0.5")
      .text(d => d.optimizationOrder)
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.3)");

    // Place names below nodes
    const nameLabels = labelsGroup.selectAll(".name-label")
      .data(nodes)
      .enter().append("text")
      .attr("class", "name-label")
      .attr("text-anchor", "middle")
      .attr("dy", nodeSize.radius + 20)
      .attr("font-family", "Inter, system-ui, sans-serif")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", "#1f2937")
      .attr("stroke", "white")
      .attr("stroke-width", "3")
      .attr("paint-order", "stroke")
      .text(d => {
        const maxLength = 12;
        return d.name.length > maxLength ? 
          d.name.substring(0, maxLength) + "..." : 
          d.name;
      })
      .style("pointer-events", "none");

    // Mouse events for interactivity
    nodeElements
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        // Highlight connected links
        linkLines.style("opacity", link => 
          link.source.id === d.id || link.target.id === d.id ? 1 : 0.3
        );
        nodeCircles.style("opacity", node => 
          node.id === d.id ? 1 : 0.6
        );
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        linkLines.style("opacity", 0.8);
        nodeCircles.style("opacity", 1);
      })
      .on("click", (event, d) => {
        if (onPlaceVisited) {
          const isVisited = visitedPlaces && visitedPlaces.has(d.id);
          onPlaceVisited(d.id, !isVisited);
        }
      });

    // Tooltips
    nodeElements.append("title")
      .text(d => {
        const isVisited = visitedPlaces && visitedPlaces.has(d.id);
        const category = categoryConfig[d.category] || categoryConfig.default;
        return [
          `${d.optimizationOrder}. ${d.name}`,
          `${category.icon} ${d.category}`,
          `📍 ${d.city}, ${d.state}`,
          `⭐ ${d.rating}/5`,
          `⏱️ ${Math.round(d.averageVisitDuration)}min visit`,
          `💰 ₹${d.entryFee?.indian || 0}`,
          `${isVisited ? '✅ Visited' : '📋 Not visited yet'}`,
          '',
          'Click to mark as visited/unvisited',
          'Drag to reposition'
        ].join('\n');
      });

    // Update positions on simulation tick
    newSimulation.on("tick", () => {
      // Update link positions
      linkLines
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      // Update link label positions (midpoint of link)
      linkLabels
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2 - 8);
        
      // Update node positions
      nodeElements.attr("transform", d => `translate(${d.x},${d.y})`);
      nameLabels.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Cleanup function
    return () => {
      if (newSimulation) {
        newSimulation.stop();
      }
    };

  }, [optimizedRoute, visitedPlaces, processRouteData, dimensions, onPlaceVisited]);

  // Calculate route statistics
  const routeStats = useMemo(() => {
    if (!optimizedRoute) return null;

    const { route, itinerary, totalTime, totalDistance, efficiency } = optimizedRoute;
    const visitedCount = visitedPlaces ? visitedPlaces.size : 0;
    const totalCost = route?.reduce((sum, place) => sum + (place.entryFee?.indian || 0), 0) || 0;
    
    return {
      totalPlaces: route?.length || 0,
      visitedCount,
      totalTime: Math.round(totalTime || 0),
      totalDistance: Math.round((totalDistance || 0) * 100) / 100,
      totalCost,
      efficiency: Math.round(efficiency || 0),
      averageRating: route?.length > 0 ? 
        Math.round((route.reduce((sum, p) => sum + (p.rating || 0), 0) / route.length) * 10) / 10 : 0
    };
  }, [optimizedRoute, visitedPlaces]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Loader size={48} className="animate-spin text-blue-500 mb-4" />
        <p className="text-lg font-semibold text-gray-700">Optimizing your route...</p>
        <p className="text-sm text-gray-500">Finding the best path through your selected places</p>
      </div>
    );
  }

  if (!optimizedRoute || !optimizedRoute.route || optimizedRoute.route.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Optimized Route Yet</h3>
        <p className="text-gray-500 text-center mb-6 max-w-md">
          Select at least 2 places and click "Optimize Route" to see your personalized travel path with optimal connections.
        </p>
        {selectedPlaces && selectedPlaces.length >= 2 && (
          <button
            onClick={onOptimizeRoute}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Route size={20} />
            Optimize Route for {selectedPlaces.length} Places
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route Statistics Header */}
      {routeStats && (
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Route className="text-blue-600" size={20} />
              Optimized Route Visualization
            </h3>
            <button
              onClick={() => setShowRouteInfo(!showRouteInfo)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <Info size={16} />
              {showRouteInfo ? 'Hide' : 'Show'} Info
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              <div>
                <div className="font-semibold">{routeStats.totalPlaces}</div>
                <div className="text-gray-500">Places</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-green-600" />
              <div>
                <div className="font-semibold">{routeStats.totalTime}min</div>
                <div className="text-gray-500">Total Time</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Route size={16} className="text-purple-600" />
              <div>
                <div className="font-semibold">{routeStats.totalDistance}km</div>
                <div className="text-gray-500">Distance</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <IndianRupee size={16} className="text-orange-600" />
              <div>
                <div className="font-semibold">₹{routeStats.totalCost}</div>
                <div className="text-gray-500">Entry Fees</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-600" />
              <div>
                <div className="font-semibold">{routeStats.averageRating}/5</div>
                <div className="text-gray-500">Avg Rating</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-semibold">{routeStats.visitedCount}</div>
                <div className="text-gray-500">Visited</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <div>
                <div className="font-semibold">{routeStats.efficiency}%</div>
                <div className="text-gray-500">Efficiency</div>
              </div>
            </div>
          </div>

          {showRouteInfo && optimizedRoute.itinerary && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-gray-900 mb-2">Route Sequence:</h4>
              <div className="flex flex-wrap gap-2">
                {optimizedRoute.itinerary.map((item, index) => (
                  <div
                    key={item.place.id}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <span className="font-semibold text-blue-600">{index + 1}</span>
                    <span>{item.place.name}</span>
                    {item.travelTimeToNext > 0 && (
                      <span className="text-gray-500">
                        → {Math.round(item.travelTimeToNext)}min
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Visualization */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="relative">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full bg-gradient-to-br from-blue-50 to-indigo-100"
            style={{ minHeight: '400px' }}
          />
          
          {/* Hovered Node Info Overlay */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 border max-w-xs z-10">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ 
                    backgroundColor: visitedPlaces && visitedPlaces.has(hoveredNode.id) ? 
                      '#22c55e' : 
                      (categoryConfig[hoveredNode.category] || categoryConfig.default).color 
                  }}
                />
                <span className="font-semibold text-sm">
                  #{hoveredNode.optimizationOrder} {hoveredNode.name}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>📍 {hoveredNode.city}, {hoveredNode.state}</div>
                <div>⭐ {hoveredNode.rating}/5 rating</div>
                <div>⏱️ {Math.round(hoveredNode.averageVisitDuration)} min visit</div>
                <div>💰 ₹{hoveredNode.entryFee?.indian || 0} entry fee</div>
                <div className="text-blue-600 font-medium">
                  {visitedPlaces && visitedPlaces.has(hoveredNode.id) ? '✅ Visited' : '📋 Click to mark visited'}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border">
            <h4 className="font-semibold text-sm mb-2">Legend</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Visited Places</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-gradient-to-r from-green-500 to-red-500"></div>
                <span>Route Path</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-semibold">1,2,3...</span>
                <span>Optimized Order</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">How to use this visualization:</p>
            <ul className="text-blue-800 space-y-1">
              <li>• <strong>Numbers on nodes</strong> show the optimized visit order from your algorithm</li>
              <li>• <strong>Colored arrows</strong> indicate the optimal travel path (green=short travel, red=longer travel)</li>
              <li>• <strong>Drag nodes</strong> to reposition them for better viewing</li>
              <li>• <strong>Click nodes</strong> to mark places as visited/unvisited</li>
              <li>• <strong>Hover nodes</strong> to see detailed information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedGraphVisualization;