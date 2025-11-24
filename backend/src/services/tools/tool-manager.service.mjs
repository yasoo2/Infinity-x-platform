/**
 * 🛠️ ToolManager - The Dynamic, Self-Aware Tool Engine
 * @version 2.0.0 - Now supports dependency injection for tools.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_DIR = path.join(__dirname, '..' , '..' , '..' , 'src', 'tools_refactored');

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

                    if (typeof toolExport === 'function') {
                        // It's a factory function, call it with dependencies
                        toolModule = toolExport(dependencies);
                    } else if (typeof toolExport === 'object' && toolExport !== null) {
                        // It's a static tool module
                        toolModule = toolExport;
                    } else {
                        console.warn(`⚠️ Tool file ${file} has an invalid export type.`);
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

// Export a single instance of the manager
export default new ToolManager();
