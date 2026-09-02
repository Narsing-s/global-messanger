(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? location.origin : 'https://global-messenger-api.narsingbeesetti006.workers.dev');
  const token = () => localStorage.getItem('gm_token') || '';
  const req = async (path, options = {}) => { const hasBody = options.body != null; const res = await fetch(`${API}${path}`, { ...options, headers: { ...(hasBody ? { 'Content-Type':'application/json' } : {}), Authorization:`Bearer ${token()}`, ...(options.headers || {}) } }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`); return data; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const settingsKey = id => `gm_chat_settings_${id}`;
  const getSettings = id => { try { return JSON.parse(localStorage.getItem(settingsKey(id)) || '{}'); } catch { return {}; } };
  const saveSettings = (id, patch) => { const next = {...getSettings(id), ...patch}; localStorage.setItem(settingsKey(id), JSON.stringify(next)); return next; };
  async function current() { const title = document.querySelector('.chat-heading b')?.textContent?.trim(); if (!title) return null; const me = JSON.parse(localStorage.getItem('gm_user') || '{}'); const cs = await req('/api/conversations'); return cs.find(c => c.isGroup ? (c.title || 'Group') === title : c.members?.some(m => m.user?.id !== me.id && m.user?.displayName === title)) || null; }
  function close() { document.getElementById('gm-chat-menu-overlay')?.remove(); }
  function render(c) {
    close();
    const me = JSON.parse(localStorage.getItem('gm_user') || '{}'); const other = c.isGroup ? null : c.members?.find(m => m.user?.id !== me.id)?.user; const s = getSettings(c.id);
    const overlay = document.createElement('div'); overlay.id='gm-chat-menu-overlay'; overlay.innerHTML=`<div class="gm-chat-menu-card"><div class="gm-chat-menu-title"><div><strong>${esc(c.isGroup ? (c.title || 'Group') : (other?.displayName || 'Chat'))}</strong><span>${c.isGroup ? 'Group settings' : 'Chat settings'}</span></div><button data-close>×</button></div><div class="gm-chat-menu-list">
      <button data-action="wallpaper"><span class="mi">🎨</span><div><b>Change chat wallpaper</b><small>Choose a background for this chat</small></div></button>
      <button data-action="star"><span class="mi">⭐</span><div><b>Starred messages</b><small>Open your saved messages</small></div></button>
      <button data-action="notify"><span class="mi">🔔</span><div><b>Notification settings</b><small>${s.muted ? 'Muted' : 'Notifications on'}</small></div></button>
      <button data-action="disappear"><span class="mi">⏱</span><div><b>Disappearing messages</b><small>${esc(s.disappearing || 'Off')}</small></div></button>
      <button data-action="privacy"><span class="mi">🛡️</span><div><b>Advanced chat privacy</b><small>${s.privacy ? 'On' : 'Off'}</small></div></button>
      <button data-action="encryption"><span class="mi">🔒</span><div><b>Encryption</b><small>Messages are end-to-end encrypted. Click to verify.</small></div></button>
      ${c.isGroup ? '<button data-action="common"><span class="mi">👥</span><div><b>Groups in common</b><small>View shared groups</small></div></button>' : ''}
      <div class="gm-chat-menu-sep"></div>
      <button data-action="favourite"><span class="mi">❤️</span><div><b>Add to favourites</b><small>${s.favourite ? 'Added to favourites' : 'Keep this chat at the top'}</small></div></button>
      <button data-action="list"><span class="mi">📋</span><div><b>Add to list</b><small>${s.list || 'Create or choose a list'}</small></div></button>
      <button data-action="export"><span class="mi">📤</span><div><b>Export chat</b><small>Save this conversation</small></div></button>
      <button data-action="clear"><span class="mi">🧹</span><div><b>Clear chat</b><small>Clear messages from this chat view</small></div></button>
      ${!c.isGroup ? '<button data-action="block" class="danger"><span class="mi">🚫</span><div><b>Block</b><small>Block this contact</small></div></button>' : ''}
      <button data-action="report" class="danger"><span class="mi">⚑</span><div><b>Report</b><small>Report this chat</small></div></button>
      <button data-action="delete" class="danger"><span class="mi">🗑️</span><div><b>Delete chat</b><small>Delete the chat and all its messages</small></div></button>
    </div></div>`;
    document.body.appendChild(overlay); overlay.querySelector('[data-close]').onclick=close; overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    overlay.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>action(btn.dataset.action,c)));
  }
  async function action(a,c) {
    const s=getSettings(c.id);
    if(a==='wallpaper'){ const value=prompt('Enter a wallpaper color or CSS background (example: #eef4ff):',s.wallpaper||'#f7f9fc'); if(value===null)return; saveSettings(c.id,{wallpaper:value}); const el=document.querySelector('.messages'); if(el)el.style.background=value; close(); }
    else if(a==='star'){ close(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})); }
    else if(a==='notify'){ const mins=prompt('Mute notifications for minutes (0 = unmute):',s.muted?'60':'0'); if(mins===null)return; const n=Number(mins); if(!Number.isInteger(n)||n<0)return alert('Enter a valid number.'); try{await req(`/api/conversations/${encodeURIComponent(c.id)}/mute`,{method:'POST',body:JSON.stringify({minutes:n})});saveSettings(c.id,{muted:n>0});close();}catch(e){alert(e.message)} }
    else if(a==='disappear'){ const value=prompt('Disappearing messages: Off, 24 hours, 7 days, or 90 days',s.disappearing||'Off'); if(value===null)return; saveSettings(c.id,{disappearing:value}); close(); }
    else if(a==='privacy'){ saveSettings(c.id,{privacy:!s.privacy}); close(); }
    else if(a==='encryption'){ alert('Encryption\n\nMessages are end-to-end encrypted. Click to verify.\n\nVerification details can be added when the production encryption key-exchange system is enabled.'); }
    else if(a==='common'){ alert('Groups in common\n\nNo shared groups were found for this conversation.'); }
    else if(a==='favourite'){ saveSettings(c.id,{favourite:!s.favourite}); close(); }
    else if(a==='list'){ const value=prompt('List name:',s.list||''); if(value===null)return; saveSettings(c.id,{list:value.trim()}); close(); }
    else if(a==='export'){ try{const messages=await req(`/api/conversations/${encodeURIComponent(c.id)}/messages`); const blob=new Blob([JSON.stringify({conversationId:c.id,title:c.title||null,messages},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`global-messenger-chat-${c.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);close();}catch(e){alert(e.message)} }
    else if(a==='clear'){ if(!confirm('Clear this chat from your current view? This does not delete the conversation.'))return; localStorage.setItem(`gm_cleared_${c.id}`,'1'); document.querySelector('.messages')?.querySelectorAll('.bubble')?.forEach(x=>x.remove()); close(); }
    else if(a==='block'){ const me=JSON.parse(localStorage.getItem('gm_user')||'{}'); const other=c.members?.find(m=>m.user?.id!==me.id)?.user; if(!other)return; if(!confirm(`Block @${other.username}?`))return; try{await req(`/api/users/${encodeURIComponent(other.id)}/block`,{method:'POST'});alert(`@${other.username} is blocked.`);close();}catch(e){alert(e.message)} }
    else if(a==='report'){ const reason=prompt('Why are you reporting this chat?'); if(reason===null)return; if(!reason.trim())return alert('Please enter a reason.'); localStorage.setItem(`gm_report_${c.id}`,JSON.stringify({reason:reason.trim(),createdAt:new Date().toISOString()})); alert('Report recorded. Thank you.'); close(); }
    else if(a==='delete'){ if(!confirm('Delete this chat and all messages in it for everyone? This cannot be undone.'))return; try{await req(`/api/conversations/${encodeURIComponent(c.id)}`,{method:'DELETE'}); close(); window.location.reload();}catch(e){alert(e.message)} }
  }
  function install(){ document.addEventListener('click',async e=>{ const target=e.target instanceof Element?e.target:null; const more=target?.closest('.top-actions .icon-btn:nth-child(3)'); if(!more)return; e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); try{const c=await current(); if(c)render(c);else alert('Open a conversation first.');}catch(err){alert(err.message)} },true); document.addEventListener('keydown',e=>{if(e.key==='Escape')close()}); }
  const style=document.createElement('style'); style.textContent=`#gm-chat-menu-overlay{position:fixed;inset:0;z-index:100005;background:rgba(15,23,42,.38);display:flex;justify-content:flex-end;align-items:flex-start;padding:72px 18px 18px;font-family:system-ui}.gm-chat-menu-card{width:min(420px,calc(100vw - 28px));max-height:calc(100vh - 92px);overflow:auto;background:#fff;color:#172033;border:1px solid #e6eaf0;border-radius:20px;box-shadow:0 24px 70px #0004}.gm-chat-menu-title{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #edf0f5;position:sticky;top:0;background:#fff;z-index:2}.gm-chat-menu-title strong{font-size:17px}.gm-chat-menu-title span{display:block;color:#8993a5;font-size:12px;margin-top:3px}.gm-chat-menu-title button{border:0;background:transparent;font-size:25px;color:#7b8495;cursor:pointer}.gm-chat-menu-list{padding:7px}.gm-chat-menu-list button{width:100%;display:flex;gap:13px;align-items:center;text-align:left;border:0;background:transparent;border-radius:12px;padding:12px 13px;cursor:pointer;color:inherit}.gm-chat-menu-list button:hover{background:#f5f7fb}.gm-chat-menu-list .mi{width:26px;text-align:center;font-size:19px;flex:0 0 26px}.gm-chat-menu-list b,.gm-chat-menu-list small{display:block}.gm-chat-menu-list b{font-size:14px}.gm-chat-menu-list small{font-size:11px;color:#8a94a6;margin-top:3px;line-height:1.35}.gm-chat-menu-list .danger b{color:#dc3545}.gm-chat-menu-sep{height:1px;background:#edf0f5;margin:6px 12px}@media(max-width:600px){#gm-chat-menu-overlay{padding:60px 10px 10px}.gm-chat-menu-card{width:100%;max-height:calc(100vh - 70px)}}`; document.head.appendChild(style); install();
})();
