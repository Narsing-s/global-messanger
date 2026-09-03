(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';

  const request = async (path, options = {}) => {
    const hasBody = options.body !== undefined && options.body !== null;
    const headers = {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    };
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };

  // IMPORTANT: React owns the chat list DOM. This helper must never append,
  // remove, replace, or otherwise re-parent nodes inside .chat-item. Doing so
  // can make React attempt to remove a node that was already moved/removed.
  // Read state is therefore kept server-side and the React UI is left alone.
  let conversationsPromise = null;
  const conversations = async () => {
    if (conversationsPromise) return conversationsPromise;
    conversationsPromise = request('/api/conversations').finally(() => {
      conversationsPromise = null;
    });
    return conversationsPromise;
  };

  const currentConversation = async () => {
    const title = (document.querySelector('.chat-heading b')?.textContent || '').trim();
    if (!title) return null;
    const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
    const rows = await conversations();
    return (Array.isArray(rows) ? rows : []).find(c => {
      if (c.isGroup) return (c.title || 'Group') === title;
      return (c.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title);
    }) || null;
  };

  let lastReadConversationId = '';
  let lastReadAt = 0;

  async function markCurrentChatRead() {
    if (!token()) return;
    try {
      const conversation = await currentConversation();
      const id = conversation?.id ? String(conversation.id) : '';
      if (!id) return;

      // Avoid a burst of duplicate read requests while React is switching chats.
      const now = Date.now();
      if (id === lastReadConversationId && now - lastReadAt < 1000) return;
      lastReadConversationId = id;
      lastReadAt = now;

      await request(`/api/conversations/${encodeURIComponent(id)}/read`, { method: 'POST' });
    } catch {
      // A read-receipt failure must never break the Messenger UI.
    }
  }

  // Mark the newly opened conversation as read after React has finished its
  // chat switch. No DOM manipulation is performed here.
  document.addEventListener('click', e => {
    const item = e.target instanceof Element ? e.target.closest('.chat-item') : null;
    if (!item) return;
    setTimeout(() => { void markCurrentChatRead(); }, 120);
  }, false);

  // Also handle programmatic chat switches and direct navigation.
  let lastHeading = '';
  setInterval(() => {
    const heading = (document.querySelector('.chat-heading b')?.textContent || '').trim();
    if (heading && heading !== lastHeading) {
      lastHeading = heading;
      setTimeout(() => { void markCurrentChatRead(); }, 120);
    }
  }, 500);
})();
