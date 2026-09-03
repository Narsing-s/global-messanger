(() => {
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const apiUrl = p => p && String(p).startsWith('http') ? p : `${API}${p || ''}`;
  const getConversations = async () => {
    const res = await fetch(`${API}/api/conversations`, {headers: token() ? {Authorization:`Bearer ${token()}`} : {}});
    if (!res.ok) throw new Error('Unable to load conversations');
    return await res.json();
  };
  const currentTitle = () => (document.querySelector('.chat-heading b')?.textContent || '').trim();
  const me = () => JSON.parse(localStorage.getItem('gm_user') || '{}');
  const commonGroups = (rows, otherId) => (Array.isArray(rows) ? rows : []).filter(c => c.isGroup && (c.members || []).some(m => m.user?.id === me().id) && (c.members || []).some(m => m.user?.id === otherId));
  function inject(c, groups){
    const panel=document.querySelector('#gm-contact-drawer .gm-contact-panel'); if(!panel || c?.isGroup || !groups.length || panel.querySelector('[data-common-groups]'))return;
    const html=`<div class="gm-section" data-common-groups><div class="gm-section-title"><span>Groups in common</span><small>${groups.length}</small></div><div class="gm-common-list">${groups.map(g=>`<div class="gm-common">${g.avatarUrl?`<img class="gm-common-avatar" src="${esc(apiUrl(g.avatarUrl))}" alt="">`:`<div class="gm-common-avatar">${esc(String(g.title||'G').slice(0,2).toUpperCase())}</div>`}<div><b>${esc(g.title||'Group')}</b><span>${g.members?.length || 0} participants</span></div></div>`).join('')}</div></div>`;
    const actions=[...panel.querySelectorAll('.gm-section')];
    const target=actions.find(x=>x.querySelector('[data-panel-action="favorite"]'));
    if(target)target.insertAdjacentHTML('beforebegin',html);else panel.insertAdjacentHTML('beforeend',html);
  }
  const observer=new MutationObserver(async()=>{const panel=document.getElementById('gm-contact-drawer');if(!panel||panel.querySelector('[data-common-groups]'))return;const t=currentTitle();if(!t)return;try{const rows=await getConversations(),u=me(),c=rows.find(x=>x.isGroup?(x.title||'Group')===t:x.members?.some(m=>m.user?.id!==u.id&&m.user?.displayName===t));const other=c?.members?.find(m=>m.user?.id!==u.id)?.user;if(c&&!c.isGroup&&other)inject(c,commonGroups(rows,other.id))}catch{}});observer.observe(document.body,{childList:true,subtree:true});
})();
