import fs from 'fs/promises';
import path from 'path';
import { LANG_EN } from './shared/i18n.js';

const dashboardSrcPath = 'dashboard-x/src';
const translationKeys = Object.keys(LANG_EN);
const usedKeys = new Set();

async function searchInDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await searchInDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
      const content = await fs.readFile(fullPath, 'utf-8');
      for (const key of translationKeys) {
        if (content.includes(key)) {
          usedKeys.add(key);
        }
      }
    }
  }
}

(async () => {
  try {
    await searchInDirectory(dashboardSrcPath);
    const unusedKeys = translationKeys.filter(key => !usedKeys.has(key));
    
    if (unusedKeys.length > 0) {
      console.log('--- Dead Translation Keys Found ---');
      console.log(JSON.stringify(unusedKeys, null, 2));
    } else {
      console.log('--- No Dead Translation Keys Found ---');
    }

  } catch (error) {
    console.error('Error finding dead translations:', error);
  }
})();
