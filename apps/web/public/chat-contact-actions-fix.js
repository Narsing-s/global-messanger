(() => {
  'use strict';

  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const me = () => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } };
  const KEY = 'gm_contact_preferences';
  const prefs = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = value => localStorage.setItem(KEY, JSON.stringify(value));
  const chatTitle = () => document.querySelector('.chat-heading b')?.textContent?.trim() || 'Chat';
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const closePanel = () => document.getElementById('gm-contact-info-final')?.remove();

  async function api(path, options = {}) {
    const headers = { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) };
    const response = await fetch(`${API}${path}`, {...options, headers});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
    return data;
  }

  async function activeConversation() {
    const title = chatTitle();
    if (!title || !token()) return null;
    const rows = await api('/api/conversations');
    const mine = me();
    return (Array.isArray(rows) ? rows : []).find(c => {
      if (c.isGroup) return (c.title || 'Group') === title;
      return (c.members || []).some(m => m.user?.id !== mine.id && (m.user?.displayName === title || m.user?.username === title));
    }) || null;
  }

  function styles() {
    if (document.getElementById('gm-ci-action-style')) return;
    const s = document.createElement('style');
    s.id = 'gm-ci-action-style';
    s.textContent = `
      #gm-ci-action-dialog{position:fixed;inset:0;z-index:2147483647;background:#0008;display:grid;place-items:center;padding:20px;font-family:Inter,Arial,sans-serif}
      #gm-ci-action-dialog .gm-ci-dialog{width:min(500px,94vw);max-height:85vh;overflow:auto;background:#202020;color:#fff;border:1px solid #3a3a3a;border-radius:18px;box-shadow:0 25px 80px #0009}
      #gm-ci-action-dialog .gm-ci-dialog-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #333}
      #gm-ci-action-dialog .gm-ci-dialog-head button{border:0;background:none;color:#fff;font-size:25px;cursor:pointer}
      #gm-ci-action-dialog .gm-ci-dialog-body{padding:18px 20px;color:#ddd;font-size:14px;line-height:1.55}
      #gm-ci-action-dialog .gm-ci-dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #333;flex-wrap:wrap}
      .gm-ci-action-btn{border:0;border-radius:10px;padding:10px 16px;cursor:pointer;background:#536dfe;color:#fff}.gm-ci-action-btn.danger{background:#b42332}.gm-ci-search{width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;border-radius:10px;padding:12px}
      .gm-ci-results{margin-top:12px;max-height:45vh;overflow:auto}.gm-ci-result{padding:10px;border-bottom:1px solid #383838}.gm-ci-empty-action{color:#999;padding:8px 0}
    `;
    document.head.appendChild(s);
  }

  function dialog(title, body, buttons = '<button class="gm-ci-action-btn" data-close>Close</button>') {
    document.getElementById('gm-ci-action-dialog')?.remove();
    const el = document.createElement('div');
    el.id = 'gm-ci-action-dialog';
    el.innerHTML = `<div class="gm-ci-dialog"><div class="gm-ci-dialog-head"><b>${esc(title)}</b><button data-x aria-label="Close">×</button></div><div class="gm-ci-dialog-body">${body}</div><div class="gm-ci-dialog-actions">${buttons}</div></div>`;
    document.body.appendChild(el);
    el.querySelector('[data-x]')?.addEventListener('click', () => el.remove());
    el.querySelector('[data-close]')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    return el;
  }

  function messageRows() { return [...document.querySelectorAll('.messages .bubble-row')]; }

  async function action(actionName) {
    const title = chatTitle();
    const p = prefs();
    if (actionName === 'search') {
      const el = dialog('Search in conversation', '<input class="gm-ci-search" id="gm-ci-search-input" placeholder="Search messages…"><div class="gm-ci-results" id="gm-ci-results"><div class="gm-ci-empty-action">Type a word to search.</div></div>');
      const input = el.querySelector('#gm-ci-search-input'); const out = el.querySelector('#gm-ci-results'); let timer;
      input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(async () => { const q = input.value.trim(); if (q.length < 2) { out.innerHTML = '<div class="gm-ci-empty-action">Type at least 2 characters.</div>'; return; } out.innerHTML = '<div class="gm-ci-empty-action">Searching…</div>'; try { const c = await activeConversation(); if (!c) throw new Error('Conversation not found.'); const data = await api(`/api/messages/search?q=${encodeURIComponent(q)}&conversationId=${encodeURIComponent(c.id)}&limit=50`); const rows = Array.isArray(data) ? data : []; out.innerHTML = rows.length ? rows.map(m => `<div class="gm-ci-result"><b>${esc(m.sender?.displayName || m.sender?.username || 'User')}</b><br>${esc(m.body || '')}</div>`).join('') : '<div class="gm-ci-empty-action">No matching messages.</div>'; } catch (error) { out.innerHTML = `<div class="gm-ci-empty-action">${esc(error.message)}</div>`; } }, 180); }); input.focus(); return;
    }
    if (actionName === 'starred') { const rows = messageRows().filter(r => r.querySelector('[data-star],.starred,.bookmark,.message-star')); dialog('Starred messages', rows.length ? rows.map(r => `<div class="gm-ci-result">${esc((r.textContent || '').trim())}</div>`).join('') : '<div class="gm-ci-empty-action">No starred messages in this chat yet. Star a message from its message menu to see it here.</div>'); return; }
    if (actionName === 'notifications') { const current = !!p[title]?.notifications; const el = dialog('Notification settings', `<p>Control notifications for <b>${esc(title)}</b>.</p><p>Current status: <b>${current ? 'Muted' : 'On'}</b></p>`, `<button class="gm-ci-action-btn" data-toggle>${current ? 'Turn notifications on' : 'Mute notifications'}</button><button class="gm-ci-action-btn" data-close>Close</button>`); el.querySelector('[data-toggle]').onclick = () => { const next = !current; p[title] = {...(p[title] || {}), notifications: next}; save(p); el.remove(); alert(next ? 'Notifications muted for this chat.' : 'Notifications enabled for this chat.'); }; return; }
    if (actionName === 'disappearing') { const current = p[title]?.disappearing || 'Off'; const el = dialog('Disappearing messages', '<p>Choose when new messages should disappear.</p><div id="gm-disappear-options"></div>'); const box = el.querySelector('#gm-disappear-options'); ['Off','24 hours','7 days','90 days'].forEach(value => { const b = document.createElement('button'); b.className = 'gm-ci-action-btn'; b.textContent = `${value}${current === value ? ' ✓' : ''}`; b.style.margin = '4px'; b.onclick = () => { p[title] = {...(p[title] || {}), disappearing: value}; save(p); el.remove(); alert(`Disappearing messages: ${value}.`); }; box.appendChild(b); }); return; }
    if (actionName === 'privacy') { const current = !!p[title]?.privacy; const el = dialog('Advanced chat privacy', `<p>Additional privacy protection for this conversation.</p><p>Status: <b>${current ? 'On' : 'Off'}</b></p>`, `<button class="gm-ci-action-btn" data-toggle>${current ? 'Turn off' : 'Turn on'}</button><button class="gm-ci-action-btn" data-close>Close</button>`); el.querySelector('[data-toggle]').onclick = () => { p[title] = {...(p[title] || {}), privacy: !current}; save(p); el.remove(); alert(`Advanced chat privacy ${!current ? 'enabled' : 'disabled'}.`); }; return; }
    if (actionName === 'encryption') { dialog('Encryption', '<p><b>End-to-end encryption</b></p><p>Global Messenger uses its built-in encryption layer for protected message transport. This screen does not expose private keys or secrets.</p><p>For stronger verification, compare the security information shown for this conversation with the other participant.</p>'); return; }
    if (actionName === 'favorite') { const current = !!p[title]?.favorite; p[title] = {...(p[title] || {}), favorite: !current}; save(p); alert(!current ? `${title} added to favourites.` : `${title} removed from favourites.`); return; }
    if (actionName === 'list') { const lists = Array.isArray(p.lists) ? p.lists : []; const el = dialog('Add to list', '<input id="gm-ci-list-name" class="gm-ci-search" placeholder="List name, e.g. Family">', '<button class="gm-ci-action-btn" data-save>Add</button><button class="gm-ci-action-btn" data-close>Cancel</button>'); el.querySelector('[data-save]').onclick = () => { const n = el.querySelector('#gm-ci-list-name').value.trim(); if (!n) return; if (!lists.includes(n)) lists.push(n); p.lists = lists; p[title] = {...(p[title] || {}), list: n}; save(p); el.remove(); alert(`${title} added to ${n}.`); }; return; }
    if (actionName === 'export') { try { const c = await activeConversation(); if (!c) throw new Error('Conversation not found.'); const data = await api(`/api/conversations/${encodeURIComponent(c.id)}/messages?limit=1000`); const blob = new Blob([JSON.stringify({chat: title, conversationId: c.id, messages: data, exportedAt: new Date().toISOString()}, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `global-messenger-${title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (error) { alert(`Export failed: ${error.message}`); } return; }
    if (actionName === 'clear') { if (!confirm(`Clear all messages from "${title}"? This removes the messages from the conversation for everyone.`)) return; try { const c = await activeConversation(); if (!c) throw new Error('Conversation not found.'); await api(`/api/conversations/${encodeURIComponent(c.id)}/clear`, {method:'POST'}); document.querySelector('.messages')?.replaceChildren(); closePanel(); alert('Chat cleared successfully.'); } catch (error) { alert(`Clear chat failed: ${error.message}`); } return; }
    if (actionName === 'block') {
      try {
        const c = await activeConversation();
        const target = c?.isGroup ? null : (c?.members || []).find(m => m.user?.id !== me().id)?.user;
        if (!target?.id) throw new Error('Contact could not be identified.');
        if (!confirm(`Block ${target.displayName || target.username || title}?`)) return;
        await api(`/api/users/${encodeURIComponent(target.id)}/block`, {method:'POST'});
        closePanel();
        alert(`${target.displayName || target.username || title} has been blocked. This chat and its existing history remain in your chat list. Messages sent while the block is active will not be accepted or stored. Unblock the contact to resume messaging.`);
        location.reload();
      } catch (error) { alert(`Block failed: ${error.message}`); }
      return;
    }
    if (actionName === 'report') { try { const c = await activeConversation(); if (!c) throw new Error('Conversation not found.'); const el = dialog('Report contact', `<p>Choose a reason for reporting <b>${esc(title)}</b>.</p><select id="gm-report-reason" class="gm-ci-search"><option>Spam</option><option>Harassment</option><option>Impersonation</option><option>Inappropriate content</option><option>Other</option></select><textarea id="gm-report-details" class="gm-ci-search" style="margin-top:10px;min-height:90px" placeholder="Optional details"></textarea>`, '<button class="gm-ci-action-btn danger" data-report>Report</button><button class="gm-ci-action-btn" data-close>Cancel</button>'); el.querySelector('[data-report]').onclick = async () => { const reason = el.querySelector('#gm-report-reason').value; const details = el.querySelector('#gm-report-details').value.trim(); try { await api(`/api/conversations/${encodeURIComponent(c.id)}/report`, {method:'POST', body:JSON.stringify({reason, details})}); el.remove(); alert('Report submitted to Global Messenger support.'); } catch (error) { alert(`Report failed: ${error.message}`); } }; } catch (error) { alert(`Report failed: ${error.message}`); } return; }
    if (actionName === 'delete') { if (!confirm(`Delete "${title}" from your chat list?`)) return; try { const c = await activeConversation(); if (!c) throw new Error('Conversation not found.'); await api(`/api/conversations/${encodeURIComponent(c.id)}/permanent`, {method:'DELETE'}); document.querySelector('.messages')?.replaceChildren(); closePanel(); alert('Chat deleted from your chat list.'); location.reload(); } catch (error) { alert(`Delete chat failed: ${error.message}`); } return; }
    if (actionName === 'leave') { if (!confirm(`Exit "${title}"? You will leave this group.`)) return; try { const c = await activeConversation(); if (!c) throw new Error('Group not found.'); await api(`/api/conversations/${encodeURIComponent(c.id)}/permanent`, {method:'DELETE'}); document.querySelector('.messages')?.replaceChildren(); closePanel(); alert('You left the group successfully.'); location.reload(); } catch (error) { alert(`Exit group failed: ${error.message}`); } return; }
  }

  styles();
  document.addEventListener('click', event => { const target = event.target instanceof Element ? event.target : null; const row = target?.closest('#gm-contact-info-final [data-act]'); if (!row) return; event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); void action(row.dataset.act || ''); }, true);
})();
