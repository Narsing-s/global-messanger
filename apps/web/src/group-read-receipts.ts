import { io, Socket } from 'socket.io-client';
import { API, api } from './api';

type ReadMember = {
  user: { id: string; displayName?: string; username?: string; avatarUrl?: string | null };
  lastReadAt?: string | null;
};
type Conversation = { id: string; isGroup: boolean; title?: string | null; members?: ReadMember[] };
type Message = { id: string; senderId: string; createdAt: string; conversationId: string };

let socket: Socket | null = null;
let currentConversationId = '';
let conversations: Conversation[] = [];
let lastTitle = '';
let refreshTimer = 0;

const esc = (value: string) => value.replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c] as string));
const mediaUrl = (value: string) => value.startsWith('http') ? value : `${API}${value.startsWith('/') ? '' : '/'}${value}`;

function styles() {
  if (document.getElementById('gm-seen-style')) return;
  const style = document.createElement('style');
  style.id = 'gm-seen-style';
  style.textContent = `.gm-seen-by{display:inline-flex;align-items:center;gap:4px;margin:3px 2px 0;border:0;background:transparent;color:#7d8798;font:10px system-ui;cursor:pointer;padding:0}.gm-seen-by:hover{color:#536dfe}.gm-seen-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block}.gm-seen-modal{position:fixed;inset:0;z-index:100010;background:rgba(2,6,23,.55);display:grid;place-items:center;padding:18px;font-family:system-ui}.gm-seen-card{width:min(390px,94vw);max-height:80vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 25px 80px #0004;color:#172033}.gm-seen-card h3{margin:0 0 4px;font-size:18px}.gm-seen-card p{margin:0 0 15px;color:#8993a5;font-size:12px}.gm-seen-person{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #edf0f5}.gm-seen-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#eef1ff;display:grid;place-items:center;color:#536dfe;font-weight:700}.gm-seen-person b{font-size:13px}.gm-seen-person span{display:block;font-size:11px;color:#8b94a5}.gm-seen-close{margin-top:15px;width:100%;padding:10px;border:0;border-radius:10px;background:#536dfe;color:#fff;cursor:pointer}`;
  document.head.appendChild(style);
}

function meId() { try { return JSON.parse(localStorage.getItem('gm_user') || '{}')?.id || ''; } catch { return ''; } }
function activeGroup() { const title = document.querySelector('.chat-heading b')?.textContent?.trim() || ''; return title ? conversations.find(c => c.isGroup && (c.title || 'Group') === title) || null : null; }
function seenMembers(message: Message, conversation: Conversation) { const me = meId(); return (conversation.members || []).filter(m => m?.user?.id && m.user.id !== me && m.lastReadAt && new Date(m.lastReadAt).getTime() >= new Date(message.createdAt).getTime()); }

function openSeen(message: Message, conversation: Conversation) {
  document.getElementById('gm-seen-modal')?.remove();
  const members = conversation.members || [];
  const seen = new Set(seenMembers(message, conversation).map(m => m.user.id));
  const modal = document.createElement('div');
  modal.id = 'gm-seen-modal'; modal.className = 'gm-seen-modal';
  const rows = members.filter(m => m.user.id !== meId()).map(m => {
    const name = m.user.displayName || m.user.username || 'Member';
    const avatar = m.user.avatarUrl ? `<img class="gm-seen-avatar" src="${esc(mediaUrl(m.user.avatarUrl))}" alt="${esc(name)}"/>` : `<div class="gm-seen-avatar">${esc(name.slice(0, 2).toUpperCase())}</div>`;
    return `<div class="gm-seen-person">${avatar}<div><b>${esc(name)}</b><span>${seen.has(m.user.id) ? 'Seen' : 'Not seen yet'}</span></div></div>`;
  }).join('');
  modal.innerHTML = `<div class="gm-seen-card"><h3>Seen by</h3><p>${seen.size} of ${Math.max(0, members.length - 1)} members have seen this message.</p>${rows || '<p>No other members in this group.</p>'}<button class="gm-seen-close">Close</button></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.gm-seen-close')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function decorate() {
  const group = activeGroup();
  if (!group) return;
  const rows = Array.from(document.querySelectorAll<HTMLElement>('.messages .bubble-row'));
  const cache = (window as any).__gmReadMessages as Message[] | undefined;
  rows.forEach(row => {
    if (row.querySelector('.gm-seen-by') || !row.classList.contains('own')) return;
    const id = row.dataset.messageId;
    const bubble = row.querySelector('.bubble');
    const small = bubble?.querySelector('small');
    const message = id && cache?.find(m => m.id === id);
    if (!bubble || !small || !message) return;
    const seen = seenMembers(message, group);
    const button = document.createElement('button');
    button.className = 'gm-seen-by'; button.innerHTML = `<span class="gm-seen-dot"></span>${seen.length ? `Seen by ${seen.length}` : 'Seen by nobody yet'}`;
    button.title = 'See who viewed this message';
    button.addEventListener('click', e => { e.stopPropagation(); openSeen(message, group); });
    small.after(button);
  });
}

async function refresh() {
  if (!localStorage.getItem('gm_token')) return;
  try {
    const data = await api.conversations();
    conversations = Array.isArray(data) ? data : [];
    const group = activeGroup();
    const nextId = group?.id || '';
    if (nextId !== currentConversationId) {
      if (socket?.connected && currentConversationId) socket.emit('conversation:leave', currentConversationId);
      currentConversationId = nextId;
      if (socket?.connected && currentConversationId) socket.emit('conversation:join', currentConversationId);
    }
    if (group) (window as any).__gmReadMessages = await api.messages(group.id, 100);
    decorate();
  } catch { /* read receipts are non-blocking */ }
}

function connectRealtime() {
  if (socket || !localStorage.getItem('gm_token')) return;
  socket = io(API, { auth: { token: localStorage.getItem('gm_token') }, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity });
  socket.on('connect', () => { if (currentConversationId) socket?.emit('conversation:join', currentConversationId); void refresh(); });
  socket.on('message:read', (event: any) => {
    if (!event?.conversationId || event.conversationId !== currentConversationId) return;
    const group = conversations.find(c => c.id === event.conversationId);
    const member = group?.members?.find(m => m.user.id === event.userId);
    if (member) member.lastReadAt = event.at;
    document.querySelectorAll('.gm-seen-by').forEach(x => x.remove());
    decorate();
  });
}

function watch() {
  if (!localStorage.getItem('gm_token')) return;
  const title = document.querySelector('.chat-heading b')?.textContent?.trim() || '';
  if (title !== lastTitle) { lastTitle = title; document.getElementById('gm-seen-modal')?.remove(); void refresh(); }
  decorate();
}

export function installGroupReadReceipts() {
  styles();
  connectRealtime();
  window.setInterval(watch, 700);
  refreshTimer = window.setInterval(() => void refresh(), 3500);
  window.addEventListener('beforeunload', () => { if (refreshTimer) window.clearInterval(refreshTimer); socket?.disconnect(); });
}

installGroupReadReceipts();
