import { decryptMessage, encryptMessage, initE2EE } from './e2ee';
import { Socket } from 'socket.io-client';

const SocketProto: any = (Socket as any).prototype;
let installed = false;

export function installE2EE() {
  if (installed) return;
  installed = true;
  void initE2EE();

  if (!(window as any).__gmE2eeFetch) {
    const originalFetch = window.fetch.bind(window);
    (window as any).__gmE2eeFetch = originalFetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.includes('/api/conversations')) return response;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return response;
      try {
        const data = await response.clone().json();
        const decryptList = async (list: any[]) => Promise.all(list.map(async message => {
          if (!message?.body?.startsWith?.('gm:e2ee:v1:')) return message;
          return { ...message, body: await decryptMessage(String(message.conversationId), message.body) };
        }));
        if (Array.isArray(data)) {
          const messages = await decryptList(data);
          if (messages.some((m, i) => m !== data[i])) return new Response(JSON.stringify(messages), { status: response.status, statusText: response.statusText, headers: response.headers });
        }
        if (Array.isArray(data?.messages)) {
          const messages = await decryptList(data.messages);
          if (messages.some((m, i) => m !== data.messages[i])) return new Response(JSON.stringify({ ...data, messages }), { status: response.status, statusText: response.statusText, headers: response.headers });
        }
      } catch {}
      return response;
    };
  }

  const proto: any = SocketProto;
  if (!proto.__gmE2eeEmit) {
    const originalEmit = proto.emit;
    proto.__gmE2eeEmit = originalEmit;
    proto.emit = function(event: string, ...args: any[]) {
      const payload = args[0];
      if (event === 'message:send' && payload && payload.type === 'text' && typeof payload.body === 'string' && !payload.body.startsWith('gm:e2ee:v1:')) {
        void encryptMessage(payload.conversationId, payload.body).then(body => originalEmit.call(this, event, { ...payload, body })).catch(() => originalEmit.call(this, event, payload));
        return this;
      }
      return originalEmit.call(this, event, ...args);
    };
  }

  if (!proto.__gmE2eeOn) {
    const originalOn = proto.on;
    proto.__gmE2eeOn = originalOn;
    proto.on = function(event: string, listener: (...args: any[]) => any) {
      if (event !== 'message:new') return originalOn.call(this, event, listener);
      const wrapped = async (message: any) => {
        if (message?.body?.startsWith?.('gm:e2ee:v1:')) {
          const body = await decryptMessage(String(message.conversationId), message.body);
          return listener({ ...message, body });
        }
        return listener(message);
      };
      return originalOn.call(this, event, wrapped);
    };
  }
}

installE2EE();
