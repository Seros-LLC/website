import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const api = require('../assets/business-tools.js');
const source = readFileSync(new URL('../assets/business-tools.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../toolkit.html', import.meta.url), 'utf8');

test('all eight service combinations follow documented rule priority', () => {
  for (const clarity of ['unclear', 'defined']) for (const systems of ['separate', 'connected']) for (const ownership of ['missing', 'named']) {
    const result = api.recommendFit(clarity, systems, ownership);
    const expected = ownership === 'missing' ? 'internal process owner' : clarity === 'unclear' ? 'readiness assessment' : systems === 'separate' ? 'custom builds and integrations' : 'agentic workflow automation';
    assert.ok(result.title.includes(expected));
    assert.match(result.reason, /^Rule:/);
  }
  for (const args of [[], ['defined', 'bogus', 'named'], ['defined', 'connected', '__proto__']]) assert.match(api.recommendFit(...args).title, /Choose all/);
});
test('workflow patterns are complete, reject inherited keys and cannot be mutated by callers', () => {
  for (const key of ['intake', 'reporting', 'handoff']) {
    const flow = api.getWorkflow(key);
    for (const field of ['title', 'input', 'work', 'boundary', 'output']) assert.ok(flow[field].length > 15);
    flow.title = 'mutated';
    assert.notEqual(api.getWorkflow(key).title, 'mutated');
  }
  for (const key of ['unknown', '__proto__', 'constructor']) assert.equal(api.getWorkflow(key), null);
});
test('brief handles blanks, nonstrings, lengths, Unicode and untrusted text as plain text', () => {
  assert.equal((api.buildBrief().match(/Not yet specified/g) || []).length, 5);
  assert.match(api.buildBrief({ goal: '  Café <script>alert(1)</script>  ' }), /Goal and success check\nCafé <script>alert\(1\)<\/script>/);
  assert.match(api.buildBrief({ goal: 42, process: null }), /Not yet specified/);
  assert.ok(!api.buildBrief({ goal: 'x'.repeat(4001) }).includes('x'.repeat(4001)));
  assert.equal(api.buildBrief({ goal: 'Same' }), api.buildBrief({ goal: 'Same' }));
});
function harness(clipboard) {
  const elements = new Map();
  function node(id) {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: true, textContent: '', handlers: {}, attrs: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, setAttribute(k, v) { this.attrs[k] = v; }, focus() { this.focused = true; }, select() { this.selected = true; } });
    return elements.get(id);
  }
  const buttons = ['intake', 'reporting', 'handoff'].map(key => Object.assign(node(key), { dataset: { workflow: key } }));
  const enhanced = [node('enhanced')];
  const page = { querySelectorAll: selector => selector === '[data-enhanced]' ? enhanced : buttons };
  node('fit-form').elements = { clarity: { value: 'defined' }, systems: { value: 'separate' }, ownership: { value: 'named' } };
  for (const key of ['goal', 'process', 'systems', 'approval', 'scope']) node('brief-' + key).value = key === 'goal' ? '<img src=x onerror=alert(1)>' : '';
  const capacityElements = Object.fromEntries(['tasks', 'minutes', 'reduction', 'review'].map(key => [key, node('capacity-' + key)]));
  node('capacity-form').elements = capacityElements;
  const downloads = [], revoked = [];
  const document = { readyState: 'complete', querySelector: () => page, getElementById: node, body: { appendChild() {} }, createElement: () => ({ click() { downloads.push(this.download); }, remove() {} }) };
  const window = { navigator: { clipboard } };
  vm.runInNewContext(source, { window, document, Blob, URL: { createObjectURL: () => 'blob:brief', revokeObjectURL: url => revoked.push(url) }, setTimeout: fn => fn() });
  return { node, buttons, enhanced, downloads, revoked };
}
test('DOM enhancement wires fit, workflow, focus and plain-text brief output', () => {
  const h = harness();
  assert.equal(h.enhanced[0].hidden, false);
  h.node('fit-form').handlers.submit({ preventDefault() {} });
  assert.match(h.node('fit-output').textContent, /integrations/);
  h.buttons[1].handlers.click();
  assert.equal(h.buttons[1].attrs['aria-pressed'], 'true');
  assert.equal(h.buttons[0].attrs['aria-pressed'], 'false');
  assert.equal(h.node('workflow-title').textContent, 'Weekly operations reporting');
  h.node('brief-generate').handlers.click();
  assert.ok(h.node('brief-output').focused);
  assert.match(h.node('brief-output').value, /<img src=x onerror=alert\(1\)>/);
});
test('clipboard absent or rejected selects current text and explains manual fallback', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw Error('denied'); } }]) {
    const h = harness(clipboard);
    await h.node('brief-copy').handlers.click();
    assert.ok(h.node('brief-output').selected);
    assert.ok(h.node('brief-output').focused);
    assert.match(h.node('brief-status').textContent, /Clipboard unavailable/);
  }
});
test('copy and download regenerate current entries and release download URL', async () => {
  let copied;
  const h = harness({ writeText: async text => { copied = text; } });
  h.node('brief-goal').value = 'Latest edits';
  await h.node('brief-copy').handlers.click();
  assert.match(copied, /Latest edits/);
  assert.match(h.node('brief-status').textContent, /Brief copied/);
  h.node('brief-goal').value = 'Download edits';
  h.node('brief-download').handlers.click();
  assert.match(h.node('brief-output').value, /Download edits/);
  assert.deepEqual(h.downloads, ['seros-project-brief.txt']);
  assert.deepEqual(h.revoked, ['blob:brief']);
});
test('page has matching site shell, labels, fallback and deferred local script', () => {
  const nav = html.match(/<nav class="site"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/<a /g) || []).length, 5);
  assert.match(html, /styles\.css\?v=14/);
  assert.match(html, /business-tools\.js\?v=1" defer><\/script>/);
  assert.match(html, /seros\.dev\/toolkit"/);
  assert.match(html, /#1b3b6f/);
  assert.doesNotMatch(html, /site-tools\.css|<form id="brief-form"/);
  assert.match(html, /not an ROI estimate/);
  assert.match(html, /<noscript>/);
  assert.equal((html.match(/<select /g) || []).length, 3);
  for (const match of html.matchAll(/<(?:select|textarea)\b[^>]*id="([^"]+)"/g)) assert.ok(html.includes(`for="${match[1]}"`));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
  assert.match(html, /not an assessment/);
});
test('capacity calculator validates bounds and clamps net capacity', () => {
  const ok = api.calculateCapacity({ tasks: '20', minutes: '15', reduction: '50', review: '30' });
  assert.equal(ok.ok, true); assert.equal(ok.grossMinutes, 150); assert.equal(ok.netMinutes, 120); assert.equal(ok.netHours, 2);
  assert.match(ok.message, /Illustration only.*Not an ROI/);
  assert.equal(api.calculateCapacity({ tasks: 1, minutes: 10, reduction: 10, review: 60 }).netMinutes, 0);
  assert.equal(api.calculateCapacity({ tasks: 0, minutes: 0, reduction: 100, review: 0 }).ok, true);
  for (const [field, bad] of [['tasks', ''], ['tasks', '-1'], ['minutes', 'NaN'], ['minutes', 'Infinity'], ['reduction', '100.1'], ['review', 'abc'], ['review', null]]) {
    const result = api.calculateCapacity({ tasks: 1, minutes: 1, reduction: 1, review: 1, [field]: bad });
    assert.equal(result.ok, false); assert.equal(result.field, field);
  }
});
test('capacity DOM shows invalid state, focus and textContent result', () => {
  const h = harness();
  Object.assign(h.node('capacity-tasks'), { value: '10' }); Object.assign(h.node('capacity-minutes'), { value: '6' });
  Object.assign(h.node('capacity-reduction'), { value: '101' }); Object.assign(h.node('capacity-review'), { value: '0' });
  h.node('capacity-form').handlers.submit({ preventDefault() {} });
  assert.equal(h.node('capacity-reduction').attrs['aria-invalid'], 'true'); assert.ok(h.node('capacity-reduction').focused);
  h.node('capacity-reduction').value = '50';
  h.node('capacity-form').handlers.submit({ preventDefault() {} });
  assert.equal(h.node('capacity-reduction').attrs['aria-invalid'], 'false'); assert.match(h.node('capacity-output').textContent, /30 minutes/);
});
