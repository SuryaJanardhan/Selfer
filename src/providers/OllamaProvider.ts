import axios from 'axios';
import { BaseProvider } from './BaseProvider.js';
import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';
import chalk from 'chalk';

export class OllamaProvider extends BaseProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(model: string = 'qwen2.5-coder:latest', baseUrl: string = 'http://localhost:11434') {
    super();
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderChunk> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: this.model,
        messages: messages.map(m => ({
          role: m.role === 'tool' ? 'tool' : m.role,
          content: m.content,
          tool_call_id: m.tool_use_id,
        })),
        tools: tools?.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        stream: true,
      }, {
        responseType: 'stream'
      });

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const data = JSON.parse(line);
          
          if (data.message?.content) {
            // Check if the content contains a JSON tool call
            const content = data.message.content;
            yield { content };

            // Look for JSON patterns like {"name": "...", "arguments": {...}}
            // Some models wrap in code blocks, others don't.
            if (content.includes('{"name":') && content.includes('"arguments":')) {
              try {
                // Try to extract JSON from the string
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const json = JSON.parse(jsonMatch[0]);
                  if (json.name && json.arguments) {
                    yield {
                      tool_use: {
                        id: `tc-json-${Math.random().toString(36).substr(2, 9)}`,
                        name: json.name,
                        arguments: json.arguments,
                      }
                    };
                  }
                }
              } catch {
                // Not a valid JSON tool call, just ignore
              }
            }
          }
          
          if (data.message?.tool_calls) {
            for (const tc of data.message.tool_calls) {
              yield {
                tool_use: {
                  id: tc.id || `tc-${Math.random().toString(36).substr(2, 9)}`,
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                }
              };
            }
          }
          
          if (data.done) {
            yield { done: true };
          }
        }
      }
    } catch (error: any) {
      if (error.response) {
        // Log status and data if available
        console.error(`Ollama Error [${error.response.status}]:`, error.response.data?.error || error.response.data);
      } else {
        console.error('Ollama Error:', error.message);
      }
      yield { content: `Error connecting to Ollama: ${error.message}` };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      const exists = models.some((m: any) => m.name === this.model || m.name.startsWith(this.model + ':'));
      if (!exists) {
        console.warn(chalk.yellow(`Warning: Model "${this.model}" not found in Ollama tags. Available: ${models.map((m: any) => m.name).join(', ')}`));
      }
      return true;
    } catch {
      return false;
    }
  }
}
