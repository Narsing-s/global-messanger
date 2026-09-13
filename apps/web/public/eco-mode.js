(() => {
  'use strict';
  if (window.__GM_ECO_MODE__) return;
  window.__GM_ECO_MODE__ = true;

  const KEY = 'gm_eco_mode';
  const get = () => localStorage.getItem(KEY) === '1';
  const set = (enabled) => {
    localStorage.setItem(KEY, enabled ? '1' : '0');
    document.documentElement.dataset.ecoMode = enabled ? 'on' : 'off';
    document.documentElement.classList.toggle('gm-eco-mode', enabled);
    window.dispatchEvent(new CustomEvent('gm:eco-mode', { detail: { enabled } }));
  };

  const style = document.createElement('style');
  style.id = 'gm-eco-mode-style';
  style.textContent = `
    html.gm-eco-mode * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    html.gm-eco-mode video[autoplay] { visibility: hidden; }
    html.gm-eco-mode img { content-visibility: auto; }
    .gm-eco-control { display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid rgba(127,127,127,.16); }
    .gm-eco-control b { font-size:13px; }
    .gm-eco-control span { display:block;font-size:11px;opacity:.65;margin-top:3px;line-height:1.4; }
    .gm-eco-switch { border:0;border-radius:999px;padding:7px 13px;cursor:pointer;font-weight:700; }
    .gm-eco-switch.on { background:#16a34a;color:#fff; }
    .gm-eco-switch.off { background:#e5e7eb;color:#374151; }
  `;
  document.head.appendChild(style);

  const apply = () => set(get());

  window.gmEcoMode = {
    enabled: get,
    toggle: () => set(!get()),
    set,
    shouldAutoplayMedia: () => !get(),
    shouldPrefetchMedia: () => !get(),
    syncDelayMs: () => get() ? 30000 : 0
  };

  // Prefer reduced motion when the OS requests it, without changing message semantics.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !localStorage.getItem(KEY)) set(true);
  else apply();

  const addControl = () => {
    if (document.getElementById('gm-eco-control')) return;
    const settings = [...document.querySelectorAll('button,a')].find((el) => /settings/i.test(el.textContent || ''));
    if (!settings) return;
    settings.addEventListener('click', () => setTimeout(() => {
      if (document.getElementById('gm-eco-control')) return;
      const host = document.querySelector('[role="dialog"], .settings, .settings-page, .product-center, main');
      if (!host) return;
      const row = document.createElement('div');
      row.id = 'gm-eco-control';
      row.className = 'gm-eco-control';
      row.innerHTML = `<div><b>🌱 Eco Mode</b><span>Less data, battery and network usage. Security and message delivery stay unchanged.</span></div><button type="button" class="gm-eco-switch ${get() ? 'on' : 'off'}">${get() ? 'On' : 'Off'}</button>`;
      row.querySelector('button').onclick = () => { set(!get()); const b = row.querySelector('button'); b.className = `gm-eco-switch ${get() ? 'on' : 'off'}`; b.textContent = get() ? 'On' : 'Off'; };
      host.appendChild(row);
    }, 80), { once: true });
  };

  new MutationObserver(addControl).observe(document.body, { childList: true, subtree: true });
  addControl();
})();
