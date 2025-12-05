import { glob } from 'glob'
import fs from 'fs/promises'
import * as babel from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'

export default () => {
  async function textReplace({ find, replace, globs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] }) {
    const files = []
    for (const g of globs) {
      const list = await glob(g)
      for (const f of list) {
        const text = await fs.readFile(f,'utf8')
        const next = text.split(find).join(replace)
        if (next !== text) { await fs.writeFile(f,next,'utf8'); files.push(f) }
      }
    }
    return { success: true, updated: files }
  }
  textReplace.metadata = { name: 'textReplace', description: 'Simple text replace across files', parameters: { type: 'object', properties: { find: { type: 'string' }, replace: { type: 'string' }, globs: { type: 'array' } }, required: ['find','replace'] } }

  async function renameImport({ from, to, globs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] }) {
    const changed = []
    for (const g of globs) {
      const list = await glob(g)
      for (const f of list) {
        const code = await fs.readFile(f,'utf8')
        const ast = babel.parse(code, { sourceType: 'module', plugins: ['jsx'] })
        traverse(ast, { ImportDeclaration(path){ if (path.node.source.value === from) path.node.source.value = to } })
        const out = generate.default(ast, { retainLines: true }, code).code
        if (out !== code) { await fs.writeFile(f,out,'utf8'); changed.push(f) }
      }
    }
    return { success: true, updated: changed }
  }
  renameImport.metadata = { name: 'renameImport', description: 'Rename import source across files', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, globs: { type: 'array' } }, required: ['from','to'] } }

  return { textReplace, renameImport }
}
