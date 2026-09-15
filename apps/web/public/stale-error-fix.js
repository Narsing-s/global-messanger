(() => {
  'use strict';
  const isLoadError = (text) => /unable to load conversations|request failed \((?:4|5)\d\d\)/i.test(String(text || ''));
  const apiBase = () => (location.origin || window.__GM_CONFIG__?.API_URL || localStorage.getItem('gm_api_url')).replace(/\/$/, '');
  let checking = false;
  async function verifyConversationsAndClear(node) {
    if (checking || !node || !isLoadError(node.textContent)) return;
    const token = localStorage.getItem('gm_token'); if (!token) return;
    checking = true;
    try {
      const response = await fetch(`${apiBase()}/api/conversations`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.ok) node.remove();
    } catch (_) {} finally { checking = false; }
  }
  function scan() { document.querySelectorAll('.socket-error').forEach(verifyConversationsAndClear); }
  let scheduled = false;
  function scheduleScan() { if (scheduled) return; scheduled = true; queueMicrotask(() => { scheduled = false; scan(); }); }
  const observer = new MutationObserver(scheduleScan);
  const start = () => { observer.observe(document.body, { childList: true, subtree: true }); scan(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
