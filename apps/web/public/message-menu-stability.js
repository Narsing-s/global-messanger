(() => {
  'use strict';
  const isAction = el => { const t=(el.textContent||'').trim().toLowerCase(); return t==='edit'||t.startsWith('edit message')||t==='delete'||t.startsWith('delete message'); };
  document.addEventListener('click', e => {
    const t=e.target instanceof Element?e.target:null;
    if(!t||!isAction(t.closest('button,[role="menuitem"]')||t)) return;
    // A message action must never leave a second chat/options surface behind it.
    document.querySelectorAll('#gm-enhance-modal,#gm-modern-menu,#gm-gm-modal,#gm-contact-drawer').forEach(el => el.remove());
    document.querySelectorAll('.emoji-picker,.emoji-panel').forEach(el => el.remove());
  }, true);
  const obs=new MutationObserver(()=>{
    const menus=[...document.querySelectorAll('.message-menu')];
    if(menus.length>1) menus.slice(0,-1).forEach(m=>m.remove());
  });
  obs.observe(document.body,{childList:true,subtree:true});
})();
