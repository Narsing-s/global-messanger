(() => {
  // Help Centre is a login-page utility. The install shortcut is owned by install-app.js.
  const HELP_URL = 'https://global-messenger-help-centre.onrender.com/';
  const BUTTON_ID = 'gm-help-center-link';

  const isLoginPage = () => {
    const authenticated = Boolean(localStorage.getItem('gm_token'));
    const form = document.querySelector('.auth-form');
    if (authenticated || !form) return false;

    const text = (form.textContent || '').toLowerCase();
    // Registration/reset screens have distinct copy; do not show login utilities there.
    if (text.includes('create account') || text.includes('register') || text.includes('display name') || text.includes('forgot password') || text.includes('reset password') || text.includes('new password')) return false;

    return Array.from(form.querySelectorAll('button')).some(button => /^(sign in|login)$/i.test((button.textContent || '').trim()));
  };

  const sync = () => {
    if (!document.body) return;
    const existing = document.getElementById(BUTTON_ID);
    if (!isLoginPage()) {
      existing?.remove();
      document.getElementById('gm-login-actions')?.remove();
      return;
    }

    if (!document.getElementById('gm-login-actions-style')) {
      const style = document.createElement('style');
      style.id = 'gm-login-actions-style';
      style.textContent = `
        #gm-login-actions{position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
        #gm-help-center-link{border:1px solid #d7def0;border-radius:999px;padding:11px 15px;background:#101828;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
        #gm-help-center-link:hover{transform:translateY(-1px);box-shadow:0 14px 30px #1018283d}
      `;
      document.head.appendChild(style);
    }

    let actions = document.getElementById('gm-login-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'gm-login-actions';
      document.body.appendChild(actions);
    }

    if (!document.getElementById(BUTTON_ID)) {
      const help = document.createElement('button');
      help.id = BUTTON_ID;
      help.type = 'button';
      help.title = 'Open Global Messenger Help Centre';
      help.textContent = '❓ Help Centre';
      help.onclick = () => window.open(HELP_URL, '_blank', 'noopener,noreferrer');
      actions.appendChild(help);
    } else if (existing.parentElement !== actions) {
      actions.appendChild(existing);
    }
  };

  const start = () => {
    sync();
    new MutationObserver(sync).observe(document.body, {childList:true,subtree:true});
    window.addEventListener('storage', sync);
    window.setInterval(sync, 500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
