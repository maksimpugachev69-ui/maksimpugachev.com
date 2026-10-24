/* home@16567f66 */
/* Home slice v2 · page logic: header over the night screens, ring stroke width, the karta phrase list (T3 state), calm fallback.
   The scenes themselves (hero loop, pinned descent, portal, ring travel) are in moves.js and need GSAP; everything here works without it. */
(function () {
  'use strict';
  var de = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var STEP_Y = [60, 380, 712, 1290];
  var H = window.MadHome = window.MadHome || {};
  H.flags = H.flags || {};
  H.marks = [];
  H.stageOn = false;
  H.portalOn = false;
  var mqNarrow = window.matchMedia('(max-width: 820px)');

  function hdrH() {
    var v = parseFloat(getComputedStyle(de).getPropertyValue('--hdr-h'));
    var h = $('.hdr');
    return (h && h.getBoundingClientRect().height) || v || 76;
  }
  H.hdrH = hdrH;

  /* ── ring stroke: a constant pen width on screen whatever the size of the pipe (pipe units = px × 1470 / height) ── */
  function ringWidths() {
    $$('.tr--hero, .tr--day, .tr--pr, .tr--pf').forEach(function (tr) {
      var r = tr.getBoundingClientRect();
      if (!r.height) return;
      var px = tr.classList.contains('tr--day') ? (mqNarrow.matches ? 2.4 : 3.4) : (mqNarrow.matches && !tr.classList.contains('tr--hero') ? 3.2 : 4.2);
      $$('.tr-ring', tr).forEach(function (el) { el.style.strokeWidth = (px * 1470 / r.height).toFixed(2) + 'px'; });
    });
    // uslugi (the ring and the ink ghost ring on the spine): an svg scaled by its width
    $$('.us__rsvg').forEach(function (svg) {
      var w = svg.getBoundingClientRect().width, vb = svg.viewBox.baseVal.width;
      if (!w || !vb) return;
      var px = svg.classList.contains('us__ghost') ? 1.8 : (svg.classList.contains('us__rsvg') ? (mqNarrow.matches ? 2.6 : 3.4) : (mqNarrow.matches ? 2.8 : 3.2));
      $$('.tr-ring', svg).forEach(function (el) { el.style.strokeWidth = (px * vb / w).toFixed(2) + 'px'; });
    });
  }
  H.ringWidths = ringWidths;

  /* ── the shared header is light; over a night screen it takes the kit's dark set (class .k-on-dark on the header element) ── */
  var hdrRaf = 0;
  function hdrSync() {
    hdrRaf = 0;
    var h = $('.hdr');
    if (!h) return;
    var y = Math.max(8, hdrH() / 2);
    function over(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return r.height > 0 && r.top <= y && r.bottom > y;
    }
    var night = over($('#hero')) || over($('#cifry')) ||
      (H.stageOn && over($('#t2')) && !H.flags.cover) ||
      (H.portalOn && over($('.kp')) && !H.flags.portalCover);
    h.classList.toggle('k-on-dark', !!night);
  }
  H.hdrSync = function () { if (!hdrRaf) hdrRaf = requestAnimationFrame(hdrSync); };
  window.addEventListener('scroll', H.hdrSync, { passive: true });
  window.addEventListener('resize', function () { H.hdrSync(); ringWidths(); });

  /* ── ring position / lit step without animation (also the calm and no-GSAP path) ── */
  function setStep(step) {
    $$('.pst__i').forEach(function (li) {
      var on = +li.getAttribute('data-step') === step;
      li.classList.toggle('on', on);
      if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }
  H.setStep = setStep;
  function ringNow(step) {
    var g = $('.tr--day .tr-ring-g');
    if (g) { if (window.gsap) window.gsap.set(g, { y: STEP_Y[step] - 712 }); else g.setAttribute('transform', 'translate(0 ' + (STEP_Y[step] - 712) + ')'); }
    $$('.tr--day .tr-ring').forEach(function (el) { el.classList.add('is-drawn'); el.style.opacity = ''; el.style.strokeDashoffset = ''; });
    setStep(step);
  }
  H.ringNow = ringNow;
  H.step = 2;

  /* ── leader: chip of the open phrase → gutter → left edge of the ring on the narrow pipe (never across text) ── */
  var ldrP = $('.ldr__p');
  function leaderGeom(li) {
    var box = $('.karta__in').getBoundingClientRect(), chip = $('.ph__chip', li), tr = $('.tr--day');
    if (!chip || !tr || !chip.getClientRects().length) return null;
    var rg = document.createRange(); rg.selectNodeContents(chip);
    var cr = rg.getBoundingClientRect(), pr = tr.getBoundingClientRect(), main = $('.karta__main').getBoundingClientRect();
    var step = +li.getAttribute('data-step'), sc = pr.height / 1470;
    var x0 = cr.right + 10 - box.left, y0 = cr.top + cr.height / 2 - box.top;
    var x1 = pr.left + 6 * sc - 4 - box.left, y1 = pr.top + STEP_Y[step] * sc - box.top;
    /* the tip stops 3 px before the outer edge of the ring's stroke (Н75: at 320 the tip lay 4 px on the ring) — the pen points
       at the ring, it does not cross it; the stroke width is in units of the drawing (viewBox 440 × 1470), sc turns it into px */
    var ring = $('.tr-ring', tr);
    if (ring && ring.getClientRects().length) {
      var rr = ring.getBoundingClientRect(), sw = (parseFloat(getComputedStyle(ring).strokeWidth) || 0) * sc;
      x1 = Math.min(x1, rr.left - sw / 2 - 3 - box.left);
    }
    var xg = (Math.max(main.right, cr.right + 12) + pr.left) / 2 - box.left, dy = y1 - y0, sg = dy < 0 ? -1 : 1;
    /* Н75: at 320 the gutter is narrower than the corner radius — the turn ran 10 px past the tip onto the pipe and came back;
       the vertical run stays ≥ 4 px left of the tip and the radius fits between them */
    xg = Math.min(xg, x1 - 4);
    var r = Math.max(2, Math.min(12, x1 - xg, Math.abs(dy) / 2));
    function f(n) { return n.toFixed(1); }
    if (Math.abs(dy) < 2 * r) return 'M' + f(x0) + ' ' + f(y0) + ' H' + f(x1) + ' M' + f(x1 - 6) + ' ' + f(y1 - 3.5) + ' L' + f(x1) + ' ' + f(y1) + ' L' + f(x1 - 6) + ' ' + f(y1 + 3.5);
    return 'M' + f(x0) + ' ' + f(y0) + ' H' + f(xg - r) + ' Q' + f(xg) + ' ' + f(y0) + ' ' + f(xg) + ' ' + f(y0 + sg * r) +
      ' V' + f(y1 - sg * r) + ' Q' + f(xg) + ' ' + f(y1) + ' ' + f(xg + r) + ' ' + f(y1) + ' H' + f(x1) +
      ' M' + f(x1 - 6) + ' ' + f(y1 - 3.5) + ' L' + f(x1) + ' ' + f(y1) + ' L' + f(x1 - 6) + ' ' + f(y1 + 3.5);
  }
  H.leaderSet = function () {
    if (!ldrP) return false;
    var li = $('.phr.is-open'), d = li ? leaderGeom(li) : null;
    ldrP.setAttribute('d', d || '');
    return !!d;
  };
  function leaderStatic() { if (H.leaderSet()) ldrP.classList.add('is-drawn'); }
  H.leaderStatic = leaderStatic;
  var ldrRaf = 0;
  function ldrFollow() { ldrRaf = 0; if (ldrP && ldrP.getAttribute('d')) H.leaderSet(); }
  window.addEventListener('scroll', function () { if (!ldrRaf) ldrRaf = requestAnimationFrame(ldrFollow); }, { passive: true });
  window.addEventListener('resize', function () { if (!ldrRaf) ldrRaf = requestAnimationFrame(ldrFollow); });

  function toStep(step) {
    H.step = step;
    if (window.MadMoves && window.MadMoves.ringTo && window.MadKit && window.MadKit.motion) window.MadMoves.ringTo(step);
    else { ringNow(step); leaderStatic(); }
  }

  /* ── karta: phrases (buttons, aria-expanded); one open at a time; the answer opens at once, the ring follows (T3) ── */
  function setOpen(li, open) {
    li.classList.toggle('is-open', open);
    var b = $('.ph__b', li);
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function onPhrase(btn) {
    var li = btn.closest('.phr');
    if (!li) return;
    if (li.classList.contains('is-open')) {
      setOpen(li, false);
      if (window.MadMoves && window.MadMoves.leaderOut && window.MadKit && window.MadKit.motion) window.MadMoves.leaderOut(); else if (ldrP) ldrP.setAttribute('d', '');
      return;
    }
    var before = btn.getBoundingClientRect().top;
    $$('.phr.is-open').forEach(function (x) { setOpen(x, false); });
    setOpen(li, true);
    var after = btn.getBoundingClientRect().top;
    var dy = after - before;
    if (dy < -1) {   // the open answer above collapsed: the button stays under the finger, but never scrolls back further than the heading of the section under the header (no blank cream above it)
      var hd = $('#h-karta'), room = hd ? Math.max(0, hdrH() + 40 - hd.getBoundingClientRect().top) : -dy;
      dy = -Math.min(-dy, room);
    }
    if (Math.abs(dy) > 1) window.scrollBy(0, dy);
    var n = li.getAttribute('data-n');
    if (H.marks.indexOf(n) < 0) H.marks.push(n);
    // the request takes the two last marked phrases, silently (Р-272, SKELETON § 6 п. 15): nothing about it is written under the button
    var ph = li.getAttribute('data-phrase');
    H.phrases = (H.phrases || []).filter(function (x) { return x !== ph; }).concat([ph]).slice(-2);
    H.phrase = H.phrases.join(' · ');
    toStep(+li.getAttribute('data-step'));
  }
  var karta = $('#karta');
  if (karta) {
    karta.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('.ph__b');
      if (b) { onPhrase(b); return; }
      var m = ev.target.closest && ev.target.closest('.karta__moreb');
      if (m) {
        var box = m.parentNode, open = !box.classList.contains('is-open');
        box.classList.toggle('is-open', open);
        m.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
    });
    karta.addEventListener('focusin', function () { if (H.reveal) H.reveal(); });
  }

  /* ── protivnik: the layer «Как это выглядит: три отчёта за один месяц» opens by its caption ── */
  var prLay = $('.pr__lay'), prBtn = prLay && $('.pr__moreb', prLay);
  if (prBtn) prBtn.addEventListener('click', function () {
    var open = !prLay.classList.contains('is-open');
    prLay.classList.toggle('is-open', open);
    prBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();   // the pinned screen below moves with the height
  });

  /* ── pochemu, risk: a layer opens by its caption (the two rules, why no cases, reports and team); #bez-kejsov opens its layer ── */
  ['pochemu', 'risk', 'ceny', 'usloviya'].forEach(function (id) {
    var s = $('#' + id);
    if (!s) return;
    s.addEventListener('click', function (ev) {
      var m = ev.target.closest && ev.target.closest('.karta__moreb');
      if (!m) return;
      var box = m.parentNode, open = !box.classList.contains('is-open');
      box.classList.toggle('is-open', open);
      m.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  });
  function openLayer(el) {
    if (!el) return;
    el.classList.add('is-open');
    var b = $('.karta__moreb', el);
    if (b) b.setAttribute('aria-expanded', 'true');
    var L = window.MadKit && window.MadKit.lenis;
    if (L && L.resize) L.resize();                       // the page got longer: the smooth scroll learns the new limit before the jump lands
  }
  function openLayerByHash() {
    var el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (!el) return;
    if (el.classList.contains('pc__lay')) openLayer(el);
    else if (el.id === 'usloviya' || el.closest('#usloviya')) { openLayer($('#usloviya .cd__lay')); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }   // #otkuda: the layer «Откуда 71 и 95» opens, the hash lands on its caption
  }
  openLayerByHash();
  window.addEventListener('hashchange', openLayerByHash);
  /* «Условия и источники ↓» and «Откуда цифры… ↓»: every link to the layer opens it (also when the hash is already there) */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href="#usloviya"], a[href="#otkuda"]');
    if (a) openLayer($('#usloviya .cd__lay'));
  }, true);                                              // capture: the layer is open before anything else (the smooth scroll included) reads the page length

  /* ── uslugi: a service opens its layer (what is included · for whom · how you pay · links) ── */
  var us = $('#uslugi');
  if (us) us.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.sv__b');
    if (!b) return;
    var li = b.parentNode, open = !li.classList.contains('is-open');
    li.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();   // the ring stands on the step line of its situation: positions are measured again
  });

  /* ── forma: FAQ is closed by the script (open without it); the left column follows the mode; the request knows the phrase of the karta,
        the step of the instrument and the service of the link; step 1 is pre-marked by the phrase the visitor opened in the karta (the default effect) ── */
  (function () {
    var sec = $('#forma');
    if (!sec) return;
    $$('details[data-fold]', sec).forEach(function (d) { d.removeAttribute('open'); });
    document.addEventListener('madopus:mode', function (e) {
      var m = e.detail && e.detail.mode;
      if (!m) return;
      sec.setAttribute('data-mode', m);
      $$('[data-for]', sec).forEach(function (n) { n.hidden = n.getAttribute('data-for') !== m; });
      var hh = $('#h-forma', sec), ht = hh && hh.getAttribute('data-h-' + m);   // heading of the view (COPY §12): the module does not reach it outside its block
      if (ht) hh.textContent = ht;
    });
    var chosen = false;                                    // the visitor himself picked a situation: the phrase no longer decides for him
    sec.addEventListener('change', function (ev) { if (ev.isTrusted && ev.target && ev.target.name === 'entry') chosen = true; });
    H.premark = function () {
      var L = window.madopusLead, radios = $$('input[name="entry"]', sec);
      if (!L || chosen || !H.marks.length || !radios.length) return;
      var r = radios[H.step >= 2 ? 1 : 0];                 // steps «реклама», «страница» → «Реклама идёт, заявок мало»; «менеджер», «подтверждение» → «Заявки есть, продаж мало»
      if (r.checked) return;
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    };
    function pick(a) {
      var L = window.madopusLead;
      if (!L || !a) return;
      var vid = a.getAttribute('data-vid');
      L.reset();
      if (vid) L.kind(vid);
      L.set('karta_phrase', H.phrase || '');
      if (vid === 'launch') L.mode('plan', true);
      else { L.mode('review', false); H.premark(); }
    }
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href="#forma"]');
      if (a) pick(a);
    });
    // the visitor scrolls to the form without a button: the same pre-mark (once per entry)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) { var L = window.madopusLead; if (L) { L.set('karta_phrase', H.phrase || ''); } H.premark(); } }, { threshold: 0.2 }).observe(sec);
  })();

  /* ── sticky bar (≤ 760, COPY §14): after the hero button has gone, hidden over #forma, while a field has focus and while another button of the page is in the window ── */
  (function () {
    var dock = $('#dock'), first = $('.hx__cta'), sec = $('#forma');
    if (!dock || !first || !('IntersectionObserver' in window)) return;
    var past = false, formSeen = false, focus = false, seen = [], phone = window.matchMedia('(max-width: 760px)');
    // wide screens: the bar does not exist; its class stays «off», so the frame does not keep a top strip for it (it would move every anchor landing by 68 px)
    function paint() { dock.classList.toggle('dock-off', !phone.matches || !past || formSeen || focus || seen.length > 0); }
    if (phone.addEventListener) phone.addEventListener('change', paint); else phone.addListener(paint);
    new IntersectionObserver(function (es) { var r = es[0].boundingClientRect; past = !es[0].isIntersecting && r.bottom < 0; paint(); }).observe(first);
    if (sec) new IntersectionObserver(function (es) { formSeen = es[0].isIntersecting; paint(); }, { threshold: 0.12 }).observe(sec);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { var i = seen.indexOf(x.target); if (x.isIntersecting && i < 0) seen.push(x.target); if (!x.isIntersecting && i >= 0) seen.splice(i, 1); });
      paint();
    }, { threshold: 0 });   // any part of a body button in the window: the bar is off (one main action per window; it never stands over, or beside, a body button)
    $$('#main .k-btn').forEach(function (b) { if (b !== first) io.observe(b); });
    document.addEventListener('focusin', function (ev) { focus = !!(ev.target.matches && ev.target.matches('input, textarea, select')); paint(); });
    document.addEventListener('focusout', function () { focus = false; paint(); });
  })();

  /* ── oplata: the red pen strikes THROUGH the text of the struck row: one stroke at the middle of each line of its text (measured from the painted lines,
        not a fixed y). 1440: the lines of «Откуда пришла» and «Контакт рабочий» (they wrap in the narrow columns of the drawing), from the first letter of the line;
        390: the lines of the card's data (date · source, the contact). The strokes are drawn in sequence by moves.js ── */
  (function () {
    var op = $('#oplata'), row = op && $('.op__r--no', op), svg = row && $('.op__st', row);
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg', mq = window.matchMedia('(max-width: 820px)');
    function lines() {
      var cells = $$(mq.matches ? '.op__c--d, .op__c--s, .op__c--p' : '.op__c--s, .op__c--p', row), g = [];
      cells.forEach(function (c) {   // one stroke per rendered line of each cell: its own left/right, y = the x-height middle of the line box (top + 0.55 × height = the x-height middle, measured on the painted glyphs)
        var rs = [], w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT, null), n;
        while ((n = w.nextNode())) {
          if (!n.nodeValue.trim()) continue;
          var r = document.createRange(); r.selectNodeContents(n);
          Array.prototype.forEach.call(r.getClientRects(), function (q) { if (q.width > 2 && q.height > 4) rs.push(q); });
        }
        rs.sort(function (a, b) { return a.top - b.top || a.left - b.left; });
        var cg = [];
        rs.forEach(function (q) {
          var y = q.top + 0.55 * q.height, l = cg[cg.length - 1];
          if (l && Math.abs(y - l.y) < 5) { l.l = Math.min(l.l, q.left); l.r = Math.max(l.r, q.right); }
          else cg.push({ y: y, l: q.left, r: q.right });
        });
        g = g.concat(cg);
      });
      return g;
    }
    H.strikeFit = function () {
      var rr = row.getBoundingClientRect(), g = lines(), hold = row.classList.contains('op__r--hold');
      if (!g.length || !rr.width || !rr.height) return;
      Array.prototype.slice.call(svg.querySelectorAll('path')).forEach(function (p) { svg.removeChild(p); });
      g.forEach(function (l) {
        var y = (l.y - rr.top) / rr.height * 100, x1 = Math.max(0, (l.l - rr.left - 1) / rr.width * 100), x2 = Math.min(100, (l.r - rr.left + 1) / rr.width * 100), dx = x2 - x1;
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('class', 'op__pn');
        p.setAttribute('pathLength', '1');
        p.setAttribute('fill', 'none');
        p.setAttribute('d', 'M' + x1.toFixed(2) + ' ' + y.toFixed(2) + ' C' + (x1 + dx * 0.3).toFixed(2) + ' ' + (y - 1).toFixed(2) + ' ' + (x1 + dx * 0.6).toFixed(2) + ' ' + (y + 1).toFixed(2) + ' ' + x2.toFixed(2) + ' ' + (y - 0.3).toFixed(2));
        if (hold) { p.style.strokeDasharray = '1 2'; p.style.strokeDashoffset = '1.001'; }
        svg.appendChild(p);
      });
    };
    function fit() { H.strikeFit(); }
    if (window.ResizeObserver) new ResizeObserver(fit).observe(row);
    window.addEventListener('load', fit);
    if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(fit); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fit); }
    fit();
  })();

  function init() {
    ringWidths();
    ringNow(2);
    if (de.classList.contains('t2-on') || de.classList.contains('kp-on')) $$('.tr--day .tr-ring').forEach(function (el) { el.classList.remove('is-drawn'); });   // the pen draws it when the sheet appears
    hdrSync();
    if (!de.classList.contains('t2-on') && !de.classList.contains('kp-on')) leaderStatic();   // calm / no scene: the leader of phrase 8 stands drawn
    if (!window.gsap) $$('.tr-ring, .hx__cap, .sc-cap').forEach(function (el) { el.classList.add(el.classList.contains('hx__cap') || el.classList.contains('sc-cap') ? 'is-on' : 'is-drawn'); });   // no GSAP: the drawing and its caption stay as the poster
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('load', function () { ringWidths(); H.hdrSync(); });

  /* ── lazy rasters (Н96, coordination chat 19.10: LCP 3,4 s — the pictures of the lower screens shared the line with the hero pipe) ──
     Below the hero the build leaves no raster address in the markup: <img data-lz-src / data-lz-srcset> and <image data-lz-href> (build.py lazy_below;
     without JS a <noscript> copy stands). A screen gets its pictures one window before it comes (IntersectionObserver, rootMargin 100 %);
     an in-page link or the hash loads its section at once (a jump never passes the screens on its way). */
  function lzOne(el) {
    var v;
    if ((v = el.getAttribute('data-lz-srcset'))) { el.setAttribute('srcset', v); el.removeAttribute('data-lz-srcset'); }
    if ((v = el.getAttribute('data-lz-src'))) { el.setAttribute('src', v); el.removeAttribute('data-lz-src'); }
    if ((v = el.getAttribute('data-lz-href'))) { el.setAttribute('href', v); el.removeAttribute('data-lz-href'); }
  }
  function eagerImgs(root) {
    root = root || document;
    if (root.matches && root.matches('[data-lz-src], [data-lz-href]')) lzOne(root);
    $$('[data-lz-src], [data-lz-href]', root).forEach(lzOne);
  }
  H.eagerImgs = eagerImgs;
  function lzHost(el) {   // its screen; a picture outside any section (the night pipes over #cifry) watches its own box — never the whole <main>
    return el.closest('section, footer') || el.closest('svg[data-lz]') || el;
  }
  (function () {
    var hosts = [];
    $$('[data-lz-src], [data-lz-href]').forEach(function (el) { var h = lzHost(el); if (hosts.indexOf(h) < 0) hosts.push(h); });
    if (!hosts.length) return;
    if (!('IntersectionObserver' in window)) { eagerImgs(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        // a report can come while the page is still getting its height (the intro cover, fonts): a box more than a window away is not «near» yet
        var r = x.boundingClientRect, vh = window.innerHeight;
        if (!x.isIntersecting || r.top > 2 * vh || r.bottom < -vh) return;
        io.unobserve(x.target); eagerImgs(x.target);
      });
    }, { rootMargin: '100% 0px 100% 0px' });
    hosts.forEach(function (h) { io.observe(h); });
  })();
  function eagerTarget(hash) {
    var t = hash && hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (t) eagerImgs(t.closest('section') || t);
  }
  window.addEventListener('hashchange', function () { eagerTarget(location.hash); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]');
    if (a && a.pathname === location.pathname) eagerTarget(a.hash);
  });
  eagerTarget(location.hash);
  window.addEventListener('beforeprint', function () { eagerImgs(); });
})();

