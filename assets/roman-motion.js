/* Decorative local engraving renderer. No requests except the existing same-origin image. */
(function () {
  'use strict';
  const art = document.querySelector('.hero-art');
  if (!art) return;
  const image = art.querySelector('img');
  const output = art.querySelector('[data-ascii]');
  const toggle = art.querySelector('[data-motion-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  function sync() {
    document.documentElement.classList.toggle('motion-paused', paused);
    toggle.disabled = reduced.matches;
    toggle.textContent = reduced.matches ? 'Reduced motion' : (paused ? 'Resume motion' : 'Pause motion');
    toggle.setAttribute('aria-pressed', String(paused));
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  sync();
  function render() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 40;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, 100, 40);
      const pixels = ctx.getImageData(0, 0, 100, 40).data;
      const glyphs = ' .,:;i+ox%#@';
      let text = '';
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 100; x++) {
          const i = (y * 100 + x) * 4;
          const alpha = pixels[i + 3] / 255;
          const density = alpha * (1 - (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 765);
          text += glyphs[Math.min(glyphs.length - 1, Math.round(density * (glyphs.length - 1)))];
        }
        text += '\n';
      }
      output.textContent = text;
      art.classList.add('ascii-ready');
    } catch (_) { /* Keep the original engraving when canvas is unavailable. */ }
  }
  if (image.complete && image.naturalWidth) render();
  else image.addEventListener('load', render, { once: true });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('in-view', entry.isIntersecting);
  }, { threshold: .08 });
  document.querySelectorAll('.hero-art, .service-card, .work-artifact, .process-list li').forEach(el => observer.observe(el));
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('tab-hidden', document.hidden));
})();
