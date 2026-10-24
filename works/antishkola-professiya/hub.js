/* Антишкола — хаб профессий. Лёгкий UI поверх статического DOM. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── Mobile nav ── */
  var burger = $('#burger');
  if (burger) {
    burger.addEventListener('click', function () { document.body.classList.toggle('mopen'); });
    $$('#mnav a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('mopen'); });
    });
  }

  /* ── Index: filter + search ── */
  var list = $('#profList');
  if (list) {
    var profs = $$('.prof', list);
    var groups = $$('.cat-group', list);
    var filters = $$('#profFilters .filter');
    var search = $('#profSearch');
    var noRes = $('#noResults');
    var activeCat = 'all';

    function norm(s) { return (s || '').toLowerCase().replace(/ё/g, 'е').trim(); }

    function apply() {
      var q = norm(search ? search.value : '');
      var shown = 0;
      profs.forEach(function (p) {
        var okCat = activeCat === 'all' || p.getAttribute('data-cat') === activeCat;
        var okQ = !q || norm(p.getAttribute('data-name')).indexOf(q) !== -1;
        var vis = okCat && okQ;
        p.classList.toggle('hidden', !vis);
        if (vis) shown++;
      });
      // hide empty category groups
      groups.forEach(function (g) {
        var any = $$('.prof', g).some(function (p) { return !p.classList.contains('hidden'); });
        g.classList.toggle('hidden', !any);
      });
      if (noRes) noRes.style.display = shown ? 'none' : 'block';
    }

    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filters.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeCat = btn.getAttribute('data-filter');
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
  }

  /* ── Sticky mobile CTA: show after hero leaves viewport, hide over the form ── */
  var sticky = $('#stickyCta');
  var hero = $('#hero');
  var form = $('#zapis');
  if (sticky && hero && 'IntersectionObserver' in window) {
    var heroVisible = true, formVisible = false;
    var update = function () { sticky.classList.toggle('show', !heroVisible && !formVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(hero);
    if (form) new IntersectionObserver(function (e) { formVisible = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(form);
  }

  /* ── Lead form (client-side; wire to CRM/webhook in production) ── */
  var form = $('#leadForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('[name=name]');
      var contact = form.querySelector('[name=contact]');
      if (!name.value.trim() || !contact.value.trim()) {
        if (window.Motion && Motion.shake) Motion.shake(form);
        return;
      }
      var btn = form.querySelector('button[type=submit]');
      btn.textContent = 'Заявка отправлена ✓';
      btn.disabled = true;
      btn.style.opacity = '.8';
      form.querySelector('.fm-micro').textContent =
        'Спасибо! Мы напишем вам в ближайшее время, чтобы подобрать преподавателя под вашу профессию.';
    });
  }
})();
