/**
 * Production Configuration Loader
 * 
 * Handles configuration loading for production environments with:
 * - Environment variable substitution
 * - User-specific configuration
 * - Secure defaults
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load production configuration
 * @returns {Object} Loaded and processed configuration
 */
export async function loadProductionConfig() {
  const packageRoot = join(__dirname, '..', '..');
  const userConfigDir = join(homedir(), '.agent-aggregator');
  const userConfigPath = join(userConfigDir, 'config.json');
  
  // Load user configuration if exists
  let userConfig = {};
  if (existsSync(userConfigPath)) {
    try {
      userConfig = JSON.parse(readFileSync(userConfigPath, 'utf8'));
    } catch (error) {
      console.warn('Warning: Could not load user configuration:', error.message);
    }
  }

  // Load base production configuration
  const prodConfigPath = join(packageRoot, 'config', 'agents.production.json');
  let config;
  
  try {
    config = JSON.parse(readFileSync(prodConfigPath, 'utf8'));
  } catch (error) {
    // Fallback to development config
    const devConfigPath = join(packageRoot, 'config', 'agents.json');
    config = JSON.parse(readFileSync(devConfigPath, 'utf8'));
    console.warn('Using development configuration as fallback');
  }

  // Environment variable substitution
  const envVars = {
    OPENROUTER_API_KEY: userConfig.apiKeys?.openrouter || process.env.OPENROUTER_API_KEY,
    DASHSCOPE_API_KEY: userConfig.apiKeys?.dashscope || process.env.DASHSCOPE_API_KEY,
    DEFAULT_MODEL: process.env.DEFAULT_MODEL || config.defaults?.model || 'anthropic/claude-3-haiku',
    QWEN_MODEL: process.env.QWEN_MODEL || config.defaults?.qwenModel || 'qwen/qwen3-coder:free',
    QWEN_ENABLED: (userConfig.agents?.["qwen-mcp"]?.enabled !== false && !!envVars.DASHSCOPE_API_KEY).toString(),
    ALLOWED_PATHS: process.env.ALLOWED_PATHS || config.defaults?.allowedPaths?.join(',') || '/tmp',
    CLAUDE_BIN: process.env.CLAUDE_BIN || '/usr/local/bin/claude',
    PACKAGE_ROOT: packageRoot
  };

  // Process configuration with environment substitution
  const processedConfig = substituteEnvironmentVariables(config, envVars);
  
  // Apply user preferences
  if (userConfig.agents) {
    processedConfig.agents.forEach(agent => {
      const userAgent = userConfig.agents[agent.name];
      if (userAgent) {
        agent.enabled = userAgent.enabled !== false;
      }
    });
  }

  // Validate required API keys
  if (!envVars.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY is required. Run: agent-aggregator-setup');
    process.exit(1);
  }

  console.error('✅ Production configuration loaded');
  console.error('📍 User config:', existsSync(userConfigPath) ? userConfigPath : 'none');
  console.error('📍 Enabled agents:', processedConfig.agents.filter(a => a.enabled).map(a => a.name).join(', '));

  return processedConfig;
}

/**
 * Substitute environment variables in configuration
 * @param {Object} obj - Configuration object
 * @param {Object} envVars - Environment variables
 * @returns {Object} Processed configuration
 */
function substituteEnvironmentVariables(obj, envVars) {
  if (typeof obj === 'string') {
    // Replace ${VAR_NAME} patterns
    return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return envVars[varName] || match;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(item => substituteEnvironmentVariables(item, envVars));
  } else if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvironmentVariables(value, envVars);
    }
    return result;
  }
  return obj;
}