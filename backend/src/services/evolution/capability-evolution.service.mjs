
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import codeAnalysisTool from '../../tools_refactored/code_analysis.tool.mjs';

// Helper to get file paths, ignoring node_modules, .git, etc. and focusing on JS files
async function getFilePaths(dirPath, fileList = []) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build', 'docs'].includes(entry.name)) {
            await getFilePaths(fullPath, fileList);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

/**
 * Analyzes the codebase using the real code analysis tool.
 * @param {string} projectPath - The root path of the project to analyze.
 * @returns {Promise<object>} An object containing the detailed analysis results.
 */
export const analyzeCodebase = async ({ projectPath }) => {
    console.log(`[CapabilityEvolution-V2.1] Starting REAL codebase analysis at: ${projectPath}`);
    try {
        const files = await getFilePaths(projectPath);
        const analysisResults = [];

        for (const file of files) {
            console.log(`[CapabilityEvolution-V2.1] Analyzing: ${path.relative(projectPath, file)}`);
            const result = await codeAnalysisTool.analyzeCode({ filePath: file });
            if (result.success) {
                analysisResults.push({
                    file: path.relative(projectPath, file),
                    metrics: result.metrics,
                });
            } else {
                console.warn(`[CapabilityEvolution-V2.1] Skipping file ${file} due to analysis error: ${result.message}`);
            }
        }

        const overallMetrics = {
            totalFilesAnalyzed: analysisResults.length,
            totalComplexity: analysisResults.reduce((sum, item) => sum + (item.metrics.complexity || 0), 0),
            totalLines: analysisResults.reduce((sum, item) => sum + (item.metrics.lineCount || 0), 0),
        };

        console.log(`[CapabilityEvolution-V2.1] Analysis complete. Analyzed ${overallMetrics.totalFilesAnalyzed} files.`);
        return {
            overallMetrics,
            detailedAnalysis: analysisResults,
        };

    } catch (error) {
        console.error('[CapabilityEvolution-V2.1] CRITICAL Error during codebase analysis:', error);
        throw new Error('Failed to analyze codebase with V2.1 engine.');
    }
};

/**
 * Suggests improvements for the codebase based on REAL analysis, acting as a Principal Engineer.
 * @param {object} analysis - The analysis object from the new analyzeCodebase.
 * @returns {Promise<object>} An object containing strategic, actionable improvement suggestions.
 */
export const suggestImprovements = async ({ analysis }) => {
    console.log('[CapabilityEvolution-V2.1] Generating STRATEGIC improvement suggestions...');
    if (!analysis || !analysis.detailedAnalysis) {
        throw new Error('Invalid or empty analysis object provided to V2.1 suggestion engine.');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // **SYNTAX FIX APPLIED HERE**
    // The detailed analysis is mapped and joined with a correctly escaped newline character (\n).
    const prompt = `
        You are an expert Principal Software Engineer reviewing a codebase analysis.
        Your task is to identify the most critical areas for improvement to reduce technical debt and improve maintainability.
        Focus on high-impact changes. Be specific and actionable.

        Codebase Analysis Summary:
        - Total Files Analyzed: ${analysis.overallMetrics.totalFilesAnalyzed}
        - Total Cyclomatic Complexity: ${analysis.overallMetrics.totalComplexity}
        - Total Lines of Code: ${analysis.overallMetrics.totalLines}

        Detailed Analysis (Top 5 most complex files):
        ${analysis.detailedAnalysis
            .sort((a, b) => b.metrics.complexity - a.metrics.complexity)
            .slice(0, 5)
            .map(f => `- File: ${f.file}, Complexity: ${f.metrics.complexity}, Lines: ${f.metrics.lineCount}`)
            .join('\n')}

        Based on this data, provide a list of 3 to 5 high-priority, actionable refactoring suggestions.
        For each suggestion, specify the file and the reason for the suggested change.
        Format your response as a JSON object with a "suggestions" array. Each element in the array should be a string.

        Example response:
        {
            "suggestions": [
                "Refactor the main logic in 'src/server.mjs' (Complexity: 45) to delegate tasks to smaller, single-responsibility modules.",
                "Create a shared utility module for the duplicate helper functions found across several services."
            ]
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsedResponse = JSON.parse(responseText);
        
        console.log('[CapabilityEvolution-V2.1] Strategic suggestions generated by AI.');
        return parsedResponse;

    } catch (error) {
        console.error('[CapabilityEvolution-V2.1] AI suggestion generation failed:', error);
        // Fallback to a default, intelligent suggestion if AI fails
        return {
            suggestions: [
                `Review and potentially refactor the most complex file identified: ${analysis.detailedAnalysis[0]?.file || 'N/A'}`
            ]
        };
    }
};
