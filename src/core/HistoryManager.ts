import fs from 'fs';
import path from 'path';
import os from 'os';
import { History, Message } from '../types/index.js';

export class HistoryManager {
  private configDir: string;
  private historyPath: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.selfer');
    this.historyPath = path.join(this.configDir, 'history.json');
    this.ensureDir();
  }

  private ensureDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  load(): History {
    if (!fs.existsSync(this.historyPath)) {
      return { messages: [] };
    }
    try {
      const data = fs.readFileSync(this.historyPath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load history:', e);
      return { messages: [] };
    }
  }

  save(history: History) {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  clear() {
    if (fs.existsSync(this.historyPath)) {
      fs.unlinkSync(this.historyPath);
    }
  }

  setSystemPrompt(prompt: string) {
    const history = this.load();
    history.systemPrompt = prompt;
    this.save(history);
  }

  getSystemPrompt(): string | undefined {
    return this.load().systemPrompt;
  }
}
