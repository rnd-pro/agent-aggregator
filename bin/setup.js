#!/usr/bin/env node

/**
 * Agent Aggregator Setup Script
 * 
 * Interactive setup for new users to configure Agent Aggregator
 * for their system and Cursor integration.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 Agent Aggregator Setup');
  console.log('=' + '='.repeat(50));
  console.log();

  // 1. Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error('❌ Node.js 18+ required. Current version:', nodeVersion);
    process.exit(1);
  }
  
  console.log('✅ Node.js version:', nodeVersion);

  // 2. API Keys configuration
  console.log('\n📝 API Keys Configuration');
  console.log('You need API keys to use AI models:');
  
  const openrouterKey = await question('🔑 OpenRouter API Key (for AI models): ');
  const dashscopeKey = await question('🔑 DashScope API Key (for Qwen, optional): ');

  // 3. Cursor integration
  console.log('\n🎯 Cursor Integration');
  const setupCursor = await question('Setup Cursor integration? (y/N): ');
  
  if (setupCursor.toLowerCase() === 'y') {
    await setupCursorIntegration(openrouterKey, dashscopeKey);
  }

  // 4. Configuration file
  await createUserConfig(openrouterKey, dashscopeKey);

  console.log('\n✅ Setup completed successfully!');
  console.log('\n📚 Next steps:');
  console.log('1. Restart Cursor (if you set up integration)');
  console.log('2. Test the setup: npx @agent-aggregator/core');
  console.log('3. Check documentation for advanced configuration');
  
  rl.close();
}

async function setupCursorIntegration(openrouterKey, dashscopeKey) {
  const cursorDir = join(homedir(), '.cursor');
  const mcpConfigPath = join(cursorDir, 'mcp.json');
  
  // Create .cursor directory if it doesn't exist
  if (!existsSync(cursorDir)) {
    mkdirSync(cursorDir, { recursive: true });
    console.log('📁 Created .cursor directory');
  }

  // Get package installation path
  const packagePath = process.cwd();
  
  const mcpConfig = {
    mcpServers: {
      "agent-aggregator": {
        command: "npx",
        args: ["@agent-aggregator/core"],
        env: {
          OPENROUTER_API_KEY: openrouterKey,
          DASHSCOPE_API_KEY: dashscopeKey || "${DASHSCOPE_API_KEY}"
        }
      }
    }
  };

  // If mcp.json exists, merge with existing config
  if (existsSync(mcpConfigPath)) {
    try {
      const existingConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8'));
      existingConfig.mcpServers = existingConfig.mcpServers || {};
      existingConfig.mcpServers["agent-aggregator"] = mcpConfig.mcpServers["agent-aggregator"];
      mcpConfig.mcpServers = existingConfig.mcpServers;
    } catch (error) {
      console.warn('⚠️  Could not parse existing mcp.json, creating new one');
    }
  }

  writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
  console.log('✅ Cursor MCP configuration updated');
  console.log('📍 Config file:', mcpConfigPath);
}

async function createUserConfig(openrouterKey, dashscopeKey) {
  const configDir = join(homedir(), '.agent-aggregator');
  const configPath = join(configDir, 'config.json');
  
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const userConfig = {
    version: "1.0.0",
    apiKeys: {
      openrouter: openrouterKey,
      dashscope: dashscopeKey || null
    },
    agents: {
      filesystem: { enabled: true },
      "claude-code-mcp": { enabled: true },
      "qwen-mcp": { enabled: !!dashscopeKey }
    },
    createdAt: new Date().toISOString()
  };

  writeFileSync(configPath, JSON.stringify(userConfig, null, 2));
  console.log('✅ User configuration saved to:', configPath);
}

main().catch(console.error);