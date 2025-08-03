/**
 * AgentAggregator - Main class for aggregating MCP servers
 * 
 * This class manages connections to multiple MCP servers and aggregates
 * their tools into a unified interface.
 */

import { MCPConnection } from './MCPConnection.js';

export class AgentAggregator {
  /**
   * Create new AgentAggregator instance
   * 
   * @param {Object} config - Configuration object
   */
  constructor(config) {
    this.config = config;
    this.connections = new Map();
    this.tools = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all MCP connections
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    console.error('Initializing Agent Aggregator...');
    
    const enabledAgents = this.config.agents.filter(agent => agent.enabled);
    
    if (enabledAgents.length === 0) {
      console.error('Warning: No enabled agents found in configuration');
      this.initialized = true;
      return;
    }

    // Create connections to all enabled agents
    const connectionPromises = enabledAgents.map(async (agent) => {
      try {
        console.error(`Connecting to agent: ${agent.name}`);
        
        const connection = new MCPConnection(agent, this.config.aggregator);
        await connection.connect();
        
        this.connections.set(agent.name, connection);
        console.error(`Successfully connected to ${agent.name}`);
        
        // Load tools from this connection
        await this.loadToolsFromConnection(agent.name, connection);
        
      } catch (error) {
        console.error(`Failed to connect to ${agent.name}:`, error.message);
        // Continue with other connections even if one fails
      }
    });

    await Promise.all(connectionPromises);
    
    this.initialized = true;
    console.error(`Agent Aggregator initialized with ${this.connections.size} active connections`);
    console.error(`Total tools available: ${this.tools.size}`);
  }

  /**
   * Load tools from a specific connection
   * 
   * @param {string} agentName - Name of the agent
   * @param {MCPConnection} connection - MCP connection instance
   * @returns {Promise<void>}
   */
  async loadToolsFromConnection(agentName, connection) {
    try {
      console.error(`Attempting to load tools from ${agentName}...`);
      const tools = await connection.listTools();
      console.error(`Raw tools response from ${agentName}:`, JSON.stringify(tools, null, 2));
      
      for (const tool of tools) {
        // Prefix tool names with agent name to avoid conflicts
        const toolName = `${agentName}__${tool.name}`;
        
        this.tools.set(toolName, {
          ...tool,
          originalName: tool.name,
          agentName: agentName,
          connection: connection
        });
      }
      
      console.error(`Loaded ${tools.length} tools from ${agentName}`);
      
    } catch (error) {
      console.error(`Failed to load tools from ${agentName}:`, error.message);
      console.error(`Error stack:`, error.stack);
    }
  }

  /**
   * List all available tools
   * 
   * @returns {Promise<Array>} Array of tool definitions
   */
  async listTools() {
    if (!this.initialized) {
      throw new Error('AgentAggregator not initialized');
    }

    const toolList = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description || `Tool from ${tool.agentName}`,
      inputSchema: tool.inputSchema || { type: 'object', properties: {} }
    }));

    return toolList;
  }

  /**
   * Call a specific tool
   * 
   * @param {string} toolName - Name of the tool to call
   * @param {Object} args - Arguments for the tool
   * @returns {Promise<Object>} Tool execution result
   */
  async callTool(toolName, args = {}) {
    if (!this.initialized) {
      throw new Error('AgentAggregator not initialized');
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      console.error(`Calling tool ${toolName} on agent ${tool.agentName}`);
      
      const result = await tool.connection.callTool(tool.originalName, args);
      
      console.error(`Tool ${toolName} completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get connection status for all agents
   * 
   * @returns {Object} Status information
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      totalConnections: this.connections.size,
      totalTools: this.tools.size,
      agents: {}
    };

    for (const [agentName, connection] of this.connections) {
      status.agents[agentName] = {
        connected: connection.isConnected(),
        toolCount: Array.from(this.tools.values()).filter(tool => tool.agentName === agentName).length,
        hasModel: !!connection.openRouterClient,
        modelName: connection.agentConfig.model?.name || null
      };
    }

    return status;
  }

  /**
   * Generate text using a specific agent's AI model
   * 
   * @param {string} agentName - Name of the agent
   * @param {string} prompt - Text prompt to generate
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateText(agentName, prompt, options = {}) {
    if (!this.initialized) {
      throw new Error('AgentAggregator not initialized');
    }

    const connection = this.connections.get(agentName);
    if (!connection) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    if (!connection.isConnected()) {
      throw new Error(`Agent not connected: ${agentName}`);
    }

    return await connection.generateText(prompt, options);
  }

  /**
   * Send chat completion request to a specific agent's AI model
   * 
   * @param {string} agentName - Name of the agent
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Completion options
   * @returns {Promise<Object>} Chat completion response
   */
  async chatCompletion(agentName, messages, options = {}) {
    if (!this.initialized) {
      throw new Error('AgentAggregator not initialized');
    }

    const connection = this.connections.get(agentName);
    if (!connection) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    if (!connection.isConnected()) {
      throw new Error(`Agent not connected: ${agentName}`);
    }

    return await connection.chatCompletion(messages, options);
  }

  /**
   * Get model information for all agents
   * 
   * @returns {Promise<Object>} Model information for all agents
   */
  async getModelInfo() {
    if (!this.initialized) {
      throw new Error('AgentAggregator not initialized');
    }

    const modelInfo = {};
    
    for (const [agentName, connection] of this.connections) {
      try {
        modelInfo[agentName] = await connection.getModelInfo();
      } catch (error) {
        modelInfo[agentName] = {
          agentName: agentName,
          hasModel: false,
          error: error.message
        };
      }
    }

    return modelInfo;
  }

  /**
   * Get list of available agents with their capabilities
   * 
   * @returns {Array} Array of agent information
   */
  getAgentsList() {
    const agents = [];
    
    for (const [agentName, connection] of this.connections) {
      const toolCount = Array.from(this.tools.values()).filter(tool => tool.agentName === agentName).length;
      
      agents.push({
        name: agentName,
        connected: connection.isConnected(),
        toolCount: toolCount,
        hasModel: !!connection.openRouterClient,
        modelName: connection.agentConfig.model?.name || null,
        description: connection.agentConfig.description || `MCP agent: ${agentName}`
      });
    }
    
    return agents;
  }

  /**
   * Cleanup all connections
   * 
   * @returns {Promise<void>}
   */
  async cleanup() {
    console.error('Cleaning up Agent Aggregator...');
    
    const cleanupPromises = Array.from(this.connections.values()).map(
      connection => connection.disconnect()
    );

    await Promise.all(cleanupPromises);
    
    this.connections.clear();
    this.tools.clear();
    this.initialized = false;
    
    console.error('Agent Aggregator cleanup completed');
  }
}