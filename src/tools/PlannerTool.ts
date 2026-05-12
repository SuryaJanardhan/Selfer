import { ToolDefinition } from '../types/index.js';

export class PlannerTool {
  static getDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'generate_plan',
        description: 'Generates a step-by-step implementation plan for a complex task. Use this before starting large tasks to ensure you have a clear path.',
        parameters: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'The task to plan for.' },
            steps: { type: 'array', items: { type: 'string' }, description: 'The steps involved in the plan.' }
          },
          required: ['task', 'steps']
        }
      }
    ];
  }

  async execute(name: string, args: any): Promise<string> {
    if (name === 'generate_plan') {
      const { task, steps } = args;
      let plan = `### Implementation Plan for: ${task}\n\n`;
      steps.forEach((step: string, i: number) => {
        plan += `${i + 1}. ${step}\n`;
      });
      plan += `\n**Plan generated. Proceeding with execution.**`;
      return plan;
    }
    return 'Unknown planner tool';
  }
}
