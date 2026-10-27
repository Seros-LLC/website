/* Decorative interactions. Local only, no storage, no network. Everything is
   aria-hidden or purely visual, and stops for reduced motion or the pause toggle. */
(function () {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const still = () => reduced.matches || root.classList.contains('motion-paused') || document.hidden;
  const GLYPHS = '.:;+=*#%@ILVXCDM';
  const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
  root.classList.add('fx-ready');

  /* 1. Scroll progress rule. */
  const bar = document.createElement('div');
  bar.className = 'scroll-rule';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  let ticking = false;
  function progress() {
    ticking = false;
    const max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  progress();

  /* 2. Reveal on scroll. Content is visible without JS; only enhanced pages hide then reveal. */
  const reveal = document.querySelectorAll('.section-intro, .service-card, .process-list li, .work-artifact, .tool-invitation, .close-layout, .demo-copy');
  reveal.forEach((el, i) => { el.classList.add('reveal'); el.style.setProperty('--stagger', `${(i % 4) * 80}ms`); });
  const revealer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealer.unobserve(entry.target); }
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  reveal.forEach(el => revealer.observe(el));

  /* 3. Eyebrow decode: letters resolve from ASCII noise. Text node keeps real content for AT. */
  function decode(el) {
    if (still() || el.dataset.decoded) return;
    el.dataset.decoded = '1';
    const node = [...el.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
    if (!node) return;
    const finalText = node.textContent;
    let frame = 0;
    const total = 22;
    (function step() {
      const done = Math.floor((frame / total) * finalText.length);
      node.textContent = finalText.split('').map((c, i) => (i < done || c === ' ' ? c : pick())).join('');
      if (++frame <= total) requestAnimationFrame(step);
      else node.textContent = finalText;
    })();
  }
  const decoder = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { decode(entry.target); decoder.unobserve(entry.target); }
  }, { threshold: .6 });
  document.querySelectorAll('main .eyebrow').forEach(el => decoder.observe(el));

  /* 4. Hero sculpture: tilt toward pointer, glyph ripple on press. */
  const art = document.querySelector('.hero-art');
  const ascii = art && art.querySelector('[data-ascii]');
  if (art) {
    art.addEventListener('pointermove', e => {
      if (still() || !finePointer.matches) return;
      const r = art.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      art.style.setProperty('--tilt-x', `${(-y * 6).toFixed(2)}deg`);
      art.style.setProperty('--tilt-y', `${(x * 8).toFixed(2)}deg`);
      art.style.setProperty('--glow-x', `${((x + .5) * 100).toFixed(1)}%`);
      art.style.setProperty('--glow-y', `${((y + .5) * 100).toFixed(1)}%`);
    });
    art.addEventListener('pointerleave', () => { art.style.setProperty('--tilt-x', '0deg'); art.style.setProperty('--tilt-y', '0deg'); });
    art.addEventListener('pointerdown', e => {
      if (still() || !ascii || !ascii.textContent || e.target.closest('button')) return;
      const r = ascii.getBoundingClientRect();
      const lines = ascii.textContent.split('\n');
      const cols = lines[0].length, rows = lines.length - 1;
      const cx = ((e.clientX - r.left) / r.width) * cols, cy = ((e.clientY - r.top) / r.height) * rows;
      const original = ascii.textContent;
      let radius = 0;
      (function wave() {
        radius += 2.4;
        ascii.textContent = lines.map((line, y) => line.split('').map((c, x) => {
          const d = Math.hypot((x - cx) / 2, y - cy);
          return c !== ' ' && Math.abs(d - radius) < 1.6 ? pick() : c;
        }).join('')).join('\n');
        if (radius < 40 && !still()) requestAnimationFrame(wave); else ascii.textContent = original;
      })();
    });
  }

  /* 5. Pointer glow on cards and magnetic primary buttons. */
  document.querySelectorAll('.service-card, .work-artifact, .tool-invitation, .business-tools .tool-card').forEach(card => {
    card.classList.add('glow-card');
    card.addEventListener('pointermove', e => {
      if (still()) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
  document.querySelectorAll('.btn.primary').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      if (still() || !finePointer.matches) return;
      const r = btn.getBoundingClientRect();
      btn.style.translate = `${((e.clientX - r.left) / r.width - .5) * 8}px ${((e.clientY - r.top) / r.height - .5) * 6}px`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
  });

  /* 6. Living ASCII fields: a drifting meander divider and an inscription wave in the closing band. */
  const fields = document.querySelectorAll('[data-ascii-field]');
  const visible = new Set();
  const fieldObserver = new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
  });
  fields.forEach(f => fieldObserver.observe(f));
  const MEANDER = ['╔═╗ ', '║ ╚═', '╚══╗', '  ═╝'];
  const WAVE = ' .·:+*#';
  let pointerX = .5;
  addEventListener('pointermove', e => { pointerX = e.clientX / innerWidth; }, { passive: true });
  function drawField(el, t) {
    const cols = Math.max(20, Math.floor(el.clientWidth / 8.4));
    if (el.dataset.asciiField === 'meander') {
      const shift = Math.floor(t / 260);
      el.textContent = MEANDER.map(row => {
        let s = '';
        for (let x = 0; x < cols; x++) s += row[(x + shift) % row.length];
        return s;
      }).join('\n');
    } else {
      const rows = 7, out = [];
      for (let y = 0; y < rows; y++) {
        let s = '';
        for (let x = 0; x < cols; x++) {
          const v = Math.sin(x * .18 + t / 700 + y * .5) + Math.sin(x * .05 - t / 1300) + Math.cos((x / cols - pointerX) * 6) * .8;
          s += WAVE[Math.max(0, Math.min(WAVE.length - 1, Math.floor((v + 2.8) / 5.6 * WAVE.length)))];
        }
        out.push(s);
      }
      el.textContent = out.join('\n');
    }
  }
  fields.forEach(f => drawField(f, 0));
  let last = 0;
  (function loop(t) {
    if (t - last > 70 && !still()) { last = t; visible.forEach(f => drawField(f, t)); }
    requestAnimationFrame(loop);
  })(0);
  addEventListener('resize', () => fields.forEach(f => drawField(f, performance.now())));
})();
