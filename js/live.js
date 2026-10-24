/* «Примеры работ» · live slice v3 · S12 · R338
   Х1 «Картотеку открывают»: the pen draws the drawer → numbers on the tabs → card 01 leaves its slot in TWO moves:
      move 1, in the drawer's own isometry (the card is narrow, sheared to the slope of the drawer walls, rises straight up out of the stack);
      pause; move 2, a turn to the reader (shear → 0, width → 1, a slight perspective, the shadow grows) → «стало» grows out of «было» → pen circles the number.
   Tab press: the same two moves for the pressed card; the previous one goes back reversed (turns into the drawer's plane, then sinks).
   Hero numbers count on overlay copies; Х2 bars; Х3 pen line; levers 1–7 graphics; channel tabs; week table; architecture; portal tabs; the live deck and the live sites in their frames (Р-346).
   Only transform / opacity / stroke-dashoffset / clip-path.  No JS or reduced motion = the static end state (controls still work, instantly). */
(function () {
  "use strict";
  var root = document.documentElement;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var animMode = root.classList.contains("anim") && !!gsap;
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  root.classList.add("js-ok");
  var stage = $("#stage");
  if (!stage) return;
  var cam = $("#cam"), drawin = $(".drawin", stage), artimg = $("#artimg"), artfront = $("#artfront"), nib = $("#nib"), pulls = $(".pulls", stage), dtabs = $(".dtabs", stage);
  var cards = $$(".card", stage), tabBtns = $$(".dtab", stage), rowBtns = $$(".rx");
  var desk = window.matchMedia("(min-width: 641px)");
  var NX = 3, NY = 24;                          /* nib tip inside its 26 px box */
  var tlIntro = null, running = [];

  try {
    if (animMode && ST) gsap.registerPlugin(ST);
    if (animMode) gsap.config({ nullTargetWarn: false });
  } catch (err) { animMode = false; root.classList.remove("anim"); }

  function offsetIn(el, anc) {
    var x = 0, y = 0;
    while (el && el !== anc) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x: x, y: y };
  }
  function tabPct(k) {
    var s = tabBtns[k].style;
    return { x: parseFloat(s.left), y: parseFloat(s.top), w: parseFloat(s.width), h: parseFloat(s.height) };
  }
  /* every card stands in the back of the drawer: everything of the drawing below the back tab line lies in front of it */
  function yBack() {
    var yb = 100;
    tabBtns.forEach(function (b, i) { yb = Math.min(yb, tabPct(i).y); });
    return yb - 1.4;
  }
  function backPoly() {
    var yb = yBack().toFixed(2);
    return "polygon(0% " + yb + "%, 100% " + yb + "%, 100% 100%, 0% 100%)";
  }
  function setOpenAttrs(k, on) {
    cards[k].classList.toggle("is-up", on);
    cards[k].classList.toggle("is-open", on);
    tabBtns[k].setAttribute("aria-expanded", on ? "true" : "false");
    rowBtns[k].setAttribute("aria-expanded", on ? "true" : "false");
  }
  function barsOf(card) { return $$(".b-now[data-from], .b-gain[data-from]", card); }
  function ringsOf(card) { return $$(".mk-ring", card); }
  function labelsOf(el) { return $$(".v-now", el); }
  function fromOf(b) { return parseFloat(b.getAttribute("data-from")) || 0; }

  /* ------------------------------------------------ counters on an aria-hidden overlay copy (the real number stays in the DOM, hidden with visibility while counting) */
  var NUM = /\d+(?:[  ]\d{3})*(?:,\d+)?/g;
  function fmtTok(t, v) {
    var p = Math.abs(v).toFixed(t.dec).split(".");
    if (t.sep) p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, t.sep);
    return p.join(",");
  }
  /* from: array (per number in the text) or one number; returns { run(tl, at, dur, ease), finish() } */
  function counter(el, from) {
    if (!el || el.__cnt || !animMode) return null;
    var txt = el.textContent, toks = [], m;
    NUM.lastIndex = 0;
    while ((m = NUM.exec(txt))) toks.push({ i: m.index, len: m[0].length, to: parseFloat(m[0].replace(/[  ]/g, "").replace(",", ".")), dec: (m[0].split(",")[1] || "").length, sep: (m[0].match(/[  ]/) || [""])[0] });
    if (!toks.length) return null;
    var ov = document.createElement("span"), proxy = { p: 0 }, posSet = false;
    ov.className = "cnt"; ov.setAttribute("aria-hidden", "true");
    ov.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;visibility:visible;pointer-events:none";
    if (window.getComputedStyle(el).position === "static") { el.style.position = "relative"; posSet = true; }
    /* the overlay stands exactly where the real text stands: its own box and its alignment */
    function place() {
      var rg = document.createRange(), rects, er, r0, cs, bb, multi, vis = el.style.visibility;
      ov.style.display = "none"; el.style.visibility = "";
      rg.selectNodeContents(el);
      rects = rg.getClientRects();
      ov.style.display = ""; el.style.visibility = vis;
      if (!rects.length) return;
      er = el.getBoundingClientRect(); r0 = rects[0]; cs = window.getComputedStyle(el);
      bb = rg.getBoundingClientRect();
      multi = rects.length > 1 && Math.abs(rects[rects.length - 1].top - r0.top) > 4;
      ov.style.left = (bb.left - er.left - el.clientLeft).toFixed(1) + "px";
      ov.style.top = (r0.top - er.top - el.clientTop).toFixed(1) + "px";
      ov.style.width = bb.width.toFixed(1) + "px";
      ov.style.lineHeight = r0.height.toFixed(1) + "px";   /* the range's rect is the font's content box: the overlay's line box is made the same */
      ov.style.whiteSpace = multi ? "normal" : "nowrap";
      ov.style.textAlign = /right|end/.test(cs.textAlign) ? "right" : /center/.test(cs.textAlign) ? "center" : "left";
    }
    function render(p) {
      var out = "", last = 0;
      toks.forEach(function (t, i) {
        var f = Array.isArray(from) ? (from[i] || 0) : (from || 0);
        out += txt.slice(last, t.i) + fmtTok(t, f + (t.to - f) * p);
        last = t.i + t.len;
      });
      ov.textContent = out + txt.slice(last);
    }
    render(0);
    el.appendChild(ov); place(); el.style.visibility = "hidden"; el.__cnt = true;
    function finish() {
      if (!el.__cnt) return;
      el.__cnt = false;
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      el.style.visibility = "";
      if (posSet) el.style.position = "";
    }
    return {
      run: function (tl, at, dur, ease) {
        tl.add(function () {   /* the layout may have moved since the page was built: stand again where the text stands */
          if (!el.__cnt) return;
          place();
        }, at);
        tl.to(proxy, { p: 1, duration: dur || 1.2, ease: ease || "power2.out", onUpdate: function () { render(proxy.p); }, onComplete: finish }, at + 0.001);
      },
      finish: finish
    };
  }

  /* ------------------------------------------------ pen wipe of the drawer: ten bands one after another; the nib sits on the moving edge of the mask */
  function wipe(tl, at, perBand) {
    var H = artimg.offsetHeight, W = artimg.offsetWidth, n = 10, d = perBand || 0.1, bands = [];
    var o = offsetIn(drawin, cam);
    for (var k = 0; k < n; k++) {
      var a = H * k / n, z = H * (k + 1) / n, lr = k % 2 === 0;
      var b = artimg.cloneNode(true);
      b.removeAttribute("id");
      b.style.visibility = "visible";
      var from = "inset(" + a + "px " + (lr ? "100% " : "0% ") + (H - z) + "px " + (lr ? "0%" : "100%") + ")";
      b.style.clipPath = from;
      drawin.insertBefore(b, artimg.nextSibling);
      bands.push(b);
      tl.fromTo(b, { clipPath: from }, { clipPath: "inset(" + a + "px 0% " + (H - z) + "px 0%)", duration: d, ease: "none", immediateRender: false }, at + k * d);
      var y = o.y + (a + z) / 2 - NY;
      tl.to(nib, { x: o.x + (lr ? 0 : 1) * W - NX, y: y, opacity: 1, duration: 0.01 }, at + k * d);
      tl.to(nib, { x: o.x + (lr ? 1 : 0) * W - NX, duration: d, ease: "none" }, at + k * d);
    }
    tl.to(nib, { opacity: 0, duration: 0.12 }, at + n * d);
    tl.add(function () {
      artimg.style.visibility = "visible";
      bands.forEach(function (bd) { if (bd.parentNode) bd.parentNode.removeChild(bd); });
    }, at + n * d + 0.02);
    return at + n * d;
  }

  /* ------------------------------------------------ the two moves of a card (Р-331)
     Measured on kartoteka6-full.png (2400 × 1792): the front panel's top edge rises 13.9° to the left of horizontal (slope 0.248), the tab tops of card 01 run at 0.200,
     the stack's front rim at 0.285; verticals stay vertical.  Card k stands in the plane of the drawer: left edge at 18.2 % + (tab k − tab 01) of the drawing's width,
     36.8 % wide (narrower with depth), its top edge sheared to slope 0.248 (card 01) … 0.20 (card 06).
     Move 1: the card is scaled to that plane (scaleX, skewY), its foot is under the rim of the stack, it rises straight up until the foot clears the rim.
     Move 2: skewY → 0, scaleX → 1, translate to the rest place, perspective rotateY settles to 0, the hatched shadow grows 1 → 8 px. */
  var S_PANEL = 0.248, S_TAB = 0.200, S_RIM0 = 0.285, S_RIM1 = 0.220;
  var X0 = 18.2, Y0 = 39.1, W0 = 36.8, ASP = 2400 / 1792, RY_MAX = 9;   /* move 1 has no rotateY at all (pure shear); move 2 swings it out to 9° and settles at 0 */
  function plane(k) {
    var c = cards[k], t0 = tabPct(0), tk = tabPct(k);
    var dx = tk.x - t0.x, dy = tk.y - t0.y, dep = Math.min(1, dx / 45.8);
    var o = offsetIn(drawin, cam), dw = drawin.offsetWidth, dh = drawin.offsetHeight;
    var cw = c.offsetWidth, ch = c.offsetHeight;
    var P = { k: k, dw: dw, ch: ch };
    P.cardL = pulls.offsetLeft + c.offsetLeft;
    P.cardB = pulls.offsetTop + c.offsetTop + ch;
    P.Lx = X0 + dx;
    P.yL = Y0 + dy;
    P.s = S_PANEL - (S_PANEL - S_TAB) * dep;
    P.sr = S_RIM0 - (S_RIM0 - S_RIM1) * dep;
    P.yR = P.yL + ASP * P.sr * (100 - P.Lx);
    P.yb = yBack();
    P.PL = o.x + P.Lx / 100 * dw;
    P.RY = o.y + P.yL / 100 * dh;
    P.sx = (W0 - 0.25 * dx) / 100 * dw / cw;
    P.footE = P.RY - 8;
    P.sy = Math.max(0.3, Math.min(0.82, (P.footE - pulls.offsetTop) / ch - 0.02));
    P.footS = P.RY + ch * P.sy + 2;
    P.ry = RY_MAX;
    return P;
  }
  function pose(c, P, u, v) {
    var foot = P.footS + (P.footE - P.footS) * u, k1 = 1 - v;
    var tx = (P.PL - P.cardL) * k1, ty = (foot - P.cardB) * k1;
    var sx = P.sx + (1 - P.sx) * v, sy = P.sy + (1 - P.sy) * v, sk = Math.atan(P.s * k1) * 180 / Math.PI;
    c.style.transform = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px) perspective(1500px) rotateY(" + (P.ry * Math.sin(Math.PI * v)).toFixed(3) + "deg) skewY(" + sk.toFixed(3) + "deg) scale(" + sx.toFixed(4) + "," + sy.toFixed(4) + ")";
  }
  /* the drawing in front of the card: below the stack's rim line in the card's plane (m = 0), morphing to «below the back tab line» (m = 1, the rest state) */
  function clipIso(P, m) {
    var ya = P.yb * m, yl = P.yL + (P.yb - P.yL) * m, yr = P.yR + (P.yb - P.yR) * m;
    artfront.style.clipPath = "polygon(0% " + ya.toFixed(2) + "%," + P.Lx.toFixed(2) + "% " + ya.toFixed(2) + "%," + P.Lx.toFixed(2) + "% " + yl.toFixed(2) + "%,100% " + yr.toFixed(2) + "%,100% 100%,0% 100%)";
  }
  /* the card shows only above the rim line of its plane (below it the card is inside the drawer); in move 2 the line sinks away */
  function clipPulls(P, v) {
    var W = pulls.offsetWidth, drop = smooth(v / 0.6) * P.ch * 1.6, yo = pulls.offsetTop;
    var y1 = P.RY + P.sr * (-60 - P.PL) - yo + drop, y2 = P.RY + P.sr * (W + 60 - P.PL) - yo + drop;
    pulls.style.clipPath = v >= 1 ? "" : "polygon(-60px -1000px," + (W + 60) + "px -1000px," + (W + 60) + "px " + y2.toFixed(1) + "px,-60px " + y1.toFixed(1) + "px)";
  }
  function isoOn() { artfront.style.visibility = "visible"; stage.classList.add("moving", "iso"); }
  function isoOff() { pulls.style.clipPath = ""; artfront.style.clipPath = backPoly(); artfront.style.visibility = "visible"; stage.classList.remove("moving", "iso"); }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  function tabsHide(tl, at) {
    tl.to(tabBtns, { opacity: 0, duration: 0.15, ease: "power1.in" }, at);
    tl.set(tabBtns, { pointerEvents: "none" }, at + 0.15);          /* inert only once they are not seen */
  }
  function tabsShow(tl, at) {
    tl.set(tabBtns, { clearProps: "pointerEvents" }, at);          /* clickable from the first frame they are seen */
    tl.to(tabBtns, { opacity: 1, duration: 0.4, ease: "power1.out" }, at);
  }
  /* forward: slot → plane → rest.  D1 / D2 = durations of move 1 / move 2, G = pause between */
  function moves(tl, k, at, D1, G, D2) {
    var c = cards[k], sh = $(".sh", c), ctab = $(".ctab", c), P = null, st = { u: 0, v: 0 };
    function apply() { pose(c, P, st.u, st.v); clipPulls(P, st.v); if (st.v > 0) clipIso(P, smooth(st.v / 0.75)); }
    tl.add(function () {
      P = plane(k); st.u = 0; st.v = 0;
      c.style.transformOrigin = "0% 100%";
      gsap.set(c, { opacity: 1, visibility: "hidden", pointerEvents: "auto" });
      gsap.set(ctab, { opacity: 0 });
      gsap.set(sh, { x: 1, y: 1, opacity: 0.25 });
      isoOn(); pose(c, P, 0, 0); clipIso(P, 0); clipPulls(P, 0);
    }, at);
    tl.to(st, { u: 1, duration: D1, ease: "power2.inOut", onUpdate: apply }, at + 0.01);
    tl.set(c, { visibility: "visible" }, at + 0.01 + D1 * 0.3);     /* shown once its title has cleared the rim: what is seen is clickable */
    var t2 = at + 0.01 + D1 + G;
    tl.to(st, { v: 1, duration: D2, ease: "power2.inOut", onUpdate: apply }, t2);
    tl.to(sh, { x: 8, y: 8, opacity: 1, duration: D2, ease: "power2.inOut" }, t2);
    tl.to(ctab, { opacity: 1, duration: 0.45, ease: "power1.out" }, t2 + 0.25);
    tl.add(function () { c.style.transform = ""; c.style.transformOrigin = ""; isoOff(); }, t2 + D2 + 0.01);
    return t2 + D2 + 0.02;
  }
  /* reverse: rest → turn into the drawer's plane → sink */
  function sinkMoves(tl, k, at) {
    var c = cards[k], sh = $(".sh", c), ctab = $(".ctab", c), P = null, st = { u: 1, v: 1 };
    function apply() { pose(c, P, st.u, st.v); clipPulls(P, st.v); clipIso(P, smooth(st.v / 0.75)); }
    var D2 = 0.7, G = 0.25, D1 = 0.55;   /* back into the drawer: two moves, shorter than the way out (motion-critic R338: the press felt dead) */
    tl.add(function () {
      P = plane(k); st.u = 1; st.v = 1;
      c.style.transformOrigin = "0% 100%";
      gsap.set(c, { pointerEvents: "none" });
      isoOn(); pose(c, P, 1, 1); clipIso(P, 1); clipPulls(P, 1);
    }, at);
    tl.to(ctab, { opacity: 0, duration: 0.3, ease: "power1.in" }, at);
    tl.to(sh, { x: 1, y: 1, opacity: 0.25, duration: D2, ease: "power2.inOut" }, at);
    tl.to(st, { v: 0, duration: D2, ease: "power2.inOut", onUpdate: apply }, at + 0.01);
    tl.to(st, { u: 0, duration: D1, ease: "power2.inOut", onUpdate: apply }, at + 0.01 + D2 + G);
    var end = at + 0.01 + D2 + G + D1;
    tl.set(c, { visibility: "hidden" }, end);
    tl.add(function () {
      setOpenAttrs(k, false);
      c.style.transform = ""; c.style.transformOrigin = "";
      gsap.set(c, { clearProps: "transform,transformOrigin,opacity,visibility,pointerEvents" });
      gsap.set([sh, ctab], { clearProps: "transform,opacity" });
      isoOff();
    }, end + 0.02);
    return end + 0.03;
  }
  function growBars(tl, c, at) {
    var bars = barsOf(c);
    var vs = labelsOf(c);
    bars.forEach(function (b) { gsap.set(b, { scaleX: fromOf(b) }); });
    gsap.set(vs, { opacity: 0 });
    bars.forEach(function (b, i) {
      tl.to(b, { scaleX: 1, duration: 0.9, ease: "power3.out" }, at + i * 0.15);
      if (vs[i]) tl.to(vs[i], { opacity: 1, duration: 0.25, ease: "power1.out" }, at + i * 0.15 + 0.75);
    });
    return at + 0.3 + 0.9;
  }
  function ring(tl, c, at) {
    var r = ringsOf(c);
    r.forEach(function (m) { tl.fromTo(m, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut", immediateRender: false }, at); });
    return at + (r.length ? 0.6 : 0);
  }
  function settleCard(c) {
    gsap.set(c, { clearProps: "transform,transformOrigin,opacity,visibility,pointerEvents" });
    gsap.set($$(".sh, .ctab", c), { clearProps: "transform,opacity" });
    barsOf(c).forEach(function (b) { gsap.set(b, { clearProps: "transform" }); });
    if (labelsOf(c).length) gsap.set(labelsOf(c), { clearProps: "opacity" });
    ringsOf(c).forEach(function (m) { gsap.set(m, { clearProps: "strokeDashoffset" }); });
    c.classList.add("is-seen");
  }

  /* ------------------------------------------------ Х1 */
  function intro() {
    var c1 = cards[0], tl, phone = !desk.matches, t;
    gsap.set([artimg, artfront], { visibility: "hidden" });
    gsap.set(tabBtns, { opacity: 0, pointerEvents: "none" });
    gsap.set(c1, { visibility: "hidden", pointerEvents: "none" });
    barsOf(c1).forEach(function (b) { gsap.set(b, { scaleX: fromOf(b) }); });
    gsap.set(labelsOf(c1), { opacity: 0 });
    ringsOf(c1).forEach(function (m) { gsap.set(m, { strokeDashoffset: 1 }); });
    root.classList.add("ready");
    tl = gsap.timeline({ delay: 0.1 });
    tlIntro = tl;
    var per = phone ? 0.06 : 0.09;
    t = wipe(tl, 0, per);                                                              /* 0 – 0.9 s  the pen draws the drawer (phone 0.6 s) */
    tl.add(function () { artfront.style.clipPath = backPoly(); artfront.style.visibility = "visible"; }, t);
    tl.set(tabBtns, { clearProps: "pointerEvents" }, t);
    tl.to(tabBtns, { opacity: 1, duration: 0.2, stagger: 0.05, ease: "power1.out" }, t);       /* numbers on the tabs */
    gsap.set(cam, { transformOrigin: "50% 100%" });
    tl.fromTo(cam, { scale: 1.03 }, { scale: 1, duration: 3.3, ease: "power2.out", immediateRender: false }, t);   /* slow camera settle, over before the card is read */
    var t0 = t + (phone ? 0.2 : 0.55);
    tabsHide(tl, t0 - 0.05);
    var te = moves(tl, 0, t0, phone ? 1.1 : 1.25, 0.45, phone ? 1.0 : 1.15);   /* motion-critic R338: 0.15 s merged the two moves into one; 0.45 s of stillness splits them */          /* move 1 in the drawer's plane · pause · move 2 turn to the reader */
    tabsShow(tl, te);
    t = growBars(tl, c1, te);                                                          /* «стало» grows out of «было» */
    ring(tl, c1, t);                                                                   /* the pen circles «40–50» */
    tl.add(function () { gsap.set(cam, { clearProps: "transform,transformOrigin" }); settleCard(c1); tlIntro = null; }, t + 0.7);
  }

  /* ------------------------------------------------ tab / list press */
  function settle() {
    if (tlIntro) { tlIntro.progress(1); tlIntro = null; }
    running.forEach(function (t) { t.progress(1); });
    running = [];
  }
  function toggle(k) {
    var card = cards[k], isOpen = card.classList.contains("is-up") && card.classList.contains("is-open");
    if (!animMode) {
      cards.forEach(function (c, i) { setOpenAttrs(i, i === k && !isOpen); c.classList.add("is-seen"); });
      return;
    }
    settle();
    var prev = cards.filter(function (c) { return c.classList.contains("is-up"); })[0];
    if (!isOpen) { tabBtns[k].setAttribute("aria-expanded", "true"); rowBtns[k].setAttribute("aria-expanded", "true"); }   /* the pressed tab shows «open» at once */
    var tl = gsap.timeline();
    running.push(tl);
    var at = 0;
    tabsHide(tl, 0);
    if (prev) {
      prev.classList.remove("is-open");
      tabBtns[cards.indexOf(prev)].setAttribute("aria-expanded", "false");
      rowBtns[cards.indexOf(prev)].setAttribute("aria-expanded", "false");
      at = sinkMoves(tl, cards.indexOf(prev), 0.05);
    }
    if (isOpen) { tabsShow(tl, at); return; }
    tl.add(function () {
      card.classList.add("is-up", "is-open"); card.classList.remove("is-seen");
      tabBtns[k].setAttribute("aria-expanded", "true"); rowBtns[k].setAttribute("aria-expanded", "true");
      barsOf(card).forEach(function (b) { gsap.set(b, { scaleX: fromOf(b) }); });
      ringsOf(card).forEach(function (m) { gsap.set(m, { strokeDashoffset: 1 }); });
      gsap.set(card, { visibility: "hidden" });
    }, at);
    var phone = !desk.matches;
    var t = moves(tl, k, at + 0.02, phone ? 0.95 : 1.05, 0.4, phone ? 0.85 : 0.95);
    tabsShow(tl, t);
    if (barsOf(card).length) { t = growBars(tl, card, t); t = ring(tl, card, t); }
    tl.add(function () { settleCard(card); }, t + 0.05);
  }
  tabBtns.forEach(function (b, i) { b.addEventListener("click", function () { toggle(i); }); });
  /* phone: the drawing's numbers are labels, the list rows are the buttons (one target per work, 44 × 44) */
  function tabsRole() {
    tabBtns.forEach(function (b) {
      if (desk.matches) { b.removeAttribute("tabindex"); b.removeAttribute("aria-hidden"); b.disabled = false; }
      else { b.setAttribute("tabindex", "-1"); b.setAttribute("aria-hidden", "true"); b.disabled = true; }   /* a label on the phone, not a control */
    });
  }
  tabsRole();
  if (desk.addEventListener) desk.addEventListener("change", tabsRole); else if (desk.addListener) desk.addListener(tabsRole);
  rowBtns.forEach(function (b, i) {
    b.addEventListener("click", function () {
      var r = stage.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight) stage.scrollIntoView({ block: "center", behavior: "smooth" });
      toggle(i);
    });
  });

  /* ------------------------------------------------ scenes in the page: one ScrollTrigger per block, once */
  function onEnter(el, play, start) {
    if (!el || !ST) return;
    ST.create({ trigger: el, start: start || "top 72%", once: true, onEnter: play });
  }
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.log("scene " + name + ": " + e.message); } }
  /* number counters of a scene: prepared when the page is built, run in the scene's timeline */
  function cnt(el, from) { return counter(el, from); }
  function runCnt(c, tl, at, dur, ease) { if (c) c.run(tl, at, dur, ease); }
  function popIn(tl, els, at, stag) {
    if (!els.length) return;
    tl.fromTo(els, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, stagger: stag || 0.05, ease: "power3.out", immediateRender: false }, at);
  }

  /* ------------------------------------------------ first screen: the four figures count, the pen arrows draw (once, on load) */
  function heroNums() {
    if (!animMode) return;
    var tl = gsap.timeline({ delay: 0.3 });
    var f0 = $(".fig-0 .to"), f1 = $$(".fig-1 .n .nw"), f2 = $(".fig-2 .n"), f3 = $$(".fig-3 .n .nw");
    var c0 = cnt(f0, [25, 30]), c1 = cnt(f1[f1.length - 1], [15, 20]), c2 = cnt(f2, [1.0]), c3 = cnt(f3[f3.length - 1], [0, 0]);
    var arr = $$(".figs .arr");
    gsap.set(arr, { clipPath: "inset(0% 100% 0% 0%)" });
    root.classList.add("figs-ready");
    arr.forEach(function (a, i) { tl.to(a, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "power2.inOut", onComplete: function () { gsap.set(a, { clearProps: "clipPath" }); } }, [0, 0.12, 0.24][i] || 0); });
    runCnt(c0, tl, 0, 1.6, "power3.out");        /* the drop is the point: the number falls from 25–30 to 8–17 (Р-348) */
    runCnt(c1, tl, 0.1, 1.4, "power2.out");
    runCnt(c2, tl, 0.2, 1.4, "power2.out");
    runCnt(c3, tl, 0.3, 1.4, "power2.out");
  }

  /* ------------------------------------------------ Х2 + Х3 + levers in ferma */
  function ferma() {
    if (!animMode || !ST) return;
    $$(".lv, .gr").forEach(function (lv) {
      var bars = barsOf(lv), pen = $$(".pen-l .mk", lv), grow = $$(".grow", lv), dots = $$(".sdot, .sv-1", lv), done = false;
      var vs = labelsOf(lv);
      var area = $(".area", lv), evms = $$(".evm", lv), evs = $$(".evs .ev", lv);
      var evTimes = [];
      bars.forEach(function (b) { gsap.set(b, { scaleX: fromOf(b) }); });
      gsap.set(vs, { opacity: 0 });
      pen.forEach(function (m) { gsap.set(m, { strokeDashoffset: 1 }); });
      grow.forEach(function (m) { gsap.set(m, { strokeDashoffset: 1 }); });
      gsap.set(dots, { opacity: 0 });
      if (area) gsap.set(area, { opacity: 0 });
      if (evms.length) {
        gsap.set(evms, { opacity: 0 });
        gsap.set($$("b", lv).filter(function (b) { return b.parentNode.classList.contains("evm"); }), { scale: 0.6 });
        gsap.set(evs, { opacity: 0, y: 6 });
        /* the moment the pen passes the marker's x: where the path first reaches it, through the ease of the line */
        var path = grow[0], ease = gsap.parseEase("power1.inOut");
        if (path && path.getTotalLength) {
          var L = path.getTotalLength();
          evms.forEach(function (e) {
            var X = parseFloat(e.style.left) / 100 * 860, lo = 0, hi = L, i;
            for (i = 0; i < 24; i++) { var mid = (lo + hi) / 2; if (path.getPointAtLength(mid).x < X) lo = mid; else hi = mid; }
            var f = hi / L, a = 0, z = 1;
            for (i = 0; i < 24; i++) { var tm = (a + z) / 2; if (ease(tm) < f) a = tm; else z = tm; }
            evTimes.push(z * 1.8);
          });
        }
      }
      function play(instant) {
        if (done) return;
        done = true;
        var tl = gsap.timeline();
        bars.forEach(function (b) { tl.to(b, { scaleX: 1, duration: instant ? 0.01 : 1.4, ease: "power3.out" }, 0); });
        vs.forEach(function (v) { tl.to(v, { opacity: 1, duration: instant ? 0.01 : 0.3, ease: "power1.out" }, instant ? 0 : 1.15); });
        pen.forEach(function (m) { tl.to(m, { strokeDashoffset: 0, duration: instant ? 0.01 : 0.6, ease: "power2.out" }, instant ? 0 : 1.1); });
        grow.forEach(function (m) { tl.to(m, { strokeDashoffset: 0, duration: instant ? 0.01 : 1.8, ease: "power1.inOut" }, 0); });
        if (dots.length) tl.to(dots, { opacity: 1, duration: instant ? 0.01 : 0.25, ease: "power1.out" }, instant ? 0 : 1.75);   /* the pen stops: a dot at the end */
        if (area) tl.to(area, { opacity: 0.45, duration: instant ? 0.01 : 0.8, ease: "power1.out" }, instant ? 0 : 1.7);   /* the hatched area after the line */
        evms.forEach(function (e, i) {
          var at = instant ? 0 : (evTimes[i] || 0.4 + i * 0.5);
          tl.to(e, { opacity: 1, duration: instant ? 0.01 : 0.2, ease: "power1.out" }, at);
          var b = $("b", e);
          if (b) tl.to(b, { scale: 1, duration: instant ? 0.01 : 0.35, ease: "power3.out" }, at);
          if (evs[i]) tl.to(evs[i], { opacity: 1, y: 0, duration: instant ? 0.01 : 0.35, ease: "power2.out" }, at + 0.05);
        });
        tl.add(function () { bars.forEach(function (b) { gsap.set(b, { clearProps: "transform" }); }); gsap.set(vs, { clearProps: "opacity" }); if (area) gsap.set(area, { clearProps: "opacity" }); gsap.set(evms.concat(evs), { clearProps: "opacity,transform" }); gsap.set($$(".evm b", lv), { clearProps: "transform" }); }, ">");
      }
      ST.create({ trigger: lv, start: lv.classList.contains("gr") ? "top 88%" : "top 65%", end: "bottom top", onEnter: function () { play(false); }, onLeave: function () { play(true); }, onEnterBack: function () { play(true); } });
    });
    safe(tilesScenes, "tiles");
    safe(funScene, "fun");
    safe(retScene, "ret");
  }

  /* levers 1 and 6: scale, rubles, ring, mini line — each tile is a scene of its own */
  function tilesScenes() {
    $$("[data-tiles]").forEach(function (box) {
      var sc = $(".sc", box), rub = $(".rub", box), rg = $(".ring", box), ml = $(".ml", box);
      var tiles = $$(".tile", box);
      var cs = tiles.map(function (t) { return cnt($(".stat1 dt .nw", t), 0); });
      if (sc) {
        gsap.set($(".sc-s", sc), { scaleX: 0 }); gsap.set($(".sc-h", sc), { scaleX: 0 });
        gsap.set($$(".sc-m, .sc-ax-s", sc), { opacity: 0 });
      }
      if (rub) {
        gsap.set($$(".rub-1 i", rub), { opacity: 0, scale: 0.4 });
        gsap.set($$(".rub-19 i", rub), { opacity: 0, scale: 0.4 });
        gsap.set($$("b", rub), { opacity: 0 });
      }
      var rs = rg && $(".rg-s", rg), rh = rg && $(".rg-h", rg);
      if (rg) {
        gsap.set(rs, { strokeDashoffset: 12 }); gsap.set(rh, { strokeDashoffset: 18 });
        gsap.set($(".rg-0", rg), { opacity: 0 });
      }
      var ml_l = ml && $(".ml-l", ml), ml_d = ml && $(".ml-d", ml);
      if (ml) { gsap.set(ml_l, { strokeDashoffset: 1 }); gsap.set(ml_d, { opacity: 0, scale: 0.3 }); gsap.set($(".ml-w", ml), { opacity: 0 }); }
      onEnter(box, function () {
        var tl = gsap.timeline();
        if (sc) {
          tl.to($(".sc-s", sc), { scaleX: 1, duration: 0.9, ease: "power3.out" }, 0);
          tl.to($(".sc-h", sc), { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0.9);
          tl.to($$(".sc-m, .sc-ax-s", sc), { opacity: 1, duration: 0.35, ease: "power1.out" }, 1.35);
          runCnt(cs[0], tl, 0, 1.3, "power3.out");
        }
        if (rub) {
          tl.to($$(".rub-1 i", rub), { opacity: 1, scale: 1, duration: 0.4, ease: "power3.out" }, 0.1);
          tl.to($$(".rub-1 b", rub), { opacity: 1, duration: 0.3 }, 0.35);
          tl.to($$(".rub-19 i", rub), { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: "power3.out" }, 0.6);
          tl.to($$(".rub-19 b", rub), { opacity: 1, duration: 0.35, ease: "power1.out" }, 0.6 + 19 * 0.05 + 0.1);
          runCnt(cs[1], tl, 0.6, 1.2, "power2.out");
        }
        if (rg) {
          tl.to(rs, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0);
          tl.to(rh, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, 0.9);
          tl.to($(".rg-0", rg), { opacity: 1, duration: 0.3 }, 0.2);
          runCnt(cs[0], tl, 0, 1.4, "power2.inOut");
        }
        if (ml) {
          tl.to(ml_l, { strokeDashoffset: 0, duration: 1.6, ease: "power1.inOut" }, 0);
          tl.to(ml_d, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }, 1.55);
          tl.to($(".ml-w", ml), { opacity: 1, duration: 0.3 }, 1.2);
          runCnt(cs[1], tl, 0, 1.6, "power1.inOut");
        }
        tl.add(function () {
          if (sc) gsap.set($$(".sc-s, .sc-h, .sc-m, .sc-ax-s", sc), { clearProps: "transform,opacity" });
          if (rub) gsap.set($$("i, b", rub), { clearProps: "transform,opacity" });
          if (rg) { gsap.set([rs, rh], { clearProps: "strokeDashoffset" }); gsap.set($(".rg-0", rg), { clearProps: "opacity" }); }
          if (ml) { gsap.set([ml_l, ml_d, $(".ml-w", ml)], { clearProps: "strokeDashoffset,transform,opacity" }); }
        }, ">");
      }, "top 78%");
    });
  }
  /* lever 3: the funnel — «было» fills quickly, the pen arrow, «стало» fills (the eye sees twice as many) */
  function funScene() {
    var fun = $("[data-fun]");
    if (!fun) return;
    var cs = $$(".fun-c", fun), was = cs[0], now = cs[1];
    var uw = $$(".u-s, .u-h", was), un = $$(".u-s, .u-h", now), mk = $$(".fun-a .mk", fun);
    var cw = cnt($(".fun-v .nw", was), 0), cn = cnt($(".fun-v .nw", now) || $(".fun-v", now), 0);
    gsap.set(uw.concat(un), { opacity: 0, scale: 0.3 });
    gsap.set(mk, { strokeDashoffset: 1 });
    onEnter(fun, function () {
      var tl = gsap.timeline();
      tl.to(uw, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.6 / Math.max(1, uw.length), ease: "power2.out" }, 0);
      runCnt(cw, tl, 0, 0.8, "power2.out");
      tl.to(mk, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" }, 0.75);
      tl.to(un, { opacity: 1, scale: 1, duration: 0.25, stagger: 1.0 / Math.max(1, un.length), ease: "power2.out" }, 1.3);
      runCnt(cn, tl, 1.3, 1.2, "power2.out");
      tl.add(function () { gsap.set(uw.concat(un), { clearProps: "transform,opacity" }); }, ">");
    }, "top 78%");
  }
  /* lever 2: bags drawn by the pen, then the rows: «было», then «при мне» goes on past it */
  /* lever 2: bag after bag — «было» two and a hatched half, «при мне» goes on to three and a hatched fourth */
  function retScene() {
    var r = $("[data-ret]");
    if (!r) return;
    var rows = $$(".ret-r", r), cap = $(".ret-c", r);
    var all = [];
    rows.forEach(function (row) { all.push({ bags: $$(".bg", row), v: $(".ret-v", row), k: $(".ret-k", row) }); });
    all.forEach(function (o) {
      gsap.set($$(".mk", o.bags[0] && o.bags[0].parentNode), { strokeDashoffset: 1 });
      gsap.set($$(".bg-f", o.bags[0] && o.bags[0].parentNode), { opacity: 0 });
      gsap.set([o.v, o.k], { opacity: 0 });
    });
    if (cap) gsap.set(cap, { opacity: 0 });
    onEnter(r, function () {
      var tl = gsap.timeline(), t = 0;
      all.forEach(function (o, ri) {
        tl.to(o.k, { opacity: 1, duration: 0.3 }, t);
        o.bags.forEach(function (b, i) {
          var at = t + 0.15 + i * 0.32;
          tl.to($(".mk", b), { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, at);
          tl.to($(".bg-f", b), { opacity: 1, duration: 0.3, ease: "power1.out" }, at + 0.3);
        });
        t += 0.15 + o.bags.length * 0.32 + 0.2;
        tl.to(o.v, { opacity: 1, duration: 0.35, ease: "power2.out" }, t - 0.1);
        t += ri === 0 ? 0.2 : 0;
      });
      if (cap) tl.to(cap, { opacity: 1, duration: 0.3 }, t);
      tl.add(function () { gsap.set($$(".mk, .bg-f, .ret-v, .ret-k, .ret-c", r).concat(cap ? [cap] : []), { clearProps: "opacity,strokeDashoffset" }); }, ">");
    }, "top 80%");
  }

  /* ------------------------------------------------ tablist (channels, portal): roving tabindex, ← → Home End; works without motion */
  function tabsCtl(tabs, panels, onSwitch) {
    var cur = 0;
    tabs.forEach(function (t, i) { if (t.getAttribute("aria-selected") === "true") cur = i; });
    panels.forEach(function (p, i) { p.hidden = i !== cur; });
    function select(i, opt) {
      opt = opt || {};
      if (i === cur && !opt.force) return;
      var prev = cur; cur = i;
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", j === i ? "true" : "false"); t.tabIndex = j === i ? 0 : -1; });
      onSwitch(i, prev, opt);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, { user: true }); });
      t.addEventListener("keydown", function (ev) {
        var n = tabs.length, to = -1;
        if (ev.key === "ArrowRight") to = (cur + 1) % n;
        else if (ev.key === "ArrowLeft") to = (cur - 1 + n) % n;
        else if (ev.key === "Home") to = 0;
        else if (ev.key === "End") to = n - 1;
        if (to < 0) return;
        ev.preventDefault();
        select(to, { user: true });
        tabs[to].focus();
      });
    });
    return { select: select, current: function () { return cur; } };
  }

  /* ------------------------------------------------ channels (block 12): one automatic pass, 3 s a tab, progress under the tab */
  function chanBlock() {
    var ch = $("[data-chan]");
    if (!ch) return;
    var tabs = $$(".ch-t", ch), panels = $$(".ch-p", ch), ps = $(".ch-ps", ch), btn = $(".ch-pause", ch);
    var pass = null, stopped = false, panelTl = null;
    var ctl = tabsCtl(tabs, panels, function (i, prev, opt) {
      if (opt.user) stopPass(true);
      panels[prev].hidden = true; panels[i].hidden = false;
      if (prev !== i) gsap.set($(".ch-pr", tabs[prev]), { clearProps: "transform" });   /* only the active tab carries the progress line */
      if (animMode) rowsIn(panels[i]);
    });
    /* motion-critic R338: the reserved height of the tallest panel read as an empty box (≈150–170 px under one-row panels); the panel takes its own height */
    function rowsIn(panel) {
      if (panelTl) panelTl.progress(1);
      var rows = $$(".ch-r", panel), un = $$(".ch-un, .ch-uw", panel), nums = $$(".ch-n", panel);
      var tl = gsap.timeline();
      panelTl = tl;
      tl.fromTo(rows, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power3.out", immediateRender: true }, 0);
      tl.fromTo(un, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power3.out", immediateRender: true }, 0.15);
      nums.forEach(function (n, i) { var c = cnt(n, 0); runCnt(c, tl, 0.08 * i, 0.9, "power2.out"); });
      tl.add(function () { gsap.set(rows.concat(un), { clearProps: "transform,opacity" }); }, ">");
    }
    function setStopped(on) {
      stopped = on;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      ch.classList.toggle("is-stopped", on);
    }
    function stopPass(byUser) {
      if (pass) { pass.kill(); pass = null; }
      gsap.set($$(".ch-pr", ch), { clearProps: "transform" });
      if (byUser !== false) setStopped(true);
    }
    function startPass(from) {
      if (!animMode) return;
      stopPass(false); setStopped(false);
      var t = 0;
      pass = gsap.timeline({ onComplete: function () { pass = null; setStopped(true); } });
      for (var i = from; i < tabs.length; i++) {
        (function (k) {
          pass.add(function () { ctl.select(k, { auto: true, force: k === from }); }, t);
          var dk = k === from ? 5 : 6;   /* motion-critic R338: 3 s changed the tab while it was being read */
          pass.fromTo($(".ch-pr", tabs[k]), { scaleX: 0 }, { scaleX: 1, duration: dk, ease: "none", immediateRender: false }, t);
          t += dk;
        })(i);
      }
    }
    btn.addEventListener("click", function () {
      if (!animMode) return;
      if (stopped) { var c = ctl.current(); startPass(c >= tabs.length - 1 ? 0 : c); }
      else stopPass(true);
    });
    if (animMode && ST) {
      var started = false;
      ST.create({ trigger: ch, start: "top 50%", end: "bottom 20%", onToggle: function (self) {
        if (self.isActive) { if (!started) { started = true; startPass(0); } else if (pass && !stopped) pass.resume(); }
        else if (pass) pass.pause();
      } });
    }
  }

  /* ------------------------------------------------ the week table (Р-357): 12 departments behind a switch.
     Entrance: the stamp presses, the four focuses of the week land one by one, the switch comes in; the first department's rows rise,
     each «% плана» counts up and only then the row takes its status tint (below — red, above — blue): the reader sees where the plan is met.
     A switch replays the same for the pressed department. Works without motion (instant switch); without JS every department stands open. */
  function weekScene() {
    var wk = $("[data-x5c]");
    if (!wk) return;
    var tabs = $$(".wk-t", wk), panels = $$(".wk-p", wk);
    if (!tabs.length) return;
    var stamp = $(".wk-stamp", wk), fx = $$(".wk-fx li", wk), leg = $(".wk-leg", wk), low = $$(".wk-low > *", wk), ai = $(".wk-ai span", wk);
    var cur = 0, rowsTl = null, entered = false;
    function rowsIn(panel) {
      if (rowsTl) rowsTl.progress(1);
      var body = $("tbody", panel), rows = $$("tr", body), nums = $$(".pc-v b", body);
      var tl = gsap.timeline(), n = rows.length, lit = 0.25 + n * 0.08 + 0.75;
      rowsTl = tl;
      body.classList.remove("lit");
      tl.fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", immediateRender: true }, 0);
      nums.forEach(function (b, i) { runCnt(cnt(b, 0), tl, 0.1 + i * 0.08, 0.9, "power2.out"); });
      tl.add(function () { body.classList.add("lit"); }, lit);
      tl.add(function () { gsap.set(rows, { clearProps: "transform,opacity" }); }, lit + 0.5);
    }
    function select(i) {
      if (i === cur) return;
      var prev = cur; cur = i;
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", j === i ? "true" : "false"); t.tabIndex = j === i ? 0 : -1; });
      panels[prev].removeAttribute("data-on");
      panels[i].setAttribute("data-on", "");
      if (animMode) { entered = true; rowsIn(panels[i]); }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (ev) {
        var n = tabs.length, to = -1;
        if (ev.key === "ArrowRight") to = (cur + 1) % n;
        else if (ev.key === "ArrowLeft") to = (cur - 1 + n) % n;
        else if (ev.key === "Home") to = 0;
        else if (ev.key === "End") to = n - 1;
        if (to < 0) return;
        ev.preventDefault();
        select(to);
        tabs[to].focus();
      });
    });
    if (!animMode || !ST) return;
    var body0 = $("tbody", panels[0]), rows0 = $$("tr", body0);
    if (stamp) gsap.set(stamp, { opacity: 0, scale: 1.3, rotation: -6 });
    gsap.set(fx, { opacity: 0, y: -14, scale: 1.12 });
    gsap.set(tabs, { autoAlpha: 0, y: 8 });   /* hidden tabs are not a press target */
    if (leg) gsap.set(leg, { opacity: 0 });
    gsap.set(rows0, { opacity: 0, y: 12 }); body0.classList.remove("lit");
    gsap.set(low, { opacity: 0, y: 18 });
    if (ai) gsap.set(ai, { opacity: 0, y: 12 });
    onEnter(wk, function () {
      var tl = gsap.timeline();
      if (stamp) tl.to(stamp, { opacity: 1, scale: 1, rotation: -2, duration: 0.55, ease: "power3.out", onComplete: function () { gsap.set(stamp, { clearProps: "transform,opacity" }); } }, 0);
      tl.to(fx, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.22, ease: "back.out(1.6)" }, 0.35);
      tl.add(function () { gsap.set(fx, { clearProps: "transform,opacity" }); }, ">");
    }, "top 75%");
    onEnter($(".wk-main", wk), function () {
      var tl = gsap.timeline();
      tl.to(tabs, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.035, ease: "power2.out" }, 0);
      if (leg) tl.to(leg, { opacity: 1, duration: 0.4 }, 0.35);
      tl.add(function () { gsap.set(tabs.concat(leg ? [leg] : []), { clearProps: "transform,opacity,visibility" }); }, ">");
      if (!entered && cur === 0) { entered = true; tl.add(function () { rowsIn(panels[0]); }, 0.3); }
      else { gsap.set(rows0, { clearProps: "transform,opacity" }); body0.classList.add("lit"); }
    }, "top 72%");
    onEnter($(".wk-low", wk), function () {
      gsap.to(low, { opacity: 1, y: 0, duration: 0.6, stagger: 0.18, ease: "power3.out", onComplete: function () { gsap.set(low, { clearProps: "transform,opacity" }); } });
    }, "top 82%");
    if (ai) onEnter(ai, function () {
      gsap.to(ai, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", onComplete: function () { gsap.set(ai, { clearProps: "transform,opacity" }); } });
    }, "top 90%");
  }
  function archScene() {
    var ar = $("[data-arch]");
    if (!ar || !animMode) return;
    var cols = $$(".ar-c", ar), arr = $$(".ar-a .mk", ar);
    gsap.set(cols, { opacity: 0, y: 16 }); gsap.set(arr, { strokeDashoffset: 1 });
    onEnter(ar, function () {
      var tl = gsap.timeline();
      cols.forEach(function (c, i) {
        tl.to(c, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, i * 0.62);
        if (arr[i]) tl.to(arr[i], { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, i * 0.62 + 0.4);
      });
      var last = cols[cols.length - 1], te = (cols.length - 1) * 0.62 + 0.6;
      tl.to(last, { scale: 1.015, duration: 0.25, ease: "power2.out", transformOrigin: "50% 50%" }, te).to(last, { scale: 1, duration: 0.4, ease: "power2.inOut" }, te + 0.25);
      tl.add(function () { gsap.set(cols.concat(arr), { clearProps: "transform,opacity,strokeDashoffset" }); }, ">");
    }, "top 78%");
  }

  /* ------------------------------------------------ works 02–06 (Р-329) and the live part (Р-338) */
  function worksMotion() {
    if (!animMode || !ST) return;
    var org = $("[data-x5]");
    if (org) {
      var trs = $$(".tr", org), brs = $$(".brn", org);
      gsap.set(trs, { scaleY: 0 }); gsap.set(brs, { scaleX: 0 });
      onEnter(org, function () {
        var tl = gsap.timeline();
        trs.forEach(function (t, i) { tl.to(t, { scaleY: 1, duration: 0.22, ease: "none" }, i * 0.2); });
        brs.forEach(function (b, i) { tl.to(b, { scaleX: 1, duration: 0.3, ease: "power2.out" }, i * 0.2 + 0.14); });
        tl.add(function () { gsap.set(trs.concat(brs), { clearProps: "transform" }); });
      });
    }
    var rh = $("[data-x5b]");
    if (rh) {
      var ar = $$(".pd .mk", rh), ret = $(".lret", rh), head = $$(".lh .mk", rh);
      gsap.set(ar.concat(head), { strokeDashoffset: 1 }); gsap.set(ret, { scaleY: 0 });
      onEnter(rh, function () {
        var tl = gsap.timeline();
        ar.forEach(function (m, i) { tl.to(m, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, 0.2 + i * 0.4); });
        tl.to(ret, { scaleY: 1, duration: 0.9, ease: "power2.inOut" }, 0.2 + ar.length * 0.4);
        tl.to(head, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, ">-0.05");
        tl.add(function () { gsap.set(ret, { clearProps: "transform" }); });
      });
    }
    var fl = $("[data-x6]");
    if (fl) {
      var fa = $$(".pr .mk", fl);
      gsap.set(fa, { strokeDashoffset: 1 });
      onEnter(fl, function () {
        var tl = gsap.timeline();
        fa.forEach(function (m, i) { tl.to(m, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" }, 0.15 + i * 0.45); });
      }, "top 80%");
    }
    var rail = $("[data-x8]");
    if (rail) {
      var seq = $$(".st-i, .st-a", rail).filter(function (x) { return !x.classList.contains("st-ok"); });
      var stamp = $(".st-stamp", rail);
      var all = $$(".mk", rail);
      gsap.set(all, { strokeDashoffset: 1 });
      if (stamp) gsap.set(stamp, { opacity: 0.55 });   /* the stamp is seen from the start, the end of the move presses it */
      onEnter(rail, function () {
        var tl = gsap.timeline(), t = 0.15;
        seq.forEach(function (x) {
          var ms = $$(".mk", x);
          if (x.classList.contains("st-i")) { tl.to(ms, { strokeDashoffset: 0, duration: 0.2, ease: "power1.inOut" }, t); t += 0.18; return; }
          var fwd = ms.filter(function (m) { return !m.classList.contains("mk-back"); }), back = ms.filter(function (m) { return m.classList.contains("mk-back"); });
          tl.to(fwd, { strokeDashoffset: 0, duration: 0.16, ease: "power1.inOut" }, t); t += 0.14;
          if (back.length) { tl.to(back, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, t + 0.2); t += 1.0; }   /* the judge: one step back */
        });
        if (stamp) tl.fromTo(stamp, { opacity: 0.55, scale: 1.18, rotation: -6 }, { opacity: 1, scale: 1, rotation: -3, duration: 0.5, ease: "power3.out" }, t + 0.05);
        tl.add(function () { if (stamp) gsap.set(stamp, { clearProps: "transform,opacity" }); });
      }, "top 88%");
    }
    safe(archScene, "arch");
    $$("[data-reveal]").forEach(function (f) {
      var img = $("picture, img", f);
      if (!img) return;
      gsap.set(img, { clipPath: "inset(0% 0% 100% 0%)" });
      onEnter(f, function () { gsap.to(img, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power2.out", onComplete: function () { gsap.set(img, { clearProps: "clipPath" }); } }); }, "top 85%");
    });
  }

  /* ------------------------------------------------ portal (work 02): sections change by themselves, the screenshot pans */
  function portalBlock() {
    var pt = $("[data-portal]");
    if (!pt) return;
    var tabs = $$(".pt-t", pt), panels = $$(".pt-p", pt), btn = $(".pt-pause", pt);
    var pass = null, stopped = false, fade = null, pans = [], shown = 0, inView = false;
    var imgs = panels.map(function (p) { return $(".pt-img img", p); });
    function load() { imgs.forEach(function (im) { if (im && im.loading === "lazy") im.loading = "eager"; }); }
    function panFor(i) {
      if (pans[i]) return pans[i];
      var im = imgs[i], fr = im && im.parentNode && im.closest(".pt-img");
      if (!im || !fr) return null;
      var over = im.offsetHeight - fr.offsetHeight;
      if (over < 6) return null;
      pans[i] = gsap.to(im, { y: -over, duration: Math.max(6, over / 40), ease: "sine.inOut", repeat: -1, yoyo: true, repeatDelay: 0.6, paused: true });
      return pans[i];
    }
    function panAll(on) {
      pans.forEach(function (p, i) { if (!p) return; if (on && i === shown) p.play(); else p.pause(); });
    }
    function reset(i) { var p = pans[i]; if (p) { p.pause(0); } if (imgs[i]) gsap.set(imgs[i], { y: 0 }); }
    function show(i, prev, opt) {
      shown = i;
      var np = panels[i], op = panels[prev];
      if (i !== prev && animMode) gsap.set($(".ch-pr", tabs[prev]), { clearProps: "transform" });
      if (i === prev) { np.hidden = false; return; }
      if (!animMode) { op.hidden = true; np.hidden = false; return; }
      if (fade) fade.progress(1);
      np.hidden = false;
      var tl = gsap.timeline({ onComplete: function () { op.hidden = true; gsap.set(op, { clearProps: "opacity,pointerEvents,y" }); reset(prev); gsap.set(np, { clearProps: "transform,opacity" }); if (!opt.user && !stopped && inView) { var pn = panFor(i); if (pn) pn.play(0); } } });
      fade = tl;
      tl.set(op, { pointerEvents: "none" }, 0);
      tl.to(op, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, 0);
      tl.fromTo(np, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", immediateRender: true }, 0);
      if (opt.user && pans[i]) pans[i].pause(0);
    }
    var ctl = tabsCtl(tabs, panels, function (i, prev, opt) { if (opt.user) stopPass(true); show(i, prev, opt); });
    function setStopped(on) { stopped = on; btn.setAttribute("aria-pressed", on ? "true" : "false"); pt.classList.toggle("is-stopped", on); }
    function stopPass(user) {
      if (pass) { pass.kill(); pass = null; }
      gsap.set($$(".ch-pr", pt), { clearProps: "transform" });
      panAll(false);
      if (user !== false) setStopped(true);
    }
    function startPass() {
      if (!animMode) return;
      stopPass(false); setStopped(false);
      var n = tabs.length, rounds = 2, t = 0, i, k;
      pass = gsap.timeline({ onComplete: function () { pass = null; panAll(false); setStopped(true); } });
      for (i = 0; i < n * rounds; i++) {
        (function (step) {
          k = (ctl.current() + step) % n;
          var kk = k;
          pass.add(function () { ctl.select(kk, { auto: true, force: step === 0 }); if (step === 0) { var p0 = panFor(kk); if (p0) p0.play(0); } }, t);
          pass.fromTo($(".ch-pr", tabs[kk]), { scaleX: 0 }, { scaleX: 1, duration: 6.5, ease: "none", immediateRender: false }, t);
          t += 6.5;   /* a dense dashboard needs 6.5 s, not 4.5 (motion-critic R338) */
        })(i);
      }
      /* the last dwell ends on the first section again */
      pass.add(function () { ctl.select(0, { auto: true }); }, t);
    }
    btn.addEventListener("click", function () {
      if (!animMode) return;
      if (stopped) startPass(); else stopPass(true);
    });
    if (animMode && ST) {
      var started = false;
      ST.create({ trigger: pt, start: "top 150%", once: true, onEnter: load });
      ST.create({ trigger: pt, start: "top 65%", end: "bottom 20%", onToggle: function (self) {
        inView = self.isActive;
        if (self.isActive) { if (!started) { started = true; startPass(); } else if (pass && !stopped) { pass.resume(); panAll(true); } }
        else { if (pass) pass.pause(); panAll(false); }
      } });
      window.addEventListener("resize", function () { pans.forEach(function (p) { if (p) p.kill(); }); pans = []; });
    }
  }

  /* ------------------------------------------------ live embeds (Р-346): the real deck and the real sites play in their frames.
     The copy is drawn at its own width (data-w × data-h) and scaled into the frame, so the deck and the sites keep their desktop layout.
     A shield over the frame keeps the page's wheel: the visitor scrolls past without being caught; a press hands the frame over (Esc or leaving gives it back).
     Phone: a poster with a press to play — nothing heavy loads unasked. */
  var embFine = window.matchMedia("(hover: hover) and (pointer: fine)");
  function embPhone() { return !desk.matches || !embFine.matches; }
  function embFit(e) {
    var k = e.clientWidth / (+e.getAttribute("data-w") || 1440);
    e.style.setProperty("--k", k.toFixed(5));
  }
  function embWin(e) { try { return e._f && e._f.contentWindow; } catch (err) { return null; } }
  /* Р-350: the frame is never white. The site's poster stays until the copy has loaded and painted; over it a thin bar «загружается…».
     The bar has no real byte count (an iframe gives none): it eases towards 92 % and closes on load. */
  function embBar(host) {
    var ld = $(".emb-ld", host);
    if (!ld) {
      ld = document.createElement("span");
      ld.className = "emb-ld"; ld.setAttribute("aria-hidden", "true");
      ld.innerHTML = '<span class="emb-ld-t">загружается…</span><span class="emb-ld-b"><i></i></span>';
      host.appendChild(ld);
    }
    var i = $("i", ld);
    host.classList.add("is-loading");
    if (animMode) gsap.fromTo(i, { scaleX: 0.04 }, { scaleX: 0.92, duration: 24, ease: "power3.out", overwrite: true });
    return function done() {
      if (animMode) gsap.to(i, { scaleX: 1, duration: 0.3, ease: "power1.out", overwrite: true });
      host.classList.remove("is-loading");
    };
  }
  /* after load: two frames of the copy's own paint (or 400 ms, if the browser holds an off-screen frame), then the crossfade */
  function embPainted(f, cb) {
    var fired = false;
    function go() { if (!fired) { fired = true; cb(); } }
    window.setTimeout(go, 400);
    try { var w = f.contentWindow; w.requestAnimationFrame(function () { w.requestAnimationFrame(go); }); } catch (err) { go(); }
  }
  function embLoad(e, cb) {
    if (e._f) { if (cb) { if (e._ready) cb(); else e._q.push(cb); } return; }
    var f = document.createElement("iframe");
    var cap = e.closest("figure") ? $("figcaption", e.closest("figure")) : null;
    f.title = cap ? cap.firstChild.textContent.trim() : "Партнёрская презентация для поставщика";
    f.style.width = e.getAttribute("data-w") + "px";
    f.style.height = e.getAttribute("data-h") + "px";
    f.setAttribute("tabindex", "-1");
    f.inert = true;
    e._f = f; e._q = cb ? [cb] : [];
    var done = embBar(e);
    f.addEventListener("load", function () {
      e._ready = true;
      embPainted(f, function () { done(); e.classList.add("is-live"); });   /* the copy covers the poster only once it is drawn */
      var w = embWin(e);
      if (w) {
        w.addEventListener("keydown", function (ev) { if (ev.key === "Escape") embOff(e, true); });
        try {   /* the copy's cookie banner is the site's, not the work: it would cover the screen */
          var st = w.document.createElement("style");
          st.textContent = '.cookie,[aria-label="Cookies"]{display:none!important}html{scrollbar-width:none}html::-webkit-scrollbar{display:none}';
          w.document.head.appendChild(st);
        } catch (err) {}
      }
      var q = e._q; e._q = []; q.forEach(function (fn) { fn(); });
    });
    f.src = e.getAttribute("data-src");
    e.insertBefore(f, $(".emb-sh", e));
    embFit(e);
  }
  function embOn(e) {
    if (!e._f) return;
    e.classList.add("is-on"); e._f.inert = false;
    try { e._f.focus(); var w = embWin(e); if (w) w.focus(); } catch (err) {}
    if (e._onOn) e._onOn();
  }
  function embOff(e, byKey) {
    if (!e.classList.contains("is-on")) return;
    e.classList.remove("is-on"); if (e._f) e._f.inert = true;
    if (byKey) $(".emb-sh", e).focus();
    if (e._onOff) e._onOff();
  }
  /* Р-350: the poster is fetched four screens ahead, the copy two and a half screens ahead and only after its poster,
     so on a slow network the poster's bytes come first and a fast scroll meets a picture, not a white sheet */
  function embPosters(el) { return $$(".scr-po", el); }
  function embPrime(el) {
    embPosters(el).forEach(function (im) { if (im.loading === "lazy") { im.fetchPriority = "high"; im.loading = "eager"; } });
  }
  function embAfterPosters(el, fn) {
    var ims = embPosters(el).filter(function (im) { return !im.complete; }), left = ims.length, fired = false;
    function go() { if (!fired) { fired = true; fn(); } }
    if (!left) { go(); return; }
    window.setTimeout(go, 3000);
    ims.forEach(function (im) {
      function one() { left -= 1; if (left <= 0) go(); }
      im.addEventListener("load", one, { once: true }); im.addEventListener("error", one, { once: true });
    });
  }
  function embWatch(el, onNear, onView) {
    if (!("IntersectionObserver" in window)) { embPrime(el); onNear(); onView(true); return; }
    var far = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { far.disconnect(); embPrime(el); } }, { rootMargin: "400% 0px 400% 0px" });
    far.observe(el);
    /* a flick past the block starts nothing: the copy loads once the scroll has stayed within 2.5 screens for 0.4 s,
       so the sites flown over do not take the bandwidth from the poster the reader is heading to */
    var settle = null;
    var near = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) {
        embPrime(el);
        if (!settle) settle = window.setTimeout(function () { near.disconnect(); embAfterPosters(el, onNear); }, 400);
      } else if (settle) { window.clearTimeout(settle); settle = null; }
    }, { rootMargin: "250% 0px 250% 0px" });
    near.observe(el);
    new IntersectionObserver(function (es) { onView(es[0].isIntersecting); }, { rootMargin: "-15% 0px -15% 0px" }).observe(el);
  }
  /* full screen: the frame itself (Fullscreen API); without it, or on a phone, a dialog with the copy; without JS the link opens the copy */
  var embDlg = null;
  function embDialog(e, idx) {
    if (typeof HTMLDialogElement !== "function") return false;
    if (!embDlg) {
      embDlg = document.createElement("dialog");
      embDlg.className = "zoomd embd";
      embDlg.innerHTML = '<img class="embd-po" alt=""><iframe title="Работа на весь экран"></iframe><button class="zd-x" type="button" aria-label="Закрыть">×</button>';
      document.body.appendChild(embDlg);
      $(".zd-x", embDlg).addEventListener("click", function () { embDlg.close(); });
      embDlg.addEventListener("close", function () { var f0 = $("iframe", embDlg); f0.onload = null; f0.removeAttribute("src"); embDlg.classList.remove("is-live"); });
    }
    var f = $("iframe", embDlg), po = $(".scr-po", e), done;
    $(".embd-po", embDlg).src = po ? (po.currentSrc || po.src) : "";   /* the same poster as in the frame, under the bar, until the copy is drawn */
    embDlg.classList.remove("is-live");
    f.onload = function () {
      embPainted(f, function () { done(); embDlg.classList.add("is-live"); });
      if (idx) {   /* a chapter: the deck on a phone is one long page, the chapter is scrolled to */
        try { var sl = $$("#slides-track > .slide, #slides-track > .section", f.contentWindow.document)[idx]; if (sl) window.setTimeout(function () { sl.scrollIntoView({ block: "start" }); }, 300); } catch (err) {}
      }
    };
    f.src = e.getAttribute("data-src");
    embDlg.showModal();
    done = embBar(embDlg);
    return true;
  }
  function embFull(e, ev) {
    if (!embPhone() && e.requestFullscreen) {
      ev.preventDefault();
      embLoad(e, function () { e.requestFullscreen().then(function () { embOn(e); }).catch(function () {}); });
      return;
    }
    if (embDialog(e)) ev.preventDefault();
  }
  document.addEventListener("fullscreenchange", function () {
    $$(".emb").forEach(function (e) { if (document.fullscreenElement !== e) { embFit(e); embOff(e); } });
  });
  window.addEventListener("resize", function () { $$(".emb").forEach(embFit); });

  /* the deck (work 03): leafs itself every 7 s while in view; arrows, chapters and keys leaf the real deck inside */
  function deckBlock() {
    $$("[data-emb-deck]").forEach(function (blk) {
      var e = $(".emb", blk), sh = $(".emb-sh", e), hint = $(".emb-hint", e);
      var n = $(".sc-n", blk), tot = $(".sc-t", blk), prev = $(".sb-p", blk), next = $(".sb-n", blk), play = $(".sb-play", blk), prog = $(".sprog i", blk);
      var chs = $$(".dch", blk), open = $(".emb-open", blk);
      var cur = 0, count = 32, auto = null, stopped = !animMode, inView = false, started = false;
      function doc() { var w = embWin(e); return w ? w.document : null; }
      function vert() { var w = embWin(e); return !w || w.matchMedia("(max-width: 900px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches; }
      function ui() {
        n.textContent = String(cur + 1); tot.textContent = String(count);
        prev.disabled = cur <= 0; next.disabled = cur >= count - 1;
        chs.forEach(function (c) { if (+c.getAttribute("data-go") === cur) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current"); });
      }
      function key(k) {
        var w = embWin(e); if (!w) return;
        w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
      }
      function go(i) {
        var d = doc(); if (!d || i < 0 || i >= count || i === cur) return;
        if (i === cur + 1) { key("ArrowRight"); return; }
        if (i === cur - 1) { key("ArrowLeft"); return; }
        var sl = $$("#slides-track > .slide, #slides-track > .section", d)[i];
        if (!sl) return;
        if (vert()) { sl.scrollIntoView({ block: "start" }); cur = i; ui(); return; }
        if (!sl.id) sl.id = "emb-s" + i;
        var a = $('nav a[href^="#"], a[href^="#"]', d), was = a.getAttribute("href");
        a.setAttribute("href", "#" + sl.id); a.click(); a.setAttribute("href", was);   /* the deck's own anchor jump: its slide transition plays */
      }
      function hook() {
        var d = doc(); if (!d) return;
        var c = $("#slide-current", d), t = $$("#slides-track > .slide, #slides-track > .section", d);
        count = t.length || count;
        if (vert()) blk.classList.add("is-vert");
        if (c) {
          new MutationObserver(function () { cur = Math.max(0, (parseInt(c.textContent, 10) || 1) - 1); ui(); }).observe(c, { childList: true, characterData: true, subtree: true });
        }
        ui();
        if (animMode && !vert() && inView && !started) startAuto();
      }
      function stopAuto(user) {
        if (auto) { auto.kill(); auto = null; }
        if (animMode) gsap.set(prog, { scaleX: 0 });
        if (user !== false) { stopped = true; play.setAttribute("aria-pressed", "true"); }
      }
      function startAuto() {
        if (!animMode || !e._ready || vert()) return;
        started = true;
        stopAuto(false); stopped = false; play.setAttribute("aria-pressed", "false");
        if (cur >= count - 1) go(0);
        auto = gsap.timeline({ repeat: -1, delay: cur === 0 ? 3 : 0 });   /* the cover's own intro runs ~4 s: slide 1 is read before the first turn */
        auto.fromTo(prog, { scaleX: 0 }, { scaleX: 1, duration: 7, ease: "none", immediateRender: false }, 0);   /* 7 s a slide: read before it turns (motion-critic R338) */
        auto.add(function () { if (cur >= count - 1) { stopAuto(true); gsap.set(prog, { scaleX: 1 }); } else key("ArrowRight"); }, 7);
        if (!inView) auto.pause();
      }
      var hooked = false;
      function ensure(fn) { embLoad(e, function () { if (!hooked) { hooked = true; hook(); } if (fn) fn(); }); }
      function user(fn) { stopAuto(true); ensure(fn); }
      prev.addEventListener("click", function () { user(function () { go(cur - 1); }); });
      next.addEventListener("click", function () { user(function () { go(cur + 1); }); });
      chs.forEach(function (c) {
        c.addEventListener("click", function () {
          var i = +c.getAttribute("data-go");
          if (embPhone() && embDialog(e, i)) return;
          user(function () { go(i); });
        });
      });
      play.addEventListener("click", function () { if (stopped) ensure(startAuto); else stopAuto(true); });
      open.addEventListener("click", function (ev) { stopAuto(true); embFull(e, ev); });
      e._onOn = function () { stopAuto(true); };
      if (embPhone()) {
        hint.textContent = "Смотреть презентацию";
        sh.addEventListener("click", function () { embDialog(e); });
        prev.hidden = next.hidden = play.hidden = true;
        $(".scount", blk).hidden = true; $(".sprog", blk).hidden = true;
        return;
      }
      sh.addEventListener("click", function () { ensure(function () { embOn(e); }); });
      e.addEventListener("pointerleave", function () { embOff(e); });
      embWatch(blk, function () { if (animMode) ensure(); }, function (v) {   /* reduced motion: the poster stays, a press loads the deck */
        inView = v;
        if (!auto) { if (v && !started && !stopped && e._ready) startAuto(); return; }
        if (v && !stopped) auto.resume(); else auto.pause();
      });
      ui();
    });
  }

  /* the sites (works 04, 06): the copy scrolls itself top to bottom, its own scroll scenes play; a press gives the page to the visitor */
  function devsBlocks() {
    $$("[data-devs]").forEach(function (block) {
      var btn = $(".dev-pause", block), items = [], inView = false, byBtn = !animMode;   /* Р-350: the phone loads ahead and plays like the desktop; reduced motion — the poster until a press */
      function mark(scr) {
        var w = scr.clientWidth, h = scr.clientHeight;
        scr.setAttribute("data-screen", "0,0 " + w + ",0 " + w + "," + h + " 0," + h);
      }
      function markAll() { $$(".scr[data-scroll]", block).forEach(mark); }
      markAll();
      window.addEventListener("resize", markAll);
      if (btn) btn.setAttribute("aria-pressed", byBtn ? "true" : "false");
      function eff() {
        items.forEach(function (it) {
          if (!it.tl) return;
          if (inView && !byBtn && !it.hold) it.tl.resume(); else it.tl.pause();
        });
      }
      $$(".emb[data-tour]", block).forEach(function (e) {
        var it = { e: e, p: { v: 0 }, tl: null, hold: false, max: 0 };
        items.push(it);
        function win() { return embWin(e); }
        function measure() { var w = win(); if (!w) return 0; var se = w.document.scrollingElement || w.document.documentElement; it.max = Math.max(0, se.scrollHeight - w.innerHeight); return it.max; }
        function put() {
          var w = win(); if (!w) return;
          var y = Math.round(it.max * it.p.v);
          if (w.lenis && typeof w.lenis.scrollTo === "function") w.lenis.scrollTo(y, { immediate: true, force: true }); else w.scrollTo(0, y);
        }
        function cycle(from, wait) {
          if (it.tl) it.tl.kill();
          if (!animMode || !measure()) return;
          var H = +e.getAttribute("data-h"), dur = Math.max(10, 2.6 * it.max / H);   /* ~2.6 s a screen: each of the site's scenes is seen as an event */
          it.p.v = from;
          it.tl = gsap.timeline({ paused: true, onComplete: function () { cycle(0, 1.5); } });
          it.tl.to({}, { duration: wait })
            .add(measure)
            .to(it.p, { v: 1, duration: dur * (1 - from) + 0.01, ease: from > 0 ? "sine.out" : "sine.inOut", onUpdate: put })
            .to({}, { duration: 2 })
            .to(it.p, { v: 0, duration: 3, ease: "sine.inOut", onUpdate: put });
          eff();
        }
        function here() { var w = win(); if (!w || !it.max) return 0; return Math.max(0, Math.min(1, (w.scrollY || 0) / it.max)); }
        function start() { cycle(0, 2.5); }   /* 2.5 s: the site's own first screen plays before the page moves */
        it.start = start;
        e._onOn = function () { it.hold = true; eff(); };
        e._onOff = function () { it.hold = false; if (it.tl) { measure(); cycle(here(), 0.6); } };
        var sh = $(".emb-sh", e), hint = $(".emb-hint", e);
        if (embPhone()) {
          hint.textContent = "Смотреть вживую";
          sh.addEventListener("click", function () {
            if (!e._f) {   /* one press wakes every screen of the block */
              items.forEach(function (x) { if (!x.e._f) { x.e.classList.add("is-asked"); embLoad(x.e, x.start); } });
              byBtn = false; if (btn) btn.setAttribute("aria-pressed", "false"); eff(); return;
            }
            byBtn = !byBtn; if (btn) btn.setAttribute("aria-pressed", byBtn ? "true" : "false"); eff();
          });
          if (animMode) embWatch(block, function () { embLoad(e, start); }, function () {});
          return;
        }
        sh.addEventListener("click", function () { embLoad(e, function () { embOn(e); }); });
        e.addEventListener("pointerenter", function (ev) { if (ev.pointerType === "mouse") { it.hold = true; eff(); } });
        e.addEventListener("pointerleave", function () { if (e.classList.contains("is-on")) embOff(e); else { it.hold = false; eff(); } });
        if (animMode) embWatch(block, function () { embLoad(e, start); }, function () {});
      });
      embWatch(block, function () {}, function (v) { inView = v; eff(); });
      $$(".emb-open", block).forEach(function (a) {
        var e = $(".emb", a.closest("figure"));
        a.addEventListener("click", function (ev) { embFull(e, ev); });
      });
      if (btn) btn.addEventListener("click", function () {
        byBtn = !byBtn; btn.setAttribute("aria-pressed", byBtn ? "true" : "false");
        if (!byBtn) items.forEach(function (it) { if (!it.e._f) { it.e.classList.add("is-asked"); embLoad(it.e, it.start); } });
        eff();
      });
    });
  }

  /* the slide large on a press (S11 R5-7): a dialog over the page; without JS or <dialog> the link opens the frame itself */
  (function () {
    var links = $$("[data-zoom]");
    if (!links.length || typeof HTMLDialogElement !== "function") return;
    var dlg = document.createElement("dialog"), back = null;
    dlg.className = "zoomd";
    dlg.innerHTML = '<div class="zd-in"><img alt=""></div><button class="zd-x" type="button" aria-label="Закрыть">×</button>';
    document.body.appendChild(dlg);
    var img = $("img", dlg);
    function close() { dlg.close(); }
    $(".zd-x", dlg).addEventListener("click", close);
    dlg.addEventListener("click", function (ev) { if (ev.target === dlg || ev.target.classList.contains("zd-in")) close(); });
    dlg.addEventListener("close", function () { img.removeAttribute("src"); if (back) back.focus(); });
    links.forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        back = a;
        var src = $("img", a.parentNode);
        img.src = a.getAttribute("href");
        img.alt = src ? src.alt : "";
        dlg.showModal();
        var box = $(".zd-in", dlg);
        box.scrollLeft = 0;
      });
    });
  })();

  /* the layer «Что ловит судья» is open without JS; with JS it opens on a press */
  $$("details.judge").forEach(function (d) { d.open = false; });

  /* Х4: the header tab of the work in view */
  (function () {
    if (!("IntersectionObserver" in window)) return;
    var tabs = $$(".tabs .tab"), map = {};
    tabs.forEach(function (t) { map[t.getAttribute("href").slice(1)] = t; });
    var secs = ["ferma", "ferma-team", "stm", "deck", "factory", "floor", "antishkola"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var io = new IntersectionObserver(function () {
      var mid = window.innerHeight * 0.4, on = null;
      secs.forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) on = s.id === "ferma-team" ? "ferma" : s.id; });
      tabs.forEach(function (t) { if (map[on] === t) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current"); });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-40% 0px -59% 0px" });
    secs.forEach(function (s) { io.observe(s); });
  })();

  /* controls that work with and without motion */
  safe(chanBlock, "chan");
  safe(weekScene, "week");
  safe(portalBlock, "portal");
  safe(deckBlock, "deck");
  safe(devsBlocks, "devs");
  /* every frame's poster four screens ahead, also where nothing loads unasked (phone deck, reduced motion) */
  safe(function () {
    if (!("IntersectionObserver" in window)) { $$(".emb").forEach(embPrime); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); embPrime(x.target); } });
    }, { rootMargin: "400% 0px 400% 0px" });
    $$(".emb").forEach(function (e) { io.observe(e); });
  }, "posters");

  /* ------------------------------------------------ start */
  if (animMode) {
    try {
      /* the stamp lands on the category line (0.3 s, once): the first screen has life while the drawer waits below the fold on a phone */
      var photo = $(".photo"), clip = $(".clip");
      if (photo) {                                                    /* the photo card is pinned to the sheet at 1.0 s */
        gsap.fromTo(photo, { opacity: 0, y: -18, rotation: -5 }, { opacity: 1, y: 0, rotation: -1.4, duration: 0.8, delay: 1.0, ease: "power3.out", onComplete: function () { root.classList.add("pinned"); gsap.set(photo, { clearProps: "transform,opacity" }); } });
        if (clip) gsap.fromTo(clip, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.35, delay: 1.55, ease: "power2.out", onComplete: function () { gsap.set(clip, { clearProps: "opacity,transform" }); } });
      }
      var stamp = $(".stamp");
      if (stamp) gsap.fromTo(stamp, { opacity: 0, scale: 1.3, rotation: -6 }, { opacity: 1, scale: 1, rotation: -2, duration: 0.55, delay: 0.35, ease: "power3.out", onComplete: function () { root.classList.add("stamped"); gsap.set(stamp, { clearProps: "transform,opacity" }); } });
      safe(heroNums, "hero");
      ferma();
      worksMotion();
      var start = function () {
        var go = function () { intro(); };
        if (!("IntersectionObserver" in window)) { go(); return; }
        var r = stage.getBoundingClientRect(), vh = window.innerHeight;
        var phone = !desk.matches;
        if (phone ? r.top < vh * 0.7 : (Math.min(vh, r.bottom) - Math.max(0, r.top)) / Math.min(r.height, vh) >= 0.5) { go(); return; }
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            var rr = e.boundingClientRect, h = Math.min(rr.height, window.innerHeight);
            var v = Math.min(window.innerHeight, rr.bottom) - Math.max(0, rr.top);
            if (e.isIntersecting && (phone ? rr.top < window.innerHeight * 0.7 :   /* 0.7: in view for the card (motion-critic), no blank drawer strip over 35 % (check-deadspace) */  v / h >= 0.5)) { io.disconnect(); go(); }
          });
        }, { threshold: [0, 0.05, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] });
        io.observe(stage);
      };
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
    } catch (err) { root.classList.remove("anim"); root.classList.add("ready"); }
  }
})();
