#!/usr/bin/env node
import { Command } from 'commander';
import { ThinkingCore } from './core/ThinkingCore.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import { AnthropicProvider } from './providers/AnthropicProvider.js';
import { GroqProvider } from './providers/GroqProvider.js';
import { HistoryManager } from './core/HistoryManager.js';
import { ConfigManager } from './core/ConfigManager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import pkg from 'enquirer';
const { prompt } = pkg;

dotenv.config();

function showBanner() {
  console.log(chalk.dim('\nSelfer AI'));
}

async function setupProvider(configManager: ConfigManager) {
  const defaultProvider = configManager.get('defaultProvider');
  
  const response: any = await prompt({
    type: 'select',
    name: 'provider',
    message: 'Choose your AI provider:',
    choices: ['ollama', 'gemini', 'anthropic', 'groq'],
    initial: defaultProvider
  });

  configManager.set('defaultProvider', response.provider);

  if (response.provider === 'ollama') {
    const modelResp: any = await prompt({
      type: 'input',
      name: 'model',
      message: 'Enter Ollama model name:',
      initial: configManager.get('defaultModel') || 'qwen2.5-coder:latest'
    });
    configManager.set('defaultModel', modelResp.model);
    const provider = new OllamaProvider(modelResp.model);
    console.log(chalk.dim('Connecting to Ollama...'));
    if (await provider.checkConnection()) {
      console.log(chalk.green('✔ Connected to Ollama'));
      return provider;
    } else {
      throw new Error('Could not connect to Ollama. Is it running?');
    }
  } else if (response.provider === 'gemini') {
    let apiKey = configManager.getApiKey('gemini') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const keyResp: any = await prompt({
        type: 'password',
        name: 'apiKey',
        message: 'Enter Gemini API Key:'
      });
      apiKey = keyResp.apiKey;
      configManager.setApiKey('gemini', apiKey!);
    }
    const provider = new GeminiProvider(apiKey);
    console.log(chalk.dim('Verifying Gemini API Key...'));
    if (await provider.checkConnection()) {
      console.log(chalk.green('✔ API Key Verified'));
      return provider;
    } else {
      throw new Error('Gemini API verification failed.');
    }
  } else if (response.provider === 'anthropic') {
    let apiKey = configManager.getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const keyResp: any = await prompt({
        type: 'password',
        name: 'apiKey',
        message: 'Enter Anthropic API Key:'
      });
      apiKey = keyResp.apiKey;
      configManager.setApiKey('anthropic', apiKey!);
    }
    const provider = new AnthropicProvider(apiKey);
    console.log(chalk.dim('Verifying Anthropic API Key...'));
    if (await provider.checkConnection()) {
      console.log(chalk.green('✔ API Key Verified'));
      return provider;
    } else {
      throw new Error('Anthropic API verification failed.');
    }
  } else if (response.provider === 'groq') {
    let apiKey = configManager.getApiKey('groq') || process.env.GROQ_API_KEY;
    if (!apiKey) {
      const keyResp: any = await prompt({
        type: 'password',
        name: 'apiKey',
        message: 'Enter Groq API Key:'
      });
      apiKey = keyResp.apiKey;
      configManager.setApiKey('groq', apiKey!);
    }
    const provider = new GroqProvider(apiKey);
    console.log(chalk.dim('Verifying Groq API Key...'));
    if (await provider.checkConnection()) {
      console.log(chalk.green('✔ API Key Verified'));
      return provider;
    } else {
      throw new Error('Groq API verification failed.');
    }
  }
  
  throw new Error('Selected provider not yet implemented or invalid.');
}

async function confirmCommand(command: string): Promise<boolean> {
  const riskyPatterns = [
    /rm\s+/i,
    /mv\s+/i,
    /mkfs/i,
    /dd\s+/i,
    /chmod/i,
    /chown/i,
    /shutdown/i,
    /reboot/i,
    /pkill/i,
    /kill/i,
    />/i, // Redirection
    /\|/i, // Pipes can be complex
  ];

  const isRisky = riskyPatterns.some(pattern => pattern.test(command));
  
  if (!isRisky) {
    console.log(chalk.dim(`\n[Auto-exec] ${command}`));
    return true;
  }

  const resp: any = await prompt({
    type: 'confirm',
    name: 'ok',
    message: chalk.yellow(`\n[Safety Check] Execute potentially risky command: ${chalk.bold(command)}?`),
    initial: false
  });
  return resp.ok;
}

const program = new Command();

program
  .name('selfer')
  .description('Local-aware Linux AI agent')
  .version('0.1.0')
  .argument('[prompt]', 'Initial prompt (optional)')
  .option('-c, --clear', 'Clear history before starting')
  .option('-s, --system <prompt>', 'Set a new system prompt')
  .option('--reset-config', 'Reset all stored configuration and API keys')
  .action(async (initialPrompt, options) => {
    try {
      const historyManager = new HistoryManager();
      const configManager = new ConfigManager();

      if (options.resetConfig) {
        configManager.clear();
        console.log(chalk.yellow('✔ Configuration reset.'));
      }

      if (options.clear) {
        historyManager.clear();
        console.log(chalk.yellow('✔ History cleared.'));
      }

      if (options.system) {
        historyManager.setSystemPrompt(options.system);
        console.log(chalk.yellow(`✔ System prompt updated: ${options.system}`));
      }

      showBanner();
      
      let provider;
      try {
        provider = await setupProvider(configManager);
      } catch (error: any) {
        if (error === '') return; // User cancelled
        console.error(chalk.red(`\n✖ ${error.message}`));
        process.exit(1);
      }

      const core = new ThinkingCore(provider, confirmCommand);
      
      if (initialPrompt) {
        console.log(chalk.bold.blue('\nUser ') + initialPrompt);
        await core.process(initialPrompt);
      } else {
        // Interactive mode
        const loop = async () => {
          try {
            const input: any = await prompt({
              type: 'input',
              name: 'query',
              message: chalk.bold.blue('User'),
            });
            
            const cmd = input.query.toLowerCase().trim();
            if (cmd === 'exit' || cmd === 'quit') {
              console.log(chalk.dim('Goodbye!'));
              process.exit(0);
            }

            if (cmd === '/clear') {
               core.getHistoryManager().clear();
               console.log(chalk.yellow('\n✔ History cleared.'));
               return await loop();
            }

            if (cmd === '/system') {
               const newSys: any = await prompt({
                 type: 'input',
                 name: 'val',
                 message: 'Enter new system prompt:',
                 initial: core.getHistoryManager().getSystemPrompt()
               });
               core.getHistoryManager().setSystemPrompt(newSys.val);
               console.log(chalk.yellow('✔ System prompt updated.'));
               return await loop();
            }

            if (cmd === '/config') {
               const choice: any = await prompt({
                 type: 'select',
                 name: 'action',
                 message: 'Config Actions:',
                 choices: ['Reset All Config', 'Back']
               });
               if (choice.action === 'Reset All Config') {
                 configManager.clear();
                 console.log(chalk.yellow('✔ Configuration reset.'));
               }
               return await loop();
            }

            await core.process(input.query);
            await loop();
          } catch {
            console.log(chalk.dim('\nGoodbye!'));
            process.exit(0);
          }
        };
        await loop();
      }
    } catch (err) {
      process.exit(0);
    }
  });

program.parse();
