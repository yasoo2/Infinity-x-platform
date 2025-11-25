/**
 * Tool Registrar - Dynamically loads and exports all tools in this directory.
 * This removes the need for manual indexing, making the system more robust.
 * @version 2.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tools = {};
const toolMetadata = [];

async function loadTools() {
  const files = await fs.readdir(__dirname);

  for (const file of files) {
    if ((file.endsWith('.mjs') || file.endsWith('.js')) && file !== 'index.mjs' && file !== 'index.js') {
      try {
        const modulePath = path.join(__dirname, file);
        const module = await import(modulePath);
        const toolExports = module.default;

        if (!toolExports) continue;

        // Handle both class-based and function-based tools
        let toolInstance;
        if (typeof toolExports === 'function' && toolExports.prototype?.constructor) {
            // It's a class, instantiate it (assuming no complex constructor args needed for metadata)
            // A better approach would be to pass dependencies if needed, but this is for discovery.
            toolInstance = new toolExports({}); 
        } else {
            // It's an object of functions
            toolInstance = toolExports;
        }

        for (const toolName in toolInstance) {
            const tool = toolInstance[toolName];
            if (typeof tool === 'function' && tool.metadata) {
                const metadata = { ...tool.metadata, functionName: toolName };
                tools[tool.metadata.name] = tool.bind(toolInstance); // Bind the method to its instance
                toolMetadata.push(metadata);
                console.log(`Loaded tool: ${tool.metadata.name} from ${file}`);
            }
        }
      } catch (error) {
        console.error(`Failed to load tool from ${file}:`, error);
      }
    }
  }
}

// Load the tools and then export them.
// The export will be a promise that resolves when all tools are loaded.
export const toolsPromise = loadTools();

export { tools, toolMetadata };
