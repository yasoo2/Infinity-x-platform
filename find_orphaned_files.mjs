
/**
 * find_orphaned_files.mjs (v7 - Ultimate Architectural Awareness)
 * 
 * This script performs a full dependency analysis, fully aware of all known
 * dynamic loading patterns in the project (ToolManager, API Routers).
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import codeAnalysisTool from './backend/src/tools_refactored/code_analysis.tool.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.vscode', 'public-site'];
const INCLUDE_EXTS = ['.mjs', '.js', '.jsx'];

const analyzedFiles = new Set();

// --- Utility Functions ---

async function getAllProjectFiles(dir) {
    let files = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !IGNORE_DIRS.includes(entry.name)) {
                files = files.concat(await getAllProjectFiles(fullPath));
            } else if (entry.isFile() && INCLUDE_EXTS.includes(path.extname(entry.name))) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') console.warn(`Warning: Could not read directory ${dir}`);
    }
    return files;
}

// --- Core Dependency Tracing Logic ---

async function traceDependencies(filePath, allFiles, importedModules) {
    if (!filePath || analyzedFiles.has(filePath) || !allFiles.includes(filePath)) {
        return;
    }
    analyzedFiles.add(filePath);
    importedModules.add(filePath);

    const result = await codeAnalysisTool.analyzeCode({ filePath });

    if (result.success && result.dependencies) {
        for (const dep of result.dependencies) {
            const importerDir = path.dirname(filePath);
            let resolvedPath = path.resolve(importerDir, dep);

            let foundPath = null;
            const potentialPaths = [
                resolvedPath,
                resolvedPath + '.mjs',
                resolvedPath + '.js',
                resolvedPath + '.jsx',
                path.join(resolvedPath, 'index.mjs'),
                path.join(resolvedPath, 'index.js')
            ];

            for (const p of potentialPaths) {
                if (allFiles.includes(p)) {
                    foundPath = p;
                    break;
                }
            }
            
            if (foundPath) {
                await traceDependencies(foundPath, allFiles, importedModules);
            }
        }
    }
}

// --- Main Analysis ---

async function findOrphans() {
    console.log('Starting ultimate architecturally-aware analysis (v7)...');

    const allFiles = await getAllProjectFiles(PROJECT_ROOT);
    const importedModules = new Set();

    // --- ARCHITECTURAL AWARENESS --- 
    console.log('[Awareness] Pre-seeding graph with known dynamic loaders...');

    // 1. ToolManager Dynamic Loading
    const toolsDir = path.join(PROJECT_ROOT, 'backend', 'src', 'tools_refactored');
    try {
        const toolFiles = await fs.readdir(toolsDir);
        toolFiles.forEach(f => importedModules.add(path.join(toolsDir, f)));
        console.log(`  -> Aware of ${toolFiles.length} dynamically loaded tools.`);
    } catch (e) { console.warn('Could not read tools_refactored directory.')}

    // 2. API Router Dynamic Loading
    const apiDir = path.join(PROJECT_ROOT, 'backend', 'src', 'api');
    try {
        const routeFiles = await fs.readdir(apiDir);
        routeFiles.forEach(f => {
             if (f.endsWith('.router.mjs')) importedModules.add(path.join(apiDir, f))
        });
        console.log(`  -> Aware of dynamically loaded API routers.`);
    } catch (e) { console.warn('Could not read api directory.')}

    // --- TRACE FROM ENTRY POINTS --- 
    console.log('[Tracer] Beginning dependency graph traversal from entry points...');
    const entryPoints = [
        path.join(PROJECT_ROOT, 'backend', 'server.mjs'),
        path.join(PROJECT_ROOT, 'dashboard-x', 'src', 'main.jsx'),
        __filename
    ];

    for (const entry of entryPoints) {
        await traceDependencies(entry, allFiles, importedModules);
    }

    console.log(`\nAnalysis complete. Found ${importedModules.size} unique, active modules in the project.`);

    // --- Find and Report True Orphans ---
    const orphans = [];
    for (const file of allFiles) {
        if (!importedModules.has(file)) {
            orphans.push(path.relative(PROJECT_ROOT, file));
        }
    }

    if (orphans.length > 0) {
        console.log('\n---  💎 발견된 최종 고아 파일 (Final Orphan Files Found) ---');
        orphans.forEach(orphan => console.log(`- ${orphan}`));
        console.log(`\nFound ${orphans.length} final orphan file(s). These are the true candidates for reintegration.`);
    } else {
        console.log('\n--- ✅ No Orphan Files Found --- ');
        console.log('The project is perfectly clean. Every file is accounted for.');
    }
    
    return orphans;
}

// Execute the script
findOrphans().catch(console.error);
