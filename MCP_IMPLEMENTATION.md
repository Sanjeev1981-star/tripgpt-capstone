# MCP Architecture & Implementation

## ✅ Requirements Met
- **At least two MCP tools** in the orchestration layer:
  1. `poi_search_server`: Fetches grounded data from OpenStreetMap.
  2. `itinerary_builder_server`: Builds structured JSON and validates feasibility.
- **Demonstrated MCP calls** in the backend orchestration (`orchestrator.js`).

## 🛠️ MCP Servers (Stdio)

### 1. POI Search Server (`server/mcp/poi-search-server.js`)
- **Tool**: `search_pois`
- **Purpose**: Grounded search for real-world locations.
- **Integration**: Wraps OSM Overpass API calls into a standardized protocol.

### 2. Itinerary Builder Server (`server/mcp/itinerary-builder-server.js`)
- **Tool**: `build_itinerary`
- **Tool**: `validate_itinerary` (Feasibility Check)
- **Features**: 
  - Time conflict detection.
  - Duration overflow check (e.g., >12 hours/day).
  - Pace consistency checks (e.g., too many activities for "relaxed" pace).

## 🧩 Orchestration Layer (`server/mcp/orchestrator.js`)
- Uses `@modelcontextprotocol/sdk` to manage child processes.
- Transforms tool calls from the AI (OpenAI Function Calling) into MCP requests.
- handles JSON serialization and protocol compliance.

## 🚀 How to Run MCP
The MCP system starts automatically with the main server:
```bash
cd server
node index.js
```

You will see logs like:
`[MCP Orchestrator] Connecting to poi...`
`[MCP Orchestrator] Connected to itinerary successfully.`

## 🧪 Testing MCP Tools
You can test the MCP integration by talking to the AI.
Example: *"Plan a 3-day trip to Jaipur"*
1. AI calls LLM to decide tool usage.
2. AI calls `get_city_knowledge` (RAG).
3. AI calls `search_pois` (MCP).
4. AI calls `build_itinerary` (MCP).
5. AI calls `validate_itinerary` (MCP) to ensure it's "doable".
