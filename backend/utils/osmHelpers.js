// backend/utils/osmHelpers.js

/**
 * OpenStreetMap Helper Utilities
 * Provides server-side utilities for working with OSM data and APIs
 */

const axios = require('axios');

class OSMHelpers {
  constructor() {
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    this.overpassBaseUrl = 'https://overpass-api.de/api/interpreter';
    this.requestDelay = 1000; // 1 second between requests (respect rate limits)
    this.lastRequest = 0;
  }

  /**
   * Geocode address to coordinates using Nominatim
   */
  async geocodeAddress(address, options = {}) {
    await this.respectRateLimit();

    try {
      const params = {
        q: address,
        format: 'json',
        limit: options.limit || 1,
        countrycodes: options.countrycodes || 'in', // Restrict to India
        addressdetails: 1,
        extratags: 1,
        namedetails: 1
      };

      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params,
        headers: {
          'User-Agent': 'TourWithAI/1.0 (travel planning app)'
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        return response.data.map(result => ({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
          type: result.type,
          importance: result.importance,
          address: result.address,
          boundingBox: result.boundingbox ? [
            parseFloat(result.boundingbox[0]), // south
            parseFloat(result.boundingbox[1]), // north
            parseFloat(result.boundingbox[2]), // west
            parseFloat(result.boundingbox[3])  // east
          ] : null
        }));
      }

      return [];
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude, options = {}) {
    await this.respectRateLimit();

    try {
      const params = {
        lat: latitude,
        lon: longitude,
        format: 'json',
        zoom: options.zoom || 18,
        addressdetails: 1,
        extratags: 1
      };

      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params,
        headers: {
          'User-Agent': 'TourWithAI/1.0 (travel planning app)'
        },
        timeout: 10000
      });

      if (response.data && response.data.display_name) {
        return {
          displayName: response.data.display_name,
          address: response.data.address,
          type: response.data.type,
          osm_id: response.data.osm_id,
          osm_type: response.data.osm_type,
          licence: response.data.licence
        };
      }

      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Search for places of interest using Overpass API
   */
  async searchPOI(bounds, category, options = {}) {
    await this.respectRateLimit();

    try {
      const overpassQuery = this.buildOverpassQuery(bounds, category, options);
      
      const response = await axios.post(this.overpassBaseUrl, overpassQuery, {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'TourWithAI/1.0 (travel planning app)'
        },
        timeout: 30000
      });

      if (response.data && response.data.elements) {
        return this.parseOverpassResponse(response.data.elements);
      }

      return [];
    } catch (error) {
      console.error('POI search error:', error.message);
      return [];
    }
  }

  /**
   * Build Overpass API query for different categories
   */
  buildOverpassQuery(bounds, category, options = {}) {
    const [south, north, west, east] = bounds;
    const bbox = `${south},${west},${north},${east}`;
    const timeout = options.timeout || 25;
    const maxSize = options.maxSize || 536870912; // 512MB

    let query = `[out:json][timeout:${timeout}][maxsize:${maxSize}];\n(\n`;

    switch (category.toLowerCase()) {
      case 'temple':
        query += `  nwr["amenity"="place_of_worship"]["religion"="hindu"](${bbox});\n`;
        query += `  nwr["amenity"="place_of_worship"]["religion"="buddhist"](${bbox});\n`;
        query += `  nwr["amenity"="place_of_worship"]["religion"="jain"](${bbox});\n`;
        break;
        
      case 'heritage':
      case 'historical':
        query += `  nwr["historic"](${bbox});\n`;
        query += `  nwr["heritage"](${bbox});\n`;
        query += `  nwr["tourism"="attraction"]["historic"](${bbox});\n`;
        break;
        
      case 'nature':
      case 'park':
        query += `  nwr["leisure"="park"](${bbox});\n`;
        query += `  nwr["natural"="forest"](${bbox});\n`;
        query += `  nwr["tourism"="attraction"]["natural"](${bbox});\n`;
        break;
        
      case 'wildlife':
        query += `  nwr["boundary"="national_park"](${bbox});\n`;
        query += `  nwr["boundary"="protected_area"](${bbox});\n`;
        query += `  nwr["leisure"="nature_reserve"](${bbox});\n`;
        break;
        
      case 'beach':
        query += `  nwr["natural"="beach"](${bbox});\n`;
        query += `  nwr["natural"="coastline"](${bbox});\n`;
        break;
        
      case 'fort':
      case 'palace':
        query += `  nwr["historic"="castle"](${bbox});\n`;
        query += `  nwr["historic"="fort"](${bbox});\n`;
        query += `  nwr["historic"="palace"](${bbox});\n`;
        break;
        
      default:
        query += `  nwr["tourism"="attraction"](${bbox});\n`;
        query += `  nwr["tourism"="museum"](${bbox});\n`;
    }

    query += `);\nout center meta;`;
    return query;
  }

