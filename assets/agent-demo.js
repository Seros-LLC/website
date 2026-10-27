/* In-depth illustrative agent workflow demonstration.
   Entirely local: fictional sample data, no network, no storage. Nothing is sent. */
(function (root) {
  'use strict';

  var SCENARIOS = {
    invoice: {
      label: 'Supplier invoice',
      source: 'Email from accounts@northwind-supply.example',
      input: 'Hi, attached is invoice NW-4471 for the March pallet order. Total $4,820.00, due April 30. Please note our new bank details below for this payment.',
      fields: [['Vendor', 'Northwind Supply (existing vendor)'], ['Invoice', 'NW-4471'], ['Amount', '$4,820.00'], ['Due', 'April 30'], ['Matched PO', 'PO-2210, $4,820.00, received']],
      checks: [
        ['pass', 'Amount matches purchase order and goods receipt'],
        ['pass', 'Vendor is on the approved vendor list'],
        ['flag', 'Bank details differ from vendor record. Payment detail changes always need a person.'],
        ['pass', 'Within the agent\u2019s drafting scope (drafts only, never pays)']
      ],
      confidence: 'Fields extracted cleanly. One policy flag.',
      draft: 'Queue NW-4471 for payment of $4,820.00 on April 28 using the bank details already on file. Reply to Northwind asking them to confirm the new bank details by phone with a known contact before any change is made.',
      action: 'Schedule payment with existing bank details and send confirmation request'
    },
    support: {
      label: 'Customer complaint',
      source: 'Support form, order #88213',
      input: 'Second time my order arrived damaged. I want a full refund of $212 and honestly I am thinking about cancelling my subscription.',
      fields: [['Customer', 'Repeat customer, 3 years, subscription active'], ['Order', '#88213, $212.00'], ['Issue', 'Damaged on arrival (2nd occurrence)'], ['Sentiment', 'Frustrated, churn risk mentioned'], ['Policy', 'Refunds over $150 need a person']],
      checks: [
        ['pass', 'Order and prior damage report found'],
        ['flag', 'Refund of $212 exceeds the $150 automatic limit'],
        ['flag', 'Cancellation risk mentioned. Retention offers are a human decision.'],
        ['pass', 'Draft tone checked against the support style guide']
      ],
      confidence: 'Facts verified against order history. Two policy flags.',
      draft: 'I\u2019m sorry this happened again. I\u2019ve issued a full refund of $212 to your original payment method, and I\u2019ve asked our warehouse to review packing for your address. You do not need to return the damaged item.',
      action: 'Issue $212 refund and send reply'
    },
    intake: {
      label: 'New client intake',
      source: 'Website contact form',
      input: 'We are a 12-person dental practice. Front desk spends hours on recall reminders and insurance verification. Can you help? We use Dentrix.',
      fields: [['Organization', 'Dental practice, 12 staff'], ['Problem', 'Recall reminders, insurance verification'], ['Systems', 'Dentrix'], ['Data class', 'Likely PHI (health information)'], ['Fit', 'Matches a documented offering area']],
      checks: [
        ['pass', 'Inquiry is in a supported service area'],
        ['flag', 'Health data involved. A BAA and data review are required before any access.'],
        ['pass', 'No commitments, pricing or timelines in the draft'],
        ['pass', 'No patient data requested in the reply']
      ],
      confidence: 'Classification is clear. One compliance flag.',
      draft: 'Thanks for reaching out. Recall reminders and insurance verification are both areas we work in. Before we look at any systems, we would start with a free 30-minute call about how the work happens today. Please do not send any patient information by email.',
      action: 'Send reply and propose discovery call times'
    }
  };

  var STEPS = ['received', 'extracted', 'checked', 'review', 'resolved'];
  var STEP_TEXT = {
    received: { title: 'A request arrives', status: 'Step 1 of 5 / Received' },
    extracted: { title: 'The agent reads and extracts', status: 'Step 2 of 5 / Extracted' },
    checked: { title: 'Policy checks run', status: 'Step 3 of 5 / Checked' },
    review: { title: 'A decision is held for review', status: 'Step 4 of 5 / Waiting for a person' },
    approved: { title: 'A person approves the draft', status: 'Approved in this demonstration' },
    held: { title: 'A person holds the draft', status: 'Held in this demonstration' }
  };

  function getScenario(id) { return Object.prototype.hasOwnProperty.call(SCENARIOS, id) ? SCENARIOS[id] : SCENARIOS.invoice; }
  function nextStep(step) { var i = STEPS.indexOf(step); return i >= 0 && i < 3 ? STEPS[i + 1] : step; }
  function flagCount(s) { return s.checks.filter(function (c) { return c[0] === 'flag'; }).length; }
  function stamp(n) { var m = 9 * 60 + 14 + n; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function init() {
    var host = document.getElementById('workflow-demo');
    if (!host || !host.hasAttribute('data-agent-demo')) return;
    var view = host.querySelector('[data-demo-view]');
    var title = host.querySelector('[data-demo-title]');
    var status = host.querySelector('[data-demo-status]');
    var log = host.querySelector('[data-demo-log]');
    var tabs = [].slice.call(host.querySelectorAll('[data-scenario]'));
    var next = host.querySelector('[data-demo-next]');
    var choices = [].slice.call(host.querySelectorAll('[data-demo-choice]'));
    var restart = host.querySelector('[data-demo-restart]');
    var state = { scenario: 'invoice', step: 'received', edited: false, draft: null };
    var events = 0;

    function addLog(text) { var li = el('li'); li.appendChild(el('time', null, stamp(events++))); li.appendChild(document.createTextNode(' ' + text)); log.appendChild(li); log.scrollTop = log.scrollHeight; }

    function render(focus) {
      var s = getScenario(state.scenario);
      var step = state.step;
      var info = STEP_TEXT[step];
      host.setAttribute('data-demo-state', step === 'received' ? 'proposed' : step);
      title.textContent = info.title;
      status.textContent = info.status;
      host.querySelectorAll('[data-demo-step]').forEach(function (li) {
        var k = li.getAttribute('data-demo-step');
        var cur = k === step || ((step === 'approved' || step === 'held') && k === 'resolved');
        li.classList.toggle('done', STEPS.indexOf(k) < STEPS.indexOf(step === 'approved' || step === 'held' ? 'resolved' : step));
        if (cur) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      view.textContent = '';
      var msg = el('figure', 'demo-message');
      msg.appendChild(el('figcaption', null, s.source));
      msg.appendChild(el('blockquote', null, s.input));
      view.appendChild(msg);
      if (step !== 'received') {
        var dl = el('dl', 'demo-fields');
        s.fields.forEach(function (f, i) { var d = el('div'); d.style.setProperty('--i', i); d.appendChild(el('dt', null, f[0])); d.appendChild(el('dd', null, f[1])); dl.appendChild(d); });
        view.appendChild(dl);
      }
      if (['checked', 'review', 'approved', 'held'].indexOf(step) >= 0) {
        var ul = el('ul', 'demo-checks');
        s.checks.forEach(function (c, i) { var li = el('li', 'check-' + c[0]); li.style.setProperty('--i', i); li.appendChild(el('span', 'check-mark', c[0] === 'pass' ? 'OK' : '!!')); li.appendChild(el('span', null, c[1])); ul.appendChild(li); });
        view.appendChild(ul);
        view.appendChild(el('p', 'demo-confidence', s.confidence));
      }
      if (step === 'review') {
        var lab = el('label', 'demo-draft-label', 'Proposed action: ' + s.action + '. Edit the draft before deciding.');
        lab.htmlFor = 'demo-draft';
        var ta = el('textarea', 'demo-draft');
        ta.id = 'demo-draft'; ta.rows = 5; ta.value = state.draft === null ? s.draft : state.draft;
        ta.addEventListener('input', function () { state.draft = ta.value; if (!state.edited) { state.edited = true; addLog('Reviewer edited the draft.'); } });
        view.appendChild(lab); view.appendChild(ta);
        var error = el('p', 'demo-draft-error');
        error.setAttribute('role', 'alert');
        error.hidden = true;
        view.appendChild(error);
      }
      if (step === 'approved' || step === 'held') {
        var out = el('div', 'demo-outcome demo-outcome-' + step);
        out.appendChild(el('strong', null, step === 'approved' ? 'Approved' + (state.edited ? ' with edits' : '') + '. In a real engagement, the next step would depend on the approved scope and configured permissions.' : 'Held. Nothing happens until a person decides. The illustrative record shows the hold.'));
        out.appendChild(el('p', null, 'In this demonstration nothing was sent, paid or changed.'));
        if (step === 'approved') {
          var record = el('div', 'demo-approved-draft');
          record.appendChild(el('strong', null, 'Approved draft'));
          record.appendChild(el('p', null, state.draft === null ? s.draft : state.draft));
          out.appendChild(record);
        }
        view.appendChild(out);
      }
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-scenario') === state.scenario)); });
      var resolved = step === 'approved' || step === 'held';
      next.hidden = step === 'review' || resolved;
      next.firstChild.textContent = step === 'received' ? 'Read and extract ' : step === 'extracted' ? 'Run policy checks ' : 'Send draft to human review ';
      choices.forEach(function (b) { b.hidden = step !== 'review'; });
      restart.hidden = step === 'received';
      if (focus) {
        var target = step === 'review' ? host.querySelector('[data-demo-choice="approved"]') : resolved ? restart : next;
        if (target) target.focus();
      }
    }

    function reset(scenario, focus) {
      state = { scenario: scenario, step: 'received', edited: false, draft: null };
      log.textContent = ''; events = 0;
      addLog('Received: ' + getScenario(scenario).label.toLowerCase() + '.');
      render(focus);
    }

    host.addEventListener('click', function (e) {
      var hadFocus = host.contains(document.activeElement);
      var t = e.target.closest('button');
      if (!t || !host.contains(t)) return;
      var s = getScenario(state.scenario);
      if (t.hasAttribute('data-scenario')) { reset(t.getAttribute('data-scenario'), false); return; }
      if (t.hasAttribute('data-demo-next')) {
        state.step = nextStep(state.step);
        if (state.step === 'extracted') addLog('Extracted ' + s.fields.length + ' fields.');
        if (state.step === 'checked') addLog('Ran ' + s.checks.length + ' policy checks. ' + flagCount(s) + ' flagged.');
        if (state.step === 'review') addLog('Paused for human review. No action taken.');
      } else if (t.hasAttribute('data-demo-choice')) {
        if (t.getAttribute('data-demo-choice') === 'approved' && state.draft !== null && !state.draft.trim()) {
          var warning = view.querySelector('.demo-draft-error');
          warning.textContent = 'Add a draft before approving, or hold the request.';
          warning.hidden = false;
          view.querySelector('#demo-draft').focus();
          return;
        }
        state.step = t.getAttribute('data-demo-choice');
        addLog(state.step === 'approved' ? 'Person approved' + (state.edited ? ' an edited draft.' : ' the draft.') : 'Person held the draft. Stopped.');
      } else if (t.hasAttribute('data-demo-restart')) { reset(state.scenario, hadFocus); return; }
      render(hadFocus || e.detail === 0);
    });
    reset('invoice', false);
    host.querySelector('.demo-scenarios').hidden = false;
    host.querySelector('.demo-controls').hidden = false;
    host.querySelector('.demo-audit').hidden = false;
  }

  root.SerosAgentDemo = { getScenario: getScenario, nextStep: nextStep, flagCount: flagCount, scenarios: Object.keys(SCENARIOS), steps: STEPS };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
})(typeof window !== 'undefined' ? window : this);
