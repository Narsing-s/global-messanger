(() => {
  const isExploreButton = (element) => {
    const button = element?.closest?.('button');
    if (!button) return false;
    const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return text.includes('explore features');
  };

  const removeExploreButtons = () => {
    document.querySelectorAll('.sidebar-bottom button, button').forEach((button) => {
      if (isExploreButton(button)) button.remove();
    });
  };

  // Stop the legacy Explore handler without interfering with profile/delete-account buttons.
  window.addEventListener('click', (event) => {
    if (!isExploreButton(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    removeExploreButtons();
  }, true);

  const observer = new MutationObserver(removeExploreButtons);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  removeExploreButtons();
})();
