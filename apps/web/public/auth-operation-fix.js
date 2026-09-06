(() => {
  'use strict';
  if (window.__gmAuthOperationFix) return;
  window.__gmAuthOperationFix = true;
  const apiBase = () => (window.__GM_CONFIG__?.API_URL || 'https://global-messanger-backend.onrender.com').replace(/\/$/, '');
  const val = (form, selector) => form.querySelector(selector)?.value?.trim() || '';
  const readJson = async response => { try { return await response.json(); } catch { return {}; } };
  async function run(form) {
    const text = (form.textContent || '').toLowerCase();
    const registering = text.includes('create your account') || text.includes('create account');
    const identifier = val(form, 'input[autocomplete="username"]');
    const password = val(form, 'input[type="password"]');
    if (!identifier || !password) throw new Error('Please enter the required login details.');
    if (registering) {
      const displayName = val(form, 'input[autocomplete="name"]');
      const email = val(form, 'input[type="email"]');
      const phoneNumber = val(form, '#gm-phone-number') || val(form, 'input[type="tel"]');
      const passwords = [...form.querySelectorAll('input[type="password"]')].map(x => x.value || '');
      if (passwords[1] && passwords[1] !== password) throw new Error('Passwords do not match.');
      if (!displayName || !email || !phoneNumber) throw new Error('Please complete display name, email and phone number.');
      const response = await fetch(apiBase() + '/api/auth/register-email', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:identifier,displayName,email,phoneNumber,password})});
      const data = await readJson(response);
      if (!response.ok && response.status !== 503) throw new Error(data.message || 'Unable to create account.');
      if (!data.token) {
        const login = await fetch(apiBase() + '/api/auth/login-email', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});
        const loginData = await readJson(login);
        if (!login.ok || !loginData.token) throw new Error(loginData.message || data.message || 'Account was created, but sign-in could not be completed.');
        localStorage.setItem('gm_token', loginData.token); localStorage.setItem('gm_user', JSON.stringify(loginData.user));
      } else { localStorage.setItem('gm_token', data.token); localStorage.setItem('gm_user', JSON.stringify(data.user)); }
    } else {
      const response = await fetch(apiBase() + '/api/auth/login-email', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});
      const data = await readJson(response);
      if (!response.ok || !data.token) throw new Error(data.message || 'Unable to sign in.');
      localStorage.setItem('gm_token', data.token); localStorage.setItem('gm_user', JSON.stringify(data.user));
    }
    window.location.replace('/');
  }
  document.addEventListener('submit', event => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.closest('.auth-page')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const button = form.querySelector('button.primary');
    if (button instanceof HTMLButtonElement) button.disabled = true;
    run(form).catch(error => {
      const box = form.querySelector('.error') || document.createElement('div');
      box.className='error'; box.textContent=error?.message || String(error);
      if (!box.parentNode) form.insertBefore(box, button || null);
      if (button instanceof HTMLButtonElement) button.disabled=false;
    });
  }, true);
})();
