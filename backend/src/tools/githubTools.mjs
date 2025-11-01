import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * GitHub Tools for JOE
 * Provides full GitHub operations: clone, read, edit, commit, push
 */

class GitHubTools {
  constructor(token, username = 'yasoo2') {
    this.token = token || process.env.GITHUB_TOKEN;
    this.username = username;
    this.workDir = '/tmp/joe-workspace';
  }

  /**
   * Clone repository
   */
  async cloneRepo(repoName, branch = 'main') {
    try {
      // Clean workspace
      await execAsync(`rm -rf ${this.workDir}`);
      await fs.mkdir(this.workDir, { recursive: true });

      // Clone with authentication
      const repoUrl = `https://${this.token}@github.com/${this.username}/${repoName}.git`;
      const { stdout, stderr } = await execAsync(
        `cd ${this.workDir} && git clone -b ${branch} ${repoUrl} ${repoName}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      console.log(`✅ Cloned ${repoName}`);
      return {
        success: true,
        path: path.join(this.workDir, repoName),
        message: `Repository cloned successfully`
      };
    } catch (error) {
      console.error(`❌ Clone failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Read file from repository
   */
  async readFile(repoName, filePath) {
    try {
      const fullPath = path.join(this.workDir, repoName, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      console.log(`✅ Read file: ${filePath}`);
      return {
        success: true,
        content,
        path: filePath
      };
    } catch (error) {
      console.error(`❌ Read file failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write/Edit file in repository
   */
  async writeFile(repoName, filePath, content) {
    try {
      const fullPath = path.join(this.workDir, repoName, filePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
      
      console.log(`✅ Wrote file: ${filePath}`);
      return {
        success: true,
        path: filePath,
        message: `File written successfully`
      };
    } catch (error) {
      console.error(`❌ Write file failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search and replace in files
   */
  async searchAndReplace(repoName, pattern, replacement, filePattern = '**/*') {
    try {
      const repoPath = path.join(this.workDir, repoName);
      
      // Use grep to find files
      const { stdout } = await execAsync(
        `cd ${repoPath} && grep -rl "${pattern}" . || true`
      );
      
      const files = stdout.trim().split('\n').filter(f => f);
      const modified = [];

      for (const file of files) {
        const filePath = file.replace('./', '');
        const readResult = await this.readFile(repoName, filePath);
        
        if (readResult.success) {
          const newContent = readResult.content.replace(
            new RegExp(pattern, 'g'),
            replacement
          );
          
          await this.writeFile(repoName, filePath, newContent);
          modified.push(filePath);
        }
      }

      console.log(`✅ Modified ${modified.length} files`);
      return {
        success: true,
        modified,
        count: modified.length
      };
    } catch (error) {
      console.error(`❌ Search and replace failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Commit changes
   */
  async commit(repoName, message) {
    try {
      const repoPath = path.join(this.workDir, repoName);
      
      // Configure git
      await execAsync(`cd ${repoPath} && git config user.email "joe@xelitesolutions.com"`);
      await execAsync(`cd ${repoPath} && git config user.name "JOE AI"`);
      
      // Add all changes
      await execAsync(`cd ${repoPath} && git add -A`);
      
      // Commit
      const { stdout } = await execAsync(
        `cd ${repoPath} && git commit -m "${message}"`
      );
      
      console.log(`✅ Committed: ${message}`);
      return {
        success: true,
        message: stdout.trim()
      };
    } catch (error) {
      // No changes to commit is not an error
      if (error.message.includes('nothing to commit')) {
        return {
          success: true,
          message: 'No changes to commit'
        };
      }
      
      console.error(`❌ Commit failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Push changes to remote
   */
  async push(repoName, branch = 'main') {
    try {
      const repoPath = path.join(this.workDir, repoName);
      
      const { stdout } = await execAsync(
        `cd ${repoPath} && git push origin ${branch}`
      );
      
      console.log(`✅ Pushed to ${branch}`);
      return {
        success: true,
        message: stdout.trim()
      };
    } catch (error) {
      console.error(`❌ Push failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete workflow: Clone → Edit → Commit → Push
   */
  async editAndPush(repoName, filePath, newContent, commitMessage) {
    try {
      // 1. Clone
      const cloneResult = await this.cloneRepo(repoName);
      if (!cloneResult.success) {
        return { success: false, step: 'clone', error: cloneResult.error };
      }

      // 2. Edit
      const writeResult = await this.writeFile(repoName, filePath, newContent);
      if (!writeResult.success) {
        return { success: false, step: 'write', error: writeResult.error };
      }

      // 3. Commit
      const commitResult = await this.commit(repoName, commitMessage);
      if (!commitResult.success) {
        return { success: false, step: 'commit', error: commitResult.error };
      }

      // 4. Push
      const pushResult = await this.push(repoName);
      if (!pushResult.success) {
        return { success: false, step: 'push', error: pushResult.error };
      }

      console.log(`✅ Complete workflow success`);
      return {
        success: true,
        message: `File ${filePath} edited and pushed successfully`,
        commitMessage
      };
    } catch (error) {
      console.error(`❌ Workflow failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search and replace workflow
   */
  async searchReplaceAndPush(repoName, pattern, replacement, commitMessage) {
    try {
      // 1. Clone
      const cloneResult = await this.cloneRepo(repoName);
      if (!cloneResult.success) {
        return { success: false, step: 'clone', error: cloneResult.error };
      }

      // 2. Search and replace
      const replaceResult = await this.searchAndReplace(repoName, pattern, replacement);
      if (!replaceResult.success) {
        return { success: false, step: 'replace', error: replaceResult.error };
      }

      if (replaceResult.count === 0) {
        return {
          success: true,
          message: 'No matches found',
          modified: []
        };
      }

      // 3. Commit
      const commitResult = await this.commit(repoName, commitMessage);
      if (!commitResult.success) {
        return { success: false, step: 'commit', error: commitResult.error };
      }

      // 4. Push
      const pushResult = await this.push(repoName);
      if (!pushResult.success) {
        return { success: false, step: 'push', error: pushResult.error };
      }

      console.log(`✅ Search/Replace workflow success`);
      return {
        success: true,
        message: `Modified ${replaceResult.count} files and pushed`,
        modified: replaceResult.modified,
        commitMessage
      };
    } catch (error) {
      console.error(`❌ Search/Replace workflow failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List files in repository
   */
  async listFiles(repoName, directory = '.') {
    try {
      const repoPath = path.join(this.workDir, repoName, directory);
      const files = await fs.readdir(repoPath, { withFileTypes: true });
      
      const fileList = files.map(f => ({
        name: f.name,
        type: f.isDirectory() ? 'directory' : 'file',
        path: path.join(directory, f.name)
      }));

      return {
        success: true,
        files: fileList
      };
    } catch (error) {
      console.error(`❌ List files failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup workspace
   */
  async cleanup() {
    try {
      await execAsync(`rm -rf ${this.workDir}`);
      console.log(`✅ Workspace cleaned`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Cleanup failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton
export const githubTools = new GitHubTools(process.env.GITHUB_TOKEN);
export default GitHubTools;
