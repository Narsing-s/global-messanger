import { api, API } from './api';
import { encryptMessage } from './e2ee';

const REACTION_KEY = 'gm_reaction_cache_v1';
const identityKey = 'gm_e2ee_identity_v1';
let installed = false;

function jsonStore(key: string): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem('gm_user') || 'null'); } catch { return null; }
}

function activeTitle() {
  return document.querySelector('.chat-heading b')?.textContent?.trim() || '';
}

async function currentConversation() {
  const me = currentUser();
  const title = activeTitle();
  if (!me?.id || !title) return null;
  const conversations = await api.conversations();
  return conversations.find((c: any) => c.isGroup
    ? (c.title || 'Group') === title
    : c.members?.some((m: any) => m.user.id !== me.id && m.user.displayName === title)) || null;
}

function authHeaders() {
  const token = localStorage.getItem('gm_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function addReactionBadge(messageId: string, emoji: string) {
  const row = document.querySelector<HTMLElement>(`.bubble-row[data-message-id="${CSS.escape(messageId)}"]`);
  if (!row) return;
  let badge = row.querySelector<HTMLElement>('.gm-reaction-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'gm-reaction-badge';
    badge.style.cssText = 'display:inline-flex;align-items:center;margin-top:4px;padding:2px 7px;border-radius:999px;background:#eef2ff;font-size:13px;line-height:1.2;';
    row.querySelector('.bubble')?.appendChild(badge);
  }
  badge.textContent = emoji;
}

function restoreReactionBadges() {
  const cache = jsonStore(REACTION_KEY);
  Object.entries(cache).forEach(([messageId, emoji]) => {
    if (typeof emoji === 'string' && emoji) addReactionBadge(messageId, emoji);
  });
}

function installApiFixes() {
  const originalReact = api.react;
  if (!(api as any).__gmFastReact) {
    (api as any).__gmFastReact = true;
    api.react = async (id: string, emoji: string) => {
      const result = await originalReact(id, emoji);
      const cache = jsonStore(REACTION_KEY);
      cache[id] = emoji;
      localStorage.setItem(REACTION_KEY, JSON.stringify(cache));
      addReactionBadge(id, emoji);
      document.querySelector('.emoji-picker')?.remove();
      document.querySelector('.message-menu')?.remove();
      return result;
    };
  }

  const originalUnreact = api.unreact;
  if (!(api as any).__gmFastUnreact) {
    (api as any).__gmFastUnreact = true;
    api.unreact = async (id: string, emoji: string) => {
      const result = await originalUnreact(id, emoji);
      const cache = jsonStore(REACTION_KEY);
      delete cache[id];
      localStorage.setItem(REACTION_KEY, JSON.stringify(cache));
      document.querySelector(`.bubble-row[data-message-id="${CSS.escape(id)}"] .gm-reaction-badge`)?.remove();
      return result;
    };
  }

  const originalEdit = api.editMessage;
  if (!(api as any).__gmE2eeEdit) {
    (api as any).__gmE2eeEdit = true;
    api.editMessage = async (id: string, body: string) => {
      const conversation = await currentConversation();
      if (!conversation?.id) return originalEdit(id, body);
      const encryptedBody = await encryptMessage(String(conversation.id), body);
      const response = await fetch(`${API}/api/messages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ body: encryptedBody })
      });
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : {};
      if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
      return data;
    };
  }
}

function installLogoutProtection() {
  if ((localStorage as any).__gmClearProtected) return;
  const storage = localStorage;
  const originalClear = storage.clear.bind(storage);
  (localStorage as any).__gmClearProtected = true;
  storage.clear = () => {
    const identity = storage.getItem(identityKey);
    originalClear();
    if (identity) storage.setItem(identityKey, identity);
  };
}

async function deleteCurrentChat() {
  const conversation = await currentConversation();
  if (!conversation?.id) throw new Error('Open a conversation first.');
  if (!confirm('Delete this chat from your account? Your other chats and messages will not be affected.')) return;
  const response = await fetch(`${API}/api/conversations/${encodeURIComponent(conversation.id)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : {};
  if (!response.ok) throw new Error(data?.message || `Unable to delete chat (${response.status})`);
  document.getElementById('gm-enhance-modal')?.remove();
  location.reload();
}

function installChatDeleteAction() {
  const observer = new MutationObserver(() => {
    const modal = document.getElementById('gm-enhance-modal');
    if (!modal || !modal.textContent?.includes('Conversation options') || modal.querySelector('[data-gm-delete-chat]')) return;
    const grid = modal.querySelector('.gm-feature-grid');
    if (!grid) return;
    const button = document.createElement('button');
    button.className = 'gm-feature danger';
    button.setAttribute('data-gm-delete-chat', '1');
    button.innerHTML = '<b>🗑️ Delete chat</b><span>Remove this conversation from your chat list immediately.</span>';
    button.onclick = async () => {
      button.setAttribute('disabled', 'true');
      button.innerHTML = '<b>Deleting…</b><span>Please wait.</span>';
      try { await deleteCurrentChat(); }
      catch (error: any) { button.removeAttribute('disabled'); alert(error?.message || 'Unable to delete chat.'); }
    };
    grid.appendChild(button);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function installReactionRestore() {
  const observer = new MutationObserver(() => restoreReactionBadges());
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(restoreReactionBadges, 0);
}

export function installRuntimeFixes() {
  if (installed) return;
  installed = true;
  installLogoutProtection();
  installApiFixes();
  installChatDeleteAction();
  installReactionRestore();
}

installRuntimeFixes();
