let chromium;
try { ({ chromium } = await import('playwright')); } catch { chromium = null }
import puppeteer from 'puppeteer'

/**
 * 🌐 BrowserDiagnosticsTool - Enables JOE to monitor and analyze browser console logs and network activity.
 * This tool is crucial for diagnosing frontend issues like JavaScript errors and failed API calls.
 */
class BrowserDiagnosticsTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.analyzePageState.metadata = {
            name: "analyze_page_state",
            description: "Navigates to a URL, monitors the browser console for errors, and captures failed network requests. Essential for diagnosing frontend bugs, JavaScript errors, and failed API calls (e.g., 404, 500, CORS).",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The URL of the page to analyze." },
                    timeout: { type: "number", description: "Maximum time in milliseconds to wait for the page to load and logs to be collected (default: 15000)." }
                },
                required: ["url"]
            }
        };
    }

    async analyzePageState({ url, timeout = 15000 }) {
        let browser;
        const consoleLogs = [];
        const networkFailures = [];
        let pageLoadTime = null;

        try {
            if (chromium) {
              browser = await chromium.launch();
              const page = await browser.newPage();

            // 1. Console Listener
            page.on('console', msg => {
                if (['error', 'warning', 'info'].includes(msg.type())) {
                    consoleLogs.push({
                        type: msg.type(),
                        text: msg.text(),
                        location: msg.location().url
                    });
                }
            });

            // 2. Network Listener
            page.on('requestfailed', request => {
                networkFailures.push({
                    url: request.url(),
                    method: request.method(),
                    failure: request.failure().errorText,
                });
            });

            // 3. Navigate and Measure Load Time
            const startTime = Date.now();
            const response = await page.goto(url, { waitUntil: 'networkidle', timeout });
            pageLoadTime = Date.now() - startTime;

            // 4. Check the main page response status
            if (response && response.status() >= 400) {
                networkFailures.push({
                    url: url,
                    method: 'GET',
                    status: response.status(),
                    statusText: response.statusText(),
                    failure: `Page Load HTTP Error ${response.status()}`
                });
            }
            } else {
              browser = await puppeteer.launch();
              const page = await browser.newPage();
              page.on('console', msg => {
                const type = msg.type();
                if (['error', 'warning', 'info'].includes(type)) {
                  consoleLogs.push({ type, text: msg.text(), location: url });
                }
              });
              page.on('requestfailed', request => {
                networkFailures.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || 'failed' });
              });
              const startTime = Date.now();
              const response = await page.goto(url, { waitUntil: 'networkidle0', timeout });
              pageLoadTime = Date.now() - startTime;
              const status = response?.status?.() || 200;
              if (status >= 400) {
                networkFailures.push({ url, method: 'GET', status, statusText: '', failure: `Page Load HTTP Error ${status}` });
              }
            }

            return {
                success: true,
                url: url,
                pageLoadTime: `${pageLoadTime}ms`,
                consoleLogs: consoleLogs,
                networkFailures: networkFailures,
                summary: this._generateSummary(consoleLogs, networkFailures)
            };

        } catch (error) {
            return {
                success: false,
                url: url,
                error: `Failed to analyze page: ${error.message}`,
                summary: `Critical failure during page analysis: ${error.message}`
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    _generateSummary(consoleLogs, networkFailures) {
        const errorCount = consoleLogs.filter(log => log.type === 'error').length;
        const warningCount = consoleLogs.filter(log => log.type === 'warning').length;
        const failedRequestsCount = networkFailures.length;

        let summary = `Analysis complete. Found ${errorCount} console error(s) and ${warningCount} warning(s). `;
        summary += `Detected ${failedRequestsCount} failed network request(s).`;

        if (errorCount > 0) {
            summary += ` Top Error: ${consoleLogs.find(log => log.type === 'error')?.text || 'N/A'}.`;
        }
        if (failedRequestsCount > 0) {
            summary += ` Top Network Failure: ${networkFailures[0].url} (${networkFailures[0].failure}).`;
        }

        return summary;
    }
}

export default BrowserDiagnosticsTool;
