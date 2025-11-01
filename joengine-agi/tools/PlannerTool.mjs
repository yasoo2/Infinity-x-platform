import { BaseTool } from './ToolsSystem.mjs';

/**
 * Planner Tool - أداة التخطيط الذكي لـ JOEngine AGI
 * 
 * المسؤوليات:
 * - تحليل مهمة معقدة وتقسيمها إلى خطوات منطقية.
 * - تحديد الأدوات المطلوبة لكل خطوة.
 * - إرجاع خطة عمل منظمة.
 */
export class PlannerTool extends BaseTool {
  constructor() {
    super(
      'PlannerTool',
      'Analyzes a complex task and breaks it down into a sequence of logical, actionable steps, identifying the necessary tools for each step.',
      {
        task: {
          type: 'string',
          required: true,
          description: 'The complex task description to be planned.'
        }
      }
    );
    this.examples = [
      {
        input: { task: 'Develop a new feature for the website and deploy it.' },
        output: '1. Use SearchTool to research the feature requirements. 2. Use CodeTool to write the code. 3. Use FileTool to save the files. 4. Use GitHubTool to commit and push the changes.'
      }
    ];
  }

  /**
   * تنفيذ التخطيط
   */
  async execute({ task }) {
    this.validateParams({ task });

    // في بيئة AGI حقيقية، سيتم استخدام نموذج لغة كبير (LLM) هنا لإنشاء الخطة.
    // لغرض المحاكاة والتطوير، سنقوم بإنشاء خطة بسيطة.
    
    const plan = [
      `Analyze the task: "${task}"`,
      'Identify the required tools and sub-steps.',
      'Generate a step-by-step execution plan in a numbered list format.',
      'Return the final plan.'
    ];

    return {
      success: true,
      plan: plan.join(' -> ')
    };
  }
}

export default PlannerTool;
