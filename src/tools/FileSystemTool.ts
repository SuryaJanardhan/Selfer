import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FileSystemTool {
  static getDefinitions() {
    return [
      {
        name: 'get_working_directory',
        description: 'Get the current working directory of the agent',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory. Use this when the user asks what is in a folder or to see available files.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to list (use "." for current directory)' },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files using a name pattern. Useful for finding files when the path is unknown.',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Search pattern (e.g., "*.txt")' },
            root: { type: 'string', description: 'Root directory to start search (default is current directory)' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file. Only use this on files, not directories.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Create a new file or overwrite an existing one with content.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write to the file' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file from the system. USE WITH CAUTION.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file' },
          },
          required: ['path'],
        },
      }
    ];
  }

  async get_working_directory() {
    return process.cwd();
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
      const stats = await fs.stat(args.path);
      if (stats.isDirectory()) {
         return `Error: '${args.path}' is a directory. Use list_directory instead.`;
      }
      const content = await fs.readFile(args.path, 'utf-8');
      return content;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async write_file(args: { path: string, content: string }) {
    try {
      const dir = path.dirname(args.path);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(args.path, args.content, 'utf-8');
      return `File successfully written to ${args.path}`;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async delete_file(args: { path: string }) {
    try {
      await fs.unlink(args.path);
      return `File ${args.path} deleted.`;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async execute(name: string, args: any) {
    switch (name) {
      case 'get_working_directory': return this.get_working_directory();
      case 'list_directory': return this.list_directory(args);
      case 'search_files': return this.search_files(args);
      case 'read_file': return this.read_file(args);
      case 'write_file': return this.write_file(args);
      case 'delete_file': return this.delete_file(args);
      default: return `Tool ${name} not found`;
    }
  }
}
