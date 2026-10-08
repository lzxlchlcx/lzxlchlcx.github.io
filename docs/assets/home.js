/* Local, dependency-free navigation and atmosphere. Personal content lives in index.html. */
(() => {
  'use strict';
  const body = document.body;
  const screens = [...document.querySelectorAll('.screen')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.connection?.saveData;
  if (lowPower) body.classList.add('low-power');
  body.classList.add('js-enabled');

  const orbButton = document.querySelector('#orb-toggle');
  const orbSystem = document.querySelector('.orb-system');
  const orbNavigation = document.querySelector('#orb-navigation');
  const orbHint = document.querySelector('.hint-label');
  const orbCanvas = document.querySelector('#orb-canvas');
  let orb = null;
  try {
    if (window.createOrb) {
      orb = window.createOrb(orbCanvas, { reducedMotion: reduced.matches, lowPower: !!lowPower });
      if (orb) body.classList.add('orb-ready');
    }
  } catch (error) { console.warn('球体使用静态兼容视图。', error); }
  let open = false;
  let pulseTimer;
  function pulse() {
    orb?.pulse();
    if (reduced.matches) return;
    orbSystem.classList.remove('is-pulsing');
    void orbSystem.offsetWidth;
    orbSystem.classList.add('is-pulsing');
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => orbSystem.classList.remove('is-pulsing'), 900);
  }
  function setOpen(next, restoreFocus = false) {
    open = next;
    orbSystem.classList.toggle('is-open', next);
    orbButton.setAttribute('aria-expanded', String(next));
    orbButton.setAttribute('aria-label', next ? '收起球体导航' : '探索球体，展开四个导航入口');
    orbNavigation.inert = !next;
    orbHint.textContent = next ? '选择一颗星，或按 Esc 收起' : '轻触球体，开启探索';
    if (next) pulse();
    if (!next && (restoreFocus || orbNavigation.contains(document.activeElement))) {
      orbButton.focus({ preventScroll: true });
    }
  }
  orbButton.addEventListener('click', () => setOpen(!open));
  document.addEventListener('click', event => {
    if (open && !event.target.closest('.orb-button, .orb-navigation')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
  });
  orbNavigation.addEventListener('keydown', event => {
    const links = [...orbNavigation.querySelectorAll('a')];
    const current = links.indexOf(document.activeElement);
    if (current < 0) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step) { event.preventDefault(); links[(current + step + links.length) % links.length].focus(); }
  });

  let currentScreen = 0;
  let travelFrame = 0;
  let travelling = false;
  const dotLinks = [...document.querySelectorAll('.page-dots a')];
  const topLinks = [...document.querySelectorAll('.top-nav a')];
  let scrollFrame = 0;
  function syncScreen() {
    const focusLine = innerHeight * .42;
    let selected = 0;
    screens.forEach((screen, index) => {
      const rect = screen.getBoundingClientRect();
      if (rect.top <= focusLine && rect.bottom > focusLine) selected = index;
      if (rect.bottom > 60 && rect.top < innerHeight * .85) screen.classList.add('is-visible');
    });
    currentScreen = selected;
    body.classList.toggle('in-content', selected !== 0);
    screens.forEach((screen, index) => screen.classList.toggle('is-current', selected === index));
    dotLinks.forEach((link, index) => {
      link.classList.toggle('is-current', index === selected);
      if (index === selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    topLinks.forEach(link => {
      if (link.hash === '#' + screens[selected].id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    orb?.setActive(screens[0].getBoundingClientRect().bottom > 0);
    if (selected !== 0 && open) {
      const focusedNode = orbNavigation.contains(document.activeElement);
      setOpen(false);
      if (focusedNode) screens[selected].querySelector('h2')?.focus({ preventScroll: true });
    }
    scrollFrame = 0;
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScreen); }, { passive: true });
  function endTravel() {
    cancelAnimationFrame(travelFrame);
    travelFrame = 0;
    travelling = false;
    document.documentElement.style.removeProperty('scroll-snap-type');
    document.documentElement.style.removeProperty('scroll-behavior');
    body.classList.remove('is-travelling');
    syncScreen();
  }
  function goTo(screen, { fromOrb = false, keyboard = false, history = true } = {}) {
    if (!screen) return;
    endTravel();
    const start = scrollY;
    const destination = Math.min(document.documentElement.scrollHeight - innerHeight, start + screen.getBoundingClientRect().top);
    if (history && location.hash !== '#' + screen.id) window.history.pushState(null, '', '#' + screen.id);
    setOpen(false);
    screen.classList.add('is-visible');
    const focusTarget = () => {
      if (keyboard || fromOrb) (screen.querySelector('h2') || orbButton).focus({ preventScroll: true });
    };
    if (reduced.matches || Math.abs(start - destination) < 2) {
      window.scrollTo({ top: destination, behavior: 'instant' });
      syncScreen(); focusTarget(); return;
    }
    travelling = true;
    document.documentElement.style.scrollSnapType = 'none';
    document.documentElement.style.scrollBehavior = 'auto';
    if (fromOrb) { pulse(); body.classList.add('is-travelling'); }
    const started = performance.now();
    const duration = 780;
    function slide(now) {
      const progress = Math.min((now - started) / duration, 1);
      const ease = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({ top: start + (destination - start) * ease, behavior: 'instant' });
      if (progress < 1) travelFrame = requestAnimationFrame(slide);
      else { endTravel(); focusTarget(); }
    }
    travelFrame = requestAnimationFrame(slide);
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const screen = screens.find(item => '#' + item.id === link.hash);
      if (!screen || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      goTo(screen, { fromOrb: !!link.closest('.orb-navigation'), keyboard: event.detail === 0 });
    });
  });
  addEventListener('popstate', () => goTo(screens.find(screen => '#' + screen.id === location.hash) || screens[0], { history: false }));
  addEventListener('hashchange', () => goTo(screens.find(screen => '#' + screen.id === location.hash), { history: false }));

  // One desktop wheel gesture advances one screen. Tall sections keep native scrolling.
  let wheelTotal = 0;
  let gestureSpent = false;
  let gestureTimer;
  let wheelDirection = 0;
  addEventListener('wheel', event => {
    if (!finePointer.matches || innerWidth <= 700 || event.ctrlKey || event.target.closest('textarea,select,input,[data-native-scroll]')) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    clearTimeout(gestureTimer);
    gestureTimer = setTimeout(() => { gestureSpent = false; wheelTotal = 0; wheelDirection = 0; }, 240);
    if (travelling || gestureSpent) { event.preventDefault(); return; }
    const direction = Math.sign(delta);
    const rect = screens[currentScreen].getBoundingClientRect();
    const canReadMore = direction > 0 ? rect.bottom > innerHeight + 3 : rect.top < -3;
    if (rect.height > innerHeight + 4 && canReadMore) {
      wheelTotal = 0;
      const remaining = direction > 0 ? rect.bottom - innerHeight : -rect.top;
      if (Math.abs(delta) > remaining + 3) {
        event.preventDefault();
        window.scrollBy({ top: direction * remaining, behavior: 'instant' });
        gestureSpent = true;
      }
      return;
    }
    const next = screens[currentScreen + direction];
    if (!next) return;
    event.preventDefault();
    if (wheelDirection !== direction) wheelTotal = 0;
    wheelDirection = direction;
    wheelTotal += Math.abs(delta);
    if (wheelTotal >= 32) { gestureSpent = true; wheelTotal = 0; goTo(next); }
  }, { passive: false });
  // Touch, scrollbar dragging and browser keys can interrupt a scripted journey.
  addEventListener('touchstart', () => { if (travelling) endTravel(); }, { passive: true });
  addEventListener('pointerdown', event => {
    if (travelling && event.clientX >= document.documentElement.clientWidth) endTravel();
  }, { passive: true });
  addEventListener('keydown', event => {
    if (travelling && ['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)
      && !event.target.closest('button,a,input,textarea')) endTravel();
  });

  // Small, eased perspective offsets. Touch devices have a stable composition.
  let atmosphere = null;
  let pointerX = 0, pointerY = 0, easedX = 0, easedY = 0, pointerFrame = 0;
  function easePointer() {
    easedX += (pointerX - easedX) * .06;
    easedY += (pointerY - easedY) * .06;
    document.documentElement.style.setProperty('--px', easedX.toFixed(3));
    document.documentElement.style.setProperty('--py', easedY.toFixed(3));
    atmosphere?.setPointer(easedX, easedY);
    if (Math.abs(pointerX - easedX) + Math.abs(pointerY - easedY) > .002) pointerFrame = requestAnimationFrame(easePointer);
    else pointerFrame = 0;
  }
  function point(x, y) {
    pointerX = x; pointerY = y;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(easePointer);
  }
  addEventListener('pointermove', event => {
    if (finePointer.matches && !reduced.matches && innerWidth > 700 && currentScreen === 0)
      point(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => point(0, 0));

  // Keep a visible local illustration if a replaced asset cannot be loaded.
  document.querySelectorAll('img[data-fallback]').forEach(image => {
    const fallback = () => {
      if (!image.dataset.fallback) return;
      const source = image.dataset.fallback;
      delete image.dataset.fallback;
      image.src = source;
    };
    image.addEventListener('error', fallback);
    if (image.complete && !image.naturalWidth) fallback();
  });

  const interestItems = [...document.querySelectorAll('[data-interest]')];
  const interestVisuals = [...document.querySelectorAll('[data-interest-visual]')];
  const interestButtons = [...document.querySelectorAll('[data-interest-select]')];
  function selectInterest(key) {
    interestItems.forEach(item => item.classList.toggle('is-active', item.dataset.interest === key));
    interestVisuals.forEach(visual => {
      const active = visual.dataset.interestVisual === key;
      visual.classList.toggle('is-active', active);
      visual.inert = !active;
      if (active) visual.removeAttribute('aria-hidden');
      else visual.setAttribute('aria-hidden', 'true');
    });
    interestButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.interestSelect === key)));
    const title = interestItems.find(item => item.dataset.interest === key)?.querySelector('.interest-title').textContent;
    const caption = document.querySelector('#interest-caption');
    if (caption && title) caption.textContent = title + ' · 主题插画';
  }
  interestItems.forEach(item => {
    item.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') selectInterest(item.dataset.interest); });
    item.addEventListener('focus', () => selectInterest(item.dataset.interest));
    item.addEventListener('keydown', event => {
      const index = interestItems.indexOf(item);
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (step) { event.preventDefault(); interestItems[(index + step + interestItems.length) % interestItems.length].focus(); }
    });
  });
  interestButtons.forEach(button => button.addEventListener('click', () => selectInterest(button.dataset.interestSelect)));

  const timelineNodes = [...document.querySelectorAll('.timeline-node')];
  function selectTime(index) {
    timelineNodes.forEach((node, n) => {
      const active = n === index;
      node.classList.toggle('is-active', active);
      node.querySelector('.timeline-point').setAttribute('aria-expanded', String(active));
      node.querySelector('.timeline-bubble').hidden = !active;
    });
  }
  timelineNodes.forEach((node, index) => {
    const button = node.querySelector('.timeline-point');
    node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') selectTime(index); });
    button.addEventListener('focus', () => selectTime(index));
    button.addEventListener('click', () => selectTime(index));
    button.addEventListener('keydown', event => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (step) { event.preventDefault(); timelineNodes[(index + step + timelineNodes.length) % timelineNodes.length].querySelector('button').focus(); }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); timelineNodes[event.key === 'Home' ? 0 : timelineNodes.length - 1].querySelector('button').focus();
      }
      if (event.key === 'Escape') { event.preventDefault(); selectTime(-1); }
    });
  });

  // Shared atmosphere pauses itself when this tab is hidden.
  atmosphere = window.createAtmosphere?.(document.querySelector('#starfield'), { reducedMotion: reduced.matches, lowPower: !!lowPower });
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { atmosphere?.resize(); orb?.resize(); syncScreen(); }, 140);
  });
  document.addEventListener('visibilitychange', () => {
    body.classList.toggle('is-hidden', document.hidden);
    if (document.hidden) point(0, 0);
    else syncScreen();
  });
  reduced.addEventListener('change', () => {
    orb?.setReducedMotion(reduced.matches);
    atmosphere?.setReducedMotion(reduced.matches);
    if (reduced.matches) { if (travelling) endTravel(); point(0, 0); }
  });
  syncScreen();
  const initialScreen = screens.find(screen => '#' + screen.id === location.hash);
  if (initialScreen) initialScreen.classList.add('is-visible');
})();
