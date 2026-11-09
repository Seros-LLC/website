(() => {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('contact-status');
  const fieldset = form.querySelector('fieldset');
  const button = form.querySelector('button[type=submit]');
  const fields = ['name', 'business', 'email', 'message'];
  const storageKey = 'seros-website-enquiry-attempt';
  let attempt = null;
  let busy = false;
  if (typeof crypto === 'undefined' || !crypto.randomUUID || !crypto.subtle) {
    status.textContent = 'This browser cannot securely submit the form. Please email team@seros.dev.';
    return;
  }
  try { attempt = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* Storage is optional; in-page retries still keep the same ID. */ }
  fieldset.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    for (const field of fields) {
      form.elements.namedItem(field).removeAttribute('aria-invalid');
      const error = document.getElementById(`contact-${field}-error`);
      error.hidden = true;
      error.textContent = '';
    }
    const payload = Object.fromEntries(fields.map((field) => [field, form.elements.namedItem(field).value.trim()]));
    payload.email = payload.email.toLowerCase();
    payload.website = form.elements.namedItem('website').value;
    busy = true;
    button.disabled = true;
    button.textContent = 'Submitting…';
    status.textContent = 'Submitting your enquiry…';
    form.setAttribute('aria-busy', 'true');
    let received = false;
    try {
      // Persist only an opaque ID and hash, never the message or contact details.
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      const fingerprint = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
      if (!attempt || attempt.fingerprint !== fingerprint || typeof attempt.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt.id)) attempt = { id: crypto.randomUUID(), fingerprint };
      try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); } catch { /* Private browsing can disable storage. */ }
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit',
        body: JSON.stringify({ ...payload, id: attempt.id }), signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.id !== attempt.id) {
        if (result.fields && typeof result.fields === 'object') {
          for (const field of fields) {
            const detail = result.fields[field];
            if (typeof detail !== 'string') continue;
            form.elements.namedItem(field).setAttribute('aria-invalid', 'true');
            const error = document.getElementById(`contact-${field}-error`);
            error.textContent = detail;
            error.hidden = false;
          }
        }
        status.textContent = typeof result.error === 'string' ? result.error : 'We could not confirm receipt. Please try again or email team@seros.dev.';
        status.focus();
        return;
      }
      received = true;
      fieldset.disabled = true;
      status.textContent = 'Your enquiry has been received. We will review it and reply to the email address you provided. You have not been subscribed to marketing.';
      status.focus();
    } catch {
      status.textContent = 'We could not confirm receipt. Try again with the same message, or email team@seros.dev. Your text has been kept on this page.';
      status.focus();
    } finally {
      busy = false;
      button.disabled = received;
      button.textContent = received ? 'Enquiry received' : 'Submit enquiry';
      form.removeAttribute('aria-busy');
    }
  });
})();
