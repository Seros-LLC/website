/* Optional, local-only planning helpers. No network requests or persistent storage. */
(function (root) {
  'use strict';
  var patterns = {
    intake: { title: 'Customer request intake', input: 'An incoming request and an agreed routing checklist.', work: 'Extract requested details, flag missing information and draft a routing suggestion.', boundary: 'A person checks sensitive details, chooses the owner and approves any customer reply.', output: 'A reviewed request with an owner and a draft response.' },
    reporting: { title: 'Weekly operations reporting', input: 'Approved exports from existing systems and agreed reporting definitions.', work: 'Reconcile records, highlight exceptions and draft a weekly summary with source references.', boundary: 'A person verifies totals and exceptions before sharing the report or making decisions.', output: 'A reviewed report with traceable sources and unresolved questions.' },
    handoff: { title: 'Sales-to-delivery handoff', input: 'An approved scope, account notes and a delivery checklist.', work: 'Prepare a handoff brief, identify missing commitments and suggest next steps.', boundary: 'The account and delivery owners confirm scope, dates and permissions before changing records.', output: 'An approved handoff brief with named owners and open items.' }
  };
  function recommendFit(clarity, systems, ownership) {
    if (!['unclear', 'defined'].includes(clarity) || !['separate', 'connected'].includes(systems) || !['missing', 'named'].includes(ownership)) return { title: 'Choose all three answers', reason: 'The guide needs process clarity, system context and an accountable owner.' };
    if (ownership === 'missing') return { title: 'Start with an internal process owner', reason: 'Rule: without a named owner, first identify who can approve scope and consequential actions. A build is not the next step.' };
    if (clarity === 'unclear') return { title: 'Consider AI strategy and readiness assessment', reason: 'Rule: an unclear process comes before integration needs. Written discovery can map the work, risks and whether simpler software is enough.' };
    if (systems === 'separate') return { title: 'Discuss custom builds and integrations', reason: 'Rule: a defined process with a named owner and disconnected systems suggests exploring integration first. AI may not be necessary.' };
    return { title: 'Discuss agentic workflow automation', reason: 'Rule: a defined process, connected systems and a named owner suggest exploring a bounded workflow with human approval. Suitability still needs discovery.' };
  }
  function getWorkflow(key) { return Object.prototype.hasOwnProperty.call(patterns, key) ? Object.assign({}, patterns[key]) : null; }
  var briefFields = [['goal', 'Goal and success check'], ['process', 'Current process and friction'], ['systems', 'Systems and data constraints'], ['approval', 'Owner and human approval boundaries'], ['scope', 'Scope, timing and open questions']];
  function buildBrief(values) {
    values = values || {};
    return 'SEROS PROJECT BRIEF\nPlanning notes, not a scope or commitment.\n\n' + briefFields.map(function (field) {
      var value = typeof values[field[0]] === 'string' ? values[field[0]].trim().slice(0, 4000) : '';
      return field[1] + '\n' + (value || 'Not yet specified');
    }).join('\n\n');
  }
  var capacityLimits = { tasks: 100000, minutes: 1440, reduction: 100, review: 100000 };
  function calculateCapacity(values) {
    values = values || {};
    var parsed = {};
    var names = { tasks: 'Tasks per week', minutes: 'Minutes per task', reduction: 'Proposed reduction', review: 'Review overhead' };
    for (var key in capacityLimits) {
      var raw = values[key];
      var number = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN);
      if (!Number.isFinite(number) || number < 0 || number > capacityLimits[key]) return { ok: false, field: key, message: names[key] + ' must be a number from 0 to ' + capacityLimits[key] + '.' };
      parsed[key] = number;
    }
    var gross = parsed.tasks * parsed.minutes * parsed.reduction / 100;
    var net = Math.max(0, gross - parsed.review);
    return { ok: true, grossMinutes: gross, netMinutes: net, netHours: net / 60, message: 'Illustration only: about ' + (net / 60).toFixed(1) + ' hours per week of net capacity after review (' + Math.round(net) + ' minutes). Not an ROI estimate or promise.' };
  }
  var api = { recommendFit: recommendFit, getWorkflow: getWorkflow, buildBrief: buildBrief, calculateCapacity: calculateCapacity };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SerosBusinessTools = api;
  if (typeof document === 'undefined') return;
  function init() {
    var page = document.querySelector('.business-tools');
    if (!page) return;
    page.querySelectorAll('[data-enhanced]').forEach(function (node) { node.hidden = false; });
    var fit = document.getElementById('fit-form');
    fit.addEventListener('submit', function (event) {
      event.preventDefault();
      var result = recommendFit(fit.elements.clarity.value, fit.elements.systems.value, fit.elements.ownership.value);
      document.getElementById('fit-output').textContent = result.title + '. ' + result.reason;
    });
    page.querySelectorAll('[data-workflow]').forEach(function (button) {
      button.addEventListener('click', function () {
        page.querySelectorAll('[data-workflow]').forEach(function (other) { other.setAttribute('aria-pressed', String(other === button)); });
        var flow = getWorkflow(button.dataset.workflow);
        document.getElementById('workflow-title').textContent = flow.title;
        ['input', 'work', 'boundary', 'output'].forEach(function (key) { document.getElementById('workflow-' + key).textContent = flow[key]; });
      });
    });
    var capacity = document.getElementById('capacity-form');
    capacity.addEventListener('submit', function (event) {
      event.preventDefault();
      var result = calculateCapacity({ tasks: capacity.elements.tasks.value, minutes: capacity.elements.minutes.value, reduction: capacity.elements.reduction.value, review: capacity.elements.review.value });
      ['tasks', 'minutes', 'reduction', 'review'].forEach(function (key) { capacity.elements[key].setAttribute('aria-invalid', String(!result.ok && result.field === key)); });
      document.getElementById('capacity-output').textContent = result.message;
      if (!result.ok) capacity.elements[result.field].focus();
    });
    var fields = {};
    briefFields.forEach(function (field) { fields[field[0]] = document.getElementById('brief-' + field[0]); });
    var output = document.getElementById('brief-output');
    var status = document.getElementById('brief-status');
    function generate() {
      var values = {};
      briefFields.forEach(function (field) { values[field[0]] = fields[field[0]].value; });
      output.value = buildBrief(values);
      return output.value;
    }
    function fallback() {
      output.focus(); output.select();
      status.textContent = 'Clipboard unavailable. Your brief is selected below. Use your device’s Copy command, or download the text file.';
    }
    document.getElementById('brief-generate').addEventListener('click', function () { generate(); status.textContent = 'Brief generated below. Review before sharing.'; output.focus(); });
    document.getElementById('brief-copy').addEventListener('click', async function () {
      var text = generate();
      try {
        if (!root.navigator || !root.navigator.clipboard || !root.navigator.clipboard.writeText) { fallback(); return; }
        await root.navigator.clipboard.writeText(text);
        status.textContent = 'Brief copied. Nothing has been sent to Seros.';
      } catch (_) { fallback(); }
    });
    document.getElementById('brief-download').addEventListener('click', function () {
      var url;
      try {
        url = URL.createObjectURL(new Blob([generate()], { type: 'text/plain;charset=utf-8' }));
        var link = document.createElement('a'); link.href = url; link.download = 'seros-project-brief.txt';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        status.textContent = 'Text download requested. Nothing has been sent to Seros.';
      } catch (_) { if (url) URL.revokeObjectURL(url); fallback(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
