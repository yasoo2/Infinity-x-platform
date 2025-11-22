import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseTool } from './Tool.mjs';

const execAsync = promisify(exec);

/**
 * @class ShellTool
 * @description A tool for executing system shell commands. It allows running commands
 * like 'ls', 'mkdir', 'npm install', etc., from the project's root directory.
 */
export class ShellTool extends BaseTool {
  name = 'shell_tool';
  description = 'Executes system shell commands within the project root directory. Use with caution.';

  parameters = {
    command: {
      type: 'string',
      description: 'The shell command to execute.',
      required: true,
    },
    timeout: {
      type: 'number',
      description: 'Timeout in milliseconds for the command execution (default: 60000).',
      required: false,
    },
  };

  constructor() {
    super();
    // The working directory is the root of the repository.
    this.workDir = process.cwd();
  }

  /**
   * Executes the given shell command.
   * @param {object} params - The parameters for the tool execution.
   * @returns {Promise<object>} The result, including stdout and stderr.
   */
  async execute(params) {
    const validation = this.validate(params);
    if (!validation.isValid) {
      return { success: false, error: validation.message };
    }

    const { command, timeout = 60000 } = params;

    console.log(`Executing shell command: \"${command}\"`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workDir,
        timeout: timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr) {
        // Many tools write to stderr for warnings or progress.
        // We'll log it but not treat it as a failure.
        console.warn(`Shell command produced output on stderr: ${stderr.trim()}`);
      }

      return {
        success: true,
        command: command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      // This 'catch' block handles actual execution failures (e.g., command not found, non-zero exit code).
      console.error(`Shell command failed: \"${command}\"`, error);
      return {
        success: false,
        command: command,
        error: `Command failed with exit code ${error.code}. Message: ${error.message}`,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
      };
    }
  }
}

export default ShellTool;
