
/**
 * 🛠️ ToolManager - The Dynamic, Self-Aware Tool Engine
 * This service dynamically loads, registers, and executes all tools,
 * providing a single, reliable interface for the entire system.
 *
 * @module ToolManager
 * @version 1.0.0
 * @author Joe AGI (Self-Evolved)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_DIR = path.join(__dirname, '..', '..', 'tools_refactored');

class ToolManager {
    constructor() {
        this.tools = new Map();
        this.toolSchemas = []; // For OpenAI
        this._isInitialized = false;
    }

    /**
     * Dynamically loads all tools from the tools directory,
     * registers them, and generates their OpenAI-compatible schemas.
     */
    async initialize() {
        if (this._isInitialized) {
            console.log('ToolManager is already initialized.');
            return;
        }

        console.log('🔄 Initializing ToolManager...');
        try {
            const toolFiles = await fs.readdir(TOOLS_DIR);

            for (const file of toolFiles) {
                if (file.endsWith('.mjs')) {
                    const toolModulePath = path.join(TOOLS_DIR, file);
                    const { default: toolModule } = await import(`file://${toolModulePath}`);
                    
                    if (toolModule && typeof toolModule === 'object') {
                        this._registerModule(toolModule);
                    }
                }
            }

            this._isInitialized = true;
            console.log(`✅ ToolManager initialized. ${this.tools.size} tools registered.`);
            // console.log('Generated OpenAI Schemas:', JSON.stringify(this.toolSchemas, null, 2));

        } catch (error) {
            console.error('❌ Critical Error: Failed to initialize ToolManager.', error);
            throw error; // Propagate the error to stop the application if tools fail to load.
        }
    }

    /**
     * Registers all functions from a given tool module.
     * @param {object} toolModule - The imported tool module.
     */
    _registerModule(module) {
        for (const [toolName, toolFunction] of Object.entries(module)) {
            if (typeof toolFunction === 'function' && toolFunction.metadata) {
                this.tools.set(toolName, toolFunction);
                this.toolSchemas.push({
                    type: 'function',
                    function: toolFunction.metadata
                });
                // console.log(`  -> Registered tool: ${toolName}`);
            }
        }
    }

    /**
     * Executes a tool by its registered name.
     * @param {string} toolName - The name of the tool to execute.
     * @param {object} args - The arguments for the tool.
     * @returns {Promise<any>} The result of the tool execution.
     */
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

    /**
     * Returns the array of all tool schemas for OpenAI.
     * @returns {Array<object>}
     */
    getToolSchemas() {
        return this.toolSchemas;
    }
}

// Create a singleton instance to be used across the application
const toolManager = new ToolManager();

export default toolManager;