  /**
   * Parse Overpass API response
   */
  parseOverpassResponse(elements) {
    return elements.map(element => {
      const tags = element.tags || {};
      const lat = element.lat || (element.center && element.center.lat);
      const lon = element.lon || (element.center && element.center.lon);

      return {
        id: `osm_${element.type}_${element.id}`,
        name: tags.name || tags['name:en'] || 'Unknown',
        type: element.type,
        osm_id: element.id,
        latitude: lat,
        longitude: lon,
        tags: tags,
        category: this.determineCategoryFromTags(tags),
        description: tags.description || tags.tourism || tags.historic || tags.amenity,
        website: tags.website || tags['contact:website'],
        phone: tags.phone || tags['contact:phone'],
        openingHours: tags.opening_hours,
        wikipedia: tags.wikipedia || tags['wikipedia:en'],
        wikidata: tags.wikidata
      };
    }).filter(poi => poi.latitude && poi.longitude);
  }

  /**
   * Determine category from OSM tags
   */
  determineCategoryFromTags(tags) {
    if (tags.amenity === 'place_of_worship') {
      if (['hindu', 'buddhist', 'jain'].includes(tags.religion)) {
        return 'temple';
      }
    }
    
    if (tags.historic) {
      if (['castle', 'fort'].includes(tags.historic)) return 'fort';
      if (tags.historic === 'palace') return 'palace';
      return 'heritage';
    }
    
    if (tags.natural) {
      if (tags.natural === 'beach') return 'beach';
      return 'nature';
    }
    
    if (tags.leisure) {
      if (['park', 'nature_reserve'].includes(tags.leisure)) return 'nature';
    }
    
    if (tags.boundary) {
      if (['national_park', 'protected_area'].includes(tags.boundary)) return 'wildlife';
    }
    
    if (tags.tourism === 'museum') return 'heritage';
    
    return 'attraction';
  }

