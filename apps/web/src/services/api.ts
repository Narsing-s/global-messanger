import { api, API } from '../api';

export { api, API };

export const productApi = {
  features: () => fetch(`${API}/api/product/features`, { headers: authHeaders() }).then(readJson),
  sessions: () => fetch(`${API}/api/account/sessions`, { headers: authHeaders() }).then(readJson),
  revokeSession: (id: string) => request(`/api/account/sessions/${encodeURIComponent(id)}`, { method:'DELETE' }),
  revokeOthers: (currentSessionId?: string) => request('/api/account/sessions/revoke-others', { method:'POST', body: JSON.stringify({ currentSessionId }) }),
  privacy: () => fetch(`${API}/api/privacy/settings`, { headers: authHeaders() }).then(readJson),
  updatePrivacy: (body: Record<string,unknown>) => request('/api/privacy/settings', { method:'PATCH', body: JSON.stringify(body) }),
  media: (params = '') => fetch(`${API}/api/media${params ? `?${params}` : ''}`, { headers: authHeaders() }).then(readJson),
  universalSearch: (q: string) => fetch(`${API}/api/search/universal?q=${encodeURIComponent(q)}`, { headers: authHeaders() }).then(readJson)
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('gm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function readJson(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data;
}
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type':'application/json', ...authHeaders(), ...(options.headers || {}) } });
  return readJson(response);
}
