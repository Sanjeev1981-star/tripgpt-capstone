const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

/**
 * MCP Client Orchestrator
 * Manages connections to multiple MCP servers
 */
class MCPOrchestrator {
    constructor() {
        this.clients = new Map();
    }

    /**
     * Initialize and connect to an MCP server
     */
    async connectServer(name, scriptPath) {
        console.log(`[MCP Orchestrator] Connecting to ${name}...`);

        const transport = new StdioClientTransport({
            command: 'node',
            args: [scriptPath],
        });

        const client = new Client(
            {
                name: 'trip-planner-orchestrator',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        await client.connect(transport);
        this.clients.set(name, client);
        console.log(`[MCP Orchestrator] Connected to ${name} successfully.`);
        return client;
    }

    /**
     * Call a tool on a specific MCP server
     */
    async callTool(serverName, toolName, args) {
        const client = this.clients.get(serverName);
        if (!client) {
            throw new Error(`MCP Server ${serverName} not connected`);
        }

        console.log(`[MCP Orchestrator] Calling ${serverName}.${toolName}...`);
        const result = await client.callTool({
            name: toolName,
            arguments: args,
        });

        // MCP returns results in a 'content' array
        if (result.isError) {
            throw new Error(result.content[0].text);
        }

        return JSON.parse(result.content[0].text);
    }

    /**
     * Shutdown all servers
     */
    async shutdown() {
        for (const [name, client] of this.clients) {
            console.log(`[MCP Orchestrator] Shutting down ${name}...`);
            // Standard cleanup
        }
    }
}

// Singleton instance
const orchestrator = new MCPOrchestrator();

/**
 * Initialize all required MCP servers
 */
async function initMCPSystem() {
    const mcpDir = path.join(__dirname);
    await orchestrator.connectServer('poi', path.join(mcpDir, 'poi-search-server.js'));
    await orchestrator.connectServer('itinerary', path.join(mcpDir, 'itinerary-builder-server.js'));
}

module.exports = { orchestrator, initMCPSystem };
