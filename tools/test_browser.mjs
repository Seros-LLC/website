/* Real-browser regression checks. Run the preview server first:
   python3 tools/preview.py 8080
   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tools/test_browser.mjs
   Optional: CHROME_PATH=/path/to/chrome, PREVIEW_URL, SCREENSHOT_DIR, AXE_PATH.
   Uses an existing Playwright installation. Does not install dependencies. */
import assert from 'node:assert/strict';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8080';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const shots = process.env.SCREENSHOT_DIR;
if (shots) mkdirSync(shots, { recursive: true });
let layouts = 0;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const routes = readdirSync(root).filter(name => name.endsWith('.html')).map(name => name === 'index.html' ? '/' : '/' + name.replace('.html', ''));
  for (const [width, height] of [[375,812], [812,375], [768,1024], [1440,1000]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1, `${route}: one h1`);
      assert.ok(await page.title(), `${route}: title`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${route} has horizontal overflow at ${width}px`);
      if (process.env.AXE_PATH && [375,1440].includes(width)) {
        await page.addScriptTag({ path: process.env.AXE_PATH });
        const violations = await page.evaluate(async () => {
          const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
          return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
        });
        assert.deepEqual(violations, [], `${route}: automated accessibility at ${width}px`);
      }
      const nav = page.locator('nav[aria-label="Primary navigation"] a');
      assert.equal(await nav.count(), 5, `${route}: all navigation routes available`);
      for (const link of await nav.all()) {
        const bounds = await link.boundingBox();
        assert.ok(bounds && bounds.height >= 44, `${route}: navigation hit area`);
      }
      if (shots && ['/', '/services', '/contact', '/packages'].includes(route) && [375,1440].includes(width)) {
        await page.screenshot({ path: join(shots, `${route === '/' ? 'home' : route.slice(1)}-${width}.png`), fullPage: true });
      }
      layouts++;
    }
  }
  await page.goto(base);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => location.hash), '#main', 'skip link reaches content');
  await page.locator('[data-demo-next]').click();
  assert.equal(await page.locator('#workflow-demo').getAttribute('data-demo-state'), 'review');
  assert.equal(await page.locator('[data-demo-choice="approved"]').evaluate(el => el === document.activeElement), true, 'focus follows review');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#workflow-demo').getAttribute('data-demo-state'), 'approved');
  await page.locator('[data-demo-restart]').click();
  await page.locator('[data-demo-next]').click();
  await page.locator('[data-demo-choice="held"]').click();
  assert.equal(await page.locator('#workflow-demo').getAttribute('data-demo-state'), 'held');
  await page.locator('[data-demo-restart]').click();
  assert.equal(await page.locator('#workflow-demo').getAttribute('data-demo-state'), 'proposed');
  for (const id of ['strategy', 'automation', 'care']) {
    await page.goto(base + '/services#' + id);
    assert.equal(await page.locator('#' + id).count(), 1, `service deep link ${id}`);
  }
  await page.goto(base + '/packages');
  const checkboxes = page.locator('.pb-form input[type="checkbox"]');
  assert.ok(await checkboxes.count() > 0);
  await checkboxes.first().check();
  assert.ok((await page.locator('.pb-items').innerText()).trim().length > 0, 'package selection updates summary');
  const mail = page.locator('.pb-summary a[href^="mailto:"]');
  assert.ok((await mail.first().getAttribute('href')).startsWith('mailto:team@seros.dev'), 'package draft stays an email action');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const staticPage = await noJS.newPage();
  await staticPage.goto(base);
  assert.ok(await staticPage.locator('noscript').isVisible(), 'no-JS explanation visible');
  assert.ok(await staticPage.locator('.hero-copy .btn').isVisible(), 'primary CTA works without JS');
  await noJS.close();
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  console.log(`PASS: ${layouts} real-browser page/viewport checks, keyboard skip link, approve/hold/restart, service deep links, package summary, reduced motion and no-JS fallback.`);
} finally {
  await browser.close();
}
