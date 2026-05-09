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
    // Only add to history if not already there (for initial prompt)
    if (this.messages.length === 0 || this.messages[this.messages.length-1].content !== userInput) {
       this.messages.push({ role: 'user', content: userInput });
    }
    
    let turn = 0;
    while (turn < this.maxTurns) {
      turn++;
      
      let assistantContent = '';
      let toolCalls: ToolCall[] = [];
      
      process.stdout.write(chalk.bold.magenta('\nASSISTANT › '));

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
          process.stdout.write(chalk.yellow(`\n\n[Action: ${chunk.tool_use.name}]`));
          process.stdout.write(chalk.dim(`\nArguments: ${JSON.stringify(chunk.tool_use.arguments)}`));
        }
      }

      if (assistantContent) {
        this.messages.push({ role: 'assistant', content: assistantContent });
      }

      if (toolCalls.length === 0) {
        process.stdout.write('\n');
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
        process.stdout.write(chalk.green(`\n\n[Result: Success]`));
        process.stdout.write(chalk.dim(`\nOutput: ${result.slice(0, 100)}${result.length > 100 ? '...' : ''}\n`));
      }
    }
  }
}
