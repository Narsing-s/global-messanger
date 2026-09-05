(() => {
  const isLoadError = (text) => /unable to load conversations|request failed \((?:4|5)\d\d\)/i.test(String(text || ''));
  const apiBase = () => window.__GM_CONFIG__?.API_URL || (location.hostname === 'global-messanger.onrender.com' ? 'https://global-messanger-backend.onrender.com' : location.origin);
  let checking = false;

  async function verifyConversationsAndClear(node) {
    if (checking || !node || !isLoadError(node.textContent)) return;
    const token = localStorage.getItem('gm_token');
    if (!token) return;
    checking = true;
    try {
      const response = await fetch(`${apiBase()}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (response.ok) {
        node.remove();
      }
    } catch {}
    finally { checking = false; }
  }

  function scan() {
    document.querySelectorAll('.socket-error').forEach(verifyConversationsAndClear);
  }

  const observer = new MutationObserver(scan);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
