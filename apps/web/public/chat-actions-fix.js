(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname.includes('global-messanger.onrender.com') ? 'https://global-messanger-backend.onrender.com' : location.origin);
  const token = () => localStorage.getItem('gm_token') || '';
  const user = () => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } };
  const key = 'gm_blocked_users';
  const blocked = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const saveBlocked = v => localStorage.setItem(key, JSON.stringify([...new Set(v)]));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title = () => document.querySelector('.chat-heading b')?.textContent?.trim() || '';
  const rows = () => [...document.querySelectorAll('.messages .bubble-row')];
  const overlay = (heading, body) => {
    document.getElementById('gm-actions-fix')?.remove();
    const el = document.createElement('div'); el.id='gm-actions-fix';
    el.innerHTML = `<div style="position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:200000;display:grid;place-items:center;padding:18px;font-family:system-ui"><div style="width:min(620px,96vw);max-height:90vh;overflow:auto;background:#fff;color:#182033;border-radius:20px;padding:20px;box-shadow:0 30px 90px #0004"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:20px">${esc(heading)}</h2><button data-close style="border:0;background:transparent;font-size:26px;cursor:pointer">×</button></div><div style="margin-top:15px">${body}</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button data-close style="padding:10px 15px;border:0;border-radius:10px;background:#536dfe;color:white;cursor:pointer">Close</button></div></div></div>`;
    document.body.appendChild(el); el.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>el.remove()); return el;
  };
  const currentOther = () => {
    const heading = title(); if (!heading) return null;
    const chats = document.querySelectorAll('.chat-item');
    for (const c of chats) {
      const name = c.querySelector('.chat-copy b')?.textContent?.trim();
      if (name === heading) return { name, id: c.querySelector('.user-status')?.getAttribute('data-user-id') || null };
    }
    return { name: heading, id: null };
  };
  const blockedForCurrent = () => {
    const other = currentOther();
    return !!other && blocked().some(x => x.id ? x.id === other.id : x.name === other.name);
  };
  const setBlockedState = () => {
    const active = !!document.querySelector('.conversation.show-mobile') && !!title();
    const isBlocked = active && blockedForCurrent();
    const composer = document.querySelector('.composer');
    if (composer) {
      composer.querySelectorAll('input,button').forEach(x => { x.disabled = !!isBlocked; });
      const input = composer.querySelector('input:not([type=file])');
      if (input) input.placeholder = isBlocked ? 'User blocked — unblock to send messages' : 'Write a message...';
    }
    let banner = document.getElementById('gm-blocked-banner');
    if (isBlocked) {
      if (!banner) { banner=document.createElement('div'); banner.id='gm-blocked-banner'; banner.style='margin:8px 14px;padding:10px 12px;border-radius:12px;background:#fff1f0;color:#b42318;font:12px system-ui;text-align:center'; banner.textContent='You blocked this user. Messages and calls from this conversation are disabled on this device.'; document.querySelector('.composer-wrap')?.prepend(banner); }
      rows().filter(r => !r.querySelector('.own')).forEach(r => { r.style.display='none'; });
    } else { banner?.remove(); rows().forEach(r=>r.style.removeProperty('display')); }
  };
  const profile = () => overlay('Contact info', `<div style="padding:8px 0"><b>${esc(title())}</b><p style="color:#7c8497">Conversation contact. Use Chat settings or Safety & privacy for additional controls.</p></div>`);
  const settings = () => overlay('Chat settings', `<label style="display:flex;gap:10px;padding:12px 0"><input type="checkbox" data-setting="mute"> Mute notifications</label><label style="display:flex;gap:10px;padding:12px 0"><input type="checkbox" data-setting="favorite"> Favorite chat</label><label style="display:flex;gap:10px;padding:12px 0"><input type="checkbox" data-setting="pin"> Pin chat</label><p style="font-size:11px;color:#7c8497">These are device-level conversation preferences.</p>`);
  const search = () => {
    const el=overlay('Search in conversation', `<input id="gm-q" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #dfe4ee;border-radius:10px" placeholder="Search messages..."><div id="gm-qout" style="display:grid;gap:7px;margin-top:12px"></div>`);
    const input=el.querySelector('#gm-q'), out=el.querySelector('#gm-qout'); input.oninput=()=>{const q=input.value.trim().toLowerCase(); const found=rows().filter(r=>(r.textContent||'').toLowerCase().includes(q)); out.innerHTML=q?(found.length?found.map(r=>`<div style="padding:9px;border:1px solid #e5e8ef;border-radius:10px">${esc((r.textContent||'').trim())}</div>`).join(''):'<div>No matching messages.</div>'):'<div style="color:#7c8497">Type a word to search.</div>';};
  };
  const media = () => {
    const items=[];
    rows().forEach(r=>r.querySelectorAll('img, .attachment a').forEach(a=>{
      const src=a.tagName==='IMG' ? a.getAttribute('src') : a.getAttribute('href'); if(src) items.push({src, image:a.tagName==='IMG', name:a.getAttribute('alt')||a.textContent?.trim()||'File'});
    }));
    const unique=[...new Map(items.map(x=>[x.src,x])).values()];
    const body=unique.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">${unique.map(x=>x.image?`<a href="${esc(x.src)}" target="_blank" rel="noopener"><img src="${esc(x.src)}" alt="${esc(x.name)}" style="width:100%;height:130px;object-fit:cover;border-radius:10px"></a>`:`<div style="padding:12px;border:1px solid #e5e8ef;border-radius:10px"><b style="display:block;word-break:break-word">${esc(x.name)}</b><a href="${esc(x.src)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px">Open file</a></div>`).join('')}</div>`:'<p style="color:#7c8497">No media or documents are loaded in this conversation yet.</p>';
    overlay('Media, links & documents', body+'<p style="font-size:11px;color:#7c8497;margin-top:14px">Images open in a new browser tab. Files open/download through the browser. A website cannot silently open your operating-system Gallery or Downloads folder.</p>');
  };
  const mark = () => { localStorage.setItem('gm_marked_unread:'+title(), new Date().toISOString()); overlay('Marked as unread','This conversation is marked unread on this device.'); };
  const archive = () => { const n=title(); localStorage.setItem('gm_archived:'+n,'1'); const item=[...document.querySelectorAll('.chat-item')].find(x=>x.querySelector('.chat-copy b')?.textContent?.trim()===n); item?.remove(); overlay('Chat archived','The conversation is hidden from your active list on this device.'); };
  const exportChat = () => { const data=rows().map(r=>(r.textContent||'').trim()).filter(Boolean); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify({conversation:title(),exportedAt:new Date().toISOString(),messages:data},null,2)],{type:'application/json'})); a.download=`global-messenger-${title().replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
  const clear = () => { if(!confirm('Clear this chat from your current view?')) return; rows().forEach(r=>r.remove()); localStorage.setItem('gm_cleared:'+title(),new Date().toISOString()); };
  const safety = () => {
    const other=currentOther(); if(!other) return;
    const list=blocked(); const exists=list.some(x=>x.id?x.id===other.id:x.name===other.name);
    const el=overlay('Safety & privacy', `<div style="padding:8px 0"><b>${esc(other.name)}</b><p style="color:#7c8497">Blocking stops this conversation on this device. The blocked state is saved with this account/browser.</p><button id="gm-block" style="width:100%;padding:12px;border:0;border-radius:10px;background:${exists?'#eef1f7':'#d92d20'};color:${exists?'#182033':'#fff'};cursor:pointer">${exists?'Unblock user':'Block user'}</button></div>`);
    el.querySelector('#gm-block').onclick=()=>{const now=blocked(); if(exists) saveBlocked(now.filter(x=>x.id!==other.id&&x.name!==other.name)); else saveBlocked([...now,{id:other.id,name:other.name}]); el.remove(); setBlockedState(); alert(exists?'User unblocked.':'User blocked. This chat is now disabled.');};
  };
  const copy = async()=>{try{await navigator.clipboard.writeText(location.href+'#chat='+encodeURIComponent(title()));alert('Chat link copied.')}catch{alert('Unable to copy chat link.')}};
  const call = type => document.querySelector(`.top-actions .icon-btn:nth-child(${type==='audio'?1:2})`)?.click();
  const menu = () => {
    if(!title()) return;
    const body=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px">${[['profile','👤','Contact info'],['settings','⚙️','Chat settings'],['search','🔎','Search in conversation'],['media','🖼️','Media, links & docs'],['mark','✓','Mark as unread'],['archive','📁','Archive chat'],['export','⬇️','Export chat'],['clear','🗑️','Clear chat'],['safety','🛡️','Safety & privacy'],['copy','🔗','Copy chat link'],['call','📞','Voice call'],['video','📹','Video call']].map(x=>`<button data-a="${x[0]}" style="padding:13px;border:1px solid #e5e8ef;border-radius:12px;background:#fbfcff;text-align:left;cursor:pointer"><b>${x[1]} ${x[2]}</b></button>`).join('')}</div>`;
    const el=overlay('Conversation options',body); el.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;el.remove();({profile,settings,search,media,mark,archive,export:exportChat,clear,safety,copy,call:()=>call('audio'),video:()=>call('video')})[a]?.();});
  };
  document.addEventListener('click', e=>{
    const t=e.target?.closest?.('.top-actions .icon-btn:nth-child(3)');
    if(!t) return; e.preventDefault(); e.stopImmediatePropagation(); menu();
  }, true);
  const observer=new MutationObserver(setBlockedState); observer.observe(document.body,{childList:true,subtree:true});
  setInterval(setBlockedState,1000);
})();