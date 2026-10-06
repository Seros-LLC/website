import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(ROOT, 'assets/site-tools.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const tools = context.window.SerosSiteTools;

test('workflow demo supports proposed, review, approve, and hold states without claiming real actions', () => {
  const proposed = JSON.parse(JSON.stringify(tools.getDemoState('proposed')));
  assert.equal(proposed.stage, 'proposed');
  assert.equal(proposed.status, 'Draft only');
  assert.equal(tools.getDemoState('review').status, 'Waiting for a person');
  assert.equal(tools.getDemoState('approved').status, 'Approved in this demonstration');
  assert.equal(tools.getDemoState('held').status, 'Held in this demonstration');
  assert.equal(tools.getDemoState('delete-everything').stage, 'proposed');
});

test('workflow fit notes reflect only selected process characteristics and never score viability', () => {
  const empty = tools.buildFitNote({});
  assert.equal(empty.title, 'Start with the process, not the tool.');
  assert.equal(empty.points.length, 1);
  const selected = tools.buildFitNote({ repeatable: true, digital: true, exceptions: true, consequential: true });
  assert.equal(selected.title, 'Bring the process and its exceptions.');
  assert.deepEqual(JSON.parse(JSON.stringify(selected.points)), [
    'Write down the repeated steps and the inputs they use.',
    'List the exceptions that need a person to decide.',
    'Name what must never happen without approval.',
  ]);
  assert.equal(JSON.stringify(selected).match(/\b(score|percent|guarantee|savings)\b/gi), null);
  assert.equal(tools.buildFitNote({ repeatable: true }).title, 'Describe the repeated work.');
});

test('homepage and package page expose accessible, progressive-enhancement hooks for the tools', () => {
  const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const packages = readFileSync(join(ROOT, 'packages.html'), 'utf8');
  assert.match(home, /id="workflow-demo"/);
  assert.match(home, /aria-live="polite"/);
  assert.match(home, /data-demo-state="proposed"/);
  assert.match(home, /This is an illustrative demonstration/);
  assert.match(home, /src="\/assets\/site-tools\.js\?v=2" defer/);
  assert.match(packages, /id="workflow-fit-check"/);
  assert.match(packages, /src="\/assets\/site-tools\.js\?v=2" defer/);
  assert.match(packages, /name="fit-repeatable"/);
  assert.match(packages, /name="fit-digital"/);
  assert.match(packages, /name="fit-exceptions"/);
  assert.match(packages, /name="fit-consequential"/);
  assert.match(packages, /Nothing you select here is sent or stored/);
});
