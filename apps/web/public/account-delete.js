(() => {
  const API = window.__GM_CONFIG__?.API_URL || (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? location.origin : 'https://global-messanger-backend.onrender.com');
  let installedProfile = null;

  const install = () => {
    if (!localStorage.getItem('gm_token')) return;
    const profile = document.querySelector('.profile');
    if (!profile) return;
    if (installedProfile === profile && profile.querySelector('.gm-delete-account-entry')) return;
    installedProfile = profile;
    profile.querySelector('.gm-delete-account-entry')?.remove();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gm-delete-account-entry';
    button.innerHTML = '<span aria-hidden="true">⚠️</span><span>Delete account</span>';
    button.title = 'Permanently delete your Global Messenger account';
    button.setAttribute('aria-label', 'Delete account');

    if (!document.querySelector('style[data-gm-account-delete="1"]')) {
      const style = document.createElement('style');
      style.dataset.gmAccountDelete = '1';
      style.textContent = `
        .gm-delete-account-entry{flex:0 0 auto!important;width:auto!important;min-height:34px;margin:0 0 0 6px;padding:8px 10px;border:1px solid #f0c7c3;border-radius:10px;background:#fff8f7;color:#b42318;display:flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-size:11px;font-weight:600;cursor:pointer;text-align:center;box-sizing:border-box;white-space:nowrap}
        .gm-delete-account-entry:hover{background:#fff1f0;border-color:#e7aaa5}
        .gm-delete-card{width:min(480px,94vw)!important}
        .gm-delete-warning{background:#fff5f4;border:1px solid #ffd6d2;border-radius:13px;padding:13px;color:#8f1d15;line-height:1.5;font-size:12px}
        .gm-delete-password{width:100%;box-sizing:border-box;margin-top:12px;padding:11px 12px;border:1px solid #d9dee8;border-radius:10px;font:inherit;outline:none}
        .gm-delete-password:focus{border-color:#536dfe;box-shadow:0 0 0 3px #536dfe18}
        .gm-delete-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}
        .gm-delete-actions button{padding:10px 14px;border-radius:10px;border:0;cursor:pointer}
        .gm-delete-cancel{background:#eef1f7;color:#556075}
        .gm-delete-confirm{background:#b42318;color:#fff}
        .gm-delete-confirm:disabled{opacity:.55;cursor:not-allowed}
        .gm-delete-status{margin-top:9px;font-size:11px;color:#b42318;min-height:15px}
        @media(max-width:640px){.gm-delete-account-entry{font-size:0;padding:8px;width:34px!important;height:34px}.gm-delete-account-entry span:first-child{font-size:14px}}
      `;
      document.head.appendChild(style);
    }

    profile.appendChild(button);

    const open = () => {
      document.getElementById('gm-account-delete-modal')?.remove();
      const overlay = document.createElement('div');
      overlay.id = 'gm-account-delete-modal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.62);display:grid;place-items:center;padding:20px;font-family:system-ui';
      overlay.innerHTML = `
        <div class="gm-enhance-card gm-delete-card">
          <div class="gm-enhance-head">
            <div><h2>Delete your account</h2><p>Global Messenger · Account & Privacy</p></div>
            <button type="button" data-delete-close aria-label="Close">×</button>
          </div>
          <div class="gm-delete-warning"><strong>This action is permanent.</strong><br>Your Global Messenger account and associated database data will be permanently deleted. You will be signed out immediately and will need to create a new account if you return.</div>
          <input class="gm-delete-password" id="gm-delete-password" type="password" autocomplete="current-password" placeholder="Enter your current password" />
          <div class="gm-delete-status" id="gm-delete-status"></div>
          <div class="gm-delete-actions"><button type="button" class="gm-delete-cancel" data-delete-cancel>Keep my account</button><button type="button" class="gm-delete-confirm" data-delete-confirm>Delete My Account</button></div>
        </div>`;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('[data-delete-close]').onclick = close;
      overlay.querySelector('[data-delete-cancel]').onclick = close;
      overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
      const password = overlay.querySelector('#gm-delete-password');
      const status = overlay.querySelector('#gm-delete-status');
      const confirmButton = overlay.querySelector('[data-delete-confirm]');
      password.focus();
      confirmButton.onclick = async () => {
        const value = password.value;
        if (!value) { status.textContent = 'Enter your current password to continue.'; password.focus(); return; }
        if (!window.confirm('Are you absolutely sure? Your account and associated data will be permanently deleted.')) return;
        confirmButton.disabled = true;
        status.textContent = 'Deleting your account…';
        try {
          const response = await fetch(`${API}/api/auth/account`, { method:'DELETE', headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('gm_token') || ''}`}, body:JSON.stringify({password:value}) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || 'Unable to delete your account.');
          localStorage.removeItem('gm_token'); localStorage.removeItem('gm_user'); close(); window.location.href = '/';
        } catch (error) {
          status.textContent = error?.message || 'Unable to delete your account.';
          confirmButton.disabled = false;
        }
      };
    };
    button.addEventListener('click', open);
  };

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  install();
})();