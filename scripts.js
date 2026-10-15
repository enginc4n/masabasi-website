'use strict';

// Real service URLs belong here; missing links retain useful local destinations.
const CLUB_LINKS = Object.freeze({
  instagram: null,
  discord: null,
  catan: null,
  strategy: null,
  openGame: null,
});

function initializeDestinations() {
  const status = document.querySelector('#connection-status');
  document.querySelectorAll('[data-destination]').forEach((link) => {
    const key = link.dataset.destination;
    const destination = CLUB_LINKS[key];
    if (destination) {
      link.href = destination;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return;
    }
    link.addEventListener('click', () => {
      if (!status) return;
      status.textContent = key === 'instagram'
        ? 'Instagram profil bağlantımız yakında burada olacak.'
        : key === 'discord'
          ? 'Discord topluluğumuzun davet bağlantısı yakında burada olacak.'
          : `${link.dataset.event} için tarih, yer ve katılım formu yakında duyurulacak.`;
      status.hidden = false;
    });
  });
}

function initializeNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#ana-menu');
  if (!toggle || !navigation) return;
  const mobile = window.matchMedia('(max-width: 900px)');
  const close = (restoreFocus = false) => {
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    navigation.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menüyü aç');
    if (restoreFocus && wasOpen) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    if (open) navigation.querySelector('a')?.focus();
  });
  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    navigation.querySelectorAll('a').forEach((item) => item.removeAttribute('aria-current'));
    link.setAttribute('aria-current', 'location');
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    close();
    if (wasOpen) {
      const destination = document.querySelector(link.hash);
      if (destination) {
        destination.setAttribute('tabindex', '-1');
        destination.focus({ preventScroll: true });
      }
    }
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(true); });
  document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) close(); });
  document.addEventListener('focusin', (event) => { if (!event.target.closest('.site-header')) close(); });
  mobile.addEventListener('change', () => close());
  document.documentElement.classList.add('nav-enhanced');
}

function initializeMotion() {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const active = new Map();
  const seen = new WeakSet();
  let observer;
  const startTime = performance.now();
  const entranceDelays = { header: 0, eyebrow: 110, heading: 220, description: 330, actions: 440, image: 550 };
  const stop = () => {
    observer?.disconnect();
    active.forEach((animation) => animation.cancel());
    active.clear();
  };
  const reveal = (element) => {
    if (seen.has(element)) return;
    seen.add(element);
    const style = getComputedStyle(element);
    let delay = parseFloat(style.getPropertyValue('--delay')) || 0;
    const entrance = element.dataset.entrance;
    if (!entrance && element.closest('.events') && performance.now() - startTime < 350) delay += 900;
    if (entrance) {
      const initial = performance.now() - startTime < 350;
      delay = entrance === 'benefit'
        ? (initial ? 660 : 0) + (parseFloat(style.getPropertyValue('--order')) || 0) * 95
        : initial ? entranceDelays[entrance] || 0 : 0;
    }
    const animation = element.animate([
      { opacity: 0, translate: `0 ${entrance === 'header' ? '-6' : '21'}px`, scale: entrance === 'image' ? '.99' : '1' },
      { opacity: 1, translate: '0 0', scale: '1' },
    ], { duration: entrance === 'header' ? 500 : 610, delay, easing: 'cubic-bezier(.22,.75,.25,1)', fill: 'backwards' });
    active.set(element, animation);
    animation.onfinish = animation.oncancel = () => active.delete(element);
  };
  try {
    observer = new IntersectionObserver((entries) => {
      try {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) reveal(target);
          else if (seen.has(target)) {
            // Fast scrolling exposes final content immediately, including delayed items.
            active.get(target)?.cancel();
            observer.unobserve(target);
          }
        });
      } catch { stop(); }
    }, { threshold: 0, rootMargin: '0px 0px -12px 0px' });
    document.querySelectorAll('[data-entrance], [data-reveal]').forEach((element) => observer.observe(element));
    document.addEventListener('focusin', (event) => {
      active.forEach((animation, element) => { if (element.contains(event.target)) animation.cancel(); });
    });
    window.addEventListener('pagehide', stop);
  } catch { stop(); }
}

initializeDestinations();
initializeNavigation();
initializeMotion();
document.querySelector('#year').textContent = String(new Date().getFullYear());
