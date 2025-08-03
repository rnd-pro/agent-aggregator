/**
 * AgentAggregator - Main class for aggregating MCP servers
 * 
 * This class manages connections to multiple MCP servers and aggregates
 * their tools into a unified interface.
 */

import { MCPConnection } from './MCPConnection.js';
import fs from 'fs';
import path from 'path';

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
    this.filterConfigPath = 'config/filter.json';
    
    // Load saved filter or use default
    this.toolFilter = this.loadFilterConfig();
  }

  /**
   * Load filter configuration from file
   * 
   * @returns {Object} Filter configuration
   */
  loadFilterConfig() {
    try {
      const filterPath = path.resolve(this.filterConfigPath);
      
      if (fs.existsSync(filterPath)) {
        const configData = fs.readFileSync(filterPath, 'utf8');
        const savedFilter = JSON.parse(configData);
        
        console.error(`Loaded filter configuration from ${filterPath}:`, savedFilter);
        return {
          excludePatterns: savedFilter.excludePatterns || [],
          excludeServers: savedFilter.excludeServers || [],
          includePatterns: savedFilter.includePatterns || []
        };
      }
    } catch (error) {
      console.error('Failed to load filter configuration:', error.message);
    }
    
    // Return default filter if loading fails
    return {
      excludePatterns: [],
      excludeServers: [],
      includePatterns: []
    };
  }

  /**
   * Save filter configuration to file
   * 
   * @param {Object} filterConfig - Filter configuration to save
   */
  saveFilterConfig(filterConfig) {
    try {
      const filterPath = path.resolve(this.filterConfigPath);
      const configDir = path.dirname(filterPath);
      
      // Ensure config directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Save configuration with timestamp
      const configToSave = {
        ...filterConfig,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      fs.writeFileSync(filterPath, JSON.stringify(configToSave, null, 2), 'utf8');
      console.error(`Filter configuration saved to ${filterPath}`);
      
    } catch (error) {
      console.error('Failed to save filter configuration:', error.message);
    }
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
   * Extract MCP server name from agent configuration
   * 
   * @param {Object} agentConfig - Agent configuration object
   * @returns {string} MCP server name for prefixing
   */
  extractMCPServerName(agentConfig) {
    if (agentConfig.connection && agentConfig.connection.args) {
      // Try to extract package name from npx command
      const args = agentConfig.connection.args;
      for (const arg of args) {
        if (arg.startsWith('@') || arg.includes('/server-')) {
          // Extract server name from package name
          // @modelcontextprotocol/server-filesystem -> filesystem
          // @kunihiros/claude-code-mcp -> claude-code-mcp
          const packageName = arg.split('/').pop();
          if (packageName.startsWith('server-')) {
            return packageName.replace('server-', '');
          }
          return packageName;
        }
      }
    }
    
    // Fallback to agent name if can't extract from package
    return agentConfig.name;
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
      
      // Extract MCP server name for dynamic prefixing
      const mcpServerName = this.extractMCPServerName(connection.agentConfig);
      console.error(`Using MCP server name for prefixing: ${mcpServerName}`);
      
      for (const tool of tools) {
        // Prefix tool names with MCP server name to avoid conflicts
        const toolName = `${mcpServerName}__${tool.name}`;
        
        this.tools.set(toolName, {
          ...tool,
          originalName: tool.name,
          agentName: agentName,
          mcpServerName: mcpServerName,
          connection: connection
        });
      }
      
      console.error(`Loaded ${tools.length} tools from ${agentName} (MCP server: ${mcpServerName})`);
      
    } catch (error) {
      console.error(`Failed to load tools from ${agentName}:`, error.message);
      console.error(`Error stack:`, error.stack);
    }
  }

  /**
   * Get server metadata for AI understanding (dynamic based on active connections)
   * 
   * @returns {Object} Server metadata with descriptions and capabilities
   */
  getServerMetadata() {
    const connectedServers = {};
    
    for (const [agentName, connection] of this.connections) {
      const mcpServerName = this.extractMCPServerName(connection.agentConfig);
      const agentConfig = connection.agentConfig;
      
      // Extract server info from agent configuration dynamically
      const serverInfo = {
        purpose: agentConfig.description || `${mcpServerName} server operations`,
        description: agentConfig.description || `MCP server providing ${mcpServerName} capabilities`,
        capabilities: this.extractCapabilitiesFromTools(agentName)
      };
      
      const toolCount = Array.from(this.tools.values()).filter(tool => tool.agentName === agentName).length;
      
      connectedServers[mcpServerName] = {
        ...serverInfo,
        agentName,
        connected: connection.isConnected(),
        toolCount,
        modelProvider: agentConfig.model?.provider || 'unknown',
        modelName: agentConfig.model?.name || 'unknown',
        enabled: agentConfig.enabled
      };
    }

    // Generate dynamic concept description based on active servers
    const activeServerNames = Object.keys(connectedServers);
    const conceptDescription = activeServerNames.length > 0 
      ? `Agent Aggregator is a unified MCP server that connects ${activeServerNames.length} specialized MCP servers: ${activeServerNames.join(', ')}. Each server provides specific capabilities and tools are prefixed with server names for easy identification.`
      : 'Agent Aggregator is a unified MCP server ready to connect to multiple specialized MCP servers.';

    return {
      concept: conceptDescription,
      totalConnections: this.connections.size,
      totalTools: this.tools.size,
      servers: connectedServers
    };
  }

  /**
   * Check if tool should be included based on global filter
   * 
   * @param {string} toolName - Prefixed tool name
   * @param {Object} tool - Tool object with metadata
   * @returns {boolean} True if tool should be included
   */
  shouldIncludeTool(toolName, tool) {
    const filter = this.toolFilter;
    
    // If include patterns are specified, only include matching tools
    if (filter.includePatterns.length > 0) {
      return filter.includePatterns.some(pattern => 
        toolName.includes(pattern) || tool.originalName.includes(pattern)
      );
    }
    
    // Check server exclusions
    if (filter.excludeServers.includes(tool.mcpServerName)) {
      return false;
    }
    
    // Check pattern exclusions
    if (filter.excludePatterns.some(pattern => 
        toolName.includes(pattern) || tool.originalName.includes(pattern)
    )) {
      return false;
    }
    
    return true;
  }

  /**
   * Extract capabilities from tools for a specific agent
   * 
   * @param {string} agentName - Name of the agent
   * @returns {Array<string>} Array of capabilities
   */
  extractCapabilitiesFromTools(agentName) {
    const agentTools = Array.from(this.tools.values()).filter(tool => tool.agentName === agentName);
    
    if (agentTools.length === 0) {
      return ['no tools available'];
    }

    // Extract capabilities from tool names and descriptions
    const capabilities = agentTools.map(tool => {
      const toolName = tool.originalName.toLowerCase();
      const description = tool.description || '';
      
      // Common capability patterns
      if (toolName.includes('read') || toolName.includes('list') || toolName.includes('search')) {
        return 'data reading/retrieval';
      }
      if (toolName.includes('write') || toolName.includes('create') || toolName.includes('edit')) {
        return 'data writing/modification';
      }
      if (toolName.includes('code') || toolName.includes('explain') || toolName.includes('review')) {
        return 'code analysis';
      }
      if (toolName.includes('chat') || toolName.includes('generate')) {
        return 'AI assistance';
      }
      if (toolName.includes('file') || toolName.includes('directory')) {
        return 'file operations';
      }
      
      // Fallback to tool name if no pattern matches
      return toolName.replace(/_/g, ' ');
    });

    // Remove duplicates and return unique capabilities
    return [...new Set(capabilities)];
  }

  /**
   * Get filter management tools
   * 
   * @returns {Array} Array of filter management tool definitions
   */
  getFilterManagementTools() {
    return [
      {
        name: 'filter__update',
        description: '[Filter Management] Update tool visibility filter - control which tools are visible to AI',
        inputSchema: {
          type: 'object',
          properties: {
            excludePatterns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tool name patterns to exclude (e.g., ["read", "list"])',
              default: []
            },
            excludeServers: {
              type: 'array', 
              items: { type: 'string' },
              description: 'Server names to exclude completely (e.g., ["filesystem"])',
              default: []
            },
            includePatterns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Only include tools matching these patterns (overrides excludes)',
              default: []
            }
          },
          additionalProperties: false
        },
        metadata: {
          server: 'aggregator',
          agent: 'filter-manager',
          originalName: 'update',
          serverPurpose: 'Filter Management',
          connected: true
        }
      },
      {
        name: 'filter__get',
        description: '[Filter Management] Get current tool filter configuration',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        },
        metadata: {
          server: 'aggregator',
          agent: 'filter-manager',
          originalName: 'get',
          serverPurpose: 'Filter Management',
          connected: true
        }
      },
      {
        name: 'filter__reset',
        description: '[Filter Management] Reset tool filter to show all available tools',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        },
        metadata: {
          server: 'aggregator',
          agent: 'filter-manager',
          originalName: 'reset',
          serverPurpose: 'Filter Management',
          connected: true
        }
      }
    ];
  }

  /**
   * List all available tools with enhanced descriptions
   * 
   * @returns {Promise<Array>} Array of tool definitions
   */
  async listTools() {
    if (!this.initialized) {
      throw new Error('AgentAggregator not initialized');
    }

    const serverMetadata = this.getServerMetadata();
    
    // Get filtered regular tools
    const regularTools = Array.from(this.tools.entries())
      .filter(([prefixedName, tool]) => this.shouldIncludeTool(prefixedName, tool))
      .map(([prefixedName, tool]) => {
        const serverInfo = serverMetadata.servers[tool.mcpServerName];
        const serverPurpose = serverInfo?.purpose || `${tool.mcpServerName} operations`;
        
        const enhancedDescription = tool.description 
          ? `[${serverPurpose}] ${tool.description}`
          : `[${serverPurpose}] ${tool.originalName.replace(/_/g, ' ')} tool`;
        
        return {
          name: prefixedName,
          description: enhancedDescription,
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
          metadata: {
            server: tool.mcpServerName,
            agent: tool.agentName,
            originalName: tool.originalName,
            serverPurpose,
            connected: serverInfo?.connected || false
          }
        };
      });

    // Always include filter management tools
    const filterTools = this.getFilterManagementTools();
    
    return [...regularTools, ...filterTools];
  }

  /**
   * Update global tool filter and save to disk
   * 
   * @param {Object} filterConfig - Filter configuration
   * @param {Array<string>} filterConfig.excludePatterns - Patterns to exclude
   * @param {Array<string>} filterConfig.excludeServers - Servers to exclude
   * @param {Array<string>} filterConfig.includePatterns - Patterns to include only
   */
  updateToolFilter(filterConfig) {
    this.toolFilter = {
      excludePatterns: filterConfig.excludePatterns || [],
      excludeServers: filterConfig.excludeServers || [],
      includePatterns: filterConfig.includePatterns || []
    };
    
    // Save to disk for persistence
    this.saveFilterConfig(this.toolFilter);
    
    console.error('Tool filter updated and saved:', this.toolFilter);
  }

  /**
   * Get current tool filter configuration
   * 
   * @returns {Object} Current filter configuration
   */
  getToolFilter() {
    return { ...this.toolFilter };
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
   * Get comprehensive status including server metadata
   * 
   * @returns {Object} Status information with server metadata
   */
  getStatus() {
    const serverMetadata = this.getServerMetadata();
    
    const status = {
      initialized: this.initialized,
      totalConnections: this.connections.size,
      totalTools: this.tools.size,
      serverMetadata,
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

  /**
   * Handle custom MCP methods for testing
   * 
   * @param {string} method - Method name (e.g., 'custom/agents/list')
   * @param {Object} params - Method parameters
   * @returns {Promise<Object>} Method response
   */
  async handleCustomMethod(method, params = {}) {
    switch (method) {
      case 'custom/agents/list':
        return this.getAgentsList();
      
      case 'custom/status':
        return this.getStatus();
      
      case 'custom/model/generate':
        return this.generateWithModel(params);
      
      case 'custom/model/chat':
        return this.chatWithModel(params);
      
      case 'custom/models/info':
        return this.getModelInfo();
      
      default:
        throw new Error(`Unknown custom method: ${method}`);
    }
  }

  /**
   * Get list of configured agents
   * 
   * @returns {Promise<Object>} Agents list
   */
  async getAgentsList() {
    const agents = Array.from(this.connections.values()).map(connection => ({
      name: connection.agentConfig.name,
      type: connection.agentConfig.type,
      enabled: connection.agentConfig.enabled,
      description: connection.agentConfig.description,
      connected: connection.connected,
      toolCount: connection.tools ? connection.tools.length : 0,
      model: connection.agentConfig.model
    }));

    return { agents };
  }

  /**
   * Generate text using agent's model
   * 
   * @param {Object} params - Generation parameters
   * @returns {Promise<Object>} Generation response
   */
  async generateWithModel(params) {
    const { agentName, prompt, maxTokens = 100 } = params;
    
    const connection = this.connections.get(agentName);
    if (!connection) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    if (!connection.openRouterClient) {
      throw new Error(`No AI model configured for agent: ${agentName}`);
    }

    // Use chat method which is the main API method
    const response = await connection.openRouterClient.chat([
      { role: 'user', content: prompt }
    ], { max_tokens: maxTokens });
    
    return { content: response };
  }

  /**
   * Chat with agent's model
   * 
   * @param {Object} params - Chat parameters
   * @returns {Promise<Object>} Chat response
   */
  async chatWithModel(params) {
    const { agentName, messages, maxTokens = 100 } = params;
    
    const connection = this.connections.get(agentName);
    if (!connection) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    if (!connection.openRouterClient) {
      throw new Error(`No AI model configured for agent: ${agentName}`);
    }

    const response = await connection.openRouterClient.chat(messages, { max_tokens: maxTokens });
    return { content: response };
  }

  /**
   * Get model information for all agents
   * 
   * @returns {Promise<Array>} Models information
   */
  async getModelInfo() {
    const models = [];
    
    for (const [agentName, connection] of this.connections) {
      if (connection.agentConfig.model) {
        models.push({
          agentName,
          provider: connection.agentConfig.model.provider,
          name: connection.agentConfig.model.name,
          hasApiKey: !!connection.agentConfig.model.apiKey,
          connected: connection.openRouterClient ? true : false
        });
      }
    }
    
    return models;
  }
}