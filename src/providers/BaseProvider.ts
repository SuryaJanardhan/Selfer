import { Message, ProviderChunk, ToolDefinition } from '../types/index.js';

export abstract class BaseProvider {
  abstract name: string;
  
  abstract chat(
    messages: Message[],
    tools?: ToolDefinition[]
  ): AsyncGenerator<ProviderChunk>;

  abstract checkConnection(): Promise<boolean>;
}
