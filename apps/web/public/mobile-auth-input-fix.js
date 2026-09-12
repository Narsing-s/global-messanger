(() => {
  'use strict';
  if (window.__gmMobileAuthInputFix) return;
  window.__gmMobileAuthInputFix = true;

  const isAuthInput = (el) => el instanceof HTMLInputElement && !!el.closest('.auth-page');

  function harden(input) {
    if (!isAuthInput(input) || input.dataset.gmMobileInputFixed === '1') return;
    input.dataset.gmMobileInputFixed = '1';
    input.disabled = false;
    input.readOnly = false;
    input.removeAttribute('aria-disabled');
    input.style.pointerEvents = 'auto';
    input.style.touchAction = 'manipulation';
    input.style.userSelect = 'text';
    input.style.webkitUserSelect = 'text';
    if (!input.getAttribute('inputmode')) input.setAttribute('inputmode', input.type === 'password' ? 'text' : 'text');

    const focus = () => {
      if (!input.disabled && !input.readOnly) {
        input.focus({ preventScroll: true });
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch (_) {}
      }
    };
    input.addEventListener('touchstart', focus, { passive: true });
    input.addEventListener('pointerdown', focus, { passive: true });
    input.addEventListener('click', focus, { passive: true });
    input.addEventListener('keydown', () => { input.dataset.gmLastInteraction = String(Date.now()); });
    input.addEventListener('compositionend', () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function removeBlockingLayers() {
    document.querySelectorAll('.auth-page *').forEach((node) => {
      const el = node;
      if (!(el instanceof HTMLElement)) return;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.zIndex !== 'auto' && Number(cs.zIndex) > 1000 && !el.closest('.auth-card')) {
        el.style.pointerEvents = 'none';
      }
    });
  }

  function scan() {
    document.querySelectorAll('.auth-page input').forEach(harden);
    removeBlockingLayers();
  }

  const start = () => {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
