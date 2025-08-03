# Agent Aggregator

**MCP Server that aggregates tools from multiple MCP servers**, acting as a proxy to provide unified access to various AI agents and tools.

## 🎯 Features

- **Multi-Agent Aggregation**: Connects to multiple MCP servers simultaneously
- **Unified Tool Interface**: Exposes all tools through a single MCP interface
- **AI Model Integration**: Each agent can have an associated AI model via OpenRouter
- **Dynamic Configuration**: Supports runtime configuration of connected agents
- **Error Handling**: Robust error handling and connection management
- **Modern Node.js**: Built with ES modules and modern JavaScript features
- **OpenRouter Support**: Integrated support for AI models through OpenRouter API

## 📁 Project Structure

```
agent-aggregator/
├── src/
│   ├── index.js                 # Main MCP server entry point
│   ├── aggregator/
│   │   ├── AgentAggregator.js   # Core aggregation logic
│   │   ├── MCPConnection.js     # Individual MCP server connection
│   │   └── OpenRouterClient.js  # OpenRouter API integration
│   ├── config/
│   │   └── ConfigLoader.js      # Configuration management
│   └── mcp-servers/            # Custom MCP server implementations
│       ├── README.md           # MCP servers documentation
│       └── qwen_mcp_server.py  # Qwen AI MCP server
├── config/
│   └── agents.json             # Agent configuration file
├── tests/
│   └── integration.test.js     # LIVE integration tests (NO MOCKS)
├── scripts/
│   └── test-server.js          # Manual server testing script
└── docs/                       # Documentation
```

## 🚀 Quick Start

### Installation

```bash
# Install globally from npm
npm install -g agent-aggregator

# Or clone the repository for development
git clone https://github.com/RND-PRO/agent-aggregator.git
cd agent-aggregator

# Install dependencies
npm install
```

### Quick Start with Cursor

