(() => {
  // This file intentionally contains only the blocked-contact UI guard.
  // Conversation menu rendering is owned by chat-modern-menu.js.
  const token = () => localStorage.getItem('gm_token') || '';
  const user = () => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } };
  const blocked = () => { try { return JSON.parse(localStorage.getItem('gm_blocked_users') || '[]'); } catch { return []; } };
  const title = () => document.querySelector('.chat-heading b')?.textContent?.trim() || '';
  const rows = () => [...document.querySelectorAll('.messages .bubble-row')];
  const currentOther = () => {
    const heading = title(); if (!heading) return null;
    for (const c of document.querySelectorAll('.chat-item')) {
      const name = c.querySelector('.chat-copy b')?.textContent?.trim();
      if (name === heading) return { name, id: c.querySelector('.user-status')?.getAttribute('data-user-id') || null };
    }
    return { name: heading, id: null };
  };
  const setBlockedState = () => {
    const other = currentOther();
    const list = blocked();
    const isBlocked = !!other && list.some(x => x.id ? x.id === other.id : x.name === other.name);
    const composer = document.querySelector('.composer');
    if (composer) {
      composer.querySelectorAll('input,button').forEach(x => { x.disabled = !!isBlocked; });
      const input = composer.querySelector('input:not([type=file])');
      if (input) input.placeholder = isBlocked ? 'User blocked — unblock to send messages' : 'Write a message...';
    }
    let banner = document.getElementById('gm-blocked-banner');
    if (isBlocked) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'gm-blocked-banner';
        banner.style = 'margin:8px 14px;padding:10px 12px;border-radius:12px;background:#fff1f0;color:#b42318;font:12px system-ui;text-align:center';
        banner.textContent = 'You blocked this user. Messages and calls from this conversation are disabled on this device.';
        document.querySelector('.composer-wrap')?.prepend(banner);
      }
      rows().filter(r => !r.querySelector('.own')).forEach(r => { r.style.display = 'none'; });
    } else {
      banner?.remove();
      rows().forEach(r => r.style.removeProperty('display'));
    }
  };
  const observer = new MutationObserver(setBlockedState);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(setBlockedState, 1000);
  setBlockedState();
})();
