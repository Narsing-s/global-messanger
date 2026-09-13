(() => {
  'use strict';
  const API = (window.__GM_CONFIG__?.API_URL || window.location.origin).replace(/\/$/, '');
  const token = () => localStorage.getItem('gm_token') || '';
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
  let activeId = '';
  let messages = [];
  let menu = null;
  let pressTimer = 0;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentTitle = () => document.querySelector('.message-header .header-copy b')?.textContent?.trim() || '';
  async function loadConversation() {
    const title = currentTitle(); if (!title || !token()) return null;
    const r = await fetch(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!r.ok) return null;
    const list = await r.json(); const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
    const c = (Array.isArray(list) ? list : list?.conversations || []).find(x => x.isGroup ? (x.title || 'Global Team') === title : x.members?.some(m => m.user?.id !== me.id && (m.user?.displayName === title || m.user?.username === title)));
    if (!c) return null;
    activeId = String(c.id);
    const mr = await fetch(`${API}/api/conversations/${encodeURIComponent(activeId)}/messages?limit=200`, { headers: { Authorization: `Bearer ${token()}` } });
    if (mr.ok) { const d = await mr.json(); messages = (Array.isArray(d) ? d : d?.messages || []).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }
    return c;
  }
  function decorate() {
    const rows = [...document.querySelectorAll('.message-pane .message-row')];
    rows.forEach((row, i) => { const m = messages[i]; if (m) { row.setAttribute('data-message-id', String(m.id)); row.setAttribute('data-message-body', String(m.body || '')); } });
  }
  function close() { menu?.remove(); menu = null; }
  function open(row) {
    close(); const id = row.getAttribute('data-message-id'); const body = row.getAttribute('data-message-body') || row.querySelector('.message-bubble')?.textContent?.trim() || ''; if (!id) return;
    menu = document.createElement('div'); menu.className = 'gm-message-actions';
    menu.innerHTML = `<button data-a="copy">📋 Copy</button><button data-a="star">⭐ Save / Star</button><button data-a="pin">📌 Pin message</button><button data-a="forward">↗️ Forward</button><button data-a="download">⬇️ Download</button><button data-a="delete">🗑️ Delete</button><button data-a="close">Cancel</button>`;
    document.body.appendChild(menu);
    const r = row.getBoundingClientRect(); menu.style.left = `${Math.max(10, Math.min(window.innerWidth - 230, r.right - 220))}px`; menu.style.top = `${Math.max(10, Math.min(window.innerHeight - 310, r.bottom + 6))}px`;
    menu.querySelector('[data-a="copy"]').onclick = async () => { await navigator.clipboard?.writeText(body); close(); };
    menu.querySelector('[data-a="star"]').onclick = async () => { const r = await fetch(`${API}/api/messages/${encodeURIComponent(id)}/bookmark`, { method:'POST', headers:headers() }); if (!r.ok) alert('Unable to save this message.'); close(); };
    menu.querySelector('[data-a="pin"]').onclick = async () => { const r = await fetch(`${API}/api/conversations/${encodeURIComponent(activeId)}/pins`, { method:'POST', headers:headers(), body:JSON.stringify({messageId:id}) }); if (!r.ok) alert('Unable to pin this message.'); close(); };
    menu.querySelector('[data-a="forward"]').onclick = async () => { const destination = prompt('Enter the destination conversation ID'); if (destination) { const r = await fetch(`${API}/api/messages/forward`, { method:'POST', headers:headers(), body:JSON.stringify({messageId:id,conversationId:destination}) }); if (!r.ok) alert('Unable to forward this message.'); } close(); };
    menu.querySelector('[data-a="download"]').onclick = () => { const link = row.querySelector('.attachment a')?.getAttribute('href') || row.querySelector('.attachment img')?.getAttribute('src'); if (link) { const a=document.createElement('a'); a.href=link; a.download='global-messenger-attachment'; a.target='_blank'; a.click(); } else navigator.clipboard?.writeText(body); close(); };
    menu.querySelector('[data-a="delete"]').onclick = async () => { if (!confirm('Delete this message?')) return; const r = await fetch(`${API}/api/messages/${encodeURIComponent(id)}`, { method:'DELETE', headers:headers() }); if (!r.ok) alert('Unable to delete this message.'); close(); };
    menu.querySelector('[data-a="close"]').onclick = close;
  }
  document.addEventListener('contextmenu', e => { const row = e.target.closest?.('.message-row'); if (!row) return; e.preventDefault(); void loadConversation().then(() => { decorate(); open(row); }); });
  document.addEventListener('pointerdown', e => { const row=e.target.closest?.('.message-row'); if (!row || e.pointerType==='mouse') return; pressTimer=window.setTimeout(() => { void loadConversation().then(()=>{decorate();open(row);}); }, 600); });
  document.addEventListener('pointerup', () => { if (pressTimer) window.clearTimeout(pressTimer); });
  document.addEventListener('pointercancel', () => { if (pressTimer) window.clearTimeout(pressTimer); });
  document.addEventListener('click', e => { if (menu && !e.target.closest('.gm-message-actions')) close(); });
  const style=document.createElement('style'); style.textContent='.gm-message-actions{position:fixed;z-index:100020;width:220px;padding:7px;background:#fff;border:1px solid #e4e8f0;border-radius:16px;box-shadow:0 18px 60px #18203335;display:grid;gap:2px}.gm-message-actions button{padding:11px 12px;border:0;border-radius:10px;background:transparent;color:#182033;text-align:left;font-size:13px;cursor:pointer}.gm-message-actions button:hover{background:#f1f3f9}@media(max-width:600px){.gm-message-actions{width:calc(100vw - 28px);left:14px!important;top:auto!important;bottom:14px!important;border-radius:18px}}'; document.head.appendChild(style);
  new MutationObserver(() => { if (activeId) decorate(); }).observe(document.body, { childList:true, subtree:true });
})();
