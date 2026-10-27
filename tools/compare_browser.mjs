/* Compare the same homepage tasks against a historical commit and the local preview.
   Uses the same PLAYWRIGHT_MODULE, CHROME_PATH, PREVIEW_URL and AXE_PATH as test_browser.mjs.
   BEFORE_REF defaults to the pre-overhaul commit. Emits measured JSON, fails on regression. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const cwd = join(dirname(fileURLToPath(import.meta.url)), '..');
const before = process.env.BEFORE_REF || '10685e9^';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const observations = [];
try {
  for (const version of ['baseline', 'redesign']) {
    const context = await browser.newContext();
    if (version === 'baseline') await context.route(base + '/**', async route => {
      let path = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      if (!path.includes('.')) path += '.html';
      const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2', json: 'application/json' };
      try {
        const body = execFileSync('git', ['show', before + ':' + path], { cwd, maxBuffer: 20 * 1024 * 1024 });
        await route.fulfill({ status: 200, contentType: types[path.split('.').pop()] || 'application/octet-stream', body });
      } catch { await route.abort(); }
    });
    const page = await context.newPage();
    for (const [width, height] of [[375, 812], [1366, 768], [1440, 1000]]) {
      await page.setViewportSize({ width, height });
      await page.goto(base);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      const metrics = await page.evaluate(() => {
        const box = document.querySelector('.hero-copy .btn').getBoundingClientRect();
        return {
          ctaBottom: Math.round(box.bottom), ctaInFirstViewport: box.bottom <= innerHeight && box.top >= 0,
          overflow: document.documentElement.scrollWidth > innerWidth,
          runningAnimations: document.getAnimations().filter(a => a.playState === 'running').length
        };
      });
      let axeViolations = null;
      if (process.env.AXE_PATH) {
        await page.addScriptTag({ path: process.env.AXE_PATH });
        axeViolations = await page.evaluate(async () => {
          const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
          return result.violations.map(v => ({ id: v.id, affectedElements: v.nodes.length }));
        });
      }
      await page.locator('[data-demo-next]').focus();
      await page.keyboard.press('Enter');
      const reviewFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-demo-choice') === 'approved');
      await page.keyboard.press('Enter');
      const approvedWithKeyboard = await page.locator('#workflow-demo').getAttribute('data-demo-state') === 'approved';
      const { readFileSync } = await import('node:fs');
      const cssBytes = version === 'baseline' ? execFileSync('git', ['show', before + ':assets/styles.css'], { cwd }).length : readFileSync(join(cwd, 'assets/styles.css')).length;
      const observation = { version, width, height, ...metrics, axeViolations, reviewFocus, approvedWithKeyboard, cssBytes };
      observations.push(observation);
      if (version === 'redesign') {
        assert.equal(metrics.ctaInFirstViewport, true, `${width}: primary action remains above fold`);
        assert.equal(metrics.overflow, false);
        assert.equal(metrics.runningAnimations, 0);
        assert.equal(reviewFocus, true);
        assert.equal(approvedWithKeyboard, true);
        if (axeViolations) assert.deepEqual(axeViolations, []);
        assert.ok(cssBytes < observations.find(o => o.version === 'baseline').cssBytes);
      }
    }
    await context.close();
  }
  console.log(JSON.stringify({ before, observations }, null, 2));
} finally { await browser.close(); }
