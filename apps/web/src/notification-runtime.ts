import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? window.location.origin : 'https://global-messanger-backend.onrender.com');
const token = localStorage.getItem('gm_token');

function prefs() {
  try { return JSON.parse(localStorage.getItem('gm_settings') || '{}'); } catch { return {}; }
}

if (token && 'Notification' in window) {
  const socket = io(API, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
  socket.on('message:new', (message: any) => {
    if (!prefs().browserNotifications || !document.hidden || Notification.permission !== 'granted') return;
    if (!message || message.senderId === JSON.parse(localStorage.getItem('gm_user') || '{}').id) return;
    const body = typeof message.body === 'string' && message.body ? message.body.slice(0, 180) : 'New message';
    const title = message.sender?.displayName || message.sender?.username || 'New message';
    try {
      const n = new Notification(title, { body, icon: '/icons/icon-192.png', tag: `gm-${message.conversationId || 'message'}` });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  });
}
