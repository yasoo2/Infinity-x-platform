/**
 * File System Tools for JOE
 * أدوات نظام الملفات - تمكن جو من قراءة وتعديل الملفات مباشرة
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, path: filePath, message: 'تم حفظ الملف بنجاح' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function replaceInFile(filePath, searchText, replaceText) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    const originalContent = content;
    content = content.split(searchText).join(replaceText);
    if (content === originalContent) {
      return { success: false, message: 'لم يتم العثور على النص المطلوب' };
    }
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, path: filePath, message: 'تم التعديل بنجاح' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export const fileSystemTools = { readFile, writeFile, replaceInFile };
