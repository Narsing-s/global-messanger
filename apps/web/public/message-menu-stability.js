(() => {
  'use strict';
  const API = (window.__GM_CONFIG__?.API_URL || (location.protocol === 'http:' || location.protocol === 'https:' ? location.origin : '')).replace(/\/$/, '');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, opt = {}) => {
    const headers = { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
    if (opt.body && !(opt.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { ...opt, headers: { ...headers, ...(opt.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d?.message || `Request failed (${r.status})`);
    return d;
  };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const toast = text => {
    let t = document.getElementById('gm-message-toast');
    if (!t) { t = document.createElement('div'); t.id = 'gm-message-toast'; t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:100006;background:#171717;color:#fff;padding:10px 16px;border-radius:999px;font:13px system-ui;box-shadow:0 8px 30px #0006'; document.body.appendChild(t); }
    t.textContent = text; t.style.display = 'block'; clearTimeout(t.__timer); t.__timer = setTimeout(() => t.style.display = 'none', 1800);
  };
  const messageIdOf = el => el?.closest('[data-message-id]')?.getAttribute('data-message-id') || '';
  const closeMenus = () => document.querySelectorAll('.message-menu').forEach(x => x.remove());
  async function runAction(action, button) {
    const id = button.dataset.gmMessageId || messageIdOf(button); if (!id) return;
    try {
      if (action === 'copy') {
        const row = document.querySelector(`[data-message-id="${CSS.escape(String(id))}"]`); const body = row?.querySelector('.bubble p,.message-bubble p')?.textContent?.trim() || '';
        if (navigator.clipboard) await navigator.clipboard.writeText(body); else { const x=document.createElement('textarea'); x.value=body; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove(); }
        toast('Message copied'); closeMenus(); return;
      }
      if (action === 'save') {
        const saved = button.dataset.active === '1';
        await request(`/api/messages/${encodeURIComponent(id)}/bookmark`, { method: saved ? 'DELETE' : 'POST' });
        const ids = read('gm_saved_messages_v1', []).map(String).filter(x => x !== String(id)); if (!saved) ids.push(String(id)); write('gm_saved_messages_v1', [...new Set(ids)]); toast(saved ? 'Message unsaved' : 'Message saved'); closeMenus(); return;
      }
      if (action === 'pin') {
        const rows = await request('/api/conversations');
        const title = document.querySelector('.chat-heading b')?.textContent?.trim();
        const me = (() => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } })();
        const chat = (Array.isArray(rows) ? rows : []).find(c => c.isGroup ? (c.title || 'Group') === title : (c.members || []).some(m => m.user?.id !== me.id && (m.user?.displayName === title || m.user?.username === title)));
        if (!chat) throw Error('Open the conversation first.');
        const pinned = button.dataset.active === '1';
        await request(`/api/conversations/${encodeURIComponent(chat.id)}/pins${pinned ? `/${encodeURIComponent(id)}` : ''}`, { method: pinned ? 'DELETE' : 'POST', ...(pinned ? {} : { body: JSON.stringify({ messageId: id }) }) });
        toast(pinned ? 'Message unpinned' : 'Message pinned'); closeMenus(); return;
      }
      if (action === 'info') {
        const d = await request(`/api/messages/${encodeURIComponent(id)}/info`);
        alert(`Message info\n\nSent: ${new Date(d.createdAt).toLocaleString()}\nSender: ${d.sender?.displayName || 'User'}\nReactions: ${Array.isArray(d.reactions) ? d.reactions.length : 0}\nReceipts: ${Array.isArray(d.receipts) ? d.receipts.length : 0}`); return;
      }
      if (action === 'delete-me') {
        const ids = read('gm_deleted_messages_v1', []).map(String); if (!ids.includes(String(id))) ids.push(String(id)); write('gm_deleted_messages_v1', ids); document.querySelector(`[data-message-id="${CSS.escape(String(id))}"]`)?.remove(); toast('Message deleted for you'); closeMenus();
      }
    } catch (e) { alert(e?.message || 'Operation failed'); }
  }
  function decorate(menu) {
    if (!menu || menu.dataset.gmDecorated === '1') return;
    menu.dataset.gmDecorated = '1'; const id = messageIdOf(menu); if (!id) return;
    [...menu.querySelectorAll('button')].forEach(b => b.dataset.gmMessageId = id);
    const add = (label, icon, action) => { if (menu.querySelector(`[data-gm-msg-action="${action}"]`)) return; const b=document.createElement('button'); b.type='button'; b.dataset.gmMsgAction=action; b.dataset.gmMessageId=id; b.innerHTML=`<span>${icon}</span> ${label}`; b.onclick=e=>{e.preventDefault();e.stopPropagation();void runAction(action,b)}; menu.appendChild(b); };
    add('Copy','📋','copy'); add('Save','🔖','save'); add('Pin','📌','pin'); add('Message info','ⓘ','info'); add('Delete for me','🗑','delete-me');
  }
  new MutationObserver(() => document.querySelectorAll('.message-menu').forEach(decorate)).observe(document.body, { childList:true, subtree:true });
  document.querySelectorAll('.message-menu').forEach(decorate);
})();
