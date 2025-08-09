import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Route, 
  Star, 
  Clock, 
  DollarSign, 
  Users, 
  Maximize2, 
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Info,
  Navigation
} from 'lucide-react';

const InteractiveGraphVisualization = ({ 
  places = [], 
  selectedPlaces = [], 
  optimizedRoute = [], 
  onPlaceSelect,
  onRouteUpdate,
  className = "" 
}) => {
  const svgRef = useRef();
  const animationRef = useRef();
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [nodePositions, setNodePositions] = useState(new Map());
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('circular');
  const [showLabels, setShowLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [nodeSize, setNodeSize] = useState('medium');

  // Category colors and icons for South Indian places
  const categoryConfig = {
    temple: { color: '#f59e0b', icon: '🛕', label: 'Temple' },
    palace: { color: '#8b5cf6', icon: '🏰', label: 'Palace' },
    'hill-station': { color: '#10b981', icon: '⛰️', label: 'Hill Station' },
    beach: { color: '#06b6d4', icon: '🏖️', label: 'Beach' },
    heritage: { color: '#f97316', icon: '🏛️', label: 'Heritage' },
    nature: { color: '#22c55e', icon: '🌿', label: 'Nature' },
    wildlife: { color: '#84cc16', icon: '🦁', label: 'Wildlife' },
    fort: { color: '#ef4444', icon: '🏰', label: 'Fort' }
  };

  const nodeSizes = {
    small: { radius: 20, fontSize: 10 },
    medium: { radius: 28, fontSize: 12 },
    large: { radius: 36, fontSize: 14 }
  };

  // Layout algorithms
  const layouts = {
    circular: (places, width, height) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.35;
      
      return places.map((place, index) => {
        const angle = (2 * Math.PI * index) / places.length - Math.PI / 2;
        return {
          id: place.id,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          place
        };
      });
    },

    geographic: (places, width, height) => {
      // Approximate geographic positioning based on lat/lng
      const bounds = places.reduce((acc, place) => ({
        minLat: Math.min(acc.minLat, place.location.latitude),
        maxLat: Math.max(acc.maxLat, place.location.latitude),
        minLng: Math.min(acc.minLng, place.location.longitude),
        maxLng: Math.max(acc.maxLng, place.location.longitude)
      }), {
        minLat: Infinity, maxLat: -Infinity,
        minLng: Infinity, maxLng: -Infinity
      });

      const padding = 50;
      const usableWidth = width - 2 * padding;
      const usableHeight = height - 2 * padding;

      return places.map(place => ({
        id: place.id,
        x: padding + ((place.location.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * usableWidth,
        y: padding + ((bounds.maxLat - place.location.latitude) / (bounds.maxLat - bounds.minLat)) * usableHeight,
        place
      }));
    },

    force: (places, width, height) => {
      // Simple force-directed layout simulation
      const nodes = places.map((place, index) => ({
        id: place.id,
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50,
        place
      }));

      // Run basic force simulation
      for (let iteration = 0; iteration < 100; iteration++) {
        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x;
            const dy = nodes[j].y - nodes[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 5000 / (distance * distance);
            
            nodes[i].x -= (dx / distance) * force;
            nodes[i].y -= (dy / distance) * force;
            nodes[j].x += (dx / distance) * force;
            nodes[j].y += (dy / distance) * force;
          }
        }

        // Keep nodes within bounds
        nodes.forEach(node => {
          node.x = Math.max(50, Math.min(width - 50, node.x));
          node.y = Math.max(50, Math.min(height - 50, node.y));
        });
      }

      return nodes;
    },

    category: (places, width, height) => {
      const categories = [...new Set(places.map(p => p.category))];
      const categoryGroups = {};
      
      categories.forEach(cat => {
        categoryGroups[cat] = places.filter(p => p.category === cat);
      });

      const cols = Math.ceil(Math.sqrt(categories.length));
      const rows = Math.ceil(categories.length / cols);
      const colWidth = width / cols;
      const rowHeight = height / rows;

      const positions = [];
      
      categories.forEach((category, catIndex) => {
        const col = catIndex % cols;
        const row = Math.floor(catIndex / cols);
        const centerX = col * colWidth + colWidth / 2;
        const centerY = row * rowHeight + rowHeight / 2;
        const categoryPlaces = categoryGroups[category];
        
        categoryPlaces.forEach((place, placeIndex) => {
          const angle = (2 * Math.PI * placeIndex) / categoryPlaces.length;
          const radius = Math.min(colWidth, rowHeight) * 0.25;
          
          positions.push({
            id: place.id,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
            place
          });
        });
      });

      return positions;
    }
  };

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: isFullscreen ? window.innerWidth : rect.width,
          height: isFullscreen ? window.innerHeight : Math.max(rect.height, 500)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Update node positions when layout or places change
  useEffect(() => {
    if (places.length > 0) {
      const layoutFunction = layouts[selectedLayout];
      const positions = layoutFunction(places, dimensions.width, dimensions.height);
      const positionMap = new Map();
      positions.forEach(pos => positionMap.set(pos.id, pos));
      setNodePositions(positionMap);
    }
  }, [places, dimensions, selectedLayout]);

  // Route animation
  const animateRoute = useCallback(() => {
    if (!optimizedRoute || optimizedRoute.length === 0 || !isAnimating) return;

    const startTime = Date.now();
    const duration = (optimizedRoute.length * 1000) / animationSpeed; // 1 second per place at normal speed

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1 && isAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setAnimationProgress(1);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [optimizedRoute, animationSpeed, isAnimating]);

  useEffect(() => {
    if (isAnimating) {
      animateRoute();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, animateRoute]);

  // Event handlers
  const handleNodeClick = (place) => {
    if (onPlaceSelect) {
      const isSelected = selectedPlaces.some(p => p.id === place.id);
      onPlaceSelect(place, !isSelected);
    }
  };

  const handleNodeHover = (place) => {
    setHoveredNode(place);
  };

  const handleNodeLeave = () => {
    setHoveredNode(null);
  };

  const toggleAnimation = () => {
    if (isAnimating) {
      setIsAnimating(false);
    } else if (optimizedRoute && optimizedRoute.length > 1) {
      setAnimationProgress(0);
      setIsAnimating(true);
    }
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setAnimationProgress(0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Render connections between places
  const renderConnections = () => {
    if (!showConnections) return null;

    const connections = [];

    // Show all possible connections (faded)
    if (selectedPlaces.length > 1) {
      for (let i = 0; i < selectedPlaces.length; i++) {
        for (let j = i + 1; j < selectedPlaces.length; j++) {
          const from = nodePositions.get(selectedPlaces[i].id);
          const to = nodePositions.get(selectedPlaces[j].id);
          
          if (from && to) {
            connections.push(
              <line
                key={`connection-${from.id}-${to.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="5,5"
                opacity="0.3"
              />
            );
          }
        }
      }
    }

    // Show optimized route (highlighted)
    if (optimizedRoute && optimizedRoute.length > 1) {
      for (let i = 0; i < optimizedRoute.length - 1; i++) {
        const from = nodePositions.get(optimizedRoute[i].id);
        const to = nodePositions.get(optimizedRoute[i + 1].id);
        
        if (from && to) {
          const routeIndex = i + 1;
          const isAnimated = animationProgress * optimizedRoute.length >= routeIndex;
          
          connections.push(
            <g key={`route-${from.id}-${to.id}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#dc2626"
                strokeWidth="3"
                opacity={isAnimated ? "1" : "0.3"}
                markerEnd="url(#arrowhead)"
              />
              {isAnimated && (
                <circle
                  cx={from.x + (to.x - from.x) * 0.5}
                  cy={from.y + (to.y - from.y) * 0.5}
                  r="3"
                  fill="#dc2626"
                  className="animate-pulse"
                />
              )}
            </g>
          );
        }
      }
    }

    return connections;
  };

  // Render nodes
  const renderNodes = () => {
    return Array.from(nodePositions.values()).map(nodeData => {
      const { place, x, y } = nodeData;
      const isSelected = selectedPlaces.some(p => p.id === place.id);
      const routeIndex = optimizedRoute?.findIndex(p => p.id === place.id);
      const isInRoute = routeIndex >= 0;
      const isAnimationActive = isAnimating && animationProgress * optimizedRoute?.length > routeIndex;
      const isHovered = hoveredNode?.id === place.id;
      
      const categoryInfo = categoryConfig[place.category] || categoryConfig.temple;
      const { radius, fontSize } = nodeSizes[nodeSize];

      let nodeColor = categoryInfo.color;
      if (isSelected && !isInRoute) nodeColor = '#3b82f6';
      if (isInRoute) nodeColor = '#dc2626';

      return (
        <g
          key={place.id}
          transform={`translate(${x}, ${y})`}
          className="cursor-pointer transition-all duration-200"
          onClick={() => handleNodeClick(place)}
          onMouseEnter={() => handleNodeHover(place)}
          onMouseLeave={handleNodeLeave}
        >
          {/* Node background */}
          <circle
            r={radius + (isHovered ? 4 : 0)}
            fill={nodeColor}
            stroke={isSelected || isInRoute ? '#1f2937' : '#ffffff'}
            strokeWidth={isSelected || isInRoute ? 3 : 2}
            opacity={isSelected || isInRoute ? 1 : 0.8}
            className={`transition-all duration-200 ${isAnimationActive ? 'animate-pulse' : ''}`}
          />
          
          {/* Route number */}
          {isInRoute && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={fontSize + 2}
              fontWeight="bold"
            >
              {routeIndex + 1}
            </text>
          )}
          
          {/* Category icon */}
          {!isInRoute && (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
            >
              {categoryInfo.icon}
            </text>
          )}

          {/* Place name label */}
          {showLabels && (
            <text
              y={radius + 20}
              textAnchor="middle"
              fill="#1f2937"
              fontSize={fontSize - 1}
              fontWeight="600"
              className="pointer-events-none"
            >
              {place.name.length > 15 ? place.name.substring(0, 15) + '...' : place.name}
            </text>
          )}

          {/* Hover tooltip */}
          {isHovered && (
            <g>
              <rect
                x={-80}
                y={-radius - 80}
                width="160"
                height="60"
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="1"
                rx="8"
                className="drop-shadow-lg"
              />
              <text x="0" y={-radius - 55} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1f2937">
                {place.name}
              </text>
              <text x="0" y={-radius - 40} textAnchor="middle" fontSize="10" fill="#6b7280">
                {place.city}, {place.state}
              </text>
              <text x="0" y={-radius - 25} textAnchor="middle" fontSize="10" fill="#6b7280">
                ⭐ {place.rating} • 🕐 {Math.round(place.averageVisitDuration / 60)}h
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-lg ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
        <div className="bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <select
            value={selectedLayout}
            onChange={(e) => setSelectedLayout(e.target.value)}
            className="text-sm border rounded px-2 py-1"
            title="Layout"
          >
            <option value="circular">Circular</option>
            <option value="geographic">Geographic</option>
            <option value="force">Force-Directed</option>
            <option value="category">By Category</option>
          </select>

          <select
            value={nodeSize}
            onChange={(e) => setNodeSize(e.target.value)}
            className="text-sm border rounded px-2 py-1"
            title="Node Size"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded-lg transition-colors ${showLabels ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Toggle Labels"
          >
            <Info size={16} />
          </button>

          <button
            onClick={() => setShowConnections(!showConnections)}
            className={`p-2 rounded-lg transition-colors ${showConnections ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            title="Toggle Connections"
          >
            <Route size={16} />
          </button>
        </div>

        {optimizedRoute && optimizedRoute.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
            <button
              onClick={toggleAnimation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isAnimating ? 'Pause Animation' : 'Play Animation'}
            >
              {isAnimating ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={resetAnimation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset Animation"
            >
              <RotateCcw size={16} />
            </button>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="w-16"
              title="Animation Speed"
            />
            <span className="text-xs text-gray-600">{animationSpeed}x</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 max-w-xs">
        <h4 className="font-semibold text-sm text-gray-900 mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = places.filter(p => p.category === key).length;
            if (count === 0) return null;
            return (
              <div key={key} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: config.color }}
                >
                  {config.icon}
                </div>
                <span>{config.label} ({count})</span>
              </div>
            );
          })}
        </div>
        
        {selectedPlaces.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full bg-blue-600"></div>
              <span>Selected ({selectedPlaces.length})</span>
            </div>
            {optimizedRoute && optimizedRoute.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <span>Route Order</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      {selectedPlaces.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Trip Stats</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{selectedPlaces.length} places</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{Math.round(selectedPlaces.reduce((sum, p) => sum + p.averageVisitDuration, 0) / 60)}h visit</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign size={12} />
              <span>₹{selectedPlaces.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={12} />
              <span>{(selectedPlaces.reduce((sum, p) => sum + p.rating, 0) / selectedPlaces.length).toFixed(1)}/5</span>
            </div>
          </div>
        </div>
      )}

      {/* Main SVG */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#dc2626"
            />
          </marker>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {renderConnections()}
        {renderNodes()}

        {/* Animation progress indicator */}
        {isAnimating && optimizedRoute && optimizedRoute.length > 1 && (
          <g>
            <rect
              x={dimensions.width - 200}
              y={20}
              width={180}
              height={8}
              fill="#e5e7eb"
              rx={4}
            />
            <rect
              x={dimensions.width - 200}
              y={20}
              width={180 * animationProgress}
              height={8}
              fill="#dc2626"
              rx={4}
            />
            <text
              x={dimensions.width - 110}
              y={45}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
            >
              Progress: {Math.round(animationProgress * 100)}%
            </text>
          </g>
        )}

        {/* No data message */}
        {places.length === 0 && (
          <g>
            <rect
              x={dimensions.width / 2 - 150}
              y={dimensions.height / 2 - 40}
              width="300"
              height="80"
              fill="white"
              stroke="#e5e7eb"
              rx="8"
              className="drop-shadow-lg"
            />
            <text
              x={dimensions.width / 2}
              y={dimensions.height / 2 - 10}
              textAnchor="middle"
              fontSize="16"
              fontWeight="600"
              fill="#374151"
            >
              No places to display
            </text>
            <text
              x={dimensions.width / 2}
              y={dimensions.height / 2 + 15}
              textAnchor="middle"
              fontSize="14"
              fill="#6b7280"
            >
              Add some places to see the interactive graph
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default InteractiveGraphVisualization;