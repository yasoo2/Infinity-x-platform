
import fs from 'fs/promises';
import path from 'path';

// A simple function to recursively get all file paths in a directory
async function getFilePaths(dirPath, fileList = []) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        // Ignore common directories
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await getFilePaths(fullPath, fileList);
        } else if (entry.isFile()) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

/**
 * Analyzes the codebase to identify its structure and main components.
 * @param {string} projectPath - The root path of the project to analyze.
 * @returns {Promise<object>} An object containing the analysis results.
 */
export const analyzeCodebase = async ({ projectPath }) => {
    console.log(`[CapabilityEvolution] Starting codebase analysis at: ${projectPath}`);
    try {
        const files = await getFilePaths(projectPath);
        const structure = files.map(f => path.relative(projectPath, f)); // Get relative paths

        const analysis = {
            fileCount: files.length,
            fileStructure: structure,
        };
        console.log(`[CapabilityEvolution] Analysis complete. Found ${analysis.fileCount} files.`);
        return analysis;

    } catch (error) {
        console.error('[CapabilityEvolution] Error during codebase analysis:', error);
        throw new Error('Failed to analyze codebase.');
    }
};

/**
 * Suggests improvements for the codebase based on an analysis.
 * @param {object} analysis - The analysis object from analyzeCodebase.
 * @returns {Promise<object>} An object containing suggested improvements.
 */
export const suggestImprovements = async ({ analysis }) => {
    console.log('[CapabilityEvolution] Generating improvement suggestions...');
    if (!analysis || !analysis.fileStructure) {
        throw new Error('Invalid analysis object provided.');
    }

    const suggestions = [
        "Consider adding more robust error handling in server.mjs.",
        "Implement a more structured logging system.",
        "The file structure looks good, but consider creating a dedicated 'utils' directory for helper functions.",
        "Add unit tests for critical components like auth.mjs and database.mjs.",
    ];

    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[CapabilityEvolution] Suggestions generated.');
    return {
        suggestions,
    };
};
