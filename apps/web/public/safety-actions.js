(() => {
  if (window.__gmSafetyActions) return;
  window.__gmSafetyActions = true;
  const API = (window.__GM_CONFIG__ && window.__GM_CONFIG__.API_URL) || (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const call = async (path, options={}) => {
    const r = await fetch(API + path, { ...options, headers: { 'Content-Type':'application/json', ...(token()?{Authorization:`Bearer ${token()}`}:{}) } });
    const t=await r.text(); let d={}; try{d=t?JSON.parse(t):{}}catch{d={message:t}}
    if(!r.ok) throw new Error(d.message||`Request failed (${r.status})`); return d;
  };
  const activeTitle=()=>document.querySelector('.chat-heading b')?.textContent?.trim()||'';
  async function currentOther(){
    const me=JSON.parse(localStorage.getItem('gm_user')||'{}');
    const r=await call('/api/conversations'); const list=Array.isArray(r)?r:(r.conversations||[]); const title=activeTitle();
    const c=list.find(x=>x.isGroup?(x.title||'Group')===title:x.members?.some(m=>m.user?.id!==me.id&&m.user?.displayName===title));
    return c?.members?.find(m=>m.user?.id!==me.id)?.user||null;
  }
  document.addEventListener('click', async e=>{
    const b=e.target.closest('[data-gm-pd="block"],[data-gm-pd="report"]'); if(!b)return;
    e.preventDefault(); e.stopImmediatePropagation();
    try{
      const other=await currentOther(); if(!other?.id){alert('Contact details are unavailable.');return;}
      if(b.dataset.gmPd==='block'){
        if(!confirm(`Block ${other.displayName||'this contact'}? They will no longer be able to send you new messages.`))return;
        await call(`/api/users/${encodeURIComponent(other.id)}/block`,{method:'POST',body:'{}'});
        alert('Contact blocked successfully.');
      }else{
        const reason=prompt('Report reason (for example: spam, harassment, abuse):'); if(!reason?.trim())return;
        await call(`/api/conversations/${encodeURIComponent((await currentConversationId()))}/report`,{method:'POST',body:JSON.stringify({reason:reason.trim().slice(0,100)})});
        alert('Report submitted to Global Messenger support.');
      }
    }catch(err){alert(err.message||'Unable to complete this action.');}
  },true);
  async function currentConversationId(){
    const me=JSON.parse(localStorage.getItem('gm_user')||'{}'); const r=await call('/api/conversations'); const list=Array.isArray(r)?r:(r.conversations||[]); const title=activeTitle();
    const c=list.find(x=>x.isGroup?(x.title||'Group')===title:x.members?.some(m=>m.user?.id!==me.id&&m.user?.displayName===title));
    if(!c?.id)throw new Error('Conversation not found.'); return c.id;
  }
})();