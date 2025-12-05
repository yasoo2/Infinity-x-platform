import { chromium } from 'playwright'

class AccessibilityAuditTool {
  constructor(dependencies) {
    this.dependencies = dependencies
    this._initializeMetadata()
  }

  _initializeMetadata() {
    this.auditAccessibility.metadata = {
      name: "auditAccessibility",
      description: "Audits a web page for common accessibility issues (WCAG-inspired checks).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL of the page to audit." },
          timeout: { type: "number", description: "Max time in ms to wait for load.", default: 15000 },
          limitPerCategory: { type: "number", description: "Max items per issue category.", default: 50 }
        },
        required: ["url"]
      }
    }
  }

  async auditAccessibility({ url, timeout = 15000, limitPerCategory = 50 }) {
    let browser
    try {
      browser = await chromium.launch()
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout })

      const results = await page.evaluate((limit) => {
        const cap = (arr) => arr.slice(0, Math.max(1, Math.min(limit, 200)))

        const toHex = (rgb) => {
          const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
          if (!m) return null
          const r = Number(m[1]).toString(16).padStart(2, '0')
          const g = Number(m[2]).toString(16).padStart(2, '0')
          const b = Number(m[3]).toString(16).padStart(2, '0')
          return `#${r}${g}${b}`
        }

        const luminance = (hex) => {
          const h = String(hex || '').replace('#','')
          if (h.length !== 6) return null
          const r = parseInt(h.slice(0,2),16)/255
          const g = parseInt(h.slice(2,4),16)/255
          const b = parseInt(h.slice(4,6),16)/255
          const srgb = [r,g,b].map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4))
          return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2]
        }

        const contrastRatio = (fgHex, bgHex) => {
          const L1 = luminance(fgHex)
          const L2 = luminance(bgHex)
          if (L1 == null || L2 == null) return null
          const lighter = Math.max(L1, L2)
          const darker = Math.min(L1, L2)
          return (lighter + 0.05) / (darker + 0.05)
        }

        const visible = (el) => {
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
          const rect = el.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        }

        const images = Array.from(document.querySelectorAll('img'))
        const missingAltImages = cap(images.filter(img => {
          const alt = img.getAttribute('alt')
          return !alt || String(alt).trim() === ''
        }).map(img => ({ selector: img.outerHTML.slice(0, 200), src: img.getAttribute('src') || '' })))

        const labelable = Array.from(document.querySelectorAll('input, select, textarea'))
        const inputsWithoutLabels = cap(labelable.filter(el => {
          if (!visible(el)) return false
          const id = el.getAttribute('id')
          const hasAria = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
          if (hasAria) return false
          if (id) {
            const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`)
            if (lbl) return false
          }
          let cur = el.parentElement
          while (cur) {
            if (cur.tagName.toLowerCase() === 'label') return false
            cur = cur.parentElement
          }
          return true
        }).map(el => ({ name: el.getAttribute('name') || '', type: el.getAttribute('type') || el.tagName.toLowerCase(), selector: el.outerHTML.slice(0, 200) })))

        const textNodes = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const t = String(node.textContent || '').trim()
            if (!t) return NodeFilter.FILTER_REJECT
            const p = node.parentElement
            if (!p) return NodeFilter.FILTER_REJECT
            if (!visible(p)) return NodeFilter.FILTER_REJECT
            return NodeFilter.FILTER_ACCEPT
          }
        })
        while (walker.nextNode()) textNodes.push(walker.currentNode)

        const lowContrastText = cap(textNodes.map(n => {
          const el = n.parentElement
          const cs = window.getComputedStyle(el)
          const fg = toHex(cs.color)
          let bg = toHex(cs.backgroundColor)
          if (!bg || cs.backgroundColor === 'transparent') {
            let cur = el.parentElement
            while (cur && (!bg || window.getComputedStyle(cur).backgroundColor === 'transparent')) {
              const sc = window.getComputedStyle(cur)
              bg = toHex(sc.backgroundColor)
              cur = cur.parentElement
            }
          }
          const ratio = contrastRatio(fg, bg)
          return { text: String(n.textContent || '').trim().slice(0, 120), selector: el.tagName.toLowerCase(), ratio }
        }).filter(x => (x.ratio || 0) > 0 && x.ratio < 4.5))

        const htmlLang = document.documentElement.getAttribute('lang')
        const missingLang = !htmlLang || String(htmlLang).trim() === ''

        const titleEl = document.querySelector('title')
        const missingTitle = !titleEl || String(titleEl.textContent || '').trim() === ''

        const landmarks = {
          nav: !!document.querySelector('nav'),
          main: !!document.querySelector('main'),
          footer: !!document.querySelector('footer')
        }

        const interactive = Array.from(document.querySelectorAll('button, a[href], input, select, textarea'))
        const keyboardIssues = cap(interactive.filter(el => {
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden') return false
          if (el.hasAttribute('disabled')) return true
          const ti = el.getAttribute('tabindex')
          if (ti && Number(ti) < 0) return true
          return false
        }).map(el => ({ tag: el.tagName.toLowerCase(), href: el.getAttribute('href') || '', selector: el.outerHTML.slice(0, 200) })))

        const totals = {
          missingAltImages: missingAltImages.length,
          inputsWithoutLabels: inputsWithoutLabels.length,
          lowContrastText: lowContrastText.length,
          keyboardIssues: keyboardIssues.length,
          missingLang: missingLang ? 1 : 0,
          missingTitle: missingTitle ? 1 : 0,
          missingLandmarks: (!landmarks.nav || !landmarks.main || !landmarks.footer) ? 1 : 0
        }

        const summaryParts = []
        if (totals.missingAltImages) summaryParts.push(`${totals.missingAltImages} image(s) missing alt`)
        if (totals.inputsWithoutLabels) summaryParts.push(`${totals.inputsWithoutLabels} input(s) without labels`)
        if (totals.lowContrastText) summaryParts.push(`${totals.lowContrastText} low-contrast text node(s)`)
        if (totals.keyboardIssues) summaryParts.push(`${totals.keyboardIssues} keyboard accessibility issue(s)`)
        if (missingLang) summaryParts.push(`html[lang] missing`)
        if (missingTitle) summaryParts.push(`title missing`)
        if (!landmarks.nav || !landmarks.main || !landmarks.footer) summaryParts.push(`missing landmark(s): ${['nav','main','footer'].filter(k => !landmarks[k]).join(', ')}`)

        return {
          success: true,
          summary: summaryParts.length ? summaryParts.join('; ') : 'No major issues detected by basic checks',
          issues: {
            missingAltImages,
            inputsWithoutLabels,
            lowContrastText,
            keyboardIssues,
            document: { missingLang, missingTitle, landmarks }
          }
        }
      }, Number(limitPerCategory))

      return { success: true, url, report: results }
    } catch (error) {
      return { success: false, url, error: error?.message || String(error) }
    } finally {
      if (browser) await browser.close()
    }
  }
}

export default AccessibilityAuditTool
