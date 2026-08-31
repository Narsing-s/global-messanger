declare global {
  interface Window {
    __GM_CONFIG__?: {
      API_URL?: string;
    };
  }
}

const configuredApi = window.__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL;

// Production must never silently fall back to localhost.
const API = configuredApi || (import.meta.env.DEV ? 'http://localhost:4000' : '');

if (!API && !import.meta.env.DEV) {
  console.error('Global Messenger API URL is not configured. Set VITE_API_URL in the frontend deployment.');
}

async function request(path: string, options: RequestInit = {}) {
  if (!API) throw new Error('API URL is not configured');
  const token = localStorage.getItem('gm_token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data === 'string' ? data : data.message ?? 'Request failed');
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
