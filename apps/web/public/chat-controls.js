(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? location.origin : 'https://global-messenger-api.narsingbeesetti006.workers.dev');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };
  const badge = count => { const el = document.createElement('span'); el.className = 'gm-unread-badge'; el.textContent = count > 99 ? '99+' : String(count); Object.assign(el.style, { marginLeft: 'auto', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', background: '#ef4444', color: '#fff' }); return el; };
  async function refresh() {
    if (!token()) return;
    try {
      const rows = await request('/api/conversations/unread');
      const map = new Map((Array.isArray(rows) ? rows : []).map(x => [String(x.conversationId), x]));
      for (const item of document.querySelectorAll('.chat-item')) {
        const id = item.getAttribute('data-gm-conversation-id'); if (!id) continue;
        const info = map.get(id); item.querySelector('.gm-unread-badge')?.remove();
        if (item.classList.contains('selected') && info?.archived) { try { await request(`/api/conversations/${encodeURIComponent(id)}/restore`, { method: 'POST' }); info.archived = false; } catch {} }
        if (info?.unreadCount > 0) item.appendChild(badge(info.unreadCount));
        item.style.display = info?.archived && !(info?.unreadCount > 0) ? 'none' : '';
      }
    } catch {}
  }
  function addDeleteButton(item) {
    if (item.querySelector('.gm-delete-chat')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'gm-delete-chat'; button.title = 'Remove chat'; button.textContent = '×';
    Object.assign(button.style, { marginLeft: '4px', width: '24px', height: '24px', flex: '0 0 24px', border: '0', borderRadius: '8px', background: 'transparent', color: 'inherit', opacity: '0.55', cursor: 'pointer', fontSize: '18px', lineHeight: '24px' });
    button.addEventListener('click', async e => { e.preventDefault(); e.stopPropagation(); const id = item.getAttribute('data-gm-conversation-id'); if (!id) return; if (!confirm('Remove this chat from your account? Messages are kept for the other person. If they message you again, this chat will return with an unread count.')) return; try { await request(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }); item.style.display = 'none'; } catch (err) { alert(err.message || 'Unable to remove chat'); } });
    item.appendChild(button);
  }
  function enhance() { document.querySelectorAll('.chat-item').forEach(item => { if (!item.dataset.gmEnhanced) { item.dataset.gmEnhanced = '1'; item.addEventListener('contextmenu', async e => { e.preventDefault(); item.querySelector('.gm-delete-chat')?.click(); }); } addDeleteButton(item); }); }
  async function mapConversationIds() {
    if (!token()) return;
    try {
      const conversations = await request('/api/conversations'); const user = JSON.parse(localStorage.getItem('gm_user') || '{}');
      const names = conversations.map(c => ({ c, name: c.isGroup ? (c.title || 'Group') : (c.members || []).find(m => m.user?.id !== user.id)?.user?.displayName || 'Conversation' }));
      document.querySelectorAll('.chat-item').forEach(item => { if (item.dataset.gmConversationId) return; const label = item.querySelector('.chat-copy b')?.textContent?.trim(); const hit = names.find(x => x.name === label); if (hit) item.dataset.gmConversationId = hit.c.id; });
    } catch {}
  }
  const observer = new MutationObserver(() => { void mapConversationIds().then(enhance); }); observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => { void mapConversationIds().then(enhance).then(refresh); }, 2500);
  setTimeout(() => { void mapConversationIds().then(enhance).then(refresh); }, 1200);
})();
