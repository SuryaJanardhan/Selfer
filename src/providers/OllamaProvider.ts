import { randomUUID } from 'crypto';
import { Ollama } from 'ollama';
import { BaseProvider } from './BaseProvider.js';
import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';
import chalk from 'chalk';

export class OllamaProvider extends BaseProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;
  private client: Ollama;

  constructor(model: string = 'qwen2.5-coder:latest', baseUrl: string = 'http://localhost:11434') {
    super();
    this.model = model;
    this.baseUrl = baseUrl;
    this.client = new Ollama({ host: this.baseUrl });
  }

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderChunk> {
    try {
      const response = await this.client.chat({
        model: this.model,
        messages: messages.map(m => {
          const base = { role: m.role, content: m.content };
          if (m.role !== 'tool') return base;
          const toolName = m.name ?? m.tool_use_id;
          if (!toolName) {
            console.warn('Tool result is missing a name; defaulting to "tool".');
          }
          return {
            ...base,
            tool_name: toolName ?? 'tool',
          };
        }),
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        stream: true,
      });

      const emittedToolCalls = new Set<string>();
      let contentBuffer = '';
      let jsonToolCallEmitted = false;

      for await (const part of response) {
        const message = part.message;
        if (message?.content) {
          const content = message.content;
          contentBuffer += content;
          yield { content };

          if (!jsonToolCallEmitted) {
            const jsonToolCall = this.extractJsonToolCall(contentBuffer);
            if (jsonToolCall) {
              jsonToolCallEmitted = true;
              yield {
                tool_use: {
                  id: `tc-json-${randomUUID()}`,
                  name: jsonToolCall.name,
                  arguments: jsonToolCall.arguments,
                }
              };
            }
          }
        }

        if (message?.tool_calls) {
          for (const tc of message.tool_calls) {
            const name = tc.function?.name;
            if (!name) continue;
            const args = this.normalizeArguments(tc.function?.arguments);
            const key = `${name}:${JSON.stringify(args)}`;
            if (emittedToolCalls.has(key)) continue;
            emittedToolCalls.add(key);
            yield {
              tool_use: {
                id: `tc-${randomUUID()}`,
                name,
                arguments: args,
              }
            };
          }
        }

        if (part.done) {
          yield { done: true };
        }
      }
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Ollama Error:', message);
      yield { content: `Error connecting to Ollama: ${message}` };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.client.list();
      const models = response.models || [];
      const exists = models.some((m: any) => m.name === this.model || m.name.startsWith(this.model + ':'));
      if (!exists) {
        console.warn(chalk.yellow(`Warning: Model "${this.model}" not found in Ollama tags. Available: ${models.map((m: any) => m.name).join(', ')}`));
      }
      return true;
    } catch {
      return false;
    }
  }

  private normalizeArguments(args: unknown) {
    if (typeof args === 'string') {
      const trimmed = args.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return args;
        }
      }
    }
    return args ?? {};
  }

  private extractJsonToolCall(content: string) {
    const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1]?.trim() : this.extractBalancedJson(content);
    if (!candidate) return null;

    try {
      const json = JSON.parse(candidate);
      if (json && typeof json === 'object' && !Array.isArray(json) && typeof json.name === 'string' && Object.hasOwn(json, 'arguments')) {
        return {
          name: json.name,
          arguments: this.normalizeArguments(json.arguments),
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  private extractBalancedJson(content: string) {
    const start = content.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < content.length; i++) {
      const char = content[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      if (depth === 0 && i > start) {
        return content.slice(start, i + 1);
      }
    }
    return null;
  }
}
