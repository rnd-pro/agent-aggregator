# Agent Aggregator

MCP Server that aggregates tools from multiple MCP servers, acting as a proxy to provide unified access to various AI agents and tools.

## 🎯 Features

- **Multi-Agent Aggregation**: Connects to multiple MCP servers simultaneously
- **Unified Tool Interface**: Exposes all tools through a single MCP interface
- **Dynamic Configuration**: Supports runtime configuration of connected agents
- **Error Handling**: Robust error handling and connection management
- **Modern Node.js**: Built with ES modules and modern JavaScript features

## 📁 Project Structure

```
AgentAggregator/
├── src/
│   ├── index.js                 # Main MCP server entry point
│   ├── aggregator/
│   │   ├── AgentAggregator.js   # Core aggregation logic
│   │   └── MCPConnection.js     # Individual MCP server connection
│   └── config/
│       └── ConfigLoader.js      # Configuration management
├── config/
│   └── agents.json             # Agent configuration file
├── tests/
│   ├── integration.test.js     # Integration tests
│   └── mock-mcp-server.js      # Mock MCP server for testing
├── scripts/
│   └── test-server.js          # Manual server testing script
└── docs/                       # Documentation
```

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd AgentAggregator

# Install dependencies
npm install
```

### Configuration

Edit `config/agents.json` to configure which MCP servers to connect to:

```json
{
  "agents": [
    {
      "name": "claude-code",
      "type": "mcp",
      "enabled": true,
      "description": "Claude Code MCP server",
      "connection": {
        "command": "npx",
        "args": ["@anthropic-ai/mcp-server-claude-code"],
        "env": {}
      }
    }
  ],
  "aggregator": {
    "timeout": 30000,
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

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
      "command": "node",
      "args": ["/path/to/AgentAggregator/src/index.js"]
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
│   (Cursor)      │    │   (This Server)  │    │  (Claude Code)  │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │    ┌─────────────────┐
                       │                  │────│  MCP Server 2   │
                       │                  │    │  (Qwen Coder)   │
                       └──────────────────┘    └─────────────────┘
```

The Agent Aggregator:
1. Connects to multiple downstream MCP servers
2. Aggregates their tools into a unified list
3. Routes tool calls to the appropriate server
4. Returns results back to the client

## 🧪 Testing

```bash
# Run all integration tests
npm test

# Test the MCP server directly
npm run test:server

# Test with MCP inspector
npx @modelcontextprotocol/inspector node src/index.js
```

## 🛠️ Development

### Code Style

- ✅ Modern ES modules (no TypeScript)
- ✅ JSDoc documentation in English
- ✅ English code comments
- ✅ Modular file structure
- ✅ Comprehensive error handling

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
  }
}
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

## 📄 License

MIT License - see LICENSE file for details.