(() => {
  const moveDeleteButton = () => {
    const button = document.querySelector('.gm-delete-account-entry');
    const sidebar = document.querySelector('.sidebar');
    const sidebarBottom = document.querySelector('.sidebar-bottom');
    if (!button || !sidebar || !sidebarBottom) return;
    if (button.parentElement === sidebarBottom) {
      sidebar.appendChild(button);
    }
  };

  const observer = new MutationObserver(moveDeleteButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  moveDeleteButton();
})();
