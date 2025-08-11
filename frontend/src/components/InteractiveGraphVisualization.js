import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { apiService } from "../services/api"; // your api methods imported

const InteractiveGraphNetworkVisualization = () => {
  const svgRef = useRef();

  const [dimensions] = useState({ width: 1000, height: 600 });

  // All places loaded from backend
  const [allPlaces, setAllPlaces] = useState([]);
  // Currently selected place objects
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  // Nodes and links for visualization, detected from optimized route from backend
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  // Backend itinerary plan for detailed display
  const [itinerary, setItinerary] = useState(null);
  // Visited places tracker
  const [visitedIds, setVisitedIds] = useState(new Set());
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Category config for colors and icons
  const categoryConfig = {
    temple: { color: "#f59e0b", icon: "🛕" },
    palace: { color: "#8b5cf6", icon: "🏰" },
    "hill-station": { color: "#10b981", icon: "⛰️" },
    beach: { color: "#06b6d4", icon: "🏖️" },
    heritage: { color: "#f97316", icon: "🏛️" },
    nature: { color: "#22c55e", icon: "🌿" },
  };
  const nodeSize = { radius: 22, fontSize: 12 };

  // 1️⃣ Load all places from backend once on mount
  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      try {
        const response = await apiService.getAllPlaces();
        if (response.success !== false) { // depending on your backend response shape
          setAllPlaces(response);
          // Default: select first 4 places initially
          setSelectedPlaces(response.slice(0, 4));
        } else {
          setError("Failed to load places");
        }
      } catch (err) {
        console.error("Error loading places", err);
        setError("Error loading places");
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  // 2️⃣ When selectedPlaces changes, fetch optimized trip from backend
  const fetchOptimizedTrip = useCallback(
    async (placesForTrip) => {
      if (!placesForTrip || placesForTrip.length < 2) {
        setNodes(placesForTrip.map(p => ({ ...p, x: dimensions.width / 2, y: dimensions.height / 2 })));
        setLinks([]);
        setItinerary(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const placeIds = placesForTrip.map(p => p.id);
        const response = await apiService.generateTrip({
          placeIds,
          budget: 2000,
          timeConstraints: { maxDuration: 480 },
        });
        if (!response.success) {
          setError(response.message || "Failed to fetch trip");
          setNodes([]);
          setLinks([]);
          setItinerary(null);
          return;
        }

        const route = response.data.route || [];
        const itin = response.data.itinerary || null;

        const newNodes = route.map(p => ({
          ...p,
          id: p.id.toString(),
          name: p.name,
        }));

        const newLinks = [];
        for (let i = 0; i < newNodes.length - 1; i++) {
          newLinks.push({
            source: newNodes[i].id,
            target: newNodes[i + 1].id,
          });
        }

        setNodes(newNodes);
        setLinks(newLinks);
        setItinerary(itin);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error fetching optimized trip");
        setNodes([]);
        setLinks([]);
        setItinerary(null);
      } finally {
        setLoading(false);
      }
    }, [dimensions.width, dimensions.height]
  );

  // Fetch optimized trip whenever selectedPlaces changes
  useEffect(() => {
    if (selectedPlaces.length > 0) {
      fetchOptimizedTrip(selectedPlaces);
    } else {
      setNodes([]);
      setLinks([]);
      setItinerary(null);
    }
  }, [selectedPlaces, fetchOptimizedTrip]);

  // 3️⃣ D3 force simulation handling node/link positioning
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide().radius(nodeSize.radius + 6))
      .on("tick", () => setNodes([...nodes]));

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
    svg.selectAll("circle")
      .data(nodes, d => d.id)
      .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded));

    return () => simulation.stop();
  }, [nodes, links, dimensions.width, dimensions.height]);

  // Toggle visited places check for checklist
  const toggleVisited = (id) => {
    const newSet = new Set(visitedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisitedIds(newSet);
  };

  // Toggle place selection from full list
  const toggleSelectPlace = (place) => {
    const exists = selectedPlaces.find(p => p.id === place.id);
    if (exists) {
      setSelectedPlaces(selectedPlaces.filter(p => p.id !== place.id));
      // Optionally reset visited for that place
      setVisitedIds(prev => {
        const newV = new Set(prev);
        newV.delete(place.id);
        return newV;
      });
    } else {
      setSelectedPlaces([...selectedPlaces, place]);
    }
  };

  // Render the legend UI for category colors
  const renderLegend = () => (
    <div style={{
      position: "absolute", bottom: 10, right: 10,
      background: "white", padding: "8px", borderRadius: 6,
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    }}>
      <b>Legend</b>
      {Object.entries(categoryConfig).map(([key, val]) => (
        <div key={key}>
          <span style={{
            display: "inline-block", width: 14, height: 14,
            background: val.color, marginRight: 4, borderRadius: "50%"
          }}></span>
          {val.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
      {/* Error & Loading display */}
      {loading && <div>Loading trip...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}

      <div style={{ display: "flex", gap: "1rem" }}>
        {/* LEFT PANEL: Place selection list */}
        <div style={{ width: 250, background: "#f9f9f9", padding: 10, borderRadius: 6, height: 600, overflowY: "auto" }}>
          <h3>Available Places</h3>
          {allPlaces.length === 0 && <p>No places found.</p>}
          {allPlaces.map(place => {
            const isSelected = !!selectedPlaces.find(p => p.id === place.id);
            return (
              <div key={place.id} style={{ marginBottom: 8 }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectPlace(place)}
                  />{" "}
                  {place.name} ({place.category})
                </label>
              </div>
            );
          })}
          <small>Select one or more places to generate optimized trip route.</small>
        </div>

        {/* CENTER PANEL: Graph visualization */}
        <div style={{ flex: 1, position: "relative" }}>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ background: "linear-gradient(to bottom right, #e0f2fe, #ede9fe)", borderRadius: 6 }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626" />
              </marker>
            </defs>

            {/* Links */}
            {links.map((l, i) => {
              const src = nodes.find(n => n.id === (typeof l.source === "object" ? l.source.id : l.source));
              const tgt = nodes.find(n => n.id === (typeof l.target === "object" ? l.target.id : l.target));
              if (!src || !tgt) return null;
              return (
                <line
                  key={i}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#dc2626"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const color = categoryConfig[node.category]?.color || "#6b7280";
              const isVisited = visitedIds.has(node.id);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleVisited(node.id)}
                  onMouseEnter={() => {/* can set hovered node for tooltip */}}
                  onMouseLeave={() => {/* clear hovered node tooltip */}}
                >
                  <circle
                    r={nodeSize.radius}
                    fill={isVisited ? "#22c55e" : color}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    y={nodeSize.radius + 12}
                    textAnchor="middle"
                    fontSize={nodeSize.fontSize}
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>
          {renderLegend()}
        </div>

        {/* RIGHT PANEL: Detailed itinerary + Checklist */}
        <div style={{ width: 350, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Detailed Itinerary */}
          <div style={{ background: "white", padding: 16, borderRadius: 6, height: "50%", overflowY: "auto" }}>
            <h3>Detailed Itinerary</h3>
            {!itinerary && <p>No itinerary to show.</p>}
            {itinerary && itinerary.schedule.map((stop, idx) => (
              <div key={stop.place.id} style={{ borderBottom: "1px solid #ccc", marginBottom: 8 }}>
                <b>{idx + 1}. {stop.place.name}</b> ({stop.place.category})<br />
                Arrival: {stop.timing.arrivalTime}, Departure: {stop.timing.departureTime}<br />
                Duration: {Math.round(stop.timing.visitDuration / 60)}h, Fee: ₹{stop.logistics.entryFee || "Free"}
              </div>
            ))}
          </div>

          {/* Checklist */}
          <div style={{ background: "white", padding: 16, borderRadius: 6, height: "50%", overflowY: "auto" }}>
            <h3>Visit Checklist</h3>
            {nodes.length === 0 && <p>No places selected.</p>}
            {nodes.map(p => {
              const isVisited = visitedIds.has(p.id);
              return (
                <div key={p.id}>
                  <input
                    type="checkbox"
                    checked={isVisited}
                    onChange={() => toggleVisited(p.id)}
                    id={`check-${p.id}`}
                  />
                  {" "}
                  <label htmlFor={`check-${p.id}`} style={isVisited ? { textDecoration: 'line-through', color: 'gray' } : {}}>
                    {p.name} ({p.category})
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveGraphNetworkVisualization;
