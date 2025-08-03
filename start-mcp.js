#!/usr/bin/env node

/**
 * MCP Server Start Script for Cursor Integration
 * 
 * This script starts the Agent Aggregator as an MCP server
 * for integration with Cursor AI.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.error('🚀 Starting Agent Aggregator MCP Server for Cursor...');
console.error('📍 Working directory:', __dirname);

// Start the main MCP server
const serverProcess = spawn('node', ['src/index.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'inherit', 'inherit'],
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.error(`🛑 MCP server exited with code ${code}`);
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