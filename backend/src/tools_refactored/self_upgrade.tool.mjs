/**
 * Self-Upgrade Tool
 * Provides tools for JoEngine to manage its own dependencies and configuration.
 */
import fs from 'fs/promises';
import path from 'path';

class SelfUpgradeTool {
    constructor(dependencies) {
        this.shell = dependencies.shell;
    }

    /**
     * @metadata
     * @description Installs a new npm package dependency for the backend.
     * @parameters {
     *   "type": "object",
     *   "properties": {
     *     "packageName": { "type": "string", "description": "The name of the npm package to install (e.g., 'axios')." },
     *     "isDevDependency": { "type": "boolean", "description": "Set to true if it's a development dependency." }
     *   },
     *   "required": ["packageName"]
     * }
     */
    async installDependency({ packageName, isDevDependency = false }) {
        const devFlag = isDevDependency ? '--save-dev' : '--save';
        const command = `cd backend && npm install ${packageName} ${devFlag}`;
        
        try {
            const { stdout, stderr } = await this.shell.exec(command);
            if (stderr) {
                return { success: false, message: `Installation failed: ${stderr}` };
            }
            return { success: true, message: `Package ${packageName} installed successfully. Output: ${stdout}` };
        } catch (error) {
            return { success: false, message: `Installation failed: ${error.message}` };
        }
    }

    /**
     * @metadata
     * @description Updates a key-value pair in the backend's .env configuration file.
     * @parameters {
     *   "type": "object",
     *   "properties": {
     *     "key": { "type": "string", "description": "The environment variable key (e.g., 'OPENAI_API_KEY')." },
     *     "value": { "type": "string", "description": "The new value for the environment variable." }
     *   },
     *   "required": ["key", "value"]
     * }
     */
    async updateEnvVariable({ key, value }) {
        const envPath = path.join(process.cwd(), 'backend', '.env');
        try {
            let content = '';
            try {
                content = await fs.readFile(envPath, 'utf-8');
            } catch (e) {
                // File doesn't exist, will be created
            }

            const regex = new RegExp(`^${key}=.*$`, 'm');
            const newLine = `${key}=${value}`;

            if (content.match(regex)) {
                content = content.replace(regex, newLine);
            } else {
                content += `\n${newLine}\n`;
            }

            await fs.writeFile(envPath, content.trim() + '\n');
            return { success: true, message: `Environment variable ${key} updated successfully in .env.` };
        } catch (error) {
            return { success: false, message: `Failed to update .env file: ${error.message}` };
        }
    }
}

export default SelfUpgradeTool;
