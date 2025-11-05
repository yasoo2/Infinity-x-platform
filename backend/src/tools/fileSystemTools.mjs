/**
 * File System Tools - أدوات نظام الملفات الكاملة
 * يسمح لـ JOE بقراءة وتعديل الملفات مثل Manus AI
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * قراءة ملف
 */
export async function readFile(filePath, encoding = 'utf-8') {
  try {
    console.log(`📖 Reading file: ${filePath}`);
    
    const content = await fs.readFile(filePath, encoding);
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      filePath,
      content,
      size: stats.size,
      lines: content.split('\n').length
    };
  } catch (error) {
    console.error('Read file error:', error.message);
    return {
      success: false,
      error: error.message,
      filePath
    };
  }
}

/**
 * كتابة ملف
 */
export async function writeFile(filePath, content) {
  try {
    console.log(`✍️ Writing file: ${filePath}`);
    
    // إنشاء المجلد إذا لم يكن موجوداً
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      filePath,
      size: stats.size,
      message: 'تم كتابة الملف بنجاح'
    };
  } catch (error) {
    console.error('Write file error:', error.message);
    return {
      success: false,
      error: error.message,
      filePath
    };
  }
}

/**
 * تعديل ملف (البحث والاستبدال)
 */
export async function editFile(filePath, findText, replaceText, replaceAll = false) {
  try {
    console.log(`✏️ Editing file: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    let newContent;
    let replacements = 0;
    
    if (replaceAll) {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      newContent = content.replace(regex, replaceText);
      replacements = (content.match(regex) || []).length;
    } else {
      newContent = content.replace(findText, replaceText);
      replacements = newContent !== content ? 1 : 0;
    }
    
    if (replacements > 0) {
      await fs.writeFile(filePath, newContent, 'utf-8');
    }
    
    return {
      success: true,
      filePath,
      replacements,
      message: `تم استبدال ${replacements} مرة`
    };
  } catch (error) {
    console.error('Edit file error:', error.message);
    return {
      success: false,
      error: error.message,
      filePath
    };
  }
}

/**
 * حذف ملف
 */
export async function deleteFile(filePath) {
  try {
    console.log(`🗑️ Deleting file: ${filePath}`);
    
    await fs.unlink(filePath);
    
    return {
      success: true,
      filePath,
      message: 'تم حذف الملف'
    };
  } catch (error) {
    console.error('Delete file error:', error.message);
    return {
      success: false,
      error: error.message,
      filePath
    };
  }
}

/**
 * نسخ ملف
 */
export async function copyFile(sourcePath, destPath) {
  try {
    console.log(`📋 Copying: ${sourcePath} → ${destPath}`);
    
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.copyFile(sourcePath, destPath);
    
    return {
      success: true,
      sourcePath,
      destPath,
      message: 'تم نسخ الملف'
    };
  } catch (error) {
    console.error('Copy file error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * نقل ملف
 */
export async function moveFile(sourcePath, destPath) {
  try {
    console.log(`➡️ Moving: ${sourcePath} → ${destPath}`);
    
    const dir = path.dirname(destPath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.rename(sourcePath, destPath);
    
    return {
      success: true,
      sourcePath,
      destPath,
      message: 'تم نقل الملف'
    };
  } catch (error) {
    console.error('Move file error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إنشاء مجلد
 */
export async function createDirectory(dirPath) {
  try {
    console.log(`📁 Creating directory: ${dirPath}`);
    
    await fs.mkdir(dirPath, { recursive: true });
    
    return {
      success: true,
      dirPath,
      message: 'تم إنشاء المجلد'
    };
  } catch (error) {
    console.error('Create directory error:', error.message);
    return {
      success: false,
      error: error.message,
      dirPath
    };
  }
}

/**
 * قراءة محتويات مجلد
 */
export async function listDirectory(dirPath, recursive = false) {
  try {
    console.log(`📂 Listing directory: ${dirPath}`);
    
    if (recursive) {
      const { stdout } = await execAsync(`find "${dirPath}" -type f`);
      const files = stdout.trim().split('\n').filter(f => f);
      
      return {
        success: true,
        dirPath,
        files,
        count: files.length
      };
    } else {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      const files = [];
      const directories = [];
      
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(entry.name);
        } else if (entry.isDirectory()) {
          directories.push(entry.name);
        }
      }
      
      return {
        success: true,
        dirPath,
        files,
        directories,
        totalFiles: files.length,
        totalDirectories: directories.length
      };
    }
  } catch (error) {
    console.error('List directory error:', error.message);
    return {
      success: false,
      error: error.message,
      dirPath
    };
  }
}

/**
 * البحث عن ملفات
 */
export async function findFiles(pattern, directory = '.') {
  try {
    console.log(`🔍 Finding files: ${pattern} in ${directory}`);
    
    const { stdout } = await execAsync(`find "${directory}" -name "${pattern}" -type f`);
    const files = stdout.trim().split('\n').filter(f => f);
    
    return {
      success: true,
      pattern,
      directory,
      files,
      count: files.length
    };
  } catch (error) {
    console.error('Find files error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * الحصول على معلومات ملف
 */
export async function getFileInfo(filePath) {
  try {
    console.log(`ℹ️ Getting file info: ${filePath}`);
    
    const stats = await fs.stat(filePath);
    
    return {
      success: true,
      filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };
  } catch (error) {
    console.error('Get file info error:', error.message);
    return {
      success: false,
      error: error.message,
      filePath
    };
  }
}

/**
 * قراءة جزء من ملف (سطور محددة)
 */
export async function readFileLines(filePath, startLine, endLine) {
  try {
    console.log(`📖 Reading lines ${startLine}-${endLine} from: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const selectedLines = lines.slice(startLine - 1, endLine);
    
    return {
      success: true,
      filePath,
      lines: selectedLines,
      startLine,
      endLine,
      totalLines: lines.length
    };
  } catch (error) {
    console.error('Read file lines error:', error.message);
    return {
      success: false,
      error: error.message,
      filePath
    };
  }
}

export const fileSystemTools = {
  readFile,
  writeFile,
  editFile,
  deleteFile,
  copyFile,
  moveFile,
  createDirectory,
  listDirectory,
  findFiles,
  getFileInfo,
  readFileLines
};
