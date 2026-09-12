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
        try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch (_) {}
      }
    };
    input.addEventListener('touchstart', focus, { passive: true });
    input.addEventListener('pointerdown', focus, { passive: true });
    input.addEventListener('click', focus, { passive: true });
  }

  function ensureAuthTouchSurface() {
    const auth = document.querySelector('.auth-page');
    const card = auth?.querySelector('.auth-card');
    if (!auth || !card) return;

    // Android WebView can retain a transparent fixed overlay from a previous UI
    // layer. Never let an auth-page overlay block the actual card/form.
    auth.style.pointerEvents = 'auto';
    auth.style.touchAction = 'manipulation';
    card.style.pointerEvents = 'auto';
    card.style.touchAction = 'manipulation';
    card.querySelectorAll('input,button,textarea,select,a,label').forEach((node) => {
      if (node instanceof HTMLElement) node.style.pointerEvents = 'auto';
    });

    document.querySelectorAll('.auth-page > *, .auth-page .auth-overlay, .auth-page .modal-backdrop').forEach((node) => {
      if (!(node instanceof HTMLElement) || node === card || card.contains(node)) return;
      const cs = getComputedStyle(node);
      if (cs.position === 'fixed' || cs.position === 'absolute') {
        const z = Number.parseInt(cs.zIndex || '0', 10);
        if (z >= 1000) node.style.pointerEvents = 'none';
      }
    });
  }

  function scan() {
    document.querySelectorAll('.auth-page input').forEach(harden);
    ensureAuthTouchSurface();
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  const start = () => {
    scan();
    new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
