/**
 * MCPConnection - Manages connection to a single MCP server
 * 
 * This class handles the connection lifecycle and communication with an individual
 * MCP server, using the proper MCP SDK patterns.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { OpenRouterClient } from './OpenRouterClient.js';

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
    this.connected = false;
    this.tools = [];
    
    // Initialize OpenRouter client if model configuration is provided
    this.openRouterClient = null;
    if (agentConfig.model) {
      try {
        this.openRouterClient = new OpenRouterClient(agentConfig.model);
        console.error(`Initialized OpenRouter client for ${agentConfig.name} with model ${agentConfig.model.name}`);
      } catch (error) {
        console.error(`Failed to initialize OpenRouter client for ${agentConfig.name}:`, error.message);
      }
    }
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

      // Create the transport
      console.error(`Creating transport for ${this.agentConfig.name}...`);
      this.transport = new StdioClientTransport({
        command: this.agentConfig.connection.command,
        args: this.agentConfig.connection.args,
        env: {
          ...process.env,
          ...this.agentConfig.connection.env
        }
      });

      // Create the client
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

      // Connect to the server
      await this.client.connect(this.transport);
      this.connected = true;

      console.error(`Successfully connected to MCP server: ${this.agentConfig.name}`);

      // Test OpenRouter connection if available
      if (this.openRouterClient) {
        try {
          await this.openRouterClient.testConnection();
          console.error(`OpenRouter connection verified for ${this.agentConfig.name}`);
        } catch (error) {
          console.error(`OpenRouter connection test failed: ${error.message}`);
          console.error(`OpenRouter connection test failed for ${this.agentConfig.name}`);
        }
      }

    } catch (error) {
      console.error(`Failed to connect to ${this.agentConfig.name}:`, error.message);
      this.connected = false;
      throw error;
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
      console.error(`Requesting tools from ${this.agentConfig.name}...`);
      
      // Use the proper SDK method
      const result = await this.client.listTools();
      
      console.error(`Tools response from ${this.agentConfig.name}:`, JSON.stringify(result, null, 2));

      // Extract tools from response
      if (result && result.tools) {
        return result.tools;
      } else {
        console.error(`No tools found in response from ${this.agentConfig.name}`);
        return [];
      }

    } catch (error) {
      console.error(`Failed to list tools from ${this.agentConfig.name}:`, error.message);
      return [];
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
      console.error(`Calling tool ${toolName} on ${this.agentConfig.name}...`);
      
      // Use the proper SDK method
      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      console.error(`Tool ${toolName} completed successfully on ${this.agentConfig.name}`);
      return result;

    } catch (error) {
      console.error(`Failed to call tool ${toolName} on ${this.agentConfig.name}:`, error.message);
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
   * Generate text using the associated AI model via OpenRouter
   * 
   * @param {string} prompt - Text prompt to send to the model
   * @param {Object} options - Additional options for generation
   * @returns {Promise<string>} Generated text response
   */
  async generateText(prompt, options = {}) {
    if (!this.openRouterClient) {
      throw new Error(`No AI model configured for agent ${this.agentConfig.name}`);
    }

    try {
      const response = await this.openRouterClient.generateText(prompt, options);
      return response;
    } catch (error) {
      throw new Error(`Failed to generate text for ${this.agentConfig.name}: ${error.message}`);
    }
  }

  /**
   * Send structured chat completion request
   * 
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Chat completion response
   */
  async chatCompletion(messages, options = {}) {
    if (!this.openRouterClient) {
      throw new Error(`No AI model configured for agent ${this.agentConfig.name}`);
    }

    try {
      const response = await this.openRouterClient.chat(messages, options);
      return response;
    } catch (error) {
      throw new Error(`Failed to chat with ${this.agentConfig.name}: ${error.message}`);
    }
  }

  /**
   * Get model information for this agent
   * 
   * @returns {Object} Model information
   */
  async getModelInfo() {
    return {
      agentName: this.agentConfig.name,
      hasModel: !!this.openRouterClient,
      modelName: this.agentConfig.model?.name || null,
      provider: this.agentConfig.model?.provider || null,
      hasApiKey: !!this.agentConfig.model?.apiKey,
      connected: this.connected
    };
  }

  /**
   * Disconnect from the MCP server
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    console.error(`Disconnecting from ${this.agentConfig.name}...`);
    
    try {
      if (this.client) {
        await this.client.close();
      }
      if (this.transport) {
        await this.transport.close();
      }
    } catch (error) {
      console.error(`Error during disconnect from ${this.agentConfig.name}:`, error.message);
    }
    
    this.connected = false;
    this.client = null;
    this.transport = null;
    this.tools = [];
  }
}