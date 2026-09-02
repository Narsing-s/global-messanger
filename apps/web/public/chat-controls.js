(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? location.origin : 'https://global-messenger-api.narsingbeesetti006.workers.dev');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };

  const badge = (count) => {
    const el = document.createElement('span');
    el.className = 'gm-unread-badge';
    el.textContent = count > 99 ? '99+' : String(count);
    Object.assign(el.style, { marginLeft: 'auto', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', background: '#ef4444', color: '#fff' });
    return el;
  };

  async function refresh() {
    if (!token()) return;
    try {
      const rows = await request('/api/conversations/unread');
      const map = new Map((Array.isArray(rows) ? rows : []).map(x => [String(x.conversationId), x]));
      document.querySelectorAll('.chat-item').forEach(item => {
        const id = item.getAttribute('data-gm-conversation-id');
        if (!id) return;
        const info = map.get(id);
        item.querySelector('.gm-unread-badge')?.remove();
        if (info?.unreadCount > 0) item.appendChild(badge(info.unreadCount));
        item.style.display = info?.archived && !(info?.unreadCount > 0) ? 'none' : '';
      });
    } catch {}
  }

  function enhance() {
    document.querySelectorAll('.chat-item').forEach(item => {
      if (item.dataset.gmEnhanced) return;
      item.dataset.gmEnhanced = '1';
      const original = item.onclick;
      const text = item.textContent || '';
      const candidates = [...document.querySelectorAll('.chat-item')];
      const chats = JSON.parse(localStorage.getItem('gm_chat_controls_map') || '{}');
      const key = text.slice(0, 120);
      const knownId = chats[key];
      if (knownId) item.dataset.gmConversationId = knownId;
      item.addEventListener('contextmenu', async e => {
        e.preventDefault();
        const id = item.getAttribute('data-gm-conversation-id');
        if (!id) return;
        if (!confirm('Remove this chat from your account? Your messages will not be deleted for the other person. If they message you again, the chat will appear with an unread count.')) return;
        try { await request(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }); item.style.display = 'none'; } catch (err) { alert(err.message || 'Unable to remove chat'); }
      });
    });
  }

  // React does not expose conversation IDs as DOM attributes, so map rendered
  // chat buttons to the conversation list returned by the same authenticated API.
  async function mapConversationIds() {
    if (!token()) return;
    try {
      const conversations = await request('/api/conversations');
      const user = JSON.parse(localStorage.getItem('gm_user') || '{}');
      const names = conversations.map(c => ({ c, name: c.isGroup ? (c.title || 'Group') : (c.members || []).find(m => m.user?.id !== user.id)?.user?.displayName || 'Conversation' }));
      document.querySelectorAll('.chat-item').forEach(item => {
        if (item.dataset.gmConversationId) return;
        const label = item.querySelector('.chat-copy b')?.textContent?.trim();
        const hit = names.find(x => x.name === label);
        if (hit) item.dataset.gmConversationId = hit.c.id;
      });
    } catch {}
  }

  const observer = new MutationObserver(() => { void mapConversationIds().then(enhance); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => { void mapConversationIds().then(enhance).then(refresh); }, 2500);
  setTimeout(() => { void mapConversationIds().then(enhance).then(refresh); }, 1200);
})();
