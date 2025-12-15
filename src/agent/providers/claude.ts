import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ConversationMessage } from './base.js';
import { logger } from '../../utils/logger.js';

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string, maxTokens: number = 4096) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async chat(messages: ConversationMessage[], systemPrompt: string, tools?: any[]): Promise<string | any> {
    try {
      // Convert to Anthropic message format
      const anthropicMessages: Anthropic.MessageParam[] = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolUseBlockParam | Anthropic.ToolResultBlockParam>,
      }));

      logger.info(`Sending message to Claude (${this.model})`);

      const params: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: anthropicMessages,
      };

      if (tools && tools.length > 0) {
        params.tools = tools.map(t => ({
          name: t.name,
          description: t.description || '',
          input_schema: t.inputSchema
        }));
      }

      const response = await this.client.messages.create(params);

      // Check for tool use
      const toolUseBlock = response.content.find(block => block.type === 'tool_use');
      if (toolUseBlock) {
        logger.info('Claude requested tool execution');
        return toolUseBlock; // Return the raw tool use block
      }

      // Extract text from response
      const assistantMessage = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('\n');

      logger.info('Received response from Claude');
      return assistantMessage;
    } catch (error) {
      logger.error('Error communicating with Claude:', error);
      throw new Error(`Claude API error: ${error}`);
    }
  }

  getProviderName(): string {
    return 'Claude (Anthropic)';
  }
}