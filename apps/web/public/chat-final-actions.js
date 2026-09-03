(() => {
  'use strict';
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const api = async (path, options = {}) => { const r = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) } }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d?.message || `Request failed (${r.status})`); return d; };
  const activeConversation = async () => {
    const title = document.querySelector('.chat-heading b')?.textContent?.trim(); if (!title) return null;
    const me = read('gm_user', {}); const rows = await api('/api/conversations');
    return (Array.isArray(rows) ? rows : []).find(c => c.isGroup ? (c.title || 'Group') === title : (c.members || []).some(m => m.user?.id !== me.id && (m.user?.displayName === title || m.user?.username === title))) || null;
  };
  const labelFor = c => { const me = read('gm_user', {}); return c?.isGroup ? (c.title || 'Group') : ((c?.members || []).find(m => m.user?.id !== me.id)?.user?.displayName || 'Chat'); };
  const hideDeletedRows = () => { const deleted = read('gm_chat_deleted', []); document.querySelectorAll('.chat-list .chat-item[data-gm-conversation-id]').forEach(row => { if (deleted.includes(String(row.getAttribute('data-gm-conversation-id')))) row.style.display = 'none'; }); };
  document.addEventListener('click', async e => {
    const b = e.target instanceof Element ? e.target.closest('#gm-modern-menu [data-folder-action]') : null;
    if (!b) return;
    const action = b.dataset.folderAction;
    if (action !== 'archive' && action !== 'delete-chat') return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    try {
      const c = await activeConversation(); if (!c?.id) throw new Error('Open a conversation first.');
      const id = String(c.id); const label = labelFor(c);
      const ids = read('gm_chat_conversation_ids', {}); ids[label] = id; write('gm_chat_conversation_ids', ids);
      if (action === 'archive') {
        const archived = read('gm_chat_archived', []); const wasArchived = archived.includes(id);
        if (wasArchived) { await api(`/api/conversations/${encodeURIComponent(id)}/restore`, {method:'POST'}); write('gm_chat_archived', archived.filter(x => x !== id)); }
        else { await api(`/api/conversations/${encodeURIComponent(id)}`, {method:'DELETE'}); write('gm_chat_archived', [...archived, id]); }
        document.getElementById('gm-modern-menu')?.remove();
        window.dispatchEvent(new CustomEvent('gm:chat-folders-refresh'));
        alert(wasArchived ? `${label} restored to Chats.` : `${label} moved to Archive.`);
        return;
      }
      if (!confirm(`Delete this chat and all its messages?\n\n${label}`)) return;
      await api(`/api/conversations/${encodeURIComponent(id)}/permanent`, {method:'DELETE'});
      write('gm_chat_deleted', [...new Set([...read('gm_chat_deleted', []), id])]);
      write('gm_chat_archived', read('gm_chat_archived', []).filter(x => x !== id));
      write('gm_chat_favorites', read('gm_chat_favorites', []).filter(x => x !== id));
      write('gm_chat_pinned', read('gm_chat_pinned', []).filter(x => x !== id));
      document.getElementById('gm-modern-menu')?.remove();
      document.querySelector('.messages')?.replaceChildren();
      hideDeletedRows();
      window.dispatchEvent(new CustomEvent('gm:chat-folders-refresh'));
      alert(`${label} and its messages were deleted from your chat list.`);
    } catch (err) { alert(err?.message || 'Unable to complete the chat action.'); }
  }, true);
  const observer = new MutationObserver(hideDeletedRows);
  observer.observe(document.body, {childList:true, subtree:true});
  setInterval(hideDeletedRows, 1000);
  hideDeletedRows();
})();