;
/* Home slice v2 · scenes (GSAP + ScrollTrigger), S12 18.10.2026.
   T1  hero loop 10 s (walkers enter, two fall out at the break, pen draws the ring at 4 s for 1.4 s; pause button after 5 s)
   T2  pinned descent hero → karta (1440): scrubbed camera along the pipe, pen writes the step labels, then a time event —
       the ring grows (scale only) into the day sheet; 390: no pin, a portal layer, the ring grows in one 0.9 s power3.inOut beat
   T3  karta: the ring travels along the pipe to the step of the opened phrase 1.0 s sine.inOut, the pen draws it again 1.1 s
   T6  uslugi: the welded pipe is the spine of four situations, drawn top → down by scroll (veil, scrub); the ring travels to the step of the current situation 0.8 s
   T7н rezultat: one pen strikes the 29 + 5 figures without a reply (once, on entry of both fields into the window; the markup holds the end frame)
   T8  cifry: the kitchen sieve slides into the pipe 1.2 s, the new robots fall onto its mesh 0.8 s, below only people (once); #pochemu: the portrait of Maxim develops ink → b/w photo 1.2 s → colour 0.8 s, 0.3 s after the «С нами» pen (S16 Н124); risk has no move
   T9  oplata: three figures leave the base of the pipe and one by one lie down as the rules of the table rows (1.2 s per row), the manager's tick 0.4 s, one row struck by the red pen 0.9 s (once)
   T10 ceny: the ledger: 20 ticks 1.2 s, pause 1 s, +30 ticks 1.5 s, the price under the line 6 800 → 3 020 ₽ (crossfade 0.6 s), the pen underlines it 0.9 s (once)
   Only transform, opacity and stroke-dashoffset move. html.k-calm (reduced motion / calm switch) → nothing here runs. */
