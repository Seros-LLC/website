import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/contact-form.js', import.meta.url), 'utf8');
function browser(storage, send) {
  const fields = Object.fromEntries(Object.entries({ name: 'Alex Taylor', business: 'Example Studio', email: 'alex@example.test', message: 'Please help with our onboarding process.', website: '' }).map(([name, value]) => [name, { value, setAttribute() {}, removeAttribute() {}, focus() {} }]));
  const status = { textContent: '', focus() {} };
  const errors = {};
  let submit;
  const button = { textContent: 'Submit enquiry', disabled: false };
  const fieldset = { disabled: true };
  const form = { elements: { namedItem: (name) => fields[name] }, querySelector: (selector) => selector === 'fieldset' ? fieldset : button, reportValidity: () => true, addEventListener: (name, handler) => { if (name === 'submit') submit = handler; }, setAttribute() {}, removeAttribute() {} };
  const document = { getElementById: (id) => id === 'contact-form' ? form : id === 'contact-status' ? status : (errors[id] ??= { textContent: '', hidden: true }) };
  const sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  vm.runInNewContext(source, { document, sessionStorage, crypto: webcrypto, TextEncoder, fetch: send, AbortSignal, JSON, Uint8Array });
  return { fields, button, fieldset, status, submit: () => submit({ preventDefault() {} }) };
}

test('an uncertain receipt reuses its submission id across page reloads, with no personal data in session storage', async () => {
  const storage = new Map();
  const attempts = [];
  let page = browser(storage, async (url, options) => { attempts.push(JSON.parse(options.body)); throw new Error('network'); });
  assert.equal(page.fieldset.disabled, false);
  await page.submit();
  assert.match(page.status.textContent, /could not confirm/i);
  page = browser(storage, async (url, options) => { const body = JSON.parse(options.body); attempts.push(body); return Response.json({ ok: true, id: body.id }, { status: 200 }); });
  await page.submit();
  assert.equal(attempts[0].id, attempts[1].id);
  assert.match(page.status.textContent, /received/i);
  assert.equal(page.fieldset.disabled, true);
  assert.equal(JSON.stringify([...storage.values()]).includes('alex@example.test'), false);
  assert.equal(JSON.stringify([...storage.values()]).includes('onboarding'), false);
});

test('editing an uncertain message creates a new submission id', async () => {
  const attempts = [];
  const page = browser(new Map(), async (url, options) => { attempts.push(JSON.parse(options.body)); throw new Error('network'); });
  await page.submit();
  page.fields.message.value = 'A different enquiry with changed requirements.';
  await page.submit();
  assert.notEqual(attempts[0].id, attempts[1].id);
});
