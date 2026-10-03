// Tests for /packages: the pure functions in assets/package-builder.js and the page copy.
// Run: node tools/test_package_builder.mjs  (no dependencies; node:test + node:vm)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS_PATH = join(ROOT, 'assets', 'package-builder.js');
const HTML_PATH = join(ROOT, 'packages.html');
const CSS_PATH = join(ROOT, 'assets', 'package-builder.css');

function load() {
  // No document: the script must expose its pure functions and skip DOM wiring.
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(JS_PATH, 'utf8'), context, { filename: 'package-builder.js' });
  const api = context.window.SerosPackageBuilder;
  assert.ok(api, 'window.SerosPackageBuilder is exported');
  return api;
}

const PB = load();

const OFFER_NAMES = [
  'AI strategy and readiness assessment', 'Advisory retainer', 'Agentic workflow automation',
  'AI-native custom CRM', 'Custom builds and integrations', 'Care plan',
];

// From business/CLAIMS-RULES.md section 3, plus the retired call name.
const BANNED = [
  'revolutionary', 'game-changing', 'game changing', 'unlock', 'supercharge', '10x', 'autonomous',
  'fully automatic', 'hands-free', 'ai-powered', 'copilot', 'second brain', 'ai teammate',
  'effortless', 'seamless', 'magic', 'enterprise-grade', 'bank-level', 'military-grade',
  'soc 2', 'iso 27001', 'hipaa', 'replace your staff', 'cut headcount', 'guarantee',
  'trusted by', 'our clients', 'scoping call', 'early access', 'create an account',
];

const FULL = {
  start: 'assess', builds: ['custom', 'crm', 'workflow'], support: ['care', 'retainer'],
  size: '11-50', timeline: 'quarter', org: 'Example Co', systems: 'Gmail, a shared spreadsheet',
  process: 'Quotes are prepared by hand from emailed requests.',
};

const decode = (href) => {
  const url = new URL(href);
  return {
    to: decodeURIComponent(url.pathname),
    subject: url.searchParams.get('subject'),
    body: url.searchParams.get('body'),
    keys: [...url.searchParams.keys()],
  };
};

function assertCleanCopy(text, where) {
  const lowered = text.toLowerCase();
  for (const word of BANNED) assert.ok(!lowered.includes(word), `${where}: contains banned ${JSON.stringify(word)}`);
  assert.ok(!text.includes('!'), `${where}: contains an exclamation mark`);
  assert.ok(!/\p{Extended_Pictographic}/u.test(text), `${where}: contains emoji`);
  const amounts = text.match(/\$\s*\d[\d,.]*/g) || [];
  for (const amount of amounts) assert.equal(amount.replace(/[.,]$/, ''), '$150', `${where}: price ${amount}`);
}

test('summary lists items in engagement order: assessment, builds, retainer, care plan', () => {
  const s = PB.buildSummary(FULL);
  assert.equal(s.empty, false);
  assert.deepEqual([...s.items].map((i) => i.name), [
    'AI strategy and readiness assessment', 'Agentic workflow automation', 'AI-native custom CRM',
    'Custom builds and integrations', 'Advisory retainer', 'Care plan',
  ]);
  for (const item of s.items) assert.ok(item.description.length > 20, `${item.name} has a description`);
});

test('every one of the six offer names is used exactly', () => {
  const names = PB.buildSummary(FULL).items.map((i) => i.name);
  for (const name of OFFER_NAMES) assert.ok(names.includes(name), name);
});

test('a build without an assessment starts with discovery for the build', () => {
  const s = PB.buildSummary({ start: 'build', builds: ['crm'] });
  assert.deepEqual([...s.items].map((i) => i.id), ['discovery', 'crm']);
  const noStart = PB.buildSummary({ builds: ['workflow'] });
  assert.equal(noStart.items[0].id, 'discovery');
});

test('the support starting point recommends a care plan once, even if also ticked', () => {
  const s = PB.buildSummary({ start: 'support', support: ['care'] });
  assert.deepEqual([...s.items].map((i) => i.id), ['care']);
  const rec = PB.buildSummary({ start: 'support' });
  assert.deepEqual([...rec.items].map((i) => i.id), ['care']);
  assert.equal(rec.items[0].recommended, true);
});

