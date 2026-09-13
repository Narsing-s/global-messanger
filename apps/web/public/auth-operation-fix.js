(() => {
  'use strict';
  if (window.__gmAuthOperationFix) return;
  window.__gmAuthOperationFix = true;
  const apiBase = () => {
    const configured = window.__GM_CONFIG__?.API_URL;
    if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(configured)) return configured.replace(/\/$/, '');
    if (['capacitor:', 'ionic:', 'file:', 'null'].includes(location.protocol)) return 'https://global-messanger-backend.onrender.com';
    return window.location.origin;
  };
  const val = (form, selector) => form.querySelector(selector)?.value?.trim() || '';
  const readJson = async response => { try { return await response.json(); } catch { return {}; } };
  const isRegisterForm = form => Boolean(form.querySelector('input[autocomplete="name"]') || form.querySelector('input[type="email"]') || form.querySelector('#gm-phone-number'));
  function ensurePhoneField(form) {
    if (!isRegisterForm(form) || form.querySelector('#gm-phone-number')) return;
    const label = document.createElement('label'); label.textContent = 'Phone number';
    const input = document.createElement('input'); input.id='gm-phone-number'; input.type='tel'; input.inputMode='tel'; input.autocomplete='tel'; input.placeholder='+91 9876543210'; label.appendChild(input);
    const passwords=[...form.querySelectorAll('input[type="password"]')]; const passwordLabel=passwords[0]?.closest('label');
    if(passwordLabel) form.insertBefore(label,passwordLabel); else form.appendChild(label);
  }
  function scan(){ document.querySelectorAll('.auth-page form').forEach(form=>ensurePhoneField(form)); }
  async function run(form) {
    ensurePhoneField(form); const registering=isRegisterForm(form); const identifier=val(form,'input[autocomplete="username"]'); const password=val(form,'input[type="password"]');
    if(!identifier||!password) throw new Error('Please enter the required login details.');
    if(registering){
      const displayName=val(form,'input[autocomplete="name"]'),email=val(form,'input[type="email"]'),phoneNumber=val(form,'#gm-phone-number')||val(form,'input[type="tel"]');
      const passwords=[...form.querySelectorAll('input[type="password"]')].map(x=>x.value||'');
      if(passwords[1]&&passwords[1]!==password) throw new Error('Passwords do not match.');
      if(!displayName||!email||!phoneNumber) throw new Error('Please complete display name, email and phone number.');
      const response=await fetch(apiBase()+'/api/auth/register-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:identifier,displayName,email,phoneNumber,password})});
      const data=await readJson(response); if(!response.ok&&response.status!==503) throw new Error(data.message||'Unable to create account.');
      if(!data.token){const login=await fetch(apiBase()+'/api/auth/login-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});const loginData=await readJson(login);if(!login.ok||!loginData.token)throw new Error(loginData.message||data.message||'Account was created, but sign-in could not be completed.');localStorage.setItem('gm_token',loginData.token);localStorage.setItem('gm_user',JSON.stringify(loginData.user));}
      else{localStorage.setItem('gm_token',data.token);localStorage.setItem('gm_user',JSON.stringify(data.user));}
    } else {
      const response=await fetch(apiBase()+'/api/auth/login-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})}); const data=await readJson(response);
      if(!response.ok||!data.token) throw new Error(data.message||'Unable to sign in.'); localStorage.setItem('gm_token',data.token); localStorage.setItem('gm_user',JSON.stringify(data.user));
    }
    window.location.replace('/');
  }
  const observer=new MutationObserver(scan); if(document.body)observer.observe(document.body,{childList:true,subtree:true});else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}));
  document.addEventListener('submit',event=>{const form=event.target instanceof HTMLFormElement?event.target:null;if(!form?.closest('.auth-page'))return;event.preventDefault();event.stopImmediatePropagation();ensurePhoneField(form);const button=form.querySelector('button.auth-submit,button.primary');if(button instanceof HTMLButtonElement)button.disabled=true;run(form).catch(error=>{const box=form.querySelector('.auth-error')||document.createElement('div');box.className='auth-error';box.textContent=error?.message||String(error);if(!box.parentNode)form.insertBefore(box,button||null);if(button instanceof HTMLButtonElement)button.disabled=false;});},true);
})();