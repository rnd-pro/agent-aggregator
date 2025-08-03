#!/usr/bin/env node

/**
 * Test script for AI model integration via OpenRouter
 * 
 * This script tests the AI model functionality without starting the full MCP server
 */

import { OpenRouterClient } from '../src/aggregator/OpenRouterClient.js';

async function testOpenRouterConnection() {
  console.log('🧪 Testing OpenRouter API connection...\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    console.log('💡 Please set it with: export OPENROUTER_API_KEY="your-key"');
    process.exit(1);
  }

  try {
    // Test with default model
    const client = new OpenRouterClient({
      apiKey: apiKey,
      name: 'qwen/qwen3-coder:free',
      baseUrl: 'https://openrouter.ai/api/v1'
    });

    console.log('🔗 Testing connection...');
    const isConnected = await client.testConnection();
    
    if (isConnected) {
      console.log('✅ OpenRouter connection successful!\n');
      
      // Test text generation
      console.log('🎯 Testing text generation...');
      const response = await client.generateText(
        'Write a simple "Hello, World!" function in JavaScript', 
        { maxTokens: 100 }
      );
      
      console.log('📝 Generated response:');
      console.log(response);
      console.log();
      
      // Test model info
      console.log('📊 Testing model info...');
      const modelInfo = await client.getModelInfo();
      console.log('🤖 Model info:', JSON.stringify(modelInfo, null, 2));
      
      console.log('\n🎉 All tests passed! AI model integration is working correctly.');
      
    } else {
      console.log('❌ OpenRouter connection failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error testing OpenRouter:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check your OPENROUTER_API_KEY is valid');
    console.log('2. Ensure you have credits on your OpenRouter account');
    console.log('3. Verify the model name is correct: qwen/qwen3-coder:free');
    console.log('4. Check your internet connection');
    process.exit(1);
  }
}

async function testMultipleModels() {
  console.log('\n🔄 Testing multiple models...\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  const models = [
    'qwen/qwen3-coder:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'openai/gpt-4o-mini'
  ];
  
  for (const modelName of models) {
    try {
      console.log(`🧪 Testing model: ${modelName}`);
      
      const client = new OpenRouterClient({
        apiKey: apiKey,
        name: modelName
      });
      
      const response = await client.generateText(
        'Say hello in one sentence', 
        { maxTokens: 50 }
      );
      
      console.log(`✅ ${modelName}: ${response.substring(0, 100)}...`);
      
    } catch (error) {
      console.log(`❌ ${modelName}: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Agent Aggregator - AI Models Test\n');
  
  await testOpenRouterConnection();
  
  if (process.argv.includes('--multiple')) {
    await testMultipleModels();
  }
  
  console.log('\n✨ Test completed successfully!');
}

main().catch(error => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});