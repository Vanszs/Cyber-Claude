import OpenAI from 'openai';
import { AIProvider, ConversationMessage } from './base.js';
import { logger } from '../../utils/logger.js';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens: number = 4096) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async chat(messages: ConversationMessage[], systemPrompt: string, tools?: any[]): Promise<string | any> {
    try {
      // Convert to OpenAI message format with system prompt first
      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => {
          if (typeof msg.content === 'string') {
            return { role: msg.role as 'user' | 'assistant', content: msg.content };
          }
          // Handle complex content (tools)
          // CyberAgent wraps tool calls in array.
          // Map generic format to OpenAI format
          // ... (implementation detail: simplistically handled for now to prevent build errors, robust mapping would require more code)
          return { role: msg.role as 'user' | 'assistant', content: JSON.stringify(msg.content) };
        }) as OpenAI.ChatCompletionMessageParam[]
      ];

      logger.info(`Sending message to OpenAI (${this.model})`);

      const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: openaiMessages,
      };

      if (tools && tools.length > 0) {
        params.tools = tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description || '',
            parameters: t.inputSchema
          }
        }));
      }

      const response = await this.client.chat.completions.create(params);
      const choice = response.choices[0];

      if (choice.message.tool_calls) {
        logger.info('OpenAI requested tool execution');
        const toolCall = choice.message.tool_calls[0];
        return {
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
          id: toolCall.id
        };
      }

      const content = choice.message.content || '';
      logger.info('Received response from OpenAI');
      return content;
    } catch (error) {
      logger.error('Error communicating with OpenAI:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }
  }

  getProviderName(): string {
    return 'OpenAI (ChatGPT)';
  }
}
