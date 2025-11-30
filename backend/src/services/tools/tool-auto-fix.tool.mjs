import { ESLint } from 'eslint'
import prettier from 'prettier'

export default () => {
  async function autoFix({ lintPaths = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'], prettierGlobs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx,css}'] }) {
    const eslint = new ESLint({ fix: true })
    const results = await eslint.lintFiles(lintPaths)
    await ESLint.outputFixes(results)
    const formatted = []
    for (const g of prettierGlobs) {
      const files = await prettier.utils.glob(g)
      for (const f of files) {
        const config = await prettier.resolveConfig(f)
        const text = await (await import('fs/promises')).readFile(f,'utf8')
        const out = prettier.format(text, { ...(config || {}), filepath: f })
        await (await import('fs/promises')).writeFile(f,out,'utf8')
        formatted.push(f)
      }
    }
    const summary = results.map(r => ({ filePath: r.filePath, fixed: r.fixableErrorCount + r.fixableWarningCount }))
    return { success: true, eslintFixed: summary, prettierFormatted: formatted }
  }
  autoFix.metadata = { name: 'autoFix', description: 'Run ESLint --fix and Prettier format', parameters: { type: 'object', properties: { lintPaths: { type: 'array' }, prettierGlobs: { type: 'array' } } } }

  return { autoFix }
}
