(() => {
  'use strict';
  const API = window.location.origin;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function close() { document.getElementById('gm-profile-viewer')?.remove(); }

  function show(user, online) {
    close();
    const root = document.createElement('div');
    root.id = 'gm-profile-viewer';
    root.innerHTML = `
      <div class="gm-profile-backdrop">
        <section class="gm-profile-card" role="dialog" aria-modal="true">
          <button class="gm-profile-close" aria-label="Close">×</button>
          <div class="gm-profile-avatar">${user.avatarUrl ? `<img src="${esc(user.avatarUrl)}" alt="${esc(user.displayName || 'Profile picture')}"/>` : `<span>${esc(String(user.displayName || '?').trim().slice(0,2).toUpperCase())}</span>`}</div>
          <h2>${esc(user.displayName || 'Global Messenger user')}</h2>
          <p class="gm-profile-username">@${esc(user.username || '')}</p>
          <p class="gm-profile-status"><i class="${online ? 'online' : 'offline'}"></i>${online ? 'Online now' : 'Offline'}</p>
        </section>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('.gm-profile-close').onclick = close;
    root.querySelector('.gm-profile-backdrop').onclick = e => { if (e.target === e.currentTarget) close(); };
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
  }

  async function openProfile() {
    const heading = document.querySelector('.chat-heading');
    const name = heading?.querySelector('b')?.textContent?.trim();
    if (!name) return;
    const token = localStorage.getItem('gm_token');
    if (!token) return;
    const status = heading?.querySelector('.user-status')?.textContent?.toLowerCase().includes('online') ?? false;
    try {
      const response = await fetch(`${API}/api/users/search?q=${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${token}` } });
      const users = await response.json();
      const user = Array.isArray(users) ? users.find(u => String(u.displayName).toLowerCase() === name.toLowerCase()) || users[0] : null;
      if (user) show(user, status);
    } catch {}
  }

  document.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('.chat-heading .avatar')) openProfile();
  });

  const style = document.createElement('style');
  style.textContent = `
    #gm-profile-viewer{position:fixed;inset:0;z-index:100010}
    .gm-profile-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.58);display:grid;place-items:center;padding:20px}
    .gm-profile-card{position:relative;width:min(360px,92vw);background:#fff;border-radius:26px;padding:30px;text-align:center;box-shadow:0 30px 100px #0005;font-family:system-ui;color:#172033}
    .gm-profile-close{position:absolute;right:12px;top:10px;border:0;background:transparent;font-size:28px;color:#778198;cursor:pointer}
    .gm-profile-avatar{width:112px;height:112px;margin:4px auto 18px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:linear-gradient(135deg,#536dfe,#8b5cf6);color:#fff;font-size:34px;font-weight:800}
    .gm-profile-avatar img{width:100%;height:100%;object-fit:cover}
    .gm-profile-card h2{margin:0;font-size:24px}
    .gm-profile-username{margin:6px 0;color:#7d879a}
    .gm-profile-status{display:flex;justify-content:center;align-items:center;gap:7px;margin:18px 0 0;font-weight:700}
    .gm-profile-status i{width:9px;height:9px;border-radius:50%;display:inline-block;background:#94a3b8}
    .gm-profile-status i.online{background:#16a34a;box-shadow:0 0 0 4px #16a34a22}
  `;
  document.head.appendChild(style);
})();
