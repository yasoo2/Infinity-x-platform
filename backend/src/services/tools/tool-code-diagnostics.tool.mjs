import { ESLint } from 'eslint'
import depcheck from 'depcheck'
import prettier from 'prettier'

export default () => {
  async function runLint({ paths = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'], fix = false }) {
    const eslint = new ESLint({ fix })
    const results = await eslint.lintFiles(paths)
    if (fix) await ESLint.outputFixes(results)
    const summary = results.map(r => ({ filePath: r.filePath, errorCount: r.errorCount, warningCount: r.warningCount }))
    return { success: true, fixApplied: Boolean(fix), summary }
  }
  runLint.metadata = { name: 'runLint', description: 'Run ESLint on the codebase', parameters: { type: 'object', properties: { paths: { type: 'array' }, fix: { type: 'boolean' } } } }

  async function runDepcheck({ dir = 'backend' }) {
    const res = await depcheck(dir, { ignoreDirs: ['dist','node_modules'] })
    return { success: true, unused: res.dependencies || [], missing: res.missing || {}, invalidFiles: Object.keys(res.invalidFiles || {}), invalidDirs: Object.keys(res.invalidDirs || {}) }
  }
  runDepcheck.metadata = { name: 'runDepcheck', description: 'Detect unused and missing dependencies', parameters: { type: 'object', properties: { dir: { type: 'string' } } } }

  async function formatPrettier({ globs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx,css}'] }) {
    const formatted = []
    for (const g of globs) {
      const files = await prettier.utils.glob(g)
      for (const f of files) {
        const config = await prettier.resolveConfig(f)
        const text = await (await import('fs/promises')).readFile(f,'utf8')
        const out = prettier.format(text, { ...(config || {}), filepath: f })
        await (await import('fs/promises')).writeFile(f, out, 'utf8')
        formatted.push(f)
      }
    }
    return { success: true, formatted }
  }
  formatPrettier.metadata = { name: 'formatPrettier', description: 'Format code with Prettier', parameters: { type: 'object', properties: { globs: { type: 'array' } } } }

  return { runLint, runDepcheck, formatPrettier }
}
