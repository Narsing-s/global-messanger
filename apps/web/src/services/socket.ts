import { API } from '../api';

type Handler = (...args: any[]) => void;

class MessengerSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  connected = false;
  private token: string;
  private room: string;

  constructor(token: string, room = 'global') { this.token = token; this.room = room; }

  private endpoint() {
    const base = API || window.location.origin;
    const u = new URL(base + '/ws');
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.searchParams.set('room', this.room);
    u.searchParams.set('token', this.token);
    return u.toString();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return this;
    this.ws = new WebSocket(this.endpoint());
    this.ws.onopen = () => { this.connected = true; this.emitLocal('connect'); };
    this.ws.onclose = () => { this.connected = false; this.emitLocal('disconnect'); setTimeout(() => this.connect(), 1500); };
    this.ws.onerror = () => this.emitLocal('connect_error', new Error('WebSocket connection failed'));
    this.ws.onmessage = e => {
      try {
        const p = JSON.parse(String(e.data));
        if (p?.event) this.emitLocal(p.event, p.data);
        else if (p?.type === 'event') this.emitLocal(p.event, p.data);
      } catch {}
    };
    return this;
  }

  disconnect() { this.ws?.close(); this.ws = null; this.connected = false; }
  on(event: string, fn: Handler) { if (!this.handlers.has(event)) this.handlers.set(event,new Set()); this.handlers.get(event)!.add(fn); return this; }
  once(event: string, fn: Handler) { const wrap:Handler=(...a)=>{this.off(event,wrap);fn(...a)}; return this.on(event,wrap); }
  off(event: string, fn?: Handler) { if (!fn) this.handlers.delete(event); else this.handlers.get(event)?.delete(fn); return this; }
  emit(event: string, data?: any, ack?: (value?: any)=>void) {
    if (event === 'connect') return this;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.connect(); }
    const payload = JSON.stringify({ event, data });
    const send = () => this.ws?.send(payload);
    if (this.ws?.readyState === WebSocket.OPEN) send(); else this.ws?.addEventListener('open', () => send(), { once: true });
    if (ack) queueMicrotask(() => ack({ ok: true }));
    return this;
  }
  private emitLocal(event: string, ...args:any[]) { for (const fn of this.handlers.get(event) || []) fn(...args); }
}

export type Socket = MessengerSocket;
export function createMessengerSocket(token: string): Socket {
  return new MessengerSocket(token).connect();
}
