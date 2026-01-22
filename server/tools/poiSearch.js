const axios = require('axios');

/**
 * Searches for Points of Interest using OpenStreetMap Overpass API
 * @param {string} city - The city to search in
 * @param {string} category - Category like 'tourism', 'amenity', etc.
 * @param {string} type - Specific type like 'museum', 'restaurant', etc.
 * @returns {Promise<Array>} - List of POIs
 */
async function searchPOIs(city, category = 'tourism', type = 'museum') {
    try {
        // 1. Get City Coordinates first (simple Nominatim search)
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
        const geoRes = await axios.get(geoUrl, {
            headers: { 'User-Agent': 'TravelAIPlanner/1.0' }
        });

        if (!geoRes.data || geoRes.data.length === 0) {
            return [];
        }

        const { lat, lon } = geoRes.data[0];

        // 2. Overpass API query to find POIs around that location (radius 5000m)
        // We look for nodes/ways/relations with the specific key/value
        const overpassQuery = `
      [out:json];
      (
        node[${category}=${type}](around:5000,${lat},${lon});
        way[${category}=${type}](around:5000,${lat},${lon});
        relation[${category}=${type}](around:5000,${lat},${lon});
      );
      out center;
    `;

        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const poiRes = await axios.post(overpassUrl, overpassQuery);

        if (!poiRes.data || !poiRes.data.elements) {
            return [];
        }

        // 3. Format the results
        return poiRes.data.elements.map(el => {
            const name = el.tags?.name || 'Unknown Place';
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            return {
                id: el.id,
                name,
                lat,
                lon,
                tags: el.tags,
                type: type
            };
        }).slice(0, 10); // Limit to top 10

    } catch (error) {
        console.error('Error in searchPOIs:', error.message);
        return [];
    }
}

module.exports = { searchPOIs };
