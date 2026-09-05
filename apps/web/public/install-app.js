(() => {
  // The install shortcut is a login-page action only. Signed-in users already have the app.
  const BUTTON_ID = 'gm-install-page-link';

  const isLoginPage = () => {
    if (localStorage.getItem('gm_token')) return false;
    const form = document.querySelector('.auth-form');
    if (!form) return false;
    const text = (form.textContent || '').toLowerCase();
    if (text.includes('create account') || text.includes('register') || text.includes('display name') || text.includes('forgot password') || text.includes('reset password') || text.includes('new password')) return false;
    return Array.from(form.querySelectorAll('button')).some(button => /^(sign in|login)$/i.test((button.textContent || '').trim()));
  };

  const sync = () => {
    if (!document.body) return;
    const button = document.getElementById(BUTTON_ID);
    if (!isLoginPage()) {
      button?.remove();
      return;
    }
    if (button) return;

    const install = document.createElement('a');
    install.id = BUTTON_ID;
    install.href = 'https://github.com/Narsing-s/global-messanger/releases/latest/download/Global-Messenger.apk';
    install.target = '_blank';
    install.rel = 'noopener noreferrer';
    install.textContent = '📱 Install Global Messenger';
    install.title = 'Install Global Messenger';
    install.setAttribute('aria-label', 'Install Global Messenger');
    install.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;border:1px solid #d7def0;background:#536dfe;color:#fff;border-radius:999px;padding:11px 15px;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;text-decoration:none;cursor:pointer;pointer-events:auto';

    let actions = document.getElementById('gm-login-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'gm-login-actions';
      actions.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px';
      document.body.appendChild(actions);
    }
    actions.prepend(install);
  };

  const boot = () => {
    sync();
    new MutationObserver(sync).observe(document.body, {childList:true,subtree:true});
    window.addEventListener('storage', sync);
    window.setInterval(sync, 500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
