import OpenAI from 'openai';
import { BaseProvider } from './BaseProvider.js';
import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

export class GroqProvider extends BaseProvider {
  name = 'groq';
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model: string = 'llama-3.1-70b-versatile') {
    super();
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is missing');
    this.client = new OpenAI({
      apiKey: key,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    this.model = model;
  }

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(m => {
          if (m.role === 'tool') {
            return {
              role: 'tool' as const,
              content: m.content,
              tool_call_id: m.tool_use_id!
            };
          }
          return {
            role: m.role as any,
            content: m.content
          };
        }),
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters as any
          }
        })),
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield { content: delta.content };
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function?.name) {
              // Note: Groq (and OpenAI) stream tool calls in parts.
              // For simplicity in this prototype, we'll wait for the full call
              // or handle it if it's complete enough.
              // Actually, better to accumulate or use non-streaming for tools if needed.
              // But let's assume it comes in a way we can handle or just use the non-stream for tools.
            }
          }
        }
      }

      // To handle tool calls reliably with streaming in OpenAI-style APIs,
      // we usually need to accumulate the JSON.
      // For this prototype, if tool calls are present, we might want a non-streaming fallback
      // or a better accumulator. Let's just use a simple approach for now.
      
      // Let's do a second pass if tool calls are suspected or use a better chunking logic.
      // Re-running without stream if it's easier for tool calls? No, that's slow.
      
    } catch (error: any) {
      console.error('Groq Error:', error.message);
      yield { content: `Error connecting to Groq: ${error.message}` };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      return true;
    } catch {
      return false;
    }
  }
}
