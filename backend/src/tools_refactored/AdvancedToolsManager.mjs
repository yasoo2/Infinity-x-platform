
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🚀 Advanced Tools Manager (The Executor) - Upgraded for Real-Time Streaming
 */
class AdvancedToolsManager {
    constructor(options = {}) {
        this.toolsDir = options.toolsDir || path.join(__dirname);
        this.availableFunctions = new Map();
        this.functionMetadata = new Map();
        this.isInitialized = false;
    }

    async loadTools() {
        if (this.isInitialized) return;
        console.log(`📂 Loading tools from: ${this.toolsDir}`);
        const files = await fs.readdir(this.toolsDir);
        for (const file of files) {
            if (file.endsWith('.tool.mjs')) {
                try {
                    const toolModule = await import(path.join(this.toolsDir, file));
                    for (const func of Object.values(toolModule)) {
                        if (typeof func === 'function' && func.metadata) {
                            this.availableFunctions.set(func.metadata.name, func);
                            this.functionMetadata.set(func.metadata.name, func.metadata);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error loading tool file ${file}:`, error);
                }
            }
        }
        this.isInitialized = true;
        console.log('👍 All tool functions loaded.');
    }

    getAvailableTools() {
        return Array.from(this.functionMetadata.values());
    }

    /**
     * 🏃‍♂️ Executes a plan, now with real-time streaming.
     * @param {Array<object>} plan - The array of steps from the Planner.
     * @param {function} streamUpdate - The function to send live updates to the client.
     * @returns {Promise<object>} A summary of the execution.
     */
    async executePlan(plan, streamUpdate) {
        if (!this.isInitialized) await this.loadTools();

        streamUpdate({ type: 'status', message: `🚀 Executor starting plan with ${plan.length} steps.` });

        const executionResults = {};
        for (const step of plan) {
            streamUpdate({ type: 'thought', message: `Executing step ${step.step}: ${step.thought}` });

            const { tool, params } = step;
            if (!this.availableFunctions.has(tool)) {
                const errorMsg = `Tool "${tool}" not found.`;
                streamUpdate({ type: 'error', message: errorMsg });
                return { success: false };
            }

            try {
                const funcToExecute = this.availableFunctions.get(tool);
                const resolvedParams = this.resolvePlaceholders(params, executionResults);

                streamUpdate({ type: 'tool_used', tool: tool, params: resolvedParams });
                
                // Execute the actual tool function
                const result = await funcToExecute(resolvedParams);

                executionResults[`step${step.step}`] = result;
                streamUpdate({ type: 'tool_result', step: step.step, status: 'Success', result });

            } catch (error) {
                const errorMsg = `Step ${step.step} (${tool}) failed: ${error.message}`;
                streamUpdate({ type: 'error', message: errorMsg });
                return { success: false };
            }
        }

        streamUpdate({ type: 'status', message: '🎉 Plan execution completed successfully!' });
        streamUpdate({ type: 'final_response', content: 'All steps were executed.' });
        return { success: true, results: executionResults };
    }

    resolvePlaceholders(params, results) {
        if (!params) return {};
        const resolved = {};
        const placeholderRegex = /result of step (\d+)/i;
        for (const key in params) {
            const value = params[key];
            if (typeof value === 'string') {
                const match = value.match(placeholderRegex);
                if (match && match[1]) {
                    const stepNumber = `step${match[1]}`;
                    if (results[stepNumber]) {
                        resolved[key] = results[stepNumber];
                    } else { resolved[key] = value; }
                } else { resolved[key] = value; }
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                resolved[key] = this.resolvePlaceholders(value, results);
            } else { resolved[key] = value; }
        }
        return resolved;
    }
}

export default AdvancedToolsManager;
