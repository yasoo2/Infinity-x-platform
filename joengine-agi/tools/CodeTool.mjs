/**
 * Code Tool - أداة البرمجة لـ JOEngine AGI
 * 
 * القدرات:
 * - كتابة كود جديد
 * - تعديل كود موجود
 * - تنفيذ كود (Python, JavaScript, Shell)
 * - تحليل كود
 * - إصلاح أخطاء
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
      'Write, edit, execute, and analyze code in multiple languages',
      {
        action: {
          type: 'string',
          required: true,
          enum: ['write', 'edit', 'execute', 'analyze'],
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
          description: 'File path to read/write'
        }
      }
    );

    this.workDir = '/tmp/joengine-workspace';
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
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * كتابة كود جديد
   */
  async writeCode(params) {
    const { code, file, language } = params;
    
    if (!code) {
      throw new Error('Code is required for write action');
    }

    let filePath;
    
    if (file) {
      filePath = path.isAbsolute(file) ? file : path.join(this.workDir, file);
    } else {
      const ext = this.getExtension(language);
      filePath = path.join(this.workDir, `code-${Date.now()}.${ext}`);
    }

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
    
    if (!file) {
      throw new Error('File is required for edit action');
    }

    const filePath = path.isAbsolute(file) ? file : path.join(this.workDir, file);
    
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
      filePath = path.isAbsolute(file) ? file : path.join(this.workDir, file);
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
      const filePath = path.isAbsolute(file) ? file : path.join(this.workDir, file);
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
