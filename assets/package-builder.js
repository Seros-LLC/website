/* /packages: assemble an engagement package and send it as a discovery-call request.
   No network calls and no storage: the visitor's text leaves the browser only in the
   email they choose to send. The pure functions (buildSummary, buildMailto,
   buildPlainText) are exported on window.SerosPackageBuilder and tested by
   tools/test_package_builder.mjs without a DOM. */
(function (root) {
  'use strict';

  var TO = 'team@seros.dev';
  var MAX_MAILTO = 1800;
  var WIDTH = 78;
  var CRLF = '\r\n';
  var LIMITS = { org: 60, systems: 200, process: 1200 };

  // Offer names are fixed by business/CLAIMS-RULES.md; descriptions reuse /services wording.
  var CATALOG = {
    assessment: {
      name: 'AI strategy and readiness assessment',
      description: 'Fixed-fee. A written assessment of where AI and agents pay off, where ' +
        'they do not, and a sequenced plan. You own the document.'
    },
    discovery: {
      name: 'Build discovery',
      description: 'A short paid engagement that ends in a specification, a fixed price ' +
        'and an explicit list of what is out of scope.'
    },
    workflow: {
      name: 'Agentic workflow automation',
      description: 'AI agents that carry out multi-step work across your tools, with a ' +
        'record of every action and a person approving anything consequential.'
    },
    crm: {
      name: 'AI-native custom CRM',
      description: 'A CRM shaped to how you sell and serve. AI drafts follow-ups, ' +
        'summarises accounts and flags stalled deals.'
    },
    custom: {
      name: 'Custom builds and integrations',
      description: 'Internal tools, portals and the integrations that join your systems ' +
        'so a fact is entered once.'
    },
    retainer: {
      name: 'Advisory retainer',
      description: 'A monthly allowance of senior hours for AI strategy, vendor evaluation ' +
        'and review. Month to month.'
    },
    care: {
      name: 'Care plan',
      description: 'A monthly retainer after delivery: updates, monitoring of agent ' +
        'behaviour and cost, a named contact and change hours.'
    }
  };

  var STARTS = {
    assess: 'We want to know where AI pays off',
    build: 'We know what we want built',
    support: 'We have a system and need it looked after'
  };
  var BUILD_ORDER = ['workflow', 'crm', 'custom'];
  var SUPPORT_ORDER = ['retainer', 'care'];
  var SIZES = {
    '1-10': '1-10 people', '11-50': '11-50 people', '51-200': '51-200 people',
    '201-1000': '201-1,000 people', '1000+': 'More than 1,000 people'
  };
  var TIMELINES = {
    exploring: 'Exploring, no date yet', quarter: 'This quarter',
    half: 'Within six months', deadline: 'A real deadline (details below)'
  };

  var EMPTY_MESSAGE = 'Choose a starting point or a service to see your package.';
  var FILLED_MESSAGE = 'In the order the work would run:';
  var FIRST_STEP = 'First step: a free discovery call, thirty minutes. You describe the ' +
    'problem; we say whether we are the right people to solve it.';
  var NOTES = [
    'Agents propose, draft and prepare. A person approves every consequential step: ' +
      'anything that moves money, contacts a customer or changes a record of consequence.',
    'Fixed fees are built from our $150 per hour rate and quoted after the discovery call.',
    'Nothing here is a quotation. A binding scope and price appear only in a signed ' +
      'statement of work.'
  ];

  // ---------- text hygiene ----------

  function wellFormed(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF) {
        var d = text.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { out += text.charAt(i) + text.charAt(i + 1); i++; }
        else out += '\uFFFD';
      } else if (c >= 0xDC00 && c <= 0xDFFF) {
        out += '\uFFFD';
      } else {
        out += text.charAt(i);
      }
    }
    return out;
  }

  var BIDI = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  var LINE_BREAKS_AND_CONTROLS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g;

  // One line of text: no CR, LF or other control characters, so it cannot add a header.
  function sanitizeLine(value) {
    if (value === undefined || value === null) return '';
    return wellFormed(String(value)).replace(BIDI, '')
      .replace(LINE_BREAKS_AND_CONTROLS, ' ').replace(/\s+/g, ' ').trim();
  }

  // Multi-line text for the body only: keeps paragraph breaks, drops other controls.
  function sanitizeBlock(value) {
    if (value === undefined || value === null) return '';
    return wellFormed(String(value)).replace(BIDI, '')
      .replace(/\r\n?|[\u2028\u2029\u0085]/g, '\n')
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, ' ')
      .split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).join('\n')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  function codePoints(text) { return Array.from(text); }

  function clip(text, limit) {
    var points = codePoints(text);
    if (points.length <= limit) return { text: text, cut: false };
    return { text: points.slice(0, limit).join('').replace(/\s+$/, '') + '...', cut: true };
  }

  // Word-wrap to WIDTH UTF-16 units; words longer than a line are hard-broken by code point.
  function wrap(text, firstIndent, nextIndent) {
    var lines = [];
    var line = firstIndent;
    var fresh = true;
    text.split(' ').forEach(function (word) {
      if (!word) return;
      var sep = fresh ? '' : ' ';
      if (line.length + sep.length + word.length <= WIDTH) { line += sep + word; fresh = false; return; }
      if (!fresh) { lines.push(line); line = nextIndent; }
      codePoints(word).forEach(function (ch) {
        if (line.length + ch.length > WIDTH) { lines.push(line); line = nextIndent; }
        line += ch;
      });
      fresh = false;
    });
    if (!fresh) lines.push(line);
    return lines.length ? lines : [firstIndent.replace(/\s+$/, '')];
  }

  // ---------- state ----------

  function pick(list, allowed) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function (id) {
      if (allowed.indexOf(id) === -1 || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function normalize(state) {
    var s = state && typeof state === 'object' ? state : {};
    return {
      start: Object.prototype.hasOwnProperty.call(STARTS, s.start) ? s.start : '',
      builds: pick(s.builds, BUILD_ORDER),
      support: pick(s.support, SUPPORT_ORDER),
      size: Object.prototype.hasOwnProperty.call(SIZES, s.size) ? s.size : '',
      timeline: Object.prototype.hasOwnProperty.call(TIMELINES, s.timeline) ? s.timeline : '',
      org: sanitizeLine(s.org),
      systems: sanitizeLine(s.systems),
      process: sanitizeBlock(s.process)
    };
  }

  function item(id, recommended, reason) {
    return {
      id: id, name: CATALOG[id].name, description: CATALOG[id].description,
      recommended: !!recommended, reason: reason || ''
    };
  }

  // The package in engagement order: assessment or discovery, builds, retainer, care plan.
  function buildSummary(state) {
    var s = normalize(state);
    var items = [];
    if (s.start === 'assess') {
      items.push(item('assessment', true, 'Recommended first: it tells you where AI pays off before anything is built.'));
    } else if (s.start === 'build' || s.builds.length) {
      items.push(item('discovery', s.start === 'build', s.start === 'build'
        ? 'Recommended first: it turns what you want built into a fixed scope and price.' : ''));
    }
    BUILD_ORDER.forEach(function (id) { if (s.builds.indexOf(id) !== -1) items.push(item(id)); });
    if (s.support.indexOf('retainer') !== -1) items.push(item('retainer'));
    if (s.start === 'support' || s.support.indexOf('care') !== -1) {
      items.push(item('care', s.start === 'support', s.start === 'support'
        ? 'Recommended for an existing system. We look at it on the discovery call before agreeing a plan.' : ''));
    }
    return {
      empty: items.length === 0,
      message: items.length ? FILLED_MESSAGE : EMPTY_MESSAGE,
      startLabel: s.start ? 'Starting point: ' + STARTS[s.start] : '',
      items: items,
      firstStep: FIRST_STEP,
      notes: NOTES.slice()
    };
  }

  // ---------- email ----------

  function composeBody(s, limits) {
    var summary = buildSummary(s);
    var cut = false;
    var lines = [];
    function add(text, first, next) { lines.push.apply(lines, wrap(text, first || '', next || '')); }

    lines.push('Hello Seros,', '');
    add('I would like to book a free discovery call (thirty minutes) about this package.');
    lines.push('');
    if (summary.startLabel) { add(summary.startLabel, '', '  '); lines.push(''); }
    if (summary.empty) {
      add('No services chosen yet. I would like to talk through where to start.');
    } else {
      lines.push('The package, in engagement order:');
      summary.items.forEach(function (it, i) {
        add((i + 1) + '. ' + it.name + (it.recommended ? ' (recommended first step)' : ''), '', '   ');
      });
    }

    var about = [];
    var org = clip(s.org, limits.org);
    var systems = clip(s.systems, limits.systems);
    var process = clip(s.process, limits.process);
    cut = org.cut || systems.cut || process.cut;
    if (org.text) about.push(['Company or team: ' + org.text]);
    if (s.size) about.push(['Company size: ' + SIZES[s.size]]);
    if (s.timeline) about.push(['Timeline: ' + TIMELINES[s.timeline]]);
    if (systems.text) about.push(['Systems involved: ' + systems.text]);
    if (about.length || process.text) {
      lines.push('', 'About us:');
      about.forEach(function (a) { add(a[0], '', '  '); });
      if (process.text) {
        lines.push('The process to automate:');
        process.text.split('\n').forEach(function (p) {
          if (p) add(p, '  ', '  '); else lines.push('');
        });
      }
    }
    if (cut) {
      lines.push('');
      add('[Trimmed to fit an email link. Add the rest before sending.]');
    }
    lines.push('');
    add('I understand fees are quoted after the discovery call, and that a person ' +
      'approves every consequential step an agent takes.');
    lines.push('', 'Sent from seros.dev/packages');
    return { body: lines.join(CRLF), cut: cut, org: org.text };
  }

  function subjectFor(org) {
    return sanitizeLine('Discovery call request' + (org ? ' - ' + org : ''));
  }

  function render(s, limits) {
    var composed = composeBody(s, limits);
    var subject = subjectFor(composed.org);
    return {
      href: 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(composed.body),
      subject: subject,
      body: composed.body,
      truncated: composed.cut
    };
  }

  // Shrink the free-text fields, longest-lived first, until the link fits MAX_MAILTO.
  function buildMailto(state) {
    var s = normalize(state);
    var limits = { org: LIMITS.org, systems: LIMITS.systems, process: LIMITS.process };
    var result = render(s, limits);
    ['process', 'systems', 'org'].forEach(function (field) {
      if (result.href.length <= MAX_MAILTO) return;
      var hi = Math.min(codePoints(s[field]).length, limits[field]);
      if (hi === 0) return;
      limits[field] = 0;
      var floor = render(s, limits);
      if (floor.href.length > MAX_MAILTO) { result = floor; return; }
      var lo = 0;
      hi -= 1;
      while (lo < hi) {
        var mid = Math.ceil((lo + hi) / 2);
        limits[field] = mid;
        if (render(s, limits).href.length <= MAX_MAILTO) lo = mid; else hi = mid - 1;
      }
      limits[field] = lo;
      result = render(s, limits);
    });
    return result;
  }

  // Full text for the copy button: no length cap, so nothing is trimmed.
  function buildPlainText(state) {
    var s = normalize(state);
    return 'To: ' + TO + '\n' + 'Subject: ' + subjectFor(s.org) + '\n\n' +
      composeBody(s, { org: Infinity, systems: Infinity, process: Infinity }).body.replace(/\r\n/g, '\n');
  }

  var api = {
    buildSummary: buildSummary, buildMailto: buildMailto, buildPlainText: buildPlainText,
    sanitizeLine: sanitizeLine, sanitizeBlock: sanitizeBlock, MAX_MAILTO: MAX_MAILTO
  };
  root.SerosPackageBuilder = api;

  // ---------- page wiring (progressive enhancement) ----------

  if (typeof document === 'undefined') return;
  var form = document.getElementById('package-form');
  if (!form) return;
  var message = document.getElementById('pb-message');
  var start = document.getElementById('pb-start');
  var list = document.getElementById('pb-items');
  var send = document.getElementById('pb-send');
  var copy = document.getElementById('pb-copy');
  var status = document.getElementById('pb-copy-status');
  var trimNote = document.getElementById('pb-trim-note');
  var lastKey = null;

  function readState() {
    function checked(name) {
      return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'),
        function (el) { return el.value; });
    }
    var startEl = form.querySelector('input[name="start"]:checked');
    return {
      start: startEl ? startEl.value : '',
      builds: checked('builds'),
      support: checked('support'),
      size: form.elements.size ? form.elements.size.value : '',
      timeline: form.elements.timeline ? form.elements.timeline.value : '',
      org: form.elements.org ? form.elements.org.value : '',
      systems: form.elements.systems ? form.elements.systems.value : '',
      process: form.elements.process ? form.elements.process.value : ''
    };
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  function update() {
    var state = readState();
    var summary = buildSummary(state);
    var key = summary.startLabel + '|' + summary.items.map(function (i) { return i.id; }).join(',');
    // Only touch the live region when the package changes, not on every keystroke.
    if (key !== lastKey) {
      lastKey = key;
      message.textContent = summary.message;
      start.textContent = summary.startLabel;
      start.hidden = !summary.startLabel;
      while (list.firstChild) list.removeChild(list.firstChild);
      summary.items.forEach(function (it) {
        var li = el('li', 'pb-item');
        var name = el('p', 'pb-item-name', it.name);
        if (it.recommended) {
          name.appendChild(document.createTextNode(' '));
          name.appendChild(el('span', 'pb-tag', 'Recommended first'));
        }
        li.appendChild(name);
        li.appendChild(el('p', 'pb-item-desc', it.description));
        if (it.reason) li.appendChild(el('p', 'pb-item-reason', it.reason));
        list.appendChild(li);
      });
      list.hidden = summary.empty;
    }
    var mail = buildMailto(state);
    send.setAttribute('href', mail.href);
    trimNote.hidden = !mail.truncated;
  }

  form.addEventListener('change', update);
  form.addEventListener('input', update);
  form.addEventListener('submit', function (event) { event.preventDefault(); });
  form.addEventListener('reset', function () { setTimeout(update, 0); });

  if (copy && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    copy.hidden = false;
    copy.addEventListener('click', function () {
      navigator.clipboard.writeText(buildPlainText(readState())).then(function () {
        status.textContent = 'Summary copied. Paste it into an email to ' + TO + '.';
      }, function () {
        status.textContent = 'Copy did not work in this browser. Use the email button instead.';
      });
    });
  }
  update();
}(typeof window !== 'undefined' ? window : this));
