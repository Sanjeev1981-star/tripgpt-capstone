const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * RAG Service for fetching and managing travel knowledge from Wikivoyage
 */

const CACHE_DIR = path.join(__dirname, '../data/wikivoyage_cache');

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir() {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (err) {
        console.error('Failed to create cache directory:', err);
    }
}

/**
 * Fetch Wikivoyage article for a city
 * @param {string} city - City name
 * @returns {Promise<Object>} - Article data with sections
 */
async function fetchWikivoyageArticle(city) {
    try {
        await ensureCacheDir();

        // Check cache first
        const cacheFile = path.join(CACHE_DIR, `${city.toLowerCase().replace(/\s/g, '_')}.json`);
        try {
            const cached = await fs.readFile(cacheFile, 'utf-8');
            const data = JSON.parse(cached);
            console.log(`✓ Loaded ${city} from cache`);
            return data;
        } catch (e) {
            // Cache miss, fetch from API
        }

        // Fetch from Wikivoyage API with proper headers
        const url = `https://en.wikivoyage.org/w/api.php`;
        const params = {
            action: 'query',
            format: 'json',
            titles: city,
            prop: 'extracts|info',
            explaintext: true,
            exsectionformat: 'plain',
            inprop: 'url',
            origin: '*'  // Required for CORS
        };

        const response = await axios.get(url, {
            params,
            headers: {
                'User-Agent': 'TripGPT/1.0 (Educational Project; contact@example.com)',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const pages = response.data.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === '-1') {
            console.log(`No Wikivoyage article found for ${city}`);
            return null;
        }

        const page = pages[pageId];
        const extract = page.extract || '';

        // Parse sections (simple approach - split by common headers)
        const sections = parseArticleIntoSections(extract, city);

        const articleData = {
            city: city,
            title: page.title,
            url: page.fullurl || `https://en.wikivoyage.org/wiki/${encodeURIComponent(city)}`,
            sections: sections,
            fetchedAt: new Date().toISOString()
        };

        // Cache the result
        await fs.writeFile(cacheFile, JSON.stringify(articleData, null, 2));
        console.log(`✓ Fetched and cached ${city} from Wikivoyage`);

        return articleData;

    } catch (error) {
        console.error(`Error fetching Wikivoyage for ${city}:`, error.message);
        return null;
    }
}

/**
 * Parse article text into structured sections
 * @param {string} text - Full article text
 * @param {string} city - City name
 * @returns {Array} - Array of section objects
 */
function parseArticleIntoSections(text, city) {
    const sections = [];

    // Split by common section headers
    const lines = text.split('\n');
    let currentSection = { title: 'Overview', content: '' };

    for (const line of lines) {
        // Detect section headers (usually start with ==)
        if (line.trim().startsWith('==') || line.trim().match(/^[A-Z][a-z]+$/)) {
            // Save previous section if it has content
            if (currentSection.content.trim()) {
                sections.push({ ...currentSection });
            }
            // Start new section
            const title = line.replace(/=/g, '').trim();
            currentSection = { title, content: '' };
        } else {
            currentSection.content += line + '\n';
        }
    }

    // Add last section
    if (currentSection.content.trim()) {
        sections.push(currentSection);
    }

    // If no sections found, create a single overview section
    if (sections.length === 0) {
        sections.push({
            title: 'Overview',
            content: text.substring(0, 1500) // First 1500 chars
        });
    }

    return sections;
}

/**
 * Search for relevant information in cached articles
 * @param {string} city - City name
 * @param {string} query - Search query (e.g., "safety", "food", "weather")
 * @returns {Promise<Array>} - Relevant sections with citations
 */
async function searchCityKnowledge(city, query = '') {
    try {
        const article = await fetchWikivoyageArticle(city);
        if (!article) {
            return [];
        }

        const queryLower = query.toLowerCase();
        const keywords = queryLower.split(' ').filter(w => w.length > 3);

        // Score sections based on relevance
        const scoredSections = article.sections.map(section => {
            let score = 0;
            const sectionText = (section.title + ' ' + section.content).toLowerCase();

            // Check for query keywords
            keywords.forEach(keyword => {
                const count = (sectionText.match(new RegExp(keyword, 'g')) || []).length;
                score += count * 10;
            });

            // Boost certain section titles
            const relevantTitles = ['see', 'do', 'eat', 'drink', 'sleep', 'safety', 'get around', 'understand', 'climate', 'stay safe'];
            if (relevantTitles.some(title => section.title.toLowerCase().includes(title))) {
                score += 20;
            }

            return {
                ...section,
                score,
                source: article.title,
                url: article.url
            };
        });

        // Sort by score and return top results
        return scoredSections
            .filter(s => s.score > 0 || query === '') // If no query, return all
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(s => ({
                title: s.title,
                content: s.content.substring(0, 500).trim() + (s.content.length > 500 ? '...' : ''),
                source: `Wikivoyage: ${s.source}`,
                url: s.url,
                relevance: s.score
            }));

    } catch (error) {
        console.error('Error searching city knowledge:', error);
        return [];
    }
}

/**
 * Get travel tips for a city (safety, etiquette, practical info)
 * @param {string} city - City name
 * @returns {Promise<Object>} - Structured travel tips with citations
 */
async function getCityTravelTips(city) {
    try {
        const article = await fetchWikivoyageArticle(city);
        if (!article) {
            return {
                safety: null,
                etiquette: null,
                practical: null,
                source: null
            };
        }

        const tips = {
            safety: findSectionContent(article.sections, ['safety', 'stay safe', 'cope']),
            etiquette: findSectionContent(article.sections, ['respect', 'etiquette', 'customs']),
            practical: findSectionContent(article.sections, ['get around', 'understand', 'talk']),
            climate: findSectionContent(article.sections, ['climate', 'weather']),
            source: `Wikivoyage: ${article.title}`,
            url: article.url
        };

        return tips;

    } catch (error) {
        console.error('Error getting travel tips:', error);
        return { safety: null, etiquette: null, practical: null, source: null };
    }
}

/**
 * Find section content by matching keywords
 */
function findSectionContent(sections, keywords) {
    for (const section of sections) {
        const titleLower = section.title.toLowerCase();
        if (keywords.some(kw => titleLower.includes(kw))) {
            return section.content.substring(0, 300).trim() + '...';
        }
    }
    return null;
}

module.exports = {
    fetchWikivoyageArticle,
    searchCityKnowledge,
    getCityTravelTips
};
