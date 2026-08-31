declare global {
  interface Window {
    __GM_CONFIG__?: { API_URL?: string };
  }
}

// Use Render's backend automatically in production. VITE_API_URL can still override it.
const configuredApi = window.__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL;
const API = configuredApi || (import.meta.env.DEV
  ? 'http://localhost:4000'
  : 'https://global-messanger-backend.onrender.com');

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gm_token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any = {};
  if (text && contentType.includes('application/json')) {
    try { data = JSON.parse(text); } catch { data = { message: text }; }
  } else if (text) {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  searchUsers: (q: string) => request(`/api/users/search?q=${encodeURIComponent(q)}`),
  conversations: () => request('/api/conversations'),
  direct: (userId: string) => request('/api/conversations/direct', { method: 'POST', body: JSON.stringify({ userId }) }),
  group: (title: string, userIds: string[]) => request('/api/conversations/group', { method: 'POST', body: JSON.stringify({ title, userIds }) }),
  messages: (id: string, limit = 100) => request(`/api/conversations/${id}/messages?limit=${limit}`),
  read: (id: string) => request(`/api/conversations/${id}/read`, { method: 'POST' }),
  editMessage: (id: string, body: string) => request(`/api/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteMessage: (id: string) => request(`/api/messages/${id}`, { method: 'DELETE' }),
  upload: (file: File) => { const f = new FormData(); f.append('file', file); return request('/api/uploads', { method: 'POST', body: f }); },
  react: (id: string, emoji: string) => request(`/api/messages/${id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  unreact: (id: string, emoji: string) => request(`/api/messages/${id}/reactions`, { method: 'DELETE', body: JSON.stringify({ emoji }) }),
  registerDevice: (token: string, platform: string) => request('/api/devices', { method: 'POST', body: JSON.stringify({ token, platform }) })
};

export { API };
