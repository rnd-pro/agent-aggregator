# 🏭 Agent Aggregator - Production Deployment Guide

## 🚀 Quick Start for End Users

### 1. Install via npm (Recommended)

```bash
# Install globally
npm install -g @agent-aggregator/core

# Run interactive setup
agent-aggregator-setup
```

### 2. Manual Setup

If you prefer manual configuration:

```bash
# Clone repository
git clone https://github.com/your-org/agent-aggregator.git
cd agent-aggregator

# Install dependencies
npm install

# Run setup script
npm run setup
```

## 🔧 Configuration

### Required API Keys

You'll need API keys for AI model access:

1. **OpenRouter API Key** (Required)
   - Sign up at [openrouter.ai](https://openrouter.ai)
   - Get your API key from Settings → Keys
   - Used for all AI model interactions

2. **DashScope API Key** (Optional, for Qwen)
   - Sign up at [dashscope.aliyun.com](https://dashscope.aliyun.com)
   - Used specifically for Qwen AI models

### Environment Variables

You can set these in your shell or `.env` file:

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
export DASHSCOPE_API_KEY="your-dashscope-key-here"
```

## 🎯 Cursor Integration

### Automatic Setup
The setup script will automatically configure Cursor:

```bash
agent-aggregator-setup
# Choose "y" when asked about Cursor integration
```

### Manual Cursor Setup

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-aggregator": {
      "command": "npx",
      "args": ["@agent-aggregator/core"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-key",
        "DASHSCOPE_API_KEY": "your-dashscope-key"
      }
    }
  }
}
```

## 🛠️ Available Tools

After setup, Cursor AI will have access to:

### 📁 File Operations (14 tools)
- Read, write, edit files
- Directory navigation
- File search and management

### 🤖 Code Analysis (7 tools)  
- Code explanation and review
- Bug fixing and refactoring
- Test generation
- Command simulation

### 🎭 Qwen AI (2 tools)
- AI chat assistance
- Code generation with Qwen models

## 🔍 Troubleshooting

### Common Issues

**1. "Command not found: agent-aggregator"**
```bash
# Reinstall globally
npm install -g @agent-aggregator/core
```

**2. "API key not working"**
- Check your API keys are valid
- Ensure proper environment variables
- Run setup again: `agent-aggregator-setup`

**3. "Cursor not seeing tools"**
- Restart Cursor completely
- Check `~/.cursor/mcp.json` configuration
- Verify the service is running

### Manual Testing

Test the server manually:
```bash
# Start server (will show initialization logs)
agent-aggregator

# In another terminal, test API
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | agent-aggregator
```

### Logs and Debugging

Enable debug mode:
```bash
DEBUG=agent-aggregator* agent-aggregator
```

Check configuration:
```bash
# View current config
cat ~/.agent-aggregator/config.json

# Re-run setup
agent-aggregator-setup
```

## 📦 Package Distribution

### For Package Maintainers

```bash
# Build for distribution
npm run build

# Publish to npm
npm publish

# Version management
npm version patch  # or minor, major
```

### System Requirements

- **Node.js**: 18.0.0 or higher
- **Operating System**: macOS, Linux, Windows
- **Memory**: 512MB minimum
- **Network**: Internet access for AI API calls

## 🔐 Security Considerations

1. **API Keys**: Store securely, never commit to version control
2. **File Access**: The filesystem server is restricted to allowed directories
3. **Network**: All API calls use HTTPS
4. **Local Only**: The MCP server runs locally, no external server access

## 📚 Advanced Configuration

### Custom Agent Configuration

Edit the configuration file at `~/.agent-aggregator/config.json`:

```json
{
  "agents": {
    "filesystem": { 
      "enabled": true,
      "allowedPaths": ["/tmp", "/Users/username/workspace"]
    },
    "claude-code-mcp": { 
      "enabled": true 
    },
    "qwen-mcp": { 
      "enabled": true,
      "model": "qwen/qwen-max"
    }
  }
}
```

### Performance Tuning

For heavy usage:

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" agent-aggregator

# Enable clustering
CLUSTER_WORKERS=4 agent-aggregator
```

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-org/agent-aggregator/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/agent-aggregator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/agent-aggregator/discussions)