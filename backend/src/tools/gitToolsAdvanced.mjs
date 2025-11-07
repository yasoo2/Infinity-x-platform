import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function executeGitCommand(command, cwd = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { success: true, output: stdout || stderr, command };
  } catch (error) {
    return { success: false, error: error.message, command };
  }
}

export async function gitAutoCommitPush(message, projectPath = process.cwd()) {
  try {
    await executeGitCommand('git add .', projectPath);
    await executeGitCommand(`git commit -m "${message}"`, projectPath);
    const pushResult = await executeGitCommand('git push origin main', projectPath);
    return { success: pushResult.success, message: 'تم رفع التغييرات بنجاح' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const gitToolsAdvanced = { gitAutoCommitPush };
