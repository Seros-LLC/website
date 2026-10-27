import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (file, key) => { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(readFileSync(join(ROOT, file), 'utf8'), ctx); return ctx.window[key]; };
const demo = load('assets/agent-demo.js', 'SerosAgentDemo');
const offers = load('assets/offerings.js', 'SerosOfferings');

test('agent demo scenarios are complete and every one has a human-review flag', () => {
  assert.deepEqual([...demo.scenarios], ['invoice', 'support', 'intake']);
  for (const id of demo.scenarios) {
    const s = demo.getScenario(id);
    assert.ok(s.fields.length >= 4 && s.checks.length >= 3 && s.draft && s.action, id);
    assert.ok(demo.flagCount(s) >= 1, `${id} demonstrates a policy flag`);
  }
  assert.equal(demo.getScenario('__proto__'), demo.getScenario('invoice'));
  assert.equal(demo.getScenario('constructor'), demo.getScenario('invoice'));
});

test('agent demo never advances past review on its own', () => {
  assert.equal(demo.nextStep('received'), 'extracted');
  assert.equal(demo.nextStep('extracted'), 'checked');
  assert.equal(demo.nextStep('checked'), 'review');
  assert.equal(demo.nextStep('review'), 'review');
  assert.equal(demo.nextStep('bogus'), 'bogus');
});

test('offerings search matches all words, case and punctuation insensitive', () => {
  assert.equal(offers.matches('Contract review assistant (clause extraction)', 'CLAUSE contract'), true);
  assert.equal(offers.matches('Contract review assistant', 'contract invoice'), false);
  assert.equal(offers.matches('anything', '   '), true);
});

test('offerings page lists exactly 300 offers with no internal pricing or risk data', () => {
  const html = readFileSync(join(ROOT, 'offerings.html'), 'utf8');
  assert.equal((html.match(/data-offer /g) || html.match(/data-offer data-unit/g) || []).length, 300);
  assert.equal((html.match(/class="offer-group"/g) || []).length, 20);
  assert.doesNotMatch(html, /\$(?!150 per hour)[0-9][0-9,]{2,}|Effective \$|Risk note|Market source|HIPAA: BAA|rockstardeveloper/);
  assert.match(html, /\$150 per hour/);
  assert.match(html, /<link rel="canonical" href="https:\/\/seros\.dev\/offerings">/);
  assert.match(html, /<div class="offer-controls" role="search" hidden data-offer-controls>/, 'controls hidden without JS');
});