test('unknown ids and tampered values are ignored', () => {
  const s = PB.buildSummary({ start: 'evil', builds: ['crm', '<img>', 'crm'], support: ['x'], size: 'zzz' });
  assert.deepEqual([...s.items].map((i) => i.id), ['discovery', 'crm']);
});

test('empty selection gives an empty message and still a working mailto', () => {
  for (const state of [{}, { start: '', builds: [], support: [] }, undefined, null]) {
    const s = PB.buildSummary(state);
    assert.equal(s.empty, true);
    assert.equal(s.items.length, 0);
    assert.match(s.message, /choose/i);
    const m = PB.buildMailto(state);
    assert.ok(m.href.startsWith('mailto:team@seros.dev?'));
    assert.match(decode(m.href).body, /No services chosen yet/);
  }
});

test('summary notes the approval-gate position and the published rate only', () => {
  const s = PB.buildSummary(FULL);
  const notes = s.notes.join(' ');
  assert.match(notes, /person approves every consequential step/i);
  assert.match(notes, /Fixed fees are built from our \$150 per hour rate and quoted after the discovery call\./);
  assert.match(s.firstStep, /discovery call/i);
  assert.match(s.firstStep, /free/i);
  assert.match(s.firstStep, /thirty minutes/i);
});

test('mailto goes to team@seros.dev with encoded subject and body', () => {
  const m = PB.buildMailto(FULL);
  assert.ok(m.href.startsWith('mailto:team@seros.dev?subject='));
  assert.ok(!/[\s<>"]/.test(m.href), 'no raw whitespace or markup in the href');
  const d = decode(m.href);
  assert.equal(d.to, 'team@seros.dev');
  assert.deepEqual(d.keys, ['subject', 'body']);
  assert.equal(d.subject, 'Discovery call request - Example Co');
  assert.match(d.body, /Sent from seros\.dev\/packages/);
  assert.match(d.body, /1\. AI strategy and readiness assessment/);
  assert.match(d.body, /Quotes are prepared by hand/);
  assert.match(d.body, /11-50 people/);
  // Body lines are CRLF separated and each fits in 78 characters.
  for (const line of d.body.split('\r\n')) assert.ok(line.length <= 78, `line too long: ${line}`);
  assert.ok(!/\r(?!\n)|(?<!\r)\n/.test(d.body), 'only CRLF line breaks');
});

test('reserved characters in user text cannot add mailto parameters', () => {
  const m = PB.buildMailto({ ...FULL, org: 'Acme&cc=attacker@example.com', systems: 'a&bcc=x@y.z?body=hi#frag' });
  const d = decode(m.href);
  assert.deepEqual(d.keys, ['subject', 'body']);
  assert.ok(d.subject.includes('Acme&cc=attacker@example.com'));
  assert.ok(d.body.includes('a&bcc=x@y.z?body=hi#frag'));
});

test('header injection is stripped from the subject', () => {
  const evil = 'Acme\r\nBcc: attacker@example.com\nX-Evil: 1\u2028\u0085\u0000tail';
  const m = PB.buildMailto({ org: evil });
  const d = decode(m.href);
  assert.ok(!/[\r\n\u0000-\u001f\u007f\u0085\u2028\u2029]/.test(d.subject), JSON.stringify(d.subject));
  assert.ok(!/%0[ad]/i.test(m.href.split('&body=')[0]), 'no encoded CR/LF in the subject parameter');
  assert.ok(d.subject.startsWith('Discovery call request - Acme Bcc: attacker@example.com'));
  assert.equal(PB.sanitizeLine('a\r\nb\tc'), 'a b c');
});

test('single-line fields lose newlines; the textarea keeps them in the body', () => {
  const m = PB.buildMailto({ systems: 'one\r\ntwo', process: 'line one\r\nline two' });
  const d = decode(m.href);
  assert.match(d.body, /Systems involved: one two/);
  assert.match(d.body, /line one\r\n {2}line two/);
});

test('lone surrogates and bidi controls do not break encoding', () => {
  const m = PB.buildMailto({ org: 'A\uD800B\u202Ec', process: 'x\uDC00y' });
  const d = decode(m.href);
  assert.ok(d.subject.endsWith('A\uFFFDBc'));
  assert.match(d.body, /x\uFFFDy/);
});

test('the mailto is capped at 1800 characters and says when the textarea was trimmed', () => {
  const long = Array.from({ length: 400 }, (_, i) => `step ${i} of the process`).join(' ');
  const m = PB.buildMailto({ ...FULL, process: long });
  assert.ok(m.href.length <= PB.MAX_MAILTO, `length ${m.href.length}`);
  assert.equal(PB.MAX_MAILTO, 1800);
  assert.equal(m.truncated, true);
  const d = decode(m.href);
  assert.match(d.body, /Trimmed to fit an email link/);
  assert.match(d.body, /Sent from seros\.dev\/packages/);
  for (const line of d.body.split('\r\n')) assert.ok(line.length <= 78);

  const short = PB.buildMailto(FULL);
  assert.equal(short.truncated, false);
  assert.doesNotMatch(decode(short.href).body, /Trimmed/);
});

test('multi-byte text in every field still fits under the cap', () => {
  const heavy = '\u{1F600}\u4E2D\u00E9'.repeat(400);
  const m = PB.buildMailto({ ...FULL, org: heavy, systems: heavy, process: heavy });
  assert.ok(m.href.length <= PB.MAX_MAILTO, `length ${m.href.length}`);
  const d = decode(m.href);
  assert.match(d.body, /Sent from seros\.dev\/packages/);
  assert.match(d.body, /AI strategy and readiness assessment/);
});

test('generated text has no banned words, exclamation marks, emoji or other prices', () => {
  const states = [
    {}, FULL, { start: 'build', builds: ['workflow'] }, { start: 'support' },
    { support: ['retainer'] }, { builds: ['crm', 'custom'], support: ['care'] },
  ];
  for (const state of states) {
    const s = PB.buildSummary(state);
    const text = [s.message, s.firstStep, s.startLabel || '', ...s.notes,
      ...s.items.flatMap((i) => [i.name, i.description, i.reason || ''])].join('\n');
    assertCleanCopy(text, `summary ${JSON.stringify(state)}`);
    assertCleanCopy(PB.buildMailto(state).body, `mailto ${JSON.stringify(state)}`);
    assertCleanCopy(PB.buildPlainText(state), `copy text ${JSON.stringify(state)}`);
  }
});

test('the page copy follows the claims rules and uses clean links', () => {
  const html = readFileSync(HTML_PATH, 'utf8');
  const visible = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<![^>]*>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&rarr;/g, '').replace(/&[a-z]+;/g, ' ');
  assertCleanCopy(visible, 'packages.html');
  for (const name of OFFER_NAMES) assert.ok(visible.includes(name), `page names ${name}`);
  assert.ok(visible.includes('Fixed fees are built from our $150 per hour rate and quoted after the discovery call.'));
  assert.ok(!/href="[^"]*\.html/.test(html), 'no .html hrefs');
});

