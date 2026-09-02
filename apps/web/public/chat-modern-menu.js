(() => {
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const key = name => `gm_chat_${name}`;
  const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(key(name)) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (name, value) => localStorage.setItem(key(name), JSON.stringify(value));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const request = async (path, options = {}) => {
    const hasBody = options.body !== undefined && options.body !== null;
    const headers = { ...(hasBody ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}) };
    const res = await fetch(`${API}${path}`, {...options, headers:{...headers, ...(options.headers || {})}});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };

  const activeConversation = async () => {
    const title = (document.querySelector('.chat-heading b')?.textContent || '').trim();
    if (!title) return null;
    const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
    const rows = await request('/api/conversations');
    return (Array.isArray(rows) ? rows : []).find(c => c.isGroup
      ? (c.title || 'Group') === title
      : (c.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title)) || null;
  };

  const close = () => {
    document.getElementById('gm-modern-menu')?.remove();
    document.removeEventListener('click', outsideClose, true);
    document.removeEventListener('keydown', escapeClose, true);
  };
  const outsideClose = e => {
    const menu = document.getElementById('gm-modern-menu');
    if (menu && !menu.contains(e.target)) close();
  };
  const escapeClose = e => { if (e.key === 'Escape') close(); };

  function menuItem(icon, label, action, options = {}) {
    return `<button class="gm-wa-item${options.danger ? ' danger' : ''}" data-act="${action}"${options.disabled ? ' disabled' : ''}>
      <span class="gm-wa-icon" aria-hidden="true">${icon}</span><span class="gm-wa-label">${esc(label)}</span>${options.arrow ? '<span class="gm-wa-arrow">›</span>' : ''}
    </button>`;
  }

  function positionMenu(wrap) {
    const trigger = document.querySelector('.top-actions button[title="More options"]');
    const card = wrap.querySelector('.gm-wa-card');
    if (!card) return;
    if (trigger) {
      const r = trigger.getBoundingClientRect();
      const gap = 8;
      const width = Math.min(310, window.innerWidth - 16);
      let left = r.right - width;
      let top = r.bottom + gap;
      if (left < 8) left = 8;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      const maxTop = window.innerHeight - Math.min(card.offsetHeight || 640, window.innerHeight - 16) - 8;
      if (top > maxTop) top = Math.max(8, r.top - (card.offsetHeight || 640) - gap);
      Object.assign(card.style, {left:`${left}px`, top:`${top}px`, width:`${width}px`});
    } else {
      Object.assign(card.style, {right:'16px', top:'64px'});
    }
  }

  function renderMenu(c) {
    close();
    const fav = !!c && read('favorites', []).includes(c.id);
    const muted = !!c && !!read('muted', {})[c.id];
    const wrap = document.createElement('div');
    wrap.id = 'gm-modern-menu';
    wrap.innerHTML = `<div class="gm-wa-card" role="menu" aria-label="Chat options">
      ${menuItem('ⓘ','Contact info','contact')}
      ${menuItem('⌕','Search','search')}
      ${menuItem('☑','Select messages','select')}
      ${menuItem(muted ? '🔔' : '♧','Mute notifications','mute', {arrow:true})}
      ${menuItem('◷','Disappearing messages','disappear', {arrow:true})}
      <div class="gm-wa-separator"></div>
      ${menuItem(fav ? '♥' : '♡', fav ? 'Remove from favourites' : 'Add to favourites','favorite')}
      ${menuItem('▣','Add to list','list', {arrow:true})}
      ${menuItem('⇩','Export chat','export')}
      ${menuItem('⊖','Close chat','closechat')}
      <div class="gm-wa-separator"></div>
      ${menuItem('↗','Send call link','call-link')}
      ${menuItem('▣','Schedule call','schedule')}
      ${menuItem('♧','New group call','group-call')}
      <div class="gm-wa-separator"></div>
      ${menuItem('⚑','Report','report')}
      ${c?.isGroup ? '' : menuItem('⊘','Block','block')}
      ${menuItem('⊖','Clear chat','clear')}
      ${menuItem('▢','Delete chat','delete',{danger:true})}
    </div>`;
    document.body.appendChild(wrap);
    positionMenu(wrap);
    requestAnimationFrame(() => positionMenu(wrap));
    document.addEventListener('click', outsideClose, true);
    document.addEventListener('keydown', escapeClose, true);

    wrap.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'closechat') { close(); document.querySelector('.back-btn')?.click(); return; }
      if (!c) { close(); return; }
      if (act === 'contact') { close(); document.querySelector('.chat-heading .avatar')?.click(); return; }
      if (act === 'search') { close(); alert('Chat search is ready for this conversation.'); return; }
      if (act === 'select') { close(); alert('Select messages mode is available from individual message controls.'); return; }
      if (act === 'favorite') return favorite(c);
      if (act === 'mute') return mute(c);
      if (act === 'disappear') return disappearing(c);
      if (act === 'list') return addList(c);
      if (act === 'export') return exportChat(c);
      if (act === 'call-link') { close(); window.dispatchEvent(new CustomEvent('gm:call-link',{detail:{conversationId:c.id}})); alert('Call link action selected.'); return; }
      if (act === 'schedule') { close(); alert('Schedule call will be available when call scheduling is enabled.'); return; }
      if (act === 'group-call') { close(); window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'audio',conversationId:c.id,group:true}})); return; }
      if (act === 'report') return report(c);
      if (act === 'block') return block(c);
      if (act === 'clear') return clearChat(c);
      if (act === 'delete') return deleteChat(c);
    }));
  }

  function applyWallpaper(id) {
    const url = read('wallpapers', {})[id];
    const area = document.querySelector('.messages');
    if (!area) return;
    area.style.backgroundImage = url ? `linear-gradient(rgba(5,10,20,.25),rgba(5,10,20,.25)),url("${url}")` : '';
    area.style.backgroundSize = url ? 'cover' : '';
    area.style.backgroundPosition = url ? 'center' : '';
    area.style.backgroundAttachment = url ? 'fixed' : '';
  }
  function wallpaper(c) {
    const input = document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange = () => { const file=input.files?.[0]; if(!file)return; if(file.size>8*1024*1024)return alert('Please choose an image smaller than 8 MB.'); const reader=new FileReader(); reader.onload=()=>{const map=read('wallpapers',{});map[c.id]=reader.result;write('wallpapers',map);applyWallpaper(c.id);alert('Chat wallpaper updated.');};reader.readAsDataURL(file); };
    input.click();
  }
  function showWallpaper(c) { wallpaper(c); }
  function favorite(c) { const fav=read('favorites',[]); const i=fav.indexOf(c.id); if(i>=0)fav.splice(i,1);else fav.push(c.id); write('favorites',fav); close(); decorateChats(); }
  function addList(c) { const lists=read('lists',{}); const name=prompt('Enter a list name, for example Family, Work or VIP:'); if(!name?.trim())return; lists[c.id]=name.trim().slice(0,40); write('lists',lists); close(); decorateChats(); }
  function decorateChats() {
    const fav=read('favorites',[]), lists=read('lists',{});
    document.querySelectorAll('.chat-item').forEach(item=>{const id=item.dataset.gmConversationId;if(!id)return;item.querySelector('.gm-fav-marker')?.remove();item.querySelector('.gm-list-marker')?.remove();if(fav.includes(id)){const s=document.createElement('span');s.className='gm-fav-marker';s.textContent='★';Object.assign(s.style,{color:'#f59e0b',fontSize:'14px',marginLeft:'5px'});item.querySelector('.chat-copy b')?.appendChild(s);}if(lists[id]){const s=document.createElement('span');s.className='gm-list-marker';s.textContent=lists[id];Object.assign(s.style,{fontSize:'10px',padding:'2px 6px',borderRadius:'999px',background:'rgba(99,102,241,.14)',color:'#a5b4fc',marginLeft:'6px'});item.querySelector('.chat-copy')?.appendChild(s);}});
  }
  function mute(c) {
    const current=read('muted',{}), choices=[['8 hours',480],['1 week',10080],['Always',null],['Unmute',0]];
    const body=choices.map(([label,mins])=>`<button class="gm-wa-subitem" data-mute="${mins===null?'always':mins}">${label}</button>`).join('');
    const panel=document.createElement('div'); panel.className='gm-wa-submenu'; panel.innerHTML=`<div class="gm-wa-subhead">Notification settings</div>${body}`; document.body.appendChild(panel);
    const trigger=document.querySelector('.top-actions button[title="More options"]'); const r=trigger?.getBoundingClientRect(); Object.assign(panel.style,{position:'fixed',left:`${Math.max(8,(r?.right||window.innerWidth-20)-240)}px`,top:`${Math.min(window.innerHeight-220,(r?.bottom||70)+8)}px`});
    panel.querySelectorAll('[data-mute]').forEach(b=>b.onclick=async()=>{const value=b.dataset.mute;const minutes=value==='always'?null:Number(value);try{await request(`/api/conversations/${encodeURIComponent(c.id)}/mute`,{method:'POST',body:JSON.stringify({minutes})});}catch{}if(value==='0')delete current[c.id];else current[c.id]=value==='always'?-1:Date.now()+minutes*60000;write('muted',current);panel.remove();close();});
  }
  function disappearing(c) { close(); alert('Disappearing messages: Off. Choose 24 hours, 7 days or 90 days when this feature is enabled for the chat.'); }
  async function clearChat(c) { if(!confirm('Clear all messages from this chat? The chat itself will remain.'))return;try{await request(`/api/conversations/${encodeURIComponent(c.id)}/clear`,{method:'POST'});document.querySelector('.messages')?.replaceChildren();close();}catch(e){alert(e.message||'Unable to clear chat.');} }
  async function deleteChat(c) { const me=JSON.parse(localStorage.getItem('gm_user')||'{}');const other=(c.members||[]).find(m=>m.user?.id!==me.id)?.user;const label=c.isGroup?(c.title||'Group'):(other?.displayName||'this chat');if(!confirm(`Delete this chat and all messages? This permanently removes “${label}”.`))return;try{await request(`/api/conversations/${encodeURIComponent(c.id)}/permanent`,{method:'DELETE'});close();window.location.reload();}catch(e){alert(e.message||'Unable to delete chat.');} }
  async function block(c) { const me=JSON.parse(localStorage.getItem('gm_user')||'{}');const other=(c.members||[]).find(m=>m.user?.id!==me.id)?.user;if(!other)return alert('There is no individual contact to block in this chat.');if(!confirm(`Block ${other.displayName||other.username}? They will no longer be able to message or call you.`))return;try{await request(`/api/users/${encodeURIComponent(other.id)}/block`,{method:'POST'});close();window.location.reload();}catch(e){alert(e.message||'Unable to block user.');} }
  async function report(c) { const reasons=['Spam','Harassment or abuse','Scam or fraud','Impersonation','Inappropriate content','Other'];const box=document.createElement('div');box.className='gm-wa-report';box.innerHTML=`<div class="gm-wa-report-card"><h3>Report chat</h3><p>Choose the reason for this report.</p><select id="gm-report-reason">${reasons.map(x=>`<option>${x}</option>`).join('')}</select><textarea id="gm-report-details" maxlength="2000" placeholder="Optional details"></textarea><div><button data-cancel>Cancel</button><button class="primary" data-submit>Submit report</button></div></div>`;document.body.appendChild(box);box.querySelector('[data-cancel]').onclick=()=>box.remove();box.querySelector('[data-submit]').onclick=async()=>{try{await request(`/api/conversations/${encodeURIComponent(c.id)}/report`,{method:'POST',body:JSON.stringify({reason:box.querySelector('#gm-report-reason').value,details:box.querySelector('#gm-report-details').value})});box.remove();close();alert('Report submitted.');}catch(e){alert(e.message||'Unable to submit report.');}}; }
  function exportChat(c) { const msgs=[...document.querySelectorAll('.bubble')].map(x=>x.innerText);const blob=new Blob([JSON.stringify({conversationId:c.id,exportedAt:new Date().toISOString(),messages:msgs},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`global-messenger-chat-${c.id}.json`;a.click();URL.revokeObjectURL(a.href);close(); }

  function styles() {
    if (document.getElementById('gm-wa-menu-style')) return;
    const s=document.createElement('style'); s.id='gm-wa-menu-style';
    s.textContent=`
      #gm-modern-menu{position:fixed;inset:0;z-index:100000;pointer-events:none;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #gm-modern-menu .gm-wa-card{position:fixed;pointer-events:auto;background:#202020;color:#f1f1f1;border:1px solid rgba(255,255,255,.08);border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.48);padding:7px 0;overflow:hidden;box-sizing:border-box;max-height:calc(100vh - 16px);overflow-y:auto;scrollbar-width:none}
      #gm-modern-menu .gm-wa-card::-webkit-scrollbar{display:none}
      .gm-wa-item{width:100%;height:44px;display:flex;align-items:center;gap:16px;padding:0 17px;border:0;background:transparent;color:#f1f1f1;text-align:left;font-size:15px;font-weight:500;cursor:pointer;white-space:nowrap}
      .gm-wa-item:hover{background:#2b2b2b}.gm-wa-item:active{background:#343434}.gm-wa-item.danger{color:#ff6b6b}
      .gm-wa-icon{width:22px;min-width:22px;text-align:center;font-size:20px;line-height:1;color:#e5e5e5;font-weight:400}.gm-wa-item.danger .gm-wa-icon{color:#ff6b6b}
      .gm-wa-label{overflow:hidden;text-overflow:ellipsis}.gm-wa-arrow{margin-left:auto;font-size:25px;color:#aaa;line-height:1}
      .gm-wa-separator{height:1px;background:rgba(255,255,255,.08);margin:6px 0}
      .gm-wa-submenu{z-index:100001;background:#202020;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.5);padding:6px;min-width:190px;font-family:Inter,system-ui,sans-serif}.gm-wa-subhead{padding:9px 11px;font-size:13px;color:#a9a9a9}.gm-wa-subitem{display:block;width:100%;border:0;background:transparent;color:#fff;text-align:left;padding:10px 11px;border-radius:8px;cursor:pointer}.gm-wa-subitem:hover{background:#2b2b2b}
      .gm-wa-report{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px}.gm-wa-report-card{width:min(420px,100%);background:#202020;color:#fff;border-radius:14px;padding:22px;box-shadow:0 20px 70px #000}.gm-wa-report-card h3{margin:0 0 8px;font-size:19px}.gm-wa-report-card p{color:#aaa;font-size:13px}.gm-wa-report-card select,.gm-wa-report-card textarea{width:100%;box-sizing:border-box;margin:7px 0;padding:10px;border-radius:9px;border:1px solid #444;background:#2a2a2a;color:#fff}.gm-wa-report-card textarea{min-height:90px;resize:vertical}.gm-wa-report-card>div{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}.gm-wa-report-card button{border:0;border-radius:8px;padding:9px 14px;cursor:pointer;background:#333;color:#fff}.gm-wa-report-card button.primary{background:#20c463;color:#07130b;font-weight:700}
      @media(max-width:600px){#gm-modern-menu .gm-wa-card{border-radius:12px;max-width:calc(100vw - 16px)}.gm-wa-item{height:46px;font-size:14px;padding:0 14px;gap:14px}}
    `;
    document.head.appendChild(s);
  }

  async function showMenu() {
    styles();
    let c=null;
    try { c=await activeConversation(); } catch (e) { console.warn('[Global Messenger] Render conversation lookup failed:', e); }
    renderMenu(c);
  }

  window.addEventListener('gm:options', () => { void showMenu(); });
  window.addEventListener('resize', () => { const wrap=document.getElementById('gm-modern-menu'); if(wrap)positionMenu(wrap); });
  window.addEventListener('scroll', () => { const wrap=document.getElementById('gm-modern-menu'); if(wrap)positionMenu(wrap); }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', styles, {once:true}); else styles();
})();