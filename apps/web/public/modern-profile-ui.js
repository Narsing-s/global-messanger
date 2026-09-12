/* Global Messenger — profile/photo bridge for the modern UI.
 * Keeps the existing React operations untouched and only enhances avatar rendering.
 */
(function(){
  'use strict';
  function safeUser(){try{return JSON.parse(localStorage.getItem('gm_user')||'null')}catch(_){return null}}
  function putPhoto(el,url){
    if(!el||!url||!/^https?:\/\//i.test(String(url)))return;
    const existing=el.querySelector('img[data-gm-profile-photo]');
    if(existing&&existing.src===url)return;
    if(existing)existing.remove();
    const img=document.createElement('img');
    img.src=String(url);img.alt='Profile photo';img.loading='eager';img.referrerPolicy='no-referrer';img.dataset.gmProfilePhoto='1';
    img.addEventListener('error',()=>{img.remove();el.classList.remove('has-photo')},{once:true});
    el.classList.add('has-photo');el.prepend(img);
  }
  function refresh(){
    const me=safeUser();
    if(!me)return;
    if(me.avatarUrl){document.querySelectorAll('.profile .avatar.big').forEach(el=>putPhoto(el,me.avatarUrl))}
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('storage',schedule);
  document.addEventListener('visibilitychange',schedule);
  schedule();
})();
