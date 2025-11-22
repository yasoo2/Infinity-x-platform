/**
 * 🎯 JOE Advanced Function Calling System - UNIFIED & MODERNIZED
 * This service now acts as the central nervous system for tool execution,
 * leveraging the modern, robust tools from the joengine-agi architecture.
 */

// --- DECOMMISSIONED IMPORTS ---
// import { webSearchTools } from '../tools/webSearchTools.mjs';
// ... and all other old tool imports are removed.

// --- MODERN AGI TOOL IMPORTS ---
import { getDB } from '../db.mjs';
import GitHubTool from '../../../joengine-agi/tools/GitHubTool.mjs';
import DeployTool from '../../../joengine-agi/tools/DeployTool.mjs';
import GrokTool from '../../../joengine-agi/tools/GrokTool.mjs';
import { VectorDBTool } from '../../../joengine-agi/tools/VectorDBTool.mjs';
import DatabaseTool from '../../../joengine-agi/tools/DatabaseTool.mjs';
import { SmartPageBuilder } from '../../../joengine-agi/engines/SmartPageBuilder.mjs';

// --- TOOL INSTANTIATION ---
// We create single, configured instances of our modern tools.
const config = {
    githubToken: process.env.GITHUB_TOKEN,
    grokApiKey: process.env.GROK_API_KEY,
    // Add other necessary config keys here
};

const githubTool = new GitHubTool(config);
const deployTool = new DeployTool(config);
const grokTool = new GrokTool(config);
const vectorDbTool = new VectorDBTool({ collectionName: 'joengine_memory' });
const databaseTool = new DatabaseTool(config);
const pageBuilder = new SmartPageBuilder(config);

class FunctionCallingManager {
    // ... (constructor, stats, cache, queue, learning systems remain the same)
    constructor() {
        this.stats = { totalCalls: 0, successfulCalls: 0, failedCalls: 0, averageExecutionTime: 0, toolUsageCount: {}, lastExecutionTime: null };
        this.cache = new Map();
        this.cacheMaxAge = 5 * 60 * 1000;
        this.cacheTTL = new Map();
        console.log('✅ Unified Function Calling Manager initialized');
    }
    
    // ... (getStats, caching logic, etc. remain the same)
    getCachedResult(key) { /* ... */ }
    setCachedResult(key, result, ttl) { /* ... */ }


    async executeFunction(functionName, args, options = {}) {
        const executionId = `${functionName}-${Date.now()}`;
        const startTime = Date.now();

        console.log(`🔧 [${executionId}] Executing: ${functionName}`);
        this.stats.totalCalls++;

        try {
            // Caching logic can remain
            const cacheKey = `${functionName}:${JSON.stringify(args)}`;
            if (options.useCache !== false) {
                const cached = this.getCachedResult(cacheKey);
                if (cached) {
                    this.stats.successfulCalls++;
                    return { ...cached, fromCache: true, executionId };
                }
            }

            // --- RE-ROUTED TOOL EXECUTION ---
            let result;
            switch (functionName) {
                case 'github_create_repo':
                    result = await githubTool.createRepo(args.repoName, args.description, args.isPrivate);
                    break;
                case 'github_commit_and_push':
                    result = await githubTool.commitAndPush(args.repoPath, args.commitMessage);
                    break;

                case 'grok_refactor_code':
                    result = await grokTool.refactorCode(args.originalCode, args.command);
                    break;
                case 'grok_generate_code':
                    result = await grokTool.generateCode(args.description, args.codeType);
                    break;

                case 'deploy_project':
                    result = await deployTool.deploy(args.path, args.service);
                    break;

                case 'database_query':
                    result = await databaseTool.query(args.collection, args.filter, args.options);
                    break;
                case 'database_insert':
                    result = await databaseTool.insert(args.collection, args.document);
                    break;

                case 'memory_search':
                    await vectorDbTool.init();
                    result = await vectorDbTool.search(args.query, args.topK);
                    break;
                case 'memory_add':
                    await vectorDbTool.init();
                    result = await vectorDbTool.add(args.text, args.metadata);
                    break;

                case 'build_smart_page':
                    result = await pageBuilder.buildPageFromDescription(args.description, args.filePath, args.style);
                    break;

                default:
                    throw new Error(`Unknown or un-migrated function: ${functionName}`);
            }
            // --- END OF RE-ROUTED EXECUTION ---

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
            console.error(`❌ [${executionId}] Failed:`, error.message);
            await this.logExecution(executionId, functionName, args, null, executionTime, false, error);
            this.stats.failedCalls++;
            return { success: false, error: error.message, executionId, executionTime };
        } 
    }
    
