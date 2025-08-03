# 🚀 Cursor AI Integration Guide

## Overview

Agent Aggregator seamlessly integrates with Cursor AI, providing access to **26 powerful tools** from multiple MCP servers through a unified interface, including advanced filter management capabilities.

## ✅ What's Already Configured

The Agent Aggregator is ready for Cursor integration. Configuration has been created in `~/.cursor/mcp.json`.

## 📋 Final Steps

### 1. Restart Cursor
Close and reopen Cursor to load the new MCP configuration.

### 2. Verify Connection
After restart, Cursor AI will automatically connect to Agent Aggregator and gain access to all tools.

## 🛠️ Available Tools

Once connected, Cursor AI will have access to **26 tools** from 3 servers plus filter management:

### 📁 Filesystem Operations (14 tools)
- `filesystem__read_text_file` - Read file contents
- `filesystem__write_file` - Create/overwrite files
- `filesystem__edit_file` - Edit existing files
- `filesystem__list_directory` - Browse directories
- `filesystem__search_files` - Search for files
- And 9 more file management tools

### 🤖 Claude Code Analysis (7 tools)
- `claude-code-mcp__explain_code` - Code explanation
- `claude-code-mcp__review_code` - Code review
- `claude-code-mcp__fix_code` - Bug fixing
- `claude-code-mcp__edit_code` - Code editing
- `claude-code-mcp__test_code` - Test generation
- `claude-code-mcp__simulate_command` - Command simulation
- `claude-code-mcp__your_own_query` - Custom queries

### 🎭 Qwen AI Assistant (2 tools)
- `qwen-mcp__qwen_chat` - Chat with Qwen AI via OpenRouter
- `qwen-mcp__qwen_code` - Code generation with Qwen via OpenRouter

### 🔧 Filter Management (3 tools)
- `filter__update` - Control tool visibility and filtering
- `filter__get` - View current filter configuration  
- `filter__reset` - Reset filters to show all tools

## 🔧 Configuration

The configuration is located in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-aggregator": {
      "command": "node",
      "args": ["/path/to/AgentAggregator/start-mcp.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-openrouter-api-key",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 🐛 Troubleshooting

### If Cursor doesn't see the tools:

1. **Check Cursor logs**
   - Open Developer Tools in Cursor (Cmd+Option+I)
   - Look for errors in the console

2. **Restart Agent Aggregator**
   ```bash
   cd /path/to/AgentAggregator
   node start-mcp.js
   ```

3. **Verify configuration**
   - Ensure the project path is correct
   - Check environment variables

### If there are connection errors:

1. **Check dependencies**
   ```bash
   npm install
   ```

2. **Manual testing**
   ```bash
   node start-mcp.js
   ```

## ✨ How to Use

After successful integration, simply chat with Cursor AI as usual. The AI will automatically use available tools when needed:

- For file operations → `filesystem__*` tools
- For code analysis → `claude-code-mcp__*` tools  
- For AI assistance → `qwen-mcp__*` tools
- For tool management → `filter__*` tools

### 🔧 Filter Management Examples

**Hide filesystem tools:**
```json
{
  "name": "filter__update",
  "arguments": {
    "excludeServers": ["filesystem"]
  }
}
```

**Show only code-related tools:**
```json
{
  "name": "filter__update", 
  "arguments": {
    "includePatterns": ["code", "explain", "review"]
  }
}
```

**Reset filters:**
```json
{
  "name": "filter__reset",
  "arguments": {}
}
```

Filter settings are automatically saved and persist across restarts.

**Ready! 🎉 Cursor now has access to all 26 Agent Aggregator tools!**