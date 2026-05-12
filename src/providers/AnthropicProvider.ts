import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './BaseProvider.js';
import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  private anthropic: Anthropic;
  private model: string;

  constructor(apiKey?: string, model: string = 'claude-3-5-sonnet-20240620') {
    super();
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is missing');
    this.anthropic = new Anthropic({ apiKey: key });
    this.model = model;
  }

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderChunk> {
    try {
      const systemMessage = messages.find(m => m.role === 'system')?.content;
      const history = messages.filter(m => m.role !== 'system').map(m => {
        if (m.role === 'tool') {
           return {
             role: 'user' as const,
             content: [
               {
                 type: 'tool_result' as const,
                 tool_use_id: m.tool_use_id!,
                 content: m.content
               }
             ]
           }
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content
        };
      });

      const options: any = {
        model: this.model,
        max_tokens: 4096,
        system: systemMessage,
        messages: history as any,
        tools: tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as any
        })),
      };

      const stream = this.anthropic.messages.stream(options);

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && (chunk.delta as any).type === 'text_delta') {
          yield { content: (chunk.delta as any).text };
        }
      }

      const message = await stream.finalMessage();
      for (const content of message.content) {
        if ((content as any).type === 'tool_use') {
          const toolUse = content as any;
          yield {
            tool_use: {
              id: toolUse.id,
              name: toolUse.name,
              arguments: toolUse.input
            }
          };
        }
      }

    } catch (error: any) {
      console.error('Anthropic Error:', error.message);
      yield { content: `Error connecting to Anthropic: ${error.message}` };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
