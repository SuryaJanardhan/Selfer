import { BaseProvider } from '../providers/BaseProvider.js';
import { FileSystemTool } from '../tools/FileSystemTool.js';
import { PlannerTool } from '../tools/PlannerTool.js';
import { Message, ToolCall, ToolResult } from '../types/index.js';
import { HistoryManager } from './HistoryManager.js';
import chalk from 'chalk';

export class ThinkingCore {
  private messages: Message[] = [];
  private provider: BaseProvider;
  private tools: FileSystemTool;
  private planner: PlannerTool;
  private historyManager: HistoryManager;
  private maxTurns = 15;
  private maxTokens = 12000; // Rough limit for context

  constructor(provider: BaseProvider) {
    this.provider = provider;
    this.tools = new FileSystemTool();
    this.planner = new PlannerTool();
    this.historyManager = new HistoryManager();
    this.loadHistory();
  }

  private loadHistory() {
    const history = this.historyManager.load();
    this.messages = history.messages;
    
    // If we have a system prompt and no messages, or if the first message isn't system
    const systemPrompt = history.systemPrompt || "You are Selfer, a local-aware Linux AI agent. You have access to the file system. Be concise and accurate.";
    
    if (this.messages.length === 0 || this.messages[0].role !== 'system') {
      this.messages.unshift({ role: 'system', content: systemPrompt });
    }
  }

  private async saveHistory() {
    const history = this.historyManager.load();
    history.messages = this.messages;
    this.historyManager.save(history);
  }

  private roughTokenCount(content: string): number {
    return Math.ceil(content.length / 4);
  }

  private manageContext() {
    let currentTokens = this.messages.reduce((acc, msg) => acc + this.roughTokenCount(msg.content), 0);
    
    if (currentTokens > this.maxTokens) {
      console.log(chalk.dim(`\n[System: Compacting history due to context limit...]`));
      // Keep system prompt (index 0) and remove oldest messages after it
      while (currentTokens > this.maxTokens && this.messages.length > 5) {
        const removed = this.messages.splice(1, 1)[0];
        currentTokens -= this.roughTokenCount(removed.content);
      }
    }
  }

  async process(userInput: string) {
    // Only add to history if not already there (for initial prompt)
    if (this.messages.length === 0 || this.messages[this.messages.length-1].content !== userInput) {
       this.messages.push({ role: 'user', content: userInput });
    }
    
    this.manageContext();
    await this.saveHistory();
    
    let turn = 0;
    while (turn < this.maxTurns) {
      turn++;
      
      let assistantContent = '';
      let toolCalls: ToolCall[] = [];
      
      process.stdout.write(chalk.bold.magenta('\nASSISTANT › '));

      const stream = this.provider.chat(
        this.messages,
        [...FileSystemTool.getDefinitions(), ...PlannerTool.getDefinitions()] as any
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
        await this.saveHistory();
      }

      if (toolCalls.length === 0) {
        process.stdout.write('\n');
        break;
      }

      // Execute tools
      for (const tc of toolCalls) {
        let result: string;
        if (tc.name === 'generate_plan') {
           result = await this.planner.execute(tc.name, tc.arguments);
        } else {
           result = await this.tools.execute(tc.name, tc.arguments);
        }
        
        this.messages.push({
          role: 'tool',
          tool_use_id: tc.id,
          name: tc.name,
          content: result
        });
        process.stdout.write(chalk.green(`\n\n[Result: Success]`));
        process.stdout.write(chalk.dim(`\nOutput: ${result.slice(0, 100)}${result.length > 100 ? '...' : ''}\n`));
        await this.saveHistory();
      }
    }
  }

  getHistoryManager() {
    return this.historyManager;
  }
}
