/* Mobile accessibility and usability regression suite.
   Every route at phone viewports (portrait and landscape) and at 200% text:
   no horizontal overflow, 44px touch targets, form controls >= 16px (no iOS
   focus zoom), readable minimum text, decorative ASCII hidden from assistive
   tech, header not eating the viewport, axe WCAG 2.2 AA on mobile, reduced
   motion honoured, and the primary navigation operable by keyboard and touch.
   Uses PLAYWRIGHT_MODULE, CHROME_PATH, PREVIEW_URL and optional AXE_PATH. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const routes = ['/', '/services', '/packages', '/pricing', '/work', '/contact', '/offerings', '/toolkit',
  '/security', '/privacy', '/terms', '/ai', '/acceptable-use', '/dpa', '/subprocessors', '/cookies', '/billing', '/404'];
const viewports = [[320, 640], [375, 812], [390, 844], [412, 915], [812, 375]];
const errors = [];
let checks = 0;
function check(condition, label) { checks++; if (!condition) errors.push(label); }

async function audit(page, prefix, { strictTargets }) {
  const r = await page.evaluate(() => {
    const visible = el => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden'; };
    const label = el => `${el.tagName.toLowerCase()} "${(el.textContent || el.value || el.id || '').trim().slice(0, 24)}"`;
    const targets = [...document.querySelectorAll('a[href], button, input, select, textarea, summary')].filter(visible).filter(el => {
      // Inline links inside running prose are exempt under WCAG 2.5.8.
      if (el.matches('p a, li a, td a, dd a, blockquote a') && getComputedStyle(el).display === 'inline' && !el.closest('nav, footer .cols')) return false;
      // Checkboxes and radios count by their wrapping label.
      const box = (el.matches('input[type=checkbox], input[type=radio]') && (el.closest('label') || document.querySelector(`label[for="${el.id}"]`)) || el).getBoundingClientRect();
      return box.width < 44 || box.height < 44;
    }).map(label);
    const minimum = [...document.querySelectorAll('a[href], button, input, select, textarea, summary')].filter(visible).filter(el => {
      const b = el.getBoundingClientRect(); return b.width < 24 || b.height < 24;
    }).filter(el => !el.matches('input[type=checkbox], input[type=radio]') && !(el.matches('p a, li a, td a, dd a') && getComputedStyle(el).display === 'inline')).map(label);
    const smallInputs = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea')]
      .filter(visible).filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(label);
    const tinyText = [...document.querySelectorAll('body *:not(pre):not(script):not(style)')].filter(el =>
      visible(el) && !el.closest('[aria-hidden="true"]') && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2) && parseFloat(getComputedStyle(el).fontSize) < 12
    ).map(el => `${label(el)} ${getComputedStyle(el).fontSize}`);
    const exposedAscii = [...document.querySelectorAll('pre')].filter(el => !el.closest('[aria-hidden="true"]')).map(el => el.className);
    const clipped = [...document.querySelectorAll('body *')].filter(visible).filter(el => {
      if (el.closest('.table-scroll, pre, [aria-hidden="true"]')) return false;
      const b = el.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1;
    }).slice(0, 5).map(label);
    const header = document.querySelector('header.site').getBoundingClientRect().height;
    const navLinks = [...document.querySelectorAll('nav[aria-label="Primary navigation"] a')].filter(visible).length;
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, targets, minimum, smallInputs, tinyText, exposedAscii, clipped,
      headerRatio: header / innerHeight, navLinks, viewport: document.querySelector('meta[name=viewport]')?.content || '' };
  });
  check(!r.overflow, `${prefix}: no horizontal page overflow`);
  check(r.clipped.length === 0, `${prefix}: nothing clipped off-screen: ${r.clipped.join(', ')}`);
  check(r.minimum.length === 0, `${prefix}: WCAG 2.5.8 24px minimum targets: ${r.minimum.join(', ')}`);
  if (strictTargets) check(r.targets.length === 0, `${prefix}: 44px touch targets: ${r.targets.slice(0, 6).join(', ')}`);
  check(r.smallInputs.length === 0, `${prefix}: form controls >= 16px: ${r.smallInputs.join(', ')}`);
  check(r.tinyText.length === 0, `${prefix}: no text below 12px: ${r.tinyText.slice(0, 5).join(', ')}`);
  check(r.exposedAscii.length === 0, `${prefix}: ASCII art hidden from screen readers: ${r.exposedAscii.join(', ')}`);
  check(r.navLinks >= 5, `${prefix}: all primary navigation visible without a hidden menu`);
  check(/width=device-width/.test(r.viewport) && !/user-scalable=no|maximum-scale=1(?!\d)/.test(r.viewport), `${prefix}: zoomable responsive viewport`);
  return r;
}

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < height, deviceScaleFactor: 2 });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${width}x${height}: ${error.message}`));
    for (const route of routes) {
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      const prefix = `${route} ${width}x${height}`;
      const r = await audit(page, prefix, { strictTargets: true });
      // Header may wrap on phones, but must leave most of the first screen to content.
      check(r.headerRatio < (height < width ? 0.3 : 0.28), `${prefix}: header uses ${Math.round(r.headerRatio * 100)}% of the viewport`);
      if (width === 375 && process.env.AXE_PATH) {
        await page.addScriptTag({ path: process.env.AXE_PATH });
        const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }))
          .violations.map(v => `${v.id} ${v.nodes.map(n => n.target).join(' ')}`));
        check(violations.length === 0, `${prefix}: axe mobile ${violations.join('; ')}`);
      }
    }
    await context.close();
  }

  // 200% text zoom on a 375px phone: layout must reflow without overflow or tiny controls.
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(base + route);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; return document.fonts.ready; });
      await audit(page, `${route} 375 text=200%`, { strictTargets: false });
    }
    await context.close();
  }

  // Touch and keyboard operation of the primary navigation.
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(base + '/');
    await page.locator('nav[aria-label="Primary navigation"] a', { hasText: 'Engagements' }).tap();
    await page.waitForURL(/\/pricing$/);
    check(true, 'touch navigation reaches Engagements');
    await page.keyboard.press('Tab');
    const skip = await page.evaluate(() => document.activeElement.className);
    check(skip.includes('skip'), 'first Tab lands on skip link');
    const seen = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => {
        const el = document.activeElement, s = getComputedStyle(el);
        return { href: el.getAttribute('href'), ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 };
      }));
    }
    const navSeen = seen.slice(0, 6).filter(s => ['/services', '/work', '/pricing', '/security', '/contact'].includes(s.href));
    check(new Set(navSeen.map(s => s.href)).size === 5, 'keyboard reaches every primary navigation link: ' + seen.map(s => s.href).join(','));
    check(navSeen.every(s => s.ring), 'navigation focus ring is visible');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/(security|contact|pricing|work|services)$/);
    check(true, 'keyboard Enter activates navigation');
    await context.close();
  }

  // Offerings catalog filters usable by touch on a phone and not sticky over content.
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(base + '/offerings');
    const search = page.locator('.offer-controls input[type=search], .offer-controls input').first();
    await search.tap();
    await search.fill('invoice');
    await page.waitForTimeout(200);
    const shown = await page.locator('.offer:not([hidden])').count();
    check(shown > 0 && shown < 300, `offerings search filters by touch (${shown} shown)`);
    check(await page.locator('.offer-controls').evaluate(el => getComputedStyle(el).position) !== 'sticky', 'offerings filters do not stick over phone content');
    await context.close();
  }

  // Reduced motion: no running animations and the ASCII layer does not animate.
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    for (const route of ['/', '/toolkit', '/offerings']) {
      await page.goto(base + route);
      await page.waitForTimeout(400);
      const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
      check(running === 0, `${route} reduced motion: no infinite CSS animations (${running})`);
      const frames = await page.evaluate(() => [...document.querySelectorAll('pre[data-ascii], pre[data-ascii-field]')].map(el => el.textContent));
      await page.waitForTimeout(600);
      const later = await page.evaluate(() => [...document.querySelectorAll('pre[data-ascii], pre[data-ascii-field]')].map(el => el.textContent));
      check(JSON.stringify(frames) === JSON.stringify(later), `${route} reduced motion: ASCII frames stay still`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

assert.equal(errors.length, 0, `${errors.length} of ${checks} mobile checks failed:\n` + errors.slice(0, 60).join('\n'));
console.log(`PASS: ${checks} mobile checks across ${routes.length} routes at ${viewports.length} phone viewports, 200% text, touch and keyboard navigation, offerings filters and reduced motion.`);
