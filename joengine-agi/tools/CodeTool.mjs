/**
 * Code Tool - أداة البرمجة لـ JOEngine AGI
 * 
 * القدرات:
 * - كتابة كود جديد
 * - تعديل كود موجود
 * - تنفيذ كود (Python, JavaScript, Shell)
 * - تحليل كود
 * - إصلاح أخطاء
 * - البحث في الكود باستخدام Glob و Grep
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { BaseTool } from './ToolsSystem.mjs';

const execAsync = promisify(exec);

export class CodeTool extends BaseTool {
  constructor() {
    super(
      'code',
      'Write, edit, execute, analyze, and search code in multiple languages',
      {
        action: {
          type: 'string',
          required: true,
          enum: ['write', 'edit', 'execute', 'analyze', 'search'],
          description: 'Action to perform'
        },
        language: {
          type: 'string',
          required: false,
          enum: ['javascript', 'python', 'shell', 'html', 'css'],
          description: 'Programming language'
        },
        code: {
          type: 'string',
          required: false,
          description: 'Code to write or execute'
        },
        file: {
          type: 'string',
          required: false,
          description: 'File path to read/write/edit/execute'
        },
        // معاملات جديدة للبحث
        scope: {
          type: 'string',
          required: false,
          description: 'Glob pattern for file search scope (e.g., **/*.js)'
        },
        regex: {
          type: 'string',
          required: false,
          description: 'Regex pattern for content search (required for search action)'
        },
        searchType: {
          type: 'string',
          required: false,
          enum: ['glob', 'grep'],
          description: 'Type of search: glob (file names) or grep (file content)'
        }
      }
    );

    // تغيير مسار العمل ليكون جذر المستودع
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
      case 'write':
        return await this.writeCode(params);
      
      case 'edit':
        return await this.editCode(params);
      
      case 'execute':
        return await this.executeCode(params);
      
      case 'analyze':
        return await this.analyzeCode(params);

      case 'search':
        return await this.searchCode(params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * كتابة كود جديد
   */
  async writeCode(params) {
    const { code, file, language } = params;
    
    if (!code || !file) {
      throw new Error('Code and file path are required for write action');
    }

    const filePath = path.join(this.workDir, file);

    console.log(`📝 Writing code to: ${filePath}`);
    
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, code, 'utf8');

    return {
      success: true,
      file: filePath,
      size: code.length
    };
  }

  /**
   * تعديل كود موجود
   */
  async editCode(params) {
    const { file, code } = params;
    
    if (!file || !code) {
      throw new Error('File and code are required for edit action');
    }

    const filePath = path.join(this.workDir, file);
    
    console.log(`✏️  Editing code in: ${filePath}`);
    
    // قراءة الكود الحالي
    const currentCode = await fs.readFile(filePath, 'utf8');

    // كتابة الكود الجديد
    await fs.writeFile(filePath, code, 'utf8');

    return {
      success: true,
      file: filePath,
      oldSize: currentCode.length,
      newSize: code.length
    };
  }

  /**
   * تنفيذ كود
   */
  async executeCode(params) {
    const { code, language, file } = params;
    
    let filePath;
    
    if (file) {
      filePath = path.join(this.workDir, file);
    } else if (code) {
      // كتابة الكود في ملف مؤقت
      const ext = this.getExtension(language);
      filePath = path.join(this.workDir, `temp-${Date.now()}.${ext}`);
      await fs.writeFile(filePath, code, 'utf8');
    } else {
      throw new Error('Either code or file is required for execute action');
    }

    console.log(`▶️  Executing code: ${filePath}`);
    
    const command = this.getExecutionCommand(filePath, language);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workDir,
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error) {
      return {
        success: false,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || error.message,
        exitCode: error.code || 1
      };
    }
  }

  /**
   * تحليل كود
   */
  async analyzeCode(params) {
    const { code, file, language } = params;
    
    let codeContent;
    
    if (file) {
      const filePath = path.join(this.workDir, file);
      codeContent = await fs.readFile(filePath, 'utf8');
    } else if (code) {
      codeContent = code;
    } else {
      throw new Error('Either code or file is required for analyze action');
    }

    console.log(`🔍 Analyzing code...`);
    
    // تحليل بسيط
    const lines = codeContent.split('\n');
    const analysis = {
      lines: lines.length,
      nonEmptyLines: lines.filter(l => l.trim()).length,
      characters: codeContent.length,
      language: language || this.detectLanguage(codeContent),
      complexity: this.estimateComplexity(codeContent)
    };

    return {
      success: true,
      analysis
    };
  }

  /**
   * البحث في الكود باستخدام glob و grep
   */
  async searchCode(params) {
    const { searchType, scope, regex } = params;

    if (!scope) {
      throw new Error('Scope (glob pattern) is required for search action');
    }

    let command;
    let cwd = this.workDir;

    if (searchType === 'glob') {
      // البحث عن الملفات
      command = `find ${cwd} -path "${cwd}/${scope}" -print`;
    } else if (searchType === 'grep') {
      // البحث في محتوى الملفات
      if (!regex) {
        throw new Error('Regex pattern is required for grep search');
      }
      // استخدام grep مع نمط glob
      command = `grep -r -n -H -E "${regex}" ${cwd} --include="${scope}"`;
    } else {
      throw new Error('Invalid searchType. Must be "glob" or "grep"');
    }

    console.log(`🔎 Searching code with command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: '/', // يجب أن يكون المسار المطلق
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      if (stderr) {
        // grep يضع رسائل "No such file or directory" في stderr، لكننا نريد فقط النتائج
        // إذا كان هناك نتائج، سنتجاهل رسائل الخطأ البسيطة
        if (stdout.trim() === '' && stderr.includes('No such file or directory')) {
             return { success: true, results: 'No files found matching the scope.' };
        }
        // إذا كان هناك خطأ حقيقي
        if (stderr.trim() !== '') {
          console.error('Search command stderr:', stderr);
        }
      }

      return {
        success: true,
        results: stdout.trim()
      };
    } catch (error) {
      // في حالة عدم العثور على نتائج، grep يرجع رمز خروج 1
      if (error.code === 1 && error.stdout.trim() === '') {
        return { success: true, results: 'No matches found.' };
      }
      return {
        success: false,
        error: error.message,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || ''
      };
    }
  }

  /**
   * الحصول على امتداد الملف بناءً على اللغة
   */
  getExtension(language) {
    const extensions = {
      javascript: 'js',
      python: 'py',
      shell: 'sh',
      html: 'html',
      css: 'css'
    };

    return extensions[language] || 'txt';
  }

  /**
   * الحصول على أمر التنفيذ بناءً على اللغة
   */
  getExecutionCommand(filePath, language) {
    const ext = path.extname(filePath).slice(1);
    
    const commands = {
      js: `node ${filePath}`,
      py: `python3 ${filePath}`,
      sh: `bash ${filePath}`
    };

    return commands[ext] || commands[language] || `cat ${filePath}`;
  }

  /**
   * اكتشاف لغة البرمجة
   */
  detectLanguage(code) {
    if (code.includes('import ') && code.includes('def ')) return 'python';
    if (code.includes('const ') || code.includes('function ')) return 'javascript';
    if (code.includes('#!/bin/bash')) return 'shell';
    if (code.includes('<html>')) return 'html';
    if (code.includes('{') && code.includes('color:')) return 'css';
    
    return 'unknown';
  }

  /**
   * تقدير تعقيد الكود
   */
  estimateComplexity(code) {
    const lines = code.split('\n').filter(l => l.trim()).length;
    
    if (lines < 10) return 'low';
    if (lines < 50) return 'medium';
    if (lines < 200) return 'high';
    return 'very_high';
  }
}

export default CodeTool;
