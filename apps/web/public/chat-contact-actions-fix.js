(() => {
  'use strict';
  const KEY = 'gm_contact_preferences';
  const prefs = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = v => localStorage.setItem(KEY, JSON.stringify(v));
  const chat = () => document.querySelector('.chat-heading b')?.textContent?.trim() || 'Chat';
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const closePanel = () => document.getElementById('gm-contact-info-final')?.remove();
  function dialog(title, body, buttons='Close') {
    document.getElementById('gm-ci-action-dialog')?.remove();
    const el = document.createElement('div'); el.id='gm-ci-action-dialog';
    el.innerHTML = `<div class="gm-ci-dialog"><div class="gm-ci-dialog-head"><b>${esc(title)}</b><button data-x>×</button></div><div class="gm-ci-dialog-body">${body}</div><div class="gm-ci-dialog-actions">${buttons}</div></div>`;
    document.body.appendChild(el);
    el.querySelector('[data-x]').onclick=()=>el.remove();
    el.onclick=e=>{if(e.target===el)el.remove()};
    return el;
  }
  function styles(){ if(document.getElementById('gm-ci-action-style'))return; const s=document.createElement('style');s.id='gm-ci-action-style';s.textContent=`#gm-ci-action-dialog{position:fixed;inset:0;z-index:2147483647;background:#0008;display:grid;place-items:center;padding:20px;font-family:Inter,Arial,sans-serif}#gm-ci-action-dialog .gm-ci-dialog{width:min(480px,94vw);max-height:85vh;overflow:auto;background:#202020;color:#fff;border:1px solid #3a3a3a;border-radius:18px;box-shadow:0 25px 80px #0009}#gm-ci-action-dialog .gm-ci-dialog-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #333}#gm-ci-action-dialog .gm-ci-dialog-head button{border:0;background:none;color:#fff;font-size:25px;cursor:pointer}#gm-ci-action-dialog .gm-ci-dialog-body{padding:18px 20px;color:#ddd;font-size:14px;line-height:1.55}#gm-ci-action-dialog .gm-ci-dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid #333}.gm-ci-action-btn{border:0;border-radius:10px;padding:10px 16px;cursor:pointer;background:#536dfe;color:#fff}.gm-ci-option{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid #383838}.gm-ci-option:last-child{border-bottom:0}.gm-ci-option button{border:0;border-radius:999px;padding:7px 13px;background:#444;color:#fff;cursor:pointer}.gm-ci-option button.on{background:#536dfe}.gm-ci-search{width:100%;box-sizing:border-box;background:#111;color:#fff;border:1px solid #444;border-radius:10px;padding:12px}.gm-ci-results{margin-top:12px;max-height:45vh;overflow:auto}.gm-ci-result{padding:10px;border-bottom:1px solid #383838}.gm-ci-star{cursor:pointer}.gm-ci-media-click{cursor:pointer}`;document.head.appendChild(s)}
  function action(a){
    const title=chat(), p=prefs();
    if(a==='search'){
      const rows=[...document.querySelectorAll('.messages .bubble-row')];
      const el=dialog('Search in conversation',`<input class="gm-ci-search" id="gm-ci-search-input" placeholder="Search messages…"><div class="gm-ci-results" id="gm-ci-results">Type a word to search.</div>`);
      const input=el.querySelector('#gm-ci-search-input'),out=el.querySelector('#gm-ci-results');
      input.oninput=()=>{const q=input.value.trim().toLowerCase();if(!q){out.textContent='Type a word to search.';return}const m=rows.filter(r=>(r.textContent||'').toLowerCase().includes(q));out.innerHTML=m.length?m.map(r=>`<div class="gm-ci-result">${esc((r.textContent||'').trim())}</div>`).join(''):'<div class="gm-ci-result">No matching messages.</div>'}; return true;
    }
    if(a==='starred'){
      const rows=[...document.querySelectorAll('.messages .bubble-row')];
      const stars=rows.filter(r=>r.querySelector('[data-star],.starred,.bookmark,.message-star'));
      dialog('Starred messages',stars.length?stars.map(r=>`<div class="gm-ci-result">${esc((r.textContent||'').trim())}</div>`).join(''):'<div>No starred messages in this chat yet.</div>'); return true;
    }
    if(['notifications','disappearing','privacy','favorite'].includes(a)){
      const labels={notifications:'Mute notifications',disappearing:'Disappearing messages',privacy:'Advanced chat privacy',favorite:'Add to favourites'};
      const key=a; const on=!!p[title]?.[key]; const next=!on; p[title]={...(p[title]||{}),[key]:next};save(p);
      dialog(labels[a],`<p><b>${next?'Enabled':'Disabled'}</b></p><p>This preference is saved for this conversation on this device.</p>`, `<button class="gm-ci-action-btn" data-ok>Done</button>`).querySelector('[data-ok]').onclick=()=>document.getElementById('gm-ci-action-dialog')?.remove(); return true;
    }
    if(a==='encryption'){
      dialog('Encryption','Messages in this conversation use Global Messenger’s end-to-end encryption layer. Your messages are protected in transit and the encryption status shown here is informational.'); return true;
    }
    if(a==='list'){
      const list=Array.isArray(p.lists)?p.lists:[]; const el=dialog('Add to list',`<div class="gm-ci-result"><input id="gm-ci-list-name" class="gm-ci-search" placeholder="List name, e.g. Family"></div>`,`<button class="gm-ci-action-btn" data-save>Add</button><button class="gm-ci-action-btn" data-cancel>Cancel</button>`);el.querySelector('[data-save]').onclick=()=>{const n=el.querySelector('#gm-ci-list-name').value.trim();if(!n)return; if(!list.includes(n))list.push(n);p.lists=list;p[title]={...(p[title]||{}),list:n};save(p);el.remove();alert(`Added to ${n}.`)};el.querySelector('[data-cancel]').onclick=()=>el.remove();return true;
    }
    if(a==='export'){
      const rows=[...document.querySelectorAll('.messages .bubble-row')].map(r=>(r.textContent||'').trim()).filter(Boolean);
      const blob=new Blob([JSON.stringify({chat:title,messages:rows,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const x=document.createElement('a');x.href=URL.createObjectURL(blob);x.download=`global-messenger-${title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`;x.click();setTimeout(()=>URL.revokeObjectURL(x.href),1000);return true;
    }
    if(a==='clear'){
      if(!confirm('Clear this chat from your current view? This does not delete messages for the other person.'))return true;
      document.querySelector('.messages')?.replaceChildren(); p[title]={...(p[title]||{}),clearedAt:new Date().toISOString()};save(p);closePanel();return true;
    }
    if(a==='block'){
      if(!confirm(`Block ${title}?`))return true; const b=JSON.parse(localStorage.getItem('gm_blocked_users')||'[]');if(!b.includes(title))b.push(title);localStorage.setItem('gm_blocked_users',JSON.stringify(b));dialog('Contact blocked',`${esc(title)} is blocked on this device. You can manage blocked contacts from Settings.`);return true;
    }
    if(a==='report'){
      dialog('Report contact',`<p>Report <b>${esc(title)}</b>?</p><p>This will record your report locally and hide the report dialog.</p>`,`<button class="gm-ci-action-btn" data-report>Report</button><button class="gm-ci-action-btn" data-cancel>Cancel</button>`).querySelector('[data-report]').onclick=()=>{const r=JSON.parse(localStorage.getItem('gm_reports')||'[]');r.push({contact:title,at:new Date().toISOString()});localStorage.setItem('gm_reports',JSON.stringify(r));document.getElementById('gm-ci-action-dialog')?.remove();alert('Report submitted.');};return true;
    }
    if(a==='delete'){
      if(!confirm(`Delete this chat from this device?`))return true; const d=JSON.parse(localStorage.getItem('gm_deleted_chats')||'[]');if(!d.includes(title))d.push(title);localStorage.setItem('gm_deleted_chats',JSON.stringify(d));closePanel();document.querySelector('.messages')?.replaceChildren();return true;
    }
    if(a==='leave'){
      if(!confirm('Exit this group?'))return true; const d=JSON.parse(localStorage.getItem('gm_left_groups')||'[]');if(!d.includes(title))d.push(title);localStorage.setItem('gm_left_groups',JSON.stringify(d));closePanel();alert('You left the group on this device.');return true;
    }
    return false;
  }
  styles();
  document.addEventListener('click',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;const row=t.closest('#gm-contact-info-final [data-act]');if(!row)return;e.preventDefault();e.stopImmediatePropagation();action(row.dataset.act||'')},true);
  document.addEventListener('click',e=>{const t=e.target instanceof Element?e.target:null;if(!t)return;const call=t.closest('#gm-contact-info-final [data-call]');if(call)return;},true);
})();
