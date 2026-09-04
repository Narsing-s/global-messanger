(() => {
  // Installation is intentionally handled by /install.html only.
  // Never inject an Install button into the authenticated chat panel.
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.__gmInstallPrompt = event;
  });
  window.addEventListener('appinstalled', () => { window.__gmInstallPrompt = null; });
})();
