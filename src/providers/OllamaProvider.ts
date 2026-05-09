import axios from 'axios';
import { BaseProvider } from './BaseProvider.js';
import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';

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
            yield { content: data.message.content };
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
      console.error('Ollama Error:', error.message);
      yield { content: `Error connecting to Ollama: ${error.message}` };
    }
  }
}
