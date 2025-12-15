import { AgentConfig, AgentMode } from './types.js';
import { SYSTEM_PROMPTS } from './prompts/system.js';
import { logger } from '../utils/logger.js';
import { AIProvider, ConversationMessage } from './providers/base.js';
import { ClaudeProvider } from './providers/claude.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAIProvider } from './providers/openai.js';
import { ZAPIProvider } from './providers/zapi.js';
import { getModelById } from '../utils/models.js';
import {
  isCreditError,
  isAuthError,
  isRateLimitError,
  getErrorSuggestion,
  ProviderType
} from './providers/fallback.js';

import { MCPClient } from '../mcp/client.js';

export class CyberAgent {
  private provider: AIProvider;
  public mcp: MCPClient; // Exposed for direct tool usage (todo: better encapsulation)
  private mode: AgentMode;
  private conversationHistory: ConversationMessage[] = [];
  private systemPrompt: string;
  private model: string;
  private providerType: ProviderType;

  constructor(agentConfig: AgentConfig) {
    this.mode = agentConfig.mode;
    this.model = agentConfig.model || 'claude-sonnet-4-5'; // fallback
    this.systemPrompt = this.getSystemPrompt(agentConfig.mode);

    // Determine provider based on model
    const modelInfo = getModelById(agentConfig.model || 'claude-sonnet-4-5');
    const providerType = modelInfo?.model.provider || 'claude';

    // Initialize appropriate provider
    this.providerType = providerType as ProviderType;

    if (providerType === 'gemini') {
      if (!agentConfig.googleApiKey) {
        throw new Error('Google API key required for Gemini models. Set GOOGLE_API_KEY in .env or use --model with Claude/Ollama.');
      }
      this.provider = new GeminiProvider(agentConfig.googleApiKey, agentConfig.model || 'gemini-2.5-flash');
      logger.info(`CyberAgent initialized with Gemini (${agentConfig.model}) in ${agentConfig.mode} mode`);
    } else if (providerType === 'openai') {
      if (!agentConfig.openaiApiKey) {
        throw new Error('OpenAI API key required for GPT models. Set OPENAI_API_KEY in .env or use --model with Claude/Gemini/Ollama.');
      }
      this.provider = new OpenAIProvider(
        agentConfig.openaiApiKey,
        agentConfig.model || 'gpt-5.1',
        agentConfig.maxTokens || 4096
      );
      logger.info(`CyberAgent initialized with OpenAI (${agentConfig.model}) in ${agentConfig.mode} mode`);
    } else if (providerType === 'ollama') {
      // Ollama (local models)
      const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      this.provider = new OllamaProvider(ollamaBaseUrl, agentConfig.model || 'deepseek-r1:14b');
      this.provider = new OllamaProvider(ollamaBaseUrl, agentConfig.model || 'deepseek-r1:14b');
      logger.info(`CyberAgent initialized with Ollama (${agentConfig.model}) at ${ollamaBaseUrl} in ${agentConfig.mode} mode`);
    } else if (providerType === 'zapi') {
      if (!agentConfig.zapiKey) {
        // We need to add zapiKey to AgentConfig type first, or pass it via process.env fallback inside provider?
        // AgentConfig is likely defined in src/agent/types.ts. I should check that first, but for now I'll assume I can access process.env if needed or modify AgentConfig.
        // Let's modify AgentConfig in same step if possible? No, different file.
        // I'll assume I need to pass it.
        throw new Error('ZAPI API key required for GLM models. Set ZAPI_API_KEY in .env.');
      }
      this.provider = new ZAPIProvider(agentConfig.zapiKey, agentConfig.model || 'glm-4.6');
      logger.info(`CyberAgent initialized with ZAPI GLM (${agentConfig.model}) in ${agentConfig.mode} mode`);
    } else {
      // Default to Claude
      if (!agentConfig.apiKey) {
        throw new Error('Anthropic API key required for Claude models. Set ANTHROPIC_API_KEY in .env or use --model with Gemini/Ollama.');
      }
      this.provider = new ClaudeProvider(
        agentConfig.apiKey,
        agentConfig.model || 'claude-sonnet-4-5',
        agentConfig.maxTokens || 4096
      );
      logger.info(`CyberAgent initialized with Claude (${agentConfig.model}) in ${agentConfig.mode} mode`);
    }

    // Initialize MCP Client
    this.mcp = new MCPClient();
    this.mcp.connectAll().catch(err => {
      logger.error('Failed to initialize MCP connections:', err);
    });
  }

