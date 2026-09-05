(() => {
  const removeProfileSignOut = () => {
    const profile = document.querySelector('.profile');
    if (!profile) return;
    profile.querySelectorAll('button.icon-btn').forEach(button => {
      const title = (button.getAttribute('title') || '').toLowerCase();
      const text = (button.textContent || '').toLowerCase();
      if (title.includes('sign out') || title.includes('logout') || text.includes('sign out') || text.includes('logout') || button.querySelector('svg')) button.remove();
    });
  };

  const cleanMoreMenu = () => {
    const menu = document.getElementById('gm-modern-menu');
    if (!menu) return;
    const card = menu.querySelector('.gm-wa-card');
    if (!card) return;

    card.querySelectorAll('.gm-wa-item').forEach(item => {
      const label = (item.querySelector('.gm-wa-label')?.textContent || item.textContent || '').trim().toLowerCase();
      // Account deletion is managed safely from Settings; remove destructive duplicate actions here.
      if (label.includes('delete account') || label === 'delete') item.remove();
    });

    if (!card.querySelector('[data-gm-signout]')) {
      const separator = document.createElement('div');
      separator.className = 'gm-wa-separator';
      const button = document.createElement('button');
      button.className = 'gm-wa-item';
      button.type = 'button';
      button.dataset.gmSignout = '1';
      button.innerHTML = '<span class="gm-wa-icon">↪</span><span class="gm-wa-label">Sign out</span>';
      button.addEventListener('click', () => {
        if (!confirm('Sign out of Global Messenger?')) return;
        try { localStorage.clear(); } catch {}
        location.reload();
      });
      card.append(separator, button);
    }
  };

  const observe = () => {
    removeProfileSignOut();
    cleanMoreMenu();
    const observer = new MutationObserver(() => {
      removeProfileSignOut();
      cleanMoreMenu();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true });
  else observe();
})();
