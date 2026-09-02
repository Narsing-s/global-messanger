declare global {
  interface Window {
    __GM_CONFIG__?: { API_URL?: string };
  }
}

// In development use the Vite origin so /api and /socket.io can be proxied to Fastify.
// Production can still override the backend with VITE_API_URL or runtime config.
const configuredApi = window.__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL;
const API = configuredApi || (import.meta.env.DEV
  ? window.location.origin
  : 'https://global-messenger-api.narsingbeesetti006.workers.dev');

type ConversationResponse = {
  id: string;
  isGroup: boolean;
  title: string | null;
  members: Array<{ user: any }>;
  messages: any[];
  [key: string]: any;
};

function normalizeConversation(value: any): ConversationResponse {
  const conversation = value && typeof value === 'object' ? value : {};
  return {
    ...conversation,
    id: String(conversation.id ?? ''),
    isGroup: Boolean(conversation.isGroup),
    title: conversation.title ?? null,
    members: Array.isArray(conversation.members)
      ? conversation.members.filter((member: any) => member?.user?.id)
      : [],
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.filter(Boolean)
      : []
  };
}

function normalizeConversations(value: any): ConversationResponse[] {
  const list = Array.isArray(value) ? value : value?.conversations;
  return Array.isArray(list)
    ? list.map(normalizeConversation).filter(conversation => conversation.id)
    : [];
}

function normalizeMessages(value: any, conversationId: string): any[] {
  const list = Array.isArray(value) ? value : value?.messages;
  if (!Array.isArray(list)) return [];

  return list
    .filter((message: any) => message && typeof message === 'object')
    .map((message: any) => ({
      ...message,
      id: String(message.id ?? `${conversationId}-${message.createdAt ?? Math.random()}`),
      conversationId: String(message.conversationId ?? conversationId),
      senderId: String(message.senderId ?? ''),
      body: typeof message.body === 'string' ? message.body : '',
      createdAt: message.createdAt ?? new Date().toISOString()
    }));
}

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gm_token');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
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
      if (res.status === 401) {
        localStorage.removeItem('gm_token');
        localStorage.removeItem('gm_user');
        window.dispatchEvent(new CustomEvent('gm:auth-expired'));
        throw new Error('Your session has expired. Please sign in again.');
      }
      throw new Error(data?.message || `Request failed (${res.status})`);
    }
    return data;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  searchUsers: async (q: string) => {
    const value = await request(`/api/users/search?q=${encodeURIComponent(q)}`);
    return Array.isArray(value) ? value.filter(Boolean) : [];
  },
  conversations: async () => normalizeConversations(await request('/api/conversations')),
  direct: async (userId: string) => normalizeConversation(await request('/api/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ userId })
  })),
  group: async (title: string, userIds: string[]) => normalizeConversation(await request('/api/conversations/group', {
    method: 'POST',
    body: JSON.stringify({ title, userIds })
  })),
  messages: async (id: string, limit = 100) => normalizeMessages(
    await request(`/api/conversations/${encodeURIComponent(id)}/messages?limit=${limit}`),
    id
  ),
  read: (id: string) => request(`/api/conversations/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  editMessage: (id: string, body: string) => request(`/api/messages/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteMessage: (id: string) => request(`/api/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  upload: (file: File) => { const f = new FormData(); f.append('file', file); return request('/api/uploads', { method: 'POST', body: f }); },
  react: (id: string, emoji: string) => request(`/api/messages/${encodeURIComponent(id)}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  unreact: (id: string, emoji: string) => request(`/api/messages/${encodeURIComponent(id)}/reactions`, { method: 'DELETE', body: JSON.stringify({ emoji }) }),
  registerDevice: (token: string, platform: string) => request('/api/devices', { method: 'POST', body: JSON.stringify({ token, platform }) }),
  aiAssist: (prompt: string, context?: string) => request('/api/ai/assist', { method: 'POST', body: JSON.stringify({ prompt, context }) })
};

export { API };
