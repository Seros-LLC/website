/* Focused acceptance of services, engagements, work and contact.
   Uses PLAYWRIGHT_MODULE, CHROME_PATH, PREVIEW_URL and optional AXE_PATH.
   No emails are sent and no external repository is contacted. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const errors = [];
let checks = 0;
function check(condition, label) { checks++; if (!condition) errors.push(label); }
try {
  const page = await browser.newPage();
  const requests = [];
  page.on('request', request => requests.push(request));
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/services', '/pricing', '/work', '/contact']) {
    for (const [width, scale] of [[320,1], [375,1], [320,2], [768,2], [1440,1]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + route);
      await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale * 100}%`; }, scale);
      await page.evaluate(() => document.fonts.ready);
      const prefix = `${route} width=${width} text=${scale * 100}%`;
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        clipped: [...document.querySelectorAll('header a, main h1, main h2, main h3, main .btn')].filter(el => {
          const rect = el.getBoundingClientRect(); return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
        }).map(el => el.textContent.trim()),
        headings: [...document.querySelectorAll('main :is(h1,h2,h3,h4,h5,h6)')].map(el => Number(el.tagName.slice(1)))
      }));
      check(!layout.overflow, prefix + ': no page overflow');
      check(layout.clipped.length === 0, prefix + ': no clipped headings/actions: ' + layout.clipped.join(', '));
      check(layout.headings[0] === 1 && layout.headings.every((level, i) => !i || level <= layout.headings[i-1] + 1), prefix + ': sequential heading structure');
      const current = page.locator('nav[aria-label="Primary navigation"] [aria-current="page"]');
      check(await current.count() === 1 && await current.first().getAttribute('href') === route, prefix + ': current page exposed');
      check(await page.locator('main form').count() === 0, prefix + ': no lead collection form');
      const cta = page.locator('main .btn.primary').first();
      check(await cta.count() === 1 && await cta.isVisible(), prefix + ': discoverable primary action');
      if (process.env.AXE_PATH && scale === 2) {
        await page.addScriptTag({ path: process.env.AXE_PATH });
        const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id:v.id, targets:v.nodes.map(n=>n.target) })));
        check(violations.length === 0, prefix + ': accessibility ' + JSON.stringify(violations));
      }
    }
    await page.goto(base + route);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    check(new URL(page.url()).hash === '#main', route + ': keyboard skip link works');
    check(await page.evaluate(() => {
      const el=document.querySelector('.skip'); el.focus(); return getComputedStyle(el).outlineStyle !== 'none';
    }), route + ': visible focus');
    if (route !== '/contact') {
      await page.locator('main .btn.primary').click();
      check(new URL(page.url()).pathname === '/contact', route + ': primary CTA navigates to discovery email page');
    }
  }
  await page.goto(base + '/services');
  const names = await page.locator('.card h3').allTextContents();
  check(JSON.stringify(names) === JSON.stringify(['AI strategy and readiness assessment','Advisory retainer','Agentic workflow automation','AI-native custom CRM','Custom builds and integrations','Care plan']), 'services: all six exact offers once, in guidance order');
  const services = await page.locator('main').innerText();
  for (const term of ['written advice','person approving every consequential step','Fixed scope, weekly demos, code in your repository','Optional. Monthly, cancellable.']) check(services.includes(term), 'services: preserves principle ' + term);
  await page.goto(base + '/pricing');
  const pricing = await page.locator('main').innerText();
  check([...pricing.matchAll(/\$[\d,]+/g)].every(match=>match[0]==='$150'), 'pricing: only published monetary rate');
  for (const term of ['$150 per hour','net 30','signed statement of work','at cost with receipts','another firm','first principles']) check(pricing.includes(term), 'pricing: preserves ' + term);
  await page.locator('main a[href="/packages"]').click();
  check(new URL(page.url()).pathname === '/packages', 'pricing: package builder journey resolves');
  await page.goto(base + '/work');
  const work = await page.locator('main').innerText();
  for (const term of ['in-house product, not a client case study','Status: paused.','implementation is retired','not a service currently available to buy','does not establish client outcomes or a financial return']) check(work.replace(/\s+/g,' ').includes(term), 'work: honest evidence ' + term);
  check(await page.locator('main a[href="https://github.com/Seros-LLC/seros"]').count()===1,'work: public spec evidence link');
  await page.goto(base + '/contact');
  const mailto = await page.locator('main .btn.primary').getAttribute('href');
  const url = new URL(mailto);
  check(url.protocol==='mailto:' && url.pathname==='team@seros.dev' && url.searchParams.get('subject')==='Project enquiry','contact: valid prefilled draft, no send');
  const contact=await page.locator('main').innerText();
  for (const term of ['No form or account needed','Do not send credentials or customer data','two business days','free thirty-minute discovery call']) check(contact.includes(term),'contact: preserves safety/expectation ' + term);
  await page.locator('main a[href="/pricing"]').click();
  check(new URL(page.url()).pathname === '/pricing','contact: pricing detail journey resolves');
  check(requests.every(request => new URL(request.url()).origin === new URL(base).origin), 'all four pages: no third-party network calls');
  check(requests.every(request => request.method()==='GET'), 'all four pages: no submissions');
  assert.deepEqual(errors, [], `${checks} secondary-page checks`);
  console.log(`PASS: ${checks} secondary-page content, journey, narrow-screen, 200%-text, navigation and safety checks.`);
} finally { await browser.close(); }
