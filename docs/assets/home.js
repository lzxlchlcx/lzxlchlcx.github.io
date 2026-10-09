/* Shared universe, hash-addressable content windows and dependency-free interactions. */
(() => {
  'use strict';
  const body = document.body;
  const screens = [...document.querySelectorAll('.screen')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const lowPower = !finePointer.matches || navigator.hardwareConcurrency <= 4
    || navigator.deviceMemory <= 4 || navigator.connection?.saveData;
  const orbButton = document.querySelector('#orb-toggle');
  const orbSystem = document.querySelector('.orb-system');
  const orbNavigation = document.querySelector('#orb-navigation');
  const orbHint = document.querySelector('.hint-label');
  const motionButton = document.querySelector('#motion-toggle');
  const motionLabel = document.querySelector('.motion-label');
  const dotLinks = [...document.querySelectorAll('.page-dots a')];
  const topLinks = [...document.querySelectorAll('.top-nav a')];
  let orb = null, atmosphere = null;
  let motionEnabled = !reduced.matches;
  let currentScreen = -1, open = false, energyAnimation = null;
  let resizeTimer;
  body.classList.add('js-enabled');

  try {
    orb = window.createOrb?.(document.querySelector('#orb-canvas'), {
      reducedMotion: reduced.matches, lowPower: !!lowPower, active: false
    });
    if (orb) body.classList.add('orb-ready');
  } catch (error) { console.warn('球体使用静态兼容视图。', error); }
  try {
    atmosphere = window.createAtmosphere?.(document.querySelector('#starfield'), {
      reducedMotion: reduced.matches, lowPower: !!lowPower, active: false
    });
  } catch (error) { console.warn('星空使用静态兼容背景。', error); }

  function syncMotion() {
    const active = motionEnabled && !document.hidden && !reduced.matches;
    orb?.setActive(active && currentScreen === 0);
    atmosphere?.setActive(active);
    body.classList.toggle('motion-running', active);
  }
  function syncMotionControl() {
    motionButton.disabled = reduced.matches;
    const label = reduced.matches ? '静态模式' : motionEnabled ? '关闭动效' : '开启动效';
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
    motionButton.setAttribute('aria-label', label);
    motionButton.title = reduced.matches ? '系统已开启减少动态' : label;
    motionLabel.textContent = label;
    syncMotion();
  }
  motionButton.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    syncMotionControl();
  });

  function pulse() {
    orb?.pulse();
    if (reduced.matches) return;
    energyAnimation?.cancel();
    energyAnimation = document.querySelector('.energy-pulse').animate([
      { opacity: .5, transform: 'translate(-50%, -50%) scale(.8)' },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.8)' }
    ], { duration: 320, easing: 'ease-out' });
  }
  function setOpen(next, restoreFocus = false) {
    open = next;
    orbSystem.classList.toggle('is-open', next);
    orbButton.setAttribute('aria-expanded', String(next));
    orbButton.setAttribute('aria-label', next ? '收起球体导航' : '探索球体，展开四个导航入口');
    if (!next && (restoreFocus || orbNavigation.contains(document.activeElement))) {
      orbButton.focus({ preventScroll: true });
    }
    orbNavigation.inert = !next;
    orbHint.textContent = next ? '选择入口，或按 Esc 收起' : '轻触球体，开启探索';
    if (next) pulse();
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
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (current >= 0 && step) {
      event.preventDefault();
      links[(current + step + links.length) % links.length].focus();
    }
  });

  // Each section keeps its hash URL while sharing one persistent universe.
  const contentWindow = document.querySelector('#content-window');
  const windowPages = contentWindow.querySelector('.window-pages');
  const windowTabs = [...contentWindow.querySelectorAll('.window-tabs a')];
  const windowTitle = contentWindow.querySelector('#window-title');
  const closeButton = contentWindow.querySelector('.window-close');
  const backdrop = document.querySelector('.window-backdrop');
  let pageAnimation = null, windowAnimation = null;
  const pageScroll = new Map();
  screens.slice(1).forEach(screen => {
    screen.hidden = true;
    screen.inert = true;
    windowPages.append(screen);
  });
  body.classList.add('window-layout');
  const homeActions = document.querySelector('.header-actions');
  homeActions.classList.add('home-actions');
  body.append(homeActions);
  orb?.resize();
  atmosphere?.resize();

  function selectScreen(index) {
    const previous = currentScreen;
    if (index === previous) return;
    if (previous > 0) pageScroll.set(previous, windowPages.scrollTop);
    pageAnimation?.cancel();
    windowAnimation?.cancel();
    currentScreen = index;
    const isContent = index > 0;
    body.classList.toggle('in-content', isContent);
    screens[0].inert = isContent;
    screens.forEach((screen, n) => {
      screen.classList.toggle('is-current', n === index);
      if (n > 0) {
        screen.hidden = n !== index;
        screen.inert = n !== index;
      }
    });
    [...dotLinks, ...topLinks, ...windowTabs].forEach(link => {
      const current = link.hash === '#' + screens[index].id;
      link.classList.toggle('is-current', current);
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    setOpen(false);
    if (isContent) {
      if (!contentWindow.open) {
        contentWindow.show();
      }
      backdrop.hidden = false;
      screens[index].classList.add('is-visible');
      windowTitle.textContent = screens[index].querySelector('h2').childNodes[0].textContent;
      windowPages.scrollTop = pageScroll.get(index) || 0;
      screens[index].querySelector('h2').focus({ preventScroll: true });
      if (!reduced.matches) {
        if (previous > 0) {
          const direction = index > previous ? 1 : -1;
          pageAnimation = screens[index].animate([
            { opacity: 0, transform: `translateX(${direction * 64}px)` },
            { opacity: 1, transform: 'translateX(0)' }
          ], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } else {
          windowAnimation = contentWindow.animate([
            { opacity: 0, transform: 'translateY(28px) scale(.98)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
          ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
        }
      }
    } else {
      contentWindow.close();
      backdrop.hidden = true;
      if (previous > 0) {
        orbButton.focus({ preventScroll: true });
      }
    }
    syncMotion();
  }
  function goTo(screen, { history = true } = {}) {
    if (!screen) return;
    if (history && location.hash !== '#' + screen.id) window.history.pushState(null, '', '#' + screen.id);
    selectScreen(screens.indexOf(screen));
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const screen = screens.find(item => '#' + item.id === link.hash);
      if (!screen || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      goTo(screen);
    });
  });
  function readLocation() {
    goTo(screens.find(screen => '#' + screen.id === location.hash) || screens[0], { history: false });
  }
  addEventListener('hashchange', readLocation);
  addEventListener('popstate', readLocation);
  closeButton.addEventListener('click', () => goTo(screens[0]));
  backdrop.addEventListener('click', () => goTo(screens[0]));
  document.addEventListener('keydown', event => {
    if (!contentWindow.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      goTo(screens[0]);
      return;
    }
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
    event.preventDefault();
    const index = Math.max(1, Math.min(screens.length - 1, currentScreen + step));
    goTo(screens[index]);
  });
  let touchStart = null;
  windowPages.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  windowPages.addEventListener('touchend', event => {
    if (!touchStart) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - touchStart.x, dy = end.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * .5 || window.getSelection()?.toString()) return;
    const index = currentScreen + (dx < 0 ? 1 : -1);
    if (index > 0 && index < screens.length) goTo(screens[index]);
  }, { passive: true });
  windowPages.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });


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
  let selectedInterest = 'code';
  function selectInterest(key) {
    if (key === selectedInterest) return;
    selectedInterest = key;
    interestItems.forEach(item => item.classList.toggle('is-active', item.dataset.interest === key));
    interestVisuals.forEach(visual => {
      const active = visual.dataset.interestVisual === key;
      visual.classList.toggle('is-active', active);
      if (!active && visual.contains(document.activeElement)) {
        interestItems.find(item => item.dataset.interest === key)?.focus({ preventScroll: true });
      }
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
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (step) {
        event.preventDefault();
        interestItems[(interestItems.indexOf(item) + step + interestItems.length) % interestItems.length].focus();
      }
    });
  });
  interestButtons.forEach(button => button.addEventListener('click', () => selectInterest(button.dataset.interestSelect)));

  const timelineNodes = [...document.querySelectorAll('.timeline-node')];
  let selectedTime = 0;
  function selectTime(index) {
    if (index === selectedTime) return;
    selectedTime = index;
    timelineNodes.forEach((node, n) => {
      const active = n === index;
      node.classList.toggle('is-active', active);
      node.querySelector('.timeline-point').setAttribute('aria-expanded', String(active));
      node.querySelector('.timeline-bubble').hidden = !active;
    });
  }
  timelineNodes.forEach((node, index) => {
    const button = node.querySelector('.timeline-point');
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') selectTime(index); });
    button.addEventListener('focus', () => selectTime(index));
    button.addEventListener('click', () => selectTime(index));
    button.addEventListener('keydown', event => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (step) {
        event.preventDefault();
        timelineNodes[(index + step + timelineNodes.length) % timelineNodes.length].querySelector('button').focus();
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        timelineNodes[event.key === 'Home' ? 0 : timelineNodes.length - 1].querySelector('button').focus();
      }
      if (event.key === 'Escape') { event.preventDefault(); selectTime(-1); }
    });
  });

  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      orb?.resize(); atmosphere?.resize();
    }, 140);
  });
  document.addEventListener('visibilitychange', () => {
    syncMotion();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { motionEnabled = false; pageAnimation?.cancel(); windowAnimation?.cancel(); energyAnimation?.cancel(); }
    orb?.setReducedMotion(reduced.matches);
    atmosphere?.setReducedMotion(reduced.matches);
    syncMotionControl();
  });
  readLocation();
  syncMotionControl();
})();
