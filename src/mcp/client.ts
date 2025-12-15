import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MCP_SERVERS } from './config.js';
import { MCPServerConfig } from './types.js';

export class MCPClient {
  private clients: Map<string, Client>;
  private transports: Map<string, StdioClientTransport>;

  constructor() {
    this.clients = new Map();
    this.transports = new Map();
  }

  async connectAll(): Promise<void> {
    for (const config of MCP_SERVERS) {
      if (config.enabled) {
        try {
          await this.connect(config);
        } catch (error) {
          console.error(`Failed to connect to MCP server ${config.name}:`, error);
        }
      }
    }
  }

  async connect(config: MCPServerConfig): Promise<void> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    });

    const client = new Client({
      name: 'cyber-claude',
      version: '0.4.0',
    }, {
      capabilities: {}
    });

    // Add error handler to prevent crashing on connection errors
    client.onerror = (error) => {
      console.warn(`MCP Client error for ${config.name}:`, error);
    };

    try {
      await client.connect(transport);
      this.clients.set(config.name, client);
      this.transports.set(config.name, transport);
      console.log(`Connected to MCP server: ${config.name}`);
    } catch (error) {
      console.warn(`Failed to connect to MCP server ${config.name}:`, error);
      // Do not rethrow, allow application to continue without this tool
    }
  }

  async getAvailableTools() {
    const allTools: any[] = [];
    for (const [serverName, client] of this.clients.entries()) {
      try {
        const result = await client.listTools();
        const serverTools = result.tools.map(tool => ({
          ...tool,
          name: `${serverName}_${tool.name}`, // Namespacing tools
          originalName: tool.name,
          serverName: serverName
        }));
        allTools.push(...serverTools);
      } catch (error) {
        // Log error but continue
        console.warn(`Failed to list tools for server ${serverName}:`, error);
      }
    }
    return allTools;
  }

  async callTool(toolName: string, args: any): Promise<CallToolResult> {
    // Parse namespaced tool name
    let serverName: string;
    let actualToolName: string;

    if (toolName.includes('_')) {
      const parts = toolName.split('_');
      serverName = parts[0];
      actualToolName = parts.slice(1).join('_');
    } else {
      // Try to find the tool in any client
      for (const [name, client] of this.clients.entries()) {
        try {
          // We can't easily check if a client HAS a tool without listing or trying.
          // Let's try calling it.
          const result = await client.callTool({
            name: toolName,
            arguments: args
          });
          return result as unknown as CallToolResult;
        } catch (e) {
          continue; // Try next client
        }
      }
      throw new Error(`Tool ${toolName} not found in any connected MCP server.`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP Server ${serverName} not found or not connected`);
    }

    return (await client.callTool({
      name: actualToolName,
      arguments: args
    })) as unknown as CallToolResult;
  }

  async disconnectAll(): Promise<void> {
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (e) {
        console.error(`Error closing client ${name}:`, e);
      }
    }
    this.clients.clear();
    this.transports.clear();
  }
}