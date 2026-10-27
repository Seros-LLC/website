/* Offerings search and filter. Local only, no storage, no network. */
(function () {
  'use strict';
  function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').trim(); }
  function matches(text, query) {
    var words = norm(query).split(/\s+/).filter(Boolean);
    var hay = norm(text);
    return words.every(function (w) { return hay.indexOf(w) !== -1; });
  }
  if (typeof window !== 'undefined') window.SerosOfferings = { matches: matches, norm: norm };
  if (typeof document === 'undefined') return;
  function init() {
    var controls = document.querySelector('[data-offer-controls]');
    if (!controls) return;
    controls.hidden = false;
    var search = document.getElementById('offer-search');
    var area = document.getElementById('offer-area');
    var type = document.getElementById('offer-type');
    var status = document.querySelector('[data-offer-status]');
    var empty = document.querySelector('[data-offer-empty]');
    var groups = [].slice.call(document.querySelectorAll('[data-group]'));
    var total = document.querySelectorAll('[data-offer]').length;
    var timer;
    function apply() {
      var q = search.value, a = area.value, t = type.value, shown = 0;
      groups.forEach(function (g) {
        var label = g.querySelector('h2').firstChild.textContent;
        var inArea = !a || g.getAttribute('data-group') === a;
        var count = 0;
        g.querySelectorAll('[data-offer]').forEach(function (li) {
          var ok = inArea && (!t || li.getAttribute('data-unit') === t) && matches(li.textContent + ' ' + label, q);
          li.hidden = !ok;
          if (ok) count++;
        });
        g.hidden = count === 0;
        g.querySelector('[data-group-count]').textContent = count;
        shown += count;
      });
      empty.hidden = shown !== 0;
      status.textContent = shown === total ? 'Showing all ' + total + ' offerings.' : 'Showing ' + shown + ' of ' + total + ' offerings.';
    }
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
    area.addEventListener('change', apply);
    type.addEventListener('change', apply);
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
