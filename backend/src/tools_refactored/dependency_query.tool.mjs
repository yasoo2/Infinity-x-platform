import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const MAP_PATH = path.join(PROJECT_ROOT, 'project_dependency_map.json');

/**
 * Tool to query the project's dependency map (Contextual Memory Graph).
 * This allows Joe to understand which files depend on a given file, or which files a given file depends on.
 */
class DependencyQueryTool {
    constructor() {
        this.name = "dependency_query";
        this.description = "Queries the project's dependency map to find relationships between files. Use this tool to determine which files a given file imports, or which files import a given file, before making modifications.";
        this.parameters = {
            type: "object",
            properties: {
                file_path: {
                    type: "string",
                    description: "The relative path to the file to query (e.g., 'backend/server.mjs' or 'dashboard-x/src/App.jsx')."
                },
                query_type: {
                    type: "string",
                    enum: ["imports", "imported_by"],
                    description: "The type of query to perform. 'imports' finds files that the given file depends on. 'imported_by' finds files that depend on the given file."
                }
            },
            required: ["file_path", "query_type"]
        };
    }

    async loadMap() {
        try {
            const data = await fs.readFile(MAP_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error("Error loading dependency map:", error);
            return null;
        }
    }

    async queryDependencies({ file_path, query_type }) {
        const dependencyMap = await this.loadMap();
        if (!dependencyMap) {
            return "Error: Could not load project dependency map. The map file might be missing or corrupted.";
        }

        // Normalize path to use forward slashes and remove leading slash if present
        const normalizedPath = file_path.replace(/\\/g, '/').replace(/^\//, '');

        if (query_type === "imports") {
            const imports = dependencyMap[normalizedPath];
            if (imports) {
                return `The file '${normalizedPath}' imports the following files: ${imports.join(', ')}`;
            } else {
                return `The file '${normalizedPath}' was found, but it does not appear to import any other project files.`;
            }
        } else if (query_type === "imported_by") {
            const dependents = [];
            for (const [importer, importedFiles] of Object.entries(dependencyMap)) {
                if (importedFiles.includes(normalizedPath)) {
                    dependents.push(importer);
                }
            }

            if (dependents.length > 0) {
                return `The file '${normalizedPath}' is imported by the following files: ${dependents.join(', ')}`;
            } else {
                return `The file '${normalizedPath}' is not imported by any other project files.`;
            }
        }

        return "Error: Invalid query_type specified. Must be 'imports' or 'imported_by'.";
    }
}

DependencyQueryTool.prototype.queryDependencies.metadata = {
    name: "queryDependencies",
    description: "Queries the project's dependency map to find relationships between files. Use this tool to determine which files a given file imports, or which files import a given file, before making modifications.",
    parameters: {
        type: "object",
        properties: {
            file_path: {
                type: "string",
                description: "The relative path to the file to query (e.g., 'backend/server.mjs' or 'dashboard-x/src/App.jsx')."
            },
            query_type: {
                type: "string",
                enum: ["imports", "imported_by"],
                description: "The type of query to perform. 'imports' finds files that the given file depends on. 'imported_by' finds files that depend on the given file."
            }
        },
        required: ["file_path", "query_type"]
    }
};

export const queryDependencies = new DependencyQueryTool().queryDependencies;
queryDependencies.metadata = {
    name: "queryDependencies",
    description: "Queries the project's dependency map to find relationships between files. Use this tool to determine which files a given file imports, or which files import a given file, before making modifications.",
    parameters: {
        type: "object",
        properties: {
            file_path: {
                type: "string",
                description: "The relative path to the file to query (e.g., 'backend/server.mjs' or 'dashboard-x/src/App.jsx')."
            },
            query_type: {
                type: "string",
                enum: ["imports", "imported_by"],
                description: "The type of query to perform. 'imports' finds files that the given file depends on. 'imported_by' finds files that depend on the given file."
            }
        },
        required: ["file_path", "query_type"]
    }
};
