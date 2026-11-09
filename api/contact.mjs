import { createHmac } from 'node:crypto';

const BODY_LIMIT = 24 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_INGEST_URL = 'https://os.seros.dev/api/webhooks/seros-website';
const reply = (body, status, extra = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', ...extra } });

async function boundedJson(request, limit) {
  if (Number(request.headers.get('content-length') ?? 0) > limit) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('json');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error('size'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

/** Public same-origin endpoint. The credential is only ever read on the server. */
export function createContactHandler({ env = process.env, fetch: forward = globalThis.fetch, now = Date.now } = {}) {
  const attempts = new Map();
  let total = { until: 0, count: 0 };
  return async function contact(request) {
    if (request.method !== 'POST') return reply({ error: 'Use POST.' }, 405, { allow: 'POST' });
    const origin = request.headers.get('origin');
    if (origin !== 'https://seros.dev' && origin !== 'https://www.seros.dev') return reply({ error: 'Origin refused.' }, 403);
    if (request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: 'Origin refused.' }, 403);
    const secret = env.SEROS_WEBSITE_INGEST_SECRET;
    let target;
    try {
      target = new URL(env.SEROS_WEBSITE_INGEST_URL || DEFAULT_INGEST_URL);
      if (target.protocol !== 'https:' || target.username || target.password || target.pathname !== '/api/webhooks/seros-website' || target.search || target.hash) throw new Error('config');
      if (!secret || secret.length < 32 || secret.length > 512) throw new Error('config');
    } catch { return reply({ error: 'The contact form is not available. Please email team@seros.dev.' }, 503); }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply({ error: 'Send JSON.' }, 415);
    let body;
    try { body = await boundedJson(request, BODY_LIMIT); }
    catch (error) { return reply({ error: error.message === 'size' ? 'Your message is too large.' : 'Invalid enquiry.' }, error.message === 'size' ? 413 : 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Invalid enquiry.' }, 400);
    const fields = {};
    const line = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max && !/[\x00-\x1f\x7f]/u.test(value);
    if (!line(body.name, 120)) fields.name = 'Enter your name (up to 120 characters).';
    if (!line(body.business, 160)) fields.business = 'Enter your business (up to 160 characters).';
    if (typeof body.email !== 'string' || body.email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(body.email)) fields.email = 'Enter a valid email address.';
    if (typeof body.message !== 'string' || body.message.trim().length < 10 || body.message.trim().length > 5000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(body.message)) fields.message = 'Write 10–5,000 characters without control characters.';
    if (body.website !== '' || typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) return reply({ error: 'Invalid enquiry.' }, 400);
    if (Object.keys(fields).length) return reply({ error: 'Check the highlighted fields.', fields }, 400);

    // Vercel overwrites its forwarding header; never accept an IP supplied in the body.
    // Durable authoritative per-client/email/global limits also run in OS SQLite.
    const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 128);
    const client = createHmac('sha256', secret).update(ip).digest('hex');
    const time = now();
    if (total.until <= time) total = { until: time + WINDOW_MS, count: 0 };
    for (const [key, entry] of attempts) if (entry.until <= time) attempts.delete(key);
    let entry = attempts.get(client);
    if (!entry) {
      if (attempts.size >= 1000) return reply({ error: 'Please try later or email team@seros.dev.' }, 429, { 'retry-after': '600' });
      entry = { until: time + WINDOW_MS, count: 0 };
      attempts.set(client, entry);
    }
    if (entry.count >= 10 || total.count >= 200) return reply({ error: 'Too many attempts. Please try later or email team@seros.dev.' }, 429, { 'retry-after': '600' });
    entry.count++;
    total.count++;
    try {
      const response = await forward(target.toString(), {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'content-type': 'application/json', origin, 'x-seros-website-secret': secret, 'x-seros-website-client': client },
        body: JSON.stringify({ id: body.id.toLowerCase(), name: body.name.trim(), business: body.business.trim(), email: body.email.toLowerCase(), message: body.message.trim(), website: '' }),
      });
      if (response.status === 429) return reply({ error: 'Too many enquiries. Please try later or email team@seros.dev.' }, 429, { 'retry-after': '3600' });
      if (response.status === 409) return reply({ error: 'Your submission changed. Reload this page before sending a new message.' }, 409);
      if (response.status === 400) return reply({ error: 'Please check your name, business, email and message, then try again.' }, 400);
      if (response.status !== 200 && response.status !== 201) throw new Error('upstream');
      const result = await boundedJson(response, 2048);
      if (result?.ok !== true || result.id !== body.id.toLowerCase()) throw new Error('upstream');
      return reply({ ok: true, id: result.id }, response.status);
    } catch {
      return reply({ error: 'We could not confirm receipt. Try again with the same message, or email team@seros.dev.' }, 503);
    }
  };
}

export default { fetch: createContactHandler() };
