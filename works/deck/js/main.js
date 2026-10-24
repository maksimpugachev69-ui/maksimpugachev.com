/* ============================================
   Ferma × Valta v5 — slide-by-slide deck
   No pin-scrub. Snap navigation via wheel / keyboard / touch / arrows.
   ============================================ */

gsap.registerPlugin(ScrollTrigger, Flip);

const isMobile = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const isReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const nav = document.getElementById('nav');
const counter = document.querySelector('.slide-counter');
const currentEl = document.getElementById('slide-current');
const totalEl = document.getElementById('slide-total');
const progressFill = document.getElementById('deck-progress-fill');
const arrowLeft = document.getElementById('arrow-left');
const arrowRight = document.getElementById('arrow-right');
const track = document.getElementById('slides-track');
const slides = Array.from(document.querySelectorAll('#slides-track > .slide, #slides-track > .section'));

// Ensure every section is .slide
slides.forEach(s => s.classList.add('slide'));
const N = slides.length;
if (totalEl) totalEl.textContent = String(N).padStart(2, '0');

const darkSlideIds = new Set(['cover', 'arsenal-map', 'retail-showcase', 'roi', 'cta']);
function applyDarkUI(idx) {
  const slide = slides[idx];
  if (!slide) return;
  const id = slide.dataset.section || slide.id;
  const isDark = darkSlideIds.has(id) || slide.classList.contains('section--dark') || slide.classList.contains('section--night');
  nav?.classList.toggle('is-dark', isDark);
  counter?.classList.toggle('is-dark', isDark);
  arrowLeft?.classList.toggle('is-dark', isDark);
  arrowRight?.classList.toggle('is-dark', isDark);
}

/* ---------- Word-by-word splitting for premium headline reveal ----------
   Обходим дочерние узлы: текст разрезаем на <span class="word">слово</span>,
   inline-элементы (например <span class="accent">) сохраняем как один word.
   <br> остаётся <br>. Это позволяет анимировать заголовок «волной»,
   не ломая существующую разметку.
*/
function splitWords(el) {
  if (!el || el.dataset.splitDone) return el.querySelectorAll('.word');
  el.dataset.splitDone = '1';

  function wrapTextNode(textNode) {
    const frag = document.createDocumentFragment();
    const parts = textNode.textContent.split(/(\s+)/);
    parts.forEach(p => {
      if (p.length === 0) return;
      if (/^\s+$/.test(p)) {
        frag.appendChild(document.createTextNode(p));
      } else {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = p;
        frag.appendChild(span);
      }
    });
    textNode.parentNode.replaceChild(frag, textNode);
  }

  Array.from(el.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      wrapTextNode(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === 'BR') return;
      // Inline element — treat whole element as one "word"
      node.classList.add('word', 'word--inline');
    }
  });

  return el.querySelectorAll('.word');
}

/* ---------- 3D tilt on hover (cards react to cursor with perspective) ---------- */
function attachTilt(cards) {
  cards.forEach(card => {
    if (card.dataset.tiltAttached || isReduced || isMobile) return;
    card.dataset.tiltAttached = '1';
    card.style.willChange = 'transform';
    card.style.transformStyle = 'preserve-3d';
    let raf = null;
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        gsap.to(card, {
          rotateY: x * 6,
          rotateX: -y * 6,
          y: -4,
          duration: 0.4,
          ease: 'expo.out',
          overwrite: 'auto',
          transformPerspective: 800
        });
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
    });
  });
}

/* ---------- Magnetic effect for important CTAs ---------- */
function attachMagnetic(el, strength = 0.35) {
  if (!el || el.dataset.magneticAttached || isReduced || isMobile) return;
  el.dataset.magneticAttached = '1';
  el.style.willChange = 'transform';
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    gsap.to(el, { x, y, duration: 0.4, ease: 'expo.out' });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
  });
}

