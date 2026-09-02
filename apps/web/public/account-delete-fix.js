(() => {
  const moveDeleteButton = () => {
    const button = document.querySelector('.gm-delete-account-entry');
    const sidebar = document.querySelector('.sidebar');
    const sidebarBottom = document.querySelector('.sidebar-bottom');
    if (!button || !sidebar || !sidebarBottom) return;

    // Keep Delete account exactly in the original account/settings area,
    // directly below the existing sidebar-bottom controls.
    if (button.parentElement !== sidebarBottom) {
      sidebarBottom.appendChild(button);
    }
  };

  const observer = new MutationObserver(moveDeleteButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  moveDeleteButton();
})();
