import { BaseProvider } from '../providers/BaseProvider.js';
import { FileSystemTool } from '../tools/FileSystemTool.js';
import { Message, ToolCall, ToolResult } from '../types/index.js';
import chalk from 'chalk';

export class ThinkingCore {
  private messages: Message[] = [];
  private provider: BaseProvider;
  private tools: FileSystemTool;
  private maxTurns = 10;

  constructor(provider: BaseProvider) {
    this.provider = provider;
    this.tools = new FileSystemTool();
  }

  async process(userInput: string) {
    this.messages.push({ role: 'user', content: userInput });
    
    let turn = 0;
    while (turn < this.maxTurns) {
      turn++;
      console.log(chalk.blue(`\n--- Turn ${turn} ---`));
      
      let assistantContent = '';
      let toolCalls: ToolCall[] = [];
      
      const stream = this.provider.chat(
        this.messages,
        FileSystemTool.getDefinitions() as any
      );

      for await (const chunk of stream) {
        if (chunk.content) {
          assistantContent += chunk.content;
          process.stdout.write(chunk.content);
        }
        if (chunk.tool_use) {
          toolCalls.push(chunk.tool_use);
          console.log(chalk.yellow(`\n[Tool Call] ${chunk.tool_use.name}(${JSON.stringify(chunk.tool_use.arguments)})`));
        }
      }

      if (assistantContent) {
        this.messages.push({ role: 'assistant', content: assistantContent });
      }

      if (toolCalls.length === 0) {
        // No more tool calls, we are done
        break;
      }

      // Execute tools
      for (const tc of toolCalls) {
        const result = await this.tools.execute(tc.name, tc.arguments);
        this.messages.push({
          role: 'tool',
          tool_use_id: tc.id,
          name: tc.name,
          content: result
        });
        console.log(chalk.green(`\n[Tool Result] ${tc.name} executed.`));
      }
    }
  }
}
