(() => {
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messenger-api.narsingbeesetti006.workers.dev');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, options = {}) => {
    const hasBody = options.body !== undefined && options.body !== null;
    const headers = { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
    const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };
  const key = (name) => `gm_chat_${name}`;
  const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(key(name)) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (name, value) => localStorage.setItem(key(name), JSON.stringify(value));
  const activeId = async () => {
    const title = (document.querySelector('.chat-heading b')?.textContent || '').trim();
    if (!title) return null;
    const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
    const rows = await request('/api/conversations');
    const c = (Array.isArray(rows) ? rows : []).find(x => x.isGroup ? (x.title || 'Group') === title : (x.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title));
    return c || null;
  };
  const close = () => document.getElementById('gm-modern-menu')?.remove();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function modal(title, body, buttons = []) {
    close();
    const wrap = document.createElement('div'); wrap.id = 'gm-modern-menu';
    wrap.innerHTML = `<div class="gm-mm-backdrop"><div class="gm-mm-card"><div class="gm-mm-head"><div><h2>${esc(title)}</h2><span>Global Messenger</span></div><button data-mm-close>×</button></div><div class="gm-mm-body">${body}</div></div></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-mm-close]')?.addEventListener('click', close);
    wrap.querySelector('.gm-mm-backdrop')?.addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
    return wrap;
  }
  function applyWallpaper(id) {
    const wallpapers = read('wallpapers', {}); const url = wallpapers[id]; const area = document.querySelector('.messages'); if (!area) return;
    area.style.backgroundImage = url ? `linear-gradient(rgba(5,10,20,.25),rgba(5,10,20,.25)),url("${url}")` : '';
    area.style.backgroundSize = url ? 'cover' : ''; area.style.backgroundPosition = url ? 'center' : ''; area.style.backgroundAttachment = url ? 'fixed' : '';
  }
  async function wallpaper(c) {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => { const file = input.files?.[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) return alert('Please choose an image smaller than 8 MB.'); const reader = new FileReader(); reader.onload = () => { const map = read('wallpapers', {}); map[c.id] = reader.result; write('wallpapers', map); applyWallpaper(c.id); alert('Chat wallpaper updated. This wallpaper is only for this chat on your account.'); }; reader.readAsDataURL(file); };
    input.click();
  }
  function showWallpaper(c) {
    const map = read('wallpapers', {}); const current = map[c.id];
    const wrap = modal('Chat wallpaper', `<p class="gm-mm-muted">Choose a photo from your gallery. Each chat keeps its own wallpaper on your account.</p><div class="gm-mm-preview" style="${current ? `background-image:url('${current}')` : ''}">${current ? 'Current wallpaper' : 'No custom wallpaper'}</div><div class="gm-mm-actions"><button data-wall-select>📷 Choose from gallery</button><button data-wall-clear>↺ Use default</button></div>`);
    wrap.querySelector('[data-wall-select]').onclick = () => { close(); wallpaper(c); };
    wrap.querySelector('[data-wall-clear]').onclick = () => { const m = read('wallpapers', {}); delete m[c.id]; write('wallpapers', m); applyWallpaper(c.id); close(); };
  }
  function favorite(c) {
    const fav = read('favorites', []); const i = fav.indexOf(c.id); if (i >= 0) fav.splice(i, 1); else fav.push(c.id); write('favorites', fav); decorateChats(); alert(i >= 0 ? 'Removed from favourites.' : '⭐ Added to favourites.');
  }
  function addList(c) {
    const current = read('lists', {}); const name = prompt('Enter a list name, for example Family, Work or VIP:'); if (!name?.trim()) return; current[c.id] = name.trim().slice(0, 40); write('lists', current); decorateChats(); alert(`Added to list “${current[c.id]}”.`);
  }
  function decorateChats() {
    const fav = read('favorites', []), lists = read('lists', {});
    document.querySelectorAll('.chat-item').forEach(item => {
      const id = item.dataset.gmConversationId; if (!id) return;
      item.querySelector('.gm-fav-marker')?.remove(); item.querySelector('.gm-list-marker')?.remove();
      if (fav.includes(id)) { const s = document.createElement('span'); s.className = 'gm-fav-marker'; s.textContent = '★'; s.title = 'Favourite'; Object.assign(s.style,{color:'#f59e0b',fontSize:'14px',marginLeft:'5px'}); item.querySelector('.chat-copy b')?.appendChild(s); }
      if (lists[id]) { const s = document.createElement('span'); s.className = 'gm-list-marker'; s.textContent = lists[id]; s.title = `List: ${lists[id]}`; Object.assign(s.style,{fontSize:'10px',padding:'2px 6px',borderRadius:'999px',background:'rgba(99,102,241,.14)',color:'#6366f1',marginLeft:'6px'}); item.querySelector('.chat-copy')?.appendChild(s); }
    });
  }
  function mute(c) {
    const current = read('muted', {}); const until = current[c.id] || 0; const choices = [['8 hours',8*60],['1 week',7*24*60],['Always',null],['Unmute',0]];
    const wrap = modal('Notification settings', `<p class="gm-mm-muted">Muted chats still receive messages and keep their unread count; only notification alerts are silenced.</p>${choices.map(([label,mins]) => `<button class="gm-mm-option" data-mute="${mins === null ? 'always' : mins}">${until ? (label==='Unmute'?'🔔 ':'') : ''}${label}${until && label==='Unmute'?'':' '}</button>`).join('')}`);
    wrap.querySelectorAll('[data-mute]').forEach(b => b.onclick = async () => { const value = b.dataset.mute; const minutes = value === 'always' ? null : Number(value); try { await request(`/api/conversations/${encodeURIComponent(c.id)}/mute`, { method:'POST', body:JSON.stringify({minutes}) }); } catch {} if (value === '0') delete current[c.id]; else current[c.id] = value === 'always' ? -1 : Date.now()+minutes*60000; write('muted', current); close(); alert(value === '0' ? 'Notifications unmuted.' : 'Notifications muted.'); });
  }
  function encryption(c) {
    const code = Array.from(new Uint8Array(awaitCode(c.id))).map(x => x.toString(16).padStart(2,'0')).join('').slice(0,60);
    modal('Encryption', `<div class="gm-security"><div class="gm-lock">🔒</div><h3>Connection security</h3><p>Global Messenger currently protects the connection with authenticated transport (HTTPS/WSS). Full WhatsApp-style end-to-end message encryption is <b>not yet enabled</b> in this build, so we will not falsely label this chat end-to-end encrypted.</p><div class="gm-code"><b>Local chat fingerprint</b><code>${code}</code></div><p class="gm-mm-muted">When true end-to-end encryption is implemented, this screen can support a per-chat verification code/QR similar to WhatsApp.</p></div>`);
  }
  async function awaitCode(id) { const data = new TextEncoder().encode(`${id}|global-messenger`); let h = 0x811c9dc5; for (const b of data) { h ^= b; h = Math.imul(h,16777619); } return new Uint8Array(Array.from({length:32},(_,i)=>(h+i*31)&255)); }
  async function clearChat(c) { if (!confirm('Clear all messages from this chat? The chat itself will remain.')) return; try { await request(`/api/conversations/${encodeURIComponent(c.id)}/clear`,{method:'POST'}); document.querySelector('.messages')?.replaceChildren(); close(); alert('Chat cleared.'); } catch(e) { alert(e.message || 'Unable to clear chat.'); } }
  async function deleteChat(c) { if (!confirm(`Delete this chat and all messages? This permanently removes “${c.isGroup ? c.title || 'Group' : (c.members.find(m=>m.user?.id !== JSON.parse(localStorage.getItem('gm_user')||'{}').id)?.user?.displayName || 'this chat')}” from Global Messenger.`)) return; try { await request(`/api/conversations/${encodeURIComponent(c.id)}/permanent`,{method:'DELETE'}); close(); window.location.reload(); } catch(e) { alert(e.message || 'Unable to delete chat.'); } }
  async function block(c) { const me = JSON.parse(localStorage.getItem('gm_user')||'{}'); const other = (c.members||[]).find(m=>m.user?.id!==me.id)?.user; if (!other) return alert('There is no individual contact to block in this chat.'); if (!confirm(`Block ${other.displayName || other.username}? They will no longer be able to message or call you.`)) return; try { await request(`/api/users/${encodeURIComponent(other.id)}/block`,{method:'POST'}); close(); window.location.reload(); } catch(e) { alert(e.message || 'Unable to block user.'); } }
  async function report(c) { const reasons=['Spam','Harassment or abuse','Scam or fraud','Impersonation','Inappropriate content','Other']; const wrap=modal('Report chat',`<p class="gm-mm-muted">Choose the reason. A report will be sent to Global Messenger support.</p><select id="gm-report-reason">${reasons.map(x=>`<option>${x}</option>`).join('')}</select><textarea id="gm-report-details" placeholder="Optional details (up to 2000 characters)"></textarea><button class="gm-mm-primary" id="gm-submit-report">Submit report</button>`); wrap.querySelector('#gm-submit-report').onclick=async()=>{const reason=wrap.querySelector('#gm-report-reason').value;const details=wrap.querySelector('#gm-report-details').value;try{await request(`/api/conversations/${encodeURIComponent(c.id)}/report`,{method:'POST',body:JSON.stringify({reason,details})});close();alert('Report submitted. Thank you for helping keep Global Messenger safe.');}catch(e){alert(e.message||'Unable to submit report.');}}; }
  function exportChat(c) { const msgs = [...document.querySelectorAll('.bubble')].map(x=>x.innerText); const blob=new Blob([JSON.stringify({conversationId:c.id,exportedAt:new Date().toISOString(),messages:msgs},null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`global-messenger-chat-${c.id}.json`;a.click();URL.revokeObjectURL(a.href); }
  async function showMenu() {
    const c=await activeId(); if(!c)return;
    const fav=read('favorites',[]).includes(c.id), muted=read('muted',{})[c.id];
    const wrap=modal(c.isGroup?(c.title||'Group'):'Chat options',`<div class="gm-mm-grid">
      <button data-act="wallpaper">🎨<b>Change chat wallpaper</b><span>Set a photo just for this chat</span></button>
      <button data-act="favorite">⭐<b>${fav?'Remove from favourites':'Add to favourites'}</b><span>${fav?'★ Favourite is active':'Keep this chat easy to find'}</span></button>
      <button data-act="mute">🔔<b>Notification settings</b><span>${muted?'Muted':'Choose 8 hours, 1 week or Always'}</span></button>
      <button data-act="disappear">⏱<b>Disappearing messages</b><span>Off</span></button>
      <button data-act="privacy">🛡️<b>Advanced chat privacy</b><span>Off</span></button>
      <button data-act="encryption">🔒<b>Encryption</b><span>Connection security & verification</span></button>
      <button data-act="list">📋<b>Add to list</b><span>${esc(read('lists',{})[c.id]||'Choose or create a list')}</span></button>
      <button data-act="export">📤<b>Export chat</b><span>Save a local JSON copy</span></button>
      <button data-act="clear">🧹<b>Clear chat</b><span>Remove messages, keep the chat</span></button>
      ${c.isGroup?'':'<button data-act="block">🚫<b>Block</b><span>Block this contact</span></button>'}
      <button data-act="report">⚑<b>Report</b><span>Send a report to Global Messenger support</span></button>
      <button class="danger" data-act="delete">🗑️<b>Delete chat</b><span>Permanently delete this chat and messages</span></button>
    </div>`);
    wrap.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{const a=b.dataset.act; if(a==='wallpaper')showWallpaper(c); else if(a==='favorite')favorite(c); else if(a==='mute')mute(c); else if(a==='encryption')encryption(c); else if(a==='list')addList(c); else if(a==='export')exportChat(c); else if(a==='clear')clearChat(c); else if(a==='block')block(c); else if(a==='report')report(c); else if(a==='delete')deleteChat(c); else if(a==='disappear')alert('Disappearing messages: Off. Choose 24 hours, 7 days or 90 days when this feature is enabled for the chat.'); else if(a==='privacy')alert('Advanced chat privacy is currently Off. This feature will restrict exports and automatic media handling when enabled.'); });
  }
  function styles(){if(document.getElementById('gm-mm-style'))return;const s=document.createElement('style');s.id='gm-mm-style';s.textContent=`#gm-modern-menu{position:fixed;inset:0;z-index:100000;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.gm-mm-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.58);backdrop-filter:blur(8px);display:flex;justify-content:flex-end;align-items:flex-start;padding:72px 24px}.gm-mm-card{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 96px);overflow:auto;background:#fff;border:1px solid #e5e7eb;border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.28);color:#111827}.gm-mm-head{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #edf0f4}.gm-mm-head h2{margin:0;font-size:19px}.gm-mm-head span{font-size:11px;color:#94a3b8}.gm-mm-head button{border:0;background:#f1f5f9;border-radius:50%;width:32px;height:32px;font-size:22px;cursor:pointer}.gm-mm-body{padding:18px}.gm-mm-muted{color:#64748b;font-size:13px;line-height:1.55}.gm-mm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gm-mm-grid button,.gm-mm-option{border:1px solid #e5e7eb;background:#f8fafc;border-radius:15px;padding:14px;text-align:left;cursor:pointer;display:flex;gap:10px;align-items:flex-start;color:#111827}.gm-mm-grid button:hover,.gm-mm-option:hover{background:#eef2ff;border-color:#c7d2fe}.gm-mm-grid button b{display:block;font-size:13px}.gm-mm-grid button span{display:block;color:#64748b;font-size:11px;margin-top:3px}.gm-mm-grid .danger{border-color:#fecaca;background:#fff5f5;color:#b91c1c}.gm-mm-actions{display:flex;gap:10px;margin-top:12px}.gm-mm-actions button,.gm-mm-primary{border:0;border-radius:12px;padding:12px 15px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}.gm-mm-actions button+button{background:#e2e8f0;color:#334155}.gm-mm-preview{height:170px;border-radius:16px;background:#f1f5f9 center/cover;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px}.gm-mm-option{width:100%;margin:8px 0;display:block}.gm-security{text-align:center}.gm-lock{font-size:48px}.gm-code{margin:18px 0;padding:15px;border-radius:14px;background:#f8fafc;text-align:left}.gm-code code{display:block;word-break:break-all;margin-top:8px;font-size:11px;color:#475569}.gm-mm-body select,.gm-mm-body textarea{width:100%;box-sizing:border-box;margin:8px 0;padding:12px;border:1px solid #cbd5e1;border-radius:12px;font:inherit}.gm-mm-body textarea{min-height:110px;resize:vertical}.gm-mm-primary{width:100%;margin-top:8px}@media(max-width:650px){.gm-mm-grid{grid-template-columns:1fr}.gm-mm-backdrop{padding:54px 10px 10px}.gm-mm-card{max-height:calc(100vh - 64px)}}`;document.head.appendChild(s)}
  function decorateChats(){ const fav=read('favorites',[]),lists=read('lists',{}); document.querySelectorAll('.chat-item').forEach(item=>{const id=item.dataset.gmConversationId;if(!id)return;item.querySelector('.gm-fav-marker')?.remove();item.querySelector('.gm-list-marker')?.remove();if(fav.includes(id)){const s=document.createElement('span');s.className='gm-fav-marker';s.textContent='★';s.title='Favourite';Object.assign(s.style,{color:'#f59e0b',fontSize:'14px',marginLeft:'5px'});item.querySelector('.chat-copy b')?.appendChild(s)}if(lists[id]){const s=document.createElement('span');s.className='gm-list-marker';s.textContent=lists[id];s.title=`List: ${lists[id]}`;Object.assign(s.style,{fontSize:'10px',padding:'2px 6px',borderRadius:'999px',background:'rgba(99,102,241,.14)',color:'#6366f1',marginLeft:'6px'});item.querySelector('.chat-copy')?.appendChild(s)}});}
  styles();
  document.addEventListener('click', e => { const t=e.target; const button=t?.closest?.('.top-actions .icon-btn:nth-child(3)'); if(!button)return; e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation)e.stopImmediatePropagation(); showMenu(); }, true);
  const observer=new MutationObserver(()=>{decorateChats();const id=document.querySelector('.chat-heading b')?.textContent;if(id){} }); observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(decorateChats,1500); setInterval(decorateChats,2500);
  window.addEventListener('gm:wallpaper-refresh',()=>{activeId().then(c=>c&&applyWallpaper(c.id))});
  setTimeout(async()=>{try{const c=await activeId();if(c)applyWallpaper(c.id)}catch{}},1800);
})();
