import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ConversationMessage } from './base.js';
import { logger } from '../../utils/logger.js';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async chat(messages: ConversationMessage[], systemPrompt: string, tools?: any[]): Promise<string | any> {
    try {
      logger.info(`Sending message to Gemini (${this.model})`);

      const modelParams: any = {
        model: this.model,
        systemInstruction: systemPrompt,
      };

      if (tools && tools.length > 0) {
        modelParams.tools = [{
          functionDeclarations: tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.inputSchema
          }))
        }];
      }

      const genModel = this.client.getGenerativeModel(modelParams);

      // Convert conversation history to Gemini format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
      }));

      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Create chat session with history
      const chat = genModel.startChat({
        history: history,
      });

      // Send the last message
      const result = await chat.sendMessage(typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content));
      const response = result.response;

      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        logger.info('Gemini requested tool execution');
        return {
          name: call.name,
          input: call.args,
          id: 'gemini_call_' + Date.now()
        };
      }

      const text = response.text();
      logger.info('Received response from Gemini');
      return text;
    } catch (error) {
      logger.error('Error communicating with Gemini:', error);
      throw new Error(`Gemini API error: ${error}`);
    }
  }

  getProviderName(): string {
    return 'Gemini (Google)';
  }
}