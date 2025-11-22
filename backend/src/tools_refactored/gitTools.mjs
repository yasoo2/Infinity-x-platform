/**
 * Git Tools - أدوات Git المتقدمة
 * يسمح لـ JOE بإدارة Git بشكل كامل مثل Manus AI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * تهيئة مستودع Git
 */
export async function initGit(directory = '.') {
  try {
    console.log(`🎬 Initializing Git in: ${directory}`);
    
    const { stdout } = await execAsync(`cd "${directory}" && git init`);
    
    return {
      success: true,
      directory,
      output: stdout,
      message: 'تم تهيئة Git'
    };
  } catch (error) {
    console.error('Init git error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إضافة ملفات إلى staging
 */
export async function gitAdd(files = ['.'], directory = '.') {
  try {
    const filesList = Array.isArray(files) ? files.join(' ') : files;
    console.log(`➕ Adding files: ${filesList}`);
    
    const { stdout } = await execAsync(`cd "${directory}" && git add ${filesList}`);
    
    return {
      success: true,
      files: filesList,
      output: stdout,
      message: 'تم إضافة الملفات'
    };
  } catch (error) {
    console.error('Git add error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * عمل commit
 */
export async function gitCommit(message, directory = '.') {
  try {
    console.log(`💾 Committing: ${message}`);
    
    const { stdout } = await execAsync(`cd "${directory}" && git commit -m "${message}"`);
    
    return {
      success: true,
      message,
      output: stdout
    };
  } catch (error) {
    console.error('Git commit error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * دفع التغييرات
 */
export async function gitPush(branch = 'main', directory = '.') {
  try {
    console.log(`🚀 Pushing to: ${branch}`);
    
    const { stdout } = await execAsync(`cd "${directory}" && git push origin ${branch}`);
    
    return {
      success: true,
      branch,
      output: stdout,
      message: 'تم دفع التغييرات'
    };
  } catch (error) {
    console.error('Git push error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * سحب التغييرات
 */
export async function gitPull(branch = 'main', directory = '.') {
  try {
    console.log(`⬇️ Pulling from: ${branch}`);
    
    const { stdout } = await execAsync(`cd "${directory}" && git pull origin ${branch}`);
    
    return {
      success: true,
      branch,
      output: stdout,
      message: 'تم سحب التغييرات'
    };
  } catch (error) {
    console.error('Git pull error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * عرض الحالة
 */
export async function gitStatus(directory = '.') {
  try {
    console.log(`📊 Checking status in: ${directory}`);
    
    const { stdout } = await execAsync(`cd "${directory}" && git status`);
    
    return {
      success: true,
      directory,
      status: stdout
    };
  } catch (error) {
    console.error('Git status error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * عرض السجل
 */
export async function gitLog(limit = 10, directory = '.') {
  try {
    console.log(`📜 Getting log (last ${limit} commits)`);
    
    const { stdout } = await execAsync(
      `cd "${directory}" && git log --oneline -n ${limit}`
    );
    
    const commits = stdout.trim().split('\n').map(line => {
      const [hash, ...messageParts] = line.split(' ');
      return {
        hash,
        message: messageParts.join(' ')
      };
    });
    
    return {
      success: true,
      commits,
      count: commits.length
    };
  } catch (error) {
    console.error('Git log error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إنشاء فرع جديد
 */
export async function gitCreateBranch(branchName, directory = '.') {
  try {
    console.log(`🌿 Creating branch: ${branchName}`);
    
    const { stdout } = await execAsync(
      `cd "${directory}" && git checkout -b ${branchName}`
    );
    
    return {
      success: true,
      branchName,
      output: stdout,
      message: 'تم إنشاء الفرع'
    };
  } catch (error) {
    console.error('Git create branch error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * التبديل بين الفروع
 */
export async function gitCheckout(branchName, directory = '.') {
  try {
    console.log(`🔀 Switching to branch: ${branchName}`);
    
    const { stdout } = await execAsync(
      `cd "${directory}" && git checkout ${branchName}`
    );
    
    return {
      success: true,
      branchName,
      output: stdout,
      message: 'تم التبديل إلى الفرع'
    };
  } catch (error) {
    console.error('Git checkout error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * دمج فرع
 */
export async function gitMerge(branchName, directory = '.') {
  try {
    console.log(`🔗 Merging branch: ${branchName}`);
    
    const { stdout } = await execAsync(
      `cd "${directory}" && git merge ${branchName}`
    );
    
    return {
      success: true,
      branchName,
      output: stdout,
      message: 'تم دمج الفرع'
    };
  } catch (error) {
    console.error('Git merge error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * عرض الفروق
 */
export async function gitDiff(file = null, directory = '.') {
  try {
    const target = file || '';
    console.log(`🔍 Getting diff${file ? ` for: ${file}` : ''}`);
    
    const { stdout } = await execAsync(
      `cd "${directory}" && git diff ${target}`
    );
    
    return {
      success: true,
      file,
      diff: stdout
    };
  } catch (error) {
    console.error('Git diff error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * استنساخ مستودع
 */
export async function gitClone(repoUrl, targetDir, branch = 'main') {
  try {
    console.log(`📥 Cloning: ${repoUrl}`);
    
    const { stdout } = await execAsync(
      `git clone -b ${branch} ${repoUrl} "${targetDir}"`
    );
    
    return {
      success: true,
      repoUrl,
      targetDir,
      branch,
      output: stdout,
      message: 'تم استنساخ المستودع'
    };
  } catch (error) {
    console.error('Git clone error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إضافة remote
 */
export async function gitAddRemote(name, url, directory = '.') {
  try {
    console.log(`🔗 Adding remote: ${name} → ${url}`);
    
    const { stdout } = await execAsync(
      `cd "${directory}" && git remote add ${name} ${url}`
    );
    
    return {
      success: true,
      name,
      url,
      output: stdout,
      message: 'تم إضافة remote'
    };
  } catch (error) {
    console.error('Git add remote error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * عملية كاملة: add + commit + push
 */
export async function gitQuickCommit(message, files = ['.'], branch = 'main', directory = '.') {
  try {
    console.log(`⚡ Quick commit: ${message}`);
    
    // Add
    await gitAdd(files, directory);
    
    // Commit
    await gitCommit(message, directory);
    
    // Push
    const pushResult = await gitPush(branch, directory);
    
    return {
      success: true,
      message,
      branch,
      result: 'تم الإضافة والحفظ والدفع بنجاح'
    };
  } catch (error) {
    console.error('Git quick commit error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const gitTools = {
  initGit,
  gitAdd,
  gitCommit,
  gitPush,
  gitPull,
  gitStatus,
  gitLog,
  gitCreateBranch,
  gitCheckout,
  gitMerge,
  gitDiff,
  gitClone,
  gitAddRemote,
  gitQuickCommit
};
