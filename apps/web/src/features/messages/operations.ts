import { api } from '../../api';

/** Backward-compatible message operation facade used by UI components. */
export const messageOperations = {
  forward: (messageId: string, conversationId: string) => api.forwardMessage(messageId, conversationId),
  pin: (conversationId: string, messageId: string) => api.pin(conversationId, messageId),
  unpin: (conversationId: string, messageId: string) => api.unpin(conversationId, messageId),
  bookmark: (messageId: string) => api.bookmark(messageId),
  unbookmark: (messageId: string) => api.unbookmark(messageId),
  bulkDelete: (messageIds: string[]) => api.bulkDelete(messageIds),
  bulkForward: async (messageIds: string[], conversationId: string) => { const out=[]; for(const id of messageIds) out.push(await api.forwardMessage(id,conversationId)); return out; }
};

export async function retryMessage(send: () => Promise<unknown>, attempts = 3) {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await send(); } catch (error) { last = error; await new Promise(resolve => setTimeout(resolve, 400 * (i + 1))); }
  }
  throw last;
}
