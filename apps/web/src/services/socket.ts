import { io, type Socket } from 'socket.io-client';
import { API } from '../api';

export function createMessengerSocket(token: string): Socket {
  return io(API, { auth: { token }, transports: ['websocket','polling'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000 });
}
