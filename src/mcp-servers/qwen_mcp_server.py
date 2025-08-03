#!/usr/bin/env python3
"""
Qwen MCP Server using OpenRouter API
Provides Qwen AI tools via unified OpenRouter interface
"""

import json
import sys
import os
import requests
from typing import Dict, Any, List

class QwenMCPServer:
    def __init__(self):
        self.openrouter_key = os.getenv('OPENROUTER_API_KEY')
        self.base_url = "https://openrouter.ai/api/v1"
        self.model = "qwen/qwen3-coder:free"
        
        self.tools = {
            "qwen_chat": {
                "name": "qwen_chat",
                "description": "Chat with Qwen AI model",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Message to send to Qwen"
                        }
                    },
                    "required": ["message"]
                }
            },
            "qwen_code": {
                "name": "qwen_code",
                "description": "Generate code with Qwen AI",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "Code generation prompt"
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language"
                        }
                    },
                    "required": ["prompt"]
                }
            }
        }
    
    def call_openrouter(self, messages, max_tokens=1000):
        """Call OpenRouter API for Qwen model"""
        if not self.openrouter_key:
            return "Error: OPENROUTER_API_KEY not configured"
        
        try:
            headers = {
                "Authorization": f"Bearer {self.openrouter_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.7
            }
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result['choices'][0]['message']['content']
            else:
                return f"Error: OpenRouter API returned {response.status_code}: {response.text}"
                
        except Exception as e:
            return f"Error calling OpenRouter API: {str(e)}"
    
    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming MCP requests"""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "qwen-mcp-server",
                        "version": "1.0.0"
                    }
                }
            }
        
        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "tools": list(self.tools.values())
                }
            }
        
        elif method == "tools/call":
            tool_name = params.get("name")
            args = params.get("arguments", {})
            
            if tool_name == "qwen_chat":
                message = args.get("message", "")
                messages = [{"role": "user", "content": message}]
                result = self.call_openrouter(messages)
                
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": result
                            }
                        ]
                    }
                }
            
            elif tool_name == "qwen_code":
                prompt = args.get("prompt", "")
                language = args.get("language", "python")
                
                code_prompt = f"Generate {language} code for: {prompt}\n\nPlease provide only the code without explanations."
                messages = [{"role": "user", "content": code_prompt}]
                result = self.call_openrouter(messages, max_tokens=1500)
                
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": result
                            }
                        ]
                    }
                }
            
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Unknown tool: {tool_name}"
                    }
                }
        
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Unknown method: {method}"
                }
            }

def main():
    """Main server loop"""
    server = QwenMCPServer()
    
    print("Qwen MCP Server starting...", file=sys.stderr)
    
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            
            try:
                request = json.loads(line.strip())
                response = server.handle_request(request)
                print(json.dumps(response))
                sys.stdout.flush()
            except json.JSONDecodeError:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": "Parse error"
                    }
                }
                print(json.dumps(error_response))
                sys.stdout.flush()
            except Exception as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32603,
                        "message": f"Internal error: {str(e)}"
                    }
                }
                print(json.dumps(error_response))
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        print("Qwen MCP Server shutting down...", file=sys.stderr)

if __name__ == "__main__":
    main()