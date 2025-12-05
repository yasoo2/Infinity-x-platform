import { chromium } from 'playwright'

class WebAuditTool {
  constructor(dependencies) { this.dependencies = dependencies; this._initializeMetadata() }
  _initializeMetadata() {
    this.auditWeb.metadata = {
      name: "auditWeb",
      description: "Heuristic performance and SEO audit: measures load timings, counts requests, and checks key SEO tags.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Target URL." },
          timeout: { type: "number", description: "Max time in ms.", default: 15000 }
        },
        required: ["url"]
      }
    }
  }
  async auditWeb({ url, timeout = 15000 }) {
    let browser
    const net = []
    try {
      browser = await chromium.launch()
      const page = await browser.newPage()
      page.on('requestfinished', async req => { const r = await req.response(); net.push({ url: req.url(), status: r?.status?.(), type: req.resourceType() }) })
      page.on('requestfailed', req => { net.push({ url: req.url(), status: 0, type: req.resourceType(), failed: true }) })
      const t0 = Date.now()
      await page.goto(url, { waitUntil: 'load', timeout })
      const navTiming = await page.evaluate(() => {
        const p = performance.getEntriesByType('navigation')[0]
        if (!p) return null
        return { domContentLoaded: p.domContentLoadedEventEnd, loadEventEnd: p.loadEventEnd, responseEnd: p.responseEnd }
      })
      const tags = await page.evaluate(() => {
        const title = document.querySelector('title')?.textContent || ''
        const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
        const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
        const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || ''
        const h1 = document.querySelector('h1')?.textContent || ''
        return { title, desc, canonical, robots, h1 }
      })
      const totalTime = Date.now() - t0
      const totalRequests = net.length
      const failed = net.filter(x => x.failed || (x.status || 0) >= 400)
      const summary = []
      if (!tags.title) summary.push('missing <title>')
      if (!tags.desc) summary.push('missing meta[name="description"]')
      if (!tags.h1) summary.push('missing <h1>')
      if (failed.length) summary.push(`${failed.length} failed requests`)
      return { success: true, timings: { totalTimeMs: totalTime, nav: navTiming }, requests: { total: totalRequests, failed }, seo: tags, summary: summary.join('; ') }
    } catch (e) {
      return { success: false, error: e?.message || String(e) }
    } finally { if (browser) await browser.close() }
  }
}

export default WebAuditTool
