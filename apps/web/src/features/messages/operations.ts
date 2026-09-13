import { api } from '../../api';

/** Backward-compatible message operation facade used by UI components. */
export const messageOperations = {
  forward: (messageId: string, conversationId: string) => api.forwardMessage(messageId, conversationId),
  pin: (conversationId: string, messageId: string) => api.pin(conversationId, messageId),
  unpin: (conversationId: string, messageId: string) => api.unpin(conversationId, messageId),
  bookmark: (messageId: string) => api.bookmark(messageId),
  unbookmark: (messageId: string) => api.unbookmark(messageId),
  bulkDelete: (messageIds: string[]) => fetch('/api/messages/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gm_token') || ''}` }, body: JSON.stringify({ messageIds }) }).then(async r => { if (!r.ok) throw new Error((await r.text()) || 'Bulk delete failed'); return r.json(); }),
  bulkForward: (messageIds: string[], conversationId: string) => fetch('/api/messages/bulk-forward', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gm_token') || ''}` }, body: JSON.stringify({ messageIds, conversationId }) }).then(async r => { if (!r.ok) throw new Error((await r.text()) || 'Bulk forward failed'); return r.json(); })
};

export async function retryMessage(send: () => Promise<unknown>, attempts = 3) {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await send(); } catch (error) { last = error; await new Promise(resolve => setTimeout(resolve, 400 * (i + 1))); }
  }
  throw last;
}
