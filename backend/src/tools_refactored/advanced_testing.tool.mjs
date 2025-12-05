import { chromium } from 'playwright';


/**
 * 🧪 AdvancedTestingTool - Enables JOE to perform complex, user-simulated testing and performance analysis.
 * This tool is crucial for ensuring the quality and stability of developed applications.
 */
class AdvancedTestingTool {
    constructor(dependencies) {
        this.dependencies = dependencies;
        this._initializeMetadata();
    }

    _initializeMetadata() {
        this.simulateUserJourney.metadata = {
            name: "simulateUserJourney",
            description: "Simulates a sequence of user actions (a 'journey') on a website to test a critical feature, such as login, checkout, or form submission. The tool records the success/failure of each step and performance metrics.",
            parameters: {
                type: "object",
                properties: {
                    startUrl: {
                        type: "string",
                        description: "The starting URL for the user journey (e.g., 'https://my-app.com/login')."
                    },
                    journeySteps: {
                        type: "array",
                        description: "A list of sequential steps to perform. Each step is a JSON object defining the action.",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string", enum: ["click", "fill", "navigate", "check_text"], description: "The action to perform." },
                                selector: { type: "string", description: "The CSS selector of the element to interact with (e.g., '#login-button', 'input[name=\"email\"]')." },
                                value: { type: "string", description: "The value to fill into an input field (only for 'fill' action)." },
                                expectedText: { type: "string", description: "The text to check for on the page (only for 'check_text' action)." }
                            },
                            required: ["action"]
                        }
                    },
                    timeout: {
                        type: "number",
                        description: "Maximum time in milliseconds to wait for each step to complete (default: 10000)."
                    }
                },
                required: ["startUrl", "journeySteps"]
            }
        };

        this.crossBrowserSmokeTest.metadata = {
            name: "crossBrowserSmokeTest",
            description: "Runs a simple page load and selector visibility check across Chromium, Firefox, and WebKit.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "The URL to open." },
                    selector: { type: "string", description: "A CSS selector expected to be visible after load." },
                    timeout: { type: "number", description: "Max time per browser in ms.", default: 10000 }
                },
                required: ["url", "selector"]
            }
        };
    }

    async simulateUserJourney({ startUrl, journeySteps, timeout = 10000 }) {
        let browser;
        let context;
        let page;
        const results = [];
        let overallSuccess = true;

        try {
            browser = await chromium.launch();
            context = await browser.newContext();
            page = await context.newPage();

            // 1. Start Navigation
            const startTime = Date.now();
            await page.goto(startUrl, { timeout: timeout });
            const initialLoadTime = Date.now() - startTime;
            results.push({
                step: 0,
                action: "navigate",
                details: `Navigated to ${startUrl}`,
                status: "SUCCESS",
                time: initialLoadTime + "ms"
            });

            // 2. Execute Steps
            for (let i = 0; i < journeySteps.length; i++) {
                const step = journeySteps[i];
                const stepStartTime = Date.now();
                let status = "SUCCESS";
                let details = "";

                try {
                    switch (step.action) {
                        case "click":
                            await page.click(step.selector, { timeout: timeout });
                            details = `Clicked element with selector: ${step.selector}`;
                            break;
                        case "fill":
                            await page.fill(step.selector, step.value, { timeout: timeout });
                            details = `Filled value into selector: ${step.selector}`;
                            break;
                        case "navigate":
                            await page.goto(step.selector, { timeout: timeout });
                            details = `Navigated to: ${step.selector}`;
                            break;
                        case "check_text":
                            {
                                const isVisible = await page.isVisible(`text=${step.expectedText}`, { timeout: timeout });
                                if (!isVisible) {
                                    throw new Error(`Expected text "${step.expectedText}" not found.`);
                                }
                                details = `Verified text: "${step.expectedText}" is visible.`;
                                break;
                            }
                        default:
                            status = "FAILURE";
                            details = `Unknown action: ${step.action}`;
                            overallSuccess = false;
                    }
                } catch (error) {
                    status = "FAILURE";
                    details = `Action failed: ${error.message}`;
                    overallSuccess = false;
                }

                results.push({
                    step: i + 1,
                    action: step.action,
                    details: details,
                    status: status,
                    time: (Date.now() - stepStartTime) + "ms"
                });

                if (status === "FAILURE") {
                    // Stop the journey on the first failure
                    break;
                }
            }

            return {
                success: overallSuccess,
                summary: overallSuccess ? "User journey completed successfully." : "User journey failed at one or more steps.",
                results: results,
                finalUrl: page.url()
            };

        } catch (error) {
            return {
                success: false,
                summary: `Critical error during journey simulation: ${error.message}`,
                results: results,
                error: error.message
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async crossBrowserSmokeTest({ url, selector, timeout = 10000 }) {
        const engines = []
        try {
            const mod = await import('playwright')
            engines.push(['chromium', mod.chromium])
            engines.push(['firefox', mod.firefox])
            engines.push(['webkit', mod.webkit])
        } catch (e) {
            return { success: false, error: e?.message || String(e) }
        }
        const results = []
        let ok = true
        for (const [name, engine] of engines) {
            let browser
            try {
                browser = await engine.launch()
                const ctx = await browser.newContext()
                const page = await ctx.newPage()
                const t0 = Date.now()
                await page.goto(url, { timeout })
                const visible = await page.isVisible(selector).catch(() => false)
                const t1 = Date.now() - t0
                results.push({ browser: name, loadTimeMs: t1, selectorVisible: !!visible })
                if (!visible) ok = false
            } catch (e2) {
                ok = false
                results.push({ browser: name, error: e2?.message || String(e2) })
            } finally {
                if (browser) await browser.close()
            }
        }
        return { success: ok, results }
    }
}

export default AdvancedTestingTool;
