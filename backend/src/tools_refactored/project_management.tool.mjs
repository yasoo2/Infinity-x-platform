import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const TODO_FILE = path.join(PROJECT_ROOT, 'PROJECT_TODO.md');

/**
 * 📋 ProjectManagementTool - Enables JOE to manage project tasks, break down complex instructions, and track progress.
 * This tool transforms high-level user requests into actionable, structured tasks.
 */
class ProjectManagementTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.createTaskFromInstruction.metadata = {
            name: "createTaskFromInstruction",
            description: "Analyzes a complex, high-level user instruction and breaks it down into a structured, actionable list of sub-tasks, saving them to the PROJECT_TODO.md file.",
            parameters: {
                type: "object",
                properties: {
                    instruction: {
                        type: "string",
                        description: "The complex user instruction to be broken down (e.g., 'Build a user authentication system with Google login and a dashboard')."
                    },
                    tasks: {
                        type: "array",
                        description: "A structured list of sub-tasks derived from the instruction, each task should be a concise string.",
                        items: { type: "string" }
                    }
                },
                required: ["instruction", "tasks"]
            }
        };
    }

    async createTaskFromInstruction({ instruction, tasks }) {
        const header = `## Project Task Breakdown: ${new Date().toISOString()}\n\n`;
        const instructionSection = `### Original Instruction\n\n> ${instruction}\n\n`;
        
        const taskList = tasks.map((task, index) => {
            return `- [ ] **Task ${index + 1}:** ${task}`;
        }).join('\n');

        const taskSection = `### Actionable Sub-Tasks\n\n${taskList}\n\n---\n`;
        
        const content = header + instructionSection + taskSection;

        try {
            await fs.appendFile(TODO_FILE, content, 'utf-8');
            return {
                success: true,
                message: `Successfully broke down the instruction into ${tasks.length} tasks and saved them to ${TODO_FILE}.`,
                tasks: tasks
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to save tasks to ${TODO_FILE}. Error: ${error.message}`
            };
        }
    }
}

export default ProjectManagementTool;
