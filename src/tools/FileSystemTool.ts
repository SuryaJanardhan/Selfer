import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FileSystemTool {
  static getDefinitions() {
    return [
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to list' },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files using a pattern (glob/regex)',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern' },
            root: { type: 'string', description: 'Root directory to start search' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file' },
          },
          required: ['path'],
        },
      },
    ];
  }

  async list_directory(args: { path: string }) {
    try {
      const items = await fs.readdir(args.path, { withFileTypes: true });
      return JSON.stringify(items.map(i => ({
        name: i.name,
        type: i.isDirectory() ? 'directory' : 'file',
      })), null, 2);
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async search_files(args: { pattern: string, root?: string }) {
    try {
      const root = args.root || '.';
      // Use find command for speed on Linux
      const { stdout } = await execAsync(`find ${root} -name "${args.pattern}" -maxdepth 3`);
      return stdout || 'No matches found.';
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async read_file(args: { path: string }) {
    try {
      const content = await fs.readFile(args.path, 'utf-8');
      return content;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async execute(name: string, args: any) {
    switch (name) {
      case 'list_directory': return this.list_directory(args);
      case 'search_files': return this.search_files(args);
      case 'read_file': return this.read_file(args);
      default: return `Tool ${name} not found`;
    }
  }
}
