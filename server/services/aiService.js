const OpenAI = require('openai');
// Keep direct imports for RAG as it hasn't been MCP-ified yet (can be done if needed)
const { searchCityKnowledge, getCityTravelTips } = require('./ragService');
const { orchestrator } = require('../mcp/orchestrator');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Tool Definitions for OpenAI
const tools = [
    {
        type: "function",
        function: {
            name: "search_pois",
            description: "Search for points of interest in a city given a category (e.g., tourism, amenity) and type (e.g., museum, restaurant, park).",
            parameters: {
                type: "object",
                properties: {
                    city: { type: "string", description: "The city to search in, e.g. London" },
                    category: { type: "string", description: "The OSM main key, e.g. 'tourism', 'amenity', 'leisure'" },
                    type: { type: "string", description: "The OSM tag value, e.g. 'museum', 'restaurant', 'park', 'viewpoint'" },
                },
                required: ["city", "category", "type"],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "update_itinerary",
            description: "Save/Update the structured itinerary plan to show to the user.",
            parameters: {
                type: "object",
                properties: {
                    days: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                day: { type: "integer" },
                                activities: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            time: { type: "string" },
                                            activity: { type: "string" },
                                            location: { type: "string" },
                                            notes: { type: "string" },
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                required: ["days"],
            },
        }
    },
    {
        type: "function",
        function: {
            name: "get_city_knowledge",
            description: "Fetch travel knowledge, tips, and practical information about a city from Wikivoyage. Use this to answer questions about safety, etiquette, weather, or to provide context for recommendations.",
            parameters: {
                type: "object",
                properties: {
                    city: { type: "string", description: "The city name" },
                    query: { type: "string", description: "Optional: specific topic to search for (e.g., 'safety', 'food', 'weather', 'etiquette')" }
                },
                required: ["city"],
            },
        }
    }
];

async function generateResponse(conversationHistory) {
    try {
        const messages = [
            {
                role: "system",
                content: `You are an advanced AI Travel Planner. Your goal is to plan realistic, grounded trips.

CRITICAL RULES:
1. ALWAYS search for real POIs first using 'search_pois' before planning. Do not hallucinate places.
2. Use 'get_city_knowledge' to fetch travel tips, safety info, and context from Wikivoyage.
3. After searching POIs and knowledge, you MUST call 'update_itinerary' with a complete structured plan.
4. The update_itinerary function is MANDATORY - without it, the user won't see the visual itinerary.
5. When explaining recommendations, cite your sources (e.g., "According to Wikivoyage...").
6. Keep your text responses short and conversational.
7. Format times as "HH:MM" (e.g., "09:00", "14:30").

Example workflow:
- User: "Plan a 2-day trip to Paris"
- You: Call get_city_knowledge for Paris to understand the city
- You: Call search_pois for museums, cafes, etc.
- You: Call update_itinerary with the complete 2-day plan
- You: Respond with a brief summary citing sources: "I've created a 2-day Paris itinerary! According to Wikivoyage, the Louvre is a must-see..."`
            },
            ...conversationHistory.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            }))
        ];

        let latestItinerary = null;
        const toolUsage = [];
        let response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });

        let responseMessage = response.choices[0].message;
        messages.push(responseMessage);

        // Handle tool calls
        while (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`Calling tool: ${functionName}`);
                toolUsage.push(functionName);

                let functionResponse;
                try {
                    if (functionName === 'search_pois') {
                        // Call via MCP
                        functionResponse = await orchestrator.callTool('poi', 'search_pois', functionArgs);
                    } else if (functionName === 'update_itinerary') {
                        // Call via MCP - mapping to build_itinerary tool in its server
                        latestItinerary = functionArgs;
                        functionResponse = await orchestrator.callTool('itinerary', 'build_itinerary', functionArgs);
                    } else if (functionName === 'get_city_knowledge') {
                        // Fetch both search results and travel tips
                        const knowledge = await searchCityKnowledge(functionArgs.city, functionArgs.query || '');
                        const tips = await getCityTravelTips(functionArgs.city);
                        functionResponse = {
                            knowledge,
                            tips,
                            source: tips.source,
                            url: tips.url
                        };
                    }
                } catch (toolErr) {
                    console.error(`Tool Error (${functionName}):`, toolErr);
                    functionResponse = { error: toolErr.message };
                }

                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: JSON.stringify(functionResponse),
                });
            }

            response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
            });

            responseMessage = response.choices[0].message;
            messages.push(responseMessage);
        }

        // Extract sources from tool usage
        const sources = [];
        for (const msg of messages) {
            if (msg.role === 'tool' && msg.content) {
                try {
                    const data = JSON.parse(msg.content);
                    if (data.source && data.url) {
                        sources.push({ source: data.source, url: data.url });
                    }
                    if (data.knowledge) {
                        data.knowledge.forEach(k => {
                            if (k.source && k.url) {
                                sources.push({ source: k.source, url: k.url, title: k.title });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        return {
            content: responseMessage.content,
            itinerary: latestItinerary,
            toolUsage: toolUsage,
            sources: [...new Set(sources.map(s => JSON.stringify(s)))].map(s => JSON.parse(s)) // Deduplicate
        };
    } catch (error) {
        console.error("OpenAI Error:", error);
        throw error;
    }
}

module.exports = { generateResponse };
