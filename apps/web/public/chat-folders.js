(() => {
  'use strict';
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  let folder = 'all';
  let rendering = false;

  const request = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };

  const activeConversation = async () => {
    const title = document.querySelector('.chat-heading b')?.textContent?.trim();
    if (!title) return null;
    const me = read('gm_user', {});
    const rows = await request('/api/conversations');
    return (Array.isArray(rows) ? rows : []).find(c => c.isGroup
      ? (c.title || 'Group') === title
      : (c.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title)) || null;
  };

  const refresh = () => {
    if (rendering) return;
    const list = document.querySelector('.chat-list');
    if (!list) return;
    const archived = read('gm_chat_archived', []);
    const favorites = read('gm_chat_favorites', []);
    const pinned = read('gm_chat_pinned', []);
    const buttons = [...list.querySelectorAll('.chat-item')];

    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.minHeight = '0';

    buttons.forEach(item => {
      const id = item.getAttribute('data-gm-conversation-id');
      if (!id) return;
      const isArchived = archived.includes(id);
      const isFavorite = favorites.includes(id);
      const pinIndex = pinned.indexOf(id);
      const visible = folder === 'all' ? !isArchived : folder === 'favorites' ? !isArchived && isFavorite : isArchived;
      item.style.display = visible ? '' : 'none';
      item.style.order = pinIndex >= 0 && folder !== 'archived' ? String(pinIndex) : '1000';
      item.classList.toggle('gm-folder-pinned', pinIndex >= 0);
      item.querySelector('.gm-folder-badges')?.remove();
      if (visible && (pinIndex >= 0 || isFavorite)) {
        const badges = document.createElement('span');
        badges.className = 'gm-folder-badges';
        badges.textContent = `${pinIndex >= 0 ? '📌' : ''}${isFavorite ? ' ★' : ''}`;
        badges.style.cssText = 'margin-left:6px;font-size:11px;white-space:nowrap;';
        item.querySelector('.chat-copy b')?.appendChild(badges);
      }
    });

    document.querySelectorAll('[data-gm-folder]').forEach(b => b.classList.toggle('active', b.dataset.gmFolder === folder));
  };

  const createFolderBar = () => {
    const list = document.querySelector('.chat-list');
    if (!list || document.getElementById('gm-chat-folders')) return;
    const bar = document.createElement('div');
    bar.id = 'gm-chat-folders';
    bar.innerHTML = '<button type="button" data-gm-folder="all">Chats</button><button type="button" data-gm-folder="favorites">★ Favorites</button><button type="button" data-gm-folder="archived">▱ Archive</button>';
    bar.addEventListener('click', e => {
      const b = e.target instanceof Element ? e.target.closest('[data-gm-folder]') : null;
      if (!b) return;
      folder = b.dataset.gmFolder || 'all';
      refresh();
    });
    list.parentElement?.insertBefore(bar, list);
    const style = document.createElement('style');
    style.id = 'gm-chat-folders-style';
    style.textContent = '#gm-chat-folders{display:flex;gap:6px;padding:8px 10px;overflow:auto;flex:0 0 auto}#gm-chat-folders button{border:1px solid rgba(127,140,170,.25);background:transparent;color:inherit;border-radius:999px;padding:6px 10px;font-size:11px;cursor:pointer;white-space:nowrap}#gm-chat-folders button.active{background:rgba(83,109,254,.14);border-color:rgba(83,109,254,.35)}';
    document.head.appendChild(style);
  };

  const addMenuActions = () => {
    const card = document.querySelector('#gm-modern-menu .gm-wa-card');
    if (!card || card.querySelector('[data-folder-action="pin"]')) return;
    const sep = document.createElement('div'); sep.className = 'gm-wa-separator';
    const pin = document.createElement('button'); pin.className = 'gm-wa-item'; pin.dataset.folderAction = 'pin';
    pin.innerHTML = '<span class="gm-wa-icon">📌</span><span class="gm-wa-label">Pin chat</span>';
    const archive = document.createElement('button'); archive.className = 'gm-wa-item'; archive.dataset.folderAction = 'archive';
    archive.innerHTML = '<span class="gm-wa-icon">▱</span><span class="gm-wa-label">Archive chat</span>';
    card.insertBefore(sep, card.firstElementChild);
    card.insertBefore(pin, card.firstElementChild);
    card.insertBefore(archive, card.firstElementChild.nextElementSibling);
  };

  const handleMenuAction = async e => {
    const button = e.target instanceof Element ? e.target.closest('[data-folder-action]') : null;
    if (!button) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const c = await activeConversation().catch(() => null);
    if (!c) return alert('Open a conversation first.');
    const id = String(c.id);
    if (button.dataset.folderAction === 'pin') {
      const pinned = read('gm_chat_pinned', []);
      const i = pinned.indexOf(id);
      if (i >= 0) pinned.splice(i, 1);
      else {
        if (pinned.length >= 3) return alert('You can pin a maximum of 3 chats.');
        pinned.push(id);
      }
      write('gm_chat_pinned', pinned);
      document.getElementById('gm-modern-menu')?.remove();
      refresh();
      return;
    }
    try {
      await request(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const archived = read('gm_chat_archived', []);
      if (!archived.includes(id)) archived.push(id);
      write('gm_chat_archived', archived);
      document.getElementById('gm-modern-menu')?.remove();
      if (folder === 'all') folder = 'archived';
      refresh();
    } catch (err) { alert(err?.message || 'Unable to archive chat.'); }
  };

  const restoreArchived = async c => {
    const id = String(c.id);
    try {
      await request(`/api/conversations/${encodeURIComponent(id)}/restore`, { method: 'POST' });
      write('gm_chat_archived', read('gm_chat_archived', []).filter(x => x !== id));
      refresh();
    } catch (err) { alert(err?.message || 'Unable to restore chat.'); }
  };

  document.addEventListener('click', handleMenuAction, true);
  const observer = new MutationObserver(() => {
    createFolderBar();
    addMenuActions();
    refresh();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('gm:chat-folders-refresh', refresh);
  window.addEventListener('gm:restore-archived', e => { if (e.detail?.conversation) void restoreArchived(e.detail.conversation); });
  createFolderBar(); addMenuActions(); refresh();
})();
