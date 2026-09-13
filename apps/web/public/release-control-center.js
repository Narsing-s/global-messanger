(() => {
  'use strict';
  if (window.__GM_RELEASE_CENTER__) return;
  window.__GM_RELEASE_CENTER__ = true;

  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apiBase = () => (window.__GM_CONFIG__?.API_URL || window.location.origin).replace(/\/$/, '');
  const token = () => localStorage.getItem('gm_token') || '';
  const request = async (path, options = {}) => {
    const res = await fetch(`${apiBase()}${path}`, { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {}) }});
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {message:text}; }
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  };

  const style = document.createElement('style');
  style.id = 'gm-release-center-style';
  style.textContent = `
  #gm-release-center{position:fixed;inset:0;z-index:99991;background:rgba(10,15,30,.72);display:none;place-items:center;padding:18px;font-family:system-ui;color:#182033}
  #gm-release-center.open{display:grid}
  .gm-rc-card{width:min(1080px,96vw);height:min(820px,92vh);background:#fff;border-radius:24px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 30px 100px #0005}
  .gm-rc-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #e8ebf2}
  .gm-rc-head h2{margin:0;font-size:19px}.gm-rc-head p{margin:4px 0 0;color:#7d879b;font-size:11px}
  .gm-rc-close{border:0;background:#eef1f7;border-radius:10px;padding:8px 11px;cursor:pointer}
  .gm-rc-body{overflow:auto;padding:18px 22px}.gm-rc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
  .gm-rc-item{border:1px solid #e4e8f0;border-radius:15px;padding:13px;background:#fbfcff}.gm-rc-item b{font-size:12px}.gm-rc-item p{margin:5px 0;color:#7d879b;font-size:10px;line-height:1.45}.gm-rc-status{display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase}.gm-rc-status.foundation{background:#e8f8ef;color:#147a4a}.gm-rc-status.next{background:#fff5db;color:#8a5b00}.gm-rc-status.planned{background:#fff0f0;color:#a32121}.gm-rc-actions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.gm-rc-actions button{border:1px solid #dfe4ee;background:#fff;border-radius:10px;padding:9px 11px;font-size:11px;cursor:pointer}.gm-rc-health{padding:12px;border-radius:14px;background:#f4f6ff;margin-bottom:18px;font-size:11px}.gm-rc-health.ok{background:#edf9f2}.gm-rc-health.bad{background:#fff1f1}.gm-rc-progress{height:7px;background:#e9ecf3;border-radius:99px;overflow:hidden;margin-top:8px}.gm-rc-progress i{display:block;height:100%;background:#635bff;width:0}.gm-rc-list{margin:0 0 18px;padding-left:20px;color:#667085;font-size:11px;line-height:1.7}
  @media(max-width:760px){.gm-rc-grid{grid-template-columns:1fr}.gm-rc-card{height:94vh;border-radius:18px}.gm-rc-head{padding:15px}.gm-rc-body{padding:15px}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'gm-release-center';
  root.innerHTML = `<div class="gm-rc-card" role="dialog" aria-modal="true" aria-label="Global Messenger release control center">
    <div class="gm-rc-head"><div><h2>Global Messenger — Release Control Center</h2><p>One place to inspect product coverage, runtime health and release-critical operations.</p></div><button class="gm-rc-close" id="gm-rc-close">Close</button></div>
    <div class="gm-rc-body"><div id="gm-rc-health" class="gm-rc-health">Checking server and product capabilities…</div>
      <div class="gm-rc-actions">
        <button data-action="profile">Profile</button><button data-action="security">Active sessions</button><button data-action="privacy">Privacy</button><button data-action="media">Media</button><button data-action="search">Universal search</button><button data-action="export">Export current chat</button><button data-action="logout-other">Logout other devices</button>
      </div>
      <div id="gm-rc-progress"></div><div id="gm-rc-grid" class="gm-rc-grid"></div>
    </div></div>`;
  document.body.appendChild(root);

  // This center is intentionally not given its own floating button. Product Center
  // is the single global launcher so login and chat screens never show duplicates.
  window.__gmReleaseCenterOpen = () => { root.classList.add('open'); refresh(); };
  root.querySelector('#gm-rc-close').onclick = () => root.classList.remove('open');
  root.addEventListener('mousedown', e => { if (e.target === root) root.classList.remove('open'); });

  const action = async (name) => {
    if (name === 'profile') window.dispatchEvent(new CustomEvent('gm:options'));
    else if (name === 'security') { try { const d = await request('/api/account/sessions'); alert(`Active sessions: ${Array.isArray(d) ? d.length : 0}`); } catch(e) { alert(e.message); } }
    else if (name === 'privacy') { try { const d = await request('/api/privacy/settings'); alert(`Last seen: ${d?.privacyLastSeen || 'everyone'}\nProfile photo: ${d?.privacyProfilePhoto || 'everyone'}`); } catch(e) { alert(e.message); } }
    else if (name === 'media') { try { const d = await request('/api/media?limit=50'); alert(`Media items available: ${Array.isArray(d) ? d.length : 0}`); } catch(e) { alert(e.message); } }
    else if (name === 'search') { const input = prompt('Search messages and people'); if (!input?.trim()) return; try { const [people, messages] = await Promise.all([request(`/api/users/search?q=${encodeURIComponent(input.trim())}`), request(`/api/messages/search?q=${encodeURIComponent(input.trim())}`)]); alert(`People: ${Array.isArray(people) ? people.length : 0}\nMessages: ${Array.isArray(messages) ? messages.length : 0}`); } catch(e) { alert(e.message); } }
    else if (name === 'export') { window.dispatchEvent(new CustomEvent('gm:backup')); }
    else if (name === 'logout-other') { if (!confirm('Log out all other active sessions?')) return; try { const d = await request('/api/account/sessions/revoke-others',{method:'POST',body:JSON.stringify({})}); alert(`Revoked ${d?.revoked ?? 0} session(s).`); } catch(e) { alert(e.message); } }
  };
  root.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => action(b.dataset.action)));

  async function refresh() {
    const health = root.querySelector('#gm-rc-health');
    const grid = root.querySelector('#gm-rc-grid');
    const progress = root.querySelector('#gm-rc-progress');
    try {
      const [features, ready] = await Promise.all([
        request('/api/product/features'),
        fetch(`${apiBase()}/ready`, {headers: token() ? {Authorization:`Bearer ${token()}`} : {}}).then(r => ({ok:r.ok,status:r.status})).catch(() => ({ok:false,status:0}))
      ]);
      const rows = Array.isArray(features) ? features : [];
      const implemented = rows.filter(x => x.status === 'foundation' || x.status === 'implemented').length;
      const pct = rows.length ? Math.round((implemented / rows.length) * 100) : 0;
      health.className = `gm-rc-health ${ready.ok ? 'ok' : 'bad'}`;
      health.innerHTML = `<b>Runtime: ${ready.ok ? 'healthy' : 'not healthy'}</b> · /ready HTTP ${ready.status || 'unreachable'} · ${implemented}/${rows.length} capability groups currently marked foundation/implemented.`;
      progress.innerHTML = `<div style="font-size:11px;color:#667085"><b>Capability coverage</b> ${pct}%</div><div class="gm-rc-progress"><i style="width:${pct}%"></i></div><p style="font-size:10px;color:#8a93a5;margin:7px 0 16px">A “foundation” entry means the repository has a supporting implementation. It is not a claim that every sub-operation has passed real-device E2E.</p>`;
      grid.innerHTML = rows.map(x => `<div class="gm-rc-item"><b>${escapeHtml(x.title)}</b><p>${escapeHtml((x.items || []).join(' · '))}</p><span class="gm-rc-status ${escapeHtml(x.status)}">${escapeHtml(x.status)}</span></div>`).join('');
    } catch(e) {
      health.className = 'gm-rc-health bad'; health.textContent = `Product capability API unavailable: ${e.message}`; grid.innerHTML = '<div class="gm-rc-item"><b>Release check failed</b><p>Do not publish until the authenticated API and /ready endpoint are reachable.</p></div>';
    }
  }
})();
