#!/usr/bin/env node

/**
 * Test script for Agent Aggregator MCP server
 * 
 * This script tests the MCP server by sending JSON-RPC messages
 * and verifying responses.
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

/**
 * Test the MCP server functionality
 */
async function testMCPServer() {
  console.log('🧪 Testing Agent Aggregator MCP Server');
  
  // Start the MCP server
  const serverProcess = spawn('node', ['src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let testPassed = false;
  let responseData = '';

  // Handle server stderr for debugging
  serverProcess.stderr.on('data', (data) => {
    console.log(`Server log: ${data.toString().trim()}`);
  });

  // Handle server stdout (MCP responses)
  serverProcess.stdout.on('data', (data) => {
    responseData += data.toString();
    
    // Check if we have complete JSON-RPC response
    const lines = responseData.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          console.log('📥 Received response:', JSON.stringify(response, null, 2));
          
          if (response.result && response.result.capabilities) {
            console.log('✅ Server responded with capabilities');
            testPassed = true;
          }
        } catch (error) {
          // Ignore partial JSON
        }
      }
    }
  });

  // Handle process errors
  serverProcess.on('error', (error) => {
    console.error('❌ Server process error:', error);
  });

  // Wait for server to start
  await setTimeout(1000);

  console.log('📤 Sending initialize request...');
  
  // Send initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for response
  await setTimeout(2000);

  // Send list tools request if initialization succeeded
  if (testPassed) {
    console.log('📤 Sending list tools request...');
    
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    await setTimeout(1000);
  }

  // Cleanup
  serverProcess.kill('SIGTERM');
  
  if (testPassed) {
    console.log('\n🎉 MCP Server test passed!');
    process.exit(0);
  } else {
    console.log('\n💥 MCP Server test failed!');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

testMCPServer().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});