#!/usr/bin/env node

/**
 * Agent Aggregator - Production CLI Entry Point
 * 
 * This script starts the Agent Aggregator MCP server for production use.
 * It can be installed globally via npm and used as a CLI tool.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Check if we're in development or production
const isDev = existsSync(join(projectRoot, 'src', 'index.js'));
const serverPath = isDev ? 
  join(projectRoot, 'src', 'index.js') : 
  join(projectRoot, 'dist', 'index.js');

console.error('🚀 Starting Agent Aggregator MCP Server...');
console.error('📍 Mode:', isDev ? 'Development' : 'Production');
console.error('📍 Server path:', serverPath);

// Start the main MCP server
const serverProcess = spawn('node', [serverPath], {
  cwd: projectRoot,
  stdio: ['inherit', 'inherit', 'inherit'],
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start Agent Aggregator:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.error(`🛑 Agent Aggregator exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.error('🛑 Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.error('🛑 Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});