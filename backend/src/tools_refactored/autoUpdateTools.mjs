/**
 * Auto Update Tools - أدوات التحديث التلقائي
 * يحدث JOE نفسه تلقائياً ويبقى محدثاً دائماً
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * فحص التحديثات المتاحة
 */
export async function checkForUpdates() {
  try {
    console.log('🔍 Checking for updates...');

    // فحص تحديثات npm packages
    const { stdout: npmOutdated } = await execAsync('npm outdated --json', {
      cwd: process.cwd()
    }).catch(() => ({ stdout: '{}' }));

    const outdatedPackages = JSON.parse(npmOutdated || '{}');

    // فحص تحديثات Git
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
 * تحديث المكتبات والحزم
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
      message: 'تم تحديث المكتبات بنجاح'
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
 * تحديث الكود من Git
 */
export async function updateFromGit() {
  try {
    console.log('📥 Updating from Git...');

    // حفظ التغييرات المحلية
    await execAsync('git stash', { cwd: process.cwd() });

    // سحب التحديثات
    const { stdout } = await execAsync('git pull origin main', {
      cwd: process.cwd()
    });

    // استعادة التغييرات المحلية
    await execAsync('git stash pop', { cwd: process.cwd() }).catch(() => {});

    return {
      success: true,
      output: stdout,
      message: 'تم تحديث الكود من Git بنجاح'
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
 * تحديث تلقائي شامل
 */
export async function autoUpdate() {
  try {
    console.log('🚀 Starting auto-update...');

    const updateLog = {
      startTime: new Date().toISOString(),
      steps: [],
      success: true
    };

    // 1. فحص التحديثات
    const checkResult = await checkForUpdates();
    updateLog.steps.push({ step: 'check', result: checkResult });

    if (!checkResult.hasUpdates) {
      return {
        success: true,
        message: 'JOE محدث بالفعل',
        log: updateLog
      };
    }

    // 2. تحديث من Git
    if (checkResult.hasGitUpdates) {
      const gitUpdate = await updateFromGit();
      updateLog.steps.push({ step: 'git', result: gitUpdate });
      if (!gitUpdate.success) {
        updateLog.success = false;
      }
    }

    // 3. تحديث المكتبات
    if (Object.keys(checkResult.outdatedPackages).length > 0) {
      const depsUpdate = await updateDependencies();
      updateLog.steps.push({ step: 'dependencies', result: depsUpdate });
      if (!depsUpdate.success) {
        updateLog.success = false;
      }
    }

    // 4. إعادة تشغيل الخدمة
    if (updateLog.success) {
      updateLog.steps.push({
        step: 'restart',
        message: 'يجب إعادة تشغيل الخدمة لتطبيق التحديثات'
      });
    }

    updateLog.endTime = new Date().toISOString();

    return {
      success: updateLog.success,
      message: updateLog.success ? 'تم التحديث بنجاح' : 'فشل بعض خطوات التحديث',
      log: updateLog
    };

  } catch (error) {
    console.error('Auto update error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * جدولة التحديثات التلقائية
 */
export async function scheduleAutoUpdate(interval = 24) {
  try {
    console.log(`⏰ Scheduling auto-update every ${interval} hours`);

    const intervalMs = interval * 60 * 60 * 1000;

    const updateInterval = setInterval(async () => {
      console.log('🔄 Running scheduled auto-update...');
      const result = await autoUpdate();
      console.log('Update result:', result);
    }, intervalMs);

    // حفظ معرف الفاصل الزمني
    global.autoUpdateInterval = updateInterval;

    return {
      success: true,
      interval,
      message: `تم جدولة التحديث التلقائي كل ${interval} ساعة`
    };

  } catch (error) {
    console.error('Schedule auto update error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إيقاف التحديثات التلقائية المجدولة
 */
export async function stopAutoUpdate() {
  try {
    if (global.autoUpdateInterval) {
      clearInterval(global.autoUpdateInterval);
      delete global.autoUpdateInterval;
      
      return {
        success: true,
        message: 'تم إيقاف التحديثات التلقائية'
      };
    }

    return {
      success: false,
      message: 'لا توجد تحديثات مجدولة'
    };

  } catch (error) {
    console.error('Stop auto update error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحديث قاعدة بيانات المعرفة
 */
export async function updateKnowledgeBase() {
  try {
    console.log('📚 Updating knowledge base...');

    // تحديث معلومات المكتبات والأدوات
    const knowledgeBase = {
      lastUpdate: new Date().toISOString(),
      libraries: {},
      tools: {},
      bestPractices: []
    };

    // جمع معلومات عن المكتبات المثبتة
    const { stdout: packageInfo } = await execAsync('npm list --json --depth=0', {
      cwd: process.cwd()
    });

    const packages = JSON.parse(packageInfo);
    knowledgeBase.libraries = packages.dependencies || {};

    // حفظ قاعدة المعرفة
    const kbPath = path.join(process.cwd(), 'knowledge-base.json');
    await fs.writeFile(kbPath, JSON.stringify(knowledgeBase, null, 2));

    return {
      success: true,
      knowledgeBase,
      path: kbPath,
      message: 'تم تحديث قاعدة المعرفة'
    };

  } catch (error) {
    console.error('Update knowledge base error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * نسخ احتياطي قبل التحديث
 */
export async function createBackup() {
  try {
    console.log('💾 Creating backup...');

    const backupDir = path.join(process.cwd(), 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // إنشاء مجلد النسخ الاحتياطية
    await fs.mkdir(backupDir, { recursive: true });

    // نسخ الملفات المهمة
    const { stdout } = await execAsync(
      `tar -czf ${backupPath}.tar.gz src package.json package-lock.json`,
      { cwd: process.cwd() }
    );

    return {
      success: true,
      backupPath: `${backupPath}.tar.gz`,
      timestamp,
      message: 'تم إنشاء نسخة احتياطية'
    };

  } catch (error) {
    console.error('Create backup error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const autoUpdateTools = {
  checkForUpdates,
  updateDependencies,
  updateFromGit,
  autoUpdate,
  scheduleAutoUpdate,
  stopAutoUpdate,
  updateKnowledgeBase,
  createBackup
};
