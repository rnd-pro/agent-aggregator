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
      },
      model: {
        provider: 'openrouter',
        name: 'qwen/qwen3-coder:free',
        apiKey: '${OPENROUTER_API_KEY}'
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
      },
      model: {
        provider: 'openrouter',
        name: 'qwen/qwen3-coder:free',
        apiKey: '${OPENROUTER_API_KEY}'
      }
    }
  ],
  aggregator: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  defaults: {
    model: {
      provider: 'openrouter',
      name: 'qwen/qwen3-coder:free',
      apiKey: '${OPENROUTER_API_KEY}',
      baseUrl: 'https://openrouter.ai/api/v1'
    }
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
    // Apply default model settings to agents that don't have them
    merged.agents = fileConfig.agents.map(agent => {
      if (!agent.model && merged.defaults && merged.defaults.model) {
        return {
          ...agent,
          model: { ...merged.defaults.model }
        };
      }
      return agent;
    });
  }
  
  if (fileConfig.aggregator) {
    merged.aggregator = { ...defaultConfig.aggregator, ...fileConfig.aggregator };
  }
  
  if (fileConfig.defaults) {
    merged.defaults = { ...defaultConfig.defaults, ...fileConfig.defaults };
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
  const result = JSON.parse(JSON.stringify(config)); // Deep clone
  
  // Override timeout if specified
  if (process.env.AGGREGATOR_TIMEOUT) {
    result.aggregator.timeout = parseInt(process.env.AGGREGATOR_TIMEOUT);
  }
  
  // Override retry attempts if specified
  if (process.env.AGGREGATOR_RETRY_ATTEMPTS) {
    result.aggregator.retryAttempts = parseInt(process.env.AGGREGATOR_RETRY_ATTEMPTS);
  }
  
  // Replace environment variable placeholders in model configurations
  if (result.agents) {
    result.agents.forEach(agent => {
      if (agent.model && agent.model.apiKey) {
        agent.model.apiKey = expandEnvironmentVariables(agent.model.apiKey);
      }
    });
  }
  
  if (result.defaults && result.defaults.model && result.defaults.model.apiKey) {
    result.defaults.model.apiKey = expandEnvironmentVariables(result.defaults.model.apiKey);
  }
  
  return result;
}

/**
 * Expand environment variable placeholders in strings
 * 
 * @param {string} str - String with potential ${VAR} placeholders
 * @returns {string} String with expanded variables
 */
function expandEnvironmentVariables(str) {
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
}

export { loadConfig };