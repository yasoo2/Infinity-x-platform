import { glob } from 'glob'
import fs from 'fs/promises'

export default () => {
  async function searchCode({ pattern, globs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'], flags = 'g' }) {
    const re = new RegExp(pattern, flags)
    const matches = []
    for (const g of globs) {
      const files = await glob(g)
      for (const f of files) {
        const text = await fs.readFile(f,'utf8').catch(() => '')
        if (!text) continue
        const lines = text.split('\n')
        lines.forEach((line, idx) => { if (re.test(line)) matches.push({ file: f, line: idx+1, snippet: line.slice(0,400) }) })
      }
    }
    return { success: true, count: matches.length, matches }
  }
  searchCode.metadata = { name: 'searchCode', description: 'Regex search across codebase', parameters: { type: 'object', properties: { pattern: { type: 'string' }, globs: { type: 'array' }, flags: { type: 'string' } }, required: ['pattern'] } }

  return { searchCode }
}
