(() => {
  if (window.__gmModernChatMenuLoading) return;
  window.__gmModernChatMenuLoading = true;

  let loaded = false;
  let pendingOptions = false;

  const load = () => {
    if (loaded || document.querySelector('script[data-gm-modern-chat-menu]')) return;
    const script = document.createElement('script');
    script.src = '/chat-modern-menu.js?v=20260902b';
    script.dataset.gmModernChatMenu = '1';
    script.onload = () => {
      loaded = true;
      if (pendingOptions) {
        pendingOptions = false;
        window.dispatchEvent(new CustomEvent('gm:options'));
      }
    };
    document.body.appendChild(script);
  };

  window.addEventListener('gm:options', () => {
    if (!loaded) {
      pendingOptions = true;
      load();
    }
  }, true);

  // Preload the menu so the first click always opens the current options panel.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
