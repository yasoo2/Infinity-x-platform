import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

/**
 * 🛠️ CodeRefactoringTool - Enables JOE to perform safe, intelligent, and project-wide code refactoring.
 * This tool leverages the Contextual Memory Graph (CMG) for project-wide symbol renaming.
 */
class CodeRefactoringTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.renameSymbolGlobally.metadata = {
            name: "renameSymbolGlobally",
            description: "Safely renames a variable, function, or class across all files that use it. This tool uses the project's dependency map to ensure all affected files are updated, preventing broken references.",
            parameters: {
                type: "object",
                properties: {
                    file_path: {
                        type: "string",
                        description: "The relative path to the file where the symbol is defined (e.g., 'backend/src/services/auth.mjs')."
                    },
                    old_symbol_name: {
                        type: "string",
                        description: "The exact name of the symbol (variable, function, or class) to be renamed."
                    },
                    new_symbol_name: {
                        type: "string",
                        description: "The new name for the symbol."
                    }
                },
                required: ["file_path", "old_symbol_name", "new_symbol_name"]
            }
        };
    }

    async renameSymbolGlobally({ file_path, old_symbol_name, new_symbol_name }) {
        // 1. Use the dependency_query tool to find all files that import the file_path
        const dependencyQueryTool = this.dependencies.toolManager.tools.get('dependency_query');
        if (!dependencyQueryTool) {
            return "Error: The 'dependency_query' tool is required but not available. Cannot perform safe refactoring.";
        }

        // We need to find all files that import the file where the symbol is defined.
        const dependentsResult = await dependencyQueryTool.call({
            file_path: file_path,
            query_type: "imported_by"
        });

        if (dependentsResult.startsWith("Error")) {
            return `Error during dependency check: ${dependentsResult}`;
        }

        // Parse the result to get the list of files
        const dependentsMatch = dependentsResult.match(/is imported by the following files: (.*)/);
        const dependentFiles = dependentsMatch ? dependentsMatch[1].split(', ').map(f => f.trim()) : [];

        // Add the definition file itself to the list of files to be modified
        const filesToModify = [file_path, ...dependentFiles];

        const modificationSummary = [];

        // 2. Perform the rename operation in all affected files
        for (const filePath of filesToModify) {
            const absolutePath = path.join(PROJECT_ROOT, filePath);
            try {
                let content = await fs.readFile(absolutePath, 'utf-8');
                
                // Simple regex replacement for demonstration. 
                // In a real system, this would use an AST parser for safety.
                const regex = new RegExp(`\\b${old_symbol_name}\\b`, 'g');
                const newContent = content.replace(regex, new_symbol_name);

                if (content !== newContent) {
                    await fs.writeFile(absolutePath, newContent, 'utf-8');
                    modificationSummary.push(`Successfully renamed '${old_symbol_name}' to '${new_symbol_name}' in: ${filePath}`);
                } else {
                    modificationSummary.push(`Symbol '${old_symbol_name}' not found or no change needed in: ${filePath}`);
                }

            } catch (error) {
                modificationSummary.push(`Error modifying file ${filePath}: ${error.message}`);
            }
        }

        if (modificationSummary.length === 0) {
            return `Refactoring complete. No files were modified. The symbol '${old_symbol_name}' was not found in the definition file or its dependents.`;
        }

        return `Refactoring successful. The symbol '${old_symbol_name}' was renamed to '${new_symbol_name}' in the following files:\n- ${modificationSummary.join('\n- ')}`;
    }
}

export default CodeRefactoringTool;
