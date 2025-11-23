
/**
 * Browser Manager - Singleton pattern for managing a single Playwright browser instance.
 * Ensures that we don't launch a new browser for every request, which is resource-intensive.
 */

import { chromium } from 'playwright-core';

let browserInstance = null;
let launchPromise = null;

/**
 * Launches and returns a singleton browser instance.
 * If an instance is already launching or running, it returns the existing one.
 * @returns {Promise<import('playwright-core').Browser>} A promise that resolves to the browser instance.
 */
export async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    if (!launchPromise) {
        console.log('🚀 Launching new shared browser instance...');
        launchPromise = chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Currently needed for some environments
                '--disable-gpu'
            ]
        }).then(browser => {
            console.log('✅ Shared browser instance launched successfully.');
            browserInstance = browser;
            browser.on('disconnected', () => {
                console.log('⚠️ Shared browser instance disconnected.');
                browserInstance = null;
                launchPromise = null;
            });
            return browser;
        }).catch(error => {
            console.error('❌ Failed to launch shared browser instance:', error);
            launchPromise = null; // Reset promise on failure
            throw error;
        });
    }

    return launchPromise;
}

/**
 * Closes the shared browser instance. 
 * Should be called on graceful shutdown of the application.
 */
export async function closeBrowser() {
    if (launchPromise) {
        console.log('👋 Closing shared browser instance...');
        const browser = await getBrowser();
        await browser.close();
        browserInstance = null;
        launchPromise = null;
        console.log('✅ Shared browser instance closed.');
    }
}
