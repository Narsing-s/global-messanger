(() => {
  const isLoadError = (text) => /unable to load conversations|request failed \((?:4|5)\d\d\)/i.test(String(text || ''));
  const apiBase = () => window.__GM_CONFIG__?.API_URL || (location.hostname === 'global-messanger.onrender.com' ? 'https://global-messanger-backend.onrender.com' : location.origin);
  let checking = false;

  async function verifyConversationsAndClear(node) {
    if (checking || !node || !isLoadError(node.textContent)) return;
    const token = localStorage.getItem('gm_token');
    if (!token) return;
    checking = true;
    try {
      const response = await fetch(`${apiBase()}/api/conversations`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.ok) node.remove();
    } catch {}
    finally { checking = false; }
  }

  function scan() { document.querySelectorAll('.socket-error').forEach(verifyConversationsAndClear); }

  function authFix() {
    const auth = document.querySelector('.auth-page');
    const card = auth?.querySelector('.auth-card');
    const form = card?.querySelector('form');
    if (!auth || !card || !form || form.dataset.gmAuthFixed === '1') return;
    form.dataset.gmAuthFixed = '1';

    const heading = () => card.querySelector('h1')?.textContent?.trim() || '';
    const isRegister = () => heading().toLowerCase().includes('create your account');

    const style = document.createElement('style');
    style.textContent = '.gm-phone-label{display:block}.gm-phone-label small{display:block;color:#8a93a5;font-size:11px;margin-top:4px}.gm-auth-note{font-size:11px;color:#7c8497;margin:4px 0 10px}';
    document.head.appendChild(style);

    const syncRegisterFields = () => {
      const registering = isRegister();
      let phone = card.querySelector('#gm-phone-number');
      if (registering && !phone) {
        const passwordLabel = [...form.querySelectorAll('label')].find(l => /password/i.test(l.textContent || '') && !/confirm/i.test(l.textContent || ''));
        const label = document.createElement('label');
        label.className = 'gm-phone-label';
        label.innerHTML = 'Phone number<input id="gm-phone-number" type="tel" inputmode="tel" autocomplete="tel" placeholder="+91 9876543210" required/><small>Use country code, for example +91.</small>';
        if (passwordLabel) form.insertBefore(label, passwordLabel); else form.appendChild(label);
      } else if (!registering && phone) {
        phone.closest('label')?.remove();
      }
      const identifier = form.querySelector('input[autocomplete="username"]');
      if (identifier) identifier.setAttribute('placeholder', registering ? 'your_username' : 'Username, email or phone number');
      const firstP = card.querySelector('p');
      if (firstP && !registering && !card.querySelector('.gm-auth-note')) {
        const note = document.createElement('div'); note.className = 'gm-auth-note'; note.textContent = 'Sign in with your username, email address, or phone number.'; firstP.insertAdjacentElement('afterend', note);
      }
    };

    syncRegisterFields();
    new MutationObserver(syncRegisterFields).observe(card, { childList: true, subtree: true });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const register = isRegister();
      const inputs = [...form.querySelectorAll('input')];
      const value = (selector) => form.querySelector(selector)?.value?.trim() || '';
      const identifier = value('input[autocomplete="username"]');
      const password = value('input[type="password"]');
      const passwords = inputs.filter(i => i.type === 'password').map(i => i.value);
      const displayName = register ? value('input[autocomplete="name"]') : '';
      const email = register ? value('input[type="email"]') : '';
      const phoneNumber = register ? value('#gm-phone-number') : '';
      const errorBox = card.querySelector('.error');
      const setError = (message) => {
        if (errorBox) errorBox.textContent = message;
        else { const el = document.createElement('div'); el.className = 'error'; el.textContent = message; form.prepend(el); }
      };
      if (!identifier || !password || (register && (!displayName || !email || !phoneNumber || passwords.length < 2))) return setError('Please complete all required fields.');
      if (register && passwords[0] !== passwords[1]) return setError('Passwords do not match');
      const button = form.querySelector('button.primary');
      if (button) { button.disabled = true; button.textContent = register ? 'Creating…' : 'Signing in…'; }
      try {
        const response = await fetch(`${apiBase()}/api/auth/${register ? 'register-email' : 'login-email'}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(register ? { username: identifier, displayName, email, phoneNumber, password } : { identifier, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Authentication failed. Please try again.');
        localStorage.setItem('gm_token', data.token);
        localStorage.setItem('gm_user', JSON.stringify(data.user));
        location.href = '/';
      } catch (error) {
        setError(error?.message || 'Authentication failed. Please try again.');
        if (button) { button.disabled = false; button.textContent = register ? 'Create account' : 'Sign in'; }
      }
    }, true);
  }

  function scan() {
    document.querySelectorAll('.socket-error').forEach(verifyConversationsAndClear);
    authFix();
  }

  const observer = new MutationObserver(scan);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
