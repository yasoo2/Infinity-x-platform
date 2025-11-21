import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BaseTool {
  constructor(name, description, parameters = {}) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }
  async execute(params) {
    throw new Error('execute() must be implemented by subclass');
  }
}

class ToolsSystem {
  constructor() {
    this.tools = new Map();
  }

  async initialize() {
    console.log('🛠️  Initializing ToolsSystem...');
    const toolFiles = await fs.readdir(__dirname);

    for (const file of toolFiles) {
      if (file.endsWith('.mjs') && file !== 'ToolsSystem.mjs' && file !== 'Tool.mjs') {
        console.log(`  -> Importing tool file: ${file}`);
        try {
          const toolModule = await import(`./${file}`);
          const ToolClass = toolModule.default;
          if (ToolClass && typeof ToolClass === 'function') {
            const toolInstance = new ToolClass();
            this.registerTool(toolInstance.name, toolInstance);
          } else {
             console.warn(`  -> ⚠️  Could not find default export or default export is not a class in ${file}`);
          }
        } catch (error) {
          console.error(`  -> ❌ Error loading tool from ${file}:`, error);
        }
      }
    }
    console.log('✅ ToolsSystem initialized.');
  }

  registerTool(name, tool) {
    if (this.tools.has(name)) {
      console.warn(`⚠️  Tool '${name}' is being overwritten.`);
    }
    this.tools.set(name, tool);
    console.log(`  -> Registered tool: ${name}`);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAllTools() {
    return [...this.tools.values()].map(t => ({ name: t.name, description: t.description, parameters: t.parameters }));
  }

  async executeTool(name, params) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found.`);
    }
    return tool.execute(params);
  }
}

// Export the class, not an initialized instance
export { ToolsSystem };