(function () {
  'use strict';
  var de = document.documentElement;
  var H = window.MadHome = window.MadHome || { flags: {} };
  var MM = window.MadMoves = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var STEP_Y = [60, 380, 712, 1290];
  var ldrP = $('.ldr__p'), ldrTl = null;
  function ldrKill() { if (ldrTl) ldrTl.kill(); ldrTl = null; }
  function ldrHide() { ldrKill(); if (!ldrP) return; ldrP.classList.remove('is-drawn'); ldrP.style.opacity = ''; ldrP.style.strokeDasharray = ''; ldrP.style.strokeDashoffset = ''; }
  var dayRing = $('.tr--day .tr-ring'), dayPen = null;
  function dayHide() { ldrHide(); if (dayPen) dayPen.kill(); if (dayRing) dayRing.classList.remove('is-drawn'); }
  function dayShow(pen) { if (!dayRing) return; if (dayPen) dayPen.kill(); if (pen) { dayPen = penDraw(dayRing, 1.1, 0.15, 'sine.inOut'); ldrIn(1.4); } else { dayRing.classList.add('is-drawn'); dayRing.style.strokeDashoffset = ''; ldrKill(); if (ldrP) { ldrP.style.opacity = ''; ldrP.style.strokeDasharray = ''; ldrP.style.strokeDashoffset = ''; } if (H.leaderStatic) H.leaderStatic(); } }
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  gsap.config({ autoRound: false });   // stroke-dashoffset 1 → 0 must not be rounded into a flash (pathLength 1)

  function motionOn() { return !window.MadKit || window.MadKit.motion; }
  function hdrH() { return H.hdrH ? H.hdrH() : 76; }

  /* ── pen: stroke-dashoffset of an ellipse with pathLength 1, driven through a proxy number (CSSPlugin rounds px lengths) ── */
  function penTween(ring, dur, ease, delay) {
    var o = { v: 1.001 };
    return gsap.to(o, {
      v: 0, duration: dur, delay: delay || 0, ease: ease || 'sine.inOut', immediateRender: false,
      onStart: function () { ring.classList.remove('is-drawn'); ring.style.strokeDasharray = '1 2'; ring.style.strokeDashoffset = '1.001'; },
      onUpdate: function () { ring.style.strokeDashoffset = o.v.toFixed(4); },
      onComplete: function () { ring.classList.add('is-drawn'); ring.style.strokeDashoffset = ''; ring.style.strokeDasharray = ''; }
    });
  }
  function penDraw(ring, dur, delay, ease) { return penTween(ring, dur, ease, delay); }

  /* the leader (chip → ring): drawn after the ring is in place; when the phrase changes the old one fades 0.2 s, the new one is drawn 0.9 s after the ring */
  function ldrIn(delay) {
    ldrKill(); if (!ldrP) return;
    ldrTl = gsap.timeline({ delay: delay }).add(function () { H.leaderSet(); gsap.set(ldrP, { opacity: 1 }); }).add(penTween(ldrP, 0.9, 'sine.inOut'));
  }
  function ldrSwap(T) {
    ldrKill(); if (!ldrP) return;
    ldrTl = gsap.timeline().to(ldrP, { opacity: 0, duration: 0.2, ease: 'power1.in' })
      .add(function () { H.leaderSet(); ldrP.classList.remove('is-drawn'); ldrP.style.strokeDasharray = '1 2'; ldrP.style.strokeDashoffset = '1.001'; gsap.set(ldrP, { opacity: 1 }); }, T)
      .add(penTween(ldrP, 0.9, 'sine.inOut'), T);
  }
  MM.leaderOut = function () { ldrKill(); if (ldrP) ldrTl = gsap.to(ldrP, { opacity: 0, duration: 0.2, ease: 'power1.in' }); };

  /* ── step label written by the pen: the dash grows, the cover slides off the text (transform only) ── */
  function write(lab) {
    var bar = $('i', lab), cv = $('.cv', lab);
    return gsap.timeline()
      .set(lab, { autoAlpha: 1 }, 0)
      .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power3.out' }, 0)
      .fromTo(cv, { xPercent: 0 }, { xPercent: 101, duration: 0.55, ease: 'power2.inOut' }, 0.2);
  }

  /* ── scene captions (T4 / T5 / T9, S12 18.10): the ink dash draws, the cover slides off the words (as the hero caption);
        once written it stays: .is-on is the final state, a rebuild / calm switch / pause never hides it again ── */
  H.seen = H.seen || {};
  function capOn(cap) {
    if (!cap) return;
    cap.classList.add('is-on');
    gsap.set($$('i, .cv', cap), { clearProps: 'all' });
    gsap.set(cap, { clearProps: 'opacity,visibility' });
  }
  function capFin(cap, key) { if (cap && H.seen[key]) capOn(cap); }
  function capIn(cap, key, axis) {   // → a timeline (0.4 s dash + 0.6 s cover) or null when the words were written before
    if (!cap) return null;
    if (H.seen[key]) { capOn(cap); return null; }
    H.seen[key] = true;
    var bar = $('i', cap), cv = $('.cv', cap), v = axis === 'y';
    var tl = gsap.timeline({ onComplete: function () { capOn(cap); } }).set(cap, { autoAlpha: 1 }, 0);
    tl.fromTo(bar, v ? { scaleY: 0 } : { scaleX: 0 }, v ? { scaleY: 1, duration: 0.4, ease: 'power3.out' } : { scaleX: 1, duration: 0.4, ease: 'power3.out' }, 0);
    return tl.fromTo(cv, { xPercent: 0 }, { xPercent: 101, duration: 0.6, ease: 'power2.inOut' }, 0.25);
  }

  /* ── size of the day sheet that covers a w × h window from its centre: the ring ellipse (178 × 74, −20°) scaled by k ── */
  function coverK(w, h, cx, cy) {
    var a = 20 * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), best = 0;
    [[-cx, -cy], [w - cx, -cy], [-cx, h - cy], [w - cx, h - cy]].forEach(function (p) {
      var x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c;
      best = Math.max(best, Math.sqrt(Math.pow(x / 178, 2) + Math.pow(y / 74, 2)));
    });
    return best * 1.06 + 0.2;
  }

  /* ───────────────────────── T1 · hero loop ───────────────────────── */
  function hero(desk) {
    var root = $('#hero'), svg = $('.hx__up .tr__fx'), ring = svg && $('.tr-ring', svg), btn = $('.hx__pause', root);
    if (!root || !svg || !ring) return null;
    var anims = [], userPaused = false;
    root.classList.add('is-live');
    var walkers = $$('.walker', svg), fallers = $$('.faller', svg);
    if (desk) {
      var sx = [150, 205, 128, 188, 160, 215, 140, 196, 120, 176, 208, 146], off = sx.map(function (v, i) { return 0.2 + i * (10 / 12); });
      walkers.forEach(function (g, i) {
        gsap.set(g, { x: sx[i], y: 120, scale: 1.3, autoAlpha: 0 });
        anims.push(gsap.timeline({ repeat: -1, repeatDelay: 10 - 3.4, delay: off[i] })
          .to(g, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 0)
          .to(g, { x: sx[i] + 36, y: 340, duration: 3.4, ease: 'power1.inOut' }, 0)
          .to(g, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, 3.05));
        anims.push(gsap.to($('.walker__sheet', g), { x: -275, duration: 0.8, ease: 'steps(5)', repeat: -1 }));
      });
    }
    // two fall out at the break (right and left of the lower half in 1440; both to the right and gone before the text in 390)
    var F = desk
      ? [{ s: [262, 598, 20], e: [392, 1150, 75], t: 1.6 }, { s: [96, 640, -20], e: [14, 1090, -70], t: 2.3 },
         { s: [262, 598, 20], e: [392, 1150, 75], t: 6.6 }, { s: [96, 640, -20], e: [14, 1090, -70], t: 7.3 }]
      : [{ s: [262, 598, 20], e: [385, 770, 60], t: 1.6 }, { s: [230, 640, 10], e: [372, 780, 80], t: 2.3 },
         { s: [262, 598, 20], e: [385, 770, 60], t: 6.6 }, { s: [230, 640, 10], e: [372, 780, 80], t: 7.3 }];
    fallers.forEach(function (g, i) {
      var f = F[i], dur = desk ? 1.5 : 1.2;
      gsap.set(g, { x: f.s[0], y: f.s[1], rotation: f.s[2], autoAlpha: 0 });
      anims.push(gsap.timeline({ repeat: -1, repeatDelay: 10 - (dur + 0.4), delay: f.t })
        .to(g, { autoAlpha: 1, duration: 0.15, ease: 'power1.out' }, 0)
        .to(g, { x: f.e[0], y: f.e[1], rotation: f.e[2], duration: dur, ease: 'sine.inOut' }, 0)
        .to(g, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, dur - 0.3));
    });
    // ambient layer: the whole pipe breathes (a slow push-in, 5 s there and back) — the drawing is alive while nothing else moves
    var trs = $$('.hx__up .tr, .hx__lo .tr', root);
    anims.push(gsap.fromTo(trs, { scale: 1, yPercent: 0 }, { scale: 1.03, yPercent: -0.6, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    // the pen: one red ring around the break at 4 s, 1.4 s
    anims.push(penDraw(ring, 1.4, 4, 'sine.inOut'));
    // the caption at the man: once, when the ring is drawn (5.5 s) the pen dash reaches him and the words are written; then it stays
    var cap = $('.hx__cap', root), capTl = null;
    function capOn() { if (!cap) return; cap.classList.add('is-on'); gsap.set([cap, $('i', cap), $('.cv', cap)], { clearProps: 'all' }); }
    if (cap) {
      capTl = gsap.timeline({ delay: 5, onComplete: capOn })
        .set(cap, { autoAlpha: 1 }, 0)
        .fromTo($('i', cap), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 0)
        .fromTo($('.cv', cap), { xPercent: 0 }, { xPercent: -101, duration: 0.8, ease: 'power2.inOut' }, 0.35);   // written from the dash outwards
      anims.push(capTl);
    }
    // pause control after 5 s (the loop is longer than 5 s)
    var show = gsap.delayedCall(5, function () { if (btn) btn.hidden = false; });
    function setPaused(p, byUser) {
      if (byUser) userPaused = p;
      if (byUser && p && capTl && capTl.progress() < 1) capTl.progress(1);   // stopping the motion never hides the words
      anims.forEach(function (a) { a.paused(p); });
      if (btn) {
        var label = userPaused ? btn.getAttribute('data-off') : btn.getAttribute('data-on');
        btn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
      }
    }
    function onClick() { setPaused(!userPaused, true); }
    if (btn) btn.addEventListener('click', onClick);
    var vis = ST.create({ trigger: root, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { if (!userPaused) anims.forEach(function (a) { a.paused(!self.isActive); }); } });
    return function () {
      show.kill(); vis.kill();
      if (btn) { btn.removeEventListener('click', onClick); btn.hidden = true; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', btn.getAttribute('data-on')); btn.setAttribute('title', btn.getAttribute('data-on')); }
      root.classList.remove('is-live');
      anims.forEach(function (a) { a.kill(); });
      capOn();
      ring.classList.add('is-drawn'); ring.style.strokeDashoffset = ''; ring.style.strokeDasharray = '';
      walkers.concat(fallers).concat(trs).forEach(function (g) { gsap.set(g, { clearProps: 'all' }); });
    };
  }

  /* ───────────────────────── T2 · pinned descent (1440) ───────────────────────── */
  function buildClone(box) {
    box.textContent = '';
    function p(cls, text) { var el = document.createElement('p'); el.className = cls; el.textContent = text; box.appendChild(el); }
    p('cl__h', $('#h-karta').textContent);
    p('cl__lead', $('.karta__lead').textContent);
    $$('#phrases > .phr').forEach(function (li) {
      var open = li.classList.contains('is-open');
      var r = document.createElement('p'); r.className = 'cl__r' + (open ? ' cl__r--open' : ''); r.textContent = $('.ph__b', li).textContent; box.appendChild(r);
      if (open) {
        var c = $('.ph__cause', li), t = $('.ph__t', li), ch = $('.ph__chip', li);
        if (ch) p('cl__chip', ch.textContent);
        if (c) p('cl__c', c.textContent);
        if (t) p('cl__t', t.textContent);
      }
    });
  }

  function stage() {
    var st = $('#t2'), camEl = $('.t2__cam', st), heroTr = $('.hx__up .tr');
    if (!st || !camEl || !heroTr) return null;
    var BASE = 1.9, labs = $$('.t2__lab', st), cap = $('.t2__cap', st), sg = $('.t2__sg', st), fill = $('.t2__fill', st),
        sring = $('.t2__ring', st), clone = $('.t2__clone', st), pipeRing = $('.tr-ring-g', camEl), pipeEl = $('.tr-ring', camEl),
        q = $('.t2__night .t2__q', st), q2 = $('.t2__q--ink', st);
    de.classList.add('t2-on');
    H.stageOn = true;
    buildClone(clone);
    dayHide();
    setPen(pipeEl, 1.001);   // the ring on the break is drawn by the pen when the camera stands there (scrubbed)
    var W, Hh, hdr, cx, cy, P0, P1, P2a, P2, P3, kF, qw, qh, q2w, q2h, qT = { x: 0, y: 0 };
    function pose(s, u, v) { return { s: s, l: cx - u * s, t: cy - v * s }; }
    function measure() {
      W = innerWidth; Hh = innerHeight; hdr = hdrH(); cx = W / 2; cy = (hdr + Hh) / 2;
      var r = heroTr.getBoundingClientRect(), s0 = r.height / 1470;
      P0 = { s: s0, l: r.left, t: hdr + (Hh - hdr - r.height) / 2 };
      P1 = pose(1.05, 175, 250); P2a = pose(1.05, 175, 400); P2 = pose(1.05, 175, 712); P3 = pose(1.9, 175, 712);
      kF = coverK(W, Hh, cx, cy);
      clone.style.top = cy + 'px';
      qw = q.offsetWidth; qh = q.offsetHeight; q2w = q2.offsetWidth; q2h = q2.offsetHeight;
      // where the ink phrase lands: the open row's words in the list inside the grown ring (same font, so at scale 1 it covers them exactly)
      var row = $('.cl__r--open', clone), rg = document.createRange();
      if (row) {   // in the sheet's own box (the stage is not pinned yet when this runs at load)
        rg.selectNodeContents(row); var b = rg.getBoundingClientRect(), sb = clone.parentNode.getBoundingClientRect();
        qT.x = b.left - sb.left; qT.y = b.top - sb.top + (b.height - q2h) / 2;
      }
    }
    measure();
    var c = { l: 0, t: 0, s: 1 }, z = { k: 0 }, sk = { k: 1.05 }, pen = { v: 1.001 };
    var setX = labs.map(function (l) { return gsap.quickSetter(l, 'x', 'px'); }), setY = labs.map(function (l) { return gsap.quickSetter(l, 'y', 'px'); });
    var capX = gsap.quickSetter(cap, 'x', 'px'), capY = gsap.quickSetter(cap, 'y', 'px'), qX = gsap.quickSetter(q, 'x', 'px'), qY = gsap.quickSetter(q, 'y', 'px');
    gsap.set([q, q2], { rotation: -20, transformOrigin: '50% 50%' });   // the words lie in the ring's own tilt (the ellipse is drawn at −20°)
    function render() {
      var k = z.k, s = c.s + (P3.s - c.s) * k, l = c.l + (P3.l - c.l) * k, t = c.t + (P3.t - c.t) * k;
      camEl.style.transform = 'translate3d(' + l + 'px,' + t + 'px,0) scale(' + (s / BASE) + ')';
      for (var i = 0; i < 3; i++) { setX[i](l + 440 * s + 12); setY[i](t + STEP_Y[i] * s - 9); }
      capX(l + 440 * s + 12); capY(t + STEP_Y[2] * s + 22);
      qX(l + 175 * s - qw / 2); qY(t + STEP_Y[2] * s - qh / 2);
    }
    function sheet() { sg.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(-20deg) scale(' + sk.k + ')'; }
    // camera: hero pose → entrance → step 2 → the break; the pen writes 1, 2, 3 on the way, then circles the break red and the open phrase
    // stands inside the ring; the caption says whose words they are (scrubbed). The phrase is the link «these words = this place of the pipe».
    var tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    tl.fromTo(c, { l: function () { return P0.l; }, t: function () { return P0.t; }, s: function () { return P0.s; } },
              { l: function () { return P1.l; }, t: function () { return P1.t; }, s: function () { return P1.s; }, duration: 1.6, onUpdate: render }, 0)
      .add(write(labs[0]), 1.1)
      .to(c, { l: function () { return P2a.l; }, t: function () { return P2a.t; }, s: function () { return P2a.s; }, duration: 1.8, onUpdate: render }, 2.0)
      .add(write(labs[1]), 3.1)
      .to(c, { l: function () { return P2.l; }, t: function () { return P2.t; }, s: function () { return P2.s; }, duration: 1.8, onUpdate: render }, 4.0)
      .add(write(labs[2]), 5.2)
      .fromTo(pen, { v: 1.001 }, { v: 0, duration: 1.0, ease: 'sine.inOut', onUpdate: function () { setPen(pipeEl, pen.v); } }, 5.4)
      .fromTo(q, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 6.0)
      .to(cap, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, 6.5)
      .to({}, { duration: 0.001 }, 9.999);
    // event (time, not scroll): the ring grows into the day sheet, the text appears on it; plays out by itself
    var T_COVER = 2.7, T_BODY = 3.0;
    var iris = gsap.timeline({ paused: true, onUpdate: state })
      .fromTo(sring, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, 0).to(pipeRing, { opacity: 0, duration: 0.2, ease: 'none' }, 0)
      .to(labs.concat([cap]), { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, 0)
      .to(z, { k: 1, duration: 1.3, ease: 'power2.inOut', onUpdate: render }, 0)
      .to(camEl, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 0.7)                                // the crowd goes before the list comes: the words stand on clean cream
      .fromTo(sk, { k: 1.05 }, { k: 3.9, duration: 1.5, ease: 'power2.inOut', onUpdate: sheet }, 0.1)   // the ring stands at 3.9: its rim clears the first letter of the heading by ≥ 16 px (2.92 touched it; 3.3 did after the list grew to five phrases and the step chip, 18.10)
      .to(fill, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0.2)
      // the phrase stays in the ring while it grows (the cream covers the night words, the ink copy takes their place), then lies down
      // as the open row of the list: the same words, now one line of «Найдите свою фразу» with its step chip under it
      .fromTo(q2, { autoAlpha: 0, x: function () { return cx - q2w / 2; }, y: function () { return cy - q2h / 2; }, rotation: -20, scale: 1.25 },
                  { autoAlpha: 1, duration: 0.3, ease: 'power1.out', immediateRender: false }, 0.45)   // one line needs the ring a little grown
      .to(q2, { x: function () { return qT.x; }, y: function () { return qT.y; }, rotation: 0, scale: 1, duration: 0.6, ease: 'power2.inOut' }, 0.95)
      .to(clone, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 1.45)                      // after the ring edge has passed the words
      .to(q2, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 1.5)                                 // hands over to the row under it (the sum of the two stays ≈ 1: no doubled words)
      .to(clone, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 2.45)   // gone before the karta body comes: a short cream breath, not two lists at two places (2.6/2.85 tried 18.10 — doubled words)
      .to(sk, { k: function () { return kF; }, duration: 1.1, ease: 'power3.inOut', onUpdate: sheet }, 2.1)
      .to({}, { duration: 0.001 }, 3.4);
    var bodyOn = false;
    function state() {
      var t = iris.time(), cover = t >= T_COVER;
      if (t >= T_BODY && !bodyOn) { bodyOn = true; dayShow(true); } else if (t < T_BODY && bodyOn) { bodyOn = false; dayHide(); }
      if (H.flags.cover !== cover) { H.flags.cover = cover; H.hdrSync(); }
      de.classList.toggle('t2-rev', t >= T_BODY);
    }
    iris.eventCallback('onReverseComplete', state);
    var on = false, last = 0;
    render(); measure(); sheet();
    var sti = ST.create({
      trigger: st, start: 'top top', end: function () { return '+=' + Math.round(innerHeight * 1.9); },
      pin: true, scrub: 0.5, animation: tl, invalidateOnRefresh: true,
      onUpdate: function (self) { sync(self.progress, false); },
      onLeave: function () { sync(1, true); },
      onRefresh: function (self) { measure(); sheet(); sync(self.progress, true); }
    });
    function sync(p, jump) {
      var jumped = jump || Math.abs(p - last) > 0.3, d = p - last;
      last = p;
      // the ring grows when the descent is nearly done (0.80, going down) and shrinks back as soon as the visitor goes up past 0.85 (so the cream sheet with its list
      // is not left standing over a blank band above the heading); between the two the direction decides, outside them the position does
      if (!on && p >= 0.80 && (p >= 0.85 || d > 0.001 || jumped)) {
        on = true;
        if (jumped) iris.progress(1); else iris.timeScale(1).play();
      } else if (on && (p < 0.80 || (p < 0.85 && d < -0.001))) {
        on = false;
        iris.timeScale(4.5).reverse();
      } else if (p >= 0.995 && on && iris.progress() < 1) {   // the pin is over: the sheet stands finished before the list scrolls on (no half-shown list)
        iris.progress(1);
      }
      H.hdrSync();
    }
    function onMeasure() { measure(); render(); sheet(); }
    ST.addEventListener('refreshInit', onMeasure);
    H.reveal = function () { on = true; iris.timeScale(6).play(); };
    sync(sti.progress, true);
    return function () {
      ST.removeEventListener('refreshInit', onMeasure);
      sti.kill(); iris.kill(); tl.kill(); dayShow(false);
      de.classList.remove('t2-on', 't2-rev');
      H.stageOn = false; H.flags.cover = false; H.reveal = null;
      sg.style.transform = '';
      camEl.style.transform = '';
      gsap.set([fill, sring, clone, cap, camEl, q, q2].concat(labs, [pipeRing]), { clearProps: 'all' });
      setPen(pipeEl, 0);
      H.hdrSync();
    };
  }

  /* ───────────────────────── T2 · 390 portal (no pin) ───────────────────────── */
  function portal() {
    var sec = $('#karta'), kp = $('.kp'), pt = kp && $('.kp__pipe .tr'), ring = pt && $('.tr-ring', pt);
    if (!kp || !ring) return null;
    var labs = $$('.kp__lab', kp), cap = $('.kp__cap', kp), sg = $('.kp__sg', kp), fill = $('.t2__fill', kp), sring = $('.t2__ring', kp), pr = $('.tr-ring-g', pt);
    de.classList.add('kp-on');
    H.portalOn = true;
    var W = kp.clientWidth, Hh = kp.clientHeight, cx = W * 0.33, cy = Hh / 2, s = pt.getBoundingClientRect().height / 1470;
    ring.classList.remove('is-drawn');
    gsap.set(ring, { strokeDashoffset: 1.001 });
    // the open phrase stands inside the ring on the break (centre of the ring's box, in its −20° tilt) until the ring grows over it
    var q = $('.kp__q', kp), rb = ring.getBoundingClientRect(), kb = kp.getBoundingClientRect();
    if (q) gsap.set(q, { x: rb.left - kb.left + rb.width / 2 - q.offsetWidth / 2, y: rb.top - kb.top + rb.height / 2 - q.offsetHeight / 2, rotation: -20, transformOrigin: '50% 50%' });
    var sk = { k: s };
    function sheet() { sg.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(-20deg) scale(' + sk.k + ')'; }
    sheet();
    dayHide();
    function reveal() { de.classList.add('kp-rev'); H.flags.portalCover = true; H.hdrSync(); dayShow(true); }
    var tl = gsap.timeline({ paused: true });
    tl.add(write(labs[0]), 0.1)
      .add(write(labs[1]), 0.65)
      .add(function () { ring.classList.remove('is-drawn'); }, 0.2)
      .add(penTween(ring, 1.2, 'sine.inOut'), 0.3)
      .to(cap, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, 1.4)
      .fromTo(q, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 1.6)
      .fromTo(sring, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' }, 2.8).to(pr, { opacity: 0, duration: 0.2, ease: 'none' }, 2.8)
      .to(labs.concat([cap]), { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 2.8)
      .to(fill, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 2.8)
      .fromTo(sk, { k: s }, { k: coverK(W, Hh, cx, cy), duration: 0.9, ease: 'power3.inOut', onUpdate: sheet }, 2.8)   // the one beat: 0.9 s
      .add(reveal, 3.72);
    var played = false;
    function play() { if (played) return; played = true; tl.play(); }
    var sti = ST.create({ trigger: sec, start: 'top 4%', once: true, onEnter: play });
    H.reveal = function () { played = true; tl.progress(1); };
    // a visitor who lands below the portal (anchor, reload) gets the sheet at once
    if (window.scrollY > sec.offsetTop + Hh * 0.6) H.reveal();
    return function () {
      sti.kill(); tl.kill(); dayShow(false);
      de.classList.remove('kp-on', 'kp-rev');
      H.portalOn = false; H.flags.portalCover = false; H.reveal = null;
      ring.classList.add('is-drawn'); ring.style.strokeDashoffset = '';
      sg.style.transform = '';
      gsap.set([fill, sring, cap, pr].concat(labs, q ? [q] : []), { clearProps: 'all' });
      H.hdrSync();
    };
  }

  /* ───────────────────────── T3 · the ring travels to the step of the opened phrase ───────────────────────── */
  var ringTl = null;
  MM.ringTo = function (step) {
    var g = $('.tr--day .tr-ring-g'), ring = $('.tr--day .tr-ring');
    if (!g || !ring) return;
    if (ringTl) ringTl.kill();
    var from = Math.round(gsap.getProperty(g, 'y')), to = STEP_Y[step] - 712;
    if (from === to) { H.setStep(step); ldrSwap(0.3); return; }
    ldrSwap(2.1);
    ringTl = gsap.timeline()
      .to(ring, { opacity: 0.35, duration: 0.2, ease: 'power1.out' }, 0)
      .to(g, { y: to, duration: 1.0, ease: 'sine.inOut' }, 0)                                        // 1.0 s along the pipe
      .add(function () { H.setStep(step); gsap.set(ring, { opacity: 1 }); }, 1.0)
      .add(penTween(ring, 1.1, 'sine.inOut'), 1.0);                                                   // the pen draws it again, 1.1 s
  };

  /* ───────────────────────── shared: the pen on a path / ellipse (pathLength 1) and the walking sheet ───────────────────────── */
  function setPen(el, v) {
    if (v <= 0.0005) { el.classList.add('is-drawn'); el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; }
    else { el.classList.remove('is-drawn'); el.style.strokeDasharray = '1 2'; el.style.strokeDashoffset = v.toFixed(4); }
  }
  function setPose(sheet, i) { sheet.setAttribute('x', String(-i * 55)); }

  /* ───────────────────────── T4 · the report sheet covers only the top of the pipe ─────────────────────────
     on entry (top of the screen at 55 % of the window): the sheet slides in 1.2 s (back.out 0.45 ≈ 3 % overshoot), three ticks by the pen
     0.4 s each, 0.6 s apart; then the loop of 10 s: 7 walk down behind the sheet, 2 fall out below its edge, the pen circles the break red.
     The 29 % stands, the text never moves. 390: the same, the sheet ¾ of the pipe (CSS). */
  function protivnik(desk) {
    var root = $('#protivnik'), svg = root && $('.tr__fx', root);
    if (!svg) return null;
    var slide = $('.pr__slide', svg), mks = $$('.pr__mk', svg), ring = $('.tr-ring', svg), btn = $('.pr__pause', root),
        walkers = $$('.walker', svg), fallers = $$('.faller', svg), cap = $('.sc-cap--pr', root), capT = null;
    var anims = [], userPaused = false, played = false, show = null, vis = null;
    root.classList.add('is-live');
    gsap.set(slide, { x: 130, autoAlpha: 0 });
    mks.forEach(function (m) { setPen(m, 1.001); });
    setPen(ring, 1.001);
    walkers.concat(fallers).forEach(function (g) { gsap.set(g, { autoAlpha: 0 }); });

    var L0 = 4.2, PERIOD = 10, WDUR = 4.4;
    function startLoop() {
      var sx = [150, 205, 128, 188, 160, 215, 140];
      walkers.forEach(function (g, i) {
        var sheet = $('.walker__sheet', g), o = { v: 0 };
        gsap.set(g, { x: sx[i], y: 110, scale: 1.3, autoAlpha: 0 });
        anims.push(gsap.timeline({ repeat: -1, repeatDelay: PERIOD - WDUR, delay: L0 + 0.2 + i * 1.3 })
          .to(g, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 0)
          .to(g, { x: sx[i] + 30, y: 690, duration: WDUR, ease: 'none' }, 0)
          .to(g, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, WDUR - 0.35));
        anims.push(gsap.to(o, { v: 5, duration: 0.8, ease: 'none', repeat: -1, onUpdate: function () { sheet.setAttribute('x', String(-(Math.floor(o.v) % 5) * 55)); } }));
      });
      var F = desk
        ? [{ s: [262, 598, 20], e: [392, 1150, 75], t: 1.6 }, { s: [96, 640, -20], e: [14, 1090, -70], t: 2.3 },
           { s: [262, 598, 20], e: [392, 1150, 75], t: 6.6 }, { s: [96, 640, -20], e: [14, 1090, -70], t: 7.3 }]
        : [{ s: [262, 598, 20], e: [385, 770, 60], t: 1.6 }, { s: [230, 640, 10], e: [372, 780, 80], t: 2.3 },
           { s: [262, 598, 20], e: [385, 770, 60], t: 6.6 }, { s: [230, 640, 10], e: [372, 780, 80], t: 7.3 }];
      fallers.forEach(function (g, i) {
        var f = F[i], dur = desk ? 1.5 : 1.2;
        gsap.set(g, { x: f.s[0], y: f.s[1], rotation: f.s[2], autoAlpha: 0 });
        anims.push(gsap.timeline({ repeat: -1, repeatDelay: PERIOD - (dur + 0.4), delay: L0 + f.t })
          .to(g, { autoAlpha: 1, duration: 0.15, ease: 'power1.out' }, 0)
          .to(g, { x: f.e[0], y: f.e[1], rotation: f.e[2], duration: dur, ease: 'sine.inOut' }, 0)
          .to(g, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, dur - 0.3));
      });
      anims.push(penDraw(ring, 1.2, L0 + 3.2, 'sine.inOut'));   // the pen circles the break once, then the ring stays
    }
    var entry = null;
    H.seen = H.seen || {};
    function play() {
      if (played) return;
      played = true;
      if (H.seen.protivnik) {   // the scene is rebuilt (breakpoint / calm switch) after the visitor saw it: the report stays filled, only the loop goes on
        gsap.set(slide, { x: 0, autoAlpha: 1 });
        mks.forEach(function (m) { setPen(m, 0); });
        H.seen['cap-pr'] = true; capOn(cap);
        startLoop();
        if (btn) btn.hidden = false;
        return;
      }
      H.seen.protivnik = true;
      entry = gsap.timeline()
        .to(slide, { x: 0, duration: 1.2, ease: 'back.out(0.45)' }, 0)
        .to(slide, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, 0);
      mks.forEach(function (m, i) { entry.add(penTween(m, 0.4, 'sine.inOut'), 1.4 + i * 1.0); });
      capT = capIn(cap, 'cap-pr', 'x');
      if (capT) entry.add(capT, 3.9);   // the pen writes the caption when the third tick is drawn (3.8 s)
      anims.push(entry);
      startLoop();
      show = gsap.delayedCall(5, function () { if (btn) btn.hidden = false; });
    }
    function setPaused(p, byUser) {
      if (byUser) userPaused = p;
      if (byUser && p && capT && capT.progress() < 1) { capT.progress(1); capT.kill(); }   // stopping the motion never hides the words
      anims.forEach(function (a) { a.paused(p); });
      if (btn) {
        var label = userPaused ? btn.getAttribute('data-off') : btn.getAttribute('data-on');
        btn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
      }
    }
    function onClick() { setPaused(!userPaused, true); }
    if (btn) btn.addEventListener('click', onClick);
    var sti = ST.create({ trigger: desk ? root : $('.pr__fig', root), start: desk ? 'top 55%' : 'top 70%', once: true, onEnter: play });   // 390 (S16 Н140): the drawing is under the 29 % now
    if (window.scrollY >= sti.start) play();
    vis = ST.create({ trigger: root, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { if (played && !userPaused) anims.forEach(function (a) { a.paused(!self.isActive); }); } });
    return function () {
      sti.kill(); vis.kill(); if (show) show.kill();
      if (btn) { btn.removeEventListener('click', onClick); btn.hidden = true; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', btn.getAttribute('data-on')); btn.setAttribute('title', btn.getAttribute('data-on')); }
      root.classList.remove('is-live');
      anims.forEach(function (a) { a.kill(); });
      gsap.set([slide].concat(walkers, fallers), { clearProps: 'all' });
      mks.forEach(function (m) { setPen(m, 0); });
      setPen(ring, 0);
      capFin(cap, 'cap-pr');
    };
  }

  /* ───────────────────────── T5 · the seam is welded (event) ─────────────────────────
     1440: the section is pinned for 1.5 windows; scroll progress p: 0–35 % the halves stand apart (the crowd drawing), 35–55 % they close
     (translateY, scrub 0.5), 40–60 % the pen draws the red seam on the rim (the only red), at 50–57 % the crowd drawing gives way to the
     clean pipe, at 60 % three figures walk down through the seam to the man (1.2 s each, time-based, they play out by themselves);
     by 80 % everything stands. A wheel that stops between 37 and 60 % plays the rest out by time (no hanging halves).
     390: no pin, on entry the same scene in 2.4 s. */
  function perelom(desk) {
    var root = $('#perelom');
    if (!root) return null;
    var up = $('.pf__u', root), lo = $('.pf__l', root), brk = $('.pf__brk', root), cln = $$('.pf__cln, .pf__brg', root),
        ringG = $('.pf__ring', root), seam = $('.pf__seam', root), stat = $$('.pfs', root), walk = $$('.pfw', root), cap = $('.sc-cap--pf', root), mcap = $('.sc-cap--pfm', root), capT = null, mcapT = null, capDone = false;
    if (!up || !lo || !seam) return null;
    // the caption at the seam: written once when the seam is welded (the end of the scroll move), then it stays (also when the wheel goes back)
    function capGo(jump, delay) {
      if (capDone || !cap) return;
      capDone = true;
      if (jump) { H.seen['cap-pf'] = H.seen['cap-pfm'] = true; capOn(cap); capOn(mcap); return; }
      capT = capIn(cap, 'cap-pf', 'x');
      if (capT && delay) capT.delay(delay);
      mcapT = capIn(mcap, 'cap-pfm', 'x');   // «3 · менеджер» at the man when the first walker has passed the seam (1.2 s after it): whoever goes through reaches him
      if (mcapT) mcapT.delay((delay || 0) + 1.2);
    }
    var GAP = 100, YP = GAP / 1470 * 100;
    root.classList.add('is-live');
    gsap.set(up, { yPercent: -YP }); gsap.set(lo, { yPercent: YP }); gsap.set(ringG, { y: GAP });
    gsap.set(brk, { opacity: 1 }); gsap.set(cln, { opacity: 0 });
    setPen(seam, 1.001);
    var ws = walk.map(function (g) {
      var m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform') || '') || [0, 0, 0];
      var fr = (g.getAttribute('data-from') || '0 0').split(' ').map(Number);
      return { g: g, to: [+m[1], +m[2]], fr: fr, sheet: $('.walker__sheet', g), p0: +g.getAttribute('data-pose0'), p1: +g.getAttribute('data-pose') };
    }).sort(function (a, b) { return b.fr[1] - a.fr[1]; });   // the lowest one leaves first
    var fig = stat.concat(walk);
    gsap.set(fig, { autoAlpha: 0 });
    ws.forEach(function (o) { gsap.set(o.g, { x: o.fr[0], y: o.fr[1] }); setPose(o.sheet, o.p0); });

    // the scrubbed part: positions of the closing, p = time (0 … 0.6)
    var pen = { v: 1.001 };
    var tl = gsap.timeline({ paused: true })
      .to(up, { yPercent: 0, duration: 0.2, ease: 'sine.inOut' }, 0.35)
      .to(lo, { yPercent: 0, duration: 0.2, ease: 'sine.inOut' }, 0.35)
      .to(ringG, { y: 0, duration: 0.2, ease: 'sine.inOut' }, 0.35)
      .fromTo(pen, { v: 1.001 }, { v: 0, duration: 0.2, ease: 'sine.inOut', immediateRender: false, onUpdate: function () { setPen(seam, pen.v); } }, 0.4)
      .to(cln, { opacity: 1, duration: 0.04, ease: 'none' }, 0.5)
      .to(brk, { opacity: 0, duration: 0.04, ease: 'none' }, 0.53)
      .to(fig, { autoAlpha: 1, duration: 0.04, ease: 'none' }, 0.56);
    // the time part: three figures through the seam
    var W = gsap.timeline({ paused: true });
    ws.forEach(function (o, i) {
      W.to(o.g, { x: o.to[0], y: o.to[1], duration: 1.2, ease: 'sine.inOut', onUpdate: function () {
        var pr = this.progress();
        setPose(o.sheet, pr <= 0 ? o.p0 : (pr >= 1 ? o.p1 : Math.floor(pr * 7.5) % 5));
      } }, i * 0.4);
    });
    function enter() {   // (1.0 s closing + 1.4 s walk) = 2.4 s on 390
      gsap.to(tl, { time: 0.6, duration: 1.0, ease: 'none', overwrite: true });
      W.timeScale(1.43); gsap.delayedCall(1.0, function () { W.play(); });
      capGo(false, 1.0);   // the seam is drawn at ≈ 1.0 s
    }
    var undo;
    if (desk) {
      var walking = false, forced = false, forcedAt = 0, idle = null;
      var go = function (t, d) { if (d) tl.time(t); else gsap.to(tl, { time: t, duration: 0.5, ease: 'none', overwrite: true }); };
      var drive = function (p, jump) {
        var target = Math.min(p, 0.6);
        if (forced && Math.abs(p - forcedAt) < 0.08 && target < 0.6) target = 0.6; else forced = false;
        go(target, jump);
        if (target >= 0.6 - 1e-6) capGo(jump, 0.5);
        var now = forced || p >= 0.6;
        if (now && !walking) { walking = true; W.timeScale(1).play(); }
        else if (!now && p < 0.57 && walking) { walking = false; W.timeScale(3).reverse(); }
      };
      var sti = ST.create({
        trigger: root, start: 'top top', end: function () { return '+=' + Math.round(innerHeight * 1.5); },
        pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          drive(self.progress, false);
          clearTimeout(idle);
          idle = setTimeout(function () {   // the wheel stopped inside the closing: it plays out
            var p = self.progress;
            if (p > 0.37 && p < 0.6) { forced = true; forcedAt = p; var rest = 1.4 * (0.6 - tl.time()) / 0.25; gsap.to(tl, { time: 0.6, duration: rest, ease: 'sine.inOut', overwrite: true }); walking = true; W.timeScale(1).play(); capGo(false, rest); }
          }, 450);
        },
        onRefresh: function (self) { drive(self.progress, true); }
      });
      undo = function () { clearTimeout(idle); sti.kill(); };
    } else {
      var played = false;
      var st2 = ST.create({ trigger: root, start: 'top 32%', once: true, onEnter: function () { if (!played) { played = true; enter(); } } });
      if (window.scrollY >= st2.start) { played = true; tl.time(0.6); W.progress(1); capGo(true); }
      undo = function () { st2.kill(); };
    }
    return function () {
      undo(); tl.kill(); W.kill();
      root.classList.remove('is-live');
      gsap.set([up, lo, brk].concat(cln), { clearProps: 'all' });
      gsap.set(ringG, { y: 0 });
      gsap.set(fig, { autoAlpha: 1 });
      ws.forEach(function (o) { gsap.set(o.g, { x: o.to[0], y: o.to[1] }); setPose(o.sheet, o.p1); });
      setPen(seam, 0);
      if (capT) capT.kill();
      if (mcapT) mcapT.kill();
      capFin(cap, 'cap-pf'); capFin(mcap, 'cap-pfm');
    };
  }

  /* ───────────────────────── T6 · the welded pipe is the spine of the situations ─────────────────────────
     scroll: a veil (ground colour, transform only) slides off the spine column top → down, scrub 0.4; the red ring stands at the step
     of the situation whose heading crosses the reading line (55 % of the window) and travels there in 0.8 s sine.inOut; the pen draws
     it once on entry (1.1 s); the step of the phrase chosen on the karta carries an ink ghost ring from the start (drawn 0.8 s on entry).
     Without a wheel nothing hangs: the ring always stands on a step. 390: the same, the column is 84 px. */
  function uslugi(desk) {
    var root = $('#uslugi');
    if (!root) return null;
    var box = $('.us__sits', root), sits = $$('.us__s', root), veil = $('.us__veil i', root), rs = $('.us__rs', root), gh = $('.us__ghost', root);
    if (!box || !sits.length || !veil || !rs) return null;
    var rr = $('.tr-ring', rs), gr = $('.tr-ring', gh), cur = 0, mine = -2, O = [], ringTw = null, trig = [], ghostPen = null, penIn = null;
    root.classList.add('is-live');
    function ctr(i) { var r = $('.us__n', sits[i]).getBoundingClientRect(); return r.top + r.height / 2; }
    function measure() { var c0 = ctr(0); O = sits.map(function (_, i) { return ctr(i) - c0; }); }
    function place() { gsap.set(rs, { y: O[cur] }); if (mine >= 0) gsap.set(gh, { y: O[mine] }); }
    measure();
    function setCur(i) {
      if (i === cur) return;
      sits[cur].classList.remove('is-cur'); sits[i].classList.add('is-cur'); cur = i;
      if (ringTw) ringTw.kill();
      ringTw = gsap.to(rs, { y: O[i], duration: 0.8, ease: 'sine.inOut', overwrite: true });
    }
    function markMine(pen) {
      var n = (H.marks && H.marks.length) ? Math.min(H.step, 2) : -1;
      if (n === mine) return;
      mine = n;
      sits.forEach(function (s, i) { s.classList.toggle('is-mine', i === n); });
      if (ghostPen) ghostPen.kill();
      if (n < 0) { gh.classList.remove('is-on'); return; }
      gh.classList.add('is-on');
      if (H.ringWidths) H.ringWidths();
      gsap.set(gh, { y: O[n] });
      if (pen) { setPen(gr, 1.001); ghostPen = penDraw(gr, 0.8, 0.2, 'sine.inOut'); } else setPen(gr, 0);
    }
    var sc = gsap.fromTo(veil, { y: 0 }, {
      y: function () { return box.offsetHeight + 64; }, ease: 'none', immediateRender: true,
      scrollTrigger: { trigger: box, start: 'top 80%', end: 'bottom 62%', scrub: 0.4, invalidateOnRefresh: true }
    });
    sits.forEach(function (s, i) {
      trig.push(ST.create({ trigger: s, start: 'top+=40 55%', end: 'bottom+=40 55%', onToggle: function (self) { if (self.isActive) setCur(i); } }));
    });
    var entered = false;
    function enter() { if (entered) return; entered = true; measure(); place(); penIn = penDraw(rr, 1.1, 0, 'sine.inOut'); }
    var sti = ST.create({ trigger: box, start: 'top 75%', onEnter: function () { markMine(true); enter(); }, onEnterBack: function () { markMine(true); } });
    if (window.scrollY >= sti.start) { markMine(true); enter(); }
    function onRefresh() { measure(); place(); }
    ST.addEventListener('refresh', onRefresh);
    markMine(false);
    return function () {
      ST.removeEventListener('refresh', onRefresh);
      sti.kill(); trig.forEach(function (t) { t.kill(); });
      if (sc.scrollTrigger) sc.scrollTrigger.kill(); sc.kill();
      if (ringTw) ringTw.kill(); if (ghostPen) ghostPen.kill(); if (penIn) penIn.kill();
      root.classList.remove('is-live');
      gsap.set([veil, rs, gh], { clearProps: 'all' });
      sits.forEach(function (s, i) { s.classList.toggle('is-cur', i === 0); });
      cur = 0; mine = -2;
      setPen(rr, 0);
      if (gr) setPen(gr, 0);
    };
  }

  /* ───────────────────────── Т7н · one pen strikes the figures without a reply (once) ─────────────────────────
     DESIGN §0.38, Maxim's «ок» 21.10.2026. Two fields of 100 figures, «Рынок» (29 struck) and «С нами» (5). One pen goes in reading order
     (the markup order of the strokes): a stroke 0.12 s (stroke-dashoffset of a mask line along the axis of the hand stroke), a new one every 0.07 s
     (at most two at once), the figure under the stroke dims together with it (opacity of its ground-coloured cover, 0 → the CSS value: 0.65 day /
     0.5 night). Market ≈ 2.1 s, a pause 0.3 s, then «С нами» at the same step ≈ 0.4 s. Not scrubbed, no pin, no loop; the text never moves.
     START (S16 Н136, 22.10: the old single start waited for the bottom of «С нами», and by then «Рынок» was leaving the top of the window).
     The market pen starts when the market field stands in the window whole AND the «С нами» label is in view (the reader sees there is a second field);
     a window too short for both (field + label) starts it on the field alone. The «С нами» pen starts when the market pen and the pause of 0.3 s are
     done AND the «С нами» field stands in the window whole (the later of the two). A visitor who has gone past the market field before the pen started
     finds it struck (nobody watches it), and the «С нами» pen waits for its field only.
     The markup holds the END frame (all 34 strokes, the covers at their final opacity): no JS, calm mode and a visitor who arrives below the scene
     see it; the start state is set only while the scene is still ahead of the visitor. */
  function rezultat(desk) {
    var root = $('#rezultat'), svgs = root ? $$('.rz__svg', root) : [];
    if (svgs.length < 2) return null;
    var F = svgs.map(function (s) { return { svg: s, pens: $$('.rz__pn', s), cvs: $$('.rz__cv', s), tl: null, state: 0 }; });   // state: 0 armed · 1 plays · 2 done
    var mk = F[0], us = F[F.length - 1], STROKE = 0.12, STEP = 0.07, PAUSE = 0.3, armed = false, MARGIN = 8;
    var usLab = $('.rz__lab', us.svg.parentNode) || us.svg;
    function setLines(f, v) { f.pens.forEach(function (p) { setPen(p, v); }); }
    function arm() {          // the start state: nothing struck yet (the figures stand, the strokes are not drawn)
      armed = true;
      F.forEach(function (f) { setLines(f, 1.001); gsap.set(f.cvs, { opacity: 0 }); });
    }
    function finishF(f) { setLines(f, 0); gsap.set(f.cvs, { clearProps: 'opacity' }); f.state = 2; f.doneAt = gsap.ticker.time; if (f === us && H.rzEnd) H.rzEnd(); }
    function finishAll() { F.forEach(finishF); armed = false; }
    function fullyIn(el) { var r = el.getBoundingClientRect(); return r.top >= hdrH() - 1 && r.bottom <= window.innerHeight - MARGIN; }
    function strokesOf(f, delay) {   // the pen over one field → its timeline (starts after `delay` s)
      var dim = parseFloat(getComputedStyle(f.svg).getPropertyValue('--rz-dim')) || 0.65;   // 0.65 day, 0.5 night: the figure reads at 0.35 / 0.5
      f.state = 1;
      f.tl = gsap.timeline({ delay: delay, onComplete: function () { finishF(f); evaluate(); } });   // the reader may stand still: «С нами» is judged again when the market pen ends
      f.pens.forEach(function (ln, i) {
        var at = i * STEP, o = { v: 1.001 };
        f.tl.to(o, { v: 0, duration: STROKE, ease: 'sine.inOut', onUpdate: function () { ln.style.strokeDashoffset = o.v.toFixed(4); } }, at);
        f.tl.to(f.cvs[i], { opacity: dim, duration: STROKE, ease: 'none' }, at);
      });
      return f.tl;
    }
    function evaluate() {
      if (!armed || (mk.state === 2 && us.state === 2)) return;
      var m = mk.svg.getBoundingClientRect(), u = us.svg.getBoundingClientRect(), lb = usLab.getBoundingClientRect(),
          both = lb.bottom - m.top <= window.innerHeight - hdrH() - MARGIN;   // the market field and the «С нами» label fit the window together
      if (u.bottom < hdrH()) { finishAll(); return; }                 // the scene is above the window: nobody watches the pen, the end state at once
      if (mk.state === 0) {
        if (m.top < hdrH() - 1) finishF(mk);   // gone past the market field before the pen: the field stands struck
        else if (fullyIn(mk.svg) && (!both || lb.bottom <= window.innerHeight - MARGIN)) strokesOf(mk, 0);
      }
      if (mk.state !== 0 && us.state === 0 && fullyIn(us.svg)) {      // the later of: the market pen + the pause are done, the field stands whole
        var wait = mk.state === 2 ? Math.max(0, mk.doneAt + PAUSE - gsap.ticker.time) : Math.max(0, mk.tl.duration() - mk.tl.time()) + PAUSE;
        strokesOf(us, wait);
      }
    }
    // a visitor who lands below the scene (anchor, reload) finds the end frame; one who is above or in front of it gets the pen
    var r0 = us.svg.getBoundingClientRect();
    if (r0.bottom >= hdrH()) arm(); else armed = false;
    var sti = ST.create({ trigger: root, start: 'top bottom', end: 'bottom top', onUpdate: evaluate, onRefresh: evaluate });
    if (armed) evaluate();
    H.rzPlay = function () { return F.map(function (f) { return f.tl; }); };
    // for the portrait of #pochemu (Н124): the ticker time the «С нами» pen ended; -1 while it is set to play or plays; 0 — no pen to wait for
    H.rzUsEnd = function () { return us.state === 2 ? us.doneAt : (us.state === 1 ? -1 : 0); };
    root.classList.add('is-live');
    return function () {
      sti.kill(); F.forEach(function (f) { if (f.tl) f.tl.kill(); f.tl = null; });
      H.rzPlay = null; H.rzUsEnd = null;
      root.classList.remove('is-live');
      finishAll();
    };
  }

  /* ───────────────────────── T8 · the kitchen sieve in the pipe, #cifry under «90+ из 100» (once, on entry) ─────────────────────────
     (moved from #pochemu 21.10.2026, SKELETON § 6 п. 19; the caption «Ботов ловит сито, люди идут к вам» is an HTML line under the drawing and always stands)
     entry (the middle of the picture at 72 % of the window, so the whole pipe is in view): the pipe stands as the start drawing (robots, crumpled queries and people in the flow);
     the sieve slides in by its handle 1.2 s sine.inOut (opacity 0.4 s); the people keep walking down through it, the robots and trash that
     passed before leave below the pipe; then the new robot and the crumpled query fall onto the heap 0.8 s power2.in and stay in the sieve.
     Everything stands by 3.6 s: the sieve, the robots in it, two people below. No loop, so no pause control. 390: the same. */
  function sieveScene(desk) {
    var root = $('#cifry'), fig = root && $('.cf__fig', root), sieve = fig && $('.sv__sieve', fig);
    if (!sieve) return null;
    var bots = $$('.svb', fig), ppl = $$('.svw', fig);
    function pair(g, a) { return (g.getAttribute(a) || '0 0').split(' ').map(Number); }
    function bot(k) { return $('.svb--' + k, fig); }
    var gone = bots.concat(ppl).filter(function (g) { return g.getAttribute('opacity') === '0'; });
    root.classList.add('is-live');
    var P = ppl.map(function (g) {
      var f = pair(g, 'data-from'), t = pair(g, 'data-to');
      return { g: g, f: f, t: t, sheet: $('.walker__sheet', g), p0: +g.getAttribute('data-pose0'), p1: +g.getAttribute('data-pose') };
    });
    gsap.set(sieve, { x: 340, autoAlpha: 0 });
    bots.forEach(function (g) { gsap.set(g, { x: 0, y: 0, autoAlpha: 1 }); });
    P.forEach(function (o) { gsap.set(o.g, { x: o.f[0], y: o.f[1], autoAlpha: 1 }); setPose(o.sheet, o.p0); });
    var tl = gsap.timeline({ paused: true });
    tl.to(sieve, { x: 0, duration: 1.2, ease: 'sine.inOut' }, 0).to(sieve, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' }, 0);
    // people: constant pace down the pipe (the sieve lets them through); the two who stay end at the 3rd and 4th place, the others leave at the mouth
    var dur = { p1: 2.9, p2: 3.6, p3: 1.7, p4: 1.1 };
    P.forEach(function (o) {
      var k = /svw--(\w+)/.exec(o.g.getAttribute('class'))[1], d = dur[k], leaves = o.g.getAttribute('opacity') === '0';
      tl.to(o.g, { x: o.t[0], y: o.t[1], duration: d, ease: 'none', onUpdate: function () {
        var pr = this.progress();
        setPose(o.sheet, pr >= 1 ? o.p1 : Math.floor(pr * d * 6) % 5);   // six poses a second
      } }, 0);
      if (leaves) tl.to(o.g, { autoAlpha: 0, duration: 0.4, ease: 'power1.in' }, d - 0.4);
    });
    // what passed before the sieve came: leaves below the pipe
    [['bc', 2.9], ['t2', 2.7], ['det', 1.1]].forEach(function (b) {
      var g = bot(b[0]), t = pair(g, 'data-to');
      tl.to(g, { y: t[1], duration: b[1], ease: 'none' }, 0).to(g, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, b[1] - 0.5);
    });
    // the new ones: drift, then fall onto the heap and stay (the query is the same crumpled one that lies drawn in the heap: it gives way to it)
    var A = bot('a'), T = bot('t1'), ta = pair(A, 'data-to'), tt = pair(T, 'data-to');
    tl.to(A, { y: 14, duration: 1.2, ease: 'none' }, 0).to(A, { x: ta[0], y: ta[1], duration: 0.8, ease: 'power2.in' }, 1.2);
    tl.to(T, { y: 12, duration: 1.2, ease: 'none' }, 0).to(T, { x: tt[0], y: tt[1], duration: 0.8, ease: 'power2.in' }, 1.2)
      .to(T, { autoAlpha: 0, duration: 0.25, ease: 'power1.out' }, 2.0);
    tl.to({}, { duration: 0.001 }, 3.6);
    var played = false;
    function play() { if (played) return; played = true; tl.play(); }
    H.sieveDone = function () { return tl.progress() >= 1; };                 // the seam (Н125) waits for the scene
    tl.eventCallback('onComplete', function () { if (H.seamApply) H.seamApply(); });
    var sti = ST.create({ trigger: fig, start: 'center 72%', once: true, onEnter: play });
    if (fig.getBoundingClientRect().bottom < hdrH()) { played = true; tl.progress(1); }      // the visitor lands below the drawing: the end state stands
    return function () {
      sti.kill(); tl.kill(); H.sieveDone = null;
      root.classList.remove('is-live');
      gsap.set(sieve, { clearProps: 'all' });
      bots.forEach(function (g) { var t = pair(g, 'data-to'); gsap.set(g, { x: t[0], y: t[1], autoAlpha: gone.indexOf(g) >= 0 ? 0 : 1 }); });
      P.forEach(function (o) { gsap.set(o.g, { x: o.t[0], y: o.t[1], autoAlpha: gone.indexOf(o.g) >= 0 ? 0 : 1 }); setPose(o.sheet, o.p1); });
    };
  }

  /* ───────────────────────── T9 · oplata: the people of the pipe become the rows of the table (once, on entry) ─────────────────────────
     money screen: readable motion only. The markup holds the END state (three rows, one struck); this sets the start state and plays once:
     row i = 1.2 s from t = 1.2·i: a figure leaves the base of the pipe, walks along the gap and down the margin (0.75 s), lies down as the thick rule of its row (0.3 s),
     the row's text comes in over the rule (opacity + y 0.5 s); the manager's tick 0.4 s after each row; then the red pen strikes the second row 0.9 s,
     its tick goes, «–» and «оспорена» come in. Ends at 5.4 s; nothing moves while the table is read. 390: the same, the rows are slips. */
  function oplata(desk) {
    var root = $('#oplata'), fig = root && $('.op__fig', root);
    if (!fig) return null;
    var rows = $$('.op__r', fig), figs = $$('.opw', fig), rls = rows.map(function (r) { return $('.op__rl', r); }),
        tks = rows.map(function (r) { return $('.op__tk .op__pn', r); }), tkSvg = rows.map(function (r) { return $('.op__tk', r); }),
        no = $('.op__r--no', fig), noI = rows.indexOf(no), strike = no && $('.op__st', no), dash = no && $('.op__dash', no), disp = no && $('.op__c--x > span', no);
    var tl = null, played = false, S = desk ? 0.46 : 0.5, DY = 10, mcap = $('.sc-cap--opm', fig), ocap = $('.sc-cap--op', fig);
    var sti = ST.create({ trigger: $('.op__sheet', fig), start: desk ? 'top 62%' : 'top 88%', once: true, onEnter: function () { play(); } });   // the sheet's top: all three rows are in view when the people come (62 %, not 50: at 1440 × 900 the whole sheet stands in the window before that, and the table must not wait dimmed for one more turn of the wheel)
    if (window.scrollY >= sti.start + 40) { played = true; H.seen['cap-opm'] = H.seen['cap-op'] = true; capOn(mcap); capOn(ocap); }    // the visitor arrives below the scene: the end state stands, with the captions
    root.classList.add('is-live');
    function start() {
      gsap.set(rows, { autoAlpha: 0.35, y: DY });   // never an empty sheet: the slips wait dimmed (0.35), the people bring them to full
      gsap.set(rls, { scaleX: 0 });
      tks.forEach(function (t) { setPen(t, 1.001); });
      if (strike) { no.classList.add('op__r--hold'); if (H.strikeFit) H.strikeFit(); $$('.op__pn', strike).forEach(function (p) { setPen(p, 1.001); }); }
      if (noI >= 0) gsap.set(tkSvg[noI], { display: 'block', autoAlpha: 1 });
      if (dash) gsap.set([dash, disp], { autoAlpha: 0 });
      gsap.set(figs, { transformOrigin: '0 0', autoAlpha: 0 });
    }
    if (!played) start();
    function play() {
      if (played) return;
      played = true;
      var fr = fig.getBoundingClientRect(), pb = $('.op__pipe', fig).getBoundingClientRect(), sb = $('.op__sheet', fig).getBoundingClientRect();
      var k = sb.width / 1376;
      var sx = pb.left + pb.width / 2 - fr.left, sy = pb.top + pb.height * 0.84 - fr.top;
      var gy = desk ? sb.top - fr.top + 62 * k : sb.top - fr.top + 6;
      tl = gsap.timeline();
      var mT = capIn(mcap, 'cap-opm');   // «3 · менеджер» at the man (0.85 s) while the first one walks out of his pipe: whoever leaves it has reached the manager
      if (mT) tl.add(mT, 0);
      var oT = capIn(ocap, 'cap-op');   // the scene caption under the sheet, written when the first one has become a row (1.2 s): the words name what the reader has just seen
      if (oT) tl.add(oT, 1.3);
      rows.forEach(function (r, i) {
        var rr = r.getBoundingClientRect(), g = figs[i], sheet = $('.walker__sheet', g), t0 = i * 1.2;
        var tx = rr.left - fr.left - (desk ? 12 : 11), ty = rr.bottom - fr.top - DY - 2;
        tl.set(g, { x: sx, y: sy, rotation: 0, scale: S, autoAlpha: 0 }, t0)
          .to(g, { autoAlpha: 1, duration: 0.15, ease: 'power1.out' }, t0)
          .to(g, { x: tx, y: gy, duration: 0.4, ease: 'none' }, t0)
          .to(g, { y: ty, duration: 0.35, ease: 'none' }, t0 + 0.4)
          .to({}, { duration: 0.75, onUpdate: function () { setPose(sheet, Math.floor(this.time() * 6) % 5); } }, t0)
          .to(g, { rotation: 90, duration: 0.3, ease: 'power1.in' }, t0 + 0.75)
          .to(g, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, t0 + 0.9)
          .to(r, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power1.out' }, t0 + 0.7)
          .to(rls[i], { scaleX: 1, duration: 0.5, ease: 'power2.out' }, t0 + 0.7)
          .add(penTween(tks[i], 0.4, 'sine.inOut'), t0 + 1.2);
      });
      if (strike) {
        if (H.strikeFit) H.strikeFit();
        var sp = $$('.op__pn', strike), sd = 0.9 / Math.max(1, sp.length);   // one stroke through each line of the text, in sequence, 0.9 s in all
        sp.forEach(function (p, i) { setPen(p, 1.001); tl.add(penTween(p, sd, 'sine.inOut'), 4.2 + i * sd); });
        tl.add(function () { no.classList.remove('op__r--hold'); }, 5.2);
        tl.add(function () {}, 4.2)                                                         // the tick goes while the pen strikes: a struck lead is never shown as confirmed
          .to(tkSvg[noI], { autoAlpha: 0, duration: 0.25, ease: 'power1.in' }, 4.45)
          .set(tkSvg[noI], { display: 'none' }, 4.7)
          .to([dash, disp], { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 4.75);
      }
    }
    return function () {
      sti.kill(); if (tl) tl.kill();
      capFin(mcap, 'cap-opm'); capFin(ocap, 'cap-op');
      root.classList.remove('is-live');
      gsap.set(rows.concat(rls, figs, tkSvg, dash ? [dash, disp] : []), { clearProps: 'all' });
      tks.forEach(function (t) { setPen(t, 0); });
      if (strike) { no.classList.remove('op__r--hold'); $$('.op__pn', strike).forEach(function (p) { setPen(p, 0); }); }
    };
  }

  /* ───────────────────────── T10 · ceny: the ledger counts the confirmed leads, the price of one falls (once, on entry) ─────────────────────────
     money screen: readable motion only. 0.25 s the pen appears, 20 ticks 1.2 s (the line «20 заявок» is lit, the price under the line is 6 800 ₽), pause 1 s,
     +30 ticks 1.5 s, the price changes 0.6 s (opacity crossfade of HTML text, no counter) and the lit line passes to «50 заявок» in step,
     the pen runs to the price 0.4 s and underlines «3 020 ₽» 0.9 s, stopping right of ₽. Ends at 6.45 s (the pen waits 0.6 s after the price has changed). The markup holds the END state. */
  function ceny(desk) {
    var root = $('#ceny'), fig = root && $('.ce__fig', root);
    if (!fig) return null;
    var ticks = $$('.ce__tk', fig), pen = $('.ce__pen', fig), ul = $('.ce__ul', fig), na = $('.ce__n--a', fig), nb = $('.ce__n--b', fig),
        l20 = $('.ce__l20', root), l50 = $('.ce__l50', root);
    var P = ticks.map(function (t) { return t.getAttribute('data-p').split(' ').map(Number); });
    var tip = pen.getAttribute('data-tip').split(' ').map(Number), UL = ul.getTotalLength();
    var st = ticks.map(function () { return 0; }), cur = { x: 0, y: 0 }, tl = null, played = false, o = { n: 0 };
    var sti = ST.create({ trigger: $('.ce__num', fig), start: 'bottom 92%', once: true, onEnter: function () { play(); } });   // starts only when the price line under the rule is in view (A1, 18.10): the visitor sees 6 800 → 3 020 happen
    if (window.scrollY >= sti.start + 40) played = true;
    root.classList.add('is-live');
    function place(x, y, k) {
      cur.x += (x - cur.x) * k; cur.y += (y - cur.y) * k;
      gsap.set(pen, { x: cur.x - tip[0], y: cur.y - tip[1] });
    }
    function head(n) {      // the nib: the point of the tick being written (two strokes of a tick: down, then up)
      var i = Math.min(ticks.length - 1, Math.floor(n)), f = Math.min(1, n - i), a = P[i];
      var l1 = Math.hypot(a[2] - a[0], a[3] - a[1]), l2 = Math.hypot(a[4] - a[2], a[5] - a[3]), d = f * (l1 + l2);
      return d < l1 ? [a[0] + (a[2] - a[0]) * d / l1, a[1] + (a[3] - a[1]) * d / l1] : [a[2] + (a[4] - a[2]) * (d - l1) / l2, a[3] + (a[5] - a[3]) * (d - l1) / l2];
    }
    function drawTo(n, exact) {
      for (var i = 0; i < ticks.length; i++) {
        var v = Math.max(0, Math.min(1, n - i));
        if (v !== st[i]) { st[i] = v; setPen(ticks[i], v <= 0 ? 1.001 : 1 - v); }
      }
      var h = head(n); place(h[0], h[1], exact ? 1 : 0.55);
    }
    function start() {
      ticks.forEach(function (t) { setPen(t, 1.001); });
      setPen(ul, 1.001);
      gsap.set(na, { autoAlpha: 1 }); gsap.set(nb, { autoAlpha: 0 });
      gsap.set(l50, { opacity: 0.62 });
      var h = head(0); cur.x = h[0]; cur.y = h[1]; gsap.set(pen, { x: cur.x - tip[0], y: cur.y - tip[1], autoAlpha: 0 });
    }
    if (!played) start();
    function play() {
      if (played) return;
      played = true;
      var g = { v: 0 }, u = { v: 0 }, a0, a1;
      tl = gsap.timeline();
      tl.to(pen, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' }, 0)
        .to(o, { n: 20, duration: 1.2, ease: 'none', onUpdate: function () { drawTo(o.n); }, onComplete: function () { drawTo(20, true); } }, 0.25)
        .to(o, { n: 50, duration: 1.5, ease: 'none', onUpdate: function () { drawTo(o.n); }, onComplete: function () { drawTo(50, true); } }, 2.45)
        .to(na, { autoAlpha: 0, duration: 0.6, ease: 'power1.inOut' }, 3.95)
        .to(nb, { autoAlpha: 1, duration: 0.6, ease: 'power1.inOut' }, 3.95)
        .to(l20, { opacity: 0.62, duration: 0.6, ease: 'power1.inOut' }, 3.95)
        .to(l50, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, 3.95)
        .add(function () { a0 = { x: cur.x, y: cur.y }; a1 = ul.getPointAtLength(0); }, 5.15)   // the swap ends at 4.55: the number stands clean 0.6 s before the pen comes to it
        .to(g, { v: 1, duration: 0.4, ease: 'sine.inOut', onUpdate: function () { cur.x = a0.x + (a1.x - a0.x) * g.v; cur.y = a0.y + (a1.y - a0.y) * g.v; gsap.set(pen, { x: cur.x - tip[0], y: cur.y - tip[1] }); } }, 5.15)
        .to(u, { v: 1, duration: 0.9, ease: 'sine.inOut', onUpdate: function () {
          var p = ul.getPointAtLength(u.v * UL), e1 = ul.getPointAtLength(UL);
          setPen(ul, u.v >= 1 ? 0 : Math.max(0.0006, 1 - u.v));
          cur.x = p.x + u.v * (tip[0] - e1.x); cur.y = p.y + u.v * (tip[1] - e1.y);
          gsap.set(pen, { x: cur.x - tip[0], y: cur.y - tip[1] });
        } }, 5.55);
    }
    return function () {
      sti.kill(); if (tl) tl.kill();
      root.classList.remove('is-live');
      gsap.set([pen, na, nb, l20, l50], { clearProps: 'all' });
      ticks.forEach(function (t) { setPen(t, 0); });
      setPen(ul, 0);
    };
  }

  /* ───────────────────────── T8p · the portrait of Maxim develops after the «С нами» pen (S16 Н124, motion-critic 21.10) ─────────────────────────
     The page plays the kit's drawing → photo itself (the figure carries .k-dp--scrub, so kit.js leaves it alone; the CSS default of the figure is the
     start frame: the ink drawing, the photo masked out). It starts when the portrait's middle is at 75 % of the window AND ≥ 0.3 s after the «С нами»
     pen of #rezultat has ended (the pen and the portrait never share a moment); then the mask opens and the ink goes 0.6 s — a b/w photo —, the colour
     comes 0.8 s, both sine.inOut (was 0.18 s from drawing to grey). S16 Н136, 22.10: at 0.6 s the mask edge crossed the face in ≈ 0.3 s (reel f256–f257),
     so the drawing → b/w goes 1.2 s now (power1.inOut: the edge moves evenly over the face), the colour 0.8 s after it — 2.0 s in all. Once; the end frame is the kit's .is-photo. No JS / calm: the kit's rest «photo». */
  function portrait() {
    var el = $('#pochemu .pc__dp'), photo = el && $('.k-dp__photo', el), ink = el && $('.k-dp__ink', el);
    if (!photo || !ink) return null;
    var tl = null, dc = null, inView = false, started = false, o = { r: -26, g: 1 };
    function paint() {
      photo.style.setProperty('--k-dp-r', o.r.toFixed(1) + '%');
      photo.style.filter = 'grayscale(' + o.g.toFixed(3) + ') contrast(' + (1 + 0.35 * o.g).toFixed(3) + ') brightness(' + (1 + 0.1 * o.g).toFixed(3) + ')';
    }
    function clean() { photo.style.removeProperty('--k-dp-r'); photo.style.removeProperty('filter'); ink.style.removeProperty('opacity'); }
    function done() { el.classList.add('is-photo'); clean(); started = true; }
    function play() {
      tl = gsap.timeline({ onComplete: done });
      tl.to(o, { r: 165, duration: 1.2, ease: 'power1.inOut', onUpdate: paint }, 0)
        .to(ink, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 0)
        .to(o, { g: 0, duration: 0.8, ease: 'sine.inOut', onUpdate: paint }, 1.2);
    }
    function check() {
      if (started || !inView) return;
      var t = H.rzUsEnd ? H.rzUsEnd() : 0;
      if (t === -1) return;                                   // the pen is on: H.rzEnd calls back when it ends
      started = true;
      dc = gsap.delayedCall(Math.max(0.25, t ? t + 0.3 - gsap.ticker.time : 0), play);
    }
    if (el.classList.contains('is-photo') || el.getBoundingClientRect().bottom < hdrH()) { done(); return function () {}; }   // landed below it, or played before a calm switch
    H.rzEnd = check;
    var sti = ST.create({ trigger: el, start: 'center 75%', once: true, onEnter: function () { inView = true; check(); } });
    return function () { sti.kill(); if (dc) dc.kill(); if (tl) tl.kill(); H.rzEnd = null; done(); };
  }

  /* ───────────────────────── seam #cifry → T2 (S16 Н125, motion-critic 21.10: two pipes of different scale in one frame) ─────────────────────────
     The small pipe of the sieve goes out over 200 px of scroll that start when the reader has passed it — its middle above 40 % of the window —,
     so the big T2 pipe (1440: the camera of #t2; 390: the portal pipe of .kp) takes the frame alone. Not from the moment T2 shows its top (the judge's
     words): at 1440 that moment comes while the sieve still stands in the reading zone, and «90+» was left without its picture in the middle of the
     window (.station/S12/seam-2210/after-1440-06 of the first try). Scrubbed both ways (back up — the sieve returns). The caption goes with the drawing
     (S16 Н135, 22.10: alone after the seam it stood on an empty field); it is the visible name of the drawing, the section's aria-label keeps the words.
     Gated by the sieve's own scene: until it has played, the drawing stands (a fast scroller sees the scene first). */
  function seam(desk) {
    var fig = $('#cifry .cf__fig'), pipe = desk ? $('#t2 .t2__cam') : $('.kp__pipe .tr'), cap = $('#cifry .cf__cap'), both = cap ? [fig, cap] : [fig];
    if (!fig || !pipe) return null;   // no T2 pipe below — nothing to hand over to
    var p = 0, last = -1;
    function apply() {
      var v = (H.sieveDone && !H.sieveDone()) ? 1 : 1 - p;
      if (v === last) return;
      last = v;
      gsap.to(both, { autoAlpha: v, duration: 0.2, ease: 'none', overwrite: true });
    }
    var sti = ST.create({
      trigger: fig, start: 'center 40%', end: '+=200',
      onUpdate: function (self) { p = self.progress; apply(); },
      onRefresh: function (self) { p = self.progress; apply(); }
    });
    H.seamApply = apply;
    return function () { sti.kill(); H.seamApply = null; gsap.killTweensOf(both); gsap.set(both, { clearProps: 'opacity,visibility' }); };
  }

  /* ───────────────────────── wiring: calm mode / breakpoints ───────────────────────── */
  /* ── the markup is the end state (S12 18.10, calm fix): a scene's own clearProps:'all' wipes the WHOLE style attribute, also the inline
     geometry the markup carries (op__r top/left/width, pf__brg left/top/width …); and gsap.set leaves opacity / visibility / transform
     behind. So before any scene is built the style and the svg transform/x/y of every element of the scene sections are remembered, and
     every revert (calm switch, breakpoint) puts them back exactly: switching calm on after the scenes played gives the fresh-load picture. ── */
  var KEEP_IN = ['cifry', 'protivnik', 'perelom', 'uslugi', 'rezultat', 'oplata', 'ceny'], KEEP_ATTR = ['transform', 'x', 'y'], SNAP = [];
  KEEP_IN.forEach(function (id) {
    var r = document.getElementById(id);
    if (r) [r].concat($$('*', r)).forEach(function (el) {
      SNAP.push({ el: el, st: el.getAttribute('style'), at: KEEP_ATTR.map(function (a) { return el.getAttribute(a); }) });
    });
  });
  function restoreScenes() {
    SNAP.forEach(function (rec) {
      var el = rec.el, now = el.getAttribute('style');
      if (now !== rec.st) { if (rec.st === null) el.removeAttribute('style'); else el.setAttribute('style', rec.st); }
      KEEP_ATTR.forEach(function (a, i) { var v = el.getAttribute(a); if (v !== rec.at[i]) { if (rec.at[i] === null) el.removeAttribute(a); else el.setAttribute(a, rec.at[i]); } });
    });
  }
  function refit() {   // what live.js measures into the markup (ring pen widths, the struck lines) is measured again after the restore
    if (H.ringWidths) H.ringWidths();
    if (H.strikeFit) H.strikeFit();
    if (H.ringNow) H.ringNow(H.step);
  }
  var mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 821px)', mob: '(max-width: 820px)' }, function (ctx) {
    var desk = ctx.conditions.desk, undo = [];
    if (!motionOn()) { $$('.tr-ring').forEach(function (r) { r.classList.add('is-drawn'); }); $$('.hx__cap, .sc-cap').forEach(function (c) { c.classList.add('is-on'); }); return; }
    var a = hero(desk); if (a) undo.push(a);
    var b = desk ? stage() : portal(); if (b) undo.push(b);
    var c = protivnik(desk); if (c) undo.push(c);
    var d = perelom(desk); if (d) undo.push(d);
    var f = uslugi(desk); if (f) undo.push(f);
    var g = rezultat(desk); if (g) undo.push(g);
    var h = sieveScene(desk); if (h) undo.push(h);
    var h2 = seam(desk); if (h2) undo.push(h2);
    var h3 = portrait(); if (h3) undo.push(h3);
    var i9 = oplata(desk); if (i9) undo.push(i9);
    var i10 = ceny(desk); if (i10) undo.push(i10);
    return function () { undo.forEach(function (f) { f(); }); if (ringTl) ringTl.kill(); restoreScenes(); refit(); };
  });
  if (window.MadKit && window.MadKit.onMotion) window.MadKit.onMotion(function () { gsap.matchMediaRefresh(); H.ringNow && H.ringNow(H.step); });
  window.addEventListener('load', function () { ST.refresh(); });
})();
