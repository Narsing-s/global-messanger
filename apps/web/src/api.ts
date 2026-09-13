declare global {
  interface Window { __GM_CONFIG__?: { API_URL?: string }; }
}

const CLOUDFLARE_API = 'https://global-messenger-api.narsingbeesetti006.workers.dev';
const configuredApi = window.__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || localStorage.getItem('gm_api_url') || '';
const isLoopbackApi = (value?: string) => Boolean(value && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value));
const isNative = ['capacitor:', 'ionic:', 'file:', 'null'].includes(window.location.protocol);
const API = configuredApi && (!isLoopbackApi(configuredApi) || import.meta.env.DEV)
  ? configuredApi.replace(/\/$/, '')
  : (isNative ? (localStorage.getItem('gm_api_url') || CLOUDFLARE_API) : (import.meta.env.DEV ? window.location.origin : CLOUDFLARE_API));

type ConversationResponse = { id: string; isGroup: boolean; title: string | null; members: Array<{ user: any }>; messages: any[]; [key: string]: any };
function normalizeConversation(value: any): ConversationResponse { const conversation = value && typeof value === 'object' ? value : {}; return { ...conversation, id: String(conversation.id ?? ''), isGroup: Boolean(conversation.isGroup), title: conversation.title ?? null, members: Array.isArray(conversation.members) ? conversation.members.filter((member: any) => member?.user?.id) : [], messages: Array.isArray(conversation.messages) ? conversation.messages.filter(Boolean) : [] }; }
function directPairKey(conversation: ConversationResponse): string | null { if (conversation.isGroup || conversation.members.length !== 2) return null; return conversation.members.map(member => String(member.user.id)).sort().join(':'); }
function normalizeConversations(value: any): ConversationResponse[] { const list = Array.isArray(value) ? value : value?.conversations; if (!Array.isArray(list)) return []; const seenPairs = new Set<string>(), seenIds = new Set<string>(), result: ConversationResponse[] = []; for (const raw of list) { const conversation = normalizeConversation(raw); if (!conversation.id || seenIds.has(conversation.id)) continue; seenIds.add(conversation.id); const pair = directPairKey(conversation); if (pair) { if (seenPairs.has(pair)) continue; seenPairs.add(pair); } result.push(conversation); } return result; }
function normalizeMessages(value: any, conversationId: string): any[] { const list = Array.isArray(value) ? value : value?.messages; if (!Array.isArray(list)) return []; return list.filter((message: any) => message && typeof message === 'object').map((message: any) => { const receipts = Array.isArray(message.receipts) ? message.receipts : []; return { ...message, id: String(message.id ?? `${conversationId}-${message.createdAt ?? Math.random()}`), conversationId: String(message.conversationId ?? conversationId), senderId: String(message.senderId ?? ''), body: typeof message.body === 'string' ? message.body : '', createdAt: message.createdAt ?? new Date().toISOString(), __delivered: receipts.some((r: any) => Boolean(r?.deliveredAt)) || Boolean(message.__delivered), __read: receipts.some((r: any) => Boolean(r?.readAt)) || Boolean(message.__read) }; }).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('gm_token'); const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API}${path}`, { ...options, signal: options.signal || controller.signal, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    const contentType = res.headers.get('content-type') || ''; const text = await res.text(); let data: any = {};
    if (text && contentType.includes('application/json')) { try { data = JSON.parse(text); } catch { data = { message: text }; } } else if (text) data = { message: text };
    if (!res.ok) { if (res.status === 401) { localStorage.removeItem('gm_token'); localStorage.removeItem('gm_user'); window.dispatchEvent(new CustomEvent('gm:auth-expired')); throw new Error('Your session has expired. Please sign in again.'); } throw new Error(data?.message || `Request failed (${res.status})`); }
    return data;
  } catch (error: any) { if (error?.name === 'AbortError') throw new Error('Request timed out. Please check your connection.'); if (error instanceof TypeError) throw new Error(`Cannot reach Global Messenger server at ${API}. Check the server URL and network connection.`); throw error; } finally { window.clearTimeout(timeout); }
}

export function uploadWithProgress(file: File, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/uploads`);
    const token = localStorage.getItem('gm_token'); if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { const result = xhr.response || {}; resolve({ ...result, url: result?.url && /^https?:\/\//i.test(result.url) ? result.url : `${API}${result?.url || ''}` }); } else reject(new Error(xhr.response?.message || `Upload failed (${xhr.status})`)); };
    xhr.onerror = () => reject(new Error(`Upload failed. Cannot reach ${API}.`));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    if (signal) { if (signal.aborted) return xhr.abort(); signal.addEventListener('abort', () => xhr.abort(), { once: true }); }
    const form = new FormData(); form.append('file', file); xhr.send(form);
  });
}

const directRequests = new Map<string, Promise<ConversationResponse>>();

export const api = {
  searchUsers: async (q: string) => { const value = await request(`/api/users/search?q=${encodeURIComponent(q)}`); return Array.isArray(value) ? value.filter(Boolean) : []; },
  conversations: async () => normalizeConversations(await request('/api/conversations')),
  direct: async (userId: string) => { const key = String(userId); const pending = directRequests.get(key); if (pending) return pending; const promise = (async () => { const conversation = normalizeConversation(await request('/api/conversations/direct', { method: 'POST', body: JSON.stringify({ userId }) })); if (conversation.id) { try { await request(`/api/conversations/${encodeURIComponent(conversation.id)}/restore`, { method: 'POST' }); } catch {} } return conversation; })(); directRequests.set(key, promise); try { return await promise; } finally { if (directRequests.get(key) === promise) directRequests.delete(key); } },
  group: async (title: string, userIds: string[]) => normalizeConversation(await request('/api/conversations/group', { method: 'POST', body: JSON.stringify({ title, userIds }) })),
  messages: async (id: string, limit = 100) => normalizeMessages(await request(`/api/conversations/${encodeURIComponent(id)}/messages?limit=${limit}`), id),
  syncMessages: async (id: string, after?: string, limit = 100) => ({ messages: normalizeMessages(await request(`/api/conversations/${encodeURIComponent(id)}/messages/sync?limit=${limit}${after ? `&after=${encodeURIComponent(after)}` : ''}`), id) }),
  unread: async () => request('/api/conversations/unread'), read: (id: string) => request(`/api/conversations/${encodeURIComponent(id)}/read`, { method: 'POST' }), chatInfo: (id: string) => request(`/api/conversations/${encodeURIComponent(id)}/info`),
  pins: (id: string) => request(`/api/conversations/${encodeURIComponent(id)}/pins`), pin: (conversationId: string, messageId: string) => request(`/api/conversations/${encodeURIComponent(conversationId)}/pins`, { method: 'POST', body: JSON.stringify({ messageId }) }), unpin: (conversationId: string, messageId: string) => request(`/api/conversations/${encodeURIComponent(conversationId)}/pins/${encodeURIComponent(messageId)}`, { method: 'DELETE' }),
  searchMessages: async (q: string, conversationId?: string, filters?: { senderId?: string; from?: string; to?: string; type?: string; hasAttachment?: boolean }) => { const params = new URLSearchParams({ q }); if (conversationId) params.set('conversationId', conversationId); for (const [k,v] of Object.entries(filters || {})) if (v !== undefined && v !== '') params.set(k, String(v)); return request(`/api/messages/search?${params}`); },
  profile: () => request('/api/profile/me'), updateProfile: (data: { displayName?: string; avatarUrl?: string | null }) => request('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data) }),
  productFeatures: () => request('/api/product/features'), sessions: () => request('/api/account/sessions'), revokeSession: (id: string) => request(`/api/account/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }), revokeOtherSessions: (currentSessionId?: string) => request('/api/account/sessions/revoke-others', { method: 'POST', body: JSON.stringify({ currentSessionId }) }),
  privacySettings: () => request('/api/privacy/settings'), updatePrivacySettings: (data: { privacyLastSeen?: 'everyone'|'contacts'|'nobody'; privacyProfilePhoto?: 'everyone'|'contacts'|'nobody' }) => request('/api/privacy/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  media: (conversationId?: string, type?: string, limit = 100) => request(`/api/media?limit=${limit}${conversationId ? `&conversationId=${encodeURIComponent(conversationId)}` : ''}${type ? `&type=${encodeURIComponent(type)}` : ''}`),
  renameGroup: (id: string, title: string) => request(`/api/conversations/${encodeURIComponent(id)}/group`, { method: 'PATCH', body: JSON.stringify({ title }) }), addGroupMember: (id: string, userId: string) => request(`/api/conversations/${encodeURIComponent(id)}/members`, { method: 'POST', body: JSON.stringify({ userId }) }), removeGroupMember: (id: string, userId: string) => request(`/api/conversations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  forwardMessage: (messageId: string, conversationId: string) => request('/api/messages/forward', { method: 'POST', body: JSON.stringify({ messageId, conversationId }) }), editMessage: (id: string, body: string) => request(`/api/messages/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ body }) }), deleteMessage: (id: string) => request(`/api/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  upload: async (file: File, onProgress?: (percent: number) => void, signal?: AbortSignal) => uploadWithProgress(file, onProgress, signal),
  react: (id: string, emoji: string) => request(`/api/messages/${encodeURIComponent(id)}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }), unreact: (id: string, emoji: string) => request(`/api/messages/${encodeURIComponent(id)}/reactions`, { method: 'DELETE', body: JSON.stringify({ emoji }) }), bookmark: (id: string) => request(`/api/messages/${encodeURIComponent(id)}/bookmark`, { method: 'POST' }), unbookmark: (id: string) => request(`/api/messages/${encodeURIComponent(id)}/bookmark`, { method: 'DELETE' }),
  registerDevice: (token: string, platform: string) => request('/api/devices', { method: 'POST', body: JSON.stringify({ token, platform })), aiAssist: (prompt: string, context?: string) => request('/api/ai/assist', { method: 'POST', body: JSON.stringify({ prompt, context }))
};
export { API, request };