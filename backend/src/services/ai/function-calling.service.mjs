/**
 * 🎯 JOE Advanced Function Calling System - FINAL CORRECTED VERSION
 * This service centralizes tool execution, referencing the project's actual file structure.
 */

// --- CORE & AGI IMPORTS ---
import { getDB } from '../../core/database.mjs';
import GrokTool from '../../../joengine-agi/tools/GrokTool.mjs'; // Correct path to the class
import { SmartPageBuilder } from '../../../joengine-agi/engines/SmartPageBuilder.mjs'; // Correct path to the class

// --- TOOL MANAGER (single source of truth) ---
import toolManager from '../../services/tools/tool-manager.service.mjs';

// --- TOOL INSTANTIATION ---
const config = {
    githubToken: process.env.GITHUB_TOKEN,
    grokApiKey: process.env.GROK_API_KEY,
    // Add other necessary config keys here
};

// AGI tools are classes and need to be instantiated
const grokTool = new GrokTool(config);
const pageBuilder = new SmartPageBuilder(config);

// Refactored tools are likely objects/functions and are used directly.
// We no longer need to instantiate them.

class FunctionCallingManager {
    constructor() {
        this.stats = { totalCalls: 0, successfulCalls: 0, failedCalls: 0, averageExecutionTime: 0, toolUsageCount: {}, lastExecutionTime: null };
        this.cache = new Map();
        this.cacheMaxAge = 5 * 60 * 1000;
        this.cacheTTL = new Map();
        console.log('✅ Unified Function Calling Manager initialized (Corrected)');
    }

    getCachedResult(key) {
        const expiresAt = this.cacheTTL.get(key);
        if (expiresAt && expiresAt < Date.now()) {
            this.cacheTTL.delete(key);
            this.cache.delete(key);
            return null;
        }
        return this.cache.get(key) ?? null;
    }
    setCachedResult(key, result, ttl) {
        const maxAge = typeof ttl === 'number' ? ttl : this.cacheMaxAge;
        this.cache.set(key, result);
        this.cacheTTL.set(key, Date.now() + maxAge);
    }

    async executeFunction(functionName, args, options = {}) {
        const executionId = `${functionName}-${Date.now()}`;
        const startTime = Date.now();

        console.log(`🔧 [${executionId}] Executing: ${functionName}`);
        this.stats.totalCalls++;

        try {
            // Ensure tools are loaded once
            await toolManager.initialize();
            const cacheKey = `${functionName}:${JSON.stringify(args)}`;
            if (options.useCache !== false) {
                const cached = this.getCachedResult(cacheKey);
                if (cached) {
                    this.stats.successfulCalls++;
                    return { ...cached, fromCache: true, executionId };
                }
            }

            // Route all tool calls through ToolManager by function name
            // Function names must match registered tool metadata names
            const result = await toolManager.execute(functionName, args);

            const executionTime = Date.now() - startTime;
            this.updateExecutionStats(functionName, executionTime, true);
            
            if (options.cache !== false) {
                this.setCachedResult(cacheKey, result);
            }

            await this.logExecution(executionId, functionName, args, result, executionTime, true);
            this.stats.successfulCalls++;

            console.log(`✅ [${executionId}] Succeeded in ${executionTime}ms`);
            return { success: true, result, executionId, executionTime, fromCache: false };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateExecutionStats(functionName, executionTime, false);
            console.error(`❌ [${executionId}] Failed:`, error.message, error.stack);
            await this.logExecution(executionId, functionName, args, null, executionTime, false, error);
            this.stats.failedCalls++;
            return { success: false, error: error.message, executionId, executionTime };
        } 
    }
    
