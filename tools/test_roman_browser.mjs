import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8081';
try {
  const page = await browser.newPage();
  for (const width of [320,375,768,1440]) {
    await page.setViewportSize({width, height:1000});
    await page.goto(base);
    await page.locator('.ascii-ready').waitFor();
    const shape = await page.locator('[data-ascii]').evaluate(el => {
      const box = el.getBoundingClientRect();
      const caption = el.parentElement.querySelector('figcaption').getBoundingClientRect();
      return { rows: el.textContent.trimEnd().split('\n').length, count: el.textContent.replace(/\s/g,'').length, bottom:box.bottom, caption:caption.top };
    });
    assert.ok(shape.rows >= 35 && shape.count > 400, 'Real engraving is rendered as ASCII');
    assert.ok(shape.bottom <= shape.caption + 2, `Complete sculpture fits above caption at ${width}`);
    await page.locator('[data-motion-toggle]').click();
    assert.equal(await page.locator('[data-motion-toggle]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.orbit-one').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.locator('[data-motion-toggle]').click();
    assert.equal(await page.locator('[data-motion-toggle]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('.orbit-one').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.orbit-one').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('#process-heading').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!document.querySelector('.hero-art').classList.contains('in-view'));
    assert.equal(await page.locator('.orbit-one').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.locator('.hero-art').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.hero-art').classList.contains('in-view'));
    if(process.env.SCREENSHOT_DIR) {
      mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
      await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/roman-${width}.png`,fullPage:true});
    }
  }
  console.log('PASS: ASCII engraving bounds, pause/resume and reduced motion at four widths.');
} finally { await browser.close(); }
