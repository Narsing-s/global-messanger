(() => {
  if (window.__gmSettingsExtraLoaded) return;
  window.__gmSettingsExtraLoaded = true;
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === 'localhost' ? location.origin : 'https://global-messanger-backend.onrender.com');
  const token = () => localStorage.getItem('gm_token') || '';
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadBlocked(root) {
    const box = root.querySelector('#gm-blocked-list');
    if (!box) return;
    box.innerHTML = '<div class="gm-note">Loading blocked contacts…</div>';
    try {
      const r = await fetch(`${API}/api/users/blocked`, { headers: { Authorization: `Bearer ${token()}` } });
      const rows = await r.json().catch(() => []);
      if (!r.ok) throw Error(rows.message || 'Unable to load blocked contacts');
      if (!Array.isArray(rows) || !rows.length) { box.innerHTML = '<div class="gm-note">No blocked contacts.</div>'; return; }
      box.innerHTML = rows.map(x => `<div class="gm-session"><div><b>@${escapeHtml(x.username || x.displayName || x.blockedUserId)}</b><small>Blocked ${x.createdAt ? new Date(x.createdAt).toLocaleString() : ''}</small></div><button class="gm-link gm-unblock" data-id="${escapeHtml(x.blockedUserId)}">Unblock</button></div>`).join('');
      box.querySelectorAll('.gm-unblock').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id || !confirm('Unblock this contact?')) return;
        btn.disabled = true;
        try {
          const r = await fetch(`${API}/api/users/${encodeURIComponent(id)}/block`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
          if (!r.ok) { const d = await r.json().catch(() => ({})); throw Error(d.message || 'Unable to unblock contact'); }
          await loadBlocked(root);
        } catch (e) { btn.disabled = false; alert(e.message || 'Unable to unblock contact'); }
      }));
    } catch (e) { box.innerHTML = `<div class="gm-note">${escapeHtml(e.message || 'Unable to load blocked contacts')}</div>`; }
  }

  function enhance(overlay) {
    if (!overlay || overlay.querySelector('#gm-blocked-section')) return;
    const card = overlay.querySelector('.gm-settings-card');
    if (!card) return;
    const section = document.createElement('section');
    section.id = 'gm-blocked-section';
    section.className = 'gm-settings-section';
    section.innerHTML = `<h3>Blocked contacts</h3><p>Manage accounts you have blocked. Blocking is enforced by the server.</p><div id="gm-blocked-list"><div class="gm-note">Loading…</div></div>`;
    const danger = [...card.querySelectorAll('.gm-settings-section')].find(s => s.querySelector('#gm-delete-account'));
    if (danger) card.insertBefore(section, danger); else card.appendChild(section);
    void loadBlocked(section);
  }

  const observer = new MutationObserver(() => { const overlay = document.getElementById('gm-settings-overlay'); if (overlay) enhance(overlay); });
  observer.observe(document.body, { childList: true, subtree: true });
})();
