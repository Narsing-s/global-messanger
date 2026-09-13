(() => {
  const loadAdvanced = () => new Promise(resolve => {
    if (window.__gmAdvancedCompletion) return resolve();
    const s = document.createElement('script');
    s.src = '/advanced-completion-center-v3.js';
    s.async = true;
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  });
  const mount = async () => {
    if (document.querySelector('[data-gm-product-center]')) return;
    await loadAdvanced();
    const wrap = document.createElement('div');
    wrap.dataset.gmProductCenterLauncher = 'true';
    wrap.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:25000;display:flex;align-items:center';
    const button = document.createElement('button');
    button.dataset.gmProductCenter = 'true';
    button.textContent = '⌘ Product Center';
    button.title = 'Open Global Messenger Product Center';
    button.setAttribute('aria-label', 'Open Global Messenger Product Center');
    button.style.cssText = 'border:0;border-radius:999px;padding:11px 16px;background:#635bff;color:#fff;font:700 13px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.3);cursor:pointer';
    button.onclick = () => window.__gmProductCenter?.open?.() || window.__gmAdvancedCompletion?.open?.();
    wrap.appendChild(button); document.body.appendChild(wrap);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
