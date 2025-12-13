#!/usr/bin/env node
import { spawn } from 'node:child_process';

const env = process.env;
const isCI = String(env.CI || '').toLowerCase() === 'true';
const isCloudflare = ['CF_PAGES', 'CLOUDFLARE_PAGES', 'CLOUDFLARE'].some(k => String(env[k] || '').length > 0);
const isRender = ['RENDER', 'RENDER_SERVICE_ID'].some(k => String(env[k] || '').length > 0);
const skip = isCI || isCloudflare;

function run(cmd, args = []) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

(async () => {
  try {
    if (skip) {
      console.log('[puppeteer-install] Skipping browser downloads in CI/Pages environment');
      return;
    }
    const okChrome = await run('npx', ['puppeteer', 'browsers', 'install', 'chrome']);
    if (!okChrome) console.warn('[puppeteer-install] Chrome download failed (continuing)');
    // Chromium install is optional; skip by default to reduce build time and avoid pinned errors
    if (!isRender) {
      console.log('[puppeteer-install] Skipping chromium install (optional)');
      return;
    }
    const okChromium = await run('npx', ['puppeteer', 'browsers', 'install', 'chromium']);
    if (!okChromium) console.warn('[puppeteer-install] Chromium download failed (continuing)');
  } catch (e) {
    console.warn('[puppeteer-install] Ignoring error:', e?.message || String(e));
  }
})();

