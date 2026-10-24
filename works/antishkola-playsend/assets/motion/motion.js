/*!
 * Antishkola Motion Library — v1.0
 * Drop-in, declarative motion engine for landing pages.
 *
 * Consolidated from the summer-2026 and supplier-valta landings.
 * Every effect is opt-in via a data-* attribute, degrades gracefully when
 * GSAP/Lenis are absent, and is fully disabled under prefers-reduced-motion
 * and on coarse-pointer (touch) devices where it would feel like a bug.
 *
 * Dependencies (load BEFORE this file, all optional but recommended):
 *   gsap 3.12.x, ScrollTrigger, ScrollToPlugin   (core scroll motion)
 *   lenis 1.1.x                                  (weighted smooth scroll)
 *
 * Usage:
 *   <script src=".../gsap.min.js"></script>
 *   <script src=".../ScrollTrigger.min.js"></script>
 *   <script src=".../ScrollToPlugin.min.js"></script>
 *   <script src=".../lenis.min.js"></script>
 *   <script src="assets/motion/motion.js"></script>
 *   // auto-inits on DOMContentLoaded unless <body data-motion-manual>
 *
 * Attribute reference: see assets/motion/README.md
 */
(function (global) {
  'use strict';

  /* ───────────────────────── environment ───────────────────────── */
  var RM = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COARSE = global.matchMedia('(pointer:coarse)').matches;
  var HAS_GSAP = typeof global.gsap !== 'undefined';
  var HAS_ST = HAS_GSAP && typeof global.ScrollTrigger !== 'undefined';
  var HAS_LENIS = typeof global.Lenis !== 'undefined';
  var gsap = global.gsap;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var num = function (v, d) { v = parseFloat(v); return isNaN(v) ? d : v; };

  var lenis = null;

  /* ───────────────────────── smooth scroll (Lenis) ───────────────────────── */
  function smoothScroll() {
    // Touch devices keep native scroll so ScrollTrigger updates reliably.
    if (RM || !HAS_LENIS || !HAS_ST || COARSE) return null;
    lenis = new global.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 0.95
    });
    lenis.on('scroll', global.ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    return lenis;
  }

  /* ───────────────────────── preloader ─────────────────────────
   * <div data-preloader> ... <i data-preloader-bar></i> ...
   * Fires `motion:loaded` on document when done. */
  function preloader(done) {
    var pl = $('[data-preloader]');
    if (!pl) { document.body.classList.remove('locked'); done && done(); return; }
    var bar = $('[data-preloader-bar]', pl);
    var logo = $('[data-preloader-logo]', pl);
    var finish = function () {
      document.body.classList.remove('locked');
      pl.style.display = 'none';
      document.dispatchEvent(new CustomEvent('motion:loaded'));
      done && done();
    };
    if (RM || !HAS_GSAP) { finish(); return; }
    var tl = gsap.timeline();
    if (logo) tl.to(logo, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (bar) tl.fromTo(bar, { width: '0%' }, { width: '100%', duration: 1, ease: 'power1.inOut' }, '-=.3');
    tl.to(pl, { yPercent: -100, duration: 0.8, ease: 'power3.inOut', delay: 0.15 })
      .add(finish);
  }

  /* ───────────────────────── kinetic split headings ─────────────────────────
   * <h1 data-split> — words rise from a mask on scroll-in.
   * Spans with class "accent" inside are preserved (e.g. coloured words).
   * Use data-split="hero" to animate immediately (no scroll trigger). */
  function splitHeadings() {
    function mkWord(text, accent) {
      var outer = document.createElement('span');
      outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;';
      var inner = document.createElement('span');
      inner.textContent = text;
      inner.style.cssText = 'display:inline-block;will-change:transform;';
      if (accent) inner.className = 'accent';
      outer.appendChild(inner);
      return { outer: outer, inner: inner };
    }
    $$('[data-split]').forEach(function (h) {
      if (h.dataset.splitDone) return;
      h.dataset.splitDone = '1';
      var frag = document.createDocumentFragment();
      var words = [];
      Array.prototype.forEach.call(h.childNodes, function (node) {
        var accent = node.nodeType === 1 && node.classList && node.classList.contains('accent');
        var text = node.textContent;
        if (node.nodeType !== 3 && !accent) {
          // keep non-text, non-accent nodes (e.g. <br>) as-is
          frag.appendChild(node.cloneNode(true));
          return;
        }
        text.split(/(\s+)/).forEach(function (t) {
          if (!t.trim()) { frag.appendChild(document.createTextNode(t)); return; }
          var w = mkWord(t, accent); frag.appendChild(w.outer); words.push(w.inner);
        });
      });
      h.innerHTML = ''; h.appendChild(frag);

      if (RM || !HAS_GSAP) { return; }
      gsap.set(words, { yPercent: 115 });
      var play = function () { gsap.to(words, { yPercent: 0, duration: 1.05, ease: 'power4.out', stagger: 0.06 }); };
      if (h.dataset.split === 'hero') { play(); }
      else if (HAS_ST) {
        global.ScrollTrigger.create({ trigger: h, start: 'top 84%', once: true, onEnter: play });
      } else { play(); }
    });
  }

  /* ───────────────────────── reveal on scroll ─────────────────────────
   * [data-reveal]                element fades up on scroll-in
   * [data-reveal-stagger]        container; direct children stagger in
   * [data-reveal="clip"]         curtain (clip-path) wipe instead of fade
   * data-delay / data-stagger    tune timing (seconds) */
  function reveals() {
    if (!HAS_ST) {
      // No ScrollTrigger: just show everything (CSS native layer may still animate).
      $$('[data-reveal],[data-reveal-stagger]').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (RM) { $$('[data-reveal],[data-reveal-stagger]').forEach(function (el) { el.classList.add('is-in'); }); return; }

    $$('[data-reveal-stagger]').forEach(function (w) {
      var items = Array.prototype.slice.call(w.children);
      var clip = w.dataset.reveal === 'clip';
      var stagger = num(w.dataset.stagger, 0.1);
      var delay = num(w.dataset.delay, 0);
      var from = clip
        ? { opacity: 0, y: 32, scale: 0.96, clipPath: 'inset(0 0 100% 0)' }
        : { opacity: 0, y: 40 };
      gsap.set(items, from);
      global.ScrollTrigger.create({
        trigger: w, start: 'top 80%', once: true,
        onEnter: function () {
          gsap.to(items, {
            opacity: 1, y: 0, scale: 1,
            clipPath: clip ? 'inset(0 0 0% 0)' : undefined,
            duration: 0.95, ease: 'power3.out', stagger: stagger, delay: delay,
            onComplete: clip ? function () { items.forEach(function (c) { c.style.clipPath = 'none'; }); } : null
          });
          w.classList.add('is-in');
        }
      });
    });

    $$('[data-reveal]').forEach(function (el) {
      if (el.hasAttribute('data-reveal-stagger')) return;
      var clip = el.dataset.reveal === 'clip';
      var delay = num(el.dataset.delay, 0);
      var from = clip
        ? { opacity: 0, scale: 1.06, clipPath: 'inset(0 0 100% 0)' }
        : { opacity: 0, y: num(el.dataset.y, 30) };
      gsap.set(el, from);
      global.ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(el, {
            opacity: 1, y: 0, scale: 1,
            clipPath: clip ? 'inset(0 0 0% 0)' : undefined,
            duration: 0.9, ease: 'power3.out', delay: delay
          });
          el.classList.add('is-in');
        }
      });
    });
  }

  /* ───────────────────────── magnetic ─────────────────────────
   * [data-magnetic] el is pulled toward the cursor. data-strength (default .3) */
  function magnetic(root) {
    if (RM || COARSE || !HAS_GSAP) return;
    $$('[data-magnetic]', root).forEach(function (el) {
      if (el.dataset.magneticOn) return; el.dataset.magneticOn = '1';
      var s = num(el.dataset.strength, 0.3);
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - r.left - r.width / 2) * s,
          y: (e.clientY - r.top - r.height / 2) * (s + 0.1),
          duration: 0.4, ease: 'power3.out'
        });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,.4)' });
      });
    });
  }

  /* ───────────────────────── 3D tilt ─────────────────────────
   * [data-tilt] card reacts to cursor with perspective. data-tilt-max (deg, default 6) */
  function tilt(root) {
    if (RM || COARSE || !HAS_GSAP) return;
    $$('[data-tilt]', root).forEach(function (card) {
      if (card.dataset.tiltOn) return; card.dataset.tiltOn = '1';
      var max = num(card.dataset.tiltMax, 6);
      card.style.willChange = 'transform';
      card.style.transformStyle = 'preserve-3d';
      var raf = null;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          gsap.to(card, {
            rotateY: x * max, rotateX: -y * max, y: -4,
            duration: 0.4, ease: 'expo.out', overwrite: 'auto', transformPerspective: 800
          });
        });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
      });
    });
  }

  /* ───────────────────────── custom cursor glow ─────────────────────────
   * Add <div data-cursor></div> to the page; it follows the pointer with lag. */
  function cursor() {
    var c = $('[data-cursor]');
    if (!c) return;
    if (RM || COARSE || !HAS_GSAP) { c.style.display = 'none'; return; }
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; });
    gsap.ticker.add(function () {
      cx += (x - cx) * 0.12; cy += (y - cy) * 0.12;
      c.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
    });
    // grow over interactive elements
    $$('a,button,[data-cursor-grow]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { c.classList.add('is-grow'); });
      el.addEventListener('mouseleave', function () { c.classList.remove('is-grow'); });
    });
  }

  /* ───────────────────────── parallax + clip reveal ─────────────────────────
   * [data-parallax]              translateY scrub. data-parallax-speed (default 12 %)
   * [data-clip-reveal]           clip-path inset wipe + scale on enter */
  function imageFX() {
    if (RM || !HAS_ST) return;
    $$('[data-parallax]').forEach(function (el) {
      var sp = num(el.dataset.parallaxSpeed, 12);
      gsap.fromTo(el, { yPercent: -sp / 2 }, {
        yPercent: sp / 2, ease: 'none',
        scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('[data-clip-reveal]').forEach(function (m) {
      gsap.fromTo(m, { clipPath: 'inset(0 0 100% 0)', scale: 1.12 }, {
        clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: m, start: 'top 80%', once: true }
      });
    });
  }

  /* ───────────────────────── count-up ─────────────────────────
   * [data-count="120"] data-suffix="+" data-duration="1.6" */
  function counters() {
    if (!HAS_ST) return;
    $$('[data-count]').forEach(function (el) {
      var to = num(el.dataset.count, 0);
      var suf = el.dataset.suffix || (el.textContent.indexOf('+') > -1 ? '+' : '');
      var dur = num(el.dataset.duration, 1.6);
      if (RM || !HAS_GSAP) { el.textContent = to + suf; return; }
      global.ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          var o = { v: 0 };
          gsap.to(o, { v: to, duration: dur, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('ru-RU') + suf; } });
        }
      });
    });
  }

  /* ───────────────────────── marquee ─────────────────────────
   * <div data-marquee><div data-marquee-track> … </div></div>
   * data-marquee-speed (px/s, default 60), data-marquee-reverse */
  function marquees() {
    $$('[data-marquee]').forEach(function (wrap) {
      var track = $('[data-marquee-track]', wrap) || wrap.firstElementChild;
      if (!track || track.dataset.marqueeOn) return; track.dataset.marqueeOn = '1';
      // duplicate content for a seamless loop
      var clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      wrap.appendChild(clone);
      if (RM) return;
      var speed = num(wrap.dataset.marqueeSpeed, 60);
      var rev = wrap.hasAttribute('data-marquee-reverse');
      var dur = track.offsetWidth / speed;
      [track, clone].forEach(function (t, i) {
        t.style.animation = 'm-marquee ' + dur + 's linear infinite' + (rev ? ' reverse' : '');
        t.style.animationDelay = (rev ? 0 : 0) + 's';
      });
      wrap.style.setProperty('--m-marquee-w', track.offsetWidth + 'px');
    });
  }

  /* ───────────────────────── scroll progress bar ─────────────────────────
   * <i data-scroll-progress></i> grows 0→100% width with page scroll. */
  function scrollProgress() {
    var bar = $('[data-scroll-progress]');
    if (!bar) return;
    var upd = function () {
      var h = document.documentElement;
      var p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
    };
    addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ───────────────────────── sticky header ─────────────────────────
   * [data-header] gets .scrolled past 40px and .hide when scrolling down. */
  function header() {
    var h = $('[data-header]');
    if (!h) return;
    var last = 0;
    addEventListener('scroll', function () {
      var y = scrollY;
      h.classList.toggle('scrolled', y > 40);
      h.classList.toggle('hide', y > last && y > 600);
      last = y;
    }, { passive: true });
  }

  /* ───────────────────────── pinned horizontal track ─────────────────────────
   * <div data-pin-x>            (pin wrapper)
   *   <div data-pin-track> …panels… </div>
   *   <button data-pin-to="0">…  (optional progress dots)
   * Desktop ≥ data-pin-min (default 861) pins & scrolls horizontally;
   * below that it falls back to native vertical stacking. */
  function pinX() {
    $$('[data-pin-x]').forEach(function (pin) {
      var track = $('[data-pin-track]', pin);
      var btns = $$('[data-pin-to]', pin);
      if (!track) return;
      var panels = Array.prototype.slice.call(track.children);
      var n = panels.length;
      var minW = num(pin.dataset.pinMin, 861);
      var setActive = function (i) { btns.forEach(function (b, k) { b.classList.toggle('on', k === i); }); };

      if (!HAS_ST || RM || innerWidth < minW || n < 2) {
        panels.forEach(function (p, i) {
          if (HAS_ST) global.ScrollTrigger.create({
            trigger: p, start: 'top 60%', end: 'bottom 60%',
            onToggle: function (self) { if (self.isActive) setActive(i); }
          });
        });
        btns.forEach(function (b) {
          b.addEventListener('click', function () {
            panels[+b.dataset.pinTo].scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        });
        return;
      }

      var maxShift = (n - 1) / n * 100; // xPercent
      var st = gsap.to(track, {
        xPercent: -maxShift, ease: 'none',
        scrollTrigger: {
          trigger: pin, pin: true, scrub: 1,
          start: 'top 84px', end: function () { return '+=' + (track.offsetWidth * 1.4); },
          onUpdate: function (self) { setActive(Math.min(n - 1, Math.round(self.progress * (n - 0.8)))); }
        }
      });
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var i = +b.dataset.pinTo, t = st.scrollTrigger;
          var y = t.start + (t.end - t.start) * (i / (n - 0.8));
          if (global.ScrollToPlugin) gsap.to(window, { scrollTo: y, duration: 0.8, ease: 'power2.inOut' });
          else window.scrollTo({ top: y, behavior: 'smooth' });
        });
      });
    });
  }

  /* ───────────────────────── accordion ─────────────────────────
   * <div data-accordion>
   *   <div data-acc-item><button data-acc-q>…</button><div data-acc-a>…</div></div>
   * data-acc-multi keeps multiple open. */
  function accordion() {
    $$('[data-accordion]').forEach(function (acc) {
      var multi = acc.hasAttribute('data-acc-multi');
      $$('[data-acc-item]', acc).forEach(function (it) {
        var q = $('[data-acc-q]', it), a = $('[data-acc-a]', it);
        if (!q || !a) return;
        q.addEventListener('click', function () {
          var open = it.classList.contains('open');
          if (!multi) $$('[data-acc-item].open', acc).forEach(function (o) {
            o.classList.remove('open'); $('[data-acc-a]', o).style.maxHeight = 0;
          });
          if (open) { it.classList.remove('open'); a.style.maxHeight = 0; }
          else { it.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
        });
      });
    });
  }

  /* ───────────────────────── smooth anchors ───────────────────────── */
  function anchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = $(id); if (!t) return;
        e.preventDefault();
        var off = num(document.body.dataset.anchorOffset, 70);
        var y = t.getBoundingClientRect().top + scrollY - off;
        if (lenis) lenis.scrollTo(y, { duration: 1.2 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  /* ───────────────────────── helper: shake (form errors) ───────────────────────── */
  function shake(el) {
    if (!el) return;
    if (RM || !HAS_GSAP) { el.classList.add('m-shake'); setTimeout(function () { el.classList.remove('m-shake'); }, 400); return; }
    gsap.fromTo(el, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,.3)' });
  }

  /* ───────────────────────── init ───────────────────────── */
  function init() {
    if (HAS_GSAP && typeof global.ScrollTrigger !== 'undefined') gsap.registerPlugin(global.ScrollTrigger);
    if (HAS_GSAP && typeof global.ScrollToPlugin !== 'undefined') gsap.registerPlugin(global.ScrollToPlugin);

    smoothScroll();
    splitHeadings();
    preloader(function () {
      // hero[data-split="hero"] is handled inside splitHeadings; nothing else needed
    });
    header();
    cursor();
    magnetic();
    tilt();
    reveals();
    imageFX();
    counters();
    marquees();
    scrollProgress();
    pinX();
    accordion();
    anchors();
    if (HAS_ST) global.ScrollTrigger.refresh();
  }

  var Motion = {
    init: init,
    // expose pieces for manual / dynamic use
    smoothScroll: smoothScroll,
    splitHeadings: splitHeadings,
    reveals: reveals,
    magnetic: magnetic,
    tilt: tilt,
    cursor: cursor,
    imageFX: imageFX,
    counters: counters,
    marquees: marquees,
    scrollProgress: scrollProgress,
    pinX: pinX,
    accordion: accordion,
    anchors: anchors,
    shake: shake,
    get lenis() { return lenis; },
    env: { reducedMotion: RM, coarse: COARSE, gsap: HAS_GSAP, scrollTrigger: HAS_ST, lenis: HAS_LENIS }
  };
  global.Motion = Motion;

  if (!document.body || !document.body.hasAttribute('data-motion-manual')) {
    if (document.readyState !== 'loading') init();
    else document.addEventListener('DOMContentLoaded', init);
  }
})(window);
