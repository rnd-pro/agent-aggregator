#!/usr/bin/env node

/**
 * AgentAggregator - MCP Server that aggregates tools from multiple MCP servers
 * 
 * This server acts as a proxy, connecting to multiple downstream MCP servers
 * and exposing their combined tools through a single interface.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
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
      },
      {
        capabilities: {
          tools: {},
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

    // Handle call_tool requests
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await aggregator.callTool(name, args);
    });
    
    // Add custom handlers for AI model interactions
    // Note: Custom methods may not be fully supported by MCP SDK yet
    try {
      server.setRequestHandler('custom/agents/list', async () => {
        return {
          agents: aggregator.getAgentsList()
        };
      });
    } catch (error) {
      console.error('Warning: Could not register custom/agents/list handler:', error.message);
    }
    
    try {
      server.setRequestHandler('custom/model/generate', async (request) => {
        const { agentName, prompt, options = {} } = request.params;
        const response = await aggregator.generateText(agentName, prompt, options);
        return { response };
      });
    } catch (error) {
      console.error('Warning: Could not register custom/model/generate handler:', error.message);
    }
    
    try {
      server.setRequestHandler('custom/model/chat', async (request) => {
        const { agentName, messages, options = {} } = request.params;
        const response = await aggregator.chatCompletion(agentName, messages, options);
        return response;
      });
    } catch (error) {
      console.error('Warning: Could not register custom/model/chat handler:', error.message);
    }
    
    try {
      server.setRequestHandler('custom/models/info', async () => {
        const modelInfo = await aggregator.getModelInfo();
        return { models: modelInfo };
      });
    } catch (error) {
      console.error('Warning: Could not register custom/models/info handler:', error.message);
    }
    
    try {
      server.setRequestHandler('custom/status', async () => {
        return aggregator.getStatus();
      });
    } catch (error) {
      console.error('Warning: Could not register custom/status handler:', error.message);
    }

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