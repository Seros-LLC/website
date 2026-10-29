/* Section rail: marks the section being read. Progressive enhancement only, the rail is
   plain in-page links without JavaScript. No network, no storage. */
(function () {
  'use strict';
  var rail = document.querySelector('.page-rail');
  if (!rail || !('IntersectionObserver' in window)) return;
  var links = [].slice.call(rail.querySelectorAll('a[href^="#"]'));
  var regions = links.map(function (a) {
    var heading = document.getElementById(a.getAttribute('href').slice(1));
    return heading && (heading.closest('section') || heading);
  });
  var visible = new Set();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
    });
    var current = regions.findIndex(function (r) { return r && visible.has(r); });
    if (current < 0) return;
    links.forEach(function (a, i) {
      if (i === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -55% 0px' });
  regions.forEach(function (r) { if (r) observer.observe(r); });
}());