/* ---------- Per-slide entry animations (run once per slide on first view) ---------- */
const slideAnimsRan = new Set();
// Pre-hide reveals on every slide so they fade in cleanly on first view
function primeSlide(slide) {
  if (slide.dataset.primed) return;
  slide.dataset.primed = '1';
  // Split major headlines into words upfront and hide each word.
  // The parent H1/H2 must remain visible (override CSS .reveal default opacity:0).
  slide.querySelectorAll('.display-h1, .display-h2, .hero-title').forEach(h => {
    const words = splitWords(h);
    gsap.set(h, { opacity: 1, y: 0 });
    gsap.set(words, { opacity: 0, y: 70, rotateX: -65, transformPerspective: 700, transformOrigin: '50% 100%' });
  });
  // Non-headline reveals — opacity + y (no filter:blur — оно даёт клиппинг текста
  // внутри секций с overflow:hidden, обрезая буквы у пиллов и подписей)
  slide.querySelectorAll('.reveal:not(.reveal-stagger)').forEach(el => {
    if (el.classList.contains('display-h1') || el.classList.contains('display-h2') || el.classList.contains('hero-title')) return;
    gsap.set(el, { opacity: 0, y: 30 });
  });
  // Stagger grids — cards animate with CLIP-PATH WIPE (premium "curtain" reveal)
  slide.querySelectorAll('.reveal-stagger').forEach(g => {
    Array.from(g.children).forEach(c => {
      gsap.set(c, {
        opacity: 0,
        y: 32,
        scale: 0.96,
        clipPath: 'inset(0 0 100% 0)'
      });
    });
  });
}
function runSlideAnims(idx) {
  if (slideAnimsRan.has(idx)) return;
  slideAnimsRan.add(idx);
  const slide = slides[idx];
  primeSlide(slide);

  const headlines = slide.querySelectorAll('.display-h1, .display-h2, .hero-title');
  const reveals = slide.querySelectorAll('.reveal:not(.reveal-stagger)');
  const staggers = slide.querySelectorAll('.reveal-stagger');
  const counters = slide.querySelectorAll('[data-counter]');

  // 1. Headlines — word-by-word wave
  headlines.forEach((h, hi) => {
    const words = h.querySelectorAll('.word');
    if (words.length) {
      gsap.to(words, {
        opacity: 1, y: 0, rotateX: 0,
        duration: 0.95, stagger: 0.045,
        ease: 'expo.out',
        delay: 0.12 + hi * 0.05
      });
    }
  });

  // 2. Other reveals — soft fade-up
  if (reveals.length) {
    const others = Array.from(reveals).filter(el => !el.classList.contains('display-h1') && !el.classList.contains('display-h2') && !el.classList.contains('hero-title'));
    gsap.to(others, {
      opacity: 1, y: 0,
      duration: 0.9, stagger: 0.06,
      ease: 'expo.out', delay: 0.3
    });
  }

  // 3. Stagger grids — CURTAIN-WIPE reveal + 3D tilt on hover
  staggers.forEach(g => {
    const children = Array.from(g.children);
    gsap.to(children, {
      opacity: 1,
      y: 0,
      scale: 1,
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.95,
      stagger: 0.08,
      ease: 'expo.out',
      delay: 0.45,
      onComplete: () => {
        // Clear clip-path so absolute-positioned :before/:after pseudo-elements
        // (like the "BENCHMARK" badge sticking out the top) aren't clipped.
        children.forEach(c => { c.style.clipPath = 'none'; });
        attachTilt(children);
      }
    });
  });

  // 4. Counters
  counters.forEach(el => animateCounter(el));

  // 5. Big standalone cards — also get tilt
  const standaloneCards = slide.querySelectorAll('.pkg-solo-card, .stm-card, .case-metric, .fact-card');
  attachTilt(standaloneCards);
}

function formatNumber(n, fmt, precision = 0) {
  if (fmt === 'thousands') return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
  if (precision > 0) return n.toFixed(precision).replace('.', ',');
  return Math.round(n).toString();
}
function animateCounter(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = '1';
  const from = parseFloat(el.dataset.from || 0);
  const to = parseFloat(el.dataset.to);
  const suffix = el.dataset.suffix || '';
  const fmt = el.dataset.format || 'plain';
  const precision = parseInt(el.dataset.precision || 0);
  const obj = { v: from };
  gsap.to(obj, {
    v: to, duration: 1.4, ease: 'power3.out',
    onUpdate: () => { el.innerHTML = formatNumber(obj.v, fmt, precision) + suffix; }
  });
}

