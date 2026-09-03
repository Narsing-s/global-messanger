(() => {
  'use strict';
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  let folder = 'all';
  let syncingServerState = false;

  const request = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };

  const syncServerArchiveState = async () => {
    if (!token() || syncingServerState) return;
    syncingServerState = true;
    try {
      const rows = await request('/api/conversations/unread');
      if (Array.isArray(rows)) write('gm_chat_archived', rows.filter(row => row.archived).map(row => String(row.conversationId)));
    } catch {} finally { syncingServerState = false; }
  };

  const activeConversation = async () => {
    const title = document.querySelector('.chat-heading b')?.textContent?.trim();
    if (!title) return null;
    const me = read('gm_user', {});
    const rows = await request('/api/conversations');
    return (Array.isArray(rows) ? rows : []).find(c => c.isGroup
      ? (c.title || 'Group') === title
      : (c.members || []).some(m => m.user?.id !== me.id && (m.user?.displayName === title || m.user?.username === title))) || null;
  };

  const refresh = () => {
    const list = document.querySelector('.chat-list'); if (!list) return;
    const archived = read('gm_chat_archived', []), favorites = read('gm_chat_favorites', []), pinned = read('gm_chat_pinned', []), deleted = read('gm_chat_deleted', []);
    list.style.display = 'flex'; list.style.flexDirection = 'column';
    [...list.querySelectorAll('.chat-item')].forEach(item => {
      const id = item.getAttribute('data-gm-conversation-id'); if (!id) return;
      const isDeleted = deleted.includes(String(id));
      const isArchived = archived.includes(String(id)), isFavorite = favorites.includes(String(id)), pinIndex = pinned.indexOf(String(id));
      const visible = !isDeleted && (folder === 'all' ? !isArchived : folder === 'favorites' ? !isArchived && isFavorite : isArchived);
      const display = visible ? '' : 'none';
      if (item.style.display !== display) item.style.display = display;
      const order = pinIndex >= 0 && folder !== 'archived' ? String(pinIndex) : '1000';
      if (item.style.order !== order) item.style.order = order;
      item.classList.toggle('gm-folder-pinned', pinIndex >= 0);
      item.querySelector('.gm-folder-badges')?.remove();
      if (visible && (pinIndex >= 0 || isFavorite)) {
        const badges = document.createElement('span'); badges.className = 'gm-folder-badges'; badges.textContent = `${pinIndex >= 0 ? '📌' : ''}${isFavorite ? ' ★' : ''}`; badges.style.cssText = 'margin-left:6px;font-size:11px;white-space:nowrap;'; item.querySelector('.chat-copy b')?.appendChild(badges);
      }
    });
    document.querySelectorAll('[data-gm-folder]').forEach(b => b.classList.toggle('active', b.dataset.gmFolder === folder));
  };

  const ensureMenuActions = () => {
    const card = document.querySelector('#gm-modern-menu .gm-wa-card'); if (!card) return;
    const archived = read('gm_chat_archived', []);
    let pin = card.querySelector('[data-folder-action="pin"]');
    let archive = card.querySelector('[data-folder-action="archive"]');
    let del = card.querySelector('[data-folder-action="delete-chat"]');

    if (!pin) {
      const sep = document.createElement('div'); sep.className = 'gm-wa-separator';
      pin = document.createElement('button'); pin.type = 'button'; pin.className = 'gm-wa-item'; pin.dataset.folderAction = 'pin';
      pin.innerHTML = '<span class="gm-wa-icon">📌</span><span class="gm-wa-label">Pin chat</span>';
      card.appendChild(sep); card.appendChild(pin);
    }
    if (!archive) {
      archive = document.createElement('button'); archive.type = 'button'; archive.className = 'gm-wa-item'; archive.dataset.folderAction = 'archive';
      archive.innerHTML = `<span class="gm-wa-icon">▱</span><span class="gm-wa-label">${archived.length ? 'Archive chat' : 'Archive chat'}</span>`;
      card.appendChild(archive);
    } else {
      const label = archive.querySelector('.gm-wa-label'); if (label) label.textContent = 'Archive chat';
    }
    if (!del) {
      del = document.createElement('button'); del.type = 'button'; del.className = 'gm-wa-item danger'; del.dataset.folderAction = 'delete-chat';
      del.innerHTML = '<span class="gm-wa-icon">🗑</span><span class="gm-wa-label">Delete chat</span>';
      card.appendChild(del);
    }
  };

  document.addEventListener('click', async e => {
    const button = e.target instanceof Element ? e.target.closest('[data-folder-action]') : null; if (!button) return;
    const action = button.dataset.folderAction;
    if (action !== 'pin' && action !== 'archive' && action !== 'delete-chat') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const c = await activeConversation().catch(() => null); if (!c) return alert('Open a conversation first.');
    const id = String(c.id);
    if (action === 'pin') {
      const pinned = read('gm_chat_pinned', []), i = pinned.indexOf(id);
      if (i >= 0) pinned.splice(i, 1); else { if (pinned.length >= 3) return alert('You can pin a maximum of 3 chats.'); pinned.push(id); }
      write('gm_chat_pinned', pinned); document.getElementById('gm-modern-menu')?.remove(); refresh(); return;
    }
    if (action === 'delete-chat') {
      const me = read('gm_user', {});
      const other = (c.members || []).find(m => m.user?.id !== me.id)?.user;
      const label = c.isGroup ? (c.title || 'Group') : (other?.displayName || other?.username || 'this chat');
      if (!confirm(`Delete this chat and all messages? This removes “${label}” from your chat list.`)) return;
      try {
        await request(`/api/conversations/${encodeURIComponent(id)}/permanent`, { method: 'DELETE' });
        write('gm_chat_deleted', [...new Set([...read('gm_chat_deleted', []), id])]);
        write('gm_chat_archived', read('gm_chat_archived', []).filter(x => x !== id));
        write('gm_chat_favorites', read('gm_chat_favorites', []).filter(x => x !== id));
        write('gm_chat_pinned', read('gm_chat_pinned', []).filter(x => x !== id));
        document.getElementById('gm-modern-menu')?.remove();
        document.querySelector('.messages')?.replaceChildren();
        folder = 'all'; refresh();
        window.dispatchEvent(new CustomEvent('gm:chat-folders-refresh'));
        alert(`${label} was deleted from your chat list.`);
      } catch (err) { alert(err?.message || 'Unable to delete chat.'); }
      return;
    }
    try {
      const archived = read('gm_chat_archived', []);
      if (archived.includes(id)) {
        await request(`/api/conversations/${encodeURIComponent(id)}/restore`, { method: 'POST' });
        write('gm_chat_archived', archived.filter(x => x !== id));
        folder = 'all';
        alert('Chat restored to Chats.');
      } else {
        await request(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
        write('gm_chat_archived', [...new Set([...archived, id])]);
        folder = 'archived';
        alert('Chat moved to Archive.');
      }
      document.getElementById('gm-modern-menu')?.remove(); refresh();
      setTimeout(() => { void syncServerArchiveState().then(refresh); }, 150);
    } catch (err) { alert(err?.message || 'Unable to update archive status.'); }
  }, true);

  document.addEventListener('click', e => {
    if (e.target instanceof Element && e.target.closest('.top-actions button[title="More options"]')) {
      window.setTimeout(ensureMenuActions, 0);
      window.setTimeout(ensureMenuActions, 50);
      window.setTimeout(ensureMenuActions, 200);
    }
  }, true);

  const observer = new MutationObserver(() => { ensureMenuActions(); refresh(); });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('gm:chat-folders-refresh', refresh);
  ensureMenuActions();
  createFolderBar();
  refresh();
  void syncServerArchiveState().then(refresh);
  window.setInterval(() => { createFolderBar(); ensureMenuActions(); void syncServerArchiveState().then(refresh); }, 1000);

  function createFolderBar() {
    const list = document.querySelector('.chat-list'); if (!list || document.getElementById('gm-chat-folders')) return;
    const bar = document.createElement('div'); bar.id = 'gm-chat-folders';
    bar.innerHTML = '<button type="button" data-gm-folder="all">Chats</button><button type="button" data-gm-folder="favorites">★ Favorites</button><button type="button" data-gm-folder="archived">▱ Archive</button>';
    bar.addEventListener('click', e => { const b = e.target instanceof Element ? e.target.closest('[data-gm-folder]') : null; if (!b) return; folder = b.dataset.gmFolder || 'all'; refresh(); });
    list.parentElement?.insertBefore(bar, list);
    if (!document.getElementById('gm-chat-folders-style')) { const style = document.createElement('style'); style.id = 'gm-chat-folders-style'; style.textContent = '#gm-chat-folders{display:flex;gap:6px;padding:8px 10px;overflow:auto;flex:0 0 auto}#gm-chat-folders button{border:1px solid rgba(127,140,170,.25);background:transparent;color:inherit;border-radius:999px;padding:6px 10px;font-size:11px;cursor:pointer;white-space:nowrap}#gm-chat-folders button.active{background:rgba(83,109,254,.14);border-color:rgba(83,109,254,.35)}'; document.head.appendChild(style); }
  }
})();