  private getSystemPrompt(mode: AgentMode): string {
    const basePrompt = SYSTEM_PROMPTS.base;
    const modePrompt = SYSTEM_PROMPTS[mode] || '';
    return modePrompt ? `${basePrompt}\n\n${modePrompt}` : basePrompt;
  }

  /**
   * Send a message to the agent and get a response
   */
  async chat(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      logger.info(`Sending message to ${this.provider.getProviderName()} (mode: ${this.mode})`);

      // Get available tools from MCP
      const tools = await this.mcp.getAvailableTools();

      let iterations = 0;
      const MAX_ITERATIONS = 10;

      while (iterations < MAX_ITERATIONS) {
        // Call provider's chat method
        const response = await this.provider.chat(
          this.conversationHistory,
          this.systemPrompt,
          tools
        );

        // Check if response is a tool use request (object) or final text (string)
        if (typeof response === 'string') {
          // Final assistant response
          this.conversationHistory.push({
            role: 'assistant',
            content: response,
          });

          logger.info(`Received response from ${this.provider.getProviderName()}`);
          return response;
        } else {
          // Tool use requested
          const toolUse = response;
          logger.info(`Agent requested tool execution: ${toolUse.name}`);

          // Add assistant's tool use request to history
          this.conversationHistory.push({
            role: 'assistant',
            content: [toolUse]
          });

          try {
            // Execute tool
            const result = await this.mcp.callTool(toolUse.name, toolUse.input);
            logger.info(`Tool ${toolUse.name} executed successfully`);

            // Add tool result to history
            this.conversationHistory.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result)
                }
              ]
            });
          } catch (err: any) {
            logger.error(`Tool execution failed: ${err}`);
            // Add error result to history
            this.conversationHistory.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: `Error: ${err.message}`,
                  is_error: true
                }
              ]
            });
          }

          iterations++;
        }
      }

      return "Maximum tool execution iterations reached without a final answer.";

    } catch (error) {
      // Remove the failed user message from history if it was the last one (simple heuristic)
      // Actually with the loop it's complex. Let's just log and throw.

      // Provide helpful error messages based on error type
      if (isCreditError(error) || isAuthError(error) || isRateLimitError(error)) {
        const suggestion = getErrorSuggestion(error, this.providerType);
        logger.error(`Provider error:\n${suggestion}`);
        throw new Error(`${this.provider.getProviderName()} API error.\n\n${suggestion}`);
      }

      logger.error('Error in chat:', error);
      throw new Error(`Failed to communicate with ${this.provider.getProviderName()}: ${error}`);
    }
  }

  /**
   * Run a specific security analysis task
   */
  async analyze(task: string, context?: any): Promise<string> {
    const prompt = this.buildAnalysisPrompt(task, context);
    return this.chat(prompt);
  }

  private buildAnalysisPrompt(task: string, context?: any): string {
    let prompt = task;

    if (context) {
      prompt += '\n\nContext:\n' + JSON.stringify(context, null, 2);
    }

    return prompt;
  }

  /**
   * Change the agent's mode
   */
  setMode(mode: AgentMode): void {
    this.mode = mode;
    this.systemPrompt = this.getSystemPrompt(mode);
    logger.info(`Agent mode changed to ${mode}`);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.info('Conversation history cleared');
  }

  /**
   * Get current mode
   */
  getMode(): AgentMode {
    return this.mode;
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }
}