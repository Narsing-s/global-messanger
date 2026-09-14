import { Socket } from 'socket.io-client';
import './runtime-fixes';
import { initE2EE } from './e2ee';

// E2EE is enabled by default for capable browsers. Messages that cannot be
// encrypted because a conversation member has no registered key remain plain,
// preserving compatibility while new devices bootstrap their identity.
const GM_E2EE_ENABLED = true;
const SocketProto: any = (Socket as any).prototype;
let installed = false;

export function installE2EE() {
  if (installed) return;
  installed = true;
  if (!GM_E2EE_ENABLED) return;
  void initE2EE();
}

installE2EE();
