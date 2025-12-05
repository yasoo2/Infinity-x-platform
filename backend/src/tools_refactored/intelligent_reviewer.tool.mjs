import { OpenAI } from 'openai';

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function reviewCode({ code, language, review_type = 'best_practices' }) {
    try {
        if (!client) {
            return { success: false, error: 'AI is disabled.' };
        }
        const prompt = `You are an expert AI Code Reviewer. Your task is to perform a detailed review of the provided ${language} code snippet based on the review type: ${review_type}.

Code to review:
\`\`\`${language}
${code}
\`\`\`

Provide a concise, professional review in Markdown format, focusing on actionable feedback and security/performance issues.`;

        const response = await client.chat.completions.create({
            model: 'gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are an expert AI Code Reviewer.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
        });

        const feedback = response.choices[0].message.content;

        return { success: true, feedback };
    } catch (error) {
        console.error('AI Code Review failed:', error);
        return { success: false, error: `AI Code Review failed: ${error.message}` };
    }
}

// Metadata for Dynamic Discovery
reviewCode.metadata = {
    name: "reviewCode",
    description: "Performs an AI-powered code review on a given code snippet using Gemini 2.5 Flash.",
    parameters: {
        type: "object",
        properties: {
            code: {
                type: "string",
                description: "The raw source code to be reviewed."
            },
            language: {
                type: "string",
                description: "The programming language of the code (e.g., 'javascript', 'python')."
            },
            review_type: {
                type: "string",
                description: "The type of review to perform.",
                enum: ["best_practices", "security_vulnerabilities", "performance_optimization", "documentation_and_clarity"]
            }
        },
        required: ["code", "language", "review_type"]
    }
};

// Export the simplified tool
export default { reviewCode };