/* ---------- Deck navigation ---------- */
let current = 0;
let isAnimating = false;
const ANIM_DURATION = 0.85;

function updateUI(idx) {
  if (currentEl) currentEl.textContent = String(idx + 1).padStart(2, '0');
  if (progressFill) progressFill.style.width = (idx / (N - 1) * 100).toFixed(2) + '%';
  applyDarkUI(idx);
  if (arrowLeft) arrowLeft.classList.toggle('is-disabled', idx === 0);
  if (arrowRight) arrowRight.classList.toggle('is-disabled', idx === N - 1);
}

function goTo(idx, opts = {}) {
  if (isAnimating && !opts.force) return;
  idx = Math.max(0, Math.min(N - 1, idx));
  if (idx === current && !opts.force) return;
  isAnimating = true;
  const prevSlide = slides[current];
  current = idx;
  updateUI(idx);
  // Counter flip animation
  if (counter) {
    counter.classList.remove('flipping');
    void counter.offsetWidth; // force reflow
    counter.classList.add('flipping');
  }
  // Reset incoming slide scroll position so user always lands at top of next block
  const incoming = slides[idx];
  if (incoming) incoming.scrollTop = 0;

  // === CINEMATIC SLIDE TRANSITION ===
  // Outgoing slide → recedes with depth + blur (parallax-out)
  // Incoming → approaches with subtle scale + blur clear (depth-in)
  if (!isReduced && prevSlide && prevSlide !== incoming) {
    gsap.fromTo(prevSlide, { filter: 'blur(0px)', scale: 1 }, {
      filter: 'blur(3px)', scale: 0.96,
      duration: 0.55, ease: 'power3.out',
      onComplete: () => { gsap.set(prevSlide, { filter: 'none', scale: 1 }); }
    });
  }
  if (!isReduced && incoming) {
    gsap.fromTo(incoming, { filter: 'blur(4px)', scale: 1.04 }, {
      filter: 'blur(0px)', scale: 1,
      duration: 0.65, ease: 'expo.out', delay: 0.2
    });
  }

  // Motion blur on track during slide
  track.classList.add('is-moving');
  gsap.to(track, {
    x: -idx * window.innerWidth,
    duration: opts.duration ?? ANIM_DURATION,
    ease: opts.ease ?? 'expo.inOut',
    onComplete: () => {
      isAnimating = false;
      track.classList.remove('is-moving');
      runSlideAnims(idx);
      // Shine sweep on the new slide
      if (incoming) {
        incoming.classList.add('slide-enter-shine');
        setTimeout(() => incoming.classList.remove('slide-enter-shine'), 1300);
      }
      // Also reset previous slide scroll after leaving
      if (prevSlide && prevSlide !== incoming) prevSlide.scrollTop = 0;
    }
  });
}

/* ---------- Hybrid wheel handler ----------
   - Inside long slide → native vertical scroll
   - At top/bottom edge + scroll past → transition to prev/next slide
   - Short slide → wheel = direct transition
*/
let wheelLock = false;
let lastWheelTime = 0;
const WHEEL_COOLDOWN = 700;
const EDGE_THRESHOLD = 2; // px tolerance

