import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * GitHub Tools for JOE
 * Provides full GitHub operations: clone, read, edit, commit, push
 * @version 2.0.0 - Refactored for ToolManager Compliance
 */
class GitHubTools {
  constructor(dependencies) {
    this.token = dependencies.github?.token || process.env.GITHUB_TOKEN;
    this.username = dependencies.github?.username || 'yasoo2';
    this.workDir = '/tmp/joe-workspace';
    this._initializeMetadata();
  }

  _initializeMetadata() {
    this.cloneRepo.metadata = {
      name: "githubCloneRepo",
      description: "Clones a GitHub repository to a local workspace.",
      parameters: {
        type: "object",
        properties: {
          repoName: { type: "string", description: "The name of the repository (e.g., 'my-project')." },
          branch: { type: "string", description: "The branch to clone.", default: "main" }
        },
        required: ["repoName"]
      }
    };
    this.readFile.metadata = {
        name: "githubReadFile",
        description: "Reads a file from a cloned repository.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                filePath: { type: "string", description: "The path to the file within the repository." }
            },
            required: ["repoName", "filePath"]
        }
    };
    this.writeFile.metadata = {
        name: "githubWriteFile",
        description: "Writes or overwrites a file in a cloned repository.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                filePath: { type: "string", description: "The path to the file to write." },
                content: { type: "string", description: "The new content of the file." }
            },
            required: ["repoName", "filePath", "content"]
        }
    };
    this.commit.metadata = {
        name: "githubCommit",
        description: "Commits all staged changes in a cloned repository.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                message: { type: "string", description: "The commit message." }
            },
            required: ["repoName", "message"]
        }
    };
    this.push.metadata = {
        name: "githubPush",
        description: "Pushes committed changes to the remote repository.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                branch: { type: "string", description: "The branch to push to.", default: "main" }
            },
            required: ["repoName"]
        }
    };
    this.searchReplaceAndPush.metadata = {
        name: "githubSearchReplaceAndPush",
        description: "Workflow: Clones a repo, performs a search-and-replace on all files, commits, and pushes the changes.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                pattern: { type: "string", description: "The regex pattern to search for." },
                replacement: { type: "string", description: "The text to replace the pattern with." },
                commitMessage: { type: "string", description: "The commit message for the changes." }
            },
            required: ["repoName", "pattern", "replacement", "commitMessage"]
        }
    };
    this.searchReplaceInFiles.metadata = {
        name: "githubSearchReplaceInFiles",
        description: "Workflow: Clones a repo, performs search-and-replace on specific files, commits, and pushes.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                targetFiles: { type: "array", items: { type: "string" }, description: "An array of specific file paths to modify." },
                pattern: { type: "string", description: "The regex pattern to search for." },
                replacement: { type: "string", description: "The text to replace the pattern with." },
                commitMessage: { type: "string", description: "The commit message for the changes." }
            },
            required: ["repoName", "targetFiles", "pattern", "replacement", "commitMessage"]
        }
    };
     this.listFiles.metadata = {
        name: "githubListFiles",
        description: "Lists files and directories in a specified path within a cloned repository.",
        parameters: {
            type: "object",
            properties: {
                repoName: { type: "string", description: "The name of the repository." },
                directory: { type: "string", description: "The directory path to list.", default: "." }
            },
            required: ["repoName"]
        }
    };
  }

  async cloneRepo(repoName, branch = 'main') {
    if (!this.token) return { success: false, error: "GitHub token is not configured." };
    try {
      await execAsync(`rm -rf ${this.workDir}`);
      await fs.mkdir(this.workDir, { recursive: true });
      const repoUrl = `https://${this.token}@github.com/${this.username}/${repoName}.git`;
      await execAsync(`cd ${this.workDir} && git clone -b ${branch} ${repoUrl} ${repoName}`, { maxBuffer: 10 * 1024 * 1024 });
      return { success: true, path: path.join(this.workDir, repoName), message: "Repository cloned successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async readFile(repoName, filePath) {
    try {
      const fullPath = path.join(this.workDir, repoName, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return { success: true, content, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async writeFile(repoName, filePath, content) {
    try {
      const fullPath = path.join(this.workDir, repoName, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      return { success: true, path: filePath, message: "File written successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async searchAndReplace(repoName, pattern, replacement) {
      // This is a helper, so it does not need metadata
    try {
      const repoPath = path.join(this.workDir, repoName);
      const { stdout } = await execAsync(`cd ${repoPath} && git grep -l "${pattern}" -- '*' || true`);
      const files = stdout.trim().split('\n').filter(f => f);
      const modified = [];
      for (const file of files) {
        const filePath = file.replace('./', '');
        const readResult = await this.readFile(repoName, filePath);
        if (readResult.success) {
          const newContent = readResult.content.replace(new RegExp(pattern, 'g'), replacement);
          await this.writeFile(repoName, filePath, newContent);
          modified.push(filePath);
        }
      }
      return { success: true, modified, count: modified.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async commit(repoName, message) {
    try {
      const repoPath = path.join(this.workDir, repoName);
      await execAsync(`cd ${repoPath} && git config user.email "joe@xelitesolutions.com"`);
      await execAsync(`cd ${repoPath} && git config user.name "JOE AI"`);
      await execAsync(`cd ${repoPath} && git add -A`);
      const { stdout } = await execAsync(`cd ${repoPath} && git commit -m "${message.replace(/"/g, '\\"')}"`);
      if (stdout.includes('nothing to commit')) {
        return { success: true, message: 'No changes to commit' };
      }
      return { success: true, message: stdout.trim() };
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        return { success: true, message: 'No changes to commit' };
      }
      return { success: false, error: error.message };
    }
  }

  async push(repoName, branch = 'main') {
    if (!this.token) return { success: false, error: "GitHub token is not configured." };
    try {
      const repoPath = path.join(this.workDir, repoName);
      const repoUrl = `https://${this.token}@github.com/${this.username}/${repoName}.git`;
      await execAsync(`cd ${repoPath} && git push ${repoUrl} ${branch}`);
      return { success: true, message: `Pushed to ${branch}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async searchReplaceAndPush(repoName, pattern, replacement, commitMessage) {
    try {
      const cloneResult = await this.cloneRepo(repoName);
if (!cloneResult.success) return { success: false, step: 'clone', error: cloneResult.error };

      const replaceResult = await this.searchAndReplace(repoName, pattern, replacement);
      if (!replaceResult.success) return { success: false, step: 'replace', error: replaceResult.error };
      if (replaceResult.count === 0) return { success: true, message: 'No matches found', modified: [] };

      const commitResult = await this.commit(repoName, commitMessage);
      if (!commitResult.success) return { success: false, step: 'commit', error: commitResult.error };
        if(commitResult.message === 'No changes to commit') {
            return { success: true, message: "No functional changes detected after replacement."}
        }

      const pushResult = await this.push(repoName);
      if (!pushResult.success) return { success: false, step: 'push', error: pushResult.error };

      return { success: true, message: `Modified ${replaceResult.count} files and pushed`, modified: replaceResult.modified };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async searchReplaceInFiles(repoName, targetFiles, pattern, replacement, commitMessage) {
    try {
      const cloneResult = await this.cloneRepo(repoName);
      if (!cloneResult.success) return cloneResult;

      const repoPath = path.join(this.workDir, repoName);
      const modified = [];

      for (const file of targetFiles) {
        const filePath = path.join(repoPath, file);
        try {
          await fs.access(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          if (new RegExp(pattern).test(content)) {
            const newContent = content.replace(new RegExp(pattern, 'g'), replacement);
            if (content !== newContent) {
                 await fs.writeFile(filePath, newContent, 'utf-8');
                 modified.push(file);
            }
          }
        } catch (error) {
           console.log(`File not found or error processing: ${file}, ${error.message}`);
        }
      }

      if (modified.length === 0) {
        return { success: true, message: 'No files were modified (pattern not found or content was identical).', modified: [] };
      }

      const commitResult = await this.commit(repoName, commitMessage);
       if (!commitResult.success) return { success: false, step: 'commit', error: commitResult.error };
       if(commitResult.message === 'No changes to commit') {
            return { success: true, message: "No functional changes detected after replacement."}
        }

      const pushResult = await this.push(repoName);
      if (!pushResult.success) return { success: false, step: 'push', error: pushResult.error };

      return { success: true, modified, count: modified.length, message: `Modified ${modified.length} files and pushed` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
    
  async listFiles(repoName, directory = '.') {
    try {
      const repoPath = path.join(this.workDir, repoName, directory);
      const files = await fs.readdir(repoPath, { withFileTypes: true });
      const fileList = files.map(f => ({
        name: f.name,
        type: f.isDirectory() ? 'directory' : 'file',
        path: path.join(directory, f.name)
      }));
      return { success: true, files: fileList };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default GitHubTools;
