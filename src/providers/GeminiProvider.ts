import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider.js';
import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    super();
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is missing');
    this.genAI = new GoogleGenerativeAI(key);
  }

  async *chat(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderChunk> {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      tools: tools ? [{ functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters as any,
      })) }] : undefined,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { content: text };
      
      const calls = chunk.functionCalls();
      if (calls) {
        for (const call of calls) {
          yield {
            tool_use: {
              id: `tc-${Math.random().toString(36).substr(2, 9)}`,
              name: call.name,
              arguments: call.args,
            }
          };
        }
      }
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('ping');
      return true;
    } catch {
      return false;
    }
  }
}
