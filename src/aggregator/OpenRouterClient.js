/**
 * OpenRouter API Client
 * 
 * Handles communication with OpenRouter API for AI model interactions
 */

export class OpenRouterClient {
  /**
   * Create OpenRouter client
   * 
   * @param {Object} config - Model configuration
   * @param {string} config.apiKey - OpenRouter API key
   * @param {string} config.baseUrl - OpenRouter base URL
   * @param {string} config.name - Model name (e.g., 'qwen/qwen3-coder:free')
   */
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    this.modelName = config.name;
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    
    if (!this.modelName) {
      throw new Error('Model name is required');
    }
  }

  /**
   * Send completion request to OpenRouter
   * 
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} Response from OpenRouter API
   */
  async createCompletion(messages, options = {}) {
    const requestBody = {
      model: this.modelName,
      messages: messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      ...options
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/ModelContextProtocol/agent-aggregator',
          'X-Title': 'MCP Agent Aggregator'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error connecting to OpenRouter: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Send a simple text prompt to the model
   * 
   * @param {string} prompt - Text prompt to send
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Generated text response
   */
  async generateText(prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.createCompletion(messages, options);
    
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content;
    }
    
    throw new Error('No response generated from OpenRouter');
  }

  /**
   * Test connection to OpenRouter API
   * 
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      await this.generateText('Hello', { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error(`OpenRouter connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get model information from OpenRouter
   * 
   * @returns {Promise<Object>} Model information
   */
  async getModelInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get model info: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Find our specific model in the list
      const model = data.data?.find(m => m.id === this.modelName);
      
      return model || { id: this.modelName, name: 'Unknown Model' };

    } catch (error) {
      console.error(`Failed to get model info: ${error.message}`);
      return { id: this.modelName, name: 'Unknown Model', error: error.message };
    }
  }
}