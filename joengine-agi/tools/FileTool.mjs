/**
 * File Tool - أداة نظام الملفات لـ JOEngine AGI
 * 
 * القدرات:
 * - قراءة محتوى الملفات
 * - كتابة محتوى الملفات (إنشاء أو استبدال)
 * - حذف الملفات
 * - سرد محتويات المجلدات
 */

import fs from 'fs-extra';
import path from 'path';
import { BaseTool } from './ToolsSystem.mjs';

export class FileTool extends BaseTool {
  constructor() {
    super(
      'file',
      'Read, write, delete, and list files and directories',
      {
        action: {
          type: 'string',
          required: true,
          enum: ['read', 'write', 'delete', 'list'],
          description: 'Action to perform'
        },
        path: {
          type: 'string',
          required: true,
          description: 'Path to the file or directory (relative to project root)'
        },
        content: {
          type: 'string',
          required: false,
          description: 'Content to write to the file (required for write action)'
        }
      }
    );

    // مسار العمل هو جذر المستودع
    this.workDir = path.join(process.cwd(), 'Infinity-x-platform');
    fs.ensureDirSync(this.workDir);
  }

  /**
   * تنفيذ الأداة
   */
  async execute(params) {
    this.validateParams(params);

    const { action } = params;

    switch (action) {
      case 'read':
        return await this.readFile(params);
      
      case 'write':
        return await this.writeFile(params);
      
      case 'delete':
        return await this.deletePath(params);
      
      case 'list':
        return await this.listDir(params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * قراءة محتوى ملف
   */
  async readFile(params) {
    const { path: relativePath } = params;
    const absolutePath = path.join(this.workDir, relativePath);

    console.log(`📖 Reading file: ${absolutePath}`);

    try {
      const content = await fs.readFile(absolutePath, 'utf8');
      return {
        success: true,
        path: relativePath,
        content: content,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`
      };
    }
  }

  /**
   * كتابة محتوى في ملف (إنشاء أو استبدال)
   */
  async writeFile(params) {
    const { path: relativePath, content } = params;

    if (!content) {
      return { success: false, error: 'Content is required for write action' };
    }

    const absolutePath = path.join(this.workDir, relativePath);

    console.log(`✍️ Writing file: ${absolutePath}`);

    try {
      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeFile(absolutePath, content, 'utf8');
      return {
        success: true,
        path: relativePath,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error.message}`
      };
    }
  }

  /**
   * حذف ملف أو مجلد
   */
  async deletePath(params) {
    const { path: relativePath } = params;
    const absolutePath = path.join(this.workDir, relativePath);

    console.log(`🗑️ Deleting path: ${absolutePath}`);

    try {
      await fs.remove(absolutePath);
      return {
        success: true,
        path: relativePath,
        message: 'Path deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete path: ${error.message}`
      };
    }
  }

  /**
   * سرد محتويات مجلد
   */
  async listDir(params) {
    const { path: relativePath } = params;
    const absolutePath = path.join(this.workDir, relativePath);

    console.log(`📂 Listing directory: ${absolutePath}`);

    try {
      const items = await fs.readdir(absolutePath);
      const details = await Promise.all(items.map(async (item) => {
        const itemPath = path.join(absolutePath, item);
        const stat = await fs.stat(itemPath);
        return {
          name: item,
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size
        };
      }));

      return {
        success: true,
        path: relativePath,
        items: details
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error.message}`
      };
    }
  }
}

export default FileTool;
