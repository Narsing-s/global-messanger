import { decryptMessage, encryptMessage, initE2EE } from './e2ee';
import { Socket } from 'socket.io-client';
import './runtime-fixes';

const SocketProto: any = (Socket as any).prototype;
let installed = false;

export function installE2EE() {
  if (installed) return;
  installed = true;
  void initE2EE();

  const proto: any = SocketProto;
  if (!proto.__gmE2eeEmit) {
    const originalEmit = proto.emit;
    proto.__gmE2eeEmit = originalEmit;
    proto.emit = function(event: string, ...args: any[]) {
      const payload = args[0];
      if (event === 'message:send' && payload && payload.type === 'text' && typeof payload.body === 'string' && !payload.body.startsWith('gm:e2ee:v1:')) {
        void encryptMessage(payload.conversationId, payload.body).then(body => originalEmit.call(this, event, { ...payload, body })).catch(() => originalEmit.call(this, event, ...args));
        return this;
      }
      return originalEmit.call(this, event, ...args);
    };
  }

  if (!proto.__gmE2eeOn) {
    const originalOn = proto.on;
    proto.__gmE2eeOn = originalOn;
    proto.on = function(event: string, listener: (...args: any[]) => any) {
      if (event !== 'message:new' && event !== 'message:updated') return originalOn.call(this, event, listener);
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
