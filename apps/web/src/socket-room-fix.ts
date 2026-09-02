import { Socket } from 'socket.io-client';

const configuredApi = window.__GM_CONFIG__?.API_URL || import.meta.env.VITE_API_URL;
const API = configuredApi || (import.meta.env.DEV
  ? window.location.origin
  : 'https://global-messenger-api.narsingbeesetti006.workers.dev');

const originalConnect = Socket.prototype.connect;

Socket.prototype.connect = function (...args: any[]) {
  const result = originalConnect.apply(this, args as any);
  this.once('connect', async () => {
    try {
      const token = localStorage.getItem('gm_token');
      if (!token) return;
      const response = await fetch(`${API}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      const conversations = await response.json();
      for (const conversation of conversations) {
        if (conversation?.id) this.emit('conversation:join', conversation.id);
      }
    } catch (error) {
      console.warn('Unable to join messenger rooms:', error);
    }
  });
  return result;
};
