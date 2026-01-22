#!/usr/bin/env node

/**
 * MCP Server for Itinerary Building
 * Provides structured itinerary generation via Model Context Protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { updateItinerary } = require('../tools/itineraryTool');

// Create MCP server instance
const server = new Server(
    {
        name: 'itinerary-builder-server',
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
                name: 'build_itinerary',
                description: 'Build or update a structured day-by-day travel itinerary with activities, times, and locations.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        days: {
                            type: 'array',
                            description: 'Array of day objects containing activities',
                            items: {
                                type: 'object',
                                properties: {
                                    day: {
                                        type: 'integer',
                                        description: 'Day number (1, 2, 3, etc.)',
                                    },
                                    activities: {
                                        type: 'array',
                                        description: 'List of activities for this day',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                time: {
                                                    type: 'string',
                                                    description: 'Time in HH:MM format (e.g., "09:00", "14:30")',
                                                },
                                                activity: {
                                                    type: 'string',
                                                    description: 'Name of the activity or place to visit',
                                                },
                                                location: {
                                                    type: 'string',
                                                    description: 'Location or address',
                                                },
                                                notes: {
                                                    type: 'string',
                                                    description: 'Optional notes, tips, or reasoning',
                                                },
                                            },
                                            required: ['time', 'activity', 'location'],
                                        },
                                    },
                                },
                                required: ['day', 'activities'],
                            },
                        },
                    },
                    required: ['days'],
                },
            },
            {
                name: 'validate_itinerary',
                description: 'Validate an itinerary for feasibility (time constraints, travel times, pace).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        itinerary: {
                            type: 'object',
                            description: 'The itinerary to validate',
                        },
                        constraints: {
                            type: 'object',
                            description: 'Optional constraints (max_hours_per_day, pace, etc.)',
                            properties: {
                                max_hours_per_day: { type: 'number' },
                                pace: { type: 'string', enum: ['relaxed', 'moderate', 'fast'] },
                            },
                        },
                    },
                    required: ['itinerary'],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'build_itinerary') {
        try {
            const { days } = args;

            console.error(`[MCP Itinerary] Building itinerary with ${days.length} days...`);

            const result = await updateItinerary({ days });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            itinerary: { days },
                            message: result.message,
                            total_days: days.length,
                            total_activities: days.reduce((sum, day) => sum + day.activities.length, 0),
                        }, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error('[MCP Itinerary] Error:', error);
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

    if (name === 'validate_itinerary') {
        try {
            const { itinerary, constraints = {} } = args;

            console.error('[MCP Itinerary] Validating itinerary...');

            const validation = validateItineraryFeasibility(itinerary, constraints);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(validation, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error('[MCP Itinerary] Validation error:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            valid: false,
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

/**
 * Validate itinerary feasibility
 */
function validateItineraryFeasibility(itinerary, constraints) {
    const issues = [];
    const warnings = [];

    const maxHoursPerDay = constraints.max_hours_per_day || 12;
    const pace = constraints.pace || 'moderate';

    itinerary.days.forEach((day, idx) => {
        const activities = day.activities;

        // Check if day has activities
        if (activities.length === 0) {
            issues.push(`Day ${day.day}: No activities planned`);
            return;
        }

        // Parse times and check duration
        const times = activities.map(a => {
            const [hours, minutes] = a.time.split(':').map(Number);
            return hours + minutes / 60;
        });

        const startTime = Math.min(...times);
        const endTime = Math.max(...times);
        const duration = endTime - startTime;

        if (duration > maxHoursPerDay) {
            issues.push(`Day ${day.day}: Duration ${duration.toFixed(1)}h exceeds max ${maxHoursPerDay}h`);
        }

        // Check pace (activities per day)
        const paceThresholds = { relaxed: 4, moderate: 6, fast: 8 };
        if (activities.length > paceThresholds[pace]) {
            warnings.push(`Day ${day.day}: ${activities.length} activities may be too many for ${pace} pace`);
        }

        // Check for time conflicts (activities at same time)
        const timeSet = new Set();
        activities.forEach(a => {
            if (timeSet.has(a.time)) {
                issues.push(`Day ${day.day}: Multiple activities at ${a.time}`);
            }
            timeSet.add(a.time);
        });
    });

    return {
        valid: issues.length === 0,
        issues,
        warnings,
        summary: {
            total_days: itinerary.days.length,
            total_activities: itinerary.days.reduce((sum, d) => sum + d.activities.length, 0),
            pace: pace,
        },
    };
}

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Itinerary Builder MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
