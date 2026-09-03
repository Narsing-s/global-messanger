(() => {
  const STYLE_ID = 'gm-install-app-style';
  const BUTTON_ID = 'gm-install-app-button';
  let deferredPrompt = null;

  const install = async () => {
    if (!deferredPrompt) {
      alert('To install Global Messenger, use the browser menu and choose “Install Global Messenger” or “Add to Home screen”.');
      return;
    }
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (_) {}
    deferredPrompt = null;
    document.getElementById(BUTTON_ID)?.remove();
  };

  const addButton = () => {
    if (document.getElementById(BUTTON_ID) || !document.body) return;
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = '⬇ Install Global Messenger';
    button.title = 'Install Global Messenger as an app';
    button.onclick = install;
    document.body.appendChild(button);
  };

  const addStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `#${BUTTON_ID}{position:fixed;right:18px;bottom:70px;z-index:9998;border:1px solid #d7def0;background:#536dfe;color:#fff;border-radius:999px;padding:11px 15px;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;cursor:pointer}#${BUTTON_ID}:hover{transform:translateY(-1px)}`;
    document.head.appendChild(style);
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    addStyle();
    addButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById(BUTTON_ID)?.remove();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {}, { once: true });
  }
})();
