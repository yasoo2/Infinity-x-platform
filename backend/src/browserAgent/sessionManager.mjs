import puppeteer from 'puppeteer'

function now() { return Date.now() }

export class BrowserSessionManager {
  constructor() {
    this.sessions = new Map()
    this.ttlMinutes = Number(process.env.BROWSER_SESSION_TTL_MINUTES || 15)
    this.maxSteps = Number(process.env.BROWSER_MAX_STEPS || 50)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000)
  }

  async createSession({ startUrl, goal }) {
    const enabled = String(process.env.BROWSER_AGENT_ENABLED || 'true') === 'true'
    if (!enabled) return { error: 'BROWSER_AGENT_DISABLED' }
    const launchOptions = {}
    try {
      launchOptions.headless = process.env.PUPPETEER_HEADLESS || 'new'
      const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || ''
      if (execPath) launchOptions.executablePath = execPath
    } catch { /* noop */ }
    const browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()
    try { await page.setViewport({ width: 1280, height: 720 }) } catch { /* noop */ }
    try { page.setDefaultNavigationTimeout(30000); page.setDefaultTimeout(30000) } catch { /* noop */ }
    const sessionId = `ba_${Math.random().toString(36).slice(2)}_${Date.now()}`
    const s = { session_id: sessionId, browser, page, goal: String(goal || ''), last_activity: now(), steps_count: 0 }
    this.sessions.set(sessionId, s)
    if (startUrl) await this.openUrl(sessionId, startUrl)
    const summary = await this.pageSummary(sessionId)
    return { session_id: sessionId, page_summary: summary }
  }

  get(sessionId) { return this.sessions.get(sessionId) || null }

  updateActivity(sessionId) { const s = this.get(sessionId); if (s) s.last_activity = now() }

  async ensureLimits(sessionId) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    if (s.steps_count >= this.maxSteps) throw new Error('MAX_STEPS_REACHED')
    s.steps_count += 1
    this.updateActivity(sessionId)
  }

  parseDomains(list) {
    const items = String(list || '').split(',').map(x => x.trim()).filter(Boolean)
    return new Set(items)
  }

  isDomainAllowed(url) {
    try {
      const u = new URL(url)
      const wl = this.parseDomains(process.env.BROWSER_DOMAINS_WHITELIST)
      const bl = this.parseDomains(process.env.BROWSER_DOMAINS_BLACKLIST)
      if (bl.size && (bl.has(u.hostname) || bl.has(u.origin))) return false
      if (wl.size && !(wl.has(u.hostname) || wl.has(u.origin))) return false
      return true
    } catch { return true }
  }

  async openUrl(sessionId, url) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    await this.ensureLimits(sessionId)
    const t = String(url || '').trim()
    if (!t) throw new Error('URL_REQUIRED')
    if (!this.isDomainAllowed(t)) throw new Error('DOMAIN_NOT_ALLOWED')
    const prev = await s.page.url()
    await s.page.goto(t, { waitUntil: 'domcontentloaded' })
    const summary = await this.pageSummary(sessionId)
    return { page_summary: summary, url_changed: prev !== (await s.page.url()) }
  }

  async click(sessionId, { selector, text_match }) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    await this.ensureLimits(sessionId)
    const prevUrl = await s.page.url()
    if (selector) {
      await s.page.waitForSelector(selector, { timeout: 20000 })
      await s.page.click(selector)
    } else if (text_match) {
      const txt = String(text_match || '').trim()
      const found = await s.page.evaluate((t) => {
        const el = Array.from(document.querySelectorAll('a,button,input[type="submit"],div,span'))
          .find(e => (e.innerText || e.textContent || '').trim().toLowerCase() === t.toLowerCase())
        if (el) { el.click(); return true }
        return false
      }, txt)
      if (!found) throw new Error('ELEMENT_NOT_FOUND')
    } else {
      throw new Error('SELECTOR_OR_TEXT_REQUIRED')
    }
    try { await s.page.waitForNavigation({ timeout: 10000 }) } catch { /* noop */ }
    const summary = await this.pageSummary(sessionId)
    const newUrl = await s.page.url()
    return { page_summary_after_click: summary, url_changed: prevUrl !== newUrl }
  }

  async type(sessionId, { selector, text, submit }) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    await this.ensureLimits(sessionId)
    const sel = String(selector || '').trim()
    const val = String(text || '')
    if (!sel) throw new Error('SELECTOR_REQUIRED')
    await s.page.waitForSelector(sel, { timeout: 20000 })
    await s.page.focus(sel)
    await s.page.type(sel, val, { delay: 10 })
    if (submit) {
      try { await s.page.keyboard.press('Enter') } catch { /* noop */ }
      try { await s.page.waitForNavigation({ timeout: 15000 }) } catch { /* noop */ }
    }
    const summary = await this.pageSummary(sessionId)
    return { page_summary: summary }
  }

  async scroll(sessionId, { direction = 'down', amount = 0.5 }) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    await this.ensureLimits(sessionId)
    const dir = String(direction || 'down').toLowerCase()
    const amt = Math.min(1, Math.max(0.05, Number(amount || 0.5)))
    await s.page.evaluate((d, a) => {
      const h = window.innerHeight
      const delta = Math.round(h * a)
      window.scrollBy({ top: d === 'down' ? delta : -delta, behavior: 'smooth' })
    }, dir, amt)
    await new Promise(r => setTimeout(r, 300))
    const summary = await this.pageSummary(sessionId)
    return { page_summary: summary }
  }

  async extract(sessionId, { mode = 'main_content' }) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    await this.ensureLimits(sessionId)
    const m = String(mode || 'main_content').toLowerCase()
    if (m === 'links') {
      const links = await s.page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).slice(0, 100).map(a => ({ text: (a.innerText || a.textContent || '').trim(), url: a.href }))
      })
      return { content_chunks: links.map(l => JSON.stringify(l)) }
    }
    if (m === 'code_blocks') {
      const codes = await s.page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('pre, code'))
        return els.map(e => (e.innerText || e.textContent || '').trim()).filter(Boolean)
      })
      const chunks = []
      for (const c of codes) {
        if (c.length <= 800) chunks.push(c)
        else {
          for (let i = 0; i < c.length; i += 800) chunks.push(c.slice(i, i + 800))
        }
      }
      return { content_chunks: chunks.slice(0, 50) }
    }
    const text = await s.page.evaluate(() => {
      const hide = ['script','style','nav','footer','header','iframe','noscript','aside']
      hide.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()))
      const main = document.querySelector('main') || document.body
      return (main.innerText || main.textContent || '').replace(/\s+/g,' ').trim()
    })
    const chunks = []
    const size = 600
    for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size))
    return { content_chunks: chunks.slice(0, 50) }
  }

  async screenshot(sessionId, { mode = 'viewport' }) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    await this.ensureLimits(sessionId)
    const full = String(mode || 'viewport').toLowerCase() === 'full'
    const b64 = (await s.page.screenshot({ fullPage: full, type: 'png', encoding: 'base64' }))
    return { screenshot_base64: `data:image/png;base64,${b64}` }
  }

  async end(sessionId) {
    const s = this.get(sessionId)
    if (!s) return { status: 'aborted' }
    try { await s.page.close() } catch { /* noop */ }
    try { await s.browser.close() } catch { /* noop */ }
    this.sessions.delete(sessionId)
    return { status: 'success' }
  }

  async pageSummary(sessionId) {
    const s = this.get(sessionId)
    if (!s) throw new Error('SESSION_NOT_FOUND')
    const title = await s.page.title()
    const url = await s.page.url()
    const headings = await s.page.evaluate(() => {
      const hs = []
      document.querySelectorAll('h1,h2').forEach(el => { const t = (el.innerText || el.textContent || '').trim(); if (t) hs.push({ tag: el.tagName.toLowerCase(), text: t }) })
      return hs.slice(0, 10)
    })
    const links = await s.page.evaluate(() => {
      const out = []
      document.querySelectorAll('a[href]').forEach(a => { const t = (a.innerText || a.textContent || '').trim(); const u = a.href; if (t && u) out.push({ text: t, url: u }) })
      return out.slice(0, 30)
    })
    const textMain = await s.page.evaluate(() => {
      const hide = ['script','style','nav','footer','header','iframe','noscript','aside']
      hide.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()))
      const main = document.querySelector('main') || document.body
      return (main.innerText || main.textContent || '').replace(/\s+/g,' ').trim()
    })
    const chunks = []
    const size = 500
    for (let i = 0; i < textMain.length; i += size) chunks.push(textMain.slice(i, i + size))
    return { url, title, headings, links, content_chunks: chunks.slice(0, 30) }
  }

  cleanup() {
    const ttlMs = Math.max(1, this.ttlMinutes) * 60 * 1000
    const cutoff = now() - ttlMs
    for (const [id, s] of this.sessions.entries()) {
      if ((s.last_activity || 0) < cutoff) {
        Promise.resolve().then(async () => { try { await s.page.close() } catch { /* noop */ } try { await s.browser.close() } catch { /* noop */ } this.sessions.delete(id) })
      }
    }
  }
}

export default new BrowserSessionManager()

