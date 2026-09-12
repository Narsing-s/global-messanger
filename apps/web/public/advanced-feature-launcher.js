(() => {
  const mount = () => {
    if (document.getElementById('gm-advanced-launcher')) return;
    const b = document.createElement('button');
    b.id = 'gm-advanced-launcher'; b.type = 'button'; b.textContent = '✦ Advanced';
    Object.assign(b.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:'99998',padding:'11px 15px',borderRadius:'999px',border:'1px solid rgba(148,163,184,.35)',background:'#111827',color:'#fff',fontWeight:'700',boxShadow:'0 10px 30px rgba(0,0,0,.25)',cursor:'pointer'});
    b.onclick=()=>{if(typeof window.__gmOpenAdvancedCenter==='function')window.__gmOpenAdvancedCenter();else window.dispatchEvent(new CustomEvent('gm:open-advanced-center'));};
    document.body.appendChild(b);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
