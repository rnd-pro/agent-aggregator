# Custom MCP Servers

This directory contains custom MCP (Model Context Protocol) server implementations.

## Available Servers

### qwen_mcp_server.py
- **Description**: Simple Qwen MCP server for AI chat and code generation
- **Language**: Python 3
- **Tools provided**:
  - `qwen_chat`: Chat with Qwen AI model
  - `qwen_code`: Generate code with Qwen AI

## Usage

These servers are automatically launched by the Agent Aggregator based on the configuration in `config/agents.json`.

### Running manually for testing:

```bash
# Test Qwen MCP server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | python3 src/mcp-servers/qwen_mcp_server.py
```

## Adding New Servers

1. Create your MCP server script in this directory
2. Ensure it implements the MCP protocol correctly:
   - `initialize` method
   - `tools/list` method  
   - `tools/call` method
3. Add configuration to `config/agents.json`
4. Update this README with server information

## Dependencies

- Python 3.x
- Required Python packages are listed in the individual server files