    // Helper methods (updateExecutionStats, logExecution, etc.) remain the same
    updateExecutionStats(functionName, executionTime, success) { /* ... */ }
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

// --- UPDATED JOE_TOOLS DEFINITION ---
// This list must now accurately reflect the methods in our new tools.
export const JOE_TOOLS = [
    // GitHubTool
    { type: 'function', function: { name: 'github_create_repo', description: 'Creates a new GitHub repository.', parameters: { type: 'object', properties: { repoName: { type: 'string' }, description: { type: 'string' }, isPrivate: { type: 'boolean' } }, required: ['repoName'] } } },
    { type: 'function', function: { name: 'github_commit_and_push', description: 'Commits and pushes changes to a GitHub repository.', parameters: { type: 'object', properties: { repoPath: { type: 'string' }, commitMessage: { type: 'string' } }, required: ['repoPath', 'commitMessage'] } } },

    // GrokTool
    { type: 'function', function: { name: 'grok_refactor_code', description: 'Refactors code using Grok for improvements.', parameters: { type: 'object', properties: { originalCode: { type: 'string' }, command: { type: 'string' } }, required: ['originalCode', 'command'] } } },
    { type: 'function', function: { name: 'grok_generate_code', description: 'Generates new code from a description using Grok.', parameters: { type: 'object', properties: { description: { type: 'string' }, codeType: { type: 'string' } }, required: ['description'] } } },

    // DeployTool
    { type: 'function', function: { name: 'deploy_project', description: 'Deploys a project to a specified service (Vercel, Netlify, etc.).', parameters: { type: 'object', properties: { path: { type: 'string' }, service: { type: 'string' } }, required: ['path', 'service'] } } },

    // DatabaseTool
    { type: 'function', function: { name: 'database_query', description: 'Queries the MongoDB database.', parameters: { type: 'object', properties: { collection: { type: 'string' }, filter: { type: 'object' }, options: { type: 'object' } }, required: ['collection', 'filter'] } } },
    { type: 'function', function: { name: 'database_insert', description: 'Inserts a document into a MongoDB collection.', parameters: { type: 'object', properties: { collection: { type: 'string' }, document: { type: 'object' } }, required: ['collection', 'document'] } } },

    // VectorDBTool (Memory)
    { type: 'function', function: { name: 'memory_search', description: 'Searches for relevant information in the long-term semantic memory.', parameters: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'number' } }, required: ['query'] } } },
    { type: 'function', function: { name: 'memory_add', description: 'Adds a new piece of information to the long-term semantic memory.', parameters: { type: 'object', properties: { text: { type: 'string' }, metadata: { type: 'object' } }, required: ['text'] } } },
    
    // SmartPageBuilder
    { type: 'function', function: { name: 'build_smart_page', description: 'Builds a complete, production-ready web page from a description.', parameters: { type: 'object', properties: { description: { type: 'string' }, filePath: { type: 'string' }, style: { type: 'string' } }, required: ['description', 'filePath'] } } },
];

// --- EXPORTS --- 
// The core interface remains the same, providing a consistent API for the ExecutionEngine.
export async function executeFunction(functionName, args, options = {}) {
    return await functionManager.executeFunction(functionName, args, options);
}

export function getFunctionStats() {
    return functionManager.getStats();
}

export function getAvailableTools() {
    return JOE_TOOLS.map(tool => ({ name: tool.function.name, description: tool.function.description }));
}

export default {
    JOE_TOOLS,
    executeFunction,
    getFunctionStats,
    getAvailableTools
};
