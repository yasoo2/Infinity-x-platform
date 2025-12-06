/**
 * 🛠️ ToolManager - The Dynamic, Self-Aware Tool Engine
 * @version 2.1.0 - Now supports Classes, Factories, and static Objects.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_DIR_V2 = path.join(__dirname, '..', '..', 'tools_refactored');
const TOOLS_DIR_V3 = path.join(__dirname, '..', '..', 'tools'); // Added for the new tool location
const TOOLS_DIR_V1 = path.join(__dirname, '..', '..', 'services', 'tools');

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
        const deps = { ...(dependencies || {}), toolManager: this };

        const toolFilesV2 = await fs.readdir(TOOLS_DIR_V2);
        const toolFilesV1 = await fs.readdir(TOOLS_DIR_V1);
        let toolFilesV3 = [];
        try {
            toolFilesV3 = await fs.readdir(TOOLS_DIR_V3);
        } catch {
            toolFilesV3 = [];
        }
        const allToolFiles = [
            ...toolFilesV2.map(file => ({ file, dir: TOOLS_DIR_V2 })),
            ...toolFilesV1.map(file => ({ file, dir: TOOLS_DIR_V1 })),
            ...toolFilesV3.map(file => ({ file, dir: TOOLS_DIR_V3 })),
        ];

        for (const { file, dir } of allToolFiles) {
            if (file.endsWith('.mjs') && file !== 'tool-manager.service.mjs') {
                const toolModulePath = path.join(dir, file);
                try {
                    const toolExports = await import(`file://${toolModulePath}`);
                    let toolModule;

                    if (toolExports.default && isClass(toolExports.default)) {
                        // It's a class, instantiate it
                        const toolInstance = new toolExports.default(deps);
                        toolModule = this._extractToolsFromInstance(toolInstance);
                    } else if (toolExports.default && typeof toolExports.default === 'function') {
                        // It's a factory function, call it
                        toolModule = toolExports.default(deps);
                    } else if (toolExports.default && typeof toolExports.default === 'object' && toolExports.default !== null) {
                        // It's a static tool module
                        toolModule = toolExports.default;
                    } else {
                        // If no default export, check for named exports (static tools)
                        if (Object.keys(toolExports).length > 0) {
                            toolModule = toolExports;
                        } else {
                            console.warn(`⚠️ Tool file ${file} has an invalid or unhandled export type.`);
                            continue;
                        }
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

    registerDynamicTool(toolName, toolFunction, schema) {
        if (typeof toolFunction !== 'function' || !schema) {
            throw new Error('Invalid dynamic tool registration');
        }
        toolFunction.metadata = schema;
        this.tools.set(toolName, toolFunction);
        this.toolSchemas.push({ type: 'function', function: schema });
        console.log(`🧩 Dynamic tool registered: ${toolName}`);
        return true;
    }

    async execute(toolName, args) {
        if (!this._isInitialized) throw new Error('ToolManager not initialized.');
        const tool = this.tools.get(toolName);
        if (!tool) throw new Error(`Tool "${toolName}" not found.`);
        
        console.log(`-⚡ Executing tool: ${toolName}`);
        return tool(args);
    }

    getToolSchemas() {
        const seen = new Set();
        const unique = [];
        for (const t of this.toolSchemas) {
            const name = t?.function?.name || '';
            if (!name) continue;
            if (seen.has(name)) continue;
            seen.add(name);
            unique.push(t);
        }
        return unique;
    }
}

export default new ToolManager();
