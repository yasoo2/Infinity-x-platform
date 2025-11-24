/**
 * 🛠️ ToolManager - The Dynamic, Self-Aware Tool Engine
 * @version 2.1.0 - Now supports Classes, Factories, and static Objects.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_DIR = path.join(__dirname, '..', '..', '..', 'src', 'tools_refactored');

// Helper to check if a value is a class
function isClass(v) {
  return typeof v === 'function' && /^\s*class\s+/.test(v.toString());
}

class ToolManager {
    constructor() {
        this.tools = new Map();
        this.toolSchemas = [];
        this._isInitialized = false;
    }

    async initialize(dependencies) {
        if (this._isInitialized) return;
        console.log('🔄 Initializing ToolManager with dependencies...');

        const toolFiles = await fs.readdir(TOOLS_DIR);

        for (const file of toolFiles) {
            if (file.endsWith('.mjs')) {
                const toolModulePath = path.join(TOOLS_DIR, file);
                try {
                    const { default: toolExport } = await import(`file://${toolModulePath}`);
                    let toolModule;

                    if (isClass(toolExport)) {
                        // It's a class, instantiate it
                        const toolInstance = new toolExport(dependencies);
                        toolModule = this._extractToolsFromInstance(toolInstance);
                    } else if (typeof toolExport === 'function') {
                        // It's a factory function, call it
                        toolModule = toolExport(dependencies);
                    } else if (typeof toolExport === 'object' && toolExport !== null) {
                        // It's a static tool module
                        toolModule = toolExport;
                    } else {
                        console.warn(`⚠️ Tool file ${file} has an invalid or unhandled export type.`);
                        continue;
                    }
                    
                    this._registerModule(toolModule);

                } catch (error) {
                    console.error(`❌ Critical Error: Failed to load or process tool file: ${file}`, error);
                    throw error; // Stop the server on critical tool failure
                }
            }
        }

        this._isInitialized = true;
        console.log(`✅ ToolManager initialized. ${this.tools.size} tools registered.`);
    }

    _extractToolsFromInstance(instance) {
        const tools = {};
        // Look for methods on the prototype that have metadata
        for (const propName of Object.getOwnPropertyNames(Object.getPrototypeOf(instance))) {
            const prop = instance[propName];
            if (typeof prop === 'function' && prop.metadata) {
                tools[propName] = prop.bind(instance);
                tools[propName].metadata = prop.metadata; // Re-attach metadata
            }
        }
        return tools;
    }

    _registerModule(module) {
        for (const [toolName, toolFunction] of Object.entries(module)) {
            if (typeof toolFunction === 'function' && toolFunction.metadata) {
                this.tools.set(toolName, toolFunction);
                this.toolSchemas.push({ type: 'function', function: toolFunction.metadata });
            }
        }
    }

    async execute(toolName, args) {
        if (!this._isInitialized) throw new Error('ToolManager not initialized.');
        const tool = this.tools.get(toolName);
        if (!tool) throw new Error(`Tool "${toolName}" not found.`);
        
        console.log(`-⚡ Executing tool: ${toolName}`);
        return tool(args);
    }

    getToolSchemas() {
        return this.toolSchemas;
    }
}

export default new ToolManager();
