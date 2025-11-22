import { BaseTool } from './Tool.mjs';
import { FileTool } from './FileTool.mjs';
import { ShellTool } from './ShellTool.mjs';
import { SearchTool } from './SearchTool.mjs';
import { DeployTool } from './DeployTool.mjs';
import { CodeTool } from './CodeTool.mjs';
import { PlannerTool } from './PlannerTool.mjs';
import { GitHubTool } from './GitHubTool.mjs';
import { APITool } from './APITool.mjs';
import { BrowserTool } from './BrowserTool.mjs';
import { DatabaseTool } from './DatabaseTool.mjs';
import { VectorDBTool } from './VectorDBTool.mjs';

class ToolsSystem {
  constructor() {
    this.tools = new Map();
    this.initialize();
  }

  initialize() {
    console.log('Initializing ToolsSystem...');
    
    // Manually register all tools
    this.registerTool(new FileTool());
    this.registerTool(new ShellTool());
    this.registerTool(new SearchTool());
    this.registerTool(new DeployTool());
    this.registerTool(new CodeTool());
    this.registerTool(new PlannerTool());
    this.registerTool(new GitHubTool());
    this.registerTool(new APITool());
    this.registerTool(new BrowserTool());
    this.registerTool(new DatabaseTool());
    this.registerTool(new VectorDBTool());

    console.log('ToolsSystem initialized successfully.');
  }

  registerTool(toolInstance) {
    if (!(toolInstance instanceof BaseTool)) {
        throw new Error(`Tool '${toolInstance.name}' must extend BaseTool`);
    }

    const name = toolInstance.name;
    if (this.tools.has(name)) {
      console.warn(`Warning: Tool '${name}' is being overwritten.`);
    }
    this.tools.set(name, toolInstance);
    console.log(`- Registered tool: ${name}`);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAllTools() {
    return [...this.tools.values()].map(t => ({ 
      name: t.name, 
      description: t.description, 
      parameters: t.parameters 
    }));
  }

  async executeTool(name, params) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found.`);
    }
    // TODO: Add parameter validation here in the future
    return tool.execute(params);
  }
}

// Export a single, initialized instance (Singleton Pattern)
const toolsSystem = new ToolsSystem();
export { toolsSystem };
