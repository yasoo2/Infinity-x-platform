import { ESLint } from 'eslint'
import depcheck from 'depcheck'
import prettier from 'prettier'
import { glob } from 'glob'
import { exec as _exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const exec = promisify(_exec)

export default (dependencies = {}) => {
  const { sandboxManager } = dependencies || {}
  async function runLint({ paths = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'], fix = false }) {
    const eslint = new ESLint({ fix })
    const results = await eslint.lintFiles(paths)
    if (fix) await ESLint.outputFixes(results)
    const summary = results.map(r => ({ filePath: r.filePath, errorCount: r.errorCount, warningCount: r.warningCount }))
    return { success: true, fixApplied: Boolean(fix), summary }
  }
  runLint.metadata = { name: 'runLint', description: 'Run ESLint on the codebase', parameters: { type: 'object', properties: { paths: { type: 'array' }, fix: { type: 'boolean' } } } }

  async function runDepcheck({ dir = 'backend' }) {
    const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
    let target = base
    try {
      await fs.access(path.join(base, 'package.json'))
    } catch {
      target = process.cwd()
    }
    const res = await depcheck(target, { ignoreDirs: ['dist','node_modules'] })
    return { success: true, unused: res.dependencies || [], missing: res.missing || {}, invalidFiles: Object.keys(res.invalidFiles || {}), invalidDirs: Object.keys(res.invalidDirs || {}) }
  }
  runDepcheck.metadata = { name: 'runDepcheck', description: 'Detect unused and missing dependencies', parameters: { type: 'object', properties: { dir: { type: 'string' } } } }

  async function formatPrettier({ globs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx,css}'] }) {
    const formatted = []
    for (const g of globs) {
      const files = await glob(g)
      for (const f of files) {
        const config = await prettier.resolveConfig(f)
        const text = await (await import('fs/promises')).readFile(f,'utf8')
        const out = await prettier.format(text, { ...(config || {}), filepath: f })
        await (await import('fs/promises')).writeFile(f, out, 'utf8')
        formatted.push(f)
      }
    }
    return { success: true, formatted }
  }
  formatPrettier.metadata = { name: 'formatPrettier', description: 'Format code with Prettier', parameters: { type: 'object', properties: { globs: { type: 'array' } } } }

  async function runSecurityAudit({ dirs = ['backend','dashboard-x'] }) {
    const results = []
    for (const dir of dirs) {
      try {
        const { stdout } = await exec('npm audit --json', { cwd: dir })
        const audit = JSON.parse(stdout || '{}')
        const advisories = audit?.advisories || {}
        const vulnerabilities = Object.values(advisories)
        const severityCounts = { critical: 0, high: 0, moderate: 0, low: 0 }
        for (const v of vulnerabilities) {
          const sev = String(v?.severity || '').toLowerCase()
          if (severityCounts[sev] !== undefined) severityCounts[sev]++
        }
        results.push({ dir, severityCounts, vulnerabilities })
      } catch (error) {
        results.push({ dir, error: error.message })
      }
    }
    return { success: true, results }
  }
  runSecurityAudit.metadata = { name: 'runSecurityAudit', description: 'Run npm audit and summarize vulnerabilities', parameters: { type: 'object', properties: { dirs: { type: 'array' } } } }

  async function scanInsecurePatterns({ globs = ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] }) {
    const patterns = [
      { key: 'eval', regex: /\beval\s*\(/g, severity: 'high', message: 'Usage of eval()' },
      { key: 'FunctionCtor', regex: /new\s+Function\s*\(/g, severity: 'high', message: 'Dynamic Function constructor' },
      { key: 'child_process_exec', regex: /\b(exec|spawn|execFile)\s*\(/g, severity: 'moderate', message: 'Child process execution' },
      { key: 'dangerouslySetInnerHTML', regex: /dangerouslySetInnerHTML\s*:/g, severity: 'moderate', message: 'React dangerouslySetInnerHTML' },
      { key: 'md5', regex: /\b(md5|crypto\.createHash\(['"]md5['"]\))/g, severity: 'low', message: 'Weak hash MD5 detected' },
      { key: 'http_url', regex: /\bhttp:\/\//g, severity: 'low', message: 'Non-HTTPS URL detected' }
    ]
    const findings = []
    for (const g of globs) {
      const files = await glob(g)
      for (const f of files) {
        try {
          const st = await (await import('fs/promises')).stat(f)
          if (!st.isFile()) continue
        } catch { continue }
        const text = await (await import('fs/promises')).readFile(f,'utf8')
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          for (const p of patterns) {
            if (p.regex.test(line)) {
              findings.push({ file: f, line: i + 1, key: p.key, severity: p.severity, message: p.message })
            }
          }
        }
      }
    }
    const summary = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc }, {})
    return { success: true, findings, summary }
  }
  scanInsecurePatterns.metadata = { name: 'scanInsecurePatterns', description: 'Scan codebase for common insecure patterns', parameters: { type: 'object', properties: { globs: { type: 'array' } } } }

  async function scanSecrets({ globs = ['**/*.{js,mjs,ts,tsx,env,json}'] }) {
    const patterns = [
      { key: 'aws_access_key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'critical', message: 'AWS Access Key ID suspected' },
      { key: 'aws_secret_key', regex: /aws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/gi, severity: 'critical', message: 'AWS Secret Key suspected' },
      { key: 'jwt_secret', regex: /(JWT_SECRET|jwtSecret)\s*[:=]\s*['"][^'"\n]{12,}['"]/gi, severity: 'high', message: 'JWT secret hardcoded' },
      { key: 'api_key', regex: /(API_KEY|apiKey)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, severity: 'moderate', message: 'API key hardcoded' },
      { key: 'google_api', regex: /AIza[0-9A-Za-z_-]{35}/g, severity: 'moderate', message: 'Google API key suspected' }
    ]
    const findings = []
    for (const g of globs) {
      const files = await glob(g)
      for (const f of files) {
        try {
          const st = await (await import('fs/promises')).stat(f)
          if (!st.isFile()) continue
        } catch { continue }
        const text = await (await import('fs/promises')).readFile(f,'utf8')
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          for (const p of patterns) {
            if (p.regex.test(line)) {
              findings.push({ file: f, line: i + 1, key: p.key, severity: p.severity, message: p.message })
            }
          }
        }
      }
    }
    const summary = findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc }, {})
    return { success: true, findings, summary }
  }
  scanSecrets.metadata = { name: 'scanSecrets', description: 'Scan codebase for hardcoded secrets and API keys', parameters: { type: 'object', properties: { globs: { type: 'array' } } } }

  async function authorizedNetworkScan({ target = '127.0.0.1', flags = '-F' }) {
    const allowlist = String(process.env.SECURITY_SCAN_ALLOWLIST || '127.0.0.1,localhost').split(',').map(s => s.trim())
    const allowed = allowlist.includes(target)
    if (!allowed) {
      return { success: false, error: 'Target not in allowlist' }
    }
    if (!sandboxManager) {
      return { success: false, error: 'SandboxManager not available' }
    }
    const code = `
      set -e
      apt-get update >/dev/null 2>&1 || true
      apt-get install -y nmap >/dev/null 2>&1
      nmap ${flags} ${target}
    `
    try {
      const result = await sandboxManager.executeShell(code, { sessionId: `scan-${target}`, language: 'shell', allowNetwork: true })
      return { success: true, stdout: result.stdout, stderr: result.stderr }
    } catch (e) {
      return { success: false, error: e?.message || String(e) }
    }
  }
  authorizedNetworkScan.metadata = { name: 'authorizedNetworkScan', description: 'Runs a limited nmap scan on allowlisted targets inside sandbox', parameters: { type: 'object', properties: { target: { type: 'string' }, flags: { type: 'string' } }, required: ['target'] } }

  return { runLint, runDepcheck, formatPrettier, runSecurityAudit, scanInsecurePatterns, scanSecrets, authorizedNetworkScan }
}
