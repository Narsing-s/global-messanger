(() => {
  const API = window.__GM_CONFIG__?.API_URL || ((location.hostname === '127.0.0.1' || location.hostname === 'localhost') ? location.origin : 'https://global-messenger-api.narsingbeesetti006.workers.dev');
  const blockedKey = 'gm_blocked_ids';
  const get = () => { try { return JSON.parse(localStorage.getItem(blockedKey) || '[]'); } catch { return []; } };
  const decorate = () => {
    const ids = get();
    document.querySelectorAll('.chat-item').forEach(item => {
      item.querySelector('.gm-blocked-marker')?.remove();
      const id = item.getAttribute('data-gm-conversation-id');
      if (!id) return;
      const marker = document.createElement('span'); marker.className = 'gm-blocked-marker'; marker.textContent = '🚫 Blocked';
      if (ids.includes(id)) Object.assign(marker.style, { marginLeft:'6px', fontSize:'10px', fontWeight:'700', color:'#dc2626' }); else return;
      item.querySelector('.chat-copy')?.appendChild(marker);
    });
    const heading = document.querySelector('.chat-heading');
    if (heading && ids.length) {
      const title = heading.querySelector('b')?.textContent?.trim();
      if (title) {
        heading.querySelector('.gm-active-blocked')?.remove();
        const me = JSON.parse(localStorage.getItem('gm_user') || '{}');
        fetch(`${API}/api/conversations`, { headers:{ Authorization:`Bearer ${localStorage.getItem('gm_token') || ''}` } }).then(r=>r.ok?r.json():[]).then(cs => {
          const c = cs.find(x => x.isGroup ? (x.title || 'Group') === title : (x.members || []).some(m => m.user?.id !== me.id && m.user?.displayName === title));
          if (!c || !ids.includes(c.id)) return;
          const marker=document.createElement('span'); marker.className='gm-active-blocked'; marker.textContent='🚫 User blocked'; Object.assign(marker.style,{display:'inline-block',marginTop:'3px',fontSize:'11px',fontWeight:'700',color:'#dc2626'}); heading.querySelector('div:nth-child(2)')?.appendChild(marker);
        }).catch(()=>{});
      }
    }
  };
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0]; const options = args[1] || {}; const url = typeof input === 'string' ? input : input?.url || '';
      if (String(options.method || 'GET').toUpperCase() === 'POST' && /\/api\/users\/[^/]+\/block$/.test(url) && response.ok) {
        const id = String(url).match(/\/api\/users\/([^/]+)\/block$/)?.[1]; if (id) { const ids=get(); if(!ids.includes(id)){ids.push(id);localStorage.setItem(blockedKey,JSON.stringify(ids));} setTimeout(decorate,100); }
      }
    } catch {}
    return response;
  };
  const observer=new MutationObserver(decorate); observer.observe(document.documentElement,{childList:true,subtree:true}); setTimeout(decorate,1600); setInterval(decorate,2500);
})();
