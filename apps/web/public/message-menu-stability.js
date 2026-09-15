(() => {
  'use strict';
  const API = (window.__GM_CONFIG__?.API_URL || (location.protocol === 'http:' || location.protocol === 'https:' ? location.origin : '')).replace(/\/$/, '');
  const token = () => localStorage.getItem('gm_token') || '';
  const user = () => { try { return JSON.parse(localStorage.getItem('gm_user') || '{}'); } catch { return {}; } };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

  async function request(path, opt = {}) {
    const headers = { ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
    if (opt.body && !(opt.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { ...opt, headers: { ...headers, ...(opt.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d?.message || `Request failed (${r.status})`);
    return d;
  }

  const rowOf = el => el?.closest('.bubble-row');
  const messageIdOf = el => rowOf(el)?.getAttribute('data-message-id') || '';
  const rowById = id => document.querySelector(`.bubble-row[data-message-id="${CSS.escape(String(id))}"]`);

  async function activeChat() {
    const title = document.querySelector('.chat-heading b')?.textContent?.trim();
    if (!title) return null;