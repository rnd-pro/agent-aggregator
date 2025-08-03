#!/usr/bin/env node

/**
 * Simple mock MCP server for testing
 * 
 * This server implements a minimal MCP interface with one echo tool
 * for testing the AgentAggregator functionality.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function main() {
  // Create MCP server
  const server = new Server(
    {
      name: 'test-echo-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list_tools requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'echo',
          description: 'Echo back the input message',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Message to echo back'
              }
            },
            required: ['message']
          }
        },
        {
          name: 'uppercase',
          description: 'Convert message to uppercase',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to convert to uppercase'
              }
            },
            required: ['text']
          }
        }
      ]
    };
  });

  // Handle call_tool requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'echo') {
      return {
        content: [
          {
            type: 'text',
            text: args.message || 'Hello World'
          }
        ]
      };
    }
    
    if (name === 'uppercase') {
      return {
        content: [
          {
            type: 'text',
            text: (args.text || '').toUpperCase()
          }
        ]
      };
    }
    
    throw new Error(`Unknown tool: ${name}`);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Mock MCP server running on stdio');
}

main().catch((error) => {
  console.error('Mock MCP server error:', error);
  process.exit(1);
});