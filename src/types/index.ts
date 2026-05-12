export type Role = 'user' | 'assistant' | 'system' | 'tool' | 'thinking';

export interface Message {
  role: Role;
  content: string;
  tool_use_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  isError?: boolean;
}

export interface ProviderChunk {
  content?: string;
  thinking?: string;
  tool_use?: ToolCall;
  done?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface History {
  messages: Message[];
  systemPrompt?: string;
  lastUsedProvider?: string;
}
