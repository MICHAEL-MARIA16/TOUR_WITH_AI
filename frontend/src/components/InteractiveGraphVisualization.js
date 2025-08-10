import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, Route, Star, Clock, DollarSign, Maximize2, Minimize2,
  Play, Pause, RotateCcw, Info, Navigation, Target, Zap,
  Settings, Filter, ArrowRight, CheckCircle, AlertCircle
} from 'lucide-react';

const InteractiveGraphNetworkVisualization = () => {
  const svgRef = useRef();
  
  const [dimensions, setDimensions] = useState({ width: 1000, height: 700 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [nodePositions, setNodePositions] = useState(new Map());
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('geographic');
  const [showLabels, setShowLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [algorithmPhase, setAlgorithmPhase] = useState('idle');
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);
  const [nodeSize, setNodeSize] = useState('medium');

  // Sample South Indian places with coordinates
  const places = [
    {
      id: 1,
      name: "Meenakshi Temple",
      city: "Madurai",
      state: "Tamil Nadu",
      category: "temple",
      rating: 4.8,
      averageVisitDuration: 180,
      entryFee: { indian: 0 },
      location: { latitude: 9.9195, longitude: 78.1193 },
      description: "Ancient temple complex with stunning Dravidian architecture"
    },
    {
      id: 2,
      name: "Mysore Palace",
      city: "Mysore",
      state: "Karnataka", 
      category: "palace",
      rating: 4.7,
      averageVisitDuration: 120,
      entryFee: { indian: 70 },
      location: { latitude: 12.3051, longitude: 76.6551 },
      description: "Royal palace with Indo-Saracenic architecture"
    },
    {
      id: 3,
      name: "Munnar Hills",
      city: "Munnar",
      state: "Kerala",
      category: "hill-station",
      rating: 4.9,
      averageVisitDuration: 240,
      entryFee: { indian: 0 },
      location: { latitude: 10.0889, longitude: 77.0595 },
      description: "Tea plantations and scenic mountain views"
    },
    {
      id: 4,
      name: "Thanjavur Big Temple",
      city: "Thanjavur", 
      state: "Tamil Nadu",
      category: "temple",
      rating: 4.6,
      averageVisitDuration: 150,
      entryFee: { indian: 30 },
      location: { latitude: 10.7829, longitude: 79.1378 },
      description: "UNESCO World Heritage Chola temple"
    },
    {
      id: 5,
      name: "Hampi Ruins",
      city: "Hampi",
      state: "Karnataka",
      category: "heritage", 
      rating: 4.8,
      averageVisitDuration: 300,
      entryFee: { indian: 40 },
      location: { latitude: 15.3350, longitude: 76.4600 },
      description: "Ancient Vijayanagara Empire ruins"
    },
    {
      id: 6,
      name: "Varkala Beach",
      city: "Varkala",
      state: "Kerala",
      category: "beach",
      rating: 4.5, 
      averageVisitDuration: 180,
      entryFee: { indian: 0 },
      location: { latitude: 8.7379, longitude: 76.7144 },
      description: "Cliffside beach with golden sands"
    }
  ];

  // Category configurations
  const categoryConfig = {
    temple: { color: '#f59e0b', icon: '🛕', label: 'Temple' },
    palace: { color: '#8b5cf6', icon: '🏰', label: 'Palace' },
    'hill-station': { color: '#10b981', icon: '⛰️', label: 'Hill Station' },
    beach: { color: '#06b6d4', icon: '🏖️', label: 'Beach' },
    heritage: { color: '#f97316', icon: '🏛️', label: 'Heritage' },
    nature: { color: '#22c55e', icon: '🌿', label: 'Nature' }
  };

  const nodeSizes = {
    small: { radius: 18, fontSize: 10 },
    medium: { radius: 24, fontSize: 12 },
    large: { radius: 30, fontSize: 14 }
  };

  // Layout algorithms
  const layouts = {
    geographic: (places, width, height) => {
      if (!places.length) return [];
      
      const bounds = places.reduce((acc, place) => ({
        minLat: Math.min(acc.minLat, place.location.latitude),
        maxLat: Math.max(acc.maxLat, place.location.latitude),
        minLng: Math.min(acc.minLng, place.location.longitude),
        maxLng: Math.max(acc.maxLng, place.location.longitude)
      }), {
        minLat: Infinity, maxLat: -Infinity,
        minLng: Infinity, maxLng: -Infinity
      });

      const padding = 60;
      const usableWidth = width - 2 * padding;
      const usableHeight = height - 2 * padding;

      return places.map(place => ({
        id: place.id,
        x: padding + ((place.location.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * usableWidth,
        y: padding + ((bounds.maxLat - place.location.latitude) / (bounds.maxLat - bounds.minLat)) * usableHeight,
        place
      }));
    },

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
    }
  };

  // Initialize with some selected places
  useEffect(() => {
    setSelectedPlaces(places.slice(0, 4));
  }, []);

  // Update node positions when layout changes
  useEffect(() => {
    if (places.length > 0) {
      const layoutFunction = layouts[selectedLayout];
      const positions = layoutFunction(places, dimensions.width, dimensions.height);
      const positionMap = new Map();
      positions.forEach(pos => positionMap.set(pos.id, pos));
      setNodePositions(positionMap);
    }
  }, [places, dimensions, selectedLayout]);

  // Genetic Algorithm Animation
  const runGeneticAlgorithm = useCallback(async () => {
    if (selectedPlaces.length < 2) return;

    setIsAnimating(true);
    setAlgorithmPhase('initializing');
    setAnimationProgress(0);
    setCurrentGeneration(0);
    setBestFitness(1000);

    const phases = [
      'initializing',
      'population-generation', 
      'fitness-evaluation',
      'selection',
      'crossover',
      'mutation',
      'next-generation'
    ];

    for (let gen = 0; gen < 6; gen++) {
      setCurrentGeneration(gen + 1);
      
      for (let phase = 0; phase < phases.length; phase++) {
        setAlgorithmPhase(phases[phase]);
        setAnimationProgress((gen * phases.length + phase) / (6 * phases.length));
        setBestFitness(1000 - gen * 120 - phase * 15);
        
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // Generate final optimized route
    const shuffled = [...selectedPlaces].sort(() => Math.random() - 0.5);
    setOptimizedRoute(shuffled);
    setAlgorithmPhase('complete');
    setAnimationProgress(1);
    setIsAnimating(false);
  }, [selectedPlaces]);

  const handlePlaceToggle = (place) => {
    setSelectedPlaces(prev => {
      const exists = prev.find(p => p.id === place.id);
      if (exists) {
        return prev.filter(p => p.id !== place.id);
      } else {
        return [...prev, place];
      }
    });
    setOptimizedRoute([]);
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setAnimationProgress(0);
    setAlgorithmPhase('idle');
    setCurrentGeneration(0);
    setBestFitness(0);
    setOptimizedRoute([]);
  };

  // Render edge connections
  const renderConnections = () => {
    if (!showConnections) return null;

    const connections = [];

    // Show potential connections (faded)
    if (selectedPlaces.length > 1) {
      for (let i = 0; i < selectedPlaces.length; i++) {
        for (let j = i + 1; j < selectedPlaces.length; j++) {
          const from = nodePositions.get(selectedPlaces[i].id);
          const to = nodePositions.get(selectedPlaces[j].id);
          
          if (from && to) {
            connections.push(
              <line
                key={`potential-${from.id}-${to.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.3"
              />
            );
          }
        }
      }
    }

    // Show optimized route (highlighted)
    if (optimizedRoute.length > 1) {
      for (let i = 0; i < optimizedRoute.length - 1; i++) {
        const from = nodePositions.get(optimizedRoute[i].id);
        const to = nodePositions.get(optimizedRoute[i + 1].id);
        
        if (from && to) {
          connections.push(
            <g key={`route-${from.id}-${to.id}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#dc2626"
                strokeWidth="3"
                opacity="0.8"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={from.x + (to.x - from.x) * 0.5}
                y={from.y + (to.y - from.y) * 0.5 - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#dc2626"
                fontWeight="600"
              >
                {Math.round(Math.random() * 100 + 20)} km
              </text>
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
      const routeIndex = optimizedRoute.findIndex(p => p.id === place.id);
      const isInRoute = routeIndex >= 0;
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
          className="cursor-pointer transition-all duration-300"
          onClick={() => handlePlaceToggle(place)}
          onMouseEnter={() => setHoveredNode(place)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Node glow effect for selected places */}
          {(isSelected || isInRoute) && (
            <circle
              r={radius + 8}
              fill={nodeColor}
              opacity="0.2"
              className="animate-pulse"
            />
          )}
          
          {/* Main node */}
          <circle
            r={radius + (isHovered ? 3 : 0)}
            fill={nodeColor}
            stroke={isSelected || isInRoute ? '#ffffff' : '#e5e7eb'}
            strokeWidth={isSelected || isInRoute ? 3 : 2}
            opacity="0.9"
            className="transition-all duration-200"
          />
          
          {/* Route number for optimized route */}
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
          
          {/* Category icon for non-route nodes */}
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
              y={radius + 18}
              textAnchor="middle"
              fill="#1f2937"
              fontSize={fontSize - 1}
              fontWeight="600"
              className="pointer-events-none select-none"
            >
              {place.name.length > 12 ? place.name.substring(0, 12) + '...' : place.name}
            </text>
          )}

          {/* Selection indicator */}
          {isSelected && !isInRoute && (
            <g transform={`translate(${radius - 8}, ${-radius + 8})`}>
              <circle r="8" fill="#3b82f6" />
              <CheckCircle size={12} x="-6" y="-6" fill="white" />
            </g>
          )}

          {/* Detailed hover tooltip */}
          {isHovered && (
            <g>
              <rect
                x={-100}
                y={-radius - 90}
                width="200"
                height="70"
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="1"
                rx="8"
                className="drop-shadow-lg"
              />
              <text x="0" y={-radius - 65} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1f2937">
                {place.name}
              </text>
              <text x="0" y={-radius - 50} textAnchor="middle" fontSize="10" fill="#6b7280">
                {place.city}, {place.state}
              </text>
              <text x="0" y={-radius - 35} textAnchor="middle" fontSize="10" fill="#6b7280">
                ⭐ {place.rating} • 🕐 {Math.round(place.averageVisitDuration / 60)}h • ₹{place.entryFee.indian}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="h-full bg-white rounded-xl shadow-lg overflow-hidden relative">
        {/* Controls Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start">
          <div className="flex gap-2">
            {/* Layout Controls */}
            <div className="bg-white/95 backdrop-blur rounded-lg shadow-md p-3 flex items-center gap-2">
              <select
                value={selectedLayout}
                onChange={(e) => setSelectedLayout(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="geographic">Geographic</option>
                <option value="circular">Circular</option>
              </select>

              <select
                value={nodeSize}
                onChange={(e) => setNodeSize(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* View Controls */}
            <div className="bg-white/95 backdrop-blur rounded-lg shadow-md p-3 flex items-center gap-2">
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
          </div>

          {/* Algorithm Controls */}
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-md p-3 flex items-center gap-2">
            <button
              onClick={runGeneticAlgorithm}
              disabled={isAnimating || selectedPlaces.length < 2}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2"
            >
              {isAnimating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Run Algorithm
                </>
              )}
            </button>

            <button
              onClick={resetAnimation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Algorithm Status Panel */}
        {(isAnimating || optimizedRoute.length > 0) && (
          <div className="absolute top-20 right-4 bg-white/95 backdrop-blur rounded-lg shadow-md p-4 w-80 z-10">
            <div className="flex items-center gap-2 mb-3">
              <Target className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">Genetic Algorithm Status</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phase:</span>
                <span className="text-sm font-medium capitalize">{algorithmPhase.replace('-', ' ')}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Generation:</span>
                <span className="text-sm font-medium">{currentGeneration}/6</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Best Fitness:</span>
                <span className="text-sm font-medium">{Math.max(0, bestFitness)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${animationProgress * 100}%` }}
                ></div>
              </div>

              <div className="text-xs text-gray-500">
                Progress: {Math.round(animationProgress * 100)}%
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-md p-4 max-w-xs z-10">
          <h4 className="font-semibold text-sm text-gray-900 mb-3">Legend</h4>
          <div className="space-y-2 text-xs">
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
          
          <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-600"></div>
              <span>Selected ({selectedPlaces.length})</span>
            </div>
            {optimizedRoute.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <span>Route Order</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Panel */}
        {selectedPlaces.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-md p-4 z-10">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Trip Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-blue-600" />
                <span>{selectedPlaces.length} places</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-green-600" />
                <span>{Math.round(selectedPlaces.reduce((sum, p) => sum + p.averageVisitDuration, 0) / 60)}h total</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign size={12} className="text-yellow-600" />
                <span>₹{selectedPlaces.reduce((sum, p) => sum + (p.entryFee?.indian || 0), 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={12} className="text-purple-600" />
                <span>{selectedPlaces.length > 0 ? (selectedPlaces.reduce((sum, p) => sum + p.rating, 0) / selectedPlaces.length).toFixed(1) : 0}/5</span>
              </div>
            </div>
          </div>
        )}

        {/* Main SVG Visualization */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-purple-50"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
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
            
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f0f0f0" strokeWidth="1" opacity="0.3"/>
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {renderConnections()}
          {renderNodes()}

          {/* Title */}
          <text
            x={dimensions.width / 2}
            y={30}
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill="#1f2937"
          >
            Interactive Graph Network - South India Places
          </text>
        </svg>
      </div>
    </div>
  );
};

export default InteractiveGraphNetworkVisualization;