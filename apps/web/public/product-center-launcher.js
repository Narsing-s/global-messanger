(() => {
  const mount = () => {
    if (document.querySelector('[data-gm-product-center]')) return;
    const b = document.createElement('button');
    b.dataset.gmProductCenter = 'true';
    b.textContent = '⌘ Command Center';
    b.title = 'Open Global Messenger Command Center';
    b.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:25000;border:0;border-radius:999px;padding:11px 16px;background:#635bff;color:#fff;font:700 13px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.3);cursor:pointer';
    b.onclick = () => window.__gmProductCenter?.open?.();
    document.body.appendChild(b);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
