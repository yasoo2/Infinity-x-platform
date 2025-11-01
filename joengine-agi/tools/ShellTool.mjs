/**
 * Shell Tool - أداة سطر الأوامر لـ JOEngine AGI
 * 
 * القدرات:
 * - تنفيذ أوامر نظام التشغيل (مثل ls, mkdir, npm install)
 * - الحصول على مخرجات الأوامر
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { BaseTool } from './ToolsSystem.mjs';

const execAsync = promisify(exec);

export class ShellTool extends BaseTool {
  constructor() {
    super(
      'shell',
      'Execute system shell commands (e.g., ls, mkdir, npm install)',
      {
        command: {
          type: 'string',
          required: true,
          description: 'The shell command to execute'
        },
        timeout: {
          type: 'number',
          required: false,
          description: 'Timeout in milliseconds (default 60000)'
        }
      }
    );

    // مسار العمل هو جذر المستودع
    this.workDir = path.join(process.cwd(), 'Infinity-x-platform');
  }

  /**
   * تنفيذ الأداة
   */
  async execute(params) {
    this.validateParams(params);

    const { command, timeout = 60000 } = params;

    console.log(`💻 Executing shell command: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workDir,
        timeout: timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      });

      if (stderr) {
        // إذا كان هناك خطأ في الإخراج القياسي للخطأ، فسنعتبره تحذيرًا وليس فشلًا
        console.warn(`Shell command stderr (Warning): ${stderr.trim()}`);
      }

      return {
        success: true,
        command: command,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    } catch (error) {
      return {
        success: false,
        command: command,
        error: error.message,
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || ''
      };
    }
  }
}

export default ShellTool;
