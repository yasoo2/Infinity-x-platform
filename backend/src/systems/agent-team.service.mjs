import OpenAI from 'openai';
import { getConfig } from '../services/ai/runtime-config.mjs';
import toolManager from '../services/tools/tool-manager.service.mjs';

let openai;

try {
  const cfg = getConfig();
  const apiKey = process.env.OPENAI_API_KEY || (cfg?.keys?.openai || null);
  if (!apiKey) throw new Error('MISSING_KEY');
  openai = new OpenAI({ apiKey });
  // Test the connection with a lightweight request that requires model.request scope
  openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }] })
    .catch(error => {
      console.warn('⚠️ OpenAI API Key seems invalid, but server will continue running. OpenAI features may fail.', error.message);
      openai = null; // Invalidate the client if the key is wrong
    });
} catch {
  console.warn('⚠️ OpenAI API Key is missing. OpenAI features will be disabled.');
  openai = null;
}


// --- Specialist Agent Definitions ---

class ArchitectAgent {
  async execute(task) {
    if (!openai) throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY.');
    const prompt = `As an expert system architect, design a complete architecture for this task: "${task.description}". Provide: 1. Full architecture design. 2. Tech stack choices. 3. UML diagrams (in Mermaid format). 4. Scalability strategy. 5. Performance recommendations.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are an expert system architect.' }, { role: 'user', content: prompt }] });
    return { agent: 'architect', result: response.choices[0].message.content };
  }
}

class DeveloperAgent {
  async execute(task) {
    if (!openai) throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY.');
    const prompt = `As a professional developer, write clean, SOLID, and optimized code for: "${task.description}". Include error handling and best practices.`;
    const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are an expert developer.' }, { role: 'user', content: prompt }] });
    const code = response.choices[0].message.content;
    return { agent: 'developer', result: { code } };
  }
}

class DataAnalysisAgent {
  async execute(task) {
    const text = String(task.description || '').toLowerCase();
    try {
      if (/\.csv\b/.test(text)) {
        const input = (text.match(/([A-Za-z0-9_\-./]+\.csv)/) || [])[1] || '';
        const output = input ? input.replace(/\.csv$/, '.out.csv') : `./analysis-${Date.now()}.csv`;
        const opMatch = text.match(/aggregate|filter|sort|transform/);
        const op = (opMatch ? opMatch[0] : 'AGGREGATE').toUpperCase();
        let details = '';
        if (op === 'AGGREGATE') details = 'group_by=category, sum=sales';
        else if (op === 'FILTER') details = 'column=status, value=active';
        else if (op === 'SORT') details = 'by=created_at, order=desc';
        else details = 'op=pass';
        const r = await toolManager.execute('processCSV', { inputFilePath: input, outputFilePath: output, operation: op, operationDetails: details });
        return { agent: 'dataAnalyst', result: r };
      }
      if (/https?:\/\//.test(text)) {
        const url = (text.match(/https?:\/\/\S+/) || [])[0] || '';
        const r = await toolManager.execute('navigateAndExtract', { url, selectors: ['h1','title'], context: 'web-data' });
        return { agent: 'dataAnalyst', result: r };
      }
      return { agent: 'dataAnalyst', result: { success: false, error: 'NO_MATCH' } };
    } catch (e) {
      return { agent: 'dataAnalyst', result: { success: false, error: e?.message || String(e) } };
    }
  }
}

// ... (other specialist agents can be defined here)

// --- Coordinator and Planner ---

class AgentTeam {
  constructor() {
    this.agents = {
      architect: new ArchitectAgent(),
      developer: new DeveloperAgent(),
      dataAnalyst: new DataAnalysisAgent(),
      // ... (initialize other agents)
    };
    this.llm = openai;
  }

  async analyzeAndPlan(instruction, streamUpdate) {
    // Local engine removed; rely on OpenAI only
    const availableTools = toolManager.getToolSchemas();
    streamUpdate({ type: 'status', message: '🧠 Planner received instruction. Analyzing...' });

    const toolSignatures = availableTools.map(tool => 
      `${tool.name}(${JSON.stringify(tool.parameters.properties)}): ${tool.description}`
    ).join('\n');

    const prompt = `
      You are an expert AI project planner. Your job is to take a user's instruction and a list of available tools, and create a step-by-step JSON plan to accomplish the goal. 
      
      USER INSTRUCTION:
      "${instruction}"

      AVAILABLE TOOLS:
      ${toolSignatures}

      RULES:
      - The output MUST be a JSON object containing a single key: "steps".
      - The "steps" key must be an array of objects.
      - Each object in the array represents a single step.
      - Each step object MUST have the following keys: "step" (an integer), "thought" (a brief description of why this step is needed), "tool" (the exact name of the tool to use), and "params" (an object of parameters for the tool).

      EXAMPLE PLAN:
      {
        "steps": [
          {
            "step": 1,
            "thought": "First, I need to create a new file to write the code into.",
            "tool": "createFile",
            "params": {
              "path": "./src/index.js"
            }
          }
        ]
      }
    `;

    try {
      streamUpdate({ type: 'thought', message: 'Planner is thinking and constructing the plan...' });
      if (this.llm) {
        const response = await this.llm.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        const planJson = response.choices[0].message.content;
        streamUpdate({ type: 'status', message: '✅ Plan created successfully.' });
        const plan = JSON.parse(planJson);
        return plan;
      }
    } catch (error) {
      console.error('[Planner] OpenAI planning failed:', error);
    }
    streamUpdate({ type: 'error', message: 'Planner failed: No AI provider available.' });
    return null;
  }

  async executeTask(task) {
    if (!openai) throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY.');
    const analysis = await this.analyzeTask(task);
    const selectedAgentNames = this.selectAgents(analysis);
    if (selectedAgentNames.length === 0) {
        selectedAgentNames.push('developer');
    }

    const subtasks = selectedAgentNames.map(agentName => ({
      agent: agentName,
      description: `As a ${agentName}, your part of the main task is: ${task}`
    }));

    const results = await Promise.all(
      subtasks.map(async (subtask) => {
        const agent = this.agents[subtask.agent];
        const result = await agent.execute(subtask);
        return { agent: subtask.agent, result: result };
      })
    );

    return this.mergeResults(results);
  }

  async analyzeTask(task) {
    if (!openai) throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY.');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a project manager AI. Analyze the task and determine the required skills.' },
        { role: 'user', content: `Task: "${task}". Which of these skills are needed: architecture, coding, design, testing, security, deployment, data_analysis, content_writing, research, optimization? Respond with a JSON object: {"skills": ["skill1", "skill2"]}` }
      ],
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content);
  }

  selectAgents(analysis) {
    const agents = [];
    if (analysis.skills.includes('architecture')) agents.push('architect');
    if (analysis.skills.includes('coding')) agents.push('developer');
    if (analysis.skills.includes('data_analysis')) agents.push('dataAnalyst');
    // ... (add other skills)
    return agents;
  }

  async mergeResults(results) {
    if (!openai) throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY.');
    const prompt = `
    You are a lead integrator. Combine these results from different agents into a single, coherent final report.

    Results:
    ${results.map(r => `--- From ${r.agent} ---\n${JSON.stringify(r.result, null, 2)}`).join('\n\n')}

    Produce a final, clean, and comprehensive response.
    `;
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a lead project integrator.' },
        { role: 'user', content: prompt }
      ]
    });
    return { finalResult: response.choices[0].message.content, originalResults: results };
  }
}

export const agentTeam = new AgentTeam();