1. **Add to Cursor MCP configuration** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "agent-aggregator": {
      "command": "npx",
      "args": ["agent-aggregator"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-api-key",
        "NODE_ENV": "production"
      }
    }
  }
}
```

2. **Set your OpenRouter API key**:
   - Get key from https://openrouter.ai/
   - Replace `your-openrouter-api-key` with actual key

3. **Restart Cursor** and you'll have access to **26 tools**:
   - 14 filesystem operations
   - 7 code analysis tools  
   - 2 AI assistance tools
   - 3 filter management tools

See [CURSOR_INTEGRATION.md](CURSOR_INTEGRATION.md) for full setup guide.

### Configuration

Edit `config/agents.json` to configure which MCP servers to connect to:

```json
{
  "agents": [
    {
      "name": "filesystem",
      "type": "mcp",
      "enabled": true,
      "description": "File system operations server",
      "connection": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        "env": {}
      },
      "model": {
        "provider": "openrouter",
        "name": "qwen/qwen3-coder:free",
        "apiKey": "${OPENROUTER_API_KEY}"
      }
    }
  ],
  "aggregator": {
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "defaults": {
    "model": {
      "provider": "openrouter",
      "name": "qwen/qwen3-coder:free",
      "apiKey": "${OPENROUTER_API_KEY}",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  }
}
```

### Environment Variables

Set up your OpenRouter API key:

```bash
# For current session
export OPENROUTER_API_KEY="sk-or-v1-your-actual-key-here"

# Or create .env file in project root:
echo "OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here" > .env

# For permanent setup (add to ~/.bashrc or ~/.zshrc):
echo 'export OPENROUTER_API_KEY="sk-or-v1-your-actual-key-here"' >> ~/.zshrc
```

**Important:** Never commit your actual API key to version control!

### Running

```bash
# Start the MCP server
npm start

# Test the server
npm run test:server

# Run integration tests
npm test

# Development mode with auto-reload
npm run dev
```

## 🔧 Usage

### As MCP Server

Add to your MCP client configuration (e.g., Cursor):

```json
{
  "mcpServers": {
    "agent-aggregator": {
      "command": "npx",
      "args": ["agent-aggregator"]
    }
  }
}
```

### Supported MCP Servers

Currently configured to work with:
- **Filesystem**: `@modelcontextprotocol/server-filesystem` - File system operations
- **Fetch**: `@modelcontextprotocol/server-fetch` - HTTP requests and web fetching  
- **Claude Code MCP**: `@kunihiros/claude-code-mcp` - Claude Code wrapper (disabled by default)

You can add any MCP server that supports the standard MCP protocol. Popular options include:
- `@modelcontextprotocol/server-github` - GitHub API operations
- `@modelcontextprotocol/server-memory` - Memory management for Claude
- `@playwright/mcp` - Browser automation with Playwright

## 📊 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │────│ Agent Aggregator │────│  MCP Server 1   │
│   (Cursor)      │    │   (This Server)  │    │  (Filesystem)   │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │────│  MCP Server 2   │
                       │                  │    │  (Everything)   │
                       │                  │    └─────────────────┘
                       │                  │    
                       │                  │    ┌─────────────────┐
                       │                  │────│  OpenRouter     │
                       │                  │    │  AI Models      │
                       └──────────────────┘    └─────────────────┘
```

The Agent Aggregator:
1. Connects to multiple downstream MCP servers
2. Aggregates their tools into a unified list
3. Routes tool calls to the appropriate server
4. Provides AI model access via OpenRouter for each agent
5. Returns results back to the client

## 🤖 AI Model Integration

Each MCP server can have an associated AI model that runs via OpenRouter. The default model is `qwen/qwen3-coder:free`.

### Custom Methods

The aggregator provides custom MCP methods for AI interactions:

- `custom/agents/list` - List all available agents and their capabilities
- `custom/model/generate` - Generate text using an agent's model
- `custom/model/chat` - Send chat completion requests
- `custom/models/info` - Get information about all models
- `custom/status` - Get detailed status of all connections

## 🧪 Testing (LIVE TESTING ONLY)

**NO MOCK SCENARIOS** - All tests use real MCP servers and AI models:

```bash
# Run LIVE integration tests with real servers
npm test

# Test the MCP server directly  
npm run test:server

# Test AI models via OpenRouter
npm run test:ai

# Test with MCP inspector
npx @modelcontextprotocol/inspector node src/index.js
```

### Testing Philosophy

- ✅ **Real MCP servers only** - uses @modelcontextprotocol/server-filesystem
- ✅ **Real AI models** - tests with actual OpenRouter API
- ✅ **Live environment variables** - requires OPENROUTER_API_KEY
- ✅ **Comprehensive testing** - covers all functionality end-to-end
- ❌ **No mocks or stubs** - fail fast if services unavailable

### Prerequisites for Testing

1. **Required Environment Variable:**
   ```bash
   export OPENROUTER_API_KEY="sk-or-v1-your-actual-key-here"
   ```

2. **Internet Connection** - tests download and run real MCP servers

3. **Node.js 18+** - required for MCP server packages

4. **Available /tmp directory** - used by filesystem server tests

## 🛠️ Development

### Code Style

- ✅ Modern ES modules (no TypeScript)
- ✅ JSDoc documentation in English
- ✅ English code comments
- ✅ Modular file structure
- ✅ Comprehensive error handling
- ✅ **LIVE TESTING ONLY** - no mock scenarios

### Adding New MCP Servers

1. Add server configuration to `config/agents.json`
2. Ensure the MCP server package is available
3. Test connection with `npm run test:server`

### Extending Functionality

The codebase is designed for easy extension:
- Add new connection types in `MCPConnection.js`
- Extend aggregation logic in `AgentAggregator.js`
- Add new configuration options in `ConfigLoader.js`

## 📝 Configuration Options

### Agent Configuration

```json
{
  "name": "unique-agent-name",
  "type": "mcp",
  "enabled": true,
  "description": "Agent description",
  "connection": {
    "command": "command-to-run",
    "args": ["--arg1", "--arg2"],
    "env": {
      "ENV_VAR": "value"
    }
  },
  "model": {
    "provider": "openrouter",
    "name": "qwen/qwen3-coder:free",
    "apiKey": "${OPENROUTER_API_KEY}"
  }
}
```

### Aggregator Configuration

```json
{
  "aggregator": {
    "timeout": 30000,        // Connection timeout in ms
    "retryAttempts": 3,      // Number of retry attempts
    "retryDelay": 1000,      // Delay between retries in ms
    "concurrentConnections": 2  // Max concurrent connections
  },
  "defaults": {
    "model": {
      "provider": "openrouter",
      "name": "qwen/qwen3-coder:free",
      "apiKey": "${OPENROUTER_API_KEY}",
      "baseUrl": "https://openrouter.ai/api/v1"
    }
  }
}
```

### Available Models

The system uses OpenRouter API which supports many models:
- `qwen/qwen3-coder:free` (default) - Free Qwen 3 Coder model
- `openai/gpt-4o-mini` - OpenAI GPT-4o Mini
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `meta-llama/llama-3.1-8b-instruct:free` - Free Llama model
- And many more - see [OpenRouter Models](https://openrouter.ai/models)
```

## 🔍 Troubleshooting

### Common Issues

1. **"Could not attach to MCP server"**
   - Check that the MCP server package is installed
   - Verify the command and arguments in configuration
   - Ensure the server supports the MCP protocol

2. **"Connection timeout"**
   - Increase timeout in aggregator configuration
   - Check that the MCP server starts properly
   - Verify network connectivity

3. **"Tool not found"**
   - Ensure the downstream MCP server is connected
   - Check tool name prefixing (format: `agent-name__tool-name`)
   - Verify the tool exists in the downstream server

4. **"OpenRouter API error"**
   - Verify your OPENROUTER_API_KEY is set correctly
   - Check that you have credits/access to the specified model
   - Ensure the model name is correct (e.g., `qwen/qwen3-coder:free`)

5. **"No AI model configured"**
   - Add a `model` section to your agent configuration
   - Ensure the model configuration includes provider, name, and apiKey
   - Check that environment variables are properly expanded

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=1 npm start
```

## 🤝 Contributing

1. Follow the established code style
2. Add tests for new functionality
3. Update documentation
4. Test with real MCP servers

## 📚 Documentation

- **[Cursor Integration Guide](CURSOR_INTEGRATION.md)** - How to integrate with Cursor AI
- **[Production Deployment Guide](PRODUCTION_GUIDE.md)** - Production setup for end users
- **[Project Status](PROJECT_STATUS.md)** - Current development status

## 📄 License

MIT License - see LICENSE file for details.