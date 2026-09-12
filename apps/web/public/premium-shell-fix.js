(() => {
  const wire=()=>{
    const rail=document.querySelector('.gm-premium-rail'); if(!rail||rail.dataset.fixed==='1') return;
    rail.dataset.fixed='1';
    rail.addEventListener('click',e=>{
      const b=e.target.closest('[data-gm-p]'); if(!b) return;
      const a=b.dataset.gmP;
      const tab=document.querySelector(`[data-gm-tab="${a==='chats'?'all':a==='groups'?'groups':a==='contacts'?'contacts':''}"]`);
      if(tab) tab.click();
      if(a==='calls') document.querySelector('.top-actions .icon-btn')?.click();
    },true);
  };
  wire(); setInterval(wire,500);
})();