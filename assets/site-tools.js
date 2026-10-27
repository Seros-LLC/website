/* Client-side demos on seros.dev. No network requests and no storage. */
(function (root) {
  'use strict';

  var DEMO = {
    proposed: { stage: 'proposed', title: 'A request arrives', body: 'An illustrative request is organized into a draft for a person to inspect.', status: 'Draft only' },
    review: { stage: 'review', title: 'A decision is held for review', body: 'The draft would affect a customer or a consequential record. The demonstration pauses here for a person.', status: 'Waiting for a person' },
    approved: { stage: 'approved', title: 'A person approves the draft', body: 'In a real engagement, the system would continue only within its agreed scope after the configured approval.', status: 'Approved in this demonstration' },
    held: { stage: 'held', title: 'A person holds the draft', body: 'In a real engagement, a held action remains stopped until the person decides what happens next.', status: 'Held in this demonstration' }
  };
  var NOTES = {
    none: { title: 'Start with the process, not the tool.', points: ['Describe the work, its inputs, and the exceptions.'] },
    repeated: { title: 'Describe the repeated work.', points: ['Write down the repeated steps and the inputs they use.'] },
    digital: { title: 'Show where the information lives.', points: ['List the systems, handoffs, and records the work touches.'] },
    exceptions: { title: 'Bring the process and its exceptions.', points: ['List the exceptions that need a person to decide.'] },
    consequential: { title: 'Name the decision boundary.', points: ['Name what must never happen without approval.'] },
    full: { title: 'Bring the process and its exceptions.', points: ['Write down the repeated steps and the inputs they use.', 'List the exceptions that need a person to decide.', 'Name what must never happen without approval.'] }
  };

  function getDemoState(id) { return DEMO[id] || DEMO.proposed; }
  function buildFitNote(state) {
    var s = state || {};
    if (s.repeatable && s.digital && s.exceptions && s.consequential) return NOTES.full;
    if (s.exceptions) return NOTES.exceptions;
    if (s.consequential) return NOTES.consequential;
    if (s.digital) return NOTES.digital;
    if (s.repeatable) return NOTES.repeated;
    return NOTES.none;
  }

  function initDemo() {
    var host = document.getElementById('workflow-demo');
    if (!host || host.hasAttribute('data-agent-demo')) return;
    var title = host.querySelector('[data-demo-title]');
    var body = host.querySelector('[data-demo-body]');
    var status = host.querySelector('[data-demo-status]');
    function render(id) {
      // Capture before hiding the active button, which returns focus to body.
      var hadFocus = document.activeElement && host.contains(document.activeElement);
      var state = getDemoState(id);
      title.textContent = state.title;
      body.textContent = state.body;
      status.textContent = state.status;
      host.setAttribute('data-demo-state', id);
      host.querySelectorAll('[data-demo-step]').forEach(function (step) {
        var key = step.getAttribute('data-demo-step');
        var current = key === id || ((id === 'held' || id === 'approved') && key === 'resolved');
        if (current) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
      host.querySelectorAll('[data-demo-next]').forEach(function (button) { button.hidden = id !== 'proposed'; });
      host.querySelectorAll('[data-demo-choice]').forEach(function (button) { button.hidden = id !== 'review'; });
      host.querySelectorAll('[data-demo-restart]').forEach(function (button) { button.hidden = id === 'proposed'; });
      var focusTarget = host.querySelector(id === 'review' ? '[data-demo-choice="approved"]' : (id === 'approved' || id === 'held' ? '[data-demo-restart]' : '[data-demo-next]'));
      if (focusTarget && hadFocus) focusTarget.focus();
    }
    host.addEventListener('click', function (event) {
      var choice = event.target.closest('[data-demo-choice]');
      var next = event.target.closest('[data-demo-next]');
      var restart = event.target.closest('[data-demo-restart]');
      if (choice) render(choice.getAttribute('data-demo-choice'));
      else if (next) render('review');
      else if (restart) render('proposed');
    });
    render('proposed');
  }

  function initFitCheck() {
    var form = document.getElementById('workflow-fit-check');
    if (!form) return;
    var result = form.querySelector('[data-fit-result]');
    var title = result.querySelector('[data-fit-title]');
    var list = result.querySelector('[data-fit-points]');
    function update() {
      var note = buildFitNote({
        repeatable: form.elements.namedItem('fit-repeatable').checked,
        digital: form.elements.namedItem('fit-digital').checked,
        exceptions: form.elements.namedItem('fit-exceptions').checked,
        consequential: form.elements.namedItem('fit-consequential').checked
      });
      title.textContent = note.title;
      while (list.firstChild) list.removeChild(list.firstChild);
      note.points.forEach(function (point) {
        var item = document.createElement('li');
        item.textContent = point;
        list.appendChild(item);
      });
    }
    form.addEventListener('change', update);
    form.addEventListener('reset', function () { window.setTimeout(update, 0); });
    update();
  }

  root.SerosSiteTools = { getDemoState: getDemoState, buildFitNote: buildFitNote };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initDemo(); initFitCheck(); });
    else { initDemo(); initFitCheck(); }
  }
})(typeof window !== 'undefined' ? window : this);
