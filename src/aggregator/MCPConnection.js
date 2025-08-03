/**
 * MCPConnection - Handles connection to individual MCP server
 * 
 * This class manages the connection lifecycle and communication
 * with a single MCP server instance.
 */

import { spawn } from 'child_process';
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
      
      // Spawn the MCP server process
      this.process = spawn(
        this.agentConfig.connection.command,
        this.agentConfig.connection.args,
        {
          env: {
            ...process.env,
            ...this.agentConfig.connection.env
          },
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );

      // Handle process errors
      this.process.on('error', (error) => {
        console.error(`Process error for ${this.agentConfig.name}:`, error);
        this.connected = false;
      });

      this.process.on('exit', (code, signal) => {
        console.error(`Process exited for ${this.agentConfig.name}: code=${code}, signal=${signal}`);
        this.connected = false;
      });

      this.process.stderr.on('data', (data) => {
        console.error(`Process stderr for ${this.agentConfig.name}:`, data.toString());
      });

      // Wait a bit for process to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify process streams are available
      if (!this.process.stdin || !this.process.stdout) {
        throw new Error(`Process streams not available for ${this.agentConfig.name}`);
      }

      console.error(`Creating transport for ${this.agentConfig.name}...`);

      // Create MCP client and transport
      this.transport = new StdioClientTransport({
        stdin: this.process.stdin,
        stdout: this.process.stdout
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

      return response.tools || [];

    } catch (error) {
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
    return this.connected && this.client && this.process && !this.process.killed;
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

    // Kill process
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          if (!this.process.killed) {
            this.process.kill('SIGKILL');
          }
        }, 5000);
        
      } catch (error) {
        console.error(`Error killing process for ${this.agentConfig.name}:`, error);
      }
      this.process = null;
    }
  }
}