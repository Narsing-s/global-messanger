(() => {
  'use strict';

  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  let activity = new Map();
  let syncing = false;

  function installStyles() {
    if (document.getElementById('gm-chat-ux-layout-fix')) return;
    const s = document.createElement('style');
    s.id = 'gm-chat-ux-layout-fix';
    s.textContent = `
      /* The composer must own the available width; Advanced belongs in navigation, not beside typing. */
      .composer,.message-composer,.chat-composer,[class*="composer"] { width:100% !important; max-width:none !important; box-sizing:border-box !important; }
      .composer { display:flex !important; align-items:flex-end !important; gap:8px !important; padding:10px 14px !important; }
      .composer input[type="text"],.composer input:not([type]),.composer textarea,
      .message-composer input[type="text"],.message-composer textarea,
      .chat-composer input[type="text"],.chat-composer textarea { flex:1 1 auto !important; width:100% !important; min-width:0 !important; min-height:46px !important; max-height:150px !important; padding:12px 15px !important; box-sizing:border-box !important; resize:none !important; }
      .composer > input,.composer > textarea { flex:1 1 auto !important; }
      .composer button[type="submit"],.composer .send-button { flex:0 0 46px !important; width:46px !important; height:46px !important; }
      #gm-advanced-launcher { position:fixed !important; right:18px !important; bottom:76px !important; }
      .sidebar-bottom #gm-sidebar-advanced { display:flex !important; }
      .chat-list { display:flex !important; flex-direction:column !important; }
    `;
    document.head.appendChild(s);
  }

  function moveAdvancedOutOfComposer() {
    const advanced = [...document.querySelectorAll('button,a,[role="button"]')].find(el => /advanced\s*(command\s*)?center/i.test(el.textContent || '') || /advanced/i.test(el.getAttribute('aria-label') || ''));
    if (!advanced) return;
    const composer = advanced.closest('.composer,.message-composer,.chat-composer,[class*="composer"]');
    if (!composer) return;
    const sidebar = document.querySelector('.sidebar-bottom') || document.querySelector('.sidebar');
    if (!sidebar) return;
    advanced.id = 'gm-sidebar-advanced';
    advanced.setAttribute('data-gm-advanced-location', 'sidebar');
    advanced.classList.add('gm-sidebar-advanced');
    advanced.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;margin:8px 0 0;padding:9px 12px;border:1px solid rgba(99,91,255,.22);border-radius:12px;background:rgba(99,91,255,.08);color:#635bff;font-weight:700;cursor:pointer;box-sizing:border-box;';
    sidebar.appendChild(advanced);
  }

  async function syncActivity() {
    if (syncing || !token()) return;
    syncing = true;
    try {
      const r = await fetch(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!r.ok) return;
      const rows = await r.json();
      activity = new Map((Array.isArray(rows) ? rows : []).map(c => {
        const last = Array.isArray(c.messages) && c.messages[0]?.createdAt ? c.messages[0].createdAt : c.updatedAt;
        return [String(c.id), last ? new Date(last).getTime() : 0];
      }));
      sortChats();
    } catch {} finally { syncing = false; }
  }

  function sortChats() {
    const list = document.querySelector('.chat-list');
    if (!list || !activity.size) return;
    const pinned = read('gm_chat_pinned', []);
    const rows = [...list.querySelectorAll('.chat-item[data-gm-conversation-id]')];
    const sorted = rows.slice().sort((a,b) => {
      const ai = String(a.getAttribute('data-gm-conversation-id') || ''), bi = String(b.getAttribute('data-gm-conversation-id') || '');
      const ap = pinned.indexOf(ai), bp = pinned.indexOf(bi);
      if (ap >= 0 || bp >= 0) {
        if (ap < 0) return 1;
        if (bp < 0) return -1;
        if (ap !== bp) return ap - bp;
      }
      return (activity.get(bi) || 0) - (activity.get(ai) || 0);
    });
    sorted.forEach((row, index) => row.style.setProperty('order', String(index + 10), 'important'));
  }

  function observe() {
    const observer = new MutationObserver(() => {
      installStyles();
      moveAdvancedOutOfComposer();
      sortChats();
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  installStyles();
  observe();
  moveAdvancedOutOfComposer();
  syncActivity();
  window.setInterval(() => { installStyles(); moveAdvancedOutOfComposer(); syncActivity(); }, 1500);
  window.addEventListener('gm:chat-folders-refresh', sortChats);
  window.addEventListener('gm:message-sent', syncActivity);
})();
