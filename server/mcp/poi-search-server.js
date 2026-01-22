#!/usr/bin/env node

/**
 * MCP Server for POI Search
 * Provides access to OpenStreetMap POI data via Model Context Protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { searchPOIs } = require('../tools/poiSearch');

// Create MCP server instance
const server = new Server(
    {
        name: 'poi-search-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'search_pois',
                description: 'Search for points of interest in a city using OpenStreetMap data. Returns real, grounded locations with coordinates.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        city: {
                            type: 'string',
                            description: 'The city to search in (e.g., "Paris", "Tokyo", "London")',
                        },
                        category: {
                            type: 'string',
                            description: 'OSM category key (e.g., "tourism", "amenity", "leisure")',
                        },
                        type: {
                            type: 'string',
                            description: 'OSM type value (e.g., "museum", "restaurant", "park", "viewpoint")',
                        },
                    },
                    required: ['city', 'category', 'type'],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'search_pois') {
        try {
            const { city, category, type } = args;

            console.error(`[MCP POI] Searching for ${type} in ${city}...`);

            const results = await searchPOIs(city, category, type);

            console.error(`[MCP POI] Found ${results.length} results`);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            city,
                            category,
                            type,
                            count: results.length,
                            pois: results,
                            source: 'OpenStreetMap via Overpass API',
                        }, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error('[MCP POI] Error:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error.message,
                        }),
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('POI Search MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
