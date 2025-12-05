import fs from 'fs/promises'
import path from 'path'

class I18nAuditTool {
  constructor(dependencies){ this.dependencies = dependencies; this._initializeMetadata() }
  _initializeMetadata(){
    this.auditI18n.metadata = {
      name: "auditI18n",
      description: "Scans a source directory for hardcoded UI strings and missing RTL support heuristics.",
      parameters: {
        type: "object",
        properties: {
          dir: { type: "string", description: "Source directory to scan.", default: "dashboard-x/src" },
          pattern: { type: "string", description: "Glob-like suffix filter (e.g., .js).", default: "" },
          maxFiles: { type: "number", description: "Max files to process.", default: 500 }
        },
        required: []
      }
    }
  }
  async auditI18n({ dir = 'dashboard-x/src', pattern = '', maxFiles = 500 }){
    const issues = { hardcodedText: [], missingRTLHints: [], summary: '' }
    let count = 0
    async function walk(p){
      const list = await fs.readdir(p, { withFileTypes: true })
      for (const d of list){
        if (count >= maxFiles) return
        const full = path.join(p, d.name)
        if (d.isDirectory()) { await walk(full); continue }
        if (pattern && !full.endsWith(pattern)) continue
        if (!/\.(js|jsx|ts|tsx|mjs)$/.test(full)) continue
        count++
        const code = await fs.readFile(full, 'utf8')
        const hasT = /\bt\s*\(/.test(code) || /i18n|Intl|useTranslation/.test(code)
        const textLiterals = [...code.matchAll(/(['"])((?:[^\\]|\\.)+?)\1/g)].map(m => m[2]).filter(s => /[A-Za-z\u0600-\u06FF]/.test(s))
        const likelyUi = textLiterals.filter(s => s.length >= 3 && !/^https?:/.test(s) && !/^[{}\u005B\u005D(),.:;<>]+$/.test(s))
        if (!hasT && likelyUi.length){ issues.hardcodedText.push({ file: full, samples: likelyUi.slice(0,5) }) }
        const rtlFlags = /dir\s*=\s*"rtl"|\brtl\b|\bflex-direction:\s*row-reverse\b/i.test(code)
        const rtlCss = /:root\s*\[dir=rtl\]|\[dir=rtl\]/i.test(code)
        if (!(rtlFlags || rtlCss)) {
          const maybeArabic = likelyUi.some(s => /[\u0600-\u06FF]/.test(s))
          if (maybeArabic) issues.missingRTLHints.push({ file: full })
        }
      }
    }
    try {
      await walk(dir)
      const s = []
      if (issues.hardcodedText.length) s.push(`${issues.hardcodedText.length} file(s) with hardcoded UI text`) 
      if (issues.missingRTLHints.length) s.push(`${issues.missingRTLHints.length} file(s) with Arabic text but no RTL hints`)
      issues.summary = s.join('; ')
      return { success: true, issues }
    } catch (e){
      return { success: false, error: e?.message || String(e) }
    }
  }
}

export default I18nAuditTool
