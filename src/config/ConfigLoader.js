/**
 * Configuration loader for Agent Aggregator
 * 
 * Loads configuration from various sources with priority:
 * 1. Environment variables
 * 2. config/agents.json file
 * 3. Default configuration
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default configuration for connected MCP servers
 */
const DEFAULT_CONFIG = {
  agents: [
    {
      name: 'claude-code',
      type: 'mcp',
      enabled: true,
      connection: {
        command: 'npx',
        args: ['@anthropic-ai/mcp-server-claude-code'],
        env: {}
      }
    },
    {
      name: 'qwen-coder',
      type: 'mcp',
      enabled: true,
      connection: {
        command: 'npx',
        args: ['@qwen/mcp-server-qwen-coder'],
        env: {}
      }
    }
  ],
  aggregator: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  }
};

/**
 * Load configuration from file or return default
 * 
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig() {
  try {
    // Try to load from config file
    const configPath = join(__dirname, '../../config/agents.json');
    const configData = await readFile(configPath, 'utf-8');
    const fileConfig = JSON.parse(configData);
    
    console.error('Loaded configuration from file:', configPath);
    return mergeConfig(DEFAULT_CONFIG, fileConfig);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('No config file found, using default configuration');
    } else {
      console.error('Error loading config file, falling back to default:', error.message);
    }
    
    return applyEnvironmentOverrides(DEFAULT_CONFIG);
  }
}

/**
 * Merge file configuration with defaults
 * 
 * @param {Object} defaultConfig - Default configuration
 * @param {Object} fileConfig - Configuration from file
 * @returns {Object} Merged configuration
 */
function mergeConfig(defaultConfig, fileConfig) {
  const merged = { ...defaultConfig };
  
  if (fileConfig.agents) {
    merged.agents = fileConfig.agents;
  }
  
  if (fileConfig.aggregator) {
    merged.aggregator = { ...defaultConfig.aggregator, ...fileConfig.aggregator };
  }
  
  return applyEnvironmentOverrides(merged);
}

/**
 * Apply environment variable overrides
 * 
 * @param {Object} config - Base configuration
 * @returns {Object} Configuration with environment overrides
 */
function applyEnvironmentOverrides(config) {
  const result = { ...config };
  
  // Override timeout if specified
  if (process.env.AGGREGATOR_TIMEOUT) {
    result.aggregator.timeout = parseInt(process.env.AGGREGATOR_TIMEOUT);
  }
  
  // Override retry attempts if specified
  if (process.env.AGGREGATOR_RETRY_ATTEMPTS) {
    result.aggregator.retryAttempts = parseInt(process.env.AGGREGATOR_RETRY_ATTEMPTS);
  }
  
  return result;
}

export { loadConfig };