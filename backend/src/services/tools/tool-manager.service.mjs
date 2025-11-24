
/**
 * 🛠️ ToolManager - The Dynamic, Self-Aware Tool Engine
 * This service dynamically loads, registers, and executes all tools,
 * providing a single, reliable interface for the entire system.
 *
 * @module ToolManager
 * @version 1.0.1
 * @author Joe AGI (Self-Evolved)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_DIR = path.join(__dirname, '..', '..', '..', 'src', 'tools_refactored');

class ToolManager {
    constructor() {
        this.tools = new Map();
        this.toolSchemas = [];
        this._isInitialized = false;
    }

    async initialize() {
        if (this._isInitialized) {
            console.log('ToolManager is already initialized.');
            return;
        }

        console.log('🔄 Initializing ToolManager...');
        const toolFiles = await fs.readdir(TOOLS_DIR);

        for (const file of toolFiles) {
            if (file.endsWith('.mjs')) {
                const toolModulePath = path.join(TOOLS_DIR, file);
                try {
                    const { default: toolModule } = await import(`file://${toolModulePath}`);
                    if (toolModule && typeof toolModule === 'object') {
                        this._registerModule(toolModule);
                    }
                } catch (error) {
                    console.error(`❌ Critical Error: Failed to load tool file: ${file}`, error);
                    throw error; // Re-throw the error to stop initialization
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
                this.toolSchemas.push({
                    type: 'function',
                    function: toolFunction.metadata
                });
            }
        }
    }

    async execute(toolName, args) {
        if (!this._isInitialized) {
            throw new Error('ToolManager is not initialized. Please call initialize() first.');
        }

        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Tool "${toolName}" is not registered or found.`);
        }

        console.log(`-⚡ Executing tool: ${toolName}`);
        return tool(args);
    }

    getToolSchemas() {
        return this.toolSchemas;
    }
}

const toolManager = new ToolManager();

export default toolManager;
