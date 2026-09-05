import { Socket } from 'socket.io-client';
import './runtime-fixes';

// Plain-message mode keeps the chat UI showing the exact message users send.
// The encryption modules remain in the project for a future opt-in mode, but
// they must not rewrite normal chat text into ciphertext on this device.
const GM_E2EE_ENABLED = false;
const SocketProto: any = (Socket as any).prototype;
let installed = false;

export function installE2EE() {
  if (installed) return;
  installed = true;
  if (!GM_E2EE_ENABLED) return;
}

installE2EE();