    updateExecutionStats(functionName, executionTime, success) {
        const prevAvg = this.stats.averageExecutionTime || 0;
        const count = this.stats.totalCalls || 0;
        this.stats.averageExecutionTime = Math.round(((prevAvg * count) + executionTime) / (count + 1));
        this.stats.lastExecutionTime = executionTime;
        const usage = this.stats.toolUsageCount[functionName] || 0;
        this.stats.toolUsageCount[functionName] = usage + 1;
        if (success) this.stats.successfulCalls++; else this.stats.failedCalls++;
    }
    async logExecution(executionId, functionName, args, result, executionTime, success, error = null) {
        try {
            const db = getDB();
            await db.collection('joe_function_calls').insertOne({ executionId, functionName, args, result: success ? result : null, error: error ? error.message : null, executionTime, success, timestamp: new Date() });
        } catch (err) {
            console.error('❌ DB logging error:', err.message);
        }
    }
    getStats() { return this.stats; }
}

const functionManager = new FunctionCallingManager();

// --- NOTE: JOE_TOOLS definition might need updating based on actual function names in the imported files ---
export const JOE_TOOLS = [
    // ... (This list remains the same for now but might need future correction)
    { type: 'function', function: { name: 'github_create_repo', description: 'Creates a new GitHub repository.', parameters: { type: 'object', properties: { repoName: { type: 'string' }, description: { type: 'string' }, isPrivate: { type: 'boolean' } }, required: ['repoName'] } } },
    { type: 'function', function: { name: 'github_commit_and_push', description: 'Commits and pushes changes to a GitHub repository.', parameters: { type: 'object', properties: { repoPath: { type: 'string' }, commitMessage: { type: 'string' } }, required: ['repoPath', 'commitMessage'] } } },
    { type: 'function', function: { name: 'grok_refactor_code', description: 'Refactors code using Grok for improvements.', parameters: { type: 'object', properties: { originalCode: { type: 'string' }, command: { type: 'string' } }, required: ['originalCode', 'command'] } } },
    { type: 'function', function: { name: 'grok_generate_code', description: 'Generates new code from a description using Grok.', parameters: { type: 'object', properties: { description: { type: 'string' }, codeType: { type: 'string' } }, required: ['description'] } } },
    { type: 'function', function: { name: 'deploy_project', description: 'Deploys a project to a specified service (Vercel, Netlify, etc.).', parameters: { type: 'object', properties: { path: { type: 'string' }, service: { type: 'string' } }, required: ['path', 'service'] } } },
    { type: 'function', function: { name: 'database_query', description: 'Queries the MongoDB database.', parameters: { type: 'object', properties: { collection: { type: 'string' }, filter: { type: 'object' }, options: { type: 'object' } }, required: ['collection', 'filter'] } } },
    { type: 'function', function: { name: 'database_insert', description: 'Inserts a document into a MongoDB collection.', parameters: { type: 'object', properties: { collection: { type: 'string' }, document: { type: 'object' } }, required: ['collection', 'document'] } } },
    { type: 'function', function: { name: 'memory_search', description: 'Searches for relevant information in the long-term semantic memory.', parameters: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'number' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'memory_add', description: 'Adds a new piece of information to the long-term semantic memory.', parameters: { type: 'object', properties: { text: { type: 'string' }, metadata: { type: 'object' } }, required: ['text'] } } },
    { type: 'function', function: { name: 'build_smart_page', description: 'Builds a complete, production-ready web page from a description.', parameters: { type: 'object', properties: { description: { type: 'string' }, filePath: { type: 'string' }, style: { type: 'string' } }, required: ['description', 'filePath'] } } },
];

export async function executeFunction(functionName, args, options = {}) {
    return await functionManager.executeFunction(functionName, args, options);
}

export function getFunctionStats() {
    return functionManager.getStats();
}

export function getAvailableTools() {
    try {
        const schemas = toolManager.getToolSchemas();
        return schemas.map(t => ({ name: t.function.name, description: t.function.description }));
    } catch {
        return JOE_TOOLS.map(tool => ({ name: tool.function.name, description: tool.function.description }));
    }
}

export default {
    JOE_TOOLS,
    executeFunction,
    getFunctionStats,
    getAvailableTools
};
