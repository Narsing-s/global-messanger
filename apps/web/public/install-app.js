(() => {
  // Keep the install entry available to both signed-in and signed-out users.
  const BUTTON_ID = 'gm-install-page-link';
  const addButton = () => {
    if (document.getElementById(BUTTON_ID) || !document.body) return;
    const button = document.createElement('a');
    button.id = BUTTON_ID;
    button.href = '/install';
    button.textContent = '⬇ Install Global Messenger';
    button.title = 'Install Global Messenger on Android, iPhone/iPad, desktop, or web';
    button.style.cssText = 'position:fixed;right:18px;bottom:72px;z-index:9998;border:1px solid #d7def0;background:#536dfe;color:#fff;border-radius:999px;padding:11px 15px;font:700 13px system-ui,sans-serif;box-shadow:0 10px 28px #10182833;text-decoration:none';
    document.body.appendChild(button);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton, { once: true });
  else addButton();
})();
