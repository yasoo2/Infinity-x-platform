/**
 * Search Tools - أدوات البحث القوية
 * يسمح لـ JOE بالبحث في الملفات والكود مثل Manus AI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * البحث في الملفات باستخدام grep
 */
export async function searchInFiles(query, directory = '.', filePattern = '*') {
  try {
    console.log(`🔍 Searching for: "${query}" in ${directory}`);
    
    const { stdout } = await execAsync(
      `grep -r -n "${query}" "${directory}" --include="${filePattern}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    ).catch(() => ({ stdout: '' }));
    
    if (!stdout) {
      return {
        success: true,
        query,
        results: [],
        count: 0,
        message: 'لم يتم العثور على نتائج'
      };
    }
    
    const results = stdout.trim().split('\n').map(line => {
      const [filePath, lineNumber, ...contentParts] = line.split(':');
      return {
        file: filePath,
        line: parseInt(lineNumber),
        content: contentParts.join(':').trim()
      };
    });
    
    return {
      success: true,
      query,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Search in files error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث عن ملفات بالاسم
 */
export async function findFilesByName(filename, directory = '.') {
  try {
    console.log(`📁 Finding files: ${filename} in ${directory}`);
    
    const { stdout } = await execAsync(
      `find "${directory}" -name "*${filename}*" -type f`
    ).catch(() => ({ stdout: '' }));
    
    const files = stdout.trim().split('\n').filter(f => f);
    
    return {
      success: true,
      filename,
      files,
      count: files.length
    };
  } catch (error) {
    console.error('Find files by name error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث عن ملفات بالامتداد
 */
export async function findFilesByExtension(extension, directory = '.') {
  try {
    console.log(`📄 Finding .${extension} files in ${directory}`);
    
    const { stdout } = await execAsync(
      `find "${directory}" -name "*.${extension}" -type f`
    ).catch(() => ({ stdout: '' }));
    
    const files = stdout.trim().split('\n').filter(f => f);
    
    return {
      success: true,
      extension,
      files,
      count: files.length
    };
  } catch (error) {
    console.error('Find files by extension error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث في الكود (مع السياق)
 */
export async function searchInCode(query, directory = '.', contextLines = 2) {
  try {
    console.log(`💻 Searching code for: "${query}"`);
    
    const { stdout } = await execAsync(
      `grep -r -n -C ${contextLines} "${query}" "${directory}" --include="*.js" --include="*.mjs" --include="*.jsx" --include="*.ts" --include="*.tsx"`,
      { maxBuffer: 10 * 1024 * 1024 }
    ).catch(() => ({ stdout: '' }));
    
    if (!stdout) {
      return {
        success: true,
        query,
        results: [],
        count: 0
      };
    }
    
    const results = [];
    const sections = stdout.split('--\n');
    
    for (const section of sections) {
      if (!section.trim()) continue;
      
      const lines = section.trim().split('\n');
      const firstLine = lines[0];
      const match = firstLine.match(/^(.+?):(\d+):/);
      
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2]),
          context: lines.map(l => l.replace(/^.+?:\d+:/, '').replace(/^.+?-/, '')).join('\n')
        });
      }
    }
    
    return {
      success: true,
      query,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Search in code error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث عن دالة أو class
 */
export async function findFunction(functionName, directory = '.') {
  try {
    console.log(`🔎 Finding function: ${functionName}`);
    
    const patterns = [
      `function ${functionName}`,
      `${functionName} =`,
      `${functionName}:`,
      `async ${functionName}`,
      `const ${functionName}`,
      `class ${functionName}`
    ];
    
    const allResults = [];
    
    for (const pattern of patterns) {
      const result = await searchInCode(pattern, directory, 5);
      if (result.success && result.results.length > 0) {
        allResults.push(...result.results);
      }
    }
    
    return {
      success: true,
      functionName,
      results: allResults,
      count: allResults.length
    };
  } catch (error) {
    console.error('Find function error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث عن import/require
 */
export async function findImports(moduleName, directory = '.') {
  try {
    console.log(`📦 Finding imports of: ${moduleName}`);
    
    const { stdout } = await execAsync(
      `grep -r -n "import.*${moduleName}\\|require.*${moduleName}" "${directory}" --include="*.js" --include="*.mjs" --include="*.jsx" --include="*.ts" --include="*.tsx"`,
      { maxBuffer: 10 * 1024 * 1024 }
    ).catch(() => ({ stdout: '' }));
    
    if (!stdout) {
      return {
        success: true,
        moduleName,
        results: [],
        count: 0
      };
    }
    
    const results = stdout.trim().split('\n').map(line => {
      const [filePath, lineNumber, ...contentParts] = line.split(':');
      return {
        file: filePath,
        line: parseInt(lineNumber),
        content: contentParts.join(':').trim()
      };
    });
    
    return {
      success: true,
      moduleName,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Find imports error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث المتقدم مع regex
 */
export async function searchWithRegex(pattern, directory = '.', fileTypes = ['*']) {
  try {
    console.log(`🎯 Regex search: ${pattern}`);
    
    const includeFlags = fileTypes.map(type => `--include="${type}"`).join(' ');
    
    const { stdout } = await execAsync(
      `grep -r -n -E "${pattern}" "${directory}" ${includeFlags}`,
      { maxBuffer: 10 * 1024 * 1024 }
    ).catch(() => ({ stdout: '' }));
    
    if (!stdout) {
      return {
        success: true,
        pattern,
        results: [],
        count: 0
      };
    }
    
    const results = stdout.trim().split('\n').map(line => {
      const [filePath, lineNumber, ...contentParts] = line.split(':');
      return {
        file: filePath,
        line: parseInt(lineNumber),
        content: contentParts.join(':').trim()
      };
    });
    
    return {
      success: true,
      pattern,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Search with regex error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث عن TODO/FIXME
 */
export async function findTodos(directory = '.') {
  try {
    console.log(`📝 Finding TODOs and FIXMEs`);
    
    const { stdout } = await execAsync(
      `grep -r -n -E "TODO|FIXME|HACK|XXX|NOTE" "${directory}" --include="*.js" --include="*.mjs" --include="*.jsx" --include="*.ts" --include="*.tsx"`,
      { maxBuffer: 10 * 1024 * 1024 }
    ).catch(() => ({ stdout: '' }));
    
    if (!stdout) {
      return {
        success: true,
        results: [],
        count: 0
      };
    }
    
    const results = stdout.trim().split('\n').map(line => {
      const [filePath, lineNumber, ...contentParts] = line.split(':');
      const content = contentParts.join(':').trim();
      
      let type = 'TODO';
      if (content.includes('FIXME')) type = 'FIXME';
      else if (content.includes('HACK')) type = 'HACK';
      else if (content.includes('XXX')) type = 'XXX';
      else if (content.includes('NOTE')) type = 'NOTE';
      
      return {
        file: filePath,
        line: parseInt(lineNumber),
        type,
        content
      };
    });
    
    return {
      success: true,
      results,
      count: results.length,
      byType: {
        TODO: results.filter(r => r.type === 'TODO').length,
        FIXME: results.filter(r => r.type === 'FIXME').length,
        HACK: results.filter(r => r.type === 'HACK').length,
        XXX: results.filter(r => r.type === 'XXX').length,
        NOTE: results.filter(r => r.type === 'NOTE').length
      }
    };
  } catch (error) {
    console.error('Find todos error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إحصائيات الكود
 */
export async function getCodeStats(directory = '.') {
  try {
    console.log(`📊 Getting code statistics`);
    
    const { stdout: jsFiles } = await execAsync(
      `find "${directory}" -name "*.js" -o -name "*.mjs" -o -name "*.jsx" | wc -l`
    );
    
    const { stdout: tsFiles } = await execAsync(
      `find "${directory}" -name "*.ts" -o -name "*.tsx" | wc -l`
    );
    
    const { stdout: totalLines } = await execAsync(
      `find "${directory}" \\( -name "*.js" -o -name "*.mjs" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \\) -exec wc -l {} + | tail -1`
    );
    
    return {
      success: true,
      stats: {
        jsFiles: parseInt(jsFiles.trim()),
        tsFiles: parseInt(tsFiles.trim()),
        totalLines: parseInt(totalLines.trim().split(' ')[0]) || 0
      }
    };
  } catch (error) {
    console.error('Get code stats error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const searchTools = {
  searchInFiles,
  findFilesByName,
  findFilesByExtension,
  searchInCode,
  findFunction,
  findImports,
  searchWithRegex,
  findTodos,
  getCodeStats
};
