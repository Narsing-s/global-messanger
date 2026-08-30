const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gm_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data === 'string' ? data : data.message ?? 'Request failed');
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
};
export { API };
