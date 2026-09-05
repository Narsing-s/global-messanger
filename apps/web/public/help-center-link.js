(() => {
  // Login-only utility actions. They disappear as soon as a user is authenticated.
  const HELP_URL = 'https://global-messenger-help-centre.onrender.com/';
  const APK_URL = 'https://github.com/Narsing-s/global-messanger/releases/latest/download/Global-Messenger.apk';

  const sync = () => {
    if (!document.body) return;

    const authenticated = Boolean(localStorage.getItem('gm_token'));
    const authForm = document.querySelector('.auth-form');
    const authText = authForm?.textContent?.toLowerCase() || '';
    const isLoginPage = Boolean(authForm) && !authText.includes('create account') && !authText.includes('register') && !authText.includes('display name') && !authText.includes('forgot password') && !authText.includes('reset password');

    const existingHelp = document.getElementById('gm-help-center-link');
    const existingInstall = document.getElementById('gm-install-app-link');

    if (authenticated || !isLoginPage) {
      existingHelp?.remove();
      existingInstall?.remove();
      return;
    }

    if (!document.getElementById('gm-login-actions-style')) {
      const style = document.createElement('style');
      style.id = 'gm-login-actions-style';
      style.textContent = `
        #gm-login-actions{position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
        #gm-help-center-link,#gm-install-app-link{border:1px solid #d7def0;border-radius:999px;padding:11px 15px;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease;text-decoration:none}
        #gm-help-center-link{background:#101828;color:#fff}
        #gm-install-app-link{background:#2563eb;color:#fff;border-color:#2563eb}
        #gm-help-center-link:hover,#gm-install-app-link:hover{transform:translateY(-1px);box-shadow:0 14px 30px #1018283d}
      `;
      document.head.appendChild(style);
    }

    let actions = document.getElementById('gm-login-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'gm-login-actions';
      document.body.appendChild(actions);
    }

    if (!existingInstall) {
      const install = document.createElement('a');
      install.id = 'gm-install-app-link';
      install.href = APK_URL;
      install.target = '_blank';
      install.rel = 'noopener noreferrer';
      install.title = 'Install Global Messenger for Android';
      install.textContent = '📱 Install Global Messenger';
      actions.appendChild(install);
    } else if (existingInstall.parentElement !== actions) {
      actions.appendChild(existingInstall);
    }

    if (!existingHelp) {
      const help = document.createElement('button');
      help.id = 'gm-help-center-link';
      help.type = 'button';
      help.title = 'Open Global Messenger Help Centre';
      help.textContent = '❓ Help Centre';
      help.onclick = () => window.open(HELP_URL, '_blank', 'noopener,noreferrer');
      actions.appendChild(help);
    } else if (existingHelp.parentElement !== actions) {
      actions.appendChild(existingHelp);
    }
  };

  const start = () => {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
    window.setInterval(sync, 500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
