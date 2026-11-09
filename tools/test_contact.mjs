import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import contactFunction, { createContactHandler } from '../api/contact.mjs';

const secret = 's'.repeat(48);
const data = { id: 'f519910f-bbd0-4931-aad9-203b0c3e6d98', name: 'Alex Taylor', business: 'Example Studio', email: 'alex@example.test', message: 'Please help us improve our onboarding process.', website: '' };
function request(body = data, headers = {}) {
  return new Request('https://seros.dev/api/contact', { method: 'POST', headers: { origin: 'https://seros.dev', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...headers }, body: JSON.stringify(body) });
}

test('forwards a valid enquiry server-to-server with the scoped secret and no browser cookies', async () => {
  let forwarded;
  const handler = createContactHandler({ env: { SEROS_WEBSITE_INGEST_SECRET: secret }, fetch: async (url, options) => {
    forwarded = { url, options };
    return Response.json({ ok: true, id: data.id }, { status: 201 });
  } });
  const result = await handler(request(data, { cookie: 'private=not-forwarded', authorization: 'Bearer not-forwarded' }));
  assert.equal(result.status, 201);
  assert.equal(forwarded.url, 'https://os.seros.dev/api/webhooks/seros-website');
  assert.equal(forwarded.options.headers['x-seros-website-secret'], secret);
  assert.match(forwarded.options.headers['x-seros-website-client'], /^[a-f0-9]{64}$/);
  assert.equal(forwarded.options.headers.origin, 'https://seros.dev');
  assert.equal(forwarded.options.headers.cookie, undefined);
  assert.equal(forwarded.options.headers.authorization, undefined);
  assert.equal(forwarded.options.redirect, 'error');
  assert.deepEqual(JSON.parse(forwarded.options.body), data);
  assert.equal(JSON.stringify(await result.json()).includes(secret), false);
});

test('refuses foreign or missing origin, honeypot, invalid fields and oversized bodies without forwarding', async () => {
  let calls = 0;
  const handler = createContactHandler({ env: { SEROS_WEBSITE_INGEST_SECRET: secret }, fetch: async () => { calls++; throw new Error('must not fetch'); } });
  for (const origin of ['https://evil.test', 'null', '', 'https://seros.dev.evil.test', 'toString']) assert.equal((await handler(request(data, { origin }))).status, 403);
  assert.equal((await handler(request({ ...data, website: 'https://spam.test' }))).status, 400);
  assert.equal((await handler(request({ ...data, email: 'not-email' }))).status, 400);
  assert.equal((await handler(request({ ...data, message: '' }))).status, 400);
  assert.equal((await handler(request({ ...data, message: 'x'.repeat(25000) }))).status, 413);
  assert.equal(calls, 0);
});

test('fails closed when setup is missing and never follows a login redirect or claims false success', async () => {
  assert.equal((await createContactHandler({ env: {} })(request())).status, 503);
  const badUrl = createContactHandler({ env: { SEROS_WEBSITE_INGEST_SECRET: secret, SEROS_WEBSITE_INGEST_URL: 'http://internal.test/api/webhooks/seros-website' } });
  assert.equal((await badUrl(request())).status, 503);
  const redirected = createContactHandler({ env: { SEROS_WEBSITE_INGEST_SECRET: secret }, fetch: async () => new Response('login', { status: 302 }) });
  assert.equal((await redirected(request())).status, 503);
});

test('limits repeated attempts in a warm function instance', async () => {
  const handler = createContactHandler({ env: { SEROS_WEBSITE_INGEST_SECRET: secret }, fetch: async () => Response.json({ ok: true, id: data.id }, { status: 200 }) });
  for (let attempt = 0; attempt < 10; attempt++) assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request())).status, 429);
});

test('the deployed web-standard export handles a real loopback HTTP request', async () => {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const request = new Request(`http://127.0.0.1${incoming.url}`, { method: incoming.method, headers: incoming.headers, ...(incoming.method !== 'GET' && incoming.method !== 'HEAD' ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}) });
      const response = await contactFunction.fetch(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch { outgoing.writeHead(500); outgoing.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/contact`, { method: 'POST', headers: { origin: 'https://foreign.test', 'content-type': 'application/json' }, body: JSON.stringify(data) });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'Origin refused.' });
  } finally { server.close(); await once(server, 'close'); }
});
