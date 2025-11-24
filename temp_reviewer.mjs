
import { promises as fs } from 'fs';
import path from 'path';
// The tool exports a default object, so we import the default
import reviewer from './backend/src/tools_refactored/intelligent_reviewer.tool.mjs';

// The actual function is a property on the default export
const { reviewCode } = reviewer;

async function main() {
  try {
    const targetFilePath = path.resolve(process.cwd(), 'backend/src/services/ai/joe-advanced.service.mjs');
    const codeToReview = await fs.readFile(targetFilePath, 'utf-8');

    console.log('--- Submitting code for AI review (best_practices). This may take a moment... ---');

    // Call the review function with the code content
    const result = await reviewCode({
      code: codeToReview,
      language: 'javascript',
      review_type: 'best_practices'
    });

    console.log('--- AI review process finished. ---');

    if (result.success) {
      console.log('--- AI Feedback ---');
      console.log(result.feedback);
      console.log('--- End of Feedback ---');
    } else {
      console.error('AI Review Failed:');
      console.error(result.error);
    }

  } catch (error) {
    console.error('An unexpected error occurred while running the AI review script:', error);
  }
}

main();