test('the page respects the CSP: no inline script, style or handlers', () => {
  const html = readFileSync(HTML_PATH, 'utf8');
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'no inline <script>');
  assert.ok(!/<style/i.test(html), 'no <style>');
  assert.ok(!/\sstyle=/i.test(html), 'no style= attributes');
  assert.ok(!/\son[a-z]+=/i.test(html), 'no inline event handlers');
  assert.ok(!/(src|href)="https?:\/\/(?!seros\.dev)/i.test(html), 'no third-party assets');
  for (const tag of ['<title>', 'name="viewport"', 'name="description"',
    '<link rel="canonical" href="https://seros.dev/packages">', 'property="og:title"',
    'property="og:description"', 'property="og:type"', 'content="https://seros.dev/packages"',
    'content="https://seros.dev/assets/og-card-2026-09.jpg"', 'name="twitter:card"',
    'href="/assets/styles.css?v=11"', 'href="/assets/package-builder.css?v=1"',
    '<script src="/assets/package-builder.js?v=1" defer></script>', 'aria-live="polite"']) {
    assert.ok(html.includes(tag), `page has ${tag}`);
  }
  const js = readFileSync(JS_PATH, 'utf8');
  assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|innerHTML|\beval\(|new Function/.test(js),
    'script makes no network calls, stores nothing and builds no HTML strings');
  const css = readFileSync(CSS_PATH, 'utf8');
  assert.ok(!/@import|url\(\s*['"]?https?:/i.test(css), 'no external CSS');
  assert.ok(css.includes('--seros-amber'), 'amber focus ring on dark');
});
