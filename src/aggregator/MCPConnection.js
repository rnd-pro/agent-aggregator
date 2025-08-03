/**
 * MCPConnection - Handles connection to individual MCP server
 * 
 * This class manages the connection lifecycle and communication
 * with a single MCP server instance.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPConnection {
  /**
   * Create new MCP connection
   * 
   * @param {Object} agentConfig - Agent configuration
   * @param {Object} aggregatorConfig - Aggregator configuration
   */
  constructor(agentConfig, aggregatorConfig) {
    this.agentConfig = agentConfig;
    this.aggregatorConfig = aggregatorConfig;
    this.client = null;
    this.transport = null;
    this.process = null;
    this.connected = false;
  }

  /**
   * Connect to the MCP server
   * 
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      console.error(`Starting MCP server for ${this.agentConfig.name}...`);
      console.error(`Command: ${this.agentConfig.connection.command}`);
      console.error(`Args: ${JSON.stringify(this.agentConfig.connection.args)}`);

      console.error(`Creating transport for ${this.agentConfig.name}...`);

      // Create MCP client and transport using server parameters
      this.transport = new StdioClientTransport({
        command: this.agentConfig.connection.command,
        args: this.agentConfig.connection.args,
        env: {
          ...process.env,
          ...this.agentConfig.connection.env
        }
      });

      this.client = new Client(
        {
          name: `agent-aggregator-client-${this.agentConfig.name}`,
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );

      // Connect with timeout
      await Promise.race([
        this.client.connect(this.transport),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.aggregatorConfig.timeout)
        )
      ]);

      this.connected = true;
      console.error(`Successfully connected to MCP server: ${this.agentConfig.name}`);

    } catch (error) {
      await this.cleanup();
      throw new Error(`Failed to connect to ${this.agentConfig.name}: ${error.message}`);
    }
  }

  /**
   * List available tools from this MCP server
   * 
   * @returns {Promise<Array>} Array of tool definitions
   */
  async listTools() {
    if (!this.connected || !this.client) {
      throw new Error(`Not connected to ${this.agentConfig.name}`);
    }

    try {
      const response = await this.client.request(
        { method: 'tools/list' },
        { 
          timeout: this.aggregatorConfig.timeout 
        }
      );

      // Handle different response formats
      if (response.result && response.result.tools) {
        return response.result.tools;
      } else if (response.tools) {
        return response.tools;
      } else {
        console.error(`Unexpected tools/list response format from ${this.agentConfig.name}:`, response);
        return [];
      }

    } catch (error) {
      if (error.message.includes('resultSchema.parse is not a function')) {
        // This is a known SDK compatibility issue, try to handle gracefully
        console.error(`SDK compatibility issue with ${this.agentConfig.name}, returning empty tools list`);
        console.error(`Attempting manual tools/list request...`);
        
        try {
          // Try a more basic request without result validation
          const rawResponse = await this.client.request({ method: 'tools/list' });
          console.error(`Raw response from ${this.agentConfig.name}:`, rawResponse);
          
          // Try different response format extractions
          if (rawResponse && rawResponse.result && rawResponse.result.tools) {
            return rawResponse.result.tools;
          } else if (rawResponse && rawResponse.tools) {
            return rawResponse.tools;
          }
          
          return [];
        } catch (innerError) {
          console.error(`Manual request also failed for ${this.agentConfig.name}:`, innerError.message);
          return [];
        }
      }
      throw new Error(`Failed to list tools from ${this.agentConfig.name}: ${error.message}`);
    }
  }

  /**
   * Call a tool on this MCP server
   * 
   * @param {string} toolName - Name of the tool
   * @param {Object} args - Tool arguments
   * @returns {Promise<Object>} Tool execution result
   */
  async callTool(toolName, args) {
    if (!this.connected || !this.client) {
      throw new Error(`Not connected to ${this.agentConfig.name}`);
    }

    try {
      const response = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        },
        { 
          timeout: this.aggregatorConfig.timeout 
        }
      );

      return response;

    } catch (error) {
      throw new Error(`Failed to call tool ${toolName} on ${this.agentConfig.name}: ${error.message}`);
    }
  }

  /**
   * Check if connection is active
   * 
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected && this.client && this.transport;
  }

  /**
   * Disconnect from MCP server
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    console.error(`Disconnecting from ${this.agentConfig.name}...`);
    await this.cleanup();
  }

  /**
   * Cleanup connection resources
   * 
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.connected = false;

    // Close client connection
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error(`Error closing client for ${this.agentConfig.name}:`, error);
      }
      this.client = null;
    }

    // Close transport
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error(`Error closing transport for ${this.agentConfig.name}:`, error);
      }
      this.transport = null;
    }
  }
}