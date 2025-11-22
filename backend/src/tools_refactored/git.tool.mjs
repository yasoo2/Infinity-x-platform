/**
 * Git Tool - A unified tool for Git version control.
 * Provides comprehensive Git functionalities, from basic staging to complex commands.
 * @version 1.0.0 - ToolManager Compliant
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Low-level command execution
async function executeGitCommand({ command, directory = '.' }) {
  try {
    // Security: Basic validation to prevent arbitrary command execution
    if (!command.trim().startsWith('git ')) {
        return { success: false, error: 'Invalid command. Only git commands are allowed.' };
    }
    const { stdout, stderr } = await execAsync(command, { cwd: directory });
    return { success: true, output: stdout || stderr };
  } catch (error) {
    return { success: false, error: `Command failed: ${command}\n${error.message}` };
  }
}
executeGitCommand.metadata = {
    name: "executeGitCommand",
    description: "Executes any raw git command in a specified directory. Use with caution. Primarily for advanced operations not covered by other tools.",
    parameters: {
        type: "object",
        properties: {
            command: { type: "string", description: "The full git command to execute (e.g., 'git log -n 5')." },
            directory: { type: "string", description: "The repository directory to run the command in.", default: "." }
        },
        required: ["command"]
    }
};

// High-level, structured functions

async function gitStatus({ directory = '.' }) {
    return executeGitCommand({ command: 'git status', directory });
}
gitStatus.metadata = {
    name: "gitStatus",
    description: "Checks the status of the Git repository, showing staged, unstaged, and untracked files.",
    parameters: {
        type: "object",
        properties: {
            directory: { type: "string", description: "The directory of the git repository.", default: "." }
        }
    }
};

async function gitAdd({ files = ['.'], directory = '.' }) {
    const fileList = Array.isArray(files) ? files.join(' ') : files;
    return executeGitCommand({ command: `git add ${fileList}`, directory });
}
gitAdd.metadata = {
    name: "gitAdd",
    description: "Adds one or more files to the staging area.",
    parameters: {
        type: "object",
        properties: {
            files: { type: "array", items: { type: "string" }, description: "An array of file paths or patterns to add.", default: ["."] },
            directory: { type: "string", description: "The directory of the git repository.", default: "." }
        }
    }
};

async function gitCommit({ message, directory = '.' }) {
    const sanitizedMessage = message.replace(/"/g, '\\"');
    return executeGitCommand({ command: `git commit -m "${sanitizedMessage}"`, directory });
}
gitCommit.metadata = {
    name: "gitCommit",
    description: "Commits the currently staged changes to the local repository with a message.",
    parameters: {
        type: "object",
        properties: {
            message: { type: "string", description: "The commit message." },
            directory: { type: "string", description: "The directory of the git repository.", default: "." }
        },
        required: ["message"]
    }
};

async function gitPush({ remote = 'origin', branch = 'main', directory = '.' }) {
    return executeGitCommand({ command: `git push ${remote} ${branch}`, directory });
}
gitPush.metadata = {
    name: "gitPush",
    description: "Pushes the committed changes from a local branch to a remote repository.",
    parameters: {
        type: "object",
        properties: {
            remote: { type: "string", description: "The name of the remote repository.", default: "origin" },
            branch: { type: "string", description: "The local branch to push.", default: "main" },
            directory: { type: "string", description: "The directory of the git repository.", default: "." }
        }
    }
};

async function gitPull({ remote = 'origin', branch = 'main', directory = '.' }) {
    return executeGitCommand({ command: `git pull ${remote} ${branch}`, directory });
}
gitPull.metadata = {
    name: "gitPull",
    description: "Fetches changes from a remote repository and merges them into the current branch.",
    parameters: {
        type: "object",
        properties: {
            remote: { type: "string", description: "The name of the remote to pull from.", default: "origin" },
            branch: { type: "string", description: "The remote branch to pull.", default: "main" },
            directory: { type: "string", description: "The directory of the git repository.", default: "." }
        }
    }
};

async function gitClone({ repoUrl, targetDir }) {
    // No directory needed here as it's not an existing repo
    return executeGitCommand({ command: `git clone ${repoUrl} "${targetDir}"` });
}
gitClone.metadata = {
    name: "gitClone",
    description: "Clones a remote repository into a new local directory.",
    parameters: {
        type: "object",
        properties: {
            repoUrl: { type: "string", description: "The URL of the remote Git repository." },
            targetDir: { type: "string", description: "The local directory to clone the repository into." }
        },
        required: ["repoUrl", "targetDir"]
    }
};

// A helpful workflow function
async function stageCommitAndPush({ message, directory = '.', files = ['.'], branch = 'main' }) {
  try {
    const addResult = await gitAdd({ files, directory });
    if (!addResult.success) throw new Error(`Git add failed: ${addResult.error}`);

    const commitResult = await gitCommit({ message, directory });
    if (!commitResult.success) throw new Error(`Git commit failed: ${commitResult.error}`);

    const pushResult = await gitPush({ branch, directory });
    if (!pushResult.success) throw new Error(`Git push failed: ${pushResult.error}`);

    return { success: true, message: `Successfully staged, committed, and pushed changes to ${branch}.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
stageCommitAndPush.metadata = {
    name: "stageCommitAndPush",
    description: "A convenient workflow tool that stages all changes, commits them, and pushes to the main branch.",
    parameters: {
        type: "object",
        properties: {
            message: { type: "string", description: "The commit message for the changes." },
            directory: { type: "string", description: "The repository directory.", default: "." },
            files: { type: "array", items: { type: "string" }, description: "Files to stage.", default: ["."] },
            branch: { type: "string", description: "The branch to push to.", default: "main" }
        },
        required: ["message"]
    }
};


export default { 
    executeGitCommand,
    gitStatus, 
    gitAdd,
    gitCommit, 
    gitPush, 
    gitPull, 
    gitClone, 
    stageCommitAndPush 
};
