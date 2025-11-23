
import { OpenAI } from 'openai'; // Assuming use of OpenAI for planning

/**
 * 🤖 AgentTeam (The Planner) - CORRECTED ARCHITECTURE
 * This class is now SOLELY responsible for creating a step-by-step plan.
 * It does NOT execute anything.
 */
class AgentTeam {
  constructor() {
    // Ensure you have OPENAI_API_KEY in your environment variables
    this.llm = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('🤖 Planner (AgentTeam) Initialized.');
  }

  /**
   * Creates a structured plan based on user instruction and available tools.
   * @param {string} instruction The user's plain-text goal.
   * @param {Array<object>} availableTools The list of tools from the Executor.
   * @param {function} streamUpdate A function to send real-time updates back to the client.
   * @returns {Promise<object|null>} A plan object or null if planning fails.
   */
  async createPlan(instruction, availableTools, streamUpdate) {
    streamUpdate({ type: 'status', message: '🧠 Planner received instruction. Analyzing...' });

    // Create a simplified list of tool names and descriptions for the prompt
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
      - If a step needs to use the output of a previous step, use the format "result of step X" as a string value for the parameter.
      - Be logical and break down the problem into small, executable steps.

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
          },
          {
            "step": 2,
            "thought": "Now, I will write the basic 'Hello World' code into the file I just created.",
            "tool": "updateFile",
            "params": {
              "path": "./src/index.js",
              "content": "console.log('Hello, World!');"
            }
          },
          {
            "step": 3,
            "thought": "Finally, I need to execute the javascript file to see the output.",
            "tool": "executeCommand",
            "params": {
                "command": "node ./src/index.js"
            }
          }
        ]
      }
    `;

    try {
      streamUpdate({ type: 'thought', message: 'Planner is thinking and constructing the plan...' });
      
      const response = await this.llm.chat.completions.create({
        model: "gpt-4-turbo-preview", // Or your preferred model
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const planJson = response.choices[0].message.content;
      streamUpdate({ type: 'status', message: '✅ Plan created successfully.' });
      
      const plan = JSON.parse(planJson);
      return plan;

    } catch (error) {
      console.error('[Planner] Failed to create plan:', error);
      streamUpdate({ type: 'error', message: `Planner failed: ${error.message}` });
      return null;
    }
  }
}

export { AgentTeam };
