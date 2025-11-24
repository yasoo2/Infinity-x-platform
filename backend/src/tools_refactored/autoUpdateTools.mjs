
/**
 * Auto Update Tools - The Autonomous Engine for JOE
 * This module allows JOE to be self-aware, self-improving, and always up-to-date.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * Checks for available updates from Git and npm.
 */
export async function checkForUpdates() {
  try {
    console.log('🔍 Checking for updates...');

    // Check for npm package updates
    const { stdout: npmOutdated } = await execAsync('npm outdated --json', {
      cwd: process.cwd()
    }).catch(() => ({ stdout: '{}' }));

    const outdatedPackages = JSON.parse(npmOutdated || '{}');

    // Check for Git updates
    const { stdout: gitStatus } = await execAsync('git fetch && git status -uno', {
      cwd: process.cwd()
    }).catch(() => ({ stdout: '' }));

    const hasGitUpdates = gitStatus.includes('Your branch is behind');

    return {
      success: true,
      hasUpdates: Object.keys(outdatedPackages).length > 0 || hasGitUpdates,
      outdatedPackages,
      hasGitUpdates,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Check for updates error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates dependencies using npm.
 */
export async function updateDependencies(packages = []) {
  try {
    console.log('📦 Updating dependencies...');

    let command = 'npm update';
    if (packages.length > 0) {
      command = `npm install ${packages.join(' ')} --save`;
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd()
    });

    return {
      success: true,
      command,
      output: stdout,
      errors: stderr,
      message: 'Dependencies updated successfully.'
    };

  } catch (error) {
    console.error('Update dependencies error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Updates the codebase from the Git repository.
 */
export async function updateFromGit() {
  try {
    console.log('📥 Updating from Git...');
    await execAsync('git stash', { cwd: process.cwd() });
    const { stdout } = await execAsync('git pull origin main', {
      cwd: process.cwd()
    });
    await execAsync('git stash pop', { cwd: process.cwd() }).catch(() => {});

    return {
      success: true,
      output: stdout,
      message: 'Codebase updated from Git successfully.'
    };

  } catch (error) {
    console.error('Update from Git error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * A comprehensive, autonomous self-update process.
 */
export async function autoUpdate() {
  try {
    console.log('🚀 Starting auto-update cycle...');

    const updateLog = {
      startTime: new Date().toISOString(),
      steps: [],
      success: true
    };

    // 1. Check for updates
    const checkResult = await checkForUpdates();
    updateLog.steps.push({ step: 'check', result: checkResult });

    if (!checkResult.hasUpdates) {
      updateLog.endTime = new Date().toISOString();
      return {
        success: true,
        message: 'JOE is already up-to-date.',
        log: updateLog
      };
    }

    // 2. Git Update (if needed)
    if (checkResult.hasGitUpdates) {
      const gitUpdate = await updateFromGit();
      updateLog.steps.push({ step: 'git', result: gitUpdate });
      if (!gitUpdate.success) {
        updateLog.success = false;
      }
    }

    // 3. Dependencies Update (if needed)
    if (Object.keys(checkResult.outdatedPackages).length > 0) {
      const depsUpdate = await updateDependencies();
      updateLog.steps.push({ step: 'dependencies', result: depsUpdate });
      if (!depsUpdate.success) {
        updateLog.success = false;
      }
    }
    
    // 4. Update Self-Awareness
    const kbUpdate = await updateKnowledgeBase();
    updateLog.steps.push({ step: 'knowledge_base', result: kbUpdate });
    if (!kbUpdate.success) {
      updateLog.success = false; // Log failure but don't stop the whole process
      console.error("Knowledge base update failed, but continuing process.", kbUpdate.error);
    }


    // 5. Signal for restart
    if (updateLog.success) {
      updateLog.steps.push({
        step: 'restart',
        message: 'A restart is required to apply all updates.'
      });
    }

    updateLog.endTime = new Date().toISOString();

    return {
      success: updateLog.success,
      message: updateLog.success ? 'Self-update cycle completed successfully.' : 'Some update steps failed.',
      log: updateLog
    };

  } catch (error) {
    console.error('Auto update cycle error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedules the autonomous self-update cycle.
 */
export async function scheduleAutoUpdate(interval = 24) {
  try {
    const intervalHours = Math.max(1, interval); // Ensure interval is at least 1 hour
    console.log(`⏰ Scheduling self-update cycle every ${intervalHours} hours.`);
    const intervalMs = intervalHours * 60 * 60 * 1000;

    if (global.autoUpdateInterval) {
        clearInterval(global.autoUpdateInterval);
    }

    const updateInterval = setInterval(async () => {
      console.log('🔄 Running scheduled self-update cycle...');
      await autoUpdate();
    }, intervalMs);

    global.autoUpdateInterval = updateInterval;

    return {
      success: true,
      interval: intervalHours,
      message: `Self-update cycle scheduled every ${intervalHours} hours.`
    };

  } catch (error) {
    console.error('Schedule auto-update error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Stops the scheduled self-update cycle.
 */
export async function stopAutoUpdate() {
  try {
    if (global.autoUpdateInterval) {
      clearInterval(global.autoUpdateInterval);
      delete global.autoUpdateInterval;
      return {
        success: true,
        message: 'Scheduled self-update cycle has been stopped.'
      };
    }
    return {
      success: false,
      message: 'No update cycle is currently scheduled.'
    };
  } catch (error) {
    console.error('Stop auto-update error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * [REPAIRED & SECURED] Updates JOE's self-awareness knowledge base.
 * This function now safely writes to a dedicated file, preventing system-wide corruption.
 * This is a foundational step for JOE's autonomous learning and evolution.
 */
export async function updateKnowledgeBase() {
  const projectRoot = process.cwd();
  const kbPath = path.join(projectRoot, 'knowledge-base.json');
  
  try {
    console.log(`📚 Updating knowledge base at: ${kbPath}`);

    // 1. Define the structure for the knowledge base
    const knowledgeBase = {
      lastUpdate: new Date().toISOString(),
      schemaVersion: '1.0.0',
      libraries: {},
      tools: {}, // Future-proofing for tool analysis
      bestPractices: [] // Future-proofing for learning
    };

    // 2. Safely gather package information
    const { stdout: packageInfo } = await execAsync('npm list --json --depth=0', {
      cwd: projectRoot
    });

    // 3. Parse and add library data
    const packages = JSON.parse(packageInfo);
    knowledgeBase.libraries = packages.dependencies || {};

    // 4. ATOMIC WRITE: Write to a temporary file first, then rename.
    // This prevents file corruption if the process is interrupted.
    const tempPath = `${kbPath}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(knowledgeBase, null, 2), 'utf-8');
    await fs.rename(tempPath, kbPath);
    
    console.log('✅ Knowledge base updated successfully.');
    return {
      success: true,
      path: kbPath,
      message: 'Knowledge base updated.'
    };

  } catch (error) {
    console.error(`❌ CRITICAL: Failed to update knowledge base at ${kbPath}.`, error);
    // Clean up temp file if it exists
    const tempFile = error.path || kbPath;
    if(tempFile && tempFile.includes('.tmp')){
        await fs.unlink(tempFile).catch(e => console.error(`Failed to clean up temp file: ${e.message}`));
    }
    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Creates a secure backup before initiating updates.
 */
export async function createBackup() {
  try {
    const projectRoot = process.cwd();
    const backupDir = path.join(projectRoot, 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.tar.gz`;
    const backupPath = path.join(backupDir, backupFile);
    
    console.log(`💾 Creating backup at: ${backupPath}`);
    
    // tar command is safer and more portable
    await execAsync(
      `tar -czf ${backupPath} src package.json package-lock.json .env`,
      { cwd: projectRoot }
    );

    return {
      success: true,
      backupPath: backupPath,
      message: 'Backup created successfully.'
    };

  } catch (error) {
    console.error('Create backup error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export a unified tool object for the ToolManager
const autoUpdateTools = {
  checkForUpdates,
  updateDependencies,
  updateFromGit,
  autoUpdate,
  scheduleAutoUpdate,
  stopAutoUpdate,
  updateKnowledgeBase,
  createBackup
};

// Add metadata for AI Function Calling
Object.values(autoUpdateTools).forEach(tool => {
    // This is a placeholder for a more robust metadata system
    if(!tool.metadata){
        tool.metadata = {
            name: tool.name,
            description: `A tool for JOE's autonomous self-update system. Function: ${tool.name}`,
            parameters: { type: 'object', properties: {} } // Placeholder
        };
    }
});


export default autoUpdateTools;
