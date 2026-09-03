(() => {
  'use strict';
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const me = () => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } };
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const close = () => document.getElementById('gm-profile-viewer')?.remove();
  const initials = v => String(v || 'GM').trim().slice(0,2).toUpperCase();
  const avatar = (u, cls='gm-pv-avatar') => u?.avatarUrl ? `<img class="${cls}" src="${esc(u.avatarUrl)}" alt="">` : `<div class="${cls} gm-pv-fallback">${esc(initials(u?.displayName || u?.title))}</div>`;
  const request = async (path, options={}) => {
    const r = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Request failed');
    return d;
  };
  const title = () => document.querySelector('.chat-heading b')?.textContent?.trim() || '';
  function styles(){
    if(document.getElementById('gm-profile-viewer-style')) return;
    const s=document.createElement('style'); s.id='gm-profile-viewer-style'; s.textContent=`
      #gm-profile-viewer{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.48);display:flex;justify-content:flex-end;font-family:Inter,Arial,sans-serif;color:#f1f1f1}
      .gm-pv-panel{width:min(560px,100vw);height:100%;background:#171717;overflow:auto;box-shadow:-16px 0 42px #0008}
      .gm-pv-head{height:64px;display:flex;align-items:center;gap:18px;padding:0 20px;border-bottom:1px solid #2b2b2b;position:sticky;top:0;background:#171717;z-index:4}
      .gm-pv-close{border:0;background:transparent;color:#eee;font-size:31px;cursor:pointer}.gm-pv-head b{font-size:18px}
      .gm-pv-hero{text-align:center;padding:30px 20px 24px}.gm-pv-avatar{width:150px;height:150px;border-radius:50%;object-fit:cover;background:#303030;margin:0 auto 18px;display:block}.gm-pv-fallback{display:grid;place-items:center;font-size:42px;font-weight:800}
      .gm-pv-name{font-size:28px;font-weight:600}.gm-pv-sub{margin-top:7px;color:#aaa;font-size:14px}.gm-pv-status{margin-top:7px;color:#aaa;font-size:13px}.gm-pv-status.online{color:#42d68a}.gm-pv-actions{display:flex;justify-content:center;gap:16px;margin-top:24px}.gm-pv-action{border:0;background:transparent;color:#fff;cursor:pointer;width:82px}.gm-pv-circle{width:58px;height:58px;border-radius:50%;background:#303030;display:grid;place-items:center;margin:auto;font-size:24px}.gm-pv-action span{display:block;margin-top:8px;font-size:12px}
      .gm-pv-section{border-top:1px solid #2b2b2b;padding:0 24px}.gm-pv-title{height:56px;display:flex;align-items:center;justify-content:space-between;font-size:16px}.gm-pv-title small{color:#999}.gm-pv-row{min-height:62px;display:flex;align-items:center;gap:16px;border-top:1px solid #252525;cursor:pointer}.gm-pv-icon{width:28px;text-align:center;color:#bbb;font-size:21px}.gm-pv-copy{flex:1}.gm-pv-copy b{font-size:15px;font-weight:500}.gm-pv-copy span{display:block;color:#999;font-size:12px;margin-top:4px}.gm-pv-danger{color:#f09aa5}.gm-pv-danger .gm-pv-icon{color:#f09aa5}.gm-pv-media{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding-bottom:18px}.gm-pv-thumb{height:78px;border-radius:7px;background:#2d2d2d;overflow:hidden}.gm-pv-thumb img{width:100%;height:100%;object-fit:cover}.gm-pv-empty{color:#999;font-size:13px;padding-bottom:18px}.gm-pv-person{display:flex;align-items:center;gap:12px;padding:9px 0}.gm-pv-mini{width:42px;height:42px;border-radius:50%;object-fit:cover;background:#333;display:grid;place-items:center}.gm-pv-person span{display:block;color:#999;font-size:12px;margin-top:3px}
      @media(max-width:650px){.gm-pv-panel{width:100%}.gm-pv-section{padding:0 16px}}
    `; document.head.appendChild(s);
  }
  const row=(icon,label,sub='',action='',danger=false)=>`<div class="gm-pv-row${danger?' gm-pv-danger':''}" data-action="${esc(action)}"><span class="gm-pv-icon">${icon}</span><div class="gm-pv-copy"><b>${esc(label)}</b>${sub?`<span>${esc(sub)}</span>`:''}</div></div>`;
  async function openProfile(){
    styles(); close();
    const name=title(); if(!name||!token()) return;
    try {
      const all=await request('/api/conversations');
      const mine=me();
      const c=(Array.isArray(all)?all:[]).find(x=>x.isGroup?(x.title||'Group')===name:(x.members||[]).some(m=>m.user?.id!==mine.id&&m.user?.displayName===name));
      if(!c) return;
      const group=!!c.isGroup; const other=(c.members||[]).find(m=>m.user?.id!==mine.id)?.user||{}; const person=group?{title:c.title||'Group'}:other;
      let messages=[]; try { messages=await request(`/api/conversations/${encodeURIComponent(c.id)}/messages?limit=1000`); } catch {}
      if(!Array.isArray(messages)) messages=[];
      const mediaMessages=messages.filter(m=>String(m.type||'').toLowerCase()!=='text' || m.attachmentUrl || m.attachmentMime?.startsWith('image/')).slice(-8);
      const media=mediaMessages.length?`<div class="gm-pv-media">${mediaMessages.map(m=>m.attachmentUrl&&String(m.attachmentMime||'').startsWith('image/')?`<div class="gm-pv-thumb"><img src="${esc(m.attachmentUrl)}" alt=""></div>`:`<div class="gm-pv-thumb" style="display:grid;place-items:center;color:#aaa">📎</div>`).join('')}</div>`:`<div class="gm-pv-empty">No shared media, links or documents yet</div>`;
      const common=!group?all.filter(x=>x.isGroup&&(x.members||[]).some(m=>m.user?.id===mine.id)&&(x.members||[]).some(m=>m.user?.id===other.id)):[];
      const participants=group?`<div class="gm-pv-section"><div class="gm-pv-title"><span>Participants</span><small>${(c.members||[]).length}</small></div>${(c.members||[]).map(m=>{const u=m.user||{};return `<div class="gm-pv-person">${avatar(u,'gm-pv-mini')}<div><b>${esc(u.id===mine.id?'You':u.displayName||u.username||'Member')}</b><span>${esc(m.role||'Participant')}</span></div></div>`}).join('')}</div>`:'';
      const commonHtml=!group&&common.length?`<div class="gm-pv-section"><div class="gm-pv-title"><span>Groups in common</span><small>${common.length}</small></div>${common.map(g=>`<div class="gm-pv-person"><div class="gm-pv-mini">${esc(initials(g.title||'G'))}</div><div><b>${esc(g.title||'Group')}</b><span>${g.members?.length||0} participants</span></div></div>`).join('')}</div>`:'';
      const contact=group?{title:person.title}:{...person};
      const subtitle=group?`${(c.members||[]).length} participants`:(contact.phone||contact.mobileNumber||contact.email||`@${contact.username||''}`);
      const statusOnline=Boolean((window.__gmPresence||{})[contact.id]);
      const panel=document.createElement('div'); panel.id='gm-profile-viewer';
      panel.innerHTML=`<aside class="gm-pv-panel"><div class="gm-pv-head"><button class="gm-pv-close" aria-label="Close">×</button><b>${group?'Group info':'Contact info'}</b></div><div class="gm-pv-hero">${avatar(group?{title:person.title}:contact)}<div class="gm-pv-name">${esc(group?person.title:(contact.displayName||'User'))}</div><div class="gm-pv-sub">${esc(subtitle)}</div>${!group?`<div class="gm-pv-status ${statusOnline?'online':''}">${statusOnline?'Online now':(contact.lastSeenAt?'Last seen '+new Date(contact.lastSeenAt).toLocaleString():'Offline')}</div>`:''}<div class="gm-pv-actions"><button class="gm-pv-action" data-call="audio"><div class="gm-pv-circle">☎</div><span>Voice</span></button><button class="gm-pv-action" data-call="video"><div class="gm-pv-circle">▣</div><span>Video</span></button><button class="gm-pv-action" data-action="search"><div class="gm-pv-circle">⌕</div><span>Search</span></button></div></div><div class="gm-pv-section"><div class="gm-pv-title"><span>Media, links and docs</span><small>${mediaMessages.length}</small></div>${media}</div><div class="gm-pv-section">${row('☆','Starred messages','','starred')}</div><div class="gm-pv-section">${row('♧','Notification settings','Manage notifications','notifications')}${row('◷','Disappearing messages','Off','disappearing')}${row('◇','Advanced chat privacy','Off','privacy')}${row('▣','Encryption','Messages are end-to-end encrypted. Click to verify.','encryption')}</div>${commonHtml}${participants}<div class="gm-pv-section">${row('♡','Add to favourites','','favorite')}${row('▣','Add to list','','list')}${row('⇩','Export chat','','export')}${row('⊖','Clear chat','','clear',true)}${group?row('↪','Exit group','','leave',true):row('⊘',`Block ${contact.displayName||'contact'}`,'','block',true)}${group?'':row('⚑',`Report ${contact.displayName||'contact'}`,'','report',true)}${group?'':row('▢','Delete chat','','delete',true)}</div></aside>`;
      document.body.appendChild(panel);
      panel.querySelector('.gm-pv-close').onclick=close;
      panel.onclick=e=>{if(e.target===panel)close()};
      panel.querySelector('[data-call="audio"]')?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'audio',conversationId:c.id,group}})));
      panel.querySelector('[data-call="video"]')?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('gm:call',{detail:{type:'video',conversationId:c.id,group}})));
      panel.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{const a=el.dataset.action;if(a==='search'){close();window.dispatchEvent(new CustomEvent('gm:options'));return}if(a==='export'){const blob=new Blob([JSON.stringify({conversation:c,messages,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='global-messenger-chat.json';link.click();return}if(a==='clear'){if(confirm('Clear all messages from this chat?'))request(`/api/conversations/${encodeURIComponent(c.id)}/clear`,{method:'POST'}).then(()=>{document.querySelector('.messages')?.replaceChildren();close()}).catch(err=>alert(err.message));return}alert(`${el.querySelector('b')?.textContent||'Option'} selected.`)}));
    } catch(err){ console.error('[Global Messenger] profile info failed',err); }
  }
  window.__gmOpenContactInfo=openProfile;
  window.addEventListener('gm:open-contact-info',openProfile);
  document.addEventListener('click',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;const h=t.closest('.chat-heading');if(!h||t.closest('.top-actions,button,a'))return;const hit=t.closest('.avatar,img,.chat-profile,.chat-avatar,[data-profile]');if(!hit)return;e.preventDefault();e.stopImmediatePropagation();openProfile()},true);
})();