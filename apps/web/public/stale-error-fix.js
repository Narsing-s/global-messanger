(() => {
  'use strict';
  // This file is intentionally limited to stale conversation-error cleanup.
  // Authentication is owned by the React auth form. A previous version added a
  // capture-phase submit handler with stopImmediatePropagation(), which could
  // prevent React from receiving login/register submits inside Android WebView.
  const isLoadError = (text) => /unable to load conversations|request failed \((?:4|5)\d\d\)/i.test(String(text || ''));
  const apiBase = () => window.__GM_CONFIG__?.API_URL || (location.hostname === 'global-messanger.onrender.com' ? 'https://global-messanger-backend.onrender.com' : location.origin);
  let checking = false;

  async function verifyConversationsAndClear(node) {
    if (checking || !node || !isLoadError(node.textContent)) return;
    const token = localStorage.getItem('gm_token');
    if (!token) return;
    checking = true;
    try {
      const response = await fetch(`${apiBase()}/api/conversations`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.ok) node.remove();
    } catch (_) {
      // Keep the existing error visible when the API is actually unavailable.
    } finally {
      checking = false;
    }
  }

  function scan() {
    document.querySelectorAll('.socket-error').forEach(verifyConversationsAndClear);
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      scan();
    });
  }

  const observer = new MutationObserver(scheduleScan);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
