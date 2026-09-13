export type OutboxMessage = {
  clientId: string;
  conversationId: string;
  body: string;
  type?: string;
  replyToId?: string | null;
  createdAt: number;
};

const KEY = 'gm:offline-outbox:v1';

function read(): OutboxMessage[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function write(items: OutboxMessage[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(-500))); } catch { /* storage may be unavailable */ }
}

export function queueOfflineMessage(message: OutboxMessage) {
  const items = read();
  if (!items.some(item => item.clientId === message.clientId)) items.push(message);
  write(items);
}

export function pendingOfflineMessages() { return read(); }

export function removeOfflineMessage(clientId: string) {
  write(read().filter(item => item.clientId !== clientId));
}

export function installOfflineOutbox(flush: (message: OutboxMessage) => void) {
  const run = () => { for (const message of pendingOfflineMessages()) flush(message); };
  window.addEventListener('online', run);
  return run;
}
