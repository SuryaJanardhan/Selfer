import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolDefinition } from '../types/index.js';

const execPromise = promisify(exec);

export class ShellTool {
  static getDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'execute_command',
        description: 'Executes a shell command on the local system. Use this for operations like git, npm, or system checks. REQUIRES USER CONFIRMATION.',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'The shell command to execute.' }
          },
          required: ['command']
        }
      }
    ];
  }

  async execute(name: string, args: any): Promise<string> {
    if (name === 'execute_command') {
      const { command } = args;
      try {
        const { stdout, stderr } = await execPromise(command);
        let output = stdout || '';
        if (stderr) {
          output += `\nError output:\n${stderr}`;
        }
        return output || 'Command executed successfully with no output.';
      } catch (error: any) {
        return `Execution failed: ${error.message}`;
      }
    }
    return 'Unknown shell tool';
  }
}
