import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-dummy',
});

async function planProjectFiles(description, projectType, requirements) {
    const prompt = `Based on the following description, please plan the file structure for a ${projectType}. 

Description: "${description}"

${requirements}

Provide a JSON object with a "files" array, where each object contains a "path" and a "description" for the file.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You are a senior software architect. Your response MUST be a valid JSON object.'
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
}

async function generateFileContent(description, filePath, fileDescription) {
    const prompt = `Project Description: "${description}"
File: ${filePath}
File Description: ${fileDescription}

Please generate the code for this file. Return ONLY the code, with no explanations.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You are an expert developer. Generate clean, production-ready code. Do not include any markdown formatting.'
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
    });
    return response.choices[0].message.content.trim();
}

export async function generateWebApp(description, features = []) {
    const featuresList = features.length > 0 ? `Features:\n${features.map(f => `- ${f}`).join('\n')}` : '';
    const requirements = `Requirements:\n- Use React with Vite\n- Modern UI with Tailwind CSS\n- Responsive design\n- Clean component structure\n${featuresList}`;
    
    const filePlan = await planProjectFiles(description, 'Web App', requirements);

    const files = {};
    for (const file of filePlan.files) {
        files[file.path] = await generateFileContent(description, file.path, file.description);
    }

    return { files };
}

export async function generateEcommerce(description, products = []) {
    const productsList = products.length > 0 ? `Initial Products:\n${products.map(p => `- ${p}`).join('\n')}` : '';
    const requirements = `Requirements:\n- Modern, professional design\n- Product catalog with search and filters\n- Shopping cart functionality\n- Responsive design (mobile-first)\n- Payment integration ready (Stripe/PayPal)\n- Admin panel for product management\n- Use React + Tailwind CSS\n- Clean, production-ready code\n${productsList}`;

    const filePlan = await planProjectFiles(description, 'E-commerce Store', requirements);

    const files = {};
    for (const file of filePlan.files) {
        files[file.path] = await generateFileContent(description, file.path, file.description);
    }

    return { files };
}

export async function classifyCommand(commandText) {
    const prompt = `Analyze the following user command and classify its intent and required project type.\n\nCommand: "${commandText}"\n\nIntent options:\n- CREATE_PROJECT: The user wants to generate a new project (website, app, store).\n- OTHER_TASK: The user wants to perform a non-project generation task (e.g., search, analyze, fix, ask a question).\n\nProject Type options (only if intent is CREATE_PROJECT):\n- website\n- webapp\n- ecommerce\n\nReturn as JSON with format:\n{\n  "intent": "Intent from the options above",\n  "projectType": "Project Type from the options above (if applicable, otherwise null)",\n  "description": "A concise, refined description of the project or task."\n}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert command classifier. Your response MUST be a valid JSON object.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 500,
            response_format: { type: 'json_object' }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('AI Engine Error (classifyCommand):', error);
        return { intent: 'OTHER_TASK', projectType: null, description: commandText };
    }
}

export async function generateWebsite(description, style = 'modern') {
    const prompt = `Create a complete, modern, responsive website based on this description:\n"${description}"\n\nStyle: ${style}\n\nRequirements:\n- Single HTML file with embedded CSS and JavaScript\n- Modern, professional design\n- Fully responsive (mobile, tablet, desktop)\n- Use Tailwind CSS via CDN\n- Include smooth animations\n- SEO optimized\n- Fast loading\n\nReturn ONLY the complete HTML code, no explanations.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert web developer. Generate clean, modern, production-ready code.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        });

        const code = response.choices[0].message.content;
        const htmlMatch = code.match(/```html\n([\s\S]*?)\n```/) || 
                          code.match(/```\n([\s\S]*?)\n```/);
        
        return htmlMatch ? htmlMatch[1].trim() : code.trim();
    } catch (error) {
        console.error('AI Engine Error:', error);
        throw new Error(`Failed to generate website: ${error.message}`);
    }
}

export async function improveCode(code, improvements = []) {
    const improvementsList = improvements.length > 0 ?
        `\nImprovements needed:\n${improvements.map(i => `- ${i}`).join('\n')}` :
        '\nGeneral improvements: performance, accessibility, SEO, best practices';

    const prompt = `Improve this code:\n${improvementsList}\n\nOriginal code:\n\`\`\`\n${code}\n\`\`\`\n\nReturn ONLY the improved code, no explanations.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert code reviewer and optimizer.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.5,
            max_tokens: 6000
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('AI Engine Error:', error);
        throw new Error(`Failed to improve code: ${error.message}`);
    }
}
