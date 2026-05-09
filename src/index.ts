#!/usr/bin/env node
import { Command } from 'commander';
import { ThinkingCore } from './core/ThinkingCore.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { GeminiProvider } from './providers/GeminiProvider.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import pkg from 'enquirer';
const { prompt } = pkg;

dotenv.config();

function showBanner() {
  console.log(chalk.bold.magenta('\n' + '━'.repeat(50)));
  console.log(chalk.bold.white('   S E L F E R   ') + chalk.dim(' (Local-Aware Linux AI Agent)'));
  console.log(chalk.bold.magenta('━'.repeat(50) + '\n'));
}

async function setupProvider() {
  const response: any = await prompt({
    type: 'select',
    name: 'provider',
    message: 'Choose your AI provider:',
    choices: ['ollama', 'gemini', 'anthropic (coming soon)', 'openai (coming soon)']
  });

  if (response.provider === 'ollama') {
    const modelResp: any = await prompt({
      type: 'input',
      name: 'model',
      message: 'Enter Ollama model name:',
      initial: 'qwen2.5-coder:latest'
    });
    const provider = new OllamaProvider(modelResp.model);
    console.log(chalk.dim('Connecting to Ollama...'));
    if (await provider.checkConnection()) {
      console.log(chalk.green('✔ Connected to Ollama'));
      return provider;
    } else {
      throw new Error('Could not connect to Ollama. Is it running?');
    }
  } else if (response.provider === 'gemini') {
    const keyResp: any = await prompt({
      type: 'password',
      name: 'apiKey',
      message: 'Enter Gemini API Key:'
    });
    const provider = new GeminiProvider(keyResp.apiKey);
    console.log(chalk.dim('Verifying Gemini API Key...'));
    if (await provider.checkConnection()) {
      console.log(chalk.green('✔ API Key Verified'));
      return provider;
    } else {
      throw new Error('Gemini API verification failed.');
    }
  }
  
  throw new Error('Selected provider not yet implemented or invalid.');
}

const program = new Command();

program
  .name('selfer')
  .description('Local-aware Linux AI agent')
  .version('0.1.0')
  .argument('[prompt]', 'Initial prompt (optional)')
  .action(async (initialPrompt) => {
    try {
      showBanner();
      
      let provider;
      try {
        provider = await setupProvider();
      } catch (error: any) {
        if (error === '') return; // User cancelled
        console.error(chalk.red(`\n✖ ${error.message}`));
        process.exit(1);
      }

      const core = new ThinkingCore(provider);
      
      if (initialPrompt) {
        console.log(chalk.bold.cyan('\nUSER › ') + initialPrompt);
        await core.process(initialPrompt);
      } else {
        // Interactive mode
        const loop = async () => {
          try {
            const input: any = await prompt({
              type: 'input',
              name: 'query',
              message: chalk.bold.cyan('SELFER ›'),
            });
            
            if (input.query.toLowerCase() === 'exit' || input.query.toLowerCase() === 'quit') {
              console.log(chalk.dim('Goodbye!'));
              process.exit(0);
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
