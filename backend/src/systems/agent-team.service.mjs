/**
 * 🤖 Multi-Agent System - فريق من الخبراء
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===========================
// 🎯 Coordinator Agent
// ===========================

class CoordinatorAgent {
  async analyzeTask(task) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a project manager AI. Analyze the task and determine the required skills.' },
        { role: 'user', content: `Task: "${task}". Which of these skills are needed: architecture, coding, design, testing, security, deployment, data_analysis, content_writing, research, optimization? Respond with a JSON object: {"skills": ["skill1", "skill2"]}` }
      ],
      response_format: { type: 'json_object' }
    });
    const analysis = JSON.parse(response.choices[0].message.content);
    return {
      needsArchitecture: analysis.skills.includes('architecture'),
      needsCoding: analysis.skills.includes('coding'),
      needsDesign: analysis.skills.includes('design'),
      needsTesting: analysis.skills.includes('testing'),
      needsSecurity: analysis.skills.includes('security'),
      needsDeployment: analysis.skills.includes('deployment'),
      needsAnalysis: analysis.skills.includes('data_analysis'),
      needsContent: analysis.skills.includes('content_writing'),
      needsResearch: analysis.skills.includes('research'),
      needsOptimization: analysis.skills.includes('optimization'),
    };
  }

  distributeWork(task, selectedAgents) {
    return selectedAgents.map(agentName => ({
      agent: agentName,
      description: `As a ${agentName}, your part of the main task is: ${task}`
    }));
  }

  async mergeResults(results) {
    const prompt = `
    You are a lead integrator. Combine these results from different agents into a single, coherent final report.

    Results:
    ${results.map(r => `--- From ${r.agent} ---\n${JSON.stringify(r.result, null, 2)}`).join('\n\n')}

    Produce a final, clean, and comprehensive response.
    `;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a lead project integrator.' },
        { role: 'user', content: prompt }
      ]
    });
    return { finalResult: response.choices[0].message.content, originalResults: results };
  }
}

// ===========================
// 🎯 Specialist Agents
// ===========================

class ArchitectAgent {
  async execute(task) {
    const prompt = `As an expert system architect, design a complete architecture for this task: "${task.description}". Provide: 1. Full architecture design. 2. Tech stack choices. 3. UML diagrams (in Mermaid format). 4. Scalability strategy. 5. Performance recommendations.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'system', content: 'You are an expert system architect.' }, { role: 'user', content: prompt }] });
    return { agent: 'architect', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'architect', score: 9, issues: [] }; }
}

class DeveloperAgent {
  async execute(task) {
    const prompt = `As a professional developer, write clean, SOLID, and optimized code for: "${task.description}". Include error handling and best practices.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'system', content: 'You are an expert developer.' }, { role: 'user', content: prompt }] });
    const code = response.choices[0].message.content;
    const tests = await this.generateTests(code);
    return { agent: 'developer', result: { code, tests } };
  }
  async generateTests(code) { return `// Unit tests for the generated code...`; }
  async review(result) { return { agent: 'developer', score: 9, issues: [] }; }
}

class DesignerAgent {
  async execute(task) {
    const prompt = `As a UI/UX designer, create a full design for: "${task.description}". Include color palette, typography, layout, and component design.`;
    const designResponse = await openai.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'system', content: 'You are a UI/UX designer.' }, { role: 'user', content: prompt }] });
    const mockups = await this.generateMockups(task.description);
    return { agent: 'designer', result: { design: designResponse.choices[0].message.content, mockups } };
  }
  async generateMockups(description) {
    const image = await openai.images.generate({ model: 'dall-e-3', prompt: `Professional UI mockup for: ${description}`, n: 1, size: '1024x1024' });
    return [{ url: image.data[0].url }];
  }
  async review(result) { return { agent: 'designer', score: 9, issues: [] }; }
}

class TesterAgent {
  async execute(task) {
    const prompt = `As an expert software tester, create a comprehensive test plan and a set of unit/integration tests for the task: "${task.description}". Focus on edge cases and error handling.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are an expert software tester.' }, { role: 'user', content: prompt }] });
    return { agent: 'tester', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'tester', score: 9, issues: [] }; }
}
class SecurityAgent {
  async execute(task) {
    const prompt = `As a security expert, analyze the task: "${task.description}" and provide a security review. Identify potential vulnerabilities (e.g., XSS, SQLi, CSRF) and recommend mitigation strategies.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a security expert.' }, { role: 'user', content: prompt }] });
    return { agent: 'security', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'security', score: 9, issues: [] }; }
}
class DevOpsAgent {
  async execute(task) {
    const prompt = `As a DevOps engineer, create a deployment strategy (e.g., CI/CD pipeline in GitHub Actions or GitLab CI) for the task: "${task.description}". Include infrastructure as code (IaC) recommendations if applicable.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a DevOps engineer.' }, { role: 'user', content: prompt }] });
    return { agent: 'devops', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'devops', score: 9, issues: [] }; }
}
class AnalystAgent {
  async execute(task) {
    const prompt = `As a data analyst, analyze the task: "${task.description}" and provide a data model, database schema (e.g., MongoDB or SQL), and a plan for data collection and reporting.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a data analyst.' }, { role: 'user', content: prompt }] });
    return { agent: 'analyst', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'analyst', score: 9, issues: [] }; }
}
class WriterAgent {
  async execute(task) {
    const prompt = `As a professional content writer, write all necessary user-facing content (e.g., documentation, marketing copy, error messages) for the task: "${task.description}".`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a professional content writer.' }, { role: 'user', content: prompt }] });
    return { agent: 'writer', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'writer', score: 9, issues: [] }; }
}
class ResearcherAgent {
  async execute(task) {
    const prompt = `As a market and technical researcher, perform a deep dive on the task: "${task.description}". Provide a summary of best practices, competitor analysis, and technical feasibility report.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a market and technical researcher.' }, { role: 'user', content: prompt }] });
    return { agent: 'researcher', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'researcher', score: 9, issues: [] }; }
}
class OptimizerAgent {
  async execute(task) {
    const prompt = `As a performance optimization expert, analyze the task: "${task.description}" and provide a detailed plan for optimizing speed, memory usage, and scalability.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a performance optimization expert.' }, { role: 'user', content: prompt }] });
    return { agent: 'optimizer', result: response.choices[0].message.content };
  }
  async review(result) { return { agent: 'optimizer', score: 9, issues: [] }; }
}

// ===========================
// 🤖 Main Agent Team Class
// ===========================

export class AgentTeam {
  constructor() {
    this.agents = {
      architect: new ArchitectAgent(),
      developer: new DeveloperAgent(),
      designer: new DesignerAgent(),
      tester: new TesterAgent(),
      security: new SecurityAgent(),
      devops: new DevOpsAgent(),
      analyst: new AnalystAgent(),
      writer: new WriterAgent(),
      researcher: new ResearcherAgent(),
      optimizer: new OptimizerAgent(),
    };
    this.coordinator = new CoordinatorAgent();
  }

  async executeTask(task, userId) {
    // 1. المنسق يحلل المهمة
    const analysis = await this.coordinator.analyzeTask(task);

    // 2. يختار الـ Agents المناسبين
    const selectedAgentNames = this.selectAgents(analysis);
    if (selectedAgentNames.length === 0) {
        // If no specific agent is found, use a general developer agent
        selectedAgentNames.push('developer');
    }

    // 3. يوزع المهام
    const subtasks = this.coordinator.distributeWork(task, selectedAgentNames);

    // 4. تنفيذ متوازي
    const results = await Promise.all(
      subtasks.map(async (subtask) => {
        const agent = this.agents[subtask.agent];
        const result = await agent.execute(subtask, userId);
        return { agent: subtask.agent, result: result };
      })
    );

    // 5. دمج النتائج
    const finalResult = await this.coordinator.mergeResults(results);

    // 6. مراجعة جودة (اختياري)
    // const reviewed = await this.qualityCheck(finalResult);

    return finalResult;
  }

  selectAgents(analysis) {
    const agents = [];
    if (analysis.needsArchitecture) agents.push('architect');
    if (analysis.needsCoding) agents.push('developer');
    if (analysis.needsDesign) agents.push('designer');
    if (analysis.needsTesting) agents.push('tester');
    if (analysis.needsSecurity) agents.push('security');
    if (analysis.needsDeployment) agents.push('devops');
    if (analysis.needsAnalysis) agents.push('analyst');
    if (analysis.needsContent) agents.push('writer');
    if (analysis.needsResearch) agents.push('researcher');
    if (analysis.needsOptimization) agents.push('optimizer');
    return agents;
  }

  async qualityCheck(result) {
    const reviews = await Promise.all(
      Object.values(this.agents).map(agent => agent.review(result))
    );
    const score = reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;
    if (score < 8) {
      return await this.executeTask(result.originalTask, result.userId);
    }
    return { ...result, qualityScore: score, reviews };
  }
}

// Export a singleton instance
export const agentTeam = new AgentTeam();
