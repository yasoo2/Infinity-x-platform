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
        this.cache = new Map();
        this.stats = new Map();
        this.circuit = new Map();
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
            if (typeof toolFunction === 'function') {
                const md = toolFunction.metadata || {};
                const schema = {
                    name: md.name || toolName,
                    description: md.description || 'No description provided',
                    parameters: md.parameters || { type: 'object', properties: {} }
                };
                // attach schema back to function for consistency
                toolFunction.metadata = schema;
                this.tools.set(toolName, toolFunction);
                this.toolSchemas.push({ type: 'function', function: schema });
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

    _cacheKey(toolName, args) {
        try { return `${toolName}:${JSON.stringify(args || {})}`; } catch { return `${toolName}:__` }
    }

    async execute(toolName, args) {
        if (!this._isInitialized) throw new Error('ToolManager not initialized.');
        const tool = this.tools.get(toolName);
        if (!tool) throw new Error(`Tool "${toolName}" not found.`);
        const now = Date.now();
        const c = this.circuit.get(toolName) || { fails: 0, openedUntil: 0 };
        if (c.openedUntil && now < c.openedUntil) throw new Error('CIRCUIT_OPEN');
        const useCache = args && (args.cache === true || typeof args.cacheKey === 'string');
        const ck = useCache ? (args.cacheKey || this._cacheKey(toolName, args)) : null;
        if (ck && this.cache.has(ck)) {
            const item = this.cache.get(ck);
            if (item && typeof item === 'object' && item.expiresAt) {
                if (Date.now() < item.expiresAt) return item.value;
                this.cache.delete(ck);
            } else {
                return item;
            }
        }
        const start = Date.now();
        console.log(`-⚡ Executing tool: ${toolName}`);
        try {
            const out = await tool(args);
            const dur = Date.now() - start;
            const s = this.stats.get(toolName) || { success: 0, failure: 0, avgMs: 0 };
            const total = s.success + s.failure;
            s.success += 1;
            s.avgMs = Math.round(((s.avgMs * total) + dur) / (total + 1));
            s.lastMs = dur;
            this.stats.set(toolName, s);
            this.circuit.set(toolName, { fails: 0, openedUntil: 0 });
            if (ck) {
                const ttl = Number(args.cacheTtlMs || 0);
                if (ttl > 0) {
                    this.cache.set(ck, { value: out, expiresAt: Date.now() + ttl });
                } else {
                    this.cache.set(ck, out);
                }
            }
            return out;
        } catch (e) {
            const s = this.stats.get(toolName) || { success: 0, failure: 0, avgMs: 0 };
            s.failure += 1;
            this.stats.set(toolName, s);
            c.fails += 1;
            if (c.fails >= 3) c.openedUntil = Date.now() + 30000;
            this.circuit.set(toolName, c);
            throw e;
        }
    }

    purgeCache() { this.cache.clear(); }
    resetCircuits() { this.circuit.clear(); }

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

    getStatsSnapshot() {
        const now = Date.now();
        const stats = Array.from(this.stats.entries()).map(([name, s]) => ({ name, success: s.success || 0, failure: s.failure || 0, avgMs: s.avgMs || 0, lastMs: s.lastMs || 0 }));
        const circuits = Array.from(this.circuit.entries()).map(([name, c]) => ({ name, open: !!(c.openedUntil && c.openedUntil > now), fails: c.fails || 0, openedUntil: c.openedUntil || 0 }));
        const openCircuits = circuits.filter(c => c.open).map(c => c.name);
        stats.sort((a, b) => (b.avgMs || 0) - (a.avgMs || 0));
        const ranking = this.getToolRanking();
        return {
            toolsCount: this.tools.size,
            schemasCount: this.toolSchemas.length,
            cacheSize: this.cache.size,
            stats,
            circuits,
            openCircuits,
            ranking
        };
    }

    getToolRanking() {
        const arr = Array.from(this.stats.entries()).map(([name, s]) => ({ name, success: s.success || 0, failure: s.failure || 0, avgMs: s.avgMs || 0, lastMs: s.lastMs || 0 }));
        if (!arr.length) return [];
        const maxAvg = Math.max(...arr.map(x => x.avgMs || 0)) || 1;
        return arr.map(x => {
            const total = (x.success + x.failure) || 1;
            const succRate = x.success / total; // 0..1
            const speedScore = 1 - Math.min((x.avgMs || 0) / maxAvg, 1); // 0..1
            const score = Math.round((succRate * 0.7 + speedScore * 0.3) * 100);
            return { ...x, score };
        }).sort((a, b) => (b.score - a.score));
    }
}

export default new ToolManager();
