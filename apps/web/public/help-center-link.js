(() => {
  // Help Centre is shown only on the login/register screen.
  const HELP_URL = 'https://global-messenger-help-centre.onrender.com/';

  const sync = () => {
    if (!document.body) return;

    const authenticated = Boolean(localStorage.getItem('gm_token'));
    const existing = document.getElementById('gm-help-center-link');

    if (authenticated) {
      existing?.remove();
      return;
    }

    if (existing) return;

    if (!document.getElementById('gm-help-center-link-style')) {
      const style = document.createElement('style');
      style.id = 'gm-help-center-link-style';
      style.textContent = '#gm-help-center-link{position:fixed;right:18px;bottom:18px;z-index:9999;border:1px solid #d7def0;background:#101828;color:#fff;border-radius:999px;padding:11px 15px;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;cursor:pointer}#gm-help-center-link:hover{transform:translateY(-1px)}';
      document.head.appendChild(style);
    }

    const button = document.createElement('button');
    button.id = 'gm-help-center-link';
    button.type = 'button';
    button.title = 'Open Global Messenger Help Centre';
    button.textContent = '❓ Help Centre';
    button.onclick = () => window.open(HELP_URL, '_blank', 'noopener,noreferrer');
    document.body.appendChild(button);
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
