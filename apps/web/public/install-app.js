(() => {
  // The install shortcut is a login-page action only. Signed-in users already have the app.
  const BUTTON_ID = 'gm-install-page-link';
  const isLoginPage = () => {
    const form = document.querySelector('.auth-form');
    if (!form) return false;
    const text = (form.textContent || '').toLowerCase();
    return !text.includes('create account') &&
      !text.includes('register') &&
      !text.includes('display name') &&
      !text.includes('forgot password') &&
      !text.includes('reset password');
  };

  const sync = () => {
    if (!document.body) return;
    const authenticated = Boolean(localStorage.getItem('gm_token'));
    const button = document.getElementById(BUTTON_ID);

    // Never show the install shortcut inside chats or any authenticated screen.
    if (authenticated || !isLoginPage()) {
      button?.remove();
      return;
    }

    if (button) return;

    const install = document.createElement('a');
    install.id = BUTTON_ID;
    install.href = '/install';
    install.textContent = '⬇ Install Global Messenger';
    install.title = 'Install Global Messenger';
    install.setAttribute('aria-label', 'Install Global Messenger');
    install.style.cssText = 'position:fixed;right:18px;bottom:72px;z-index:99999;display:inline-flex;align-items:center;justify-content:center;border:1px solid #d7def0;background:#536dfe;color:#fff;border-radius:999px;padding:11px 15px;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;text-decoration:none;cursor:pointer;pointer-events:auto';
    document.body.appendChild(install);
  };

  const boot = () => {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('storage', sync);
    window.setInterval(sync, 500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
