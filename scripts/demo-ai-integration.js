#!/usr/bin/env node

/**
 * Demo script showing AI integration capabilities
 * 
 * This script demonstrates how each MCP agent can use AI models
 * for intelligent responses and code generation.
 */

import { AgentAggregator } from '../src/aggregator/AgentAggregator.js';
import { loadConfig } from '../src/config/ConfigLoader.js';

async function runDemo() {
  console.log('🚀 Agent Aggregator AI Integration Demo\n');
  
  try {
    // Load configuration and initialize aggregator
    console.log('📋 Loading configuration...');
    const config = await loadConfig();
    
    console.log('🔗 Initializing Agent Aggregator...');
    const aggregator = new AgentAggregator(config);
    await aggregator.initialize();
    
    const status = aggregator.getStatus();
    console.log(`✅ Initialized with ${status.totalConnections} agents\n`);
    
    // List available agents
    console.log('📝 Available agents:');
    const agents = aggregator.getAgentsList();
    agents.forEach(agent => {
      const modelStatus = agent.hasModel ? '🤖' : '❌';
      console.log(`  ${modelStatus} ${agent.name}: ${agent.description}`);
      if (agent.hasModel) {
        console.log(`     Model: ${agent.modelName}`);
      }
    });
    
    console.log();
    
    // Test AI generation with each agent
    for (const agent of agents) {
      if (agent.connected && agent.hasModel) {
        console.log(`🧪 Testing AI model for agent: ${agent.name}`);
        
        try {
          const prompt = `You are the ${agent.name} agent. Introduce yourself in one sentence and explain what you can do.`;
          
          console.log(`   Prompt: "${prompt}"`);
          const response = await aggregator.generateText(agent.name, prompt, {
            maxTokens: 100,
            temperature: 0.7
          });
          
          console.log(`   🤖 Response: ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);
          console.log();
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          console.log();
        }
      }
    }
    
    // Demonstrate chat completion
    console.log('💬 Testing chat completion with filesystem agent...');
    try {
      const messages = [
        {
          role: 'user',
          content: 'Write a simple bash script that lists all .txt files in a directory'
        }
      ];
      
      const chatResponse = await aggregator.chatCompletion('filesystem', messages, {
        maxTokens: 150
      });
      
      if (chatResponse.choices && chatResponse.choices[0]) {
        console.log('🤖 Chat response:');
        console.log(chatResponse.choices[0].message.content);
      }
      
    } catch (error) {
      console.log(`❌ Chat error: ${error.message}`);
    }
    
    console.log();
    
    // Show model information
    console.log('📊 Model information:');
    const modelInfo = await aggregator.getModelInfo();
    
    Object.entries(modelInfo).forEach(([agentName, info]) => {
      console.log(`  ${agentName}:`);
      if (info.hasModel) {
        console.log(`    Model: ${info.modelConfig.name}`);
        console.log(`    Provider: ${info.modelConfig.provider}`);
        if (info.modelDetails) {
          console.log(`    Context Length: ${info.modelDetails.context_length || 'Unknown'}`);
          console.log(`    Pricing: ${JSON.stringify(info.modelDetails.pricing)}`);
        }
      } else {
        console.log(`    No model configured`);
      }
      console.log();
    });
    
    // Cleanup
    await aggregator.cleanup();
    console.log('🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});