#!/usr/bin/env node

/**
 * AgentAggregator - MCP Server that aggregates tools from multiple MCP servers
 * 
 * This server acts as a proxy, connecting to multiple downstream MCP servers
 * and exposing their combined tools through a single interface.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { AgentAggregator } from './aggregator/AgentAggregator.js';
import { loadConfig } from './config/ConfigLoader.js';

/**
 * Main function to start the Agent Aggregator MCP server
 */
async function main() {
  try {
    // Load configuration
    const config = await loadConfig();
    
    // Create MCP server instance
    const server = new Server(
      {
        name: 'agent-aggregator',
        version: '1.0.0',
        description: 'Multi-AI Agent Aggregator - Unified interface for multiple AI models and tools. Provides access to filesystem operations, code analysis, and specialized AI assistants through a single MCP server.',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    // Create aggregator instance
    const aggregator = new AgentAggregator(config);
    await aggregator.initialize();

    // Handle list_tools requests
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await aggregator.listTools();
      return { tools };
    });



    // Handle list_prompts requests - provide server concept explanations
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'server_concept',
            description: 'Explains the concept and capabilities of the Agent Aggregator MCP server',
            arguments: []
          },
          {
            name: 'available_servers',
            description: 'Lists all connected MCP servers and their purposes',
            arguments: []
          }
        ]
      };
    });

    // Handle tool filter management requests (custom MCP extension)
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      // Handle filter management tools
      if (name === 'filter__update') {
        aggregator.updateToolFilter(args);
        return {
          content: [
            {
              type: 'text',
              text: `Tool filter updated successfully. Current filter: ${JSON.stringify(aggregator.getToolFilter(), null, 2)}`
            }
          ]
        };
      }
      
      if (name === 'filter__get') {
        const currentFilter = aggregator.getToolFilter();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(currentFilter, null, 2)
            }
          ]
        };
      }
      
      if (name === 'filter__reset') {
        aggregator.updateToolFilter({});
        return {
          content: [
            {
              type: 'text',
              text: 'Tool filter reset to default (no filtering)'
            }
          ]
        };
      }
      
      // Handle regular tool calls
      return await aggregator.callTool(name, args);
    });

    // Handle get_prompt requests - provide detailed explanations
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;
      const serverMetadata = aggregator.getServerMetadata();
      
      if (name === 'server_concept') {
        return {
          description: 'Agent Aggregator MCP Server Concept',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I'm connected to the Agent Aggregator MCP server. Please explain what this server does and how I should use its tools.`
              }
            },
            {
              role: 'assistant', 
              content: {
                type: 'text',
                text: `# Agent Aggregator MCP Server

**Concept**: This is a unified MCP server that aggregates multiple specialized AI agents and tools into a single interface. Think of it as a "meta-server" that connects you to multiple AI capabilities.

**Available Servers**: ${Object.keys(serverMetadata.servers).length} connected MCP servers:

${Object.entries(serverMetadata.servers).map(([serverName, info]) => 
  `## ${serverName}
- **Purpose**: ${info.purpose}
- **Description**: ${info.description}
- **Tools Available**: ${info.toolCount}
- **Status**: ${info.connected ? '✅ Connected' : '❌ Disconnected'}`
).join('\n\n')}

**Tool Naming Convention**: Tools are prefixed with their server name (e.g., \`filesystem__read_file\`, \`claude-code-mcp__explain_code\`) to help you understand which specialized server provides each capability.

**How to Use**: 
1. Use \`filesystem__*\` tools for file operations
2. Use \`claude-code-mcp__*\` tools for advanced code analysis
3. Use \`qwen-mcp__*\` tools for general AI assistance

Each tool is designed for specific purposes - choose the right tool based on your task!`
              }
            }
          ]
        };
      }
      
      if (name === 'available_servers') {
        return {
          description: 'Detailed information about connected MCP servers',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Show me detailed information about all available MCP servers and their capabilities.'
              }
            },
            {
              role: 'assistant',
              content: {
                type: 'text', 
                text: `# Connected MCP Servers

${JSON.stringify(serverMetadata, null, 2)}`
              }
            }
          ]
        };
      }
      
      throw new Error(`Unknown prompt: ${name}`);
    });

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Agent Aggregator MCP server running on stdio');
    
  } catch (error) {
    console.error('Failed to start Agent Aggregator:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down Agent Aggregator...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Agent Aggregator...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});