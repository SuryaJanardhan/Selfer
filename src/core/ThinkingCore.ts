import { BaseProvider } from '../providers/BaseProvider.js';
import { FileSystemTool } from '../tools/FileSystemTool.js';
import { PlannerTool } from '../tools/PlannerTool.js';
import { ShellTool } from '../tools/ShellTool.js';
import { WebSearchTool } from '../tools/WebSearchTool.js';
import { Message, ToolCall, ToolResult } from '../types/index.js';
import { HistoryManager } from './HistoryManager.js';
import chalk from 'chalk';

export class ThinkingCore {
  private messages: Message[] = [];
  private provider: BaseProvider;
  private tools: FileSystemTool;
  private planner: PlannerTool;
  private shell: ShellTool;
  private webSearch: WebSearchTool;
  private historyManager: HistoryManager;
  private confirmHandler?: (command: string) => Promise<boolean>;
  private maxTurns = 15;
  private maxTokens = 12000;
  private spinnerInterval?: NodeJS.Timeout;

  constructor(provider: BaseProvider, confirmHandler?: (command: string) => Promise<boolean>) {
    this.provider = provider;
    this.tools = new FileSystemTool();
    this.planner = new PlannerTool();
    this.shell = new ShellTool();
    this.webSearch = new WebSearchTool();
    this.historyManager = new HistoryManager();
    this.confirmHandler = confirmHandler;
    this.loadHistory();
  }

  private loadHistory() {
    const history = this.historyManager.load();
    this.messages = history.messages;
    
    // If we have a system prompt and no messages, or if the first message isn't system
    const defaultSystemPrompt = `You are Selfer, an elite local-aware Linux AI agent. 
You are running on the user's local machine (Elementary OS 8).
Your primary goal is to assist the user with file management, system information, and complex planning.

### CRITICAL RULES:
1. RESPONSE FORMAT: Only provide the direct answer or confirmation of the task. 
2. NO FLUFF: Do not explain what you did, do not provide "next steps", and do not summarize.
3. TOOL USE: Use tools to get facts. Do not hallucinate paths.
4. CONCISENESS: One or two sentences maximum for any response.
5. SHELL: Use 'execute_command' for most bash tasks as requested by the user, except for destructive 'rm -rf' on large directories.

Current Environment: Linux (Elementary OS 8)
`;
    
    const systemPrompt = history.systemPrompt || defaultSystemPrompt;
    
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

  private startSpinner(text: string) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\r' + chalk.cyan(frames[0]) + ' ' + text);
    this.spinnerInterval = setInterval(() => {
      i = (i + 1) % frames.length;
      process.stdout.write('\r' + chalk.cyan(frames[i]) + ' ' + text);
    }, 80);
  }

  private stopSpinner() {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 50) + '\r');
      this.spinnerInterval = undefined;
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
      
      this.startSpinner('Thinking...');

      let stream: any;
      let retries = 3;
      while (retries > 0) {
        try {
          stream = this.provider.chat(
            this.messages,
            [
              ...FileSystemTool.getDefinitions(),
              ...PlannerTool.getDefinitions(),
              ...ShellTool.getDefinitions(),
              ...WebSearchTool.getDefinitions()
            ] as any
          );
          break;
        } catch (e: any) {
          retries--;
          if (retries === 0) throw e;
          process.stdout.write(chalk.yellow(`\n[Retry: ${e.message}. Retrying...]`));
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      for await (const chunk of stream) {
        this.stopSpinner();
        if (chunk.content) {
          assistantContent += chunk.content;
          process.stdout.write(chunk.content);
        }
        if (chunk.tool_use) {
          toolCalls.push(chunk.tool_use);
          process.stdout.write(chalk.dim(`\n\n[${chunk.tool_use.name}]`));
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
        this.startSpinner(`Executing ${tc.name}...`);
        let result: string;
        if (tc.name === 'generate_plan') {
           result = await this.planner.execute(tc.name, tc.arguments);
        } else if (tc.name === 'execute_command') {
           this.stopSpinner();
           if (this.confirmHandler) {
             const confirmed = await this.confirmHandler(tc.arguments.command);
             if (!confirmed) {
               result = 'User rejected command execution.';
             } else {
               result = await this.shell.execute(tc.name, tc.arguments);
             }
           } else {
             result = await this.shell.execute(tc.name, tc.arguments);
           }
        } else if (tc.name === 'web_search') {
           result = await this.webSearch.execute(tc.name, tc.arguments);
        } else {
           result = await this.tools.execute(tc.name, tc.arguments);
        }
        this.stopSpinner();
        
        this.messages.push({
          role: 'tool',
          tool_use_id: tc.id,
          name: tc.name,
          content: result
        });
        await this.saveHistory();
      }
    }
  }

  getHistoryManager() {
    return this.historyManager;
  }
}
