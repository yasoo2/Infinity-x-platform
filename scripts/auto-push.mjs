import chokidar from 'chokidar'
import { exec } from 'child_process'

const run = (cmd) => new Promise((resolve, reject) => {
  exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
    if (err) return reject(err)
    resolve({ stdout, stderr })
  })
})

const watcher = chokidar.watch([
  'backend',
  'dashboard-x',
  'cloudflare-worker',
  'worker'
], {
  ignored: [/^\.husky\//, /node_modules/, /dist/, /build/, /\.git\//],
  persistent: true,
  ignoreInitial: true,
})

let timer = null
const debounceMs = 2000

const commitIfNeeded = async () => {
  try {
    const s = await run('git status --porcelain')
    if (!String(s.stdout || '').trim()) return
    const current = await run('git branch --show-current')
    const branch = String(current.stdout || '').trim()
    if (branch !== 'main') return
    await run('git add -A')
    const msg = `auto: ${new Date().toISOString()}`
    await run(`git commit -m "${msg}"`)
    await run('git push origin main')
  } catch { /* noop */ }
}

watcher.on('all', () => {
  try { clearTimeout(timer) } catch { /* noop */ }
  timer = setTimeout(commitIfNeeded, debounceMs)
})

process.on('SIGINT', () => { try { watcher.close().then(() => process.exit(0)) } catch { process.exit(0) } })
