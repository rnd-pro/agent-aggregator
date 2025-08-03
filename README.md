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
│   └── integration.test.js     # Integration tests with real services
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
git clone https://github.com/rnd-pro/agent-aggregator.git
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

3. **Restart Cursor** and you'll have access to **14+ tools** from connected MCP servers:
   - Filesystem operations
   - Code analysis tools  
   - AI assistance tools
   - And more based on your configuration

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
- **Claude Code MCP**: `@kunihiros/claude-code-mcp` - Claude Code wrapper

You can add any MCP server that supports the standard MCP protocol. Popular options include:
- `@modelcontextprotocol/server-github` - GitHub API operations
- `@modelcontextprotocol/server-memory` - Memory management
- `@modelcontextprotocol/server-fetch` - HTTP requests and web fetching

## 📊 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │────│ Agent Aggregator │────│  Filesystem     │
│   (Cursor)      │    │   (This Server)  │    │   MCP Server    │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │────│  Qwen AI        │
                       │                  │    │   MCP Server    │
                       │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │────│  Claude Code    │
                       │                  │    │   MCP Server    │
                       │                  │    └─────────────────┘
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

## 🔍 Debugging

If you encounter issues, you can inspect the MCP server:

```bash
# Debug with MCP inspector
npx @modelcontextprotocol/inspector node src/index.js
```

## 🛠️ Development

For developers who want to extend or contribute:

### Adding New MCP Servers

1. Add server configuration to `config/agents.json`
2. Install the MCP server package
3. Test the connection

### Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes
4. Submit a pull request

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

## 📚 Links

- **[npm Package](https://www.npmjs.com/package/agent-aggregator)** - Install from npm registry
- **[GitHub Repository](https://github.com/rnd-pro/agent-aggregator)** - Source code and issues
- **[OpenRouter API](https://openrouter.ai/)** - Get your API key for AI models

## 📄 License

MIT License