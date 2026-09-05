(() => {
  if (window.__gmSettingsLoaded) return;
  window.__gmSettingsLoaded = true;

  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === 'localhost' ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const get = async path => { const r = await fetch(API + path, { headers: { Authorization: `Bearer ${token()}` } }); const d = await r.json().catch(() => ({})); if (!r.ok) throw Error(d.message || 'Request failed'); return d; };
  const send = async (path, method, body) => { const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw Error(d.message || 'Request failed'); return d; };
  const prefs = () => { try { return JSON.parse(localStorage.getItem('gm_settings') || '{}'); } catch { return {}; } };
  const savePrefs = p => { localStorage.setItem('gm_settings', JSON.stringify(p)); applyPrefs(p); };
  const applyPrefs = p => {
    document.documentElement.dataset.gmTheme = p.theme || 'system';
    document.documentElement.dataset.gmCompact = p.compact ? '1' : '0';
    document.documentElement.dataset.gmReducedMotion = p.reducedMotion ? '1' : '0';
  };
  applyPrefs(prefs());

  const style = document.createElement('style');
  style.textContent = `
    #gm-settings-button{width:38px;height:38px;border-radius:11px;color:#697286;display:grid;place-items:center;font-size:19px;cursor:pointer}
    #gm-settings-button:hover{background:#eef1f8;color:#34405a}
    #gm-settings-overlay{position:fixed;inset:0;z-index:100000;background:#18203366;display:grid;place-items:center;padding:18px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .gm-settings-card{width:min(650px,100%);max-height:90vh;overflow:auto;background:#fff;color:#182033;border-radius:22px;box-shadow:0 30px 90px #18203340;padding:24px}
    .gm-settings-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}.gm-settings-head h2{margin:0;font-size:21px}.gm-settings-head p{margin:5px 0 0;color:#81899b;font-size:12px}.gm-settings-close{width:34px;height:34px;border-radius:10px;font-size:22px;color:#70798d;cursor:pointer}.gm-settings-section{border-top:1px solid #edf0f5;padding:18px 0}.gm-settings-section h3{margin:0 0 4px;font-size:13px}.gm-settings-section>p{margin:0 0 12px;color:#8a92a2;font-size:10px}.gm-setting-row{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:11px 0}.gm-setting-row>div{min-width:0}.gm-setting-row b{display:block;font-size:12px}.gm-setting-row span{display:block;color:#8a92a2;font-size:10px;margin-top:3px;line-height:1.4}.gm-setting-row select,.gm-setting-row input[type=text]{height:38px;border:1px solid #dfe3eb;border-radius:9px;padding:0 10px;outline:0;background:#fff;color:#283247;min-width:145px}.gm-toggle{width:42px;height:24px;border-radius:20px;background:#cbd1dc;position:relative;cursor:pointer;flex:none}.gm-toggle i{position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;left:3px;top:3px;transition:.18s;box-shadow:0 1px 4px #0002}.gm-toggle.on{background:#536dfe}.gm-toggle.on i{left:21px}.gm-save{height:38px;padding:0 15px;border-radius:9px;background:#536dfe;color:#fff;font-weight:700;cursor:pointer}.gm-danger{height:38px;padding:0 14px;border-radius:9px;background:#fff0f0;color:#c64e57;font-weight:700;cursor:pointer}.gm-session{padding:10px 0;border-bottom:1px solid #f0f2f6;display:flex;align-items:center;justify-content:space-between;gap:10px}.gm-session:last-child{border-bottom:0}.gm-session b{font-size:11px}.gm-session small{display:block;color:#8b93a3;font-size:9px;margin-top:3px}.gm-note{padding:9px 11px;border-radius:9px;background:#f4f6fb;color:#687286;font-size:10px}.gm-status{font-size:10px;color:#249565;margin-left:8px}.gm-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.gm-link{height:38px;padding:0 14px;border-radius:9px;background:#f0f2f8;color:#526078;font-weight:700;cursor:pointer}.gm-link:hover{background:#e7eaf2}
    html[data-gm-theme="dark"] body{background:#0b1020;color:#e8ecf5}html[data-gm-theme="dark"] .shell,html[data-gm-theme="dark"] .conversation{background:#101727;color:#e8ecf5}html[data-gm-theme="dark"] .sidebar{background:#0d1423;border-color:#202a3e}html[data-gm-theme="dark"] .brand,html[data-gm-theme="dark"] .topbar{border-color:#202a3e}html[data-gm-theme="dark"] .conversation .messages{background:linear-gradient(180deg,#101727,#0c1321)}html[data-gm-theme="dark"] .chat-item:hover,html[data-gm-theme="dark"] .chat-item.selected,html[data-gm-theme="dark"] .icon-btn:hover{background:#1a2437}html[data-gm-theme="dark"] .search{background:#151e30;border-color:#29344a}html[data-gm-theme="dark"] .search input,html[data-gm-theme="dark"] .composer input{color:#e8ecf5}html[data-gm-theme="dark"] .composer{background:#111a2a;border-color:#29344a}html[data-gm-theme="dark"] .bubble:not(.own .bubble){background:#1b2639;color:#e8ecf5}html[data-gm-theme="dark"] .day span,html[data-gm-theme="dark"] .reply-bar{background:#1a2437;color:#aeb7c9}html[data-gm-theme="dark"] .modal,html[data-gm-theme="dark"] .gm-settings-card{background:#111a2a;color:#e8ecf5}html[data-gm-theme="dark"] .modal-input,html[data-gm-theme="dark"] .modal-search,html[data-gm-theme="dark"] .gm-setting-row select,html[data-gm-theme="dark"] .gm-setting-row input[type=text]{background:#0d1423;color:#e8ecf5;border-color:#29344a}html[data-gm-theme="dark"] .search-results,html[data-gm-theme="dark"] .message-menu,html[data-gm-theme="dark"] .emoji-panel{background:#111a2a;color:#e8ecf5;border-color:#29344a}
    html[data-gm-compact="1"] .messages{padding-top:12px;padding-bottom:12px}html[data-gm-compact="1"] .bubble-row{margin:3px 0}html[data-gm-compact="1"] .bubble{padding:7px 10px}html[data-gm-compact="1"] .chat-item{padding:7px 10px}
    html[data-gm-reduced-motion="1"] *,html[data-gm-reduced-motion="1"] *::before,html[data-gm-reduced-motion="1"] *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}
  `;
  document.head.appendChild(style);

  function addButton(){
    if(document.getElementById('gm-settings-button')) return true;
    const profile=document.querySelector('.profile');
    if(!profile) return false;
    const logout=profile.querySelector('button.icon-btn');
    const b=document.createElement('button'); b.id='gm-settings-button'; b.title='Settings'; b.setAttribute('aria-label','Settings'); b.textContent='⚙️'; b.onclick=openSettings;
    if(logout) profile.insertBefore(b, logout); else profile.appendChild(b);
    return true;
  }

  function downloadJson(filename, data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function exportData(status){
    status.textContent='Preparing your data…';
    try{
      const conversations=await get('/api/conversations');
      const result=[];
      for(const c of (Array.isArray(conversations)?conversations:[])){
        try{ result.push({...c,messages:await get(`/api/conversations/${encodeURIComponent(c.id)}/messages?limit=1000`)}); }catch{ result.push(c); }
      }
      const profile=await get('/api/profile/me').catch(()=>null);
      downloadJson(`global-messenger-data-${new Date().toISOString().slice(0,10)}.json`,{exportedAt:new Date().toISOString(),profile,conversations:result,localPreferences:prefs()});
      status.textContent='Data export downloaded';
    }catch(e){ status.textContent=e.message||'Unable to export data'; }
  }

  async function openSettings(){
    document.getElementById('gm-settings-overlay')?.remove();
    const p=prefs();
    const overlay=document.createElement('div'); overlay.id='gm-settings-overlay';
    overlay.innerHTML=`<div class="gm-settings-card"><div class="gm-settings-head"><div><h2>Settings</h2><p>Manage your account, privacy, notifications, appearance and security.</p></div><button class="gm-settings-close" aria-label="Close">×</button></div>
      <section class="gm-settings-section"><h3>Account</h3><p>Your profile and personal data.</p><div class="gm-setting-row"><div><b>Display name</b><span>This is the name other people see.</span></div><input id="gm-display-name" type="text" maxlength="80"></div><div class="gm-actions"><button class="gm-save" id="gm-save-profile">Save profile</button></div><div id="gm-profile-status"></div></section>
      <section class="gm-settings-section"><h3>Notifications</h3><p>These controls affect this browser/device immediately.</p><div class="gm-setting-row"><div><b>Notification sound</b><span>Allow the app to play its notification sound when supported.</span></div><button class="gm-toggle ${p.sound!==false?'on':''}" id="gm-sound"><i></i></button></div><div class="gm-setting-row"><div><b>Browser notifications</b><span>Allow notification permission for new-message alerts.</span></div><button class="gm-toggle ${p.browserNotifications?'on':''}" id="gm-browser-notifications"><i></i></button></div></section>
      <section class="gm-settings-section"><h3>Appearance</h3><p>Saved on this device.</p><div class="gm-setting-row"><div><b>Theme</b><span>Choose light, dark, or follow your device.</span></div><select id="gm-theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div class="gm-setting-row"><div><b>Compact chats</b><span>Reduce spacing to show more content.</span></div><button class="gm-toggle ${p.compact?'on':''}" id="gm-compact"><i></i></button></div><div class="gm-setting-row"><div><b>Reduce motion</b><span>Minimize animations for accessibility.</span></div><button class="gm-toggle ${p.reducedMotion?'on':''}" id="gm-motion"><i></i></button></div></section>
      <section class="gm-settings-section"><h3>Privacy</h3><p>Server-backed privacy controls apply to your account.</p><div class="gm-setting-row"><div><b>Last seen</b><span>Who can see when you were last active.</span></div><select id="gm-last-seen"><option value="everyone">Everyone</option><option value="contacts">Contacts</option><option value="nobody">Nobody</option></select></div><div class="gm-setting-row"><div><b>Profile photo</b><span>Who can see your profile photo.</span></div><select id="gm-profile-photo"><option value="everyone">Everyone</option><option value="contacts">Contacts</option><option value="nobody">Nobody</option></select></div><div class="gm-actions"><button class="gm-save" id="gm-save-privacy">Save privacy</button></div><div id="gm-privacy-status"></div></section>
      <section class="gm-settings-section"><h3>Security</h3><p>Review active sessions and remove access you no longer recognize.</p><div id="gm-sessions"><div class="gm-note">Loading sessions…</div></div><div class="gm-actions" style="margin-top:12px"><button class="gm-danger" id="gm-revoke-all">Sign out other devices</button></div></section>
      <section class="gm-settings-section"><h3>Your data</h3><p>Export a local copy of your available profile, conversations and messages.</p><div class="gm-actions"><button class="gm-link" id="gm-export">Download my data</button></div><div id="gm-export-status" class="gm-note" style="margin-top:10px">Export includes data currently accessible to this account.</div></section>
      <section class="gm-settings-section"><h3>Danger zone</h3><p>Account deletion is permanent and requires your current password.</p><div class="gm-actions"><button class="gm-danger" id="gm-delete-account">Delete account</button></div></section>
      <section class="gm-settings-section"><h3>About</h3><div class="gm-note">Global Messenger • Settings that appear here are connected to working app or server functionality.</div></section>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.gm-settings-close').onclick=()=>overlay.remove(); overlay.onmousedown=e=>{if(e.target===overlay)overlay.remove()};
    const theme=overlay.querySelector('#gm-theme'); theme.value=p.theme||'system'; theme.onchange=()=>savePrefs({...prefs(),theme:theme.value});
    const compact=overlay.querySelector('#gm-compact'); compact.onclick=()=>{const n=!prefs().compact;savePrefs({...prefs(),compact:n});compact.classList.toggle('on',n)};
    const motion=overlay.querySelector('#gm-motion'); motion.onclick=()=>{const n=!prefs().reducedMotion;savePrefs({...prefs(),reducedMotion:n});motion.classList.toggle('on',n)};
    const sound=overlay.querySelector('#gm-sound'); sound.onclick=()=>{const n=prefs().sound===false;savePrefs({...prefs(),sound:n});sound.classList.toggle('on',n)};
    const browser=overlay.querySelector('#gm-browser-notifications'); browser.onclick=async()=>{try{if(!('Notification' in window))throw Error('Browser notifications are not supported here.');const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();const n=permission==='granted';savePrefs({...prefs(),browserNotifications:n});browser.classList.toggle('on',n);if(!n)alert('Browser notification permission was not granted.');}catch(e){alert(e.message||'Notifications are unavailable.')}};
    try{
      const profile=await get('/api/profile/me'); overlay.querySelector('#gm-display-name').value=profile?.displayName||'';
      const privacy=await get('/api/privacy'); overlay.querySelector('#gm-last-seen').value=privacy?.privacyLastSeen||'everyone'; overlay.querySelector('#gm-profile-photo').value=privacy?.privacyProfilePhoto||'everyone';
    }catch(e){ overlay.querySelector('#gm-profile-status').innerHTML=`<div class="gm-note">${String(e.message||'Unable to load account settings')}</div>`; }
    overlay.querySelector('#gm-save-profile').onclick=async()=>{const status=overlay.querySelector('#gm-profile-status');try{const d=await send('/api/profile/me','PATCH',{displayName:overlay.querySelector('#gm-display-name').value.trim()});localStorage.setItem('gm_user',JSON.stringify({...JSON.parse(localStorage.getItem('gm_user')||'{}'),...d}));document.querySelector('.profile-text b')?.replaceChildren(document.createTextNode(d.displayName));status.innerHTML='<span class="gm-status">Profile saved</span>';}catch(e){status.innerHTML=`<div class="gm-note">${String(e.message||e)}</div>`}};
    overlay.querySelector('#gm-save-privacy').onclick=async()=>{const status=overlay.querySelector('#gm-privacy-status');try{await send('/api/privacy','PATCH',{privacyLastSeen:overlay.querySelector('#gm-last-seen').value,privacyProfilePhoto:overlay.querySelector('#gm-profile-photo').value});status.innerHTML='<span class="gm-status">Privacy saved</span>';}catch(e){status.innerHTML=`<div class="gm-note">${String(e.message||e)}</div>`}};
    const sessions=overlay.querySelector('#gm-sessions');
    try{const list=await get('/api/sessions');sessions.innerHTML=(Array.isArray(list)&&list.length)?list.map(s=>`<div class="gm-session"><div><b>${String(s.deviceName||s.platform||'Device').replace(/[<>]/g,'')}</b><small>${String(s.platform||'web')} • Last active ${s.lastSeenAt?new Date(s.lastSeenAt).toLocaleString():'unknown'}</small></div><button class="gm-danger" data-session="${s.id}">Revoke</button></div>`).join(''):'<div class="gm-note">No tracked sessions yet.</div>';sessions.querySelectorAll('[data-session]').forEach(btn=>btn.onclick=async()=>{try{const r=await fetch(API+'/api/sessions/'+encodeURIComponent(btn.dataset.session),{method:'DELETE',headers:{Authorization:`Bearer ${token()}`}});if(!r.ok)throw Error('Unable to revoke session');btn.closest('.gm-session')?.remove();}catch(e){alert(e.message||'Unable to revoke session')}});}catch(e){sessions.innerHTML=`<div class="gm-note">Unable to load sessions: ${String(e.message||e)}</div>`}
    overlay.querySelector('#gm-revoke-all').onclick=async()=>{if(!confirm('Sign out all other active devices?'))return;try{const r=await fetch(API+'/api/sessions',{method:'DELETE',headers:{Authorization:`Bearer ${token()}`}});if(!r.ok)throw Error('Unable to revoke sessions');alert('Other devices have been signed out.');}catch(e){alert(e.message||'Unable to revoke sessions')}};
    overlay.querySelector('#gm-export').onclick=()=>exportData(overlay.querySelector('#gm-export-status'));
    overlay.querySelector('#gm-delete-account').onclick=async()=>{const password=prompt('Enter your current password to permanently delete your Global Messenger account:');if(password===null)return;if(!password){alert('Password is required.');return;}if(!confirm('This permanently deletes your account. Continue?'))return;const button=overlay.querySelector('#gm-delete-account');button.disabled=true;button.textContent='Deleting…';try{const r=await fetch(API+'/api/auth/account',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({password})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.message||'Unable to delete your account.');localStorage.removeItem('gm_token');localStorage.removeItem('gm_user');localStorage.removeItem('gm_settings');window.location.href='/';}catch(e){button.disabled=false;button.textContent='Delete account';alert(e.message||'Unable to delete account.')}};
  }

  const observer=new MutationObserver(()=>addButton()); observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton,{once:true}); else addButton();
})();
