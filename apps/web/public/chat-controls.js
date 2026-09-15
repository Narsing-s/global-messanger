(() => {
  const API = () => window.location.origin.replace(/\/$/, '');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, options = {}) => {
    const hasBody = options.body !== undefined && options.body !== null;
    const headers = {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    };
    const res = await fetch(`${API()}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };
  let conversationsPromise = null;
  const conversations = async () => {
    if (conversationsPromise) return conversationsPromise;
    conversationsPromise = request('/api/conversations').finally(() => { conversationsPromise = null; });
    return conversationsPromise;
  };
  const currentConversation = async () => {
    const title = (document.querySelector('.chat-heading b')?.textContent || '').trim();
    if (!title) return null;
    const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
    const rows = await conversations();
    return (Array.isArray(rows) ? rows : []).find(c => c.isGroup ? (c.title || 'Group') === title : (c.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title)) || null;
  };
  let lastReadConversationId = '';
  let lastReadAt = 0;
  async function markCurrentChatRead() {
    if (!token()) return;
    try {
      const conversation = await currentConversation();
      const id = conversation?.id ? String(conversation.id) : '';
      if (!id) return;
      const now = Date.now();
      if (id === lastReadConversationId && now - lastReadAt < 1000) return;
      lastReadConversationId = id;
      lastReadAt = now;
      await request(`/api/conversations/${encodeURIComponent(id)}/read`, { method: 'POST' });
    } catch {}
  }
  document.addEventListener('click', e => {
    const item = e.target instanceof Element ? e.target.closest('.chat-item') : null;
    if (!item) return;
    setTimeout(() => { void markCurrentChatRead(); }, 120);
  }, false);
  let lastHeading = '';
  setInterval(() => {
    const heading = (document.querySelector('.chat-heading b')?.textContent || '').trim();
    if (heading && heading !== lastHeading) { lastHeading = heading; setTimeout(() => { void markCurrentChatRead(); }, 120); }
  }, 500);
})();
