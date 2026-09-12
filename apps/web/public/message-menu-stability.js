(() => {
  'use strict';
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const user = () => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

  async function request(path, opt = {}) {
    const headers = { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
    if (opt.body && !(opt.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { ...opt, headers: { ...headers, ...(opt.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d?.message || `Request failed (${r.status})`);
    return d;
  }

  const rowOf = el => el?.closest('.bubble-row');
  const messageIdOf = el => rowOf(el)?.getAttribute('data-message-id') || '';
  const rowById = id => document.querySelector(`.bubble-row[data-message-id="${CSS.escape(String(id))}"]`);

  async function activeChat() {
    const title = document.querySelector('.chat-heading b')?.textContent?.trim();
    if (!title) return null;
    const me = user();
    const rows = await request('/api/conversations');
    return (Array.isArray(rows) ? rows : []).find(c => c.isGroup
      ? (c.title || 'Group') === title
      : (c.members || []).some(m => m.user?.id !== me.id && (m.user?.displayName === title || m.user?.username === title))) || null;
  }

  function closeOtherSurfaces() {
    document.querySelectorAll('#gm-enhance-modal,#gm-modern-menu,#gm-gm-modal,#gm-contact-drawer,#gm-msg-info').forEach(el => el.remove());
    document.querySelectorAll('.emoji-picker,.emoji-panel').forEach(el => el.remove());
  }
  function closeMenus() { document.querySelectorAll('.message-menu').forEach(m => m.remove()); }
  function toast(text) {
    let t = document.getElementById('gm-message-toast');
    if (!t) { t = document.createElement('div'); t.id = 'gm-message-toast'; t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:100006;background:#171717;color:#fff;padding:10px 16px;border-radius:999px;font:13px system-ui;box-shadow:0 8px 30px #0006'; document.body.appendChild(t); }
    t.textContent = text; t.style.display = 'block'; clearTimeout(t.__timer); t.__timer = setTimeout(() => t.style.display = 'none', 1800);
  }
  function showInfo(html) {
    let d = document.getElementById('gm-msg-info'); if (d) d.remove();
    d = document.createElement('div'); d.id = 'gm-msg-info'; d.style.cssText = 'position:fixed;inset:0;z-index:100005;background:#0008;display:grid;place-items:center;padding:18px;font-family:system-ui';
    d.innerHTML = `<div style="width:min(430px,94vw);background:#fff;color:#172033;border-radius:18px;padding:20px;box-shadow:0 25px 80px #0006"><div style="display:flex;justify-content:space-between"><h3 style="margin:0 0 16px">Message info</h3><button data-close style="border:0;background:transparent;font-size:22px">×</button></div>${html}<button data-close style="margin-top:18px;width:100%;padding:10px;border:0;border-radius:10px;background:#635bff;color:#fff">Close</button></div>`;
    document.body.appendChild(d); d.querySelectorAll('[data-close]').forEach(x => x.onclick = () => d.remove());
  }

  async function getSaved(id) {
    try { const d = await request('/api/bookmarks'); const list = Array.isArray(d) ? d : (d?.bookmarks || []); return list.some(x => String(x.messageId || x.message?.id) === String(id)); } catch { return read('gm_saved_messages_v1', []).map(String).includes(String(id)); }
  }
  async function getPinned(id) {
    try {
      const c = await activeChat(); if (!c) return false;
      const d = await request(`/api/conversations/${encodeURIComponent(c.id)}/pins`);
      const list = Array.isArray(d) ? d : (d?.pins || []);
      return list.some(x => String(x.messageId || x.message?.id) === String(id));
    } catch { return read('gm_pinned_messages_v1', []).map(String).includes(String(id)); }
  }

  async function syncMenuStates(menu) {
    const id = menu.__gmMessageId || messageIdOf(menu);
    if (!id) return;
    const save = menu.querySelector('[data-gm-msg-action="save"]');
    const pin = menu.querySelector('[data-gm-msg-action="pin"]');
    try {
      const [saved, pinned] = await Promise.all([getSaved(id), getPinned(id)]);
      if (save) { save.dataset.active = saved ? '1' : '0'; save.innerHTML = `<span>🔖</span> ${saved ? 'Unsave' : 'Save'}`; }
      if (pin) { pin.dataset.active = pinned ? '1' : '0'; pin.innerHTML = `<span>📌</span> ${pinned ? 'Unpin' : 'Pin'}`; }
    } catch {}
  }

  async function runAction(action, button) {
    const id = button.dataset.gmMessageId || messageIdOf(button); if (!id) return;
    const row = rowById(id);
    const body = row?.querySelector('.bubble p')?.textContent?.trim() || '';
    try {
      if (action === 'copy') {
        if (navigator.clipboard) await navigator.clipboard.writeText(body); else { const x = document.createElement('textarea'); x.value = body; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); }
        toast('Message copied'); return closeMenus();
      }
      if (action === 'save') {
        const saved = button.dataset.active === '1';
        if (saved) { await request(`/api/messages/${encodeURIComponent(id)}/bookmark`, { method: 'DELETE' }); write('gm_saved_messages_v1', read('gm_saved_messages_v1', []).map(String).filter(x => x !== String(id))); toast('Message unsaved'); }
        else { await request(`/api/messages/${encodeURIComponent(id)}/bookmark`, { method: 'POST' }); write('gm_saved_messages_v1', [...new Set([...read('gm_saved_messages_v1', []).map(String), String(id)])]); toast('Message saved'); }
        return closeMenus();
      }
      if (action === 'pin') {
        const c = await activeChat(); if (!c) throw Error('Open the conversation first.');
        const pinned = button.dataset.active === '1';
        if (pinned) { await request(`/api/conversations/${encodeURIComponent(c.id)}/pins/${encodeURIComponent(id)}`, { method: 'DELETE' }); write('gm_pinned_messages_v1', read('gm_pinned_messages_v1', []).map(String).filter(x => x !== String(id))); toast('Message unpinned'); }
        else { await request(`/api/conversations/${encodeURIComponent(c.id)}/pins`, { method: 'POST', body: JSON.stringify({ messageId: id }) }); write('gm_pinned_messages_v1', [...new Set([...read('gm_pinned_messages_v1', []).map(String), String(id)])]); toast('Message pinned'); }
        return closeMenus();
      }
      if (action === 'info') {
        const d = await request(`/api/messages/${encodeURIComponent(id)}/info`);
        showInfo(`<div><b>Sent</b><br>${esc(new Date(d.createdAt).toLocaleString())}</div><div style="margin-top:12px"><b>Sender</b><br>${esc(d.sender?.displayName || 'User')}</div><div style="margin-top:12px"><b>Status</b><br>${d.editedAt ? 'Edited · ' : ''}${d.deletedAt ? 'Deleted' : 'Active'}</div><div style="margin-top:12px"><b>Reactions</b><br>${Array.isArray(d.reactions) ? d.reactions.length : 0}</div><div style="margin-top:12px"><b>Receipts</b><br>${Array.isArray(d.receipts) ? d.receipts.length : 0}</div>`); return;
      }
      if (action === 'forward') {
        const current = await activeChat(); const cs = await request('/api/conversations'); const choices = (Array.isArray(cs) ? cs : []).filter(c => String(c.id) !== String(current?.id)).slice(0, 30);
        if (!choices.length) throw Error('No other chats available.');
        const list = choices.map((c, i) => `${i + 1}. ${c.isGroup ? (c.title || 'Group') : (c.members || []).find(m => m.user?.id !== user().id)?.user?.displayName || 'Chat'}`).join('\n');
        const pick = Number(prompt(`Forward this message to:\n\n${list}\n\nEnter the number:`)); if (!pick || pick < 1 || pick > choices.length) return;
        await request('/api/messages/forward', { method: 'POST', body: JSON.stringify({ messageId: id, conversationId: choices[pick - 1].id }) }); toast('Message forwarded'); return closeMenus();
      }
      if (action === 'delete-me') {
        const ids = read('gm_deleted_messages_v1', []).map(String); if (!ids.includes(String(id))) ids.push(String(id)); write('gm_deleted_messages_v1', ids); row?.remove(); toast('Message deleted for you'); return;
      }
    } catch (e) { alert(e?.message || 'Operation failed'); }
  }

  function addButton(menu, label, icon, action, danger = false) {
    if (menu.querySelector(`[data-gm-msg-action="${action}"]`)) return;
    const b = document.createElement('button'); b.type = 'button'; b.dataset.gmMsgAction = action; b.innerHTML = `<span>${icon}</span> ${label}`; if (danger) b.classList.add('danger');
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); void runAction(action, b); }); menu.appendChild(b);
  }
  function decorateMenu(menu) {
    if (!menu) return;
    const row = menu.closest('.bubble-row'); const id = row?.getAttribute('data-message-id') || '';
    menu.__gmMessageId = id;
    [...menu.querySelectorAll('button')].forEach(b => {
      b.dataset.gmMessageId = id;
      if (/^delete$/i.test((b.textContent || '').trim())) b.innerHTML = b.innerHTML.replace(/Delete/i, 'Delete for everyone');
    });
    addButton(menu, 'Copy', '📋', 'copy'); addButton(menu, 'Save', '🔖', 'save'); addButton(menu, 'Pin', '📌', 'pin'); addButton(menu, 'Forward', '↗', 'forward'); addButton(menu, 'Message info', 'ⓘ', 'info'); addButton(menu, 'Delete for me', '🗑', 'delete-me', true);
    menu.querySelectorAll('[data-gm-msg-action]').forEach(b => b.dataset.gmMessageId = id);
    void syncMenuStates(menu);
  }
  function hideLocalDeleted() {
    const ids = new Set(read('gm_deleted_messages_v1', []).map(String)); document.querySelectorAll('.bubble-row[data-message-id]').forEach(r => { if (ids.has(String(r.getAttribute('data-message-id')))) r.remove(); });
  }

  document.addEventListener('click', e => {
    const t = e.target instanceof Element ? e.target : null; if (!t) return;
    const bubbleMenu = t.closest('.bubble-menu');
    if (bubbleMenu) {
      closeOtherSurfaces();
      setTimeout(() => document.querySelectorAll('.message-menu').forEach(decorateMenu), 0);
      setTimeout(() => document.querySelectorAll('.message-menu').forEach(decorateMenu), 80);
      setTimeout(() => document.querySelectorAll('.message-menu').forEach(decorateMenu), 220);
      return;
    }
    const action = t.closest('button,[role="menuitem"]');
    if (action) {
      const text = (action.textContent || '').trim().toLowerCase();
      if (text === 'edit' || text.startsWith('edit message') || text === 'delete' || text.startsWith('delete message')) closeOtherSurfaces();
    }
  }, true);

  const obs = new MutationObserver(() => {
    const menus = [...document.querySelectorAll('.message-menu')]; if (menus.length > 1) menus.slice(0, -1).forEach(m => m.remove()); menus.forEach(decorateMenu); hideLocalDeleted();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  hideLocalDeleted();
})();
