import { AIProvider, ConversationMessage } from './base.js';
import { logger } from '../../utils/logger.js';

export class ZAPIProvider implements AIProvider {
    private apiKey: string;
    private model: string;
    private maxTokens: number;
    private baseUrl: string = 'https://api.z.ai/api/paas/v4/chat/completions';

    constructor(apiKey: string, model: string, maxTokens: number = 4096) {
        this.apiKey = apiKey;
        this.model = model;
        this.maxTokens = maxTokens;
    }

    async chat(messages: ConversationMessage[], systemPrompt: string, tools?: any[]): Promise<string | any> {
        try {
            // Prepare messages array
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
                }))
            ];

            logger.info(`Sending message to ZAPI GLM (${this.model})`);

            const payload: any = {
                model: this.model,
                messages: apiMessages,
                temperature: 1.0, // Default as per user request
                max_tokens: this.maxTokens
            };

            // Add tool support if tools are provided
            if (tools && tools.length > 0) {
                payload.tools = tools.map(t => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description || '',
                        parameters: t.inputSchema
                    }
                }));
            }

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept-Language': 'en-US,en'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`ZAPI API call failed: ${response.status} ${response.statusText}`);
            }

            const result: any = await response.json();
            const choice = result.choices[0];

            // Check for tool calls
            if (choice.message.tool_calls) {
                logger.info('ZAPI GLM requested tool execution');
                // Map to internal tool format if necessary, or return as is if CyberAgent handles generic format
                // CyberAgent expects: { name: string, input: any, id: string }
                // GLM/OpenAI standard: { id: string, type: 'function', function: { name: string, arguments: string } }

                // We need to support multiple tool calls but CyberAgent loop handles one Object? 
                // CyberAgent loop: `const toolUse = response;` and accesses .name, .input.
                // Let's take the first tool call for now to match current simple loop
                const toolCall = choice.message.tool_calls[0];
                return {
                    name: toolCall.function.name,
                    input: JSON.parse(toolCall.function.arguments),
                    id: toolCall.id
                };
            }

            const assistantMessage = choice.message.content;
            logger.info('Received response from ZAPI GLM');
            return assistantMessage;

        } catch (error) {
            logger.error('Error communicating with ZAPI GLM:', error);
            throw new Error(`ZAPI GLM API error: ${error}`);
        }
    }

    getProviderName(): string {
        return 'ZAPI (GLM)';
    }
}
