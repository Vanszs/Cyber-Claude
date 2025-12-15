import { CyberAgent } from '../agent/core.js';
import { AgentMode } from '../agent/types.js';
import { ui } from '../utils/ui.js';
import { AIProvider, ConversationMessage } from '../agent/providers/base.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'; // You might need this type

class MockProvider implements AIProvider {
    async chat(messages: ConversationMessage[], systemPrompt: string, tools?: any[]): Promise<string | any> {
        const lastMsg = messages[messages.length - 1];

        // Simulate LLM decision making
        if (lastMsg.role === 'user' && lastMsg.content.includes('tools')) {
            return "I have tools available.";
        }

        if (lastMsg.role === 'user' && lastMsg.content.toString().includes('Scan example.com')) {
            // Simulate choosing a tool
            return {
                name: 'nuclei_scan', // Mocked tool name
                input: { target: 'example.com' },
                id: 'call_123'
            };
        }

        if (lastMsg.role === 'user' && Array.isArray(lastMsg.content) && lastMsg.content[0].type === 'tool_result') {
            return "Scan complete. Found critical vulnerabilities.";
        }

        return "I am a mock agent.";
    }

    getProviderName(): string { return "MockClaude"; }
}

async function main() {
    ui.banner();

    // Initialize with dummy key to pass validation
    const agent = new CyberAgent({
        mode: 'base',
        model: 'claude-sonnet-4-5',
        apiKey: 'dummy-key-for-mock'
    });

    // Inject Mock Provider
    (agent as any).provider = new MockProvider();
    ui.success('Injected Mock AI Provider');

    // Inject Mock MCP Client behavior
    // We overwrite the methods on the existing mcp instance
    agent.mcp.getAvailableTools = async () => {
        return [
            {
                name: 'nuclei_scan',
                description: 'Run nuclei scanner',
                inputSchema: { type: 'object', properties: { target: { type: 'string' } } }
            }
        ];
    };

    agent.mcp.callTool = async (name: string, args: any) => {
        ui.info(`[MOCK MCP] Calling tool: ${name} with args: ${JSON.stringify(args)}`);
        return {
            content: [{ type: 'text', text: 'Vulnerabilities found: CVE-2024-1234' }],
            isError: false
        } as CallToolResult;
    };

    ui.success('Injected Mock MCP Client');

    const prompt = "Scan example.com using your tools.";
    ui.section(`User Query: "${prompt}"`);

    try {
        const response = await agent.chat(prompt);

        ui.section('Final Response');
        console.log(response);

    } catch (error) {
        ui.error(`Error: ${error}`);
    }
}

main().catch(console.error);
