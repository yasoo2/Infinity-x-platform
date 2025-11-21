import { BaseTool } from './ToolsSystem.mjs';

/**
 * Planner Tool - The strategic brain of JOEngine AGI.
 *
 * Responsibilities:
 * - Deconstructs complex tasks into logical, actionable steps.
 * - Selects the most appropriate tools for each step.
 * - Generates a structured, executable plan.
 */
export class PlannerTool extends BaseTool {
  constructor() {
    super(
      'planner',
      'Analyzes a complex task and creates a step-by-step execution plan using available tools.',
      {
        task: {
          type: 'string',
          required: true,
          description: 'The complex task to be planned.'
        },
        context: {
          type: 'string',
          required: false,
          description: 'Optional context about the current state or environment.'
        }
      }
    );
  }

  /**
   * Generates a plan for a given task.
   */
  async execute({ task, context }) {
    console.log(`🧠 Planning task: "${task}"`);

    const lowerCaseTask = task.toLowerCase();
    let plan = [];

    // This is a simplified, rule-based planner. 
    // A real implementation would use an LLM to generate the plan.
    if ((lowerCaseTask.includes('write') && lowerCaseTask.includes('file')) || lowerCaseTask.includes('create a file')) {
        plan = [
            {
                tool: 'file',
                action: 'write',
                params: {
                    path: 'hello_world.js',
                    content: 'console.log("hello world");'
                }
            }
        ];
    } else if (lowerCaseTask.includes('browse') || lowerCaseTask.includes('go to')) {
        plan = [
            {
                tool: 'browser',
                action: 'navigate',
                params: {
                    url: 'https://google.com'
                }
            }
        ];
    }

    console.log(`📄 Generated Plan:`, plan);
    
    return {
      success: true,
      plan: plan,
    };
  }
}

export default PlannerTool;
