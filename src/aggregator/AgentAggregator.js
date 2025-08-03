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
      const tools = await connection.listTools();
      
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
        toolCount: Array.from(this.tools.values()).filter(tool => tool.agentName === agentName).length
      };
    }

    return status;
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