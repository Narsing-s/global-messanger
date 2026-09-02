(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? location.origin : 'https://global-messenger-api.narsingbeesetti006.workers.dev');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, options = {}) => {
    const hasBody = options.body !== undefined && options.body !== null;
    const headers = { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) };
    const res = await fetch(`${API}${path}`, { ...options, headers });
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
        if (info?.unreadCount > 0) item.appendChild(badge(info.unreadCount));
        item.style.display = '';
      }
      document.querySelectorAll('.chat-item.selected .gm-unread-badge').forEach(el => el.remove());
    } catch {}
  }
  function addDeleteButton(item) {
    if (item.querySelector('.gm-delete-chat')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'gm-delete-chat'; button.title = 'Chat options'; button.textContent = '';
    Object.assign(button.style, { display: 'none' });
    item.appendChild(button);
  }
  function enhance() { document.querySelectorAll('.chat-item').forEach(item => { addDeleteButton(item); }); }
  async function mapConversationIds() {
    if (!token()) return;
    try {
      const conversations = await request('/api/conversations'); const user = JSON.parse(localStorage.getItem('gm_user') || '{}');
      const names = conversations.map(c => ({ c, name: c.isGroup ? (c.title || 'Group') : (c.members || []).find(m => m.user?.id !== user.id)?.user?.displayName || 'Conversation' }));
      document.querySelectorAll('.chat-item').forEach(item => { if (item.dataset.gmConversationId) return; const label = item.querySelector('.chat-copy b')?.textContent?.trim(); const hit = names.find(x => x.name === label); if (hit) item.dataset.gmConversationId = hit.c.id; });
    } catch {}
  }
  const observer = new MutationObserver(() => { void mapConversationIds().then(enhance); }); observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => { const item = e.target instanceof Element ? e.target.closest('.chat-item') : null; if (item) setTimeout(refresh, 250); });
  setInterval(() => { void mapConversationIds().then(enhance).then(refresh); }, 2500);
  setTimeout(() => { void mapConversationIds().then(enhance).then(refresh); }, 1200);
})();