window.addEventListener('wheel', (e) => {
  if (isMobile || isReduced) return;

  // Respect interactive controls (sliders, etc.)
  if (e.target.closest('input[type="range"], textarea, .roi-input')) return;

  const slide = slides[current];
  const goingDown = e.deltaY > 0 || e.deltaX > 0;
  // Hero is overflow:hidden — never allow internal scroll, always transition
  const isHero = slide && slide.classList.contains('slide-hero');
  const overflowing = !isHero && slide && slide.scrollHeight > slide.clientHeight + EDGE_THRESHOLD;

  if (overflowing) {
    const atTop = slide.scrollTop <= EDGE_THRESHOLD;
    const atBottom = slide.scrollTop >= slide.scrollHeight - slide.clientHeight - EDGE_THRESHOLD;
    // Allow native vertical scroll inside slide unless at edge in scroll direction
    if (goingDown && !atBottom) return; // native scroll handles it
    if (!goingDown && !atTop) return;
  }

  // We're at slide edge (or slide fits viewport) → trigger horizontal transition
  e.preventDefault();
  const now = Date.now();
  if (wheelLock || isAnimating || (now - lastWheelTime) < WHEEL_COOLDOWN) return;
  const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (Math.abs(delta) < 8) return;
  wheelLock = true;
  lastWheelTime = now;
  setTimeout(() => { wheelLock = false; }, WHEEL_COOLDOWN);
  goTo(current + (goingDown ? 1 : -1));
}, { passive: false });

/* ---------- Touch swipe ---------- */
let touchStartX = 0, touchStartY = 0;
window.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', (e) => {
  if (isMobile) return; // native vertical scroll on mobile
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    goTo(current + (dx < 0 ? 1 : -1));
  }
});

/* ---------- Keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(current - 1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); goTo(current + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); goTo(current - 1); }
  else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
  else if (e.key === 'End') { e.preventDefault(); goTo(N - 1); }
});

/* ---------- Arrow click ---------- */
arrowLeft?.addEventListener('click', () => goTo(current - 1));
arrowRight?.addEventListener('click', () => goTo(current + 1));

/* ---------- Nav anchor links → slide jump ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const targetEl = document.getElementById(id);
    if (!targetEl) return;
    const slide = targetEl.classList.contains('slide') ? targetEl : targetEl.closest('.slide');
    const idx = slides.indexOf(slide);
    if (idx >= 0) {
      e.preventDefault();
      goTo(idx);
    }
  });
});

/* ---------- Resize: snap track to current slide + recompute overflow markers ---------- */
function markOverflow() {
  slides.forEach(s => {
    const overflowing = s.scrollHeight > s.clientHeight + 2;
    s.classList.toggle('has-overflow', overflowing);
  });
}
let resizeTO = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTO);
  resizeTO = setTimeout(() => {
    gsap.set(track, { x: -current * window.innerWidth });
    markOverflow();
  }, 100);
});

/* ---------- Per-slide scroll: hide indicator when at bottom ---------- */
slides.forEach(s => {
  s.addEventListener('scroll', () => {
    const atBottom = s.scrollTop >= s.scrollHeight - s.clientHeight - 4;
    s.classList.toggle('scrolled-bottom', atBottom);
  }, { passive: true });
});

/* ---------- Hero video load ---------- */
async function tryLoadVideo(id, path) {
  const v = document.getElementById(id);
  if (!v) return;
  try {
    const r = await fetch(path, { method: 'HEAD' });
    if (r.ok) { v.src = path; v.load(); }
  } catch (e) {}
}

