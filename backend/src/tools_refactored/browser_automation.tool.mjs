/**
 * 🌐 BrowserAutomationTool - Enables JOE to perform complex, multi-step web interactions.
 * This tool is an advanced version of the existing browser tool, focusing on transactional tasks.
 */
import { chromium } from 'playwright'

class BrowserAutomationTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.navigateAndExtract.metadata = {
            name: "navigateAndExtract",
            description: "Navigates to a URL and extracts specific data points using CSS selectors or XPath. Useful for structured data retrieval.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The URL to navigate to." },
                    selectors: { type: "array", items: { type: "string" }, description: "An array of CSS selectors or XPath expressions for the data to extract (e.g., ['#product-name', '.price', '//h1/text()'])."},
                    context: { type: "string", description: "A brief description of the data being sought (e.g., 'The name and price of the main product')." }
                },
                required: ["url", "selectors", "context"]
            }
        };

        this.fillFormAndSubmit.metadata = {
            name: "fillFormAndSubmit",
            description: "Fills out a web form and submits it. Use this for login, registration, or search forms.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The URL of the page containing the form." },
                    fields: { 
                        type: "array", 
                        items: { 
                            type: "object", 
                            properties: {
                                selector: { type: "string", description: "CSS selector or XPath for the input field." },
                                value: { type: "string", description: "The value to type into the field." }
                            },
                            required: ["selector", "value"]
                        },
                        description: "An array of objects defining the fields to fill."
                    },
                    submitSelector: { type: "string", description: "CSS selector or XPath for the submit button." }
                },
                required: ["url", "fields", "submitSelector"]
            }
        };
    }

    async navigateAndExtract({ url, selectors, context }) {
        let browser
        try {
            browser = await chromium.launch({ headless: true })
            const page = await browser.newPage()
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
            const data = []
            for (const s of selectors) {
                try {
                    const isXPath = s.trim().startsWith('//')
                    const locator = isXPath ? page.locator(`xpath=${s}`) : page.locator(s)
                    const handle = await locator.first()
                    const text = await handle.textContent()
                    data.push({ selector: s, value: (text || '').trim() })
                } catch (e) {
                    data.push({ selector: s, error: e?.message || String(e) })
                }
            }
            return { success: true, message: `Extracted ${data.length} items for: ${context}`, extractedData: data }
        } catch (error) {
            return { success: false, error: error?.message || String(error) }
        } finally {
            if (browser) await browser.close()
        }
    }

    async fillFormAndSubmit({ url, fields, submitSelector }) {
        let browser
        try {
            browser = await chromium.launch({ headless: true })
            const page = await browser.newPage()
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
            for (const f of fields) {
                const sel = String(f.selector || '').trim()
                const val = String(f.value || '')
                if (!sel) continue
                const isXPath = sel.startsWith('//')
                const locator = isXPath ? page.locator(`xpath=${sel}`) : page.locator(sel)
                const h = await locator.first()
                await h.fill(val)
            }
            if (submitSelector) {
                const isXPath = submitSelector.trim().startsWith('//')
                const locator = isXPath ? page.locator(`xpath=${submitSelector}`) : page.locator(submitSelector)
                const h = await locator.first()
                await h.click()
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
            }
            const finalUrl = page.url()
            const title = await page.title()
            return { success: true, message: `Submitted form`, url: finalUrl, title }
        } catch (error) {
            return { success: false, error: error?.message || String(error) }
        } finally {
            if (browser) await browser.close()
        }
    }
}

export default BrowserAutomationTool;
