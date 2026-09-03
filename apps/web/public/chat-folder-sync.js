(() => {
  'use strict';
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const request = async (path, options = {}) => { const r = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) } }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d?.message || `Request failed (${r.status})`); return d; };
  const title = () => document.querySelector('.chat-heading b')?.textContent?.trim() || '';
  const me = () => read('gm_user', {});
  const conversations = async () => { const d = await request('/api/conversations'); return Array.isArray(d) ? d : []; };
  const chatLabel = c => c.isGroup ? (c.title || 'Group') : ((c.members || []).find(m => m.user?.id !== me().id)?.user?.displayName || 'Conversation');
  const findByTitle = (rows, label) => rows.find(c => chatLabel(c) === label);

  async function syncIds() {
    if (!token()) return;
    const list = document.querySelector('.chat-list');
    if (!list) return;
    try {
      const rows = await conversations();
      [...list.querySelectorAll('.chat-item')].forEach(item => {
        const label = item.querySelector('.chat-copy b')?.textContent?.trim();
        if (!label) return;
        const c = findByTitle(rows, label);
        if (c?.id) item.setAttribute('data-gm-conversation-id', String(c.id));
      });
      window.dispatchEvent(new CustomEvent('gm:chat-folders-refresh'));
    } catch {}
  }

  function ensureContactFolderRow() {
    const panel = document.getElementById('gm-contact-info-final');
    const section = panel?.querySelector('.gm-ci-section:last-child');
    if (!section || section.querySelector('[data-act="archive"]')) return;
    const row = document.createElement('div');
    row.className = 'gm-ci-row';
    row.dataset.act = 'archive';
    row.innerHTML = '<span class="gm-ci-icon">▱</span><div class="gm-ci-copy"><b>Archive chat</b><span>Move this conversation to Archive</span></div>';
    const favorite = section.querySelector('[data-act="favorite"]');
    if (favorite) favorite.insertAdjacentElement('afterend', row); else section.insertBefore(row, section.firstChild);
  }

  function folderKeys() {
    return { favorites: read('gm_chat_favorites', []), archived: read('gm_chat_archived', []) };
  }

  async function handleFolderAction(row) {
    const action = row?.dataset?.act;
    if (action !== 'favorite' && action !== 'archive') return false;
    const label = title();
    if (!label) return true;
    const rows = await conversations().catch(() => []);
    const c = findByTitle(rows, label);
    if (!c?.id) { alert('Conversation not found.'); return true; }
    const id = String(c.id);
    const keys = folderKeys();
    if (action === 'favorite') {
      const index = keys.favorites.indexOf(id);
      if (index >= 0) {
        keys.favorites.splice(index, 1);
        write('gm_chat_favorites', keys.favorites);
        alert(`${label} removed from favourites.`);
      } else {
        if (!keys.favorites.includes(id)) keys.favorites.push(id);
        write('gm_chat_favorites', keys.favorites);
        alert(`${label} added to favourites. Open Favorites to see this chat.`);
      }
      const p = read('gm_contact_preferences', {}); p[label] = {...(p[label] || {}), favorite: keys.favorites.includes(id)}; write('gm_contact_preferences', p);
      window.dispatchEvent(new CustomEvent('gm:chat-folders-refresh'));
      document.getElementById('gm-contact-info-final')?.remove();
      return true;
    }
    try {
      const archived = keys.archived.includes(id);
      if (archived) {
        await request(`/api/conversations/${encodeURIComponent(id)}/restore`, {method:'POST'});
        write('gm_chat_archived', keys.archived.filter(x => x !== id));
        alert(`${label} restored to Chats.`);
      } else {
        await request(`/api/conversations/${encodeURIComponent(id)}`, {method:'DELETE'});
        write('gm_chat_archived', [...keys.archived, id]);
        alert(`${label} moved to Archive. Open Archive to see this chat.`);
      }
      const p = read('gm_contact_preferences', {}); p[label] = {...(p[label] || {}), archived: !archived}; write('gm_contact_preferences', p);
      window.dispatchEvent(new CustomEvent('gm:chat-folders-refresh'));
      document.getElementById('gm-contact-info-final')?.remove();
    } catch (e) { alert(e?.message || 'Unable to update archive status.'); }
    return true;
  }

  const observer = new MutationObserver(() => { ensureContactFolderRow(); void syncIds(); });
  observer.observe(document.body, {childList:true, subtree:true});
  document.addEventListener('click', e => {
    const row = e.target instanceof Element ? e.target.closest('#gm-contact-info-final [data-act]') : null;
    if (!row || (row.dataset.act !== 'favorite' && row.dataset.act !== 'archive')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); void handleFolderAction(row);
  }, true);
  syncIds();
  setInterval(syncIds, 1500);
  setInterval(ensureContactFolderRow, 300);
})();