/* ---------- ROI Sankey ---------- */
const ROI_CONFIG = {
  flows: [
    { name: 'Сайт',           share: 0.315, multiplier: 4.26, color: '#7BA148' },
    { name: 'Офлайн 6 маг',   share: 0.179, multiplier: 5.14, color: '#5E7F31' },
    { name: 'Маркетплейсы',   share: 0.262, multiplier: 5.55, color: '#FF8B1C' },
    { name: 'Influencer+Perf',share: 0.234, multiplier: 3.03, color: '#C5A572' },
    { name: 'Резерв',         share: 0.010, multiplier: 0,    color: '#675555' }
  ]
};
function drawSankey(budgetMln) {
  const svg = document.getElementById('roi-sankey');
  if (!svg) return 0;
  const W = 720, H = 480;
  const padL = 20, padR = 20;
  const srcX = padL + 20;
  const dstX = W - padR - 180;
  const usableH = H - 60;
  const srcTop = 30;
  const srcThickness = usableH * 0.85;
  const totalIn = ROI_CONFIG.flows.reduce((s, f) => s + f.share * f.multiplier, 0);
  const totalThick = usableH * 0.90;
  let parts = '', labels = '';
  let cursorSrc = srcTop + (usableH - srcThickness) / 2;
  let cursorDst = srcTop;
  let totalRevenue = 0;
  ROI_CONFIG.flows.forEach((f) => {
    const inThick = srcThickness * f.share;
    const outShare = (f.share * f.multiplier) / totalIn;
    const outThick = totalThick * outShare;
    const cx = (srcX + 100 + dstX) / 2;
    const path = `M ${srcX + 100} ${cursorSrc} C ${cx} ${cursorSrc}, ${cx} ${cursorDst}, ${dstX} ${cursorDst} L ${dstX} ${cursorDst + outThick} C ${cx} ${cursorDst + outThick}, ${cx} ${cursorSrc + inThick}, ${srcX + 100} ${cursorSrc + inThick} Z`;
    parts += `<path d="${path}" fill="${f.color}" fill-opacity="0.28" stroke="${f.color}" stroke-width="0.6"/>`;
    const revenue = budgetMln * f.share * f.multiplier;
    totalRevenue += revenue;
    const outY = cursorDst + outThick / 2;
    if (f.share > 0.05) {
      labels += `<g><text x="${dstX + 10}" y="${outY - 4}" font-family="Montserrat" font-size="11" font-weight="700" fill="#F2F0ED">${f.name}</text><text x="${dstX + 10}" y="${outY + 12}" font-family="Montserrat" font-size="11" font-weight="600" fill="${f.color}">+••• млн ₽ · ×${f.multiplier.toFixed(1)}</text></g>`;
    }
    cursorSrc += inThick;
    cursorDst += outThick + 4;
  });
  const srcRect = `<rect x="${srcX}" y="${srcTop + (usableH - srcThickness) / 2}" width="100" height="${srcThickness}" rx="10" fill="#1A1815" stroke="#C5A572" stroke-width="1.5"/>`;
  const srcLabel = `<text x="${srcX + 50}" y="${srcTop + usableH / 2 - 8}" font-family="Montserrat" font-size="12" font-weight="700" fill="#C5A572" text-anchor="middle">БЮДЖЕТ</text><text x="${srcX + 50}" y="${srcTop + usableH / 2 + 18}" font-family="Montserrat" font-size="22" font-weight="800" fill="#F2F0ED" text-anchor="middle">${budgetMln}</text><text x="${srcX + 50}" y="${srcTop + usableH / 2 + 36}" font-family="Montserrat" font-size="11" fill="#F2F0ED" text-anchor="middle">млн ₽</text>`;
  const total = `<text x="${dstX + 10}" y="${H - 8}" font-family="Montserrat" font-size="12" fill="#FF8B1C" font-weight="800">Итого +••• млн ₽</text>`;
  svg.innerHTML = parts + srcRect + srcLabel + labels + total;
  return totalRevenue;
}
function recomputeROI() {
  const slider = document.getElementById('budget');
  if (!slider) return;
  const budget = parseInt(slider.value);
  document.getElementById('budget-val').textContent = budget;
  const revenue = drawSankey(budget);
  const multiplier = revenue / budget;
  const romi = ((revenue - budget) / budget * 100);
  document.getElementById('revenue-val').textContent = '•••';
  document.getElementById('romi-val').textContent = romi.toFixed(0);
  document.getElementById('mult-val').textContent = multiplier.toFixed(1).replace('.', ',');
}

/* ---------- Boot ---------- */
function boot() {
  document.body.classList.add('horizontal-mode');
  // Run intro after fonts/images load briefly so nav layout is stable
  setTimeout(playIntroAnimation, 100);
  tryLoadVideo('hero-video', 'media/video/award-hero.mp4');
  const slider = document.getElementById('budget');
  if (slider) {
    slider.addEventListener('input', recomputeROI);
    // prevent wheel-event from triggering deck navigation when interacting with slider
    slider.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    recomputeROI();
  }
  // Pre-hide reveals on ALL slides so user doesn't see them flash before transition
  slides.forEach(primeSlide);
  // Set initial UI and play first slide's intro
  updateUI(0);
  runSlideAnims(0);
  // Detect overflowing slides on initial layout (after fonts/images)
  requestAnimationFrame(() => requestAnimationFrame(markOverflow));
  setTimeout(markOverflow, 500);
  window.addEventListener('load', markOverflow);

  // Hero entry
  const heroBg = document.getElementById('hero-bg');
  const heroContent = document.getElementById('hero-content');
  if (heroBg) gsap.from(heroBg, { scale: 1.18, duration: 1.6, ease: 'expo.out' });
  if (heroContent) gsap.from(heroContent.children, { opacity: 0, y: 30, duration: 0.9, stagger: 0.08, ease: 'expo.out', delay: 0.2 });

  // Magnetic effect for primary CTAs
  attachMagnetic(document.querySelector('.nav-cta'), 0.4);
  document.querySelectorAll('.btn--primary, .btn--green').forEach(el => attachMagnetic(el, 0.3));

  // 3D tilt on hero partnership cells + Valta logo cards
  attachTilt(document.querySelectorAll('.hp-valta-cell, .hp-valta-group'));
}

/* ---------- INTRO ANIMATION ----------
   Pattern (GSAP Flip): full-screen logo → flies to nav position.
   Uses Flip.fit() which animates ANY element to MATCH another's exact
   position/size, regardless of DOM placement. No FLIP-state needed.
*/
function playIntroAnimation() {
  const overlay = document.getElementById('intro-overlay');
  const introLogo = document.getElementById('intro-logo');
  const navLogo = document.querySelector('.nav-brand .logo-ferma-img');
  if (!overlay || !introLogo || !navLogo || isReduced) {
    if (overlay) overlay.remove();
    return;
  }

  // Initial state — invisible, slightly scaled, low position
  gsap.set(introLogo, { opacity: 0, scale: 0.85, y: 30 });
  gsap.set(navLogo, { opacity: 0 });

  const tl = gsap.timeline({
    onComplete: () => {
      document.body.classList.add('intro-done');
      gsap.set(navLogo, { opacity: 1, clearProps: 'transform,width,height,top,left,position' });
      overlay.remove();
    }
  });

  // 1. Logo zooms in with glow
  tl.to(introLogo, {
    opacity: 1, scale: 1, y: 0,
    duration: 1.0,
    ease: 'expo.out'
  });

  // 2. Subtle breathing while overlay holds
  tl.to(introLogo, {
    scale: 1.03,
    duration: 0.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 1
  });

  // 3. Logo flies to nav position via Flip.fit
  tl.add(() => {
    // Use Flip.fit to morph intro logo onto nav logo's geometry
    Flip.fit(introLogo, navLogo, {
      duration: 1.1,
      ease: 'expo.inOut',
      scale: true,
      onComplete: () => {
        // Fade overlay out, reveal nav logo
        gsap.to(overlay, { opacity: 0, duration: 0.5, ease: 'power2.out' });
      }
    });
  });

  // 4. Allow time for Flip.fit + fade
  tl.to({}, { duration: 1.6 });
}

if (isMobile || isReduced) {
  // Vertical fallback — set up scroll-triggered reveals on all slides
  tryLoadVideo('hero-video', 'media/video/award-hero.mp4');
  gsap.utils.toArray('.reveal:not(.reveal-stagger), .display-h1, .display-h2').forEach(el => {
    gsap.set(el, { opacity: 0, y: 30 });
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.85, ease: 'expo.out' })
    });
  });
  gsap.utils.toArray('.reveal-stagger').forEach(el => {
    const children = Array.from(el.children);
    gsap.set(children, { opacity: 0, y: 24, scale: 0.96 });
    ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true,
      onEnter: () => gsap.to(children, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.07, ease: 'expo.out' })
    });
  });
  document.querySelectorAll('[data-counter]').forEach(el => {
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => animateCounter(el) });
  });
  const slider = document.getElementById('budget');
  if (slider) { slider.addEventListener('input', recomputeROI); recomputeROI(); }
} else {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
