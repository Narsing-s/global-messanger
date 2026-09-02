(() => {
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
  const conversations = async () => { const res = await fetch(`${API}/api/conversations`, { headers: headers() }); if (!res.ok) throw new Error('Unable to load conversations'); return res.json(); };
  const currentConversation = async () => { const title = document.querySelector('.chat-heading b')?.textContent?.trim(); if (!title) return null; const me = JSON.parse(localStorage.getItem('gm_user') || '{}'); const rows = await conversations(); return (Array.isArray(rows) ? rows : []).find(c => c.isGroup ? (c.title || 'Group') === title : (c.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title)) || null; };
  const markRead = async id => { if (!id || !token()) return; try { await fetch(`${API}/api/conversations/${encodeURIComponent(id)}/read`, { method: 'POST', headers: headers() }); document.querySelector(`.chat-item[data-gm-conversation-id="${CSS.escape(String(id))}"] .gm-unread-badge`)?.remove(); window.dispatchEvent(new CustomEvent('gm:chat-read', { detail: { conversationId: String(id) } })); } catch {} };
  const rememberBlocked = (userId, conversationId) => { try { const users = JSON.parse(localStorage.getItem('gm_blocked_ids') || '[]'); if (!users.includes(userId)) users.push(userId); localStorage.setItem('gm_blocked_ids', JSON.stringify(users)); const chats = JSON.parse(localStorage.getItem('gm_blocked_conversations') || '{}'); chats[conversationId] = userId; localStorage.setItem('gm_blocked_conversations', JSON.stringify(chats)); } catch {} };
  const markBlocked = conversationId => { const item = document.querySelector(`.chat-item[data-gm-conversation-id="${CSS.escape(String(conversationId))}"]`); if (item) { item.querySelector('.gm-blocked-marker')?.remove(); const marker = document.createElement('span'); marker.className = 'gm-blocked-marker'; marker.textContent = '🚫 Blocked'; Object.assign(marker.style, { marginLeft: '6px', fontSize: '10px', fontWeight: '700', color: '#dc2626' }); item.querySelector('.chat-copy')?.appendChild(marker); } const heading = document.querySelector('.chat-heading > div:nth-child(2)'); if (heading) { heading.querySelector('.gm-active-blocked')?.remove(); const marker = document.createElement('span'); marker.className = 'gm-active-blocked'; marker.textContent = '🚫 User blocked'; Object.assign(marker.style, { display: 'inline-block', marginTop: '3px', fontSize: '11px', fontWeight: '700', color: '#dc2626' }); heading.appendChild(marker); } };
  const closeMenu = () => document.getElementById('gm-modern-menu')?.remove();

  let syncTimer = 0;
  const hideBlockedMessages = async () => {
    if (!token()) return;
    const c = await currentConversation().catch(() => null);
    if (!c) return;
    const blocked = await fetch(`${API}/api/users/blocked`, { headers: headers() }).then(r => r.ok ? r.json() : []).catch(() => []);
    const blockedIds = new Set((Array.isArray(blocked) ? blocked : []).map(x => String(x.blockedUserId)));
    if (!blockedIds.size) return;
    const data = await fetch(`${API}/api/conversations/${encodeURIComponent(c.id)}/messages?limit=100`, { headers: headers() }).then(r => r.ok ? r.json() : []).catch(() => []);
    const rows = Array.isArray(data) ? data : (data?.messages || []);
    const blockedMessageIds = new Set(rows.filter(m => blockedIds.has(String(m.senderId))).map(m => String(m.id)));
    document.querySelectorAll('.messages .bubble-row[data-message-id]').forEach(row => { const id = String(row.getAttribute('data-message-id') || ''); if (blockedMessageIds.has(id)) row.remove(); });
  };
  const scheduleBlockedSync = () => { window.clearTimeout(syncTimer); syncTimer = window.setTimeout(() => { void hideBlockedMessages(); }, 350); };

  document.addEventListener('click', e => { const item = e.target instanceof Element ? e.target.closest('.chat-item') : null; if (!item) return; window.setTimeout(() => { const id = item.getAttribute('data-gm-conversation-id'); if (id) void markRead(id); scheduleBlockedSync(); }, 120); }, true);

  document.addEventListener('click', async e => {
    const button = e.target instanceof Element ? e.target.closest('[data-act="block"]') : null;
    if (!button) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try {
      const c = await currentConversation(); const me = JSON.parse(localStorage.getItem('gm_user') || '{}'); const other = c?.members?.find(m => m.user?.id !== me.id)?.user;
      if (!c || !other) return alert('There is no individual contact to block in this chat.');
      if (!confirm(`Block ${other.displayName || other.username}? They will no longer be able to message or call you.`)) return;
      const res = await fetch(`${API}/api/users/${encodeURIComponent(other.id)}/block`, { method: 'POST', headers: headers() });
      const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.message || 'Unable to block user.');
      rememberBlocked(String(other.id), String(c.id)); closeMenu(); markBlocked(c.id); scheduleBlockedSync(); alert(`${other.displayName || other.username} is now blocked.`);
    } catch (err) { alert(err?.message || 'Unable to block user.'); }
  }, true);

  // Stop the existing call handlers before they start when this account has blocked the chat contact.
  document.addEventListener('click', async e => {
    const button = e.target instanceof Element ? e.target.closest('.top-actions [title="Voice call"], .top-actions [title="Video call"]') : null;
    if (!button) return;
    const c = await currentConversation().catch(() => null); const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
    const other = c?.members?.find(m => m.user?.id !== me.id)?.user;
    const blocked = new Set(JSON.parse(localStorage.getItem('gm_blocked_ids') || '[]').map(String));
    if (other?.id && blocked.has(String(other.id))) { e.preventDefault(); e.stopImmediatePropagation(); alert('This user is blocked. Calls are unavailable.'); }
  }, true);

  window.addEventListener('gm:call', e => { const blocked = JSON.parse(localStorage.getItem('gm_blocked_ids') || '[]').map(String); const detail = e.detail || {}; if (detail?.blockedByUserId && blocked.includes(String(detail.blockedByUserId))) { e.preventDefault(); e.stopImmediatePropagation(); alert('This user is blocked. Calls are unavailable.'); } }, true);
  window.addEventListener('gm:chat-read', e => { const id = e.detail?.conversationId; if (!id) return; document.querySelector(`.chat-item[data-gm-conversation-id="${CSS.escape(String(id))}"] .gm-unread-badge`)?.remove(); });
  const observer = new MutationObserver(() => { if (document.querySelector('.messages .bubble-row')) scheduleBlockedSync(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(scheduleBlockedSync, 700);
})();