  /**
   * Get elevation data for coordinates
   */
  async getElevation(latitude, longitude) {
    try {
      // Using OpenElevation API (free alternative)
      const response = await axios.get('https://api.opentopodata.org/v1/srtm90m', {
        params: {
          locations: `${latitude},${longitude}`
        },
        timeout: 10000
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        return {
          elevation: response.data.results[0].elevation,
          dataset: response.data.results[0].dataset
        };
      }

      return null;
    } catch (error) {
      console.warn('Elevation API error:', error.message);
      return null;
    }
  }

  /**
   * Calculate route using OSRM (Open Source Routing Machine)
   */
  async calculateRoute(coordinates, profile = 'driving') {
    try {
      const coordString = coordinates
        .map(coord => `${coord[1]},${coord[0]}`) // OSRM uses lng,lat format
        .join(';');

      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/${profile}/${coordString}`,
        {
          params: {
            overview: 'full',
            geometries: 'geojson',
            steps: true
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        
        return {
          distance: route.distance / 1000, // Convert to km
          duration: route.duration / 60, // Convert to minutes
          geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convert back to lat,lng
          steps: route.legs[0]?.steps || []
        };
      }

      return null;
    } catch (error) {
      console.warn('OSRM routing error:', error.message);
      return null;
    }
  }

  /**
   * Get nearby amenities for a location
   */
  async getNearbyAmenities(latitude, longitude, radius = 1000, amenityTypes = []) {
    const radiusInDegrees = radius / 111320; // Approximate conversion
    const bounds = [
      latitude - radiusInDegrees,  // south
      latitude + radiusInDegrees,  // north
      longitude - radiusInDegrees, // west
      longitude + radiusInDegrees  // east
    ];

    try {
      let query = `[out:json][timeout:25];\n(\n`;
      
      if (amenityTypes.length > 0) {
        amenityTypes.forEach(type => {
          query += `  nwr["amenity"="${type}"](${bounds.join(',')});\n`;
        });
      } else {
        // Common amenities
        const commonAmenities = [
          'restaurant', 'cafe', 'hotel', 'hospital', 'pharmacy', 
          'bank', 'atm', 'fuel', 'parking', 'bus_station'
        ];
        commonAmenities.forEach(type => {
          query += `  nwr["amenity"="${type}"](${bounds.join(',')});\n`;
        });
      }
      
      query += `);\nout center meta;`;

      const response = await axios.post(this.overpassBaseUrl, query, {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'TourWithAI/1.0 (travel planning app)'
        },
        timeout: 30000
      });

      if (response.data && response.data.elements) {
        return this.parseOverpassResponse(response.data.elements);
      }

      return [];
    } catch (error) {
      console.error('Nearby amenities error:', error.message);
      return [];
    }
  }

  /**
   * Validate coordinates are within reasonable bounds
   */
  validateCoordinates(lat, lng) {
    return typeof lat === 'number' && 
           typeof lng === 'number' &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180 &&
           !isNaN(lat) && !isNaN(lng);
  }

  /**
   * Rate limiting to respect OSM API guidelines
   */
  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }

  /**
   * Get map tiles info for different zoom levels
   */
  getTileInfo(latitude, longitude, zoom) {
    const n = Math.pow(2, zoom);
    const latRad = latitude * Math.PI / 180;
    
    const x = Math.floor(n * (longitude + 180) / 360);
    const y = Math.floor(n * (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2);
    
    return { x, y, z: zoom };
  }

  /**
   * Generate tile URLs for different providers
   */
  generateTileUrls(x, y, z, provider = 'osm') {
    const providers = {
      osm: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      osmfr: `https://a.tile.openstreetmap.fr/osmfr/${z}/${x}/${y}.png`,
      opentopo: `https://a.tile.opentopomap.org/${z}/${x}/${y}.png`,
      cartodb: `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`
    };
    
    return providers[provider] || providers.osm;
  }

  /**
   * Calculate bounding box for a center point and radius
   */
  calculateBoundingBox(latitude, longitude, radiusKm) {
    const lat = latitude * Math.PI / 180;
    const lon = longitude * Math.PI / 180;
    const r = radiusKm / 6371; // Earth's radius in km
    
    const latMin = lat - r;
    const latMax = lat + r;
    const deltaLon = Math.asin(Math.sin(r) / Math.cos(lat));
    const lonMin = lon - deltaLon;
    const lonMax = lon + deltaLon;
    
    return {
      south: latMin * 180 / Math.PI,
      north: latMax * 180 / Math.PI,
      west: lonMin * 180 / Math.PI,
      east: lonMax * 180 / Math.PI
    };
  }

  /**
   * Check if OSM APIs are accessible
   */
  async checkAPIStatus() {
    const results = {
      nominatim: false,
      overpass: false,
      osrm: false
    };

    // Test Nominatim
    try {
      const nominatimResponse = await axios.get(`${this.nominatimBaseUrl}/status`, {
        timeout: 5000
      });
      results.nominatim = nominatimResponse.status === 200;
    } catch (error) {
      console.warn('Nominatim API not accessible');
    }

    // Test Overpass
    try {
      const overpassResponse = await axios.get(this.overpassBaseUrl, {
        timeout: 5000
      });
      results.overpass = overpassResponse.status === 200;
    } catch (error) {
      console.warn('Overpass API not accessible');
    }

    // Test OSRM
    try {
      const osrmResponse = await axios.get('https://router.project-osrm.org/health', {
        timeout: 5000
      });
      results.osrm = osrmResponse.status === 200;
    } catch (error) {
      console.warn('OSRM API not accessible');
    }

    return results;
  }
}

module.exports = new OSMHelpers();