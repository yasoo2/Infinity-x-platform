
/**
 * find_orphaned_files.mjs (v2 - Smart Edition)
 * 
 * A utility script to analyze the codebase and identify "orphaned" files.
 * This version is aware of the project's dynamic import patterns (e.g., for routers)
 * to avoid false positives.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// We need to import the actual analysis engine
import codeTools from './backend/src/tools_refactored/code.tool.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.vscode'];
const INCLUDE_EXTS = ['.mjs', '.js', '.jsx', '.ts', '.tsx'];

async function getAllProjectFiles(dir) {
    let files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !IGNORE_DIRS.includes(entry.name)) {
            files = files.concat(await getAllProjectFiles(fullPath));
        } else if (entry.isFile() && INCLUDE_EXTS.includes(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * The main function to run the analysis.
 */
async function findOrphans() {
    console.log('Starting smart orphan analysis (v2)...');

    const allFiles = await getAllProjectFiles(PROJECT_ROOT);
    const allImportedModules = new Set();
    const allExportingFiles = new Map();

    // ✨ Step 1: Simulate the dynamic loader from server.mjs
    console.log('[Awareness] Simulating dynamic route loading...');
    const apiDir = path.join(PROJECT_ROOT, 'backend', 'src', 'api');
    try {
        const routeFiles = await fs.readdir(apiDir);
        for (const file of routeFiles) {
            if (file.endsWith('.router.mjs')) {
                const fullPath = path.join(apiDir, file);
                allImportedModules.add(fullPath);
                console.log(`  -> Marked ${path.relative(PROJECT_ROOT, fullPath)} as dynamically imported.`);
            }
        }
    } catch (error) {
        console.warn('[Awareness] Could not read api directory. Dynamic routes will be missed.');
    }

    // Step 2: Analyze every file to map all static imports and all exports
    for (const file of allFiles) {
        try {
            const code = await fs.readFile(file, 'utf-8');
            const result = await codeTools.executeTask({ action: 'analyze', language: 'javascript', code });

            if (result.success) {
                result.dependencies.forEach(dep => {
                    const resolvedPath = path.resolve(path.dirname(file), dep.source);
                    allImportedModules.add(resolvedPath);
                    allImportedModules.add(resolvedPath + '.mjs'); 
                    allImportedModules.add(resolvedPath + '.js');
                });

                if (result.exports && result.exports.length > 0) {
                    allExportingFiles.set(file, result.exports);
                }
            }
        } catch (error) {
            console.warn(`Could not analyze file: ${file}`, error.message);
        }
    }

    // Step 3: Find the true orphans
    const orphans = [];
    const entryPoints = ['server.mjs', 'factory.worker.mjs', 'find_orphaned_files.mjs', 'vite.config'];
    for (const [file, exports] of allExportingFiles.entries()) {
        if (!allImportedModules.has(file)) {
            // Ignore known entry points
            if (entryPoints.some(entry => file.includes(entry))) {
                continue;
            }
            orphans.push(path.relative(PROJECT_ROOT, file));
        }
    }

    // Step 4: Report the findings
    if (orphans.length > 0) {
        console.log('\n---  발견된 고아 파일 (True Orphan Files Found) ---');
        orphans.forEach(orphan => console.log(`- ${orphan}`));
        console.log('\nThese files are the corrected list of candidates for deletion.');
    } else {
        console.log('\n--- No True Orphan Files Found ---');
        console.log('The project appears to be clean after smart analysis. Great job!');
    }
    
    return orphans;
}

// Execute the script
findOrphans().catch(console.error);
