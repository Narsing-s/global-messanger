/* Global Messenger UI v3 — non-destructive enhancement layer. */
(function(){
  'use strict';
  const initials=n=>String(n||'GM').trim().slice(0,2).toUpperCase();
  function profilePhoto(){
    const raw=localStorage.getItem('gm_user'); if(!raw)return;
    let u; try{u=JSON.parse(raw)}catch(_){return}
    const p=document.querySelector('.profile'); if(!p)return;
    const av=p.querySelector('.avatar.big');
    if(av&&u.avatarUrl){av.innerHTML='';const img=document.createElement('img');img.className='gm-profile-photo';img.src=u.avatarUrl;img.alt=u.displayName||u.username||'Profile';img.onerror=()=>{av.textContent=initials(u.displayName||u.username)};av.appendChild(img)}
    if(av&&!av.querySelector('img')&&!av.textContent.trim())av.textContent=initials(u.displayName||u.username);
    let presence=p.querySelector('.gm-profile-presence');
    if(!presence){presence=document.createElement('span');presence.className='gm-profile-presence online';presence.innerHTML='<i></i> Active now';const text=p.querySelector('.profile-text');if(text)text.appendChild(presence)}
  }
  function quickPanel(){
    const side=document.querySelector('.sidebar'); if(!side||side.querySelector('.gm-quick-panel'))return;
    const nav=side.querySelector('.nav'); if(!nav)return;
    const panel=document.createElement('div');panel.className='gm-quick-panel';
    const items=[['⌕','Find'],['＋','Group'],['⚙','Settings']];
    items.forEach(([icon,label])=>{const b=document.createElement('button');b.type='button';b.innerHTML=icon+' '+label;b.onclick=()=>{if(label==='Group'){const x=Array.from(document.querySelectorAll('.nav button')).find(v=>/New group/i.test(v.textContent||''));x?.click()}else if(label==='Settings'){window.dispatchEvent(new CustomEvent('gm:open-settings'))}else{const x=side.querySelector('.search input');x?.focus()}};panel.appendChild(b)});
    nav.insertAdjacentElement('afterend',panel);
  }
  function run(){profilePhoto();quickPanel()}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',run);setTimeout(run,250);setTimeout(run,1000);
})();
