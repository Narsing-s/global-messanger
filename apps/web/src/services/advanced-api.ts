export type ApiOptions = RequestInit & { json?: unknown };

// Prefer explicit deployment config, otherwise use the current origin so Docker,
// self-hosted, Capacitor and reverse-proxy deployments never fall back to a
// stale third-party backend.
const base = () => String((window as any).__GM_CONFIG__?.API_URL || window.location.origin).replace(/\/$/, '');
const auth = () => localStorage.getItem('gm_token') || '';

export async function advancedApi<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.json !== undefined) headers.set('Content-Type', 'application/json');
  const token = auth(); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${base()}${path}`, { ...options, headers, body: options.json !== undefined ? JSON.stringify(options.json) : options.body });
  const text = await response.text(); let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
  return data as T;
}

export const securityApi = {
  twoFactorStatus: () => advancedApi('/api/security/2fa/status'),
  setupTwoFactor: () => advancedApi('/api/security/2fa/setup', { method: 'POST' }),
  enableTwoFactor: (secret: string, code: string) => advancedApi('/api/security/2fa/enable', { method: 'POST', json: { secret, code } }),
  disableTwoFactor: (code: string) => advancedApi('/api/security/2fa/disable', { method: 'POST', json: { code } }),
  devices: () => advancedApi('/api/sessions'),
  loginHistory: () => advancedApi('/api/security/login-history'),
  securityStatus: () => advancedApi('/api/security/status'),
  changePassword: (currentPassword: string, newPassword: string) => advancedApi('/api/account/password/change', { method: 'POST', json: { currentPassword, newPassword } }),
  logoutDevice: (id: string) => advancedApi(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  logoutOtherDevices: () => advancedApi('/api/sessions', { method: 'DELETE' }),
  passkeys: () => advancedApi('/api/security/passkeys'),
  passkeyChallenge: () => advancedApi('/api/security/passkeys/challenge', { method: 'POST' }),
  removePasskey: (id: string) => advancedApi(`/api/security/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deviceKey: (publicKey: string, version = 1) => advancedApi('/api/security/device-key', { method: 'PUT', json: { publicKey, version } }),
  blocked: () => advancedApi('/api/blocked'),
  block: (userId: string) => advancedApi(`/api/blocked/${encodeURIComponent(userId)}`, { method: 'POST' }),
  unblock: (userId: string) => advancedApi(`/api/blocked/${encodeURIComponent(userId)}`, { method: 'DELETE' })
};

export const profileApi = {
  me: () => advancedApi('/api/profile/me'),
  update: (patch: Record<string, unknown>) => advancedApi('/api/profile/me', { method: 'PATCH', json: patch }),
  byUsername: (username: string) => advancedApi(`/api/profile/${encodeURIComponent(username)}`),
  privacy: () => advancedApi('/api/privacy'),
  updatePrivacy: (patch: Record<string, unknown>) => advancedApi('/api/privacy', { method: 'PATCH', json: patch })
};

export const organizationApi = {
  update: (conversationId: string, patch: Record<string, unknown>) => advancedApi(`/api/conversations/${encodeURIComponent(conversationId)}/organization`, { method: 'PATCH', json: patch }),
  list: (filter = 'all') => advancedApi(`/api/conversations/organized?filter=${encodeURIComponent(filter)}`),
  universalSearch: (q: string) => advancedApi(`/api/search/universal?q=${encodeURIComponent(q)}`)
};

export const messagingApi = {
  createPoll: (conversationId: string, question: string, options: string[], multiple = false) => advancedApi('/api/polls', { method: 'POST', json: { conversationId, question, options, multiple } }),
  votePoll: (pollId: string, optionIds: string[]) => advancedApi(`/api/polls/${encodeURIComponent(pollId)}/vote`, { method: 'POST', json: { optionIds } }),
  poll: (pollId: string) => advancedApi(`/api/polls/${encodeURIComponent(pollId)}`),
  schedule: (conversationId: string, body: string, scheduledAt: string) => advancedApi('/api/messages/schedule', { method: 'POST', json: { conversationId, body, scheduledAt } }),
  scheduled: () => advancedApi('/api/messages/scheduled'),
  cancelScheduled: (id: string) => advancedApi(`/api/messages/scheduled/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  location: (conversationId: string, latitude: number, longitude: number) => advancedApi('/api/messages/location', { method: 'POST', json: { conversationId, latitude, longitude } }),
  liveLocation: (conversationId: string, latitude: number, longitude: number, expiresAt: string) => advancedApi('/api/messages/live-location', { method: 'POST', json: { conversationId, latitude, longitude, expiresAt } }),
  contact: (conversationId: string, name: string, phone?: string, email?: string) => advancedApi('/api/messages/contact', { method: 'POST', json: { conversationId, name, phone, email } }),
  event: (conversationId: string, title: string, startsAt: string, endsAt?: string) => advancedApi('/api/messages/event', { method: 'POST', json: { conversationId, title, startsAt, endsAt } }),
  bulkForward: (messageIds: string[], conversationId: string) => advancedApi('/api/messages/bulk-forward', { method: 'POST', json: { messageIds, conversationId } }),
  info: (messageId: string) => advancedApi(`/api/messages/${encodeURIComponent(messageId)}/info`)
};

export const aiApi = {
  conversationSummary: (conversationId: string) => advancedApi('/api/ai/conversation-summary', { method: 'POST', json: { conversationId } }),
  documentUnderstanding: (text: string, filename = 'document') => advancedApi('/api/ai/document-understanding', { method: 'POST', json: { text, filename } }),
  smartNotifications: () => advancedApi('/api/ai/smart-notifications')
